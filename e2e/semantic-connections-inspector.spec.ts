import { test, expect, type Page } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, dragMouse, launchApp } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

const markdown = '# Overview\n\nOpening context.\n\n## Design Brief\n\nDesign content.\n\n## Runtime Notes\n\nRuntime content.\n'
type DockPlacement = { target: 'dock'; zone: 'left' | 'right' | 'bottom' | 'center' }

async function openPreview(
  page: Page,
  workspaceRoot: string,
  fileName = 'semantic.md',
  placement?: DockPlacement,
): Promise<{
  filePath: string
  editorPanelId: string
}> {
  const filePath = path.join(workspaceRoot, fileName)
  await writeFile(filePath, markdown, 'utf8')
  const workspaceId = await page.evaluate(async (rootPath) => {
    return window.__cateE2E!.ensureWorkspaceRoot(rootPath)
  }, workspaceRoot)
  const editorPanelId = await page.evaluate(({ id, targetPath, targetPlacement }) => {
    return window.__cateE2E!.openFileEditor(id, targetPath, targetPlacement)
  }, { id: workspaceId, targetPath: filePath, targetPlacement: placement })
  await expect(page.getByText('Opening context.')).toBeVisible()
  await page.getByTitle('Preview markdown').click()
  await expect(page.getByTestId('markdown-preview-body')).toBeVisible()
  return { filePath, editorPanelId }
}

async function launchWithWorkspace(): Promise<{
  app: ElectronApplication
  page: Page
  workspaceRoot: string
}> {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-sc-inspector-'))
  const launched = await launchApp()
  return { app: launched.electronApp, page: launched.mainWindow, workspaceRoot }
}

test('T-E-001 T-E-003 opens Semantic Connections in main right dock with embeddings-only cards and no typed controls', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))

    const panelId = await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Whole document')
    await expect(panel).toContainText('Design Companion')
    await expect(panel).toContainText('Runtime Neighbor')
    await expect(panel).toContainText('Showing all 2 connections')
    await expect(panel.getByText('Sort by nature')).toHaveCount(0)
    await expect(panel.getByText('Nature filters')).toHaveCount(0)
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.panelLocation(id), panelId)).toBe('dock')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-002 opens Semantic Connections inside a canvas mini-dock with compact title actions visible', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    const { editorPanelId } = await openPreview(page, workspaceRoot, 'semantic.md', { target: 'dock', zone: 'right' })
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))
    await expect(page.locator('[data-canvas-panel-id]')).toBeVisible()

    const panelId = await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 220, y: 160 },
      { target: 'canvas' },
    ))
    await page.evaluate(({ panel, editor }) => {
      window.__cateE2E!.setSemanticConnectionsSource(panel, editor)
    }, { panel: panelId, editor: editorPanelId })

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Design Companion')
    await expect(page.getByTestId('semantic-connections-title-action-row')).toBeVisible()
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.panelLocation(id), panelId)).toBe('canvas')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-005 preview click pins scope while user moves to cards and expands a card', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))
    await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))

    const runtimeChunk = page.locator('[data-chunk-id="runtime-notes"]').first()
    await expect(runtimeChunk).toBeVisible()
    await runtimeChunk.click()

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toContainText('One section selected')
    await expect(panel).toContainText('Runtime Deep Dive')
    await panel.getByRole('button', { name: 'Expand Runtime Deep Dive Runtime Notes' }).click()
    await expect(panel).toContainText('Expanded runtime body stays reachable after preview pinning.')
    await expect(panel).toContainText('One section selected')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-006 Outline click in preview pins Semantic Connections scope', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))
    await page.getByRole('button', { name: 'Toggle document outline' }).click()
    await expect(page.getByTestId('outline-heading-row').filter({ hasText: 'Design Brief' })).toBeVisible()
    await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'bottom' },
    ))

    await page.getByTestId('outline-heading-row').filter({ hasText: 'Design Brief' }).click()

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toContainText('One section selected')
    await expect(panel).toContainText('Design Deep Dive')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-007 dock resize refuses to shrink Semantic Connections below minimum width', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))
    await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toBeVisible()
    const before = await panel.boundingBox()
    expect(before?.width ?? 0).toBeGreaterThanOrEqual(330)
    const handle = page.locator('.cursor-col-resize').last()
    const rect = await handle.boundingBox()
    expect(rect).not.toBeNull()
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    await dragMouse(
      page,
      { x: rect!.x + rect!.width / 2, y: rect!.y + rect!.height / 2 },
      { x: viewportWidth - 20, y: rect!.y + rect!.height / 2 },
      { steps: 16 },
    )

    const after = await panel.boundingBox()
    expect(after?.width ?? 0).toBeGreaterThanOrEqual(330)
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-008 keyboard user tabs through scope, config, card, expand, open, and Escape clears pin', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))
    await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))
    await page.locator('[data-chunk-id="design-brief"]').first().click()

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toContainText('One section selected')
    await panel.hover()
    const configButton = page.getByRole('button', { name: 'Configure semantic connections' })
    await configButton.focus()
    await expect(configButton).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(panel.getByLabel('Top N connections')).toBeVisible()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'New Connections' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Split (hold to choose type)' }).last()).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(panel.getByRole('button', { name: 'Current semantic connection scope' })).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(panel.getByLabel('Top N connections')).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(panel.getByRole('button', { name: 'Expand Design Deep Dive Design Brief' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(panel).toContainText('Expanded design body stays reachable after preview pinning.')
    await page.keyboard.press('Tab')
    await expect(panel.getByRole('button', { name: 'Open Design Deep Dive Design Brief' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(panel.getByRole('button', { name: 'Collapse Design Deep Dive Design Brief' })).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(panel.getByLabel('Top N connections')).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(panel.getByRole('button', { name: 'Current semantic connection scope' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(panel).toContainText('Whole document')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-009 source-mode guidance transitions to loaded cards when preview activates', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.getByTitle('Show source').click()
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))
    await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toContainText('Switch to Preview')
    await page.getByTitle('Preview markdown').click()
    await expect(panel).toContainText('Design Companion')
  } finally {
    if (app) await closeApp(app)
  }
})

test('opening Graph from source mode switches Markdown editor to Preview automatically', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.getByTitle('Show source').click()
    await expect(page.getByTitle('Preview markdown')).toBeVisible()
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))

    await page.getByRole('button', { name: 'Toggle document graph' }).click()

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(page.getByTestId('markdown-preview-body')).toBeVisible()
    await expect(panel).not.toContainText('Switch to Preview')
    await expect(panel).toContainText('Design Companion')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-010 empty state transitions to loaded cards after connections become available', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('empty'))
    await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toContainText('No connections exist for this document')
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))
    await panel.getByRole('button', { name: 'Reload connections' }).click()
    await expect(panel).toContainText('Design Companion')
  } finally {
    if (app) await closeApp(app)
  }
})
