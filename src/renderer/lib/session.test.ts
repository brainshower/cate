import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { projectFilesToSnapshot, dedupeWorkspaceIds } from './session'
import type { ProjectSessionFile, ProjectWorkspaceFile, SessionSnapshot } from '../../shared/types'

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
      url: 'https://premerge.flashquery.local',
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

describe('dedupeWorkspaceIds — browser session isolation', () => {
  const mkSnap = (workspaceId: string | undefined, name: string, rootPath: string | null): SessionSnapshot => ({
    workspaceId,
    workspaceName: name,
    rootPath,
    viewportOffset: { x: 0, y: 0 },
    zoomLevel: 1,
    nodes: [],
  })

  it('T-U-020 regenerates a fresh id for a second workspace that shares an id (session bleed repro)', () => {
    // Mirrors the real corruption: two distinct projects both persisted
    // workspaceId 41933e17, so both browsers resolved to persist:browser-ws-41933e17.
    const dup = '41933e17-92bd-4995-9f0d-ace211ff015f'
    const workspaces = [
      mkSnap(dup, 'FlashQuery', '/Users/matt/Documents/Claude/Projects/FlashQuery'),
      mkSnap(dup, 'files', '/Users/matt/Downloads/files'),
    ]

    const changed = dedupeWorkspaceIds(workspaces)

    expect(changed).toBe(1)
    // First occurrence keeps the original id.
    expect(workspaces[0].workspaceId).toBe(dup)
    // Second occurrence gets a distinct, valid UUID — so the two browsers now
    // resolve to DIFFERENT persist:browser-ws-* partitions.
    expect(workspaces[1].workspaceId).not.toBe(dup)
    expect(workspaces[1].workspaceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('T-U-021 leaves already-unique ids untouched', () => {
    const a = mkSnap('aaaaaaaa-0000-4000-8000-000000000001', 'A', '/a')
    const b = mkSnap('bbbbbbbb-0000-4000-8000-000000000002', 'B', '/b')
    const workspaces = [a, b]

    const changed = dedupeWorkspaceIds(workspaces)

    expect(changed).toBe(0)
    expect(workspaces[0].workspaceId).toBe('aaaaaaaa-0000-4000-8000-000000000001')
    expect(workspaces[1].workspaceId).toBe('bbbbbbbb-0000-4000-8000-000000000002')
  })

  it('T-U-022 assigns a fresh id to blank/missing workspaceId so it never aliases another', () => {
    const workspaces = [
      mkSnap('cccccccc-0000-4000-8000-000000000003', 'A', '/a'),
      mkSnap(undefined, 'NoId', '/b'),
      mkSnap('   ', 'BlankId', '/c'),
    ]

    const changed = dedupeWorkspaceIds(workspaces)

    expect(changed).toBe(2)
    for (const ws of workspaces) {
      expect(ws.workspaceId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    }
    // All resulting ids are distinct.
    const ids = new Set(workspaces.map((w) => w.workspaceId))
    expect(ids.size).toBe(3)
  })
})
