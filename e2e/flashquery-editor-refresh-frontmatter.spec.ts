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
  await page.getByRole('textbox', { name: 'Bearer token' }).fill('refresh-token')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('dialog', { name: 'FlashQuery Connection' })).toBeHidden()
  return workspaceId
}

async function openVaultEditor(page: Page, vaultPath: string): Promise<string> {
  await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 260, y: 180 }))
  const fileName = vaultPath.split('/').at(-1) ?? vaultPath
  const row = page.getByRole('treeitem', { name: fileName }).first()
  await expect(row).toBeVisible()
  await row.dblclick()
  const panelId = await page.waitForFunction((pathToFind) => {
    return window.__cateE2E!.editorPanelIdsForPath(pathToFind)[0] ?? null
  }, vaultPath).then((handle) => handle.jsonValue() as Promise<string>)
  await page.evaluate((id) => window.__cateE2E!.activatePanel(id), panelId)
  await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).not.toBeNull()
  return panelId
}

test('T-E-001 refreshes clean and dirty FlashQuery body editors safely', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'refresh-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-refresh-'))
  let app: ElectronApplication | null = null
  try {
    server.seedDocuments({
      'Refresh.md': { body: '# Refresh\n\nInitial body.', frontmatter: { title: 'Refresh' } },
    })
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    await configure(page, server.baseUrl, workspaceRoot)

    const panelId = await openVaultEditor(page, 'Refresh.md')
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Initial body')

    server.setDocumentBody('Refresh.md', '# Refresh\n\nClean body from fixture.')
    await page.getByLabel('Refresh from vault').click()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Clean body from fixture')
    expect(server.lastGetArgs()).toEqual({ identifiers: 'Refresh.md', include: ['body', 'connections'] })

    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, '# Refresh\n\nLocal dirty edit.'), panelId)
    server.setDocumentBody('Refresh.md', '# Refresh\n\nDiscard target.')
    await page.getByLabel('Refresh from vault').click()
    await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible()
    await expect(page.getByText('Refresh.md has unsaved edits. Refreshing from the vault will replace the editor contents.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save and refresh' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Discard and refresh' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Local dirty edit')

    await page.getByLabel('Refresh from vault').click()
    await page.getByRole('button', { name: 'Discard and refresh' }).click()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Discard target')

    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, '# Refresh\n\nSave before refresh.'), panelId)
    await page.getByLabel('Refresh from vault').click()
    await page.getByRole('button', { name: 'Save and refresh' }).click()
    await expect.poll(() => server.documentBody('Refresh.md')).toContain('Save before refresh')
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Save before refresh')

    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, '# Refresh\n\nPreserve on failure.'), panelId)
    server.setDocumentNotFound('Refresh.md', true)
    await page.getByLabel('Refresh from vault').click()
    await page.getByRole('button', { name: 'Discard and refresh' }).click()
    await expect(page.getByText(/Refresh failed:/)).toBeVisible()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), panelId)).toContain('Preserve on failure')
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})

test('T-E-002 opens and saves independent FlashQuery frontmatter editors', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'refresh-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-frontmatter-'))
  let app: ElectronApplication | null = null
  try {
    server.seedDocuments({
      'Frontmatter.md': {
        body: '# Frontmatter\n\nBody stays independent.',
        frontmatter: { title: 'Frontmatter', tags: ['one'] },
      },
    })
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const workspaceId = await configure(page, server.baseUrl, workspaceRoot)

    const bodyPanelId = await openVaultEditor(page, 'Frontmatter.md')
    await expect(page.locator(`[data-tab-panel-id="${bodyPanelId}"]`)).toBeVisible()
    await page.getByLabel('Open frontmatter').click()
    const frontmatterUri = `flashquery://${workspaceId}/Frontmatter.md?part=frontmatter`
    const frontmatterPanelId = await page.waitForFunction((uri) => {
      return window.__cateE2E!.editorPanelIdsForFilePath(uri)[0] ?? null
    }, frontmatterUri).then((handle) => handle.jsonValue() as Promise<string>)

    await expect(page.locator('[data-tab-panel-id]').filter({ hasText: 'Frontmatter.md Frontmatter' })).toBeVisible()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), frontmatterPanelId)).toContain('title')
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), bodyPanelId)).toContain('Body stays independent')

    await page.evaluate((id) => {
      window.__cateE2E!.setEditorText(id, 'title: Updated\nfq_id: managed\nstatus: green')
    }, frontmatterPanelId)
    await page.evaluate(async (id) => {
      const result = await window.__cateE2E!.saveEditorPanel(id)
      if (result !== 'saved') throw new Error(`frontmatter save returned ${result}`)
    }, frontmatterPanelId)
    expect(server.documentFrontmatter('Frontmatter.md')).toEqual({ title: 'Updated', status: 'green' })
    expect(server.documentBody('Frontmatter.md')).toContain('Body stays independent')
    expect(server.lastWriteArgs()).toEqual({
      mode: 'update',
      identifier: 'Frontmatter.md',
      frontmatter: { title: 'Updated', status: 'green' },
    })

    const writeAfterValid = server.counts().mcpPostCount
    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, '- bad'), frontmatterPanelId)
    await page.evaluate(async (id) => window.__cateE2E!.saveEditorPanel(id), frontmatterPanelId)
    await expect(page.getByText(/Invalid frontmatter YAML/)).toBeVisible()
    expect(server.counts().mcpPostCount).toBe(writeAfterValid)

    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, 'fq_id: managed-only'), frontmatterPanelId)
    await page.evaluate(async (id) => {
      const result = await window.__cateE2E!.saveEditorPanel(id)
      if (result !== 'saved') throw new Error(`managed-only save returned ${result}`)
    }, frontmatterPanelId)
    expect(server.lastWriteArgs()).toEqual({
      mode: 'update',
      identifier: 'Frontmatter.md',
      frontmatter: { title: 'Updated', status: 'green' },
    })
    await expect(page.getByText(/Save failed:/)).toHaveCount(0)

    await page.evaluate((id) => window.__cateE2E!.activatePanel(id), bodyPanelId)
    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, '# Frontmatter\n\nBody edited independently.'), bodyPanelId)
    await page.evaluate(async (id) => {
      const result = await window.__cateE2E!.saveEditorPanel(id)
      if (result !== 'saved') throw new Error(`body save returned ${result}`)
    }, bodyPanelId)
    expect(server.documentBody('Frontmatter.md')).toContain('Body edited independently')
    expect(server.documentFrontmatter('Frontmatter.md')).toEqual({ title: 'Updated', status: 'green' })
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})

test('T-E-002 opens Canvas-hosted FlashQuery frontmatter from the tab action', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'refresh-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-canvas-frontmatter-'))
  let app: ElectronApplication | null = null
  try {
    server.seedDocuments({
      'CanvasFrontmatter.md': {
        body: '# Canvas Frontmatter\n\nBody stays on the same Canvas node.',
        frontmatter: { title: 'Canvas Frontmatter', status: 'green' },
      },
    })
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const workspaceId = await configure(page, server.baseUrl, workspaceRoot)

    await page.evaluate(() => window.__cateE2E!.createFlashQueryVault({ x: 260, y: 180 }))
    const row = page.getByRole('treeitem', { name: 'CanvasFrontmatter.md' }).first()
    await expect(row).toBeVisible()
    await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('open-on-canvas'))
    await row.click({ button: 'right' })

    const bodyPanelId = await page.waitForFunction(() => {
      return window.__cateE2E!.editorPanelIdsForPath('CanvasFrontmatter.md')
        .find((panelId) => window.__cateE2E!.panelLocation(panelId) === 'canvas') ?? null
    }).then((handle) => handle.jsonValue() as Promise<string>)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), bodyPanelId)).toContain('Body stays')

    await page.getByLabel('Open frontmatter').click()
    const frontmatterUri = `flashquery://${workspaceId}/CanvasFrontmatter.md?part=frontmatter`
    const frontmatterPanelId = await page.waitForFunction((uri) => {
      return window.__cateE2E!.editorPanelIdsForFilePath(uri)[0] ?? null
    }, frontmatterUri).then((handle) => handle.jsonValue() as Promise<string>)

    await expect(page.locator('[data-tab-panel-id]').filter({ hasText: 'CanvasFrontmatter.md Frontmatter' })).toBeVisible()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), frontmatterPanelId)).toContain('status: green')
    expect(server.lastGetArgs()).toEqual({ identifiers: 'CanvasFrontmatter.md', include: ['frontmatter'] })
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})

test('T-E-007 editor refresh and frontmatter save fail visibly while FlashQuery is disconnected', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'refresh-token' })
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-editor-disconnect-'))
  let app: ElectronApplication | null = null
  try {
    server.seedDocuments({
      'Disconnected.md': {
        body: '# Disconnected\n\nOriginal body.',
        frontmatter: { title: 'Disconnected', status: 'green' },
      },
    })
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const workspaceId = await configure(page, server.baseUrl, workspaceRoot)

    const bodyPanelId = await openVaultEditor(page, 'Disconnected.md')
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), bodyPanelId)).toContain('Original body')

    await page.getByLabel('Open frontmatter').click()
    const frontmatterUri = `flashquery://${workspaceId}/Disconnected.md?part=frontmatter`
    const frontmatterPanelId = await page.waitForFunction((uri) => {
      return window.__cateE2E!.editorPanelIdsForFilePath(uri)[0] ?? null
    }, frontmatterUri).then((handle) => handle.jsonValue() as Promise<string>)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), frontmatterPanelId)).toContain('status')

    server.setAvailable(false)
    await page.evaluate((id) => window.__cateE2E!.retryFlashQuery(id), workspaceId)

    await page.evaluate((id) => window.__cateE2E!.activatePanel(id), bodyPanelId)
    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, '# Disconnected\n\nLocal dirty body.'), bodyPanelId)
    await page.getByLabel('Refresh from vault').click()
    await expect(page.getByRole('dialog', { name: 'Unsaved changes' })).toBeVisible()
    await page.getByRole('button', { name: 'Discard and refresh' }).click()
    await expect(page.getByText('Refresh failed: FlashQuery is disconnected.')).toBeVisible()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), bodyPanelId)).toContain('Local dirty body')

    await page.evaluate((id) => window.__cateE2E!.activatePanel(id), frontmatterPanelId)
    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, 'title: Offline\nstatus: red'), frontmatterPanelId)
    await page.evaluate(async (id) => window.__cateE2E!.saveEditorPanel(id), frontmatterPanelId)
    await expect(page.getByText(/Save failed:/)).toBeVisible()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.editorText(id), frontmatterPanelId)).toContain('status: red')
    expect(server.documentFrontmatter('Disconnected.md')).toEqual({ title: 'Disconnected', status: 'green' })

    server.setAvailable(true)
    await page.evaluate((id) => window.__cateE2E!.retryFlashQuery(id), workspaceId)
    await page.evaluate((id) => window.__cateE2E!.setEditorText(id, 'title: Reconnected\nstatus: blue'), frontmatterPanelId)
    await page.evaluate(async (id) => {
      const result = await window.__cateE2E!.saveEditorPanel(id)
      if (result !== 'saved') throw new Error(`reconnected frontmatter save returned ${result}`)
    }, frontmatterPanelId)
    await expect(page.getByText(/Save failed:/)).toHaveCount(0)
    expect(server.documentFrontmatter('Disconnected.md')).toEqual({ title: 'Reconnected', status: 'blue' })
  } finally {
    if (app) await closeApp(app)
    await server.close()
  }
})
