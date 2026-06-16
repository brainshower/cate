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
import { createDockStore, useDockStore } from './dockStore'
import { registerNodeDockStore, unregisterNodeDockStore } from '../panels/nodeDockRegistry'

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
          dockLayout: {
            type: 'tabs',
            id: 'stack-1',
            panelIds: [panelId],
            activeIndex: 0,
          },
        },
      },
      setNodeDockLayout: vi.fn(),
      focusNode: vi.fn(),
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

describe('appStore.createFlashQueryVaultSearch', () => {
  beforeEach(() => {
    seedStore()
    setCanvasOperations(makeCanvasOps())
  })

  it('creates a Vault Search panel in workspace state', () => {
    const panelId = useAppStore.getState().createFlashQueryVaultSearch(workspaceId)
    const panel = useAppStore.getState().workspaces[0].panels[panelId]

    expect(panel).toMatchObject({
      id: panelId,
      type: 'flashqueryVaultSearch',
      title: 'Vault Search',
      isDirty: false,
    })
  })

  it('delegates canvas placement through placePanel with the flashqueryVaultSearch type', () => {
    const addNodeAndFocus = vi.fn()
    setCanvasOperations(makeCanvasOps({ addNodeAndFocus }))
    const position = { x: 24, y: 48 }
    const placement = { target: 'canvas' as const, position }

    const panelId = useAppStore.getState().createFlashQueryVaultSearch(workspaceId, { x: 1, y: 2 }, placement)

    expect(addNodeAndFocus).toHaveBeenCalledWith(panelId, 'flashqueryVaultSearch', position)
  })

  it('delegates dock placement through placePanel', () => {
    const panelId = useAppStore.getState().createFlashQueryVaultSearch(workspaceId, undefined, {
      target: 'dock',
      zone: 'left',
    })

    expect(useDockStore.getState().panelLocations[panelId]).toMatchObject({
      type: 'dock',
      zone: 'left',
    })
  })
})

describe('appStore.createOutline', () => {
  beforeEach(() => {
    seedStore()
    setCanvasOperations(makeCanvasOps())
  })

  it('creates an Outline panel in workspace state', () => {
    const panelId = useAppStore.getState().createOutline(workspaceId)
    const panel = useAppStore.getState().workspaces[0].panels[panelId]

    expect(panel).toMatchObject({
      id: panelId,
      type: 'outline',
      title: 'Outline',
      isDirty: false,
    })
  })

  it('places Outline panels in the right dock zone when requested', () => {
    const panelId = useAppStore.getState().createOutline(workspaceId, undefined, {
      target: 'dock',
      zone: 'right',
    }, 'editor-1')
    const panel = useAppStore.getState().workspaces[0].panels[panelId]

    expect(panel).toMatchObject({ sourceEditorPanelId: 'editor-1' })
    expect(useDockStore.getState().panelLocations[panelId]).toMatchObject({
      type: 'dock',
      zone: 'right',
    })
  })

  it('closes one right-zone Outline panel without closing unrelated right-zone panels', () => {
    const outlinePanelId = useAppStore.getState().createOutline(workspaceId, undefined, {
      target: 'dock',
      zone: 'right',
    })
    const searchPanelId = useAppStore.getState().createFlashQueryVaultSearch(workspaceId, undefined, {
      target: 'dock',
      zone: 'right',
    })

    useAppStore.getState().closePanel(workspaceId, outlinePanelId)

    const workspace = useAppStore.getState().workspaces[0]
    expect(workspace.panels[outlinePanelId]).toBeUndefined()
    expect(workspace.panels[searchPanelId]).toMatchObject({ type: 'flashqueryVaultSearch' })
    expect(useDockStore.getState().panelLocations[searchPanelId]).toMatchObject({
      type: 'dock',
      zone: 'right',
    })
  })

  it('opens canvas Outline as a right split in the source canvas node', () => {
    const addNodeAndFocus = vi.fn()
    const setNodeDockLayout = vi.fn()
    const focusNode = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      { x: 100, y: 120 },
      { target: 'canvas', position: { x: 100, y: 120 } },
    )
    const initialLayout = {
      type: 'tabs' as const,
      id: 'stack-1',
      panelIds: [sourcePanelId],
      activeIndex: 0,
    }
    const liveDockStore = createDockStore({
      zones: {
        left: { position: 'left', visible: false, size: 260, layout: null },
        right: { position: 'right', visible: false, size: 260, layout: null },
        bottom: { position: 'bottom', visible: false, size: 240, layout: null },
        center: { position: 'center', visible: true, size: 0, layout: initialLayout },
      },
      locations: {
        [sourcePanelId]: { type: 'dock', zone: 'center', stackId: 'stack-1' },
      },
    })
    registerNodeDockStore('canvas-1', 'node-1', liveDockStore)
    setCanvasOperations(makeCanvasOpsWithNode(
      sourcePanelId,
      { x: 100, y: 120 },
      { width: 640, height: 420 },
      {
        addNodeAndFocus,
        storeApi: {
          getState: () => ({
            nodeForPanel: (candidate: string) => candidate === sourcePanelId ? 'node-1' : null,
            nodes: {
              'node-1': {
                id: 'node-1',
                panelId: sourcePanelId,
                origin: { x: 100, y: 120 },
                size: { width: 640, height: 420 },
                zOrder: 1,
                creationIndex: 1,
                dockLayout: initialLayout,
              },
            },
            setNodeDockLayout,
            focusNode,
          }),
        } as unknown as CanvasOperations['storeApi'],
      },
    ))

    try {
      const outlinePanelId = useAppStore.getState().createOutline(
        workspaceId,
        undefined,
        { target: 'none' },
        sourcePanelId,
      )

      expect(addNodeAndFocus).not.toHaveBeenCalled()
      expect(liveDockStore.getState().zones.center.layout).toMatchObject({
        type: 'split',
        direction: 'horizontal',
        ratios: [2 / 3, 1 / 3],
        children: [
          { type: 'tabs', id: 'stack-1', panelIds: [sourcePanelId], activeIndex: 0 },
          { type: 'tabs', panelIds: [outlinePanelId], activeIndex: 0 },
        ],
      })
      expect(setNodeDockLayout).toHaveBeenCalledWith('node-1', liveDockStore.getState().zones.center.layout)
      expect(useDockStore.getState().panelLocations[outlinePanelId]).toBeUndefined()
      expect(focusNode).toHaveBeenCalledWith('node-1')
    } finally {
      unregisterNodeDockStore('canvas-1', 'node-1')
    }
  })

  it('uses the explicit source canvas node id when panel lookup misses the source editor', () => {
    const addNodeAndFocus = vi.fn()
    const setNodeDockLayout = vi.fn()
    const focusNode = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      undefined,
      { target: 'none' },
    )
    const initialLayout = {
      type: 'tabs' as const,
      id: 'stack-1',
      panelIds: [sourcePanelId],
      activeIndex: 0,
    }
    const liveDockStore = createDockStore({
      zones: {
        left: { position: 'left', visible: false, size: 260, layout: null },
        right: { position: 'right', visible: false, size: 260, layout: null },
        bottom: { position: 'bottom', visible: false, size: 240, layout: null },
        center: { position: 'center', visible: true, size: 0, layout: initialLayout },
      },
      locations: {
        [sourcePanelId]: { type: 'dock', zone: 'center', stackId: 'stack-1' },
      },
    })
    registerNodeDockStore('canvas-1', 'node-1', liveDockStore)
    setCanvasOperations(makeCanvasOpsWithNode(
      sourcePanelId,
      { x: 100, y: 120 },
      { width: 640, height: 420 },
      {
        addNodeAndFocus,
        storeApi: {
          getState: () => ({
            nodeForPanel: () => null,
            nodes: {
              'node-1': {
                id: 'node-1',
                panelId: sourcePanelId,
                origin: { x: 100, y: 120 },
                size: { width: 640, height: 420 },
                zOrder: 1,
                creationIndex: 1,
                dockLayout: initialLayout,
              },
            },
            setNodeDockLayout,
            focusNode,
          }),
        } as unknown as CanvasOperations['storeApi'],
      },
    ))

    try {
      const outlinePanelId = useAppStore.getState().createOutline(
        workspaceId,
        undefined,
        { target: 'none' },
        sourcePanelId,
        'node-1',
      )

      expect(useAppStore.getState().workspaces[0].panels[outlinePanelId]).toMatchObject({
        type: 'outline',
        sourceEditorPanelId: sourcePanelId,
        sourceCanvasNodeId: 'node-1',
      })
      expect(liveDockStore.getState().zones.center.layout).toMatchObject({
        type: 'split',
        direction: 'horizontal',
        children: [
          { type: 'tabs', id: 'stack-1', panelIds: [sourcePanelId], activeIndex: 0 },
          { type: 'tabs', panelIds: [outlinePanelId], activeIndex: 0 },
        ],
      })
      expect(addNodeAndFocus).not.toHaveBeenCalled()
      expect(setNodeDockLayout).toHaveBeenCalledWith('node-1', liveDockStore.getState().zones.center.layout)
      expect(focusNode).toHaveBeenCalledWith('node-1')
    } finally {
      unregisterNodeDockStore('canvas-1', 'node-1')
    }
  })
})

describe('appStore.createSemanticConnections', () => {
  beforeEach(() => {
    seedStore()
    setCanvasOperations(makeCanvasOps())
  })

  it('T-U-003 creates a Semantic Connections panel in workspace state', () => {
    const panelId = useAppStore.getState().createSemanticConnections(workspaceId)
    const panel = useAppStore.getState().workspaces[0].panels[panelId]

    expect(panel).toMatchObject({
      id: panelId,
      type: 'semantic-connections',
      title: 'Connections',
      isDirty: false,
    })
  })

  it('T-U-003 places Semantic Connections panels in the right dock zone when requested', () => {
    const panelId = useAppStore.getState().createSemanticConnections(workspaceId, undefined, {
      target: 'dock',
      zone: 'right',
    })

    expect(useDockStore.getState().panelLocations[panelId]).toMatchObject({
      type: 'dock',
      zone: 'right',
    })
  })

  it('T-U-003 delegates canvas placement through the ordinary placement path', () => {
    const addNodeAndFocus = vi.fn()
    setCanvasOperations(makeCanvasOps({ addNodeAndFocus }))
    const position = { x: 24, y: 48 }
    const placement = { target: 'canvas' as const, position }

    const panelId = useAppStore.getState().createSemanticConnections(workspaceId, { x: 1, y: 2 }, placement)

    expect(addNodeAndFocus).toHaveBeenCalledWith(panelId, 'semantic-connections', position)
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

  it('T-U-007 re-places an existing orphaned frontmatter editor instead of no-op focusing it', () => {
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      undefined,
      { target: 'dock', zone: 'center' },
    )
    const orphanPanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md?part=frontmatter',
      undefined,
      { target: 'none' },
    )

    const result = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)

    expect(result).toBe(orphanPanelId)
    const panels = Object.values(useAppStore.getState().workspaces[0].panels)
      .filter((panel) => panel.filePath === 'flashquery://workspace-1/Docs/Plan.md?part=frontmatter')
    expect(panels).toHaveLength(1)
    const stack = useDockStore.getState().zones.center.layout
    expect(stack?.type === 'tabs' ? stack.panelIds : []).toEqual([sourcePanelId, orphanPanelId])
    expect(stack?.type === 'tabs' ? stack.activeIndex : -1).toBe(1)
  })

  it('T-U-007 opens canvas frontmatter as a tab in the source canvas node', () => {
    const addNodeAndFocus = vi.fn()
    const setNodeDockLayout = vi.fn()
    const focusNode = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      { x: 100, y: 120 },
      { target: 'canvas', position: { x: 100, y: 120 } },
    )
    setCanvasOperations(makeCanvasOpsWithNode(
      sourcePanelId,
      { x: 100, y: 120 },
      { width: 640, height: 420 },
      {
        addNodeAndFocus,
        storeApi: {
          getState: () => ({
            nodeForPanel: (candidate: string) => candidate === sourcePanelId ? 'node-1' : null,
            nodes: {
              'node-1': {
                id: 'node-1',
                panelId: sourcePanelId,
                origin: { x: 100, y: 120 },
                size: { width: 640, height: 420 },
                zOrder: 1,
                creationIndex: 1,
                dockLayout: {
                  type: 'tabs',
                  id: 'stack-1',
                  panelIds: [sourcePanelId],
                  activeIndex: 0,
                },
              },
            },
            setNodeDockLayout,
            focusNode,
          }),
        } as unknown as CanvasOperations['storeApi'],
      },
    ))

    const frontmatterPanelId = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)

    expect(addNodeAndFocus).not.toHaveBeenCalledWith(frontmatterPanelId, 'editor', expect.anything())
    expect(setNodeDockLayout).toHaveBeenCalledWith('node-1', {
      type: 'tabs',
      id: 'stack-1',
      panelIds: [sourcePanelId, frontmatterPanelId],
      activeIndex: 1,
    })
    expect(focusNode).toHaveBeenCalledWith('node-1')
  })

  it('T-U-007 opens canvas frontmatter in the live canvas-node tab store', () => {
    const addNodeAndFocus = vi.fn()
    const setNodeDockLayout = vi.fn()
    const focusNode = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      { x: 100, y: 120 },
      { target: 'canvas', position: { x: 100, y: 120 } },
    )
    const initialLayout = {
      type: 'tabs' as const,
      id: 'stack-1',
      panelIds: [sourcePanelId],
      activeIndex: 0,
    }
    const liveDockStore = createDockStore({
      zones: {
        left: { position: 'left', visible: false, size: 260, layout: null },
        right: { position: 'right', visible: false, size: 260, layout: null },
        bottom: { position: 'bottom', visible: false, size: 240, layout: null },
        center: { position: 'center', visible: true, size: 0, layout: initialLayout },
      },
      locations: {
        [sourcePanelId]: { type: 'dock', zone: 'center', stackId: 'stack-1' },
      },
    })
    registerNodeDockStore('canvas-1', 'node-1', liveDockStore)
    setCanvasOperations(makeCanvasOpsWithNode(
      sourcePanelId,
      { x: 100, y: 120 },
      { width: 640, height: 420 },
      {
        addNodeAndFocus,
        storeApi: {
          getState: () => ({
            nodeForPanel: (candidate: string) => candidate === sourcePanelId ? 'node-1' : null,
            nodes: {
              'node-1': {
                id: 'node-1',
                panelId: sourcePanelId,
                origin: { x: 100, y: 120 },
                size: { width: 640, height: 420 },
                zOrder: 1,
                creationIndex: 1,
                dockLayout: initialLayout,
              },
            },
            setNodeDockLayout,
            focusNode,
          }),
        } as unknown as CanvasOperations['storeApi'],
      },
    ))

    try {
      const frontmatterPanelId = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)

      expect(addNodeAndFocus).not.toHaveBeenCalledWith(frontmatterPanelId, 'editor', expect.anything())
      expect(liveDockStore.getState().zones.center.layout).toMatchObject({
        type: 'tabs',
        id: 'stack-1',
        panelIds: [sourcePanelId, frontmatterPanelId],
        activeIndex: 1,
      })
      expect(setNodeDockLayout).toHaveBeenCalledWith('node-1', liveDockStore.getState().zones.center.layout)
      expect(focusNode).toHaveBeenCalledWith('node-1')
    } finally {
      unregisterNodeDockStore('canvas-1', 'node-1')
    }
  })

  it('T-U-007 prefers the visible canvas node over a stale global dock location', () => {
    const addNodeAndFocus = vi.fn()
    const setNodeDockLayout = vi.fn()
    const focusNode = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      undefined,
      { target: 'dock', zone: 'center' },
    )
    const initialLayout = {
      type: 'tabs' as const,
      id: 'stack-1',
      panelIds: [sourcePanelId],
      activeIndex: 0,
    }
    const liveDockStore = createDockStore({
      zones: {
        left: { position: 'left', visible: false, size: 260, layout: null },
        right: { position: 'right', visible: false, size: 260, layout: null },
        bottom: { position: 'bottom', visible: false, size: 240, layout: null },
        center: { position: 'center', visible: true, size: 0, layout: initialLayout },
      },
      locations: {
        [sourcePanelId]: { type: 'dock', zone: 'center', stackId: 'stack-1' },
      },
    })
    registerNodeDockStore('canvas-1', 'node-1', liveDockStore)
    setCanvasOperations(makeCanvasOpsWithNode(
      sourcePanelId,
      { x: 100, y: 120 },
      { width: 640, height: 420 },
      {
        addNodeAndFocus,
        storeApi: {
          getState: () => ({
            nodeForPanel: (candidate: string) => candidate === sourcePanelId ? 'node-1' : null,
            nodes: {
              'node-1': {
                id: 'node-1',
                panelId: sourcePanelId,
                origin: { x: 100, y: 120 },
                size: { width: 640, height: 420 },
                zOrder: 1,
                creationIndex: 1,
                dockLayout: initialLayout,
              },
            },
            setNodeDockLayout,
            focusNode,
          }),
        } as unknown as CanvasOperations['storeApi'],
      },
    ))

    try {
      const frontmatterPanelId = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)

      expect(liveDockStore.getState().zones.center.layout).toMatchObject({
        type: 'tabs',
        id: 'stack-1',
        panelIds: [sourcePanelId, frontmatterPanelId],
        activeIndex: 1,
      })
      expect(setNodeDockLayout).toHaveBeenCalledWith('node-1', liveDockStore.getState().zones.center.layout)
      const globalStack = useDockStore.getState().zones.center.layout
      expect(globalStack?.type === 'tabs' ? globalStack.panelIds : []).toEqual([sourcePanelId])
      expect(addNodeAndFocus).not.toHaveBeenCalled()
      expect(focusNode).toHaveBeenCalledWith('node-1')
    } finally {
      unregisterNodeDockStore('canvas-1', 'node-1')
    }
  })

  it('T-U-007 moves an existing docked frontmatter editor into the source canvas node', () => {
    const addNodeAndFocus = vi.fn()
    const setNodeDockLayout = vi.fn()
    const focusNode = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      { x: 100, y: 120 },
      { target: 'canvas', position: { x: 100, y: 120 } },
    )
    const frontmatterPanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md?part=frontmatter',
      undefined,
      { target: 'dock', zone: 'center' },
    )
    const initialLayout = {
      type: 'tabs' as const,
      id: 'stack-1',
      panelIds: [sourcePanelId],
      activeIndex: 0,
    }
    const liveDockStore = createDockStore({
      zones: {
        left: { position: 'left', visible: false, size: 260, layout: null },
        right: { position: 'right', visible: false, size: 260, layout: null },
        bottom: { position: 'bottom', visible: false, size: 240, layout: null },
        center: { position: 'center', visible: true, size: 0, layout: initialLayout },
      },
      locations: {
        [sourcePanelId]: { type: 'dock', zone: 'center', stackId: 'stack-1' },
      },
    })
    registerNodeDockStore('canvas-1', 'node-1', liveDockStore)
    setCanvasOperations(makeCanvasOpsWithNode(
      sourcePanelId,
      { x: 100, y: 120 },
      { width: 640, height: 420 },
      {
        addNodeAndFocus,
        storeApi: {
          getState: () => ({
            nodeForPanel: (candidate: string) => candidate === sourcePanelId ? 'node-1' : null,
            nodes: {
              'node-1': {
                id: 'node-1',
                panelId: sourcePanelId,
                origin: { x: 100, y: 120 },
                size: { width: 640, height: 420 },
                zOrder: 1,
                creationIndex: 1,
                dockLayout: initialLayout,
              },
            },
            setNodeDockLayout,
            focusNode,
          }),
        } as unknown as CanvasOperations['storeApi'],
      },
    ))

    try {
      const result = useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId)

      expect(result).toBe(frontmatterPanelId)
      expect(liveDockStore.getState().zones.center.layout).toMatchObject({
        type: 'tabs',
        id: 'stack-1',
        panelIds: [sourcePanelId, frontmatterPanelId],
        activeIndex: 1,
      })
      expect(setNodeDockLayout).toHaveBeenCalledWith('node-1', liveDockStore.getState().zones.center.layout)
      expect(useDockStore.getState().panelLocations[frontmatterPanelId]).toBeUndefined()
      const globalStack = useDockStore.getState().zones.center.layout
      expect(globalStack?.type === 'tabs' ? globalStack.panelIds : []).not.toContain(frontmatterPanelId)
      expect(addNodeAndFocus).not.toHaveBeenCalled()
      expect(focusNode).toHaveBeenCalledWith('node-1')
    } finally {
      unregisterNodeDockStore('canvas-1', 'node-1')
    }
  })

  it('T-U-007 opens frontmatter by vault path through an existing body panel when available', () => {
    const addNodeAndFocus = vi.fn()
    const setNodeDockLayout = vi.fn()
    const focusNode = vi.fn()
    const sourcePanelId = useAppStore.getState().createEditor(
      workspaceId,
      'flashquery://workspace-1/Docs/Plan.md',
      { x: 100, y: 120 },
      { target: 'canvas', position: { x: 100, y: 120 } },
    )
    setCanvasOperations(makeCanvasOpsWithNode(
      sourcePanelId,
      { x: 100, y: 120 },
      { width: 640, height: 420 },
      {
        addNodeAndFocus,
        storeApi: {
          getState: () => ({
            nodeForPanel: (candidate: string) => candidate === sourcePanelId ? 'node-1' : null,
            nodes: {
              'node-1': {
                id: 'node-1',
                panelId: sourcePanelId,
                origin: { x: 100, y: 120 },
                size: { width: 640, height: 420 },
                zOrder: 1,
                creationIndex: 1,
                dockLayout: {
                  type: 'tabs',
                  id: 'stack-1',
                  panelIds: [sourcePanelId],
                  activeIndex: 0,
                },
              },
            },
            setNodeDockLayout,
            focusNode,
          }),
        } as unknown as CanvasOperations['storeApi'],
      },
    ))

    const frontmatterPanelId = useAppStore.getState().openFlashQueryFrontmatterForPath(workspaceId, 'Docs/Plan.md')

    expect(addNodeAndFocus).not.toHaveBeenCalledWith(frontmatterPanelId, 'editor', expect.anything())
    expect(setNodeDockLayout).toHaveBeenCalledWith('node-1', {
      type: 'tabs',
      id: 'stack-1',
      panelIds: [sourcePanelId, frontmatterPanelId],
      activeIndex: 1,
    })
    expect(focusNode).toHaveBeenCalledWith('node-1')
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
