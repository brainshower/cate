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
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('search-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
  return workspaceId
}

async function activateSearchAndRun(page: Page, panelId: string, query: string) {
  await page.evaluate((id) => window.__cateE2E!.activatePanel(id), panelId)
  await page.getByRole('button', { name: 'Clear search' }).click()
  const input = page.getByPlaceholder('Search the vault...')
  await input.fill(query)
  await page.getByRole('button', { name: 'Search', exact: true }).click()
}

test('T-E-003 Vault Search workflows and T-E-007 disconnect recovery use deterministic fixture data', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'search-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-workspace-'))
  let app: ElectronApplication | null = null
  try {
    const documents: Record<string, string> = {
      'Docs/Plan.md': '# Cate Plan\n\nThe plan document proves open and copy behavior.',
      'Docs/Empty.md': '# Empty\n\nNo matching memory text.',
    }
    for (let index = 1; index <= 52; index += 1) {
      documents[`Docs/Cate-${String(index).padStart(2, '0')}.md`] = `# Cate ${index}\n\nPagination fixture.`
    }
    server.seedDocuments(documents)
    server.seedMemories({
      'memory-1': { title: 'Cate memory', text: 'Remember Cate search behavior.' },
    })

    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const workspaceId = await configure(page, server.baseUrl, workspaceRoot)
    const searchPanelId = await page.evaluate(() => window.__cateE2E!.createFlashQueryVaultSearch(
      { x: 260, y: 180 },
      { target: 'dock', zone: 'center' },
    ))

    await expect(page.getByText('Vault Search').first()).toBeVisible()
    await expect(page.getByPlaceholder('Search the vault...')).toBeVisible()

    await page.getByPlaceholder('Search the vault...').fill('cate')
    await page.getByRole('button', { name: 'Search', exact: true }).click()
    await expect(page.getByText('Vault').first()).toBeVisible()

    await page.getByRole('button', { name: 'Show more' }).click()
    await expect.poll(() => server.lastSearchArgs()).toMatchObject({ limit: 100 })
    await expect(page.getByText('Memories').first()).toBeVisible()
    await expect(page.getByText('Cate memory').first()).toBeVisible()

    await activateSearchAndRun(page, searchPanelId, 'nomatch')
    await expect(page.getByText('No results.').first()).toBeVisible()

    await activateSearchAndRun(page, searchPanelId, 'plan')
    const planPath = page.getByText('Docs/Plan.md').first()
    await expect(planPath).toBeVisible()
    await planPath.dblclick()
    await expect(page.locator('[data-tab-panel-id]').filter({ hasText: 'Plan.md' }).first()).toBeVisible()

    await activateSearchAndRun(page, searchPanelId, 'plan')
    let planRow = page.getByTestId('vault-search-document-Docs/Plan.md')
    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('open-on-canvas'))
    await planRow.click({ button: 'right' })
    await expect.poll(() => page.evaluate(() => window.__cateE2E!.editorPanelIdsForPath('Docs/Plan.md').length)).toBeGreaterThanOrEqual(2)

    await activateSearchAndRun(page, searchPanelId, 'plan')
    planRow = page.getByTestId('vault-search-document-Docs/Plan.md')
    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-reference'))
    await planRow.click({ button: 'right' })
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('{{ref:Docs/Plan.md}}')
    await expect.poll(() => page.evaluate(() => window.__cateE2E!.lastContextMenuItems().map((item) => item.id))).toContain('copy-path')
    await expect.poll(() => page.evaluate(() => window.__cateE2E!.lastContextMenuItems().map((item) => item.id))).toContain('copy-reference')

    await activateSearchAndRun(page, searchPanelId, 'plan')
    planRow = page.getByTestId('vault-search-document-Docs/Plan.md')
    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-path'))
    await planRow.click({ button: 'right' })
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('Docs/Plan.md')

    await activateSearchAndRun(page, searchPanelId, 'memory')
    const memoryRow = page.getByTestId('vault-search-memory-memory-1')
    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-reference'))
    await memoryRow.click({ button: 'right' })
    await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('Docs/Plan.md')
    await memoryRow.dblclick()
    await expect(memoryRow).toHaveAttribute('aria-expanded', 'true')

    await activateSearchAndRun(page, searchPanelId, 'cate')
    const listbox = page.getByRole('listbox', { name: 'Vault search results' })
    await page.getByTestId('vault-search-document-Docs/Cate-01.md').click()
    await expect(page.getByTestId('vault-search-document-Docs/Cate-01.md')).toHaveAttribute('aria-selected', 'true')
    await page.evaluate(() => {
      document.querySelector('[role="listbox"][aria-label="Vault search results"]')
        ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    await expect.poll(() => page.evaluate(() => window.__cateE2E!.editorPanelIdsForPath('Docs/Cate-01.md').length)).toBeGreaterThanOrEqual(1)

    await page.evaluate((panelId) => window.__cateE2E!.activatePanel(panelId), searchPanelId)
    await page.getByRole('button', { name: 'semantic' }).click()
    await page.getByPlaceholder('Search the vault...').fill('')
    await expect(page.getByText('Type a query to search semantically.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeDisabled()

    server.setAvailable(false)
    await page.evaluate(() => window.__cateE2E!.retryFlashQuery())
    await expect(page.getByTestId('vault-search-disconnected-icon')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Search', exact: true })).toBeDisabled()
    await expect(page.getByText('Docs/Cate-01.md')).toHaveCount(0)

    server.setAvailable(true)
    await page.evaluate((id) => window.__cateE2E!.retryFlashQuery(id), workspaceId)
    await expect(page.getByText('Live').first()).toBeVisible()
    await expect(page.getByText('Type a query and press Search.')).toBeVisible()
    await expect(page.getByText('FlashQuery is disconnected.')).toHaveCount(0)
    await page.getByRole('button', { name: 'mixed' }).click()
    await activateSearchAndRun(page, searchPanelId, 'plan')
    await expect(page.getByText('Docs/Plan.md').first()).toBeVisible()
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
