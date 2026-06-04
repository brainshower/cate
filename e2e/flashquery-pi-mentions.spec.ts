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
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('pi-mentions-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
  return workspaceId
}

async function createAgent(page: Page): Promise<string> {
  const dockPanelId = await page.evaluate(() => window.__cateE2E!.createAgent(
    { x: 160, y: 120 },
    { target: 'dock', zone: 'center' },
  ))
  return page.waitForFunction((panelId) => {
    return window.__cateE2E!.agentPanelIds().find((id) => id.startsWith(`agent-${panelId}-`)) ?? null
  }, dockPanelId).then((handle) => handle.jsonValue() as Promise<string>)
}

async function refreshVaultIndex(page: Page, agentKey: string, workspaceId: string) {
  await page.evaluate(({ agentKey, workspaceId }) => {
    return window.__cateE2E!.refreshAgentVaultIndex(agentKey, workspaceId)
  }, { agentKey, workspaceId })
}

test('T-E-004 Pi @ mentions insert literal refs and clear stale vault-index data', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'pi-mentions-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-pi-mentions-'))
  let app: ElectronApplication | null = null
  try {
    server.seedDocuments({
      'Alpha/Plan.md': '# Alpha Plan\n\nFirst sorted plan.',
      'Beta/Plan.md': '# Beta Plan\n\nSecond sorted plan.',
      'Gamma/Notes.md': '# Gamma Notes\n\nFilename filter negative fixture.',
    })

    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const workspaceId = await configure(page, server.baseUrl, workspaceRoot)
    const agentKey = await createAgent(page)
    const composer = page.locator('textarea').last()

    await refreshVaultIndex(page, agentKey, workspaceId)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.agentVaultIndex(id), agentKey)).toEqual([
      { filename: 'Plan.md', fullPath: 'Alpha/Plan.md' },
      { filename: 'Plan.md', fullPath: 'Beta/Plan.md' },
      { filename: 'Notes.md', fullPath: 'Gamma/Notes.md' },
    ])

    await composer.fill('@plan')
    await expect(page.getByTestId('agent-mention-popup')).toBeVisible()
    await expect(page.getByTestId('agent-mention-fullpath')).toHaveText(['Alpha/Plan.md', 'Beta/Plan.md'])
    await composer.press('Enter')
    await expect(composer).toHaveValue('{{ref:Alpha/Plan.md}}')
    await expect(page.locator('[data-testid*="reference"], [data-testid*="document-reference"], [data-testid*="footer-pill"]')).toHaveCount(0)

    server.seedDocuments({
      'New/Brief.md': '# Brief\n\nReplacement cache fixture.',
      'New/Zeta.md': '# Zeta\n\nReplacement cache fixture.',
    })
    await refreshVaultIndex(page, agentKey, workspaceId)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.agentVaultIndex(id), agentKey)).toEqual([
      { filename: 'Brief.md', fullPath: 'New/Brief.md' },
      { filename: 'Zeta.md', fullPath: 'New/Zeta.md' },
    ])

    await composer.fill('@plan')
    await expect(page.getByTestId('agent-mention-popup')).toBeVisible()
    await expect(page.getByText('No matching documents')).toBeVisible()
    await expect(page.getByText('Alpha/Plan.md')).toHaveCount(0)

    await composer.fill('@brief')
    await expect(page.getByTestId('agent-mention-fullpath')).toHaveText(['New/Brief.md'])
    await composer.press('Tab')
    await expect(composer).toHaveValue('{{ref:New/Brief.md}}')

    server.setAvailable(false)
    await page.evaluate((id) => window.__cateE2E!.retryFlashQuery(id), workspaceId)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.agentVaultIndex(id), agentKey)).toEqual([])
    await composer.fill('@brief')
    await expect(page.getByTestId('agent-mention-popup')).toBeVisible()
    await expect(page.getByText('New/Brief.md')).toHaveCount(0)
    await composer.press('Enter')
    await expect(composer).toHaveValue('')
    await expect(page.getByText('{{ref:New/Brief.md}}')).toHaveCount(0)

    server.setAvailable(true)
    await page.evaluate((id) => window.__cateE2E!.retryFlashQuery(id), workspaceId)
    await refreshVaultIndex(page, agentKey, workspaceId)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.agentVaultIndex(id), agentKey)).toEqual([
      { filename: 'Brief.md', fullPath: 'New/Brief.md' },
      { filename: 'Zeta.md', fullPath: 'New/Zeta.md' },
    ])
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
