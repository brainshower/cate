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
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('browse-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
}

test('T-E-011 covers empty vault, refresh, and multi-level browsing', async () => {
  const server = await startFlashQueryStubServer()
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-workspace-'))
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await configure(page, server.baseUrl, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 260, y: 180 }))

    await expect(page.getByText('Projects').first()).toBeVisible()
    await page.getByText('Projects').first().click()
    await expect(page.getByText('Cate').first()).toBeVisible()
    await page.getByText('Deep').first().click()
    await expect(page.getByText('Nested').first()).toBeVisible()

    await page.getByLabel('Refresh vault').click()
    await expect(page.getByText('Nested').first()).toBeVisible()

    server.seedEmptyVault()
    await page.getByLabel('Refresh vault').click()
    await expect(page.getByText('This vault has no documents yet.')).toBeVisible()
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
