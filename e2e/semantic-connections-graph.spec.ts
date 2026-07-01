import { test, expect, type Page } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, launchApp } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

const markdown = '# Overview\n\nOpening context.\n\n## Design Brief\n\nDesign content.\n\n## Runtime Notes\n\nRuntime content.\n'

async function launchGraphWorkspace(): Promise<{
  app: ElectronApplication
  page: Page
  workspaceRoot: string
  editorPanelId: string
}> {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-graph-'))
  const filePath = path.join(workspaceRoot, 'semantic-graph.md')
  await writeFile(filePath, markdown, 'utf8')

  const launched = await launchApp()
  const page = launched.mainWindow
  const workspaceId = await page.evaluate(async (rootPath) => {
    return window.__cateE2E!.ensureWorkspaceRoot(rootPath)
  }, workspaceRoot)
  const editorPanelId = await page.evaluate(({ id, targetPath }) => {
    return window.__cateE2E!.openFileEditor(id, targetPath, { target: 'dock', zone: 'left' })
  }, { id: workspaceId, targetPath: filePath })

  await expect(page.getByText('Opening context.')).toBeVisible()
  await page.getByTitle('Preview markdown').evaluate((button) => {
    ;(button as HTMLButtonElement).click()
  })
  await expect(page.getByTestId('markdown-preview-body')).toBeVisible()
  return { app: launched.electronApp, page, workspaceRoot, editorPanelId }
}

async function openSemanticGraphPanel(page: Page, editorPanelId: string): Promise<string> {
  await page.evaluate(() => {
    window.__cateE2E!.setSemanticConnectionsScenario('graph')
    window.__cateE2E!.resetSemanticConnectionsProviderCounts()
  })
  const panelId = await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
    { x: 360, y: 180 },
    { target: 'dock', zone: 'right' },
  ))
  await page.evaluate(({ panel, editor }) => {
    window.__cateE2E!.setSemanticConnectionsSource(panel, editor)
  }, { panel: panelId, editor: editorPanelId })
  return panelId
}

async function filterLoadedGraph(page: Page, term: string): Promise<void> {
  const panel = page.getByTestId('semantic-connections-panel')
  await panel.getByRole('button', { name: 'Filter semantic connections' }).click()
  await panel.getByRole('searchbox', { name: 'Filter semantic connections' }).fill(term)
}

async function expectNoHorizontalOverflow(page: Page, selector: string): Promise<void> {
  const overflowing = await page.locator(selector).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth > element.clientWidth + 1)
    .map((element) => ({
      testId: element.getAttribute('data-testid'),
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    })))
  expect(overflowing).toEqual([])
}

test('T-E-001 opens graph semantic-connections panel in the dock with deterministic graph fixture data', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchGraphWorkspace()
    app = launched.app
    const panelId = await openSemanticGraphPanel(launched.page, launched.editorPanelId)
    const panel = launched.page.getByTestId('semantic-connections-panel')

    await expect(panel).toContainText('Whole-document graph')
    await expect(panel).toContainText('Graph Workflow')
    await expect(panel).toContainText('Needs attention')
    await expect(panel).toContainText('Sections')
    await expect(panel).toContainText('Connections')
    await expect(panel.getByTestId('semantic-graph-group-contradicts')).toContainText('Runtime Conflict')
    await expectNoHorizontalOverflow(launched.page, '[data-testid="semantic-connections-panel"], [data-testid^="semantic-graph-connection-"]')
    await expect.poll(() => launched.page.evaluate((id) => window.__cateE2E!.panelLocation(id), panelId)).toBe('dock')
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-002 navigates from whole-document attention into selected preview section', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchGraphWorkspace()
    app = launched.app
    await openSemanticGraphPanel(launched.page, launched.editorPanelId)
    const panel = launched.page.getByTestId('semantic-connections-panel')

    await panel.getByRole('button', { name: 'Review contradiction in Design Brief' }).click()

    await expect(panel).toContainText('Selected section')
    await expect(panel).toContainText('Design brief must stay aligned with runtime adapter recovery.')
    await expect(launched.page.locator('[data-chunk-id="design-brief"]').first()).toHaveClass(/cate-preview-chunk-active/)
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-003 filters whole-document and selection data locally without backend fixture reloads', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchGraphWorkspace()
    app = launched.app
    await openSemanticGraphPanel(launched.page, launched.editorPanelId)
    const panel = launched.page.getByTestId('semantic-connections-panel')
    await expect(panel).toContainText('Runtime Conflict')
    const beforeWholeDocumentFilter = await launched.page.evaluate(() => window.__cateE2E!.semanticConnectionsProviderCounts())

    await filterLoadedGraph(launched.page, 'open question')
    await expect(panel).toContainText('Open questions')
    await expect(panel).not.toContainText('Runtime Conflict')
    await expect.poll(() => launched.page.evaluate(() => window.__cateE2E!.semanticConnectionsProviderCounts())).toEqual(beforeWholeDocumentFilter)

    await panel.getByRole('button', { name: 'Open section Runtime Notes' }).click()
    await expect(panel).toContainText('Selected section')
    const beforeSelectionFilter = await launched.page.evaluate(() => window.__cateE2E!.semanticConnectionsProviderCounts())
    await panel.getByRole('searchbox', { name: 'Filter semantic connections' }).fill('dependency')
    await panel.getByRole('button', { name: 'Expand connection Adapter Restart Restart Contract' }).click()
    await expect(panel).toContainText('Dependency type: runtime')
    await expect(panel).not.toContainText('Runtime claim without a filter match')
    await expect.poll(() => launched.page.evaluate(() => window.__cateE2E!.semanticConnectionsProviderCounts())).toEqual(beforeSelectionFilter)
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-004 renders embeddings-only fallback without graph-only chrome', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchGraphWorkspace()
    app = launched.app
    await launched.page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('embeddings-only'))
    await launched.page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))
    const panel = launched.page.getByTestId('semantic-connections-panel')

    await expect(panel).toContainText('Design Companion')
    await expect(panel).toContainText('Runtime Neighbor')
    await expect(panel).not.toContainText('Whole-document graph')
    await panel.getByRole('button', { name: 'Configure semantic connections' }).click()
    await expect(panel.getByText('Nature filters')).toHaveCount(0)
    await expect(panel.getByText('Sort by nature')).toHaveCount(0)
  } finally {
    if (app) await closeApp(app)
  }
})

test('T-E-005 renders recoverable unavailable and no-vault states through the app shell', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchGraphWorkspace()
    app = launched.app
    await launched.page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('flashquery-unavailable'))
    await launched.page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))
    const panel = launched.page.getByTestId('semantic-connections-panel')

    await expect(panel).toContainText('Unable to reach FlashQuery')
    await launched.page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('no-vault'))
    await panel.getByRole('button', { name: 'Retry connections' }).click()
    await expect(panel).toContainText('No vault connected to this workspace')
    await launched.page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('graph'))
    await panel.getByRole('button', { name: 'Reload connections' }).click()
    await expect(panel).toContainText('Whole-document graph')
  } finally {
    if (app) await closeApp(app)
  }
})
