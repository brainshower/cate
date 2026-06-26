import { app, ipcMain, session, shell, webContents, type Session, type WebContents } from 'electron'
import { BROWSER_PORTAL_LOOKUP, BROWSER_PORTAL_REGISTER, BROWSER_SHORTCUT } from '../shared/ipc-channels'
import type { BrowserShortcutAction } from '../shared/types'
import log from './logger'
import { disableWebviewHardening } from './featureFlags'

const OAUTH_HOSTS = new Set([
  'accounts.google.com',
  'login.microsoftonline.com',
  'appleid.apple.com',
])

function isOAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (OAUTH_HOSTS.has(parsed.host)) return true
    if (parsed.host === 'github.com' && parsed.pathname.startsWith('/login/oauth')) return true
    return false
  } catch {
    return false
  }
}

const configuredGuestSessions = new Set<string>()
const browserGuestPartitions = new Set<string>()
const browserGuestSessions = new Set<Session>()
const portalPanelByWebContentsId = new Map<number, string>()
const portalWebContentsIdByPanelId = new Map<string, number>()

export interface PortalWebContentsRegistration {
  panelId: string
  webContentsId: number
  alive: boolean
}

export function registerPortalWebContents(payload: PortalWebContentsRegistration): void {
  const panelId = payload.panelId.trim()
  const webContentsId = Number(payload.webContentsId)
  if (!panelId || !Number.isInteger(webContentsId) || webContentsId <= 0) return

  const existingWebContentsId = portalWebContentsIdByPanelId.get(panelId)
  if (existingWebContentsId && existingWebContentsId !== webContentsId) {
    portalPanelByWebContentsId.delete(existingWebContentsId)
  }

  if (!payload.alive) {
    portalWebContentsIdByPanelId.delete(panelId)
    portalPanelByWebContentsId.delete(webContentsId)
    return
  }

  portalWebContentsIdByPanelId.set(panelId, webContentsId)
  portalPanelByWebContentsId.set(webContentsId, panelId)
}

export function portalPanelIdForWebContents(webContentsId: number): string | null {
  return portalPanelByWebContentsId.get(webContentsId) ?? null
}

function senderOwnsWebContents(sender: WebContents, webContentsId: number): boolean {
  const target = webContents.fromId(webContentsId) as (WebContents & { hostWebContents?: WebContents }) | undefined
  if (!target || target.isDestroyed()) return false
  return target.hostWebContents === sender
}

export function registerPortalWebContentsHandlers(): void {
  ipcMain.on(BROWSER_PORTAL_REGISTER, (event, payload: Partial<PortalWebContentsRegistration>) => {
    if (!payload || typeof payload.panelId !== 'string') return
    const webContentsId = Number(payload.webContentsId)
    if (!senderOwnsWebContents(event.sender, webContentsId)) {
      log.warn('[webview] Denied portal registration for webContentsId %s', webContentsId)
      return
    }
    registerPortalWebContents({
      panelId: payload.panelId,
      webContentsId,
      alive: Boolean(payload.alive),
    })
  })

  ipcMain.handle(BROWSER_PORTAL_LOOKUP, (event, webContentsId: number): string | null => {
    if (!process.env.CATE_E2E) return null
    const normalizedId = Number(webContentsId)
    if (!senderOwnsWebContents(event.sender, normalizedId)) return null
    return portalPanelIdForWebContents(normalizedId)
  })
}

export function classifyWebviewShortcut(input: Electron.Input): BrowserShortcutAction | null {
  if (input.type !== 'keyDown') return null
  if (input.alt || input.shift) return null
  if (!input.meta && !input.control) return null

  const code = input.code
  if (code === 'KeyR') return 'reload'
  if (code === 'KeyL') return 'focus-url'
  if (code === 'BracketLeft') return 'back'
  if (code === 'BracketRight') return 'forward'

  const key = input.key.toLowerCase()
  if (key === 'r') return 'reload'
  if (key === 'l') return 'focus-url'
  if (key === '[') return 'back'
  if (key === ']') return 'forward'
  return null
}

function forwardBrowserShortcut(contents: WebContents, action: BrowserShortcutAction): void {
  const hostWebContents = (contents as WebContents & { hostWebContents?: WebContents }).hostWebContents
  if (!hostWebContents || hostWebContents.isDestroyed()) return
  hostWebContents.send(BROWSER_SHORTCUT, { action, webContentsId: contents.id })
}

export function isTrustedAppUrl(url: string): boolean {
  if (url.startsWith('file://')) return true
  if (!process.env.ELECTRON_RENDERER_URL) return false
  try {
    return new URL(url).origin === new URL(process.env.ELECTRON_RENDERER_URL).origin
  } catch {
    return false
  }
}

export function isAllowedGuestUrl(url: string): boolean {
  if (url === 'about:blank') return true
  try {
    const parsed = new URL(url)
    // Allow file: so the browser panel can render local HTML files explicitly
    // requested by the user via the address bar. Cross-origin reads from a
    // remote page into file:// are blocked by the same-origin policy.
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'file:'
  } catch {
    return false
  }
}

function configureGuestSessionPolicies(targetSession: Session, sessionKey: string): void {
  if (configuredGuestSessions.has(sessionKey)) return
  configuredGuestSessions.add(sessionKey)

  const allowedPermissions = new Set(['cookies', 'storage-access'])

  targetSession.setPermissionRequestHandler((_wc, permission, callback) => {
    if (allowedPermissions.has(permission)) {
      callback(true)
      return
    }
    log.warn('[webview] Denied guest permission request: %s', permission)
    callback(false)
  })

  targetSession.setPermissionCheckHandler((_wc, permission) => allowedPermissions.has(permission))

  targetSession.webRequest.onBeforeRequest((details, callback) => {
    if (details.resourceType === 'mainFrame' && !isAllowedGuestUrl(details.url)) {
      log.warn('[webview] Blocked guest navigation to %s', details.url)
      callback({ cancel: true })
      return
    }
    callback({})
  })
}

function guestSessionFor(contents: WebContents, partition?: string): Session {
  if (partition) return session.fromPartition(partition)
  return contents.session
}

async function flushGuestSessionStorage(targetSession: Session): Promise<void> {
  await targetSession.flushStorageData()
  await targetSession.cookies.flushStore()
}

export async function flushBrowserGuestSessions(): Promise<void> {
  await Promise.all([
    ...[...browserGuestSessions].map(async (targetSession) => {
      try {
        await flushGuestSessionStorage(targetSession)
      } catch (error) {
        log.warn('[webview] Failed to flush browser guest session: %O', error)
      }
    }),
    ...[...browserGuestPartitions].map(async (partition) => {
      try {
        await flushGuestSessionStorage(session.fromPartition(partition))
      } catch (error) {
        log.warn('[webview] Failed to flush browser partition %s:', partition, error)
      }
    }),
  ])
}

export function installWebContentsSecurity(): void {
  app.on('web-contents-created', (_event, contents) => {
    if (contents.getType() === 'webview') {
      browserGuestSessions.add(contents.session)
      contents.on('did-stop-loading', () => {
        void flushGuestSessionStorage(contents.session).catch((error) => {
          log.warn('[webview] Failed to flush guest storage after load: %O', error)
        })
      })

      contents.on('before-input-event', (event, input) => {
        const action = classifyWebviewShortcut(input)
        if (!action) return
        event.preventDefault()
        forwardBrowserShortcut(contents, action)
      })

      contents.on('will-navigate', (event, url) => {
        if (isOAuthUrl(url)) {
          event.preventDefault()
          shell.openExternal(url)
        }
      })

      contents.setWindowOpenHandler(({ url }) => {
        if (isOAuthUrl(url)) {
          shell.openExternal(url)
        }
        return { action: 'deny' }
      })
    } else {
      contents.setWindowOpenHandler(() => ({ action: 'deny' }))
    }

    if (contents.getType() === 'window') {
      contents.on('will-navigate', (event, url) => {
        if (!isTrustedAppUrl(url)) {
          log.warn('[security] Blocked app-window navigation to %s', url)
          event.preventDefault()
        }
      })
    }

    contents.on('will-attach-webview', (event, webPreferences, params) => {
      if (disableWebviewHardening()) return

      const src = typeof params.src === 'string' ? params.src : 'about:blank'
      if (!isAllowedGuestUrl(src)) {
        log.warn('[webview] Blocked guest attach for URL %s', src)
        event.preventDefault()
        return
      }

      // Browser screenshots are captured from the main process via
      // webContents.capturePage(); guest preload is not required for them.
      delete (webPreferences as { preload?: string }).preload
      delete (webPreferences as { preloadURL?: string }).preloadURL
      webPreferences.nodeIntegration = false
      webPreferences.contextIsolation = true
      webPreferences.sandbox = true
      webPreferences.webSecurity = true
      ;(webPreferences as { allowRunningInsecureContent?: boolean }).allowRunningInsecureContent = false

      // Allow `window.open()` from webview content so we can track OAuth /
      // Sign-In popups via Cate's popup registry. The setWindowOpenHandler
      // installed when the guest's webContents is created strictly filters
      // which URLs are actually allowed; this just removes the blanket veto.
      params.allowpopups = 'true'

      const partition = typeof webPreferences.partition === 'string' ? webPreferences.partition : undefined
      if (partition?.startsWith('persist:browser-ws-')) {
        browserGuestPartitions.add(partition)
      }
      const targetSession = guestSessionFor(contents, partition)
      configureGuestSessionPolicies(targetSession, partition ?? '__default__')
    })
  })
}
