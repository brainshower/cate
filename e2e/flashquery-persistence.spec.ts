import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, launchApp } from './fixtures/electron-app'
import { startFlashQueryStubServer, type FlashQueryStubServer } from './fixtures/flashquery-server'
import type { ElectronApplication, Page } from 'playwright'

async function configureConnection(page: Page, workspaceRoot: string, server: FlashQueryStubServer) {
  const workspaceId = await page.evaluate(async (rootPath) => {
    return window.__cateE2E!.ensureWorkspaceRoot(rootPath)
  }, workspaceRoot)

  await page.evaluate((id) => window.__cateE2E!.openFlashQueryConnectionDialog(id), workspaceId)
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeVisible()
  await page.getByLabel('FlashQuery URL').fill(server.baseUrl)
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('persisted-e2e-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()

  await expect.poll(() => server.counts().infoRequestCount).toBeGreaterThan(0)
  await expect.poll(async () => {
    return page.evaluate((id) => window.__cateE2E!.workspaceFlashQueryConnection(id), workspaceId)
  }).toMatchObject({ transport: 'http', url: server.baseUrl })
  await page.waitForTimeout(800)
  return workspaceId
}

async function openVaultPanel(page: Page): Promise<string> {
  const panelId = await page.evaluate(() => {
    const api = window.__cateE2E!
    return api.createFlashQueryVault({ x: 280, y: 180 })
  })
  await expect(page.getByText('FlashQuery Vault').first()).toBeVisible()
  return panelId
}

test('T-E-006/T-E-007 persists FlashQuery connection across restart without eager info probe', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'persisted-e2e-token' })
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-user-data-'))
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-workspace-'))
  let app: ElectronApplication | null = null

  try {
    let launched = await launchApp({ userDataDir })
    app = launched.electronApp
    const firstPage = launched.mainWindow
    const workspaceId = await configureConnection(firstPage, workspaceRoot, server)
    await closeApp(app)
    app = null

    server.resetCounts()
    expect(server.counts()).toEqual({ infoRequestCount: 0, mcpPostCount: 0 })

    launched = await launchApp({ userDataDir })
    app = launched.electronApp
    const restartedPage = launched.mainWindow

    const restoredWorkspaceId = await restartedPage.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    const restoredConnection = await restartedPage.evaluate((id) => {
      return window.__cateE2E!.workspaceFlashQueryConnection(id)
    }, restoredWorkspaceId)
    expect(restoredConnection).toMatchObject({ transport: 'http', url: server.baseUrl })
    expect(server.counts().infoRequestCount).toBe(0)

    await openVaultPanel(restartedPage)
    await expect(restartedPage.getByText('Welcome').first()).toBeVisible()
    expect(server.counts().infoRequestCount).toBe(1)
    expect(server.counts().mcpPostCount).toBeGreaterThan(0)
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
