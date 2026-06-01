import { test, expect } from '@playwright/test'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, launchApp } from './fixtures/electron-app'
import { startFlashQueryStubServer } from './fixtures/flashquery-server'
import type { ElectronApplication, Page } from 'playwright'

async function configure(page: Page, serverUrl: string, workspaceRoot: string) {
  const workspaceId = await page.evaluate(async (rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
  await page.evaluate((id) => window.__cateE2E!.openFlashQueryConnectionDialog(id), workspaceId)
  await page.getByLabel('FlashQuery URL').fill(serverUrl)
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('retry-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
}

test('T-E-003 disconnect and retry / T-E-010 shows disconnected state and recovers via retry', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'retry-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-workspace-'))
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await configure(page, server.baseUrl, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 260, y: 180 }))
    await expect(page.getByText('Welcome').first()).toBeVisible()
    await expect(page.getByText('Live').first()).toBeVisible()

    server.setAvailable(false)
    await page.evaluate(() => window.__cateE2E!.retryFlashQuery())
    const disconnectedChip = page.getByRole('button', { name: 'Disconnected' })
    await expect(disconnectedChip).toBeVisible()
    await disconnectedChip.hover()
    await expect(page.getByRole('tooltip')).toContainText(/503|unavailable|Failed/i)
    await expect(page.getByText("Can't reach FlashQuery.")).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()

    server.setAvailable(true)
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(page.getByText('Live').first()).toBeVisible()
    await expect(page.getByText('Welcome').first()).toBeVisible()
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
