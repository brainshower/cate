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
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('happy-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
  return workspaceId
}

test('T-E-008/T-E-009 completes the FlashQuery happy path and opens on canvas', async () => {
  const server = await startFlashQueryStubServer()
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-workspace-'))
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await configure(page, server.baseUrl, workspaceRoot)

    await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 260, y: 180 }))
    await expect(page.getByText('Welcome').first()).toBeVisible()
    await page.getByText('Welcome').first().dblclick()
    await expect(page.getByText('Vault').first()).toBeVisible()

    await page.evaluate(async () => {
      await window.__cateE2E!.writeVaultDocument('Welcome.md', '# Welcome\n\nEdited through Cate E2E.')
      await window.__cateE2E!.openVaultDocument('Welcome.md', 'dock')
    })
    expect(server.documentBody('Welcome.md')).toBe('# Welcome\n\nEdited through Cate E2E.')

    const canvasPanelId = await page.evaluate(() => window.__cateE2E!.openVaultDocument('Projects/Cate.md', 'canvas'))
    await expect.poll(async () => {
      return page.evaluate((panelId) => window.__cateE2E!.panelLocation(panelId), canvasPanelId)
    }).toBe('canvas')
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
