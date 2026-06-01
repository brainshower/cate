import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { projectFilesToSnapshot } from './session'
import type { ProjectSessionFile, ProjectWorkspaceFile } from '../../shared/types'

vi.mock('./logger', () => ({
  default: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('./perfMarks', () => ({ mark: vi.fn() }))
vi.mock('./terminalRegistry', () => ({ terminalRegistry: {} }))
vi.mock('../stores/canvasStore', () => ({
  getOrCreateCanvasStoreForPanel: vi.fn(),
}))
vi.mock('../stores/dockStore', () => ({
  useDockStore: { getState: vi.fn() },
}))
vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: vi.fn() },
  ensureCanvasOpsForPanel: vi.fn(),
  getWorkspaceCanvasStore: vi.fn(),
  setActiveCanvasPanelId: vi.fn(),
}))

describe('project workspace compatibility', () => {
  it('T-U-008 loads a pre-merge workspace fixture without leaking FlashQuery secrets', () => {
    const sourceNote = readFileSync(
      new URL('./__fixtures__/premerge-workspace.source.md', import.meta.url),
      'utf8',
    )
    const workspaceFile = JSON.parse(
      readFileSync(new URL('./__fixtures__/premerge-workspace.json', import.meta.url), 'utf8'),
    ) as ProjectWorkspaceFile
    const sessionFile = JSON.parse(
      readFileSync(new URL('./__fixtures__/premerge-session.json', import.meta.url), 'utf8'),
    ) as ProjectSessionFile

    const snapshot = projectFilesToSnapshot(workspaceFile, sessionFile, '/tmp/cate-premerge-workspace')

    expect(sourceNote).toContain('318214f^1')
    expect(sourceNote).toContain('pre-merge saveSession')
    expect(snapshot.workspaceId).toBe('workspace-premerge-generated')
    expect(snapshot.workspaceName).toBe('Generated Pre-Merge FlashQuery Workspace')
    expect(snapshot.flashqueryConnection).toEqual({
      transport: 'http',
      url: 'https://premerge.flashquery.local/mcp',
    })
    expect(snapshot.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          panelId: 'panel-generated-vault',
          panelType: 'flashqueryVault',
          title: 'FlashQuery Vault',
        }),
        expect.objectContaining({
          panelId: 'panel-generated-editor',
          panelType: 'editor',
          filePath: path.join('/tmp/cate-premerge-workspace', 'docs/Generated.md'),
        }),
      ]),
    )
    expect(sessionFile.nodes['panel-generated-editor']).toEqual(expect.objectContaining({
      panelId: 'panel-generated-editor',
      creationIndex: 1,
    }))
    expect(snapshot.regions?.['region-generated']?.label).toBe('Generated Fixture')
    expect(JSON.stringify(snapshot)).not.toContain('premerge-secret-token')
    expect(JSON.stringify(snapshot)).not.toContain('"auth"')
  })
})
