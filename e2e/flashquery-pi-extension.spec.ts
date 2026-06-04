import { test, expect } from '@playwright/test'
import fs from 'node:fs'
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
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('pi-extension-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
  return workspaceId
}

test('T-E-005 installs cate-flashquery extension and fetches eligible fixture registry tools on Agent startup', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'pi-extension-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-pi-extension-'))
  let app: ElectronApplication | null = null
  try {
    server.seedRegistryTools([
      {
        name: 'fixture_native_search',
        description: 'Eligible native FlashQuery fixture tool',
        metadata: { hostEligible: true, status: 'current', source: 'flashquery_native', toolId: 'fixture_native_search' },
      },
      {
        name: 'github.create_issue',
        description: 'Eligible brokered MCP fixture tool',
        metadata: { hostEligible: true, status: 'current', source: 'brokered_mcp', server: 'github', toolId: 'github.create_issue' },
      },
      {
        name: 'fixture_deprecated',
        description: 'Ineligible deprecated fixture tool',
        metadata: { hostEligible: true, status: 'deprecated', source: 'flashquery_native', toolId: 'fixture_deprecated' },
      },
    ])

    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const workspaceId = await configure(page, server.baseUrl, workspaceRoot)

    const createResult = await page.evaluate(async ({ panelId, workspaceId, cwd }) => {
      return window.electronAPI.agentCreate({ panelId, workspaceId, cwd })
    }, { panelId: 'e2e-flashquery-agent', workspaceId, cwd: workspaceRoot })
    expect(createResult.ok).toBe(true)

    const extensionDir = path.join(workspaceRoot, '.cate', 'pi-agent', 'extensions', 'cate-flashquery')
    await expect.poll(() => fs.existsSync(path.join(extensionDir, 'index.ts'))).toBe(true)
    await expect.poll(() => fs.existsSync(path.join(extensionDir, 'package.json'))).toBe(true)
    await expect.poll(() => fs.existsSync(path.join(extensionDir, 'lifecycle.ts'))).toBe(true)
    await expect.poll(() => server.counts().mcpPostCount, { timeout: 15_000 }).toBeGreaterThan(0)
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
