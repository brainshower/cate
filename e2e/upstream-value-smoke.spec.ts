import { test, expect } from '@playwright/test'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, launchApp } from './fixtures/electron-app'
import type { ElectronApplication, Page } from 'playwright'

async function launchWithWorkspace(prefix: string): Promise<{
  app: ElectronApplication
  page: Page
  workspaceRoot: string
}> {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), prefix))
  const launched = await launchApp()
  await launched.mainWindow.evaluate(
    async (rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath),
    workspaceRoot,
  )
  return { app: launched.electronApp, page: launched.mainWindow, workspaceRoot }
}

test('T-M-001 observes terminal UI smoke with live shell output', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace('cate-e2e-upstream-terminal-')
    app = launched.app
    const page = launched.page

    const nodeId = await page.evaluate(() => window.__cateE2E!.createTerminal({ x: 160, y: 120 }))
    await page.waitForSelector(`[data-node-id="${nodeId}"]`, { timeout: 5000 })
    await page.waitForFunction((id) => !!window.__cateE2E!.terminalPtyId(id), nodeId, { timeout: 8000 })

    const marker = `CQ${Date.now().toString(36)}`
    expect(await page.evaluate(({ id, text }) => window.__cateE2E!.writeTerminal(id, `printf '${text}\\n'\\n`), {
      id: nodeId,
      text: marker,
    })).toBe(true)

    await expect(page.locator(`[data-node-id="${nodeId}"] .xterm`)).toBeVisible()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.terminalLog(id), nodeId), {
      timeout: 8000,
    }).toContain(marker)
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-M-002 observes editor UI smoke and keeps FlashQuery editor save path covered', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace('cate-e2e-upstream-editor-')
    app = launched.app
    const page = launched.page
    const filePath = path.join(launched.workspaceRoot, 'upstream-editor-smoke.md')
    await writeFile(filePath, '# Upstream editor smoke\n\nOriginal body.\n', 'utf8')

    await page.evaluate((targetPath) => {
      const workspaceId = window.__cateE2E!.selectedWorkspaceId()
      return window.__cateE2E!.openFileEditor(workspaceId, targetPath)
    }, filePath)

    const panelId = await page.waitForFunction((targetPath) => {
      return window.__cateE2E!.editorPanelIdsForFilePath(targetPath)[0] ?? null
    }, filePath).then((handle) => handle.jsonValue() as Promise<string>)

    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Original body')
    await page.evaluate(async (id) => {
      window.__cateE2E!.setEditorText(id, '# Upstream editor smoke\n\nEdited by automated UI smoke.\n')
      const result = await window.__cateE2E!.saveEditorPanel(id)
      if (result !== 'saved') throw new Error(`save returned ${result}`)
    }, panelId)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Edited by automated UI smoke')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-M-003 observes file-exclusion UI smoke without relaunch', async () => {
  let app: ElectronApplication | null = null
  try {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-upstream-file-exclusion-'))
    await mkdir(path.join(workspaceRoot, 'visible-folder'))
    await mkdir(path.join(workspaceRoot, 'excluded-folder'))
    await writeFile(path.join(workspaceRoot, 'visible-folder', 'keep.txt'), 'keep', 'utf8')
    await writeFile(path.join(workspaceRoot, 'excluded-folder', 'hide.txt'), 'hide', 'utf8')

    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await page.evaluate(async (rootPath) => {
      await window.__cateE2E!.ensureWorkspaceRoot(rootPath)
    }, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.openSidebarView('explorer'))
    await expect(page.getByText('visible-folder').first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('excluded-folder').first()).toBeVisible()

    await page.evaluate(() => {
      window.__cateE2E!.openSettings('file explorer')
    })

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible()
    await page.getByPlaceholder('Add a name, e.g. dist').fill('excluded-folder')
    await page.getByRole('button', { name: 'Add' }).click()
    await expect(page.getByText('excluded-folder').last()).toBeVisible()

    await page.evaluate(() => window.__cateE2E!.closeSettings())
    await expect(page.getByText('visible-folder').first()).toBeVisible()
    await expect(page.getByText('excluded-folder').first()).toBeHidden({ timeout: 8000 })
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-M-005 observes agent provider settings UI and FlashQuery panel non-regression', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace('cate-e2e-upstream-agent-provider-')
    app = launched.app
    const page = launched.page

    const agentNodeId = await page.evaluate(() => window.__cateE2E!.createAgent({ x: 120, y: 100 }))
    await page.waitForSelector(`[data-node-id="${agentNodeId}"]`, { timeout: 5000 })
    await expect(page.locator(`[data-node-id="${agentNodeId}"]`)).toContainText('Agent')
    await page.locator(`[data-node-id="${agentNodeId}"]`).getByRole('button', { name: 'Settings' }).click()

    const agentNode = page.locator(`[data-node-id="${agentNodeId}"]`)
    await expect(agentNode.getByRole('button', { name: 'Providers' })).toBeVisible()
    await expect(agentNode.getByText('API key').first()).toBeVisible()

    await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 520, y: 140 }))
    await expect(page.getByText('FlashQuery Vault').first()).toBeVisible()
  } finally {
    if (app) await closeApp(app)
  }
})
