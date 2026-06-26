# Phase 26: Browser Uplift - Pattern Map

**Mapped:** 2026-06-26
**Files analyzed:** 29
**Analogs found:** 29 / 29

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/renderer/panels/BrowserPanel.tsx` | component | event-driven + request-response | `src/renderer/panels/BrowserPanel.tsx` + upstream `BrowserPanel.tsx` | exact |
| `src/renderer/panels/browserPartition.ts` | utility | transform | `src/renderer/panels/browserUrl.ts` + upstream partition helper | role-match |
| `src/renderer/panels/browserLoadError.ts` | utility | transform | upstream `src/renderer/panels/browserLoadError.ts` | exact upstream |
| `src/renderer/panels/BookmarksBar.tsx` | component | event-driven | upstream `src/renderer/panels/BookmarksBar.tsx` | exact upstream, adapt |
| `src/renderer/panels/BrowserMenu.tsx` | component | event-driven | upstream `src/renderer/panels/BrowserMenu.tsx` | role-match, trim |
| `src/renderer/panels/BrowserSettingsPopover.tsx` | component | event-driven + request-response | upstream `BrowserSettingsPopover.tsx` + local `BrowserSettings.tsx` | role-match, trim |
| `src/renderer/stores/browserStore.ts` | store | CRUD + pub-sub | upstream `src/renderer/stores/browserStore.ts` | role-match, workspace adapt |
| `src/main/browserStateStore.ts` | service/store | CRUD + file-I/O | upstream `src/main/browserStateStore.ts` + local `src/main/jsonFileStore.ts` | role-match |
| `src/main/ipc/browser.ts` | route/controller | request-response + pub-sub | upstream browser handlers in `src/main/store.ts` + local IPC handlers | role-match |
| `src/main/ipc/capture.ts` | route/controller | request-response + file-I/O | current `src/main/index.ts` capture handlers + upstream `src/main/ipc/capture.ts` | exact |
| `src/main/index.ts` | config/bootstrap | event-driven | existing handler registration imports in `src/main/index.ts` | exact |
| `src/main/webSecurity.ts` | middleware | event-driven | current `src/main/webSecurity.ts` + upstream `webSecurity.ts` | exact |
| `src/main/workspaceManager.ts` | service/controller | CRUD + event-driven | current `src/main/workspaceManager.ts` | exact |
| `src/shared/ipc-channels.ts` | config/contract | request-response + pub-sub | current `src/shared/ipc-channels.ts` | exact |
| `src/preload/index.ts` | provider/bridge | request-response + pub-sub | current `src/preload/index.ts` | exact |
| `src/shared/electron-api.d.ts` | config/contract | request-response + pub-sub | current `src/shared/electron-api.d.ts` | exact |
| `src/shared/types.ts` | model/config | transform | current `src/shared/types.ts` | exact |
| `src/main/store.ts` | service/config | CRUD + pub-sub | current `src/main/store.ts` | exact |
| `src/renderer/stores/settingsStore.ts` | store | CRUD | current `src/renderer/stores/settingsStore.ts` | exact |
| `src/renderer/settings/BrowserSettings.tsx` | component | event-driven | current `src/renderer/settings/BrowserSettings.tsx` | exact |
| `src/renderer/stores/appStore.ts` | store | CRUD + event-driven | current `src/renderer/stores/appStore.ts` | exact |
| `src/renderer/shells/PanelWindowShell.tsx` | component/provider | request-response | current `PanelWindowShell.tsx` | exact |
| `src/renderer/shells/DockWindowShell.tsx` | component/provider | event-driven | current `DockWindowShell.tsx` | exact |
| `src/renderer/lib/portalRegistry.ts` | utility/service | event-driven | current `src/renderer/lib/portalRegistry.ts` | exact |
| `src/renderer/lib/e2eHarness.ts` | test utility/provider | event-driven | current `src/renderer/lib/e2eHarness.ts` | exact |
| `e2e/fixtures/electron-app.ts` | test utility | process I/O | current `e2e/fixtures/electron-app.ts` | exact |
| `e2e/browser-uplift.spec.ts` | test | E2E request-response | `e2e/flashquery-persistence.spec.ts` + `e2e/smoke.spec.ts` | role-match |
| `*.test.ts` / `*.test.tsx` browser unit tests | test | transform + event-driven | `BrowserPanel.test.ts`, `appStore.test.ts`, `git.test.ts`, `flashquery.test.ts` | role-match |
| `src/shared/ipc-channels.test.ts` | test | contract validation | current `src/shared/ipc-channels.test.ts` | exact |

## Pattern Assignments

### `src/renderer/panels/BrowserPanel.tsx` (component, event-driven)

**Analog:** current `src/renderer/panels/BrowserPanel.tsx`; upstream `src/renderer/panels/BrowserPanel.tsx`

**Imports pattern** (current lines 7-15):
```typescript
import { useEffect, useRef, useState, useCallback } from 'react'
import { Globe, ArrowLeft, ArrowRight, ArrowClockwise, Camera, MagnifyingGlass } from '@phosphor-icons/react'
import { useSettingsStore } from '../stores/settingsStore'
import { useAppStore } from '../stores/appStore'
import { useCanvasStoreContext } from '../stores/CanvasStoreContext'
import { SEARCH_ENGINE_URLS } from '../../shared/types'
import type { BrowserPanelProps } from './types'
import { portalRegistry } from '../lib/portalRegistry'
import { isUrl, normalizeUrl } from './browserUrl'
```

**Current event wiring and portal pattern** (current lines 255-284):
```typescript
const onDomReady = (): void => {
  try { portalRegistry.register(panelId, webview as any) } catch { /* ignore */ }
}
webview.addEventListener('dom-ready', onDomReady)

webview.addEventListener('did-navigate', onDidNavigate)
webview.addEventListener('did-navigate-in-page', onDidNavigateInPage)
webview.addEventListener('page-title-updated', onPageTitleUpdated)
webview.addEventListener('did-fail-load', onDidFailLoad)
webview.addEventListener('did-start-loading', onDidStartLoading)
webview.addEventListener('did-stop-loading', onDidStopLoading)
webview.addEventListener('will-navigate', onWillNavigate)
webview.addEventListener('new-window', onNewWindow)

return () => {
  try { portalRegistry.unregister(panelId) } catch { /* ignore */ }
  webview.removeEventListener('dom-ready', onDomReady)
  webview.removeEventListener('did-navigate', onDidNavigate)
  webview.removeEventListener('did-navigate-in-page', onDidNavigateInPage)
}
```

**Partition line to replace** (current lines 365-370):
```tsx
<webview
  ref={webviewRef as any}
  src={webviewSrc}
  className={`w-full h-full ${loadError ? 'hidden' : ''}`}
  partition={`persist:browser-${panelId}`}
/>
```

**Copy/adapt crash and load-error pattern** (upstream lines 620-689):
```typescript
const description = pageLoadErrorFrom(event)
if (description === null) return
setLoadError(description)
setIsLoading(false)

const onRenderProcessGone = (event: any) => {
  const reason = event?.reason ?? 'crashed'
  if (reason === 'clean-exit') return
  console.error('[BrowserPanel] webview renderer gone:', reason)
  setCrashed(true)
  setIsLoading(false)
}

webview.addEventListener('render-process-gone', onRenderProcessGone)
webview.addEventListener('crashed', onCrashed)
```

**Copy/adapt shortcut listener pattern** (upstream lines 561-569):
```typescript
useEffect(() => {
  return window.electronAPI.onBrowserShortcut((action) => {
    if (!isFocusedRef.current) return
    runBrowserAction(action as BrowserShortcutAction)
  })
}, [runBrowserAction])
```

**Important adaptation:** do not copy upstream tabs, start page, autocomplete, proxy, `browserNewTabBehavior`, `browserShowTabSidebar`, `BrowserTabSidebar`, `UrlSuggestions`, `StartPage`, or `browserSetProxy`. Add `workspaceId` to history/bookmark calls and fail closed before rendering a webview if it is empty.

---

### `src/renderer/panels/browserPartition.ts` (utility, transform)

**Analog:** local `src/renderer/panels/browserUrl.ts`; upstream partition comments in `BrowserPanel.tsx`

**Pure helper/testability pattern** (local lines 1-7, 51-69):
```typescript
// URL helpers for the BrowserPanel address bar.
// Lives outside the React component so unit tests can import them without
// dragging the rest of the component (and Electron/React) into the test
// environment.

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (trimmed.startsWith('about:')) return trimmed
  return `${isLocal ? 'http' : 'https'}://${trimmed}`
}
```

**Target pattern:** create a similarly pure `browserPartitionForWorkspace(workspaceId: string)` helper that trims/rejects empty IDs and returns exactly `persist:browser-ws-${workspaceId}`. Use it in `BrowserPanel`, clear-data IPC, and workspace cleanup, or duplicate with tests proving exact string parity if shared imports would violate process boundaries.

---

### `src/renderer/panels/browserLoadError.ts` (utility, transform)

**Analog:** upstream `src/renderer/panels/browserLoadError.ts`

**Copy core helper** (upstream lines 8-28):
```typescript
const ERR_ABORTED = -3

export interface DidFailLoadEvent {
  errorCode: number
  errorDescription?: string
  isMainFrame?: boolean
}

export function pageLoadErrorFrom(event: DidFailLoadEvent): string | null {
  if (event.errorCode === ERR_ABORTED) return null
  if (event.isMainFrame === false) return null
  return event.errorDescription || 'Failed to load page'
}
```

---

### `src/main/ipc/capture.ts` (route/controller, request-response + file-I/O)

**Analog:** current `src/main/index.ts` lines 682-742; upstream `src/main/ipc/capture.ts`

**Current behavior to preserve** (current `src/main/index.ts` lines 682-725):
```typescript
ipcMain.handle(CAPTURE_PAGE, async (event) => {
  try {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return null
    const image = await win.webContents.capturePage()
    return image.toDataURL()
  } catch (error) {
    log.error('[CAPTURE_PAGE]', error)
    throw error instanceof Error ? error : new Error(String(error))
  }
})

ipcMain.handle(WEBVIEW_SCREENSHOT, async (event, webContentsId: number) => {
  try {
    const callerWin = BrowserWindow.fromWebContents(event.sender)
    const wc = webContents.fromId(webContentsId)
    if (!wc || wc.isDestroyed()) return null
    const targetWin = BrowserWindow.fromWebContents(wc)
    if (!callerWin || !targetWin || targetWin.id !== callerWin.id) {
      const hostWc = wc.hostWebContents
      if (!hostWc || hostWc.id !== event.sender.id) {
        log.warn(`[webview:screenshot] Denied: webContentsId ${webContentsId} does not belong to calling window`)
        return null
      }
    }
    const image = await wc.capturePage()
    if (image.isEmpty()) return null
    const filePath = path.join(app.getPath('desktop'), fileName)
    await fs.promises.writeFile(filePath, image.toPNG())
    return { filePath, dataUrl: image.toDataURL() }
  } catch (error) {
    log.error(`[${WEBVIEW_SCREENSHOT}]`, error)
    throw error instanceof Error ? error : new Error(String(error))
  }
})
```

**Module shape to copy, minus excluded proxy handlers** (upstream lines 1-12, 21-46):
```typescript
import { app, BrowserWindow, ipcMain, nativeImage, webContents } from 'electron'
import fs from 'fs'
import path from 'path'
import log from '../logger'
import { validatePath } from './pathValidation'
import { CAPTURE_PAGE, WEBVIEW_SCREENSHOT, NATIVE_FILE_DRAG } from '../../shared/ipc-channels'

export function registerCaptureHandlers(): void {
  ipcMain.handle(WEBVIEW_SCREENSHOT, async (event, webContentsId: number) => {
    const callerWin = BrowserWindow.fromWebContents(event.sender)
    const wc = webContents.fromId(webContentsId)
    // preserve current ownership check and Desktop PNG result
  })
}
```

**Do not copy:** upstream `BROWSER_SET_PROXY`, `configureBrowserProxy`, `isLocalLocator`, or extraction handlers.

---

### `src/main/ipc/browser.ts` (route/controller, request-response + pub-sub)

**Analog:** upstream browser handlers embedded in `upstream/main:src/main/store.ts`; local `src/main/ipc/flashquery.ts` handler registration tests

**Channel registration pattern** (local `src/main/ipc/flashquery.test.ts` lines 159-205):
```typescript
const { registerHandlers } = await import('./flashquery')

registerHandlers()

expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual([
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_PROBE,
  // ...
])

registerHandlers()
registerHandlers()
expect(mocks.handle).toHaveBeenCalledTimes(13)
```

**Upstream browser handler behavior to adapt** (grep located upstream `src/main/store.ts` lines 492-540):
```typescript
ipcMain.handle(BROWSER_HISTORY_RECORD, async (_event, url: string, title: string) => {
  recordBrowserVisit(url, title)
  broadcastToAll(BROWSER_HISTORY_CHANGED)
})

ipcMain.handle(BROWSER_BOOKMARKS_ADD, async (_event, url: string, title: string) => {
  addBookmark(url, title)
  broadcastToAll(BROWSER_BOOKMARKS_CHANGED)
})

ipcMain.handle(BROWSER_CLEAR_DATA, async () => {
  // clear Electron session + browser history/bookmarks
})
```

**Required adaptation:** every handler takes `workspaceId`; broadcasts send `{ workspaceId }`; `BROWSER_CLEAR_DATA` returns an explicit success/failure object and must not import from `src/main/flashquery/*`.

---

### `src/main/browserStateStore.ts` (service/store, CRUD + file-I/O)

**Analog:** upstream `src/main/browserStateStore.ts`; local `src/main/jsonFileStore.ts`

**Upstream normalization and recordability pattern** (upstream lines 13-45, 66-80):
```typescript
const MAX_HISTORY = 2000

function isRecordable(url: string): boolean {
  return !!url && url !== BROWSER_NEW_TAB_URL && !url.startsWith('about:')
}

export function recordBrowserVisit(url: string, title: string): void {
  if (!isRecordable(url)) return
  const now = Date.now()
  historyStore.update((cur) => {
    const existing = cur.entries.find((e) => e.url === url)
    const rest = cur.entries.filter((e) => e.url !== url)
    const head = existing
      ? { ...existing, title: title || existing.title, lastVisited: now, visitCount: existing.visitCount + 1 }
      : { url, title, lastVisited: now, visitCount: 1 }
    return { entries: [head, ...rest].slice(0, MAX_HISTORY) }
  })
}
```

**Local file helper pattern** (local `src/main/jsonFileStore.ts` lines 17-44, 83-90):
```typescript
export function readJsonFile<T>(filename: string, fallback: T): T {
  const p = fullPath(filename)
  try {
    if (!fs.existsSync(p)) return fallback
    const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'))
    if (parsed && typeof parsed === 'object') return parsed as T
    return fallback
  } catch (err) {
    log.warn('[jsonFileStore] read %s failed: %s', filename, err instanceof Error ? err.message : String(err))
    return fallback
  }
}

export function removeFile(filename: string): void {
  try {
    const p = fullPath(filename)
    if (fs.existsSync(p)) fs.unlinkSync(p)
  } catch (err) {
    log.warn('[jsonFileStore] remove %s failed: %s', filename, err instanceof Error ? err.message : String(err))
  }
}
```

**Required adaptation:** use a workspace-keyed shape such as `{ workspaces: Record<string, { entries: BrowserHistoryEntry[]; bookmarks: BrowserBookmark[] }> }` or separate files per sanitized workspace. APIs must be `recordBrowserVisit(workspaceId, url, title)`, `getBrowserHistory(workspaceId)`, `addBookmark(workspaceId, url, title)`, `clearBrowserStateForWorkspace(workspaceId)`.

---

### `src/renderer/stores/browserStore.ts` (store, CRUD + pub-sub)

**Analog:** upstream `src/renderer/stores/browserStore.ts`; local settings/app store patterns

**Upstream store shape to adapt** (upstream lines 7-21, 30-45):
```typescript
import { create } from 'zustand'
import type { BrowserHistoryEntry, BrowserBookmark } from '../../shared/types'

interface BrowserStore {
  history: BrowserHistoryEntry[]
  bookmarks: BrowserBookmark[]
  init: () => Promise<void>
  recordVisit: (url: string, title: string) => void
  toggleBookmark: (url: string, title: string) => void
  isBookmarked: (url: string) => boolean
}

init: async () => {
  const [history, bookmarks] = await Promise.all([
    window.electronAPI.browserHistoryGet(),
    window.electronAPI.browserBookmarksGet(),
  ])
  set({ history: history ?? [], bookmarks: bookmarks ?? [] })
}
```

**Required adaptation:** state must be keyed by workspace, e.g. `byWorkspace[workspaceId]`; selectors/actions accept `workspaceId`. Event listeners must check payload workspace before refreshing.

---

### `src/renderer/panels/BookmarksBar.tsx` (component, event-driven)

**Analog:** upstream `src/renderer/panels/BookmarksBar.tsx`

**Copy UI structure, adapt selector** (upstream lines 7-36):
```tsx
import { Globe } from '@phosphor-icons/react'
import { useBrowserStore } from '../stores/browserStore'

export function BookmarksBar({ onNavigate }: Props): JSX.Element | null {
  const bookmarks = useBrowserStore((s) => s.bookmarks)
  const removeBookmark = useBrowserStore((s) => s.toggleBookmark)

  if (bookmarks.length === 0) return null

  return (
    <div className="flex items-center gap-1 px-2 h-8 border-b border-subtle bg-surface-1 overflow-x-auto shrink-0">
      {bookmarks.map((b) => (
        <button key={b.url} onClick={() => onNavigate(b.url)}>
          <Globe size={12} className="text-muted shrink-0" />
          <span className="truncate">{b.title || b.url}</span>
        </button>
      ))}
    </div>
  )
}
```

**Required adaptation:** props include `workspaceId`; read `bookmarksFor(workspaceId)` and remove/toggle only within that workspace.

---

### `src/renderer/panels/BrowserMenu.tsx` and `BrowserSettingsPopover.tsx` (components, event-driven)

**Analogs:** upstream menu/popover; local `src/renderer/settings/BrowserSettings.tsx`

**Menu structure to copy, drop New Tab** (upstream `BrowserMenu.tsx` lines 15-56):
```tsx
export function BrowserMenu({ onOpenSettings, onClose }: Props): JSX.Element {
  const showBookmarksBar = useSettingsStore((s) => s.browserShowBookmarksBar)
  const setSetting = useSettingsStore((s) => s.setSetting)
  // click-outside + Escape listener
  return (
    <div ref={ref} className="absolute right-2 top-12 z-40 w-56 rounded-lg border border-subtle bg-surface-2 shadow-2xl py-1">
      <button onClick={() => setSetting('browserShowBookmarksBar', !showBookmarksBar)}>
        <BookmarkSimple size={14} className="text-muted" />
        <span className="flex-1">Show bookmarks bar</span>
      </button>
      <button onClick={() => { onClose(); onOpenSettings() }}>
        <Gear size={14} className="text-muted" /> Browser settings…
      </button>
    </div>
  )
}
```

**Popover confirmation pattern to keep, homepage/search to drop** (upstream `BrowserSettingsPopover.tsx` lines 18-35, 82-99):
```tsx
const [confirming, setConfirming] = useState(false)
// Close on click-outside / Escape.

<SettingRow label="Show bookmarks bar">
  <Toggle
    checked={store.browserShowBookmarksBar}
    onChange={(v) => store.setSetting('browserShowBookmarksBar', v)}
  />
</SettingRow>

<SecondaryButton onClick={() => { if (confirming) onClearData(); else setConfirming(true) }}>
  {confirming ? 'Confirm clear' : 'Clear…'}
</SecondaryButton>
```

**Local Settings-window source of truth** (local `BrowserSettings.tsx` lines 10-42):
```tsx
<SettingRow label="Homepage">
  <TextInput
    value={store.browserHomepage}
    onChange={(v) => store.setSetting('browserHomepage', v)}
    placeholder="about:blank"
  />
</SettingRow>
<SettingRow label="Search engine">
  <Select
    value={store.browserSearchEngine}
    onChange={(v) => store.setSetting('browserSearchEngine', v as BrowserSearchEngine)}
  />
</SettingRow>
```

**Required adaptation:** in-panel popover hosts only bookmarks-bar toggle and scoped clear-data. Homepage/search stay in `BrowserSettings.tsx`, where `browserShowBookmarksBar` must also be surfaced.

---

### `src/main/webSecurity.ts` (middleware, event-driven)

**Analog:** current `src/main/webSecurity.ts`; upstream `webSecurity.ts`

**Current hardening pattern to preserve** (local lines 108-137):
```typescript
contents.on('will-attach-webview', (event, webPreferences, params) => {
  if (disableWebviewHardening()) return

  const src = typeof params.src === 'string' ? params.src : 'about:blank'
  if (!isAllowedGuestUrl(src)) {
    log.warn('[webview] Blocked guest attach for URL %s', src)
    event.preventDefault()
    return
  }

  delete (webPreferences as { preload?: string }).preload
  webPreferences.nodeIntegration = false
  webPreferences.contextIsolation = true
  webPreferences.sandbox = true
  webPreferences.webSecurity = true

  const partition = typeof webPreferences.partition === 'string' ? webPreferences.partition : undefined
  const targetSession = guestSessionFor(contents, partition)
  configureGuestSessionPolicies(targetSession, partition ?? '__default__')
})
```

**Shortcut classifier pattern to copy with product restriction** (upstream lines 7-26, 130-143):
```typescript
function browserActionForInput(input: Electron.Input): BrowserShortcutAction | null {
  if (input.type !== 'keyDown') return null
  const mod = process.platform === 'darwin' ? input.meta : input.control
  if (!mod) return null
  switch (input.code) {
    case 'KeyR': return input.shift ? 'reloadHard' : 'reload'
    case 'KeyL': return input.shift ? null : 'focusUrl'
    case 'BracketLeft': return input.shift ? null : 'back'
    case 'BracketRight': return input.shift ? null : 'forward'
    default: return null
  }
}

contents.on('before-input-event', (event, input) => {
  const action = browserActionForInput(input)
  if (!action) return
  event.preventDefault()
  contents.hostWebContents?.send(BROWSER_SHORTCUT, action)
})
```

**Required adaptation:** product allows only Cmd/Ctrl+R, L, `[`, `]`; omit hard reload if interpreting D-24 strictly. Tests must prove Cmd/Ctrl+T, W, Shift+B are rejected. Check `DEFAULT_SHORTCUTS` lines 717-745 and `menu.ts` lines 99-109 for collisions.

---

### `src/main/workspaceManager.ts` (service/controller, CRUD + event-driven)

**Analog:** current `src/main/workspaceManager.ts`

**Removal home** (lines 188-199, 240-248):
```typescript
export function removeWorkspace(id: string): boolean {
  if (!isValidWorkspaceId(id)) {
    log.warn('workspaceManager: removeWorkspace called with invalid id: %s', id)
    return false
  }
  const existing = workspaces.get(id)
  if (existing?.rootPath) {
    removeAllowedRoot(existing.rootPath)
  }
  const removed = workspaces.delete(id)
  if (removed) log.info('Workspace removed: %s', id)
  return removed
}

ipcMain.handle(WORKSPACE_REMOVE, async (event, id: string) => {
  const removed = removeWorkspace(id)
  if (removed) {
    const win = windowFromEvent(event)
    broadcastWorkspaceChange(win?.id)
  }
  return removed
})
```

**Required adaptation:** call browser cleanup beside existing teardown after a valid workspace ID is removed. Keep FlashQuery token behavior untouched; do not call `setWorkspaceToken` or client manager from browser cleanup.

---

### `src/shared/ipc-channels.ts`, `src/preload/index.ts`, `src/shared/electron-api.d.ts` (contracts/providers)

**Analog:** current shared/preload contracts

**Channel grouping pattern** (`ipc-channels.ts` lines 229-234):
```typescript
// Webview
export const WEBVIEW_SCREENSHOT = 'webview:screenshot'
export const NATIVE_FILE_DRAG = 'native:fileDrag'

// Page capture
export const CAPTURE_PAGE = 'capture-page'
```

**Preload invoke pattern** (`preload/index.ts` lines 773-782):
```typescript
capturePage(): Promise<string | null> {
  return ipcRenderer.invoke(CAPTURE_PAGE)
},

webviewScreenshot(webContentsId: number): Promise<{ filePath: string; dataUrl: string } | null> {
  return ipcRenderer.invoke(WEBVIEW_SCREENSHOT, webContentsId)
},
```

**API declaration pattern** (`electron-api.d.ts` lines 439-446, 650-652):
```typescript
/** Capture the current page as a data URL for panel previews. */
capturePage(): Promise<string | null>

/** Capture a webview's content and save as PNG. Returns file path + data URL or null. */
webviewScreenshot(webContentsId: number): Promise<{ filePath: string; dataUrl: string } | null>

orchRegisterPortalWc(payload: { panelId: string; webContentsId: number; alive: boolean }): void
```

**Required adaptation:** add browser history/bookmark/clear-data/shortcut methods and listeners without renaming existing FlashQuery constants or screenshot APIs. Listener callbacks for history/bookmark changed should receive `{ workspaceId: string }`.

---

### `src/shared/types.ts`, `src/main/store.ts`, `src/renderer/stores/settingsStore.ts`, `src/renderer/settings/BrowserSettings.tsx` (settings schema/config/UI)

**Analog:** current settings path

**Settings model/default pattern** (`types.ts` lines 1047-1055, 1077-1115):
```typescript
// Browser
browserHomepage: string
browserSearchEngine: BrowserSearchEngine
terminalLinkOpenTarget: TerminalLinkOpenTarget

export const DEFAULT_SETTINGS: AppSettings = {
  browserHomepage: 'about:blank',
  browserSearchEngine: 'google',
  terminalLinkOpenTarget: 'ask',
}
```

**Main schema pattern** (`store.ts` lines 32-66):
```typescript
const SETTINGS_SCHEMA: Record<keyof AppSettings, string> = {
  browserHomepage: 'string',
  browserSearchEngine: 'string',
  terminalLinkOpenTarget: 'string',
}
```

**Renderer store persistence pattern** (`settingsStore.ts` lines 61-67, 97-105):
```typescript
setSetting(key, value) {
  set({ [key]: value } as Partial<SettingsStoreState>)
  const api = getElectronAPI()
  if (api) {
    api.settingsSet(key, value).catch((err) => log.warn('[settings] Save failed for %s:', key, err))
  }
}

for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof AppSettings)[]) {
  if (key in stored && stored[key] !== undefined) {
    ;(merged as Record<string, unknown>)[key] = stored[key]
  }
}
```

**Required adaptation:** add `browserShowBookmarksBar: boolean` to `AppSettings`, `DEFAULT_SETTINGS`, `SETTINGS_SCHEMA`, Settings-window `BrowserSettings.tsx`, and in-panel menu/popover. Consider adding it to `LIVE_REACTIVE_SETTINGS` only if existing renderer settings broadcasts are needed outside `settingsStore` updates.

---

### `src/renderer/shells/PanelWindowShell.tsx` and `DockWindowShell.tsx` (providers, workspace threading)

**Analog:** current shell render paths

**Risky current detached panel fallback** (`PanelWindowShell.tsx` lines 261-270):
```tsx
<PanelContent
  panel={displayPanel}
  workspaceId={workspaceId ?? ''}
  createEditorForOpen={createEditorForOpen}
  setEditorPreviewForOpen={setEditorPreviewForOpen}
  focusEditorForOpen={focusEditorForOpen}
/>
```

**Detached dock workspace threading pattern** (`DockWindowShell.tsx` lines 65-80, 337-355, 364-373):
```typescript
const cleanup = window.electronAPI.onDockWindowInit((payload: DockWindowInitPayload) => {
  setPanels(payload.panels)
  setWsId(payload.workspaceId)
  dockStore.getState().restoreSnapshot({ zones: payload.dockState, locations: {} })
  setReady(true)
})

const content = renderPanelComponent(panel, { workspaceId: wsId, nodeId, zoomLevel: zoom }, {
  createEditorForOpen,
  setEditorPreviewForOpen,
  focusEditorForOpen,
})

<CanvasPanel
  panelId={panelId}
  workspaceId={wsId}
  nodeId=""
  renderPanelContent={renderPanelContent}
/>
```

**Required adaptation:** never pass an empty workspace ID to `BrowserPanel`. Resolve the owning workspace before rendering or fail closed for browser panels.

---

### `src/renderer/lib/portalRegistry.ts` (utility/service, event-driven)

**Analog:** current `src/renderer/lib/portalRegistry.ts`

**Fork bridge pattern to preserve** (lines 30-61):
```typescript
function pushToMain(panelId: string, webContentsId: number, alive: boolean): void {
  try {
    const ipc = (window as any).electronAPI
    if (!ipc?.orchRegisterPortalWc) return
    ipc.orchRegisterPortalWc({ panelId, webContentsId, alive })
  } catch { /* best effort */ }
}

export const portalRegistry = {
  register(panelId: string, webview: PortalWebview): void {
    byPanelId.set(panelId, { webview })
    let wcId = 0
    try { wcId = webview.getWebContentsId() } catch { /* fine */ }
    if (wcId) pushToMain(panelId, wcId, true)
  },
  unregister(panelId: string): void {
    const entry = byPanelId.get(panelId)
    if (entry) {
      let wcId = 0
      try { wcId = entry.webview.getWebContentsId() } catch { /* fine */ }
      if (wcId) pushToMain(panelId, wcId, false)
    }
    byPanelId.delete(panelId)
  },
}
```

---

### `src/renderer/lib/e2eHarness.ts`, `e2e/fixtures/electron-app.ts`, `e2e/browser-uplift.spec.ts` (test utilities/E2E)

**Analog:** current E2E harness and FlashQuery persistence spec

**Harness gating and API shape** (`e2eHarness.ts` lines 1-8, 25-84, 510-559):
```typescript
// E2E test harness — exposes a tiny inspect/seed API on window.__cateE2E
// when the app is launched with CATE_E2E=1.

declare global {
  interface Window {
    __cateE2E?: {
      ready: true
      selectedWorkspaceId(): string
      ensureWorkspaceRoot(rootPath: string): Promise<string>
      detachPanelToDockWindow(panelId: string): Promise<number | null>
    }
  }
}

window.__cateE2E = {
  ready: true,
  selectedWorkspaceId,
  ensureWorkspaceRoot,
  detachPanelToDockWindow,
}
```

**Launch pattern with isolated userData** (`e2e/fixtures/electron-app.ts` lines 23-42):
```typescript
export async function launchApp(options: LaunchAppOptions = {}): Promise<LaunchResult> {
  const env = {
    ...process.env,
    ...options.env,
    CATE_E2E: '1',
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: undefined,
    ...(options.userDataDir ? { CATE_E2E_USER_DATA_DIR: options.userDataDir } : {}),
  }

  const electronApp = await electron.launch({ args: ['.'], cwd: REPO_ROOT, env })
  const mainWindow = await electronApp.firstWindow()
  await mainWindow.waitForFunction(() => window.__cateE2E?.ready === true, { timeout: 15_000 })
  return { electronApp, mainWindow }
}
```

**Restart persistence pattern** (`e2e/flashquery-persistence.spec.ts` lines 60-89):
```typescript
const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-user-data-'))
let launched = await launchApp({ userDataDir })
const workspaceId = await configureConnection(firstPage, workspaceRoot, server)
await closeApp(app)

launched = await launchApp({ userDataDir })
const restartedPage = launched.mainWindow
const restoredWorkspaceId = await restartedPage.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
```

**Required adaptation:** add browser helper methods only behind `CATE_E2E=1`, such as create browser panel, inspect webview partition if feasible, navigate local test page, detach browser panel, simulate crash only if needed. Use local HTTP servers for cookies/localStorage/session tests.

## Shared Patterns

### Process Boundaries
**Source:** AGENTS.md + `src/preload/index.ts` + `src/shared/electron-api.d.ts`
**Apply to:** renderer components/stores, browser IPC, capture IPC

Renderer calls `window.electronAPI`; privileged session clearing, screenshot, filesystem writes, and `webContents` ownership checks stay in main. Shared contracts live in `src/shared`.

### Webview Security
**Source:** `src/main/webSecurity.ts` lines 108-137
**Apply to:** all webview partition and shortcut changes

Preserve `will-attach-webview` validation, preload stripping, `nodeIntegration=false`, `contextIsolation=true`, `sandbox=true`, `webSecurity=true`, and per-partition session policy setup. Add shortcut forwarding inside the webview `contents.getType() === 'webview'` branch.

### FlashQuery Isolation
**Source:** `src/main/workspaceManager.ts` lines 72-79, `src/shared/ipc-channels.test.ts` lines 4-33, `e2e/flashquery-persistence.spec.ts` lines 51-57
**Apply to:** `src/main/ipc/browser.ts`, `src/main/browserStateStore.ts`, `src/main/workspaceManager.ts`, shared/preload changes

Browser code must not import or call `src/main/flashquery/credentials.ts`, `src/main/ipc/flashquery.ts`, or `src/main/flashquery/clientManager.ts`. Contract tests should assert FlashQuery channel values remain exact and token strings do not leak into workspace/session files.

### IPC Handler Testing
**Source:** `src/main/ipc/flashquery.test.ts` lines 143-205; `src/main/ipc/git.test.ts` lines 1-33
**Apply to:** `src/main/ipc/browser.test.ts`, `src/main/ipc/capture.test.ts`, `src/main/webSecurity.test.ts`

Mock `electron` before dynamic import when handler registration is import-sensitive. Capture `ipcMain.handle` calls, assert exact channels and idempotence where applicable. Use temp dirs with `fs.mkdtemp`/`fs.rm` for file-backed tests.

### Settings Schema
**Source:** `src/shared/types.ts` lines 1047-1115, `src/main/store.ts` lines 32-66, `src/renderer/stores/settingsStore.ts` lines 61-67
**Apply to:** `browserShowBookmarksBar`

Every new setting needs four surfaces: shared type, default, main schema, renderer/UI. Wrong-type values are filtered by main schema.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/main/ipc/browser.ts` | route/controller | request-response + pub-sub | No local browser IPC module exists; use local IPC style plus upstream browser handlers embedded in `store.ts`. |
| `src/renderer/stores/browserStore.ts` | store | CRUD + pub-sub | No local browser Zustand store exists; adapt upstream global store to workspace-keyed state. |
| `src/main/browserStateStore.ts` | service/store | CRUD + file-I/O | No local browser state store exists; use local `jsonFileStore`/project-state atomic write patterns or lift upstream `jsonStateFile` if richer watching/debounce is desired. |
| `e2e/browser-uplift.spec.ts` | test | E2E | No browser-specific E2E spec exists; compose from `flashquery-persistence.spec.ts`, `smoke.spec.ts`, and `electron-app.ts`. |

## Metadata

**Analog search scope:** `src/main`, `src/renderer`, `src/shared`, `e2e`, plus `upstream/main` browser files named by the product docs.
**Files scanned:** 40+
**Pattern extraction date:** 2026-06-26
**Project skills:** none found in Cate `.codex/skills` or `.agents/skills`.
