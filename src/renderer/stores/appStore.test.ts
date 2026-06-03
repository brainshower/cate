import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../lib/terminalRegistry', () => ({
  terminalRegistry: {
    dispose: vi.fn(),
  },
}))

import { setCanvasOperations, useAppStore, type CanvasOperations } from './appStore'
import { useDockStore } from './dockStore'

const workspaceId = 'workspace-1'

const makeCanvasOps = (overrides: Partial<CanvasOperations> = {}): CanvasOperations => ({
  addNodeAndFocus: vi.fn(),
  removeNodeForPanel: vi.fn(),
  loadWorkspaceCanvas: vi.fn(),
  syncCanvasSnapshot: vi.fn(() => ({
    nodes: {},
    regions: {},
    viewportOffset: { x: 0, y: 0 },
    zoomLevel: 1,
    focusedNodeId: null,
  })),
  clearAllNodes: vi.fn(),
  focusPanelNode: vi.fn(),
  storeApi: {} as CanvasOperations['storeApi'],
  ...overrides,
})

const makeCanvasOpsWithNode = (
  panelId: string,
  origin = { x: 100, y: 120 },
  size = { width: 640, height: 420 },
  overrides: Partial<CanvasOperations> = {},
): CanvasOperations => ({
  ...makeCanvasOps(),
  storeApi: {
    getState: () => ({
      nodeForPanel: (candidate: string) => candidate === panelId ? 'node-1' : null,
      nodes: {
        'node-1': {
          id: 'node-1',
          panelId,
          origin,
          size,
          zOrder: 1,
          creationIndex: 1,
        },
      },
    }),
  } as unknown as CanvasOperations['storeApi'],
  ...overrides,
})

function seedStore() {
  useAppStore.setState({
    selectedWorkspaceId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name: 'Workspace',
      color: '#5AD8B8',
      rootPath: '/workspace',
      panels: {},
      canvasNodes: {},
      regions: {},
      zoomLevel: 1,
      viewportOffset: { x: 0, y: 0 },
      focusedNodeId: null,
    }],
  })
  useDockStore.getState().restoreSnapshot({
    zones: {
      left: { position: 'left', visible: false, size: 260, layout: null },
      right: { position: 'right', visible: false, size: 260, layout: null },
      bottom: { position: 'bottom', visible: false, size: 240, layout: null },
      center: { position: 'center', visible: true, size: 0, layout: null },
    },
    locations: {},
  })
}

describe('appStore.createFlashQueryVault', () => {
  beforeEach(() => {
    seedStore()
    setCanvasOperations(makeCanvasOps())
  })

  it('creates a FlashQuery Vault panel in workspace state', () => {
    const panelId = useAppStore.getState().createFlashQueryVault(workspaceId)
    const panel = useAppStore.getState().workspaces[0].panels[panelId]

    expect(panel).toMatchObject({
      id: panelId,
      type: 'flashqueryVault',
      title: 'FlashQuery Vault',
      isDirty: false,
    })
  })

  it('delegates canvas placement through placePanel with the flashqueryVault type', () => {
    const addNodeAndFocus = vi.fn()
    setCanvasOperations(makeCanvasOps({ addNodeAndFocus }))
    const position = { x: 24, y: 48 }
    const placement = { target: 'canvas' as const, position }

    const panelId = useAppStore.getState().createFlashQueryVault(workspaceId, { x: 1, y: 2 }, placement)

    expect(addNodeAndFocus).toHaveBeenCalledWith(panelId, 'flashqueryVault', position)
  })

  it('delegates dock placement through placePanel', () => {
    const panelId = useAppStore.getState().createFlashQueryVault(workspaceId, undefined, {
      target: 'dock',
      zone: 'left',
    })

    expect(useDockStore.getState().panelLocations[panelId]).toMatchObject({
      type: 'dock',
      zone: 'left',
    })
  })

  it('rolls back the inserted panel when placement fails', () => {
    setCanvasOperations(makeCanvasOps({
      addNodeAndFocus: vi.fn(() => {
        throw new Error('placement failed')
      }),
    }))

    const panelId = useAppStore.getState().createFlashQueryVault(workspaceId)

    expect(panelId).toBeNull()
    expect(useAppStore.getState().workspaces[0].panels).toEqual({})
  })
})

describe('appStore.createEditor', () => {
  beforeEach(() => {
    seedStore()
    setCanvasOperations(makeCanvasOps())
  })

  it('uses decoded FlashQuery URI filenames for editor titles', () => {
    const panelId = useAppStore
      .getState()
      .createEditor(workspaceId, 'flashquery://workspace-1/Docs/Space%20Plan.md')
    const panel = useAppStore.getState().workspaces[0].panels[panelId]

    expect(panel.title).toBe('Space Plan.md')
    expect(panel.title).not.toContain('%20')
  })
})

describe('appStore.openFlashQueryFrontmatterEditor', () => {
  beforeEach(() => {
    seedStore()
    setCanvasOperations(makeCanvasOps())
  })

  it('T-U-007 creates a frontmatter editor with distinct URI, title, and dock sibling placement', () => {
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      undefined,
      { target: 'dock', zone: 'center' },
    )

    const frontmatterPanelId = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)
    const workspace = useAppStore.getState().workspaces[0]
    const frontmatterPanel = workspace.panels[frontmatterPanelId!]

    expect(frontmatterPanel).toMatchObject({
      type: 'editor',
      title: 'Plan.md Frontmatter',
      filePath: 'flashquery://workspace-1/Docs/Plan.md?part=frontmatter',
    })
    expect(frontmatterPanel.id).not.toBe(sourcePanelId)
    expect(frontmatterPanel.filePath).not.toBe(workspace.panels[sourcePanelId].filePath)

    const location = useDockStore.getState().panelLocations[frontmatterPanelId!]
    expect(location).toMatchObject({ type: 'dock', zone: 'center' })
    const stack = useDockStore.getState().zones.center.layout
    expect(stack?.type).toBe('tabs')
    expect(stack?.type === 'tabs' ? stack.panelIds : []).toEqual([sourcePanelId, frontmatterPanelId])
  })

  it('T-U-007 returns null without changing state for local, missing, and source-frontmatter panels', () => {
    const localPanelId = useAppStore.getState().createEditor(workspaceId, '/workspace/Docs/Plan.md')
    const frontmatterPanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md?part=frontmatter',
    )
    const beforePanelIds = Object.keys(useAppStore.getState().workspaces[0].panels)

    expect(useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, localPanelId)).toBeNull()
    expect(useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, 'missing-panel')).toBeNull()
    expect(useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, frontmatterPanelId)).toBeNull()

    expect(Object.keys(useAppStore.getState().workspaces[0].panels)).toEqual(beforePanelIds)
  })

  it('T-U-007 focuses an existing frontmatter editor instead of creating a duplicate', () => {
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      undefined,
      { target: 'dock', zone: 'center' },
    )

    const first = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)
    const second = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)

    expect(second).toBe(first)
    const panels = Object.values(useAppStore.getState().workspaces[0].panels)
      .filter((panel) => panel.filePath === 'flashquery://workspace-1/Docs/Plan.md?part=frontmatter')
    expect(panels).toHaveLength(1)
  })

  it('T-U-007 places canvas frontmatter beside the source canvas panel', () => {
    const addNodeAndFocus = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      { x: 100, y: 120 },
      { target: 'canvas', position: { x: 100, y: 120 } },
    )
    setCanvasOperations(makeCanvasOpsWithNode(sourcePanelId, { x: 100, y: 120 }, { width: 640, height: 420 }, { addNodeAndFocus }))

    const frontmatterPanelId = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)

    expect(addNodeAndFocus).toHaveBeenCalledWith(frontmatterPanelId, 'editor', { x: 780, y: 120 })
  })

  it('T-U-007 opens frontmatter by vault path through an existing body panel when available', () => {
    const addNodeAndFocus = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      { x: 100, y: 120 },
      { target: 'canvas', position: { x: 100, y: 120 } },
    )
    setCanvasOperations(makeCanvasOpsWithNode(sourcePanelId, { x: 100, y: 120 }, { width: 640, height: 420 }, { addNodeAndFocus }))

    const frontmatterPanelId = useAppStore.getState().openFlashQueryFrontmatterForPath(workspaceId, 'Docs/Plan.md')

    expect(addNodeAndFocus).toHaveBeenCalledWith(frontmatterPanelId, 'editor', { x: 780, y: 120 })
    expect(useAppStore.getState().workspaces[0].panels[frontmatterPanelId!].filePath)
      .toBe('flashquery://workspace-1/Docs/Plan.md?part=frontmatter')
  })

  it('T-U-007 dedups frontmatter opened by vault path without an open body panel', () => {
    const first = useAppStore.getState().openFlashQueryFrontmatterForPath(workspaceId, 'Docs/Plan.md')
    const second = useAppStore.getState().openFlashQueryFrontmatterForPath(workspaceId, 'Docs/Plan.md')

    expect(second).toBe(first)
    const panels = Object.values(useAppStore.getState().workspaces[0].panels)
      .filter((panel) => panel.filePath === 'flashquery://workspace-1/Docs/Plan.md?part=frontmatter')
    expect(panels).toHaveLength(1)
  })
})
