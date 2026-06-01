import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { projectFilesToSnapshot } from './session'
import type { ProjectWorkspaceFile } from '../../shared/types'

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
    const workspaceFile = JSON.parse(
      readFileSync(new URL('./__fixtures__/premerge-workspace.json', import.meta.url), 'utf8'),
    ) as ProjectWorkspaceFile

    const snapshot = projectFilesToSnapshot(workspaceFile, null, '/tmp/cate-premerge-workspace')

    expect(snapshot.workspaceId).toBe('workspace-premerge-flashquery')
    expect(snapshot.workspaceName).toBe('Pre-merge FlashQuery Workspace')
    expect(snapshot.flashqueryConnection).toEqual({
      transport: 'http',
      url: 'https://flashquery.local',
    })
    expect(snapshot.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          panelId: 'panel-vault',
          panelType: 'flashqueryVault',
          title: 'FlashQuery Vault',
        }),
        expect.objectContaining({
          panelId: 'panel-welcome-doc',
          panelType: 'editor',
          filePath: path.join('/tmp/cate-premerge-workspace', 'docs/Welcome.md'),
        }),
      ]),
    )
    expect(snapshot.regions?.['region-reference']?.label).toBe('Reference')
    expect(JSON.stringify(snapshot)).not.toContain('premerge-secret-token')
    expect(JSON.stringify(snapshot)).not.toContain('"auth"')
  })
})
