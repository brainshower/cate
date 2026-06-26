import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, createBrowserPanel, createWorkspace, evalBrowserPanel, launchApp, waitForBrowserPartition } from './fixtures/electron-app'
import type { ElectronApplication, Page } from 'playwright'

async function startLocalBrowserServer(
  handler: Parameters<typeof createServer>[0] = (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><title>Cate Browser Uplift</title><body>browser uplift local page</body>')
  },
): Promise<{ baseUrl: string; close(): Promise<void> }> {
  const server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to bind local browser server')
  return {
    baseUrl: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise<void>((resolve, reject) => {
      ;(server as Server).close((error) => error ? reject(error) : resolve())
    }),
  }
}

async function unusedLocalPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to bind local port')
  const port = address.port
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
  return port
}

test('T-E-001/T-E-021 browser storage persists across browser-panel recreation in the same workspace partition', async () => {
  const server = await startLocalBrowserServer()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-uplift-user-data-'))
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-uplift-workspace-'))
  const { electronApp: app, mainWindow: page } = await launchApp({ userDataDir })

  try {
    const workspaceId = await page.evaluate((rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
    const panelId = await createBrowserPanel(page, server.baseUrl)

    await expect(await waitForBrowserPartition(page, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await evalBrowserPanel(page, panelId, "document.cookie = 'cateSession=persisted; Max-Age=3600; Path=/'; document.cookie")
    await page.evaluate((id) => window.__cateE2E!.closePanel(id), panelId)

    const recreatedPanelId = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, recreatedPanelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await expect(await evalBrowserPanel(page, recreatedPanelId, "document.cookie.includes('cateSession=persisted')")).toBe(true)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-002 browser storage is isolated between workspace partitions', async () => {
  const server = await startLocalBrowserServer()
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const workspaceA = await createWorkspace(page, 'Browser Workspace A')
    const panelA = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, panelA)).toBe(`persist:browser-ws-${workspaceA}`)
    await evalBrowserPanel(page, panelA, "document.cookie = 'cateSession=workspace-a; Max-Age=3600; Path=/'; document.cookie")

    const workspaceB = await createWorkspace(page, 'Browser Workspace B')
    const panelB = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, panelB)).toBe(`persist:browser-ws-${workspaceB}`)
    await expect(await evalBrowserPanel(page, panelB, "document.cookie.includes('cateSession=workspace-a')")).toBe(false)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-003/T-E-020 detached browser windows reuse the same workspace partition', async () => {
  const server = await startLocalBrowserServer()
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const workspaceId = await page.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    const panelId = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await evalBrowserPanel(page, panelId, "document.cookie = 'cateSession=detached-shared; Max-Age=3600; Path=/'; document.cookie")

    const before = app.windows().length
    await page.evaluate((id) => window.__cateE2E!.detachPanelToDockWindow(id), panelId)
    await expect.poll(() => app.windows().length).toBeGreaterThan(before)
    const detachedPage = app.windows()[app.windows().length - 1]
    await detachedPage.waitForLoadState('domcontentloaded')

    await expect(await waitForBrowserPartition(detachedPage, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await expect(await evalBrowserPanel(detachedPage, panelId, "document.cookie.includes('cateSession=detached-shared')")).toBe(true)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-007 page with failing subresource remains visible without failed-load overlay', async () => {
  const missingPort = await unusedLocalPort()
  const server = await startLocalBrowserServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(`<!doctype html>
      <title>Cate Browser Uplift Subresource</title>
      <body>
        <h1 id="loaded">subresource page loaded</h1>
        <img src="http://127.0.0.1:${missingPort}/missing.png" />
      </body>`)
  })
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const panelId = await createBrowserPanel(page, server.baseUrl)

    await expect.poll(async () => {
      return evalBrowserPanel(page, panelId, "document.querySelector('#loaded')?.textContent")
    }).toBe('subresource page loaded')
    await expect(page.getByText('Failed to load page')).toHaveCount(0)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-008 main-frame navigation failure shows failed-load overlay', async () => {
  const missingPort = await unusedLocalPort()
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    await createBrowserPanel(page, `http://127.0.0.1:${missingPort}/missing`, { waitForLoad: false })

    await expect(page.getByText('Failed to load page')).toBeVisible()
  } finally {
    await closeApp(app)
  }
})
