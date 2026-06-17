import { describe, expect, it, vi } from 'vitest'
import { Graph, ListBullets, MagnifyingGlass, Vault } from '@phosphor-icons/react'

const createFlashQueryVault = vi.fn()
const createFlashQueryVaultSearch = vi.fn()
const createOutline = vi.fn()
const createSemanticConnections = vi.fn()

vi.mock('../stores/appStore', () => ({
  useAppStore: {
    getState: () => ({ createFlashQueryVault, createFlashQueryVaultSearch, createOutline, createSemanticConnections }),
  },
}))

vi.mock('../stores/previewSelectionStore', () => {
  let state = { activeChunkId: null as string | null }
  const usePreviewSelectionStore = Object.assign(
    <T,>(selector: (state: { activeChunkId: string | null }) => T) => selector(state),
    {
      getState: () => ({
        activeChunkId: state.activeChunkId,
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
    const element = module.default({ panelId: 'semantic-1', workspaceId: 'workspace-1' })
    const visibleText = collectText(element)

    expect(visibleText.filter((text) => text === 'Connections')).toHaveLength(0)
    expect(visibleText.join(' ')).toContain('Whole document')
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

    const element = module.default({ panelId: 'semantic-1', workspaceId: 'workspace-1' })
    const text = collectText(element).join(' ')

    expect(text).toContain('One section selected')
    expect(text).not.toContain('my-heading-slug')
  })
})
