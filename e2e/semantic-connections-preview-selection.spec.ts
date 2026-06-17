import { test, expect } from '@playwright/test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, launchApp } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

test('T-E-004 preview hover updates Semantic Connections scope and Outline highlight', async () => {
  let app: ElectronApplication | null = null
  try {
    const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-preview-selection-'))
    const filePath = path.join(workspaceRoot, 'preview-selection.md')
    await writeFile(filePath, '# First Section\n\nFirst body.\n\n## Second Section\n\nSecond body.\n', 'utf8')

    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const workspaceId = await page.evaluate(async (rootPath) => {
      return window.__cateE2E!.ensureWorkspaceRoot(rootPath)
    }, workspaceRoot)
    await page.evaluate(({ id, targetPath }) => {
      return window.__cateE2E!.openFileEditor(id, targetPath)
    }, { id: workspaceId, targetPath: filePath })

    await expect(page.getByText('First body.')).toBeVisible()
    await page.getByTitle('Preview markdown').click()
    await expect(page.getByTestId('markdown-preview-body')).toBeVisible()
    await page.getByRole('button', { name: 'Toggle document outline' }).click()
    await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'bottom' },
    ))

    const secondChunk = page.locator('[data-chunk-id="second-section"]').first()
    await expect(secondChunk).toBeVisible()
    await secondChunk.hover()

    await expect(page.getByTestId('semantic-connections-panel')).toContainText('One section selected')
    await expect(page.getByTestId('semantic-connections-panel')).not.toContainText('second-section')
    await expect.poll(() => page.evaluate(() => {
      const rows = [...document.querySelectorAll<HTMLElement>('[data-testid="outline-heading-row"]')]
      const row = rows.find((candidate) => candidate.textContent?.trim() === 'Second Section')
      return row?.className ?? ''
    })).toContain('bg-blue-500/15')
  } finally {
    if (app) await closeApp(app)
  }
})
