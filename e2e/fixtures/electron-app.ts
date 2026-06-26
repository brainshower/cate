// E2E fixture: launch the built Electron app with an isolated userData dir.
//
// Each spec calls `launchApp()` in beforeEach. CATE_E2E=1 causes:
//   - main process to point app.setPath('userData', tmpdir)
//   - renderer to install window.__cateE2E (see src/renderer/lib/e2eHarness.ts)

import { _electron as electron, type ElectronApplication, type Page } from 'playwright'
import path from 'node:path'

export interface LaunchResult {
  electronApp: ElectronApplication
  mainWindow: Page
}

export interface LaunchAppOptions {
  userDataDir?: string
  env?: Record<string, string | undefined>
  perf?: boolean
}

const REPO_ROOT = path.resolve(__dirname, '..', '..')

export async function launchApp(options: LaunchAppOptions = {}): Promise<LaunchResult> {
  const env = {
    ...process.env,
    ...options.env,
    CATE_E2E: '1',
    NODE_ENV: 'production',
    ELECTRON_RUN_AS_NODE: undefined,
    ...(options.perf ? { CATE_PERF: '1' } : {}),
    ...(options.userDataDir ? { CATE_E2E_USER_DATA_DIR: options.userDataDir } : {}),
  }

  const electronApp = await electron.launch({
    args: ['.'],
    cwd: REPO_ROOT,
    env,
  })
  const mainWindow = await electronApp.firstWindow()
  await mainWindow.waitForLoadState('domcontentloaded')
  await mainWindow.waitForFunction(() => window.__cateE2E?.ready === true, { timeout: 15_000 })
  return { electronApp, mainWindow }
}

export async function closeApp(electronApp: ElectronApplication): Promise<void> {
  try {
    await electronApp.close()
  } catch {
    /* best-effort */
  }
}

export async function quitApp(electronApp: ElectronApplication): Promise<void> {
  const closed = electronApp.waitForEvent('close', { timeout: 10_000 })
    .then(() => true)
    .catch(() => false)

  await electronApp.evaluate(({ app }) => {
    app.quit()
  }).catch(() => {
    // The process may exit before Playwright receives the evaluate response.
  })

  if (!await closed) {
    await closeApp(electronApp)
  }
}

// -----------------------------------------------------------------------------
// Drag helpers
// -----------------------------------------------------------------------------

export async function dragMouse(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  opts: { steps?: number; holdDownMs?: number; pauseAtEnd?: number } = {},
): Promise<void> {
  const steps = opts.steps ?? 20
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  if (opts.holdDownMs) await page.waitForTimeout(opts.holdDownMs)
  await page.mouse.move(to.x, to.y, { steps })
  if (opts.pauseAtEnd) await page.waitForTimeout(opts.pauseAtEnd)
  await page.mouse.up()
}

export async function getNodeRect(
  page: Page,
  nodeId: string,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  const handle = await page.$(`[data-node-id="${nodeId}"]`)
  if (!handle) return null
  return handle.boundingBox()
}

export async function getNodeOrigin(
  page: Page,
  nodeId: string,
): Promise<{ x: number; y: number } | null> {
  return page.evaluate((id) => {
    const n = window.__cateE2E?.nodes().find((x) => x.id === id)
    return n ? n.origin : null
  }, nodeId)
}

export async function seedTerminal(
  page: Page,
  point: { x: number; y: number } = { x: 200, y: 200 },
): Promise<string> {
  const id = await page.evaluate((p) => window.__cateE2E!.createTerminal(p), point)
  // Wait for the entering animation to settle so opacity/transform are at
  // their final values before tests interact with the node.
  await page.waitForSelector(`[data-node-id="${id}"]`)
  await page.waitForTimeout(400)
  return id
}

export async function seedCanvasPanel(
  page: Page,
  point: { x: number; y: number } = { x: 200, y: 200 },
): Promise<string> {
  return page.evaluate((p) => window.__cateE2E!.createCanvasPanel(p), point)
}

export async function createWorkspace(page: Page, name: string): Promise<string> {
  return page.evaluate((workspaceName) => window.__cateE2E!.createWorkspace(workspaceName), name)
}

export async function createBrowserPanel(
  page: Page,
  url: string,
  options: { waitForLoad?: boolean } = {},
): Promise<string> {
  const panelId = await page.evaluate((targetUrl) => window.__cateE2E!.createBrowserPanel(targetUrl), url)
  await page.waitForSelector(`webview[data-browser-panel-id="${panelId}"]`, { timeout: 10_000 })
  if (options.waitForLoad ?? true) {
    await waitForBrowserUrl(page, panelId, url)
  }
  return panelId
}

export async function waitForBrowserPartition(page: Page, panelId: string): Promise<string | null> {
  const selector = `webview[data-browser-panel-id="${panelId}"]`
  await page.waitForSelector(selector, { timeout: 10_000 })
  return page.locator(selector).getAttribute('partition')
}

export async function evalBrowserPanel(page: Page, panelId: string, script: string): Promise<unknown> {
  return page.evaluate(async ({ id, source }) => {
    const deadline = Date.now() + 10_000
    while (Date.now() < deadline) {
      const webview = document.querySelector(`webview[data-browser-panel-id="${id}"]`) as
        | (HTMLElement & { executeJavaScript?: (script: string) => Promise<unknown> })
        | null
      if (webview?.executeJavaScript) {
        try {
          return await webview.executeJavaScript(source)
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 50))
          continue
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
    throw new Error(`Browser webview not ready for panel ${id}`)
  }, { id: panelId, source: script })
}

async function waitForBrowserUrl(page: Page, panelId: string, expectedUrl: string): Promise<void> {
  await page.waitForFunction(
    async ({ id, url }) => {
      const webview = document.querySelector(`webview[data-browser-panel-id="${id}"]`) as
        | (HTMLElement & { executeJavaScript?: (script: string) => Promise<unknown> })
        | null
      if (!webview?.executeJavaScript) return false
      try {
        const current = await webview.executeJavaScript('location.href')
        return typeof current === 'string' && current.startsWith(url)
      } catch {
        return false
      }
    },
    { id: panelId, url: expectedUrl },
    { timeout: 10_000 },
  )
}

export async function setZoom(page: Page, zoom: number): Promise<void> {
  await page.evaluate((z) => window.__cateE2E!.setZoom(z), zoom)
  await page.waitForTimeout(80)
}

export async function resetViewport(page: Page): Promise<void> {
  await page.evaluate(() => window.__cateE2E!.resetViewport())
  await page.waitForTimeout(30)
}

export async function dragSnapshot(page: Page) {
  return page.evaluate(() => window.__cateE2E!.dragSnapshot())
}

export async function titleBarCentre(
  page: Page,
  nodeId: string,
): Promise<{ x: number; y: number } | null> {
  const rect = await getNodeRect(page, nodeId)
  if (!rect) return null
  // Aim INSIDE the first tab (the tab handler routes to dock-tab drag, which
  // resolveDrop maps to canvas-reposition for same-canvas drops). The empty
  // tab-bar spacer absorbs mousedown without dispatching to the host's
  // onTabBarMouseDown, so we deliberately target a real tab element.
  return { x: rect.x + 40, y: rect.y + 6 }
}

export async function waitForGhost(
  page: Page,
  timeout = 2000,
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  try {
    const handle = await page.waitForSelector('[data-drag-overlay-ghost="true"]', {
      state: 'attached',
      timeout,
    })
    return handle.boundingBox()
  } catch {
    return null
  }
}

/** Pick the first canvas-node currently in the DOM. */
export async function firstNodeInfo(page: Page): Promise<{
  nodeId: string
  rect: { x: number; y: number; width: number; height: number }
  grab: { x: number; y: number }
} | null> {
  const handle = await page.$('[data-node-id]')
  if (!handle) return null
  const nodeId = (await handle.getAttribute('data-node-id')) ?? ''
  const rect = await handle.boundingBox()
  if (!rect) return null
  return {
    nodeId,
    rect,
    grab: { x: rect.x + rect.width / 2, y: rect.y + 14 },
  }
}
