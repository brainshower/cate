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
