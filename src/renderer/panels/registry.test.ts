import { describe, expect, it, vi, afterEach } from 'vitest'
import { Graph, ListBullets, MagnifyingGlass, Vault } from '@phosphor-icons/react'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { browserPartitionForWorkspace } from './browserPartition'

const createFlashQueryVault = vi.fn()
const createFlashQueryVaultSearch = vi.fn()
const createOutline = vi.fn()
const createSemanticConnections = vi.fn()

// Mutable workspace fixture: each test that exercises owning-workspace
// resolution sets this to the workspaces it wants `ownerWorkspaceIdForPanel`
// to scan. Defaults to empty so unrelated tests fall back to ctx.workspaceId.
let mockWorkspaces: Array<{ id: string; panels: Record<string, unknown> }> = []

vi.mock('../stores/appStore', () => ({
  useAppStore: {
    getState: () => ({
      createFlashQueryVault,
      createFlashQueryVaultSearch,
      createOutline,
      createSemanticConnections,
      workspaces: mockWorkspaces,
    }),
  },
  // Real-ish implementation mirroring appStore.ownerWorkspaceIdForPanel so the
  // registry's owning-workspace resolution is exercised end-to-end against the
  // mocked workspace fixture.
  ownerWorkspaceIdForPanel: (panelId: string): string | undefined => {
    if (!panelId) return undefined
    for (const ws of mockWorkspaces) {
      if (ws.panels[panelId]) return ws.id
    }
    return undefined
  },
}))

vi.mock('../stores/previewSelectionStore', () => {
  let state = { activeChunkId: null as string | null }
  const scope = () => ({
    hoveredChunkId: null,
    pinnedChunkId: null,
    activeChunkId: state.activeChunkId,
    cautionChunkIds: [],
    connectedChunkIds: [],
  })
  const usePreviewSelectionStore = Object.assign(
    <T,>(selector: (state: { activeChunkId: string | null; getScope: () => ReturnType<typeof scope> }) => T) =>
      selector({ ...state, getScope: scope }),
    {
      getState: () => ({
        activeChunkId: state.activeChunkId,
        getScope: scope,
        clearSelection: () => {},
      }),
      setState: (next: { activeChunkId?: string | null }) => {
        state = { ...state, activeChunkId: next.activeChunkId ?? null }
      },
    },
  )

  return { usePreviewSelectionStore }
})

vi.mock('./FlashQueryVaultPanel', () => ({
  default: function MockFlashQueryVaultPanel() {
    return null
  },
}))

vi.mock('./FlashQueryVaultSearchPanel', () => ({
  default: function MockFlashQueryVaultSearchPanel() {
    return null
  },
}))

vi.mock('./OutlinePanel', () => ({
  default: function MockOutlinePanel() {
    return null
  },
}))

function collectText(node: unknown): string[] {
  if (node == null || typeof node === 'boolean') return []
  if (typeof node === 'string' || typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap(collectText)
  if (typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: unknown } }).props
    return collectText(props?.children)
  }
  return []
}

describe('PANEL_REGISTRY flashqueryVault entry', () => {
  it('registers the FlashQuery Vault renderer metadata', async () => {
    const { PANEL_REGISTRY } = await import('./registry')

    expect(PANEL_REGISTRY.flashqueryVault.type).toBe('flashqueryVault')
    expect(PANEL_REGISTRY.flashqueryVault.label).toBe('FlashQuery Vault')
    expect(PANEL_REGISTRY.flashqueryVault.icon).toBe(Vault)
  })

  it('lazy-loads FlashQueryVaultPanel', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const lazyPayload = PANEL_REGISTRY.flashqueryVault.Component as unknown as {
      _payload: { _result: () => Promise<unknown> }
    }

    const module = await lazyPayload._payload._result()

    expect(module).toHaveProperty('default')
  })

  it('delegates creation to appStore.createFlashQueryVault with exact argument order', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const canvasPoint = { x: 20, y: 30 }
    const placement = { target: 'canvas' as const, position: canvasPoint }
    createFlashQueryVault.mockReturnValueOnce('panel-1')

    expect(PANEL_REGISTRY.flashqueryVault.create({
      workspaceId: 'workspace-1',
      canvasPoint,
      placement,
    })).toBe('panel-1')

    expect(createFlashQueryVault).toHaveBeenCalledWith('workspace-1', canvasPoint, placement)
  })

  it('returns null when app-store creation fails', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    createFlashQueryVault.mockReturnValueOnce('')

    expect(PANEL_REGISTRY.flashqueryVault.create({ workspaceId: 'workspace-1' })).toBeNull()
  })
})

describe('PANEL_REGISTRY flashqueryVaultSearch entry', () => {
  it('registers the Vault Search renderer metadata', async () => {
    const { PANEL_REGISTRY } = await import('./registry')

    expect(PANEL_REGISTRY.flashqueryVaultSearch.type).toBe('flashqueryVaultSearch')
    expect(PANEL_REGISTRY.flashqueryVaultSearch.label).toBe('Vault Search')
    expect(PANEL_REGISTRY.flashqueryVaultSearch.icon).toBe(MagnifyingGlass)
  })

  it('lazy-loads FlashQueryVaultSearchPanel', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const lazyPayload = PANEL_REGISTRY.flashqueryVaultSearch.Component as unknown as {
      _payload: { _result: () => Promise<unknown> }
    }

    const module = await lazyPayload._payload._result()

    expect(module).toHaveProperty('default')
  })

  it('delegates creation to appStore.createFlashQueryVaultSearch with exact argument order', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const canvasPoint = { x: 20, y: 30 }
    const placement = { target: 'canvas' as const, position: canvasPoint }
    createFlashQueryVaultSearch.mockReturnValueOnce('panel-1')

    expect(PANEL_REGISTRY.flashqueryVaultSearch.create({
      workspaceId: 'workspace-1',
      canvasPoint,
      placement,
    })).toBe('panel-1')

    expect(createFlashQueryVaultSearch).toHaveBeenCalledWith('workspace-1', canvasPoint, placement)
  })
})

describe('PANEL_REGISTRY outline entry', () => {
  it('T-U-004 registers the Outline renderer metadata', async () => {
    const { PANEL_REGISTRY } = await import('./registry')

    expect(PANEL_REGISTRY.outline.type).toBe('outline')
    expect(PANEL_REGISTRY.outline.label).toBe('Outline')
    expect(PANEL_REGISTRY.outline.icon).toBe(ListBullets)
  })

  it('T-U-004 lazy-loads OutlinePanel', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const lazyPayload = PANEL_REGISTRY.outline.Component as unknown as {
      _payload: { _result: () => Promise<unknown> }
    }

    const module = await lazyPayload._payload._result()

    expect(module).toHaveProperty('default')
  })

  it('T-U-005 delegates creation to appStore.createOutline with exact argument order', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const canvasPoint = { x: 20, y: 30 }
    const placement = { target: 'dock' as const, zone: 'right' as const }
    createOutline.mockReturnValueOnce('panel-1')

    expect(PANEL_REGISTRY.outline.create({
      workspaceId: 'workspace-1',
      canvasPoint,
      placement,
    })).toBe('panel-1')

    expect(createOutline).toHaveBeenCalledWith('workspace-1', canvasPoint, placement)
  })

  it('passes source editor metadata to rendered Outline panels', async () => {
    const { renderPanelComponent } = await import('./registry')

    const element = renderPanelComponent(
      {
        id: 'outline-1',
        type: 'outline',
        sourceEditorPanelId: 'editor-1',
      },
      { workspaceId: 'workspace-1', nodeId: 'node-1' },
    )

    expect(element?.props).toMatchObject({
      panelId: 'outline-1',
      workspaceId: 'workspace-1',
      sourceEditorPanelId: 'editor-1',
    })
  })

  it('T-U-006 returns null when app-store Outline creation fails', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    createOutline.mockReturnValueOnce('')

    expect(PANEL_REGISTRY.outline.create({ workspaceId: 'workspace-1' })).toBeNull()
  })
})

describe('PANEL_REGISTRY semantic-connections entry', () => {
  it('T-U-002 registers the Semantic Connections renderer metadata', async () => {
    const { PANEL_REGISTRY } = await import('./registry')

    expect(PANEL_REGISTRY['semantic-connections'].type).toBe('semantic-connections')
    expect(PANEL_REGISTRY['semantic-connections'].label).toBe('Connections')
    expect(PANEL_REGISTRY['semantic-connections'].icon).toBe(Graph)
  })

  it('T-U-002 lazy-loads SemanticConnectionsPanel', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const lazyPayload = PANEL_REGISTRY['semantic-connections'].Component as unknown as {
      _payload: { _result: () => Promise<unknown> }
    }

    const module = await lazyPayload._payload._result()

    expect(module).toHaveProperty('default')
  })

  it('T-U-002 delegates creation to appStore.createSemanticConnections with exact argument order', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const canvasPoint = { x: 20, y: 30 }
    const placement = { target: 'dock' as const, zone: 'right' as const }
    createSemanticConnections.mockReturnValueOnce('panel-1')

    expect(PANEL_REGISTRY['semantic-connections'].create({
      workspaceId: 'workspace-1',
      canvasPoint,
      placement,
    })).toBe('panel-1')

    expect(createSemanticConnections).toHaveBeenCalledWith('workspace-1', canvasPoint, placement)
  })

  it('T-I-030 renders the body without a duplicate Connections title row', async () => {
    const module = await import('./SemanticConnectionsPanel')
    const html = renderToStaticMarkup(React.createElement(module.default, { panelId: 'semantic-1', workspaceId: 'workspace-1' }))

    expect(html).not.toContain('>Connections<')
    expect(html).toContain('Whole Document')
  })

  it('REQ-023 keeps selected scope neutral instead of exposing raw chunk slugs', async () => {
    const { usePreviewSelectionStore } = await import('../stores/previewSelectionStore')
    const module = await import('./SemanticConnectionsPanel')
    usePreviewSelectionStore.setState({
      hoveredChunkId: null,
      pinnedChunkId: 'my-heading-slug',
      activeChunkId: 'my-heading-slug',
      cautionChunkIds: [],
    })

    const html = renderToStaticMarkup(React.createElement(module.default, { panelId: 'semantic-1', workspaceId: 'workspace-1' }))

    expect(html).toContain('Selection')
    expect(html).not.toContain('my-heading-slug')
  })
})

// ---------------------------------------------------------------------------
// Regression: per-workspace browser session isolation
// (debug: cate-workspace-session-bleed)
//
// The Electron <webview> partition is derived as
// `persist:browser-ws-${workspaceId}` and is immutable after the webview
// attaches. renderPanelComponent must therefore supply each browser panel its
// OWN owning workspace id — the workspace whose `panels` map contains the
// panel — NOT the globally-active selectedWorkspaceId that callers pass as
// ctx.workspaceId. If it leaked the active id, two workspaces' browsers would
// collapse onto one Electron session and bleed cookies/logins across
// workspaces.
// ---------------------------------------------------------------------------

describe('renderPanelComponent — per-workspace browser partition isolation', () => {
  afterEach(() => {
    mockWorkspaces = []
  })

  it('T-U-023 binds each of two simultaneously-owned browser panels to its OWN workspace partition', async () => {
    const { renderPanelComponent } = await import('./registry')

    const wsA = '41933e17-92bd-4995-9f0d-ace211ff015f' // "files" / FlashQuery
    const wsB = 'ba468b7e-2392-4591-b9ca-1a5e11da79f6' // "files" / Downloads
    const browserA = { id: 'panel-browser-A', type: 'browser' as const, url: 'https://mail.google.com' }
    const browserB = { id: 'panel-browser-B', type: 'browser' as const, url: 'https://mail.google.com' }

    // Two DISTINCT workspaces, each owning ONE browser panel, both present in
    // the store at the SAME time (not sequential fresh-workspace creation).
    mockWorkspaces = [
      { id: wsA, panels: { [browserA.id]: browserA } },
      { id: wsB, panels: { [browserB.id]: browserB } },
    ]

    // Simulate the real bug condition: the renderer passes the GLOBAL active
    // workspace id (wsA) as ctx.workspaceId for BOTH panels. The fix must
    // override this with each panel's owning id.
    const elemA = renderPanelComponent(browserA, { workspaceId: wsA, nodeId: 'node-A', zoomLevel: 1 })
    const elemB = renderPanelComponent(browserB, { workspaceId: wsA, nodeId: 'node-B', zoomLevel: 1 })

    expect(elemA?.props.workspaceId).toBe(wsA)
    // The decisive assertion: panel B owned by wsB must NOT inherit the active
    // wsA id — it must resolve to its own workspace.
    expect(elemB?.props.workspaceId).toBe(wsB)

    // And the derived partitions must be DISTINCT (the actual isolation guarantee).
    const partitionA = browserPartitionForWorkspace(elemA!.props.workspaceId as string)
    const partitionB = browserPartitionForWorkspace(elemB!.props.workspaceId as string)
    expect(partitionA).toBe(`persist:browser-ws-${wsA}`)
    expect(partitionB).toBe(`persist:browser-ws-${wsB}`)
    expect(partitionA).not.toBe(partitionB)
  })

  it('T-U-024 falls back to ctx.workspaceId when no workspace owns the panel', async () => {
    const { renderPanelComponent } = await import('./registry')
    mockWorkspaces = [] // panel not present in any workspace (transient/detached)

    const elem = renderPanelComponent(
      { id: 'orphan-browser', type: 'browser', url: 'about:blank' },
      { workspaceId: 'fallback-ws', nodeId: '', zoomLevel: 1 },
    )

    expect(elem?.props.workspaceId).toBe('fallback-ws')
  })

  it('T-U-025 prefers the owning workspace id over the active id even when they differ', async () => {
    const { renderPanelComponent } = await import('./registry')
    const owningWs = 'owning-workspace'
    const activeWs = 'a-different-active-workspace'
    const panel = { id: 'panel-x', type: 'browser' as const, url: 'about:blank' }
    mockWorkspaces = [{ id: owningWs, panels: { [panel.id]: panel } }]

    const elem = renderPanelComponent(panel, { workspaceId: activeWs, nodeId: '', zoomLevel: 1 })

    expect(elem?.props.workspaceId).toBe(owningWs)
    expect(elem?.props.workspaceId).not.toBe(activeWs)
  })
})
