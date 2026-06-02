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

async function openFlashQueryVaultFromCommandPalette(page: Page) {
  await page.keyboard.press(process.platform === 'darwin' ? 'Meta+K' : 'Control+K')
  const commandSearch = page.getByPlaceholder('Search files, panels, terminals and more by name')
  await expect(commandSearch).toBeVisible()
  await commandSearch.fill('New FlashQuery Vault')
  await page.getByText('New FlashQuery Vault').click()
  await expect(commandSearch).toBeHidden()
}

async function openFlashQueryConnectionFromWorkspaceMenu(page: Page, workspaceRoot: string) {
  await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('flashquery-connection'))
  const workspaceLabel = path.basename(workspaceRoot)
  await page.getByText(workspaceLabel).first().click({ button: 'right' })
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeVisible()

  const menuItems = await page.evaluate(() => window.__cateE2E!.lastContextMenuItems())
  expect(menuItems).toContainEqual({ id: 'flashquery-connection', label: 'FlashQuery Connection…' })
}

test('T-U-017 opens a FlashQuery Vault from the command palette', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'happy-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-command-palette-'))
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await configure(page, server.baseUrl, workspaceRoot)

    await openFlashQueryVaultFromCommandPalette(page)

    await expect(page.getByRole('treeitem', { name: /Welcome/ }).first()).toBeVisible()
    await expect(page.getByText('FlashQuery Vault').first()).toBeVisible()
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})

test('T-A-010 tests FlashQuery connection and opens the dialog from the workspace menu', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'happy-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-acceptance-'))
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await page.evaluate(async (rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)

    await openFlashQueryConnectionFromWorkspaceMenu(page, workspaceRoot)
    await page.getByLabel('FlashQuery URL').fill(server.baseUrl)
    await page.getByRole('textbox', { name: 'Bearer token' }).fill('happy-token')

    const infoCountBeforeTest = server.counts().infoRequestCount
    await page.getByRole('button', { name: 'Test connection' }).click()
    await expect(page.getByText(/Connected to FlashQuery v1\.0\.0-e2e/)).toBeVisible()
    expect(server.counts().infoRequestCount).toBeGreaterThan(infoCountBeforeTest)

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()

    const workspaceId = await page.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    await expect.poll(() => page.evaluate((id) => {
      return window.__cateE2E!.workspaceFlashQueryConnection(id)?.url
    }, workspaceId)).toBe(server.baseUrl)
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})

test('T-E-001 happy path / T-E-008 plus T-E-009 opens on canvas', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'happy-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-workspace-'))
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await configure(page, server.baseUrl, workspaceRoot)

    await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 260, y: 180 }))
    const welcomeRow = page.getByRole('treeitem', { name: /Welcome/ }).first()
    await expect(welcomeRow).toBeVisible()
    await welcomeRow.dblclick()
    await expect(page.getByText('Vault').first()).toBeVisible()

    const editorPanelId = await page.waitForFunction(() => {
      return window.__cateE2E!.editorPanelIdsForPath('Welcome.md')[0] ?? null
    }).then((handle) => handle.jsonValue() as Promise<string>)
    const editedBody = '# Welcome\n\nEdited through Cate editor save path.'
    await expect.poll(() => page.evaluate((panelId) => window.__cateE2E!.editorText(panelId), editorPanelId)).toContain('starter document')
    const postCountBeforeSave = server.counts().mcpPostCount
    await page.evaluate(async ({ panelId, content }) => {
      window.__cateE2E!.setEditorText(panelId, content)
      const result = await window.__cateE2E!.saveEditorPanel(panelId)
      if (result !== 'saved') throw new Error(`Editor save returned ${result}`)
    }, { panelId: editorPanelId, content: editedBody })
    expect(server.documentBody('Welcome.md')).toBe(editedBody)
    expect(server.counts().mcpPostCount).toBeGreaterThan(postCountBeforeSave)

    await page.evaluate((panelId) => window.__cateE2E!.closePanel(panelId), editorPanelId)
    await welcomeRow.dblclick()
    const reopenedPanelId = await page.waitForFunction((previousPanelId) => {
      return window.__cateE2E!
        .editorPanelIdsForPath('Welcome.md')
        .find((panelId) => panelId !== previousPanelId) ?? null
    }, editorPanelId).then((handle) => handle.jsonValue() as Promise<string>)
    await expect.poll(() => page.evaluate((panelId) => window.__cateE2E!.editorText(panelId), reopenedPanelId)).toBe(editedBody)
    await page.evaluate((panelId) => window.__cateE2E!.closePanel(panelId), reopenedPanelId)

    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('open-on-canvas'))
    await expect(welcomeRow).toBeVisible()
    await welcomeRow.click({ button: 'right' })
    const menuItems = await page.evaluate(() => window.__cateE2E!.lastContextMenuItems())
    expect(menuItems.map((item) => item.label)).toEqual(['Open', 'Open on Canvas'])
    const canvasPanelId = await page.waitForFunction(() => {
      const ids = window.__cateE2E!.editorPanelIdsForPath('Welcome.md')
      return ids.find((panelId) => window.__cateE2E!.panelLocation(panelId) === 'canvas') ?? null
    }).then((handle) => handle.jsonValue() as Promise<string>)
    await expect.poll(async () => {
      return page.evaluate((panelId) => window.__cateE2E!.panelLocation(panelId), canvasPanelId)
    }).toBe('canvas')
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
