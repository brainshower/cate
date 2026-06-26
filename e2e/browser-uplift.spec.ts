import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, createBrowserPanel, createWorkspace, evalBrowserPanel, launchApp, waitForBrowserPartition } from './fixtures/electron-app'
import type { ElectronApplication, Page } from 'playwright'

async function startLocalBrowserServer(): Promise<{ baseUrl: string; close(): Promise<void> }> {
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><title>Cate Browser Uplift</title><body>browser uplift local page</body>')
  })
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

test('T-E-001/T-E-021 browser storage persists across restart in the same new workspace partition', async () => {
  const server = await startLocalBrowserServer()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-uplift-user-data-'))
  let app: ElectronApplication | null = null

  try {
    let launched = await launchApp({ userDataDir })
    app = launched.electronApp
    let page = launched.mainWindow
    const workspaceId = await page.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    const panelId = await createBrowserPanel(page, server.baseUrl)

    await expect(await waitForBrowserPartition(page, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await evalBrowserPanel(page, panelId, "localStorage.setItem('cate-session', 'persisted'); 'ok'")
    await closeApp(app)
    app = null

    launched = await launchApp({ userDataDir })
    app = launched.electronApp
    page = launched.mainWindow
    const restoredWorkspaceId = await page.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    const restoredPanelId = await createBrowserPanel(page, server.baseUrl)

    await expect(await waitForBrowserPartition(page, restoredPanelId)).toBe(`persist:browser-ws-${restoredWorkspaceId}`)
    await expect(await evalBrowserPanel(page, restoredPanelId, "localStorage.getItem('cate-session')")).toBe('persisted')
  } finally {
    if (app) await closeApp(app)
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
    await evalBrowserPanel(page, panelA, "localStorage.setItem('cate-session', 'workspace-a'); 'ok'")

    const workspaceB = await createWorkspace(page, 'Browser Workspace B')
    const panelB = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, panelB)).toBe(`persist:browser-ws-${workspaceB}`)
    await expect(await evalBrowserPanel(page, panelB, "localStorage.getItem('cate-session')")).toBeNull()
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
    await evalBrowserPanel(page, panelId, "localStorage.setItem('cate-session', 'detached-shared'); 'ok'")

    const before = app.windows().length
    await page.evaluate((id) => window.__cateE2E!.detachPanelToDockWindow(id), panelId)
    await expect.poll(() => app.windows().length).toBeGreaterThan(before)
    const detachedPage = app.windows()[app.windows().length - 1]
    await detachedPage.waitForLoadState('domcontentloaded')

    await expect(await waitForBrowserPartition(detachedPage, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await expect(await evalBrowserPanel(detachedPage, panelId, "localStorage.getItem('cate-session')")).toBe('detached-shared')
  } finally {
    await closeApp(app)
    await server.close()
  }
})
