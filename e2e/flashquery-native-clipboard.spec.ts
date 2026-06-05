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
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('native-clipboard-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
  return workspaceId
}

async function readNativeClipboard(app: ElectronApplication): Promise<string> {
  return app.evaluate(({ clipboard }) => clipboard.readText())
}

async function clearNativeClipboard(app: ElectronApplication): Promise<void> {
  await app.evaluate(({ clipboard }) => clipboard.writeText(''))
}

async function expectNativeClipboard(app: ElectronApplication, expected: string) {
  await expect.poll(() => readNativeClipboard(app)).toBe(expected)
  expect(expected).not.toContain('flashquery://')
  expect(expected).not.toContain('%20')
  expect(expected).not.toContain('#')
  expect(expected).not.toContain('^')
  expect(expected).not.toContain('](')
}

async function activateSearchAndRun(page: Page, panelId: string, query: string) {
  await page.evaluate((id) => window.__cateE2E!.activatePanel(id), panelId)
  await page.getByRole('button', { name: 'Clear search' }).click()
  await page.getByPlaceholder('Search the vault...').fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
}

test('T-M-004 native clipboard contains exact FlashQuery vault paths and references', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'native-clipboard-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-native-clipboard-'))
  let app: ElectronApplication | null = null
  try {
    server.seedDocuments({
      'Docs/Plan.md': '# Plan\n\nClipboard fixture.',
    })

    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await configure(page, server.baseUrl, workspaceRoot)

    await clearNativeClipboard(app)
    await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 260, y: 180 }))
    await page.getByRole('treeitem', { name: 'Docs' }).click()
    const vaultPlanRow = page.getByRole('treeitem', { name: 'Plan.md' })
    await expect(vaultPlanRow).toBeVisible()

    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-path'))
    await vaultPlanRow.click({ button: 'right' })
    await expectNativeClipboard(app, 'Docs/Plan.md')

    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-reference'))
    await vaultPlanRow.click({ button: 'right' })
    await expectNativeClipboard(app, '{{ref:Docs/Plan.md}}')

    const searchPanelId = await page.evaluate(() => window.__cateE2E!.createFlashQueryVaultSearch(
      { x: 320, y: 220 },
      { target: 'dock', zone: 'center' },
    ))
    await activateSearchAndRun(page, searchPanelId, 'plan')
    const searchPlanRow = page.getByTestId('vault-search-document-Docs/Plan.md')
    await expect(searchPlanRow).toBeVisible()

    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-path'))
    await searchPlanRow.click({ button: 'right' })
    await expectNativeClipboard(app, 'Docs/Plan.md')

    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-reference'))
    await searchPlanRow.click({ button: 'right' })
    await expectNativeClipboard(app, '{{ref:Docs/Plan.md}}')

    const editorPanelId = await page.evaluate(() => window.__cateE2E!.openVaultDocument('Docs/Plan.md', 'dock'))
    await page.evaluate((id) => window.__cateE2E!.activatePanel(id), editorPanelId)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), editorPanelId)).toContain('Clipboard fixture')
    const editorClipboardButton = page.getByRole('button', { name: 'Copy vault path or reference' })

    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-path'))
    await editorClipboardButton.click()
    await expectNativeClipboard(app, 'Docs/Plan.md')

    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-reference'))
    await editorClipboardButton.click()
    await expectNativeClipboard(app, '{{ref:Docs/Plan.md}}')
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
