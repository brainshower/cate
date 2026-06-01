import { test, expect } from '@playwright/test'
import { mkdir, mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, launchApp } from './fixtures/electron-app'
import { startFlashQueryStubServer } from './fixtures/flashquery-server'
import type { ElectronApplication, Page } from 'playwright'

const EVIDENCE_DIR = path.resolve(
  process.cwd(),
  '.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual',
)

async function configure(page: Page, serverUrl: string, workspaceRoot: string) {
  const workspaceId = await page.evaluate(async (rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
  await page.evaluate((id) => window.__cateE2E!.openFlashQueryConnectionDialog(id), workspaceId)
  await page.getByLabel('FlashQuery URL').fill(serverUrl)
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('visual-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
  return workspaceId
}

async function switchTheme(page: Page, themeId: 'dark-warm' | 'light-subtle') {
  await page.evaluate(async (id) => {
    await window.electronAPI.settingsSet('activeThemeId', id)
    window.location.reload()
  }, themeId)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForFunction(() => window.__cateE2E?.ready === true, { timeout: 15_000 })
  await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe(
    themeId === 'light-subtle' ? 'light' : 'dark',
  )
}

async function prepareVisualSurfaces(page: Page, serverUrl: string, workspaceRoot: string) {
  const workspaceId = await configure(page, serverUrl, workspaceRoot)
  await page.getByTitle('FlashQuery Vault').click()
  await expect(page.getByTestId('vault-panel-header')).toBeVisible()
  await expect(page.getByRole('treeitem', { name: /Welcome/ }).first()).toBeVisible()
  await page.evaluate(() => window.__cateE2E!.openVaultDocument('Welcome.md', 'dock'))
  await expect(page.getByTestId('vault-badge')).toBeVisible()
  await page.evaluate((id) => window.__cateE2E!.openFlashQueryConnectionDialog(id), workspaceId)
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeVisible()
}

test('T-A-005..T-A-009 captures FlashQuery visual evidence in light and dark themes', async () => {
  await mkdir(EVIDENCE_DIR, { recursive: true })
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'visual-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-workspace-'))
  let app: ElectronApplication | null = null

  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow

    for (const [themeId, label] of [
      ['dark-warm', 'dark'],
      ['light-subtle', 'light'],
    ] as const) {
      await switchTheme(page, themeId)
      await prepareVisualSurfaces(page, server.baseUrl, workspaceRoot)
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `flashquery-surfaces-${label}.png`),
        fullPage: true,
      })
    }
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
