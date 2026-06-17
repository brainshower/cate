import { create } from 'zustand'

export interface PreviewSelectionState {
  hoveredChunkId: string | null
  pinnedChunkId: string | null
  activeChunkId: string | null
  cautionChunkIds: string[]
  connectedChunkIds: string[]
  scopes: Record<string, PreviewSelectionScope>
  getScope: (scopeId?: string | null) => PreviewSelectionScope
  setHoveredChunkId: (chunkId: string | null, scopeId?: string | null) => void
  setPinnedChunkId: (chunkId: string | null, scopeId?: string | null) => void
  setCautionChunkIds: (chunkIds: string[], scopeId?: string | null) => void
  setConnectedChunkIds: (chunkIds: string[], scopeId?: string | null) => void
  selectSection: (chunkId: string, scopeId?: string | null) => void
  clearSelection: (scopeId?: string | null) => void
}

export interface PreviewSelectionScope {
  hoveredChunkId: string | null
  pinnedChunkId: string | null
  activeChunkId: string | null
  cautionChunkIds: string[]
  connectedChunkIds: string[]
}

const DEFAULT_SCOPE_ID = '__global__'
const EMPTY_SCOPE: PreviewSelectionScope = {
  hoveredChunkId: null,
  pinnedChunkId: null,
  activeChunkId: null,
  cautionChunkIds: [],
  connectedChunkIds: [],
}

function activeChunkId(hoveredChunkId: string | null, pinnedChunkId: string | null): string | null {
  return hoveredChunkId || pinnedChunkId
}

function emptyScope(): PreviewSelectionScope {
  return EMPTY_SCOPE
}

function scopeKey(scopeId?: string | null): string {
  return scopeId || DEFAULT_SCOPE_ID
}

export const usePreviewSelectionStore = create<PreviewSelectionState>((set, get) => ({
  hoveredChunkId: null,
  pinnedChunkId: null,
  activeChunkId: null,
  cautionChunkIds: [],
  connectedChunkIds: [],
  scopes: {},
  getScope: (scopeId): PreviewSelectionScope => {
    const state = get()
    if (!scopeId) {
      return {
        hoveredChunkId: state.hoveredChunkId,
        pinnedChunkId: state.pinnedChunkId,
        activeChunkId: state.activeChunkId,
        cautionChunkIds: state.cautionChunkIds,
        connectedChunkIds: state.connectedChunkIds,
      }
    }
    return state.scopes[scopeKey(scopeId)] ?? EMPTY_SCOPE
  },
  setHoveredChunkId: (hoveredChunkId, scopeId) => set((state) => {
    const key = scopeKey(scopeId)
    const current = key === DEFAULT_SCOPE_ID
      ? {
          hoveredChunkId: state.hoveredChunkId,
          pinnedChunkId: state.pinnedChunkId,
          activeChunkId: state.activeChunkId,
          cautionChunkIds: state.cautionChunkIds,
          connectedChunkIds: state.connectedChunkIds,
        }
      : state.scopes[key] ?? emptyScope()
    const next = {
      ...current,
      hoveredChunkId,
      activeChunkId: activeChunkId(hoveredChunkId, current.pinnedChunkId),
    }
    if (key === DEFAULT_SCOPE_ID) return next
    return { scopes: { ...state.scopes, [key]: next } }
  }),
  setPinnedChunkId: (pinnedChunkId, scopeId) => set((state) => {
    const key = scopeKey(scopeId)
    const current = key === DEFAULT_SCOPE_ID
      ? {
          hoveredChunkId: state.hoveredChunkId,
          pinnedChunkId: state.pinnedChunkId,
          activeChunkId: state.activeChunkId,
          cautionChunkIds: state.cautionChunkIds,
          connectedChunkIds: state.connectedChunkIds,
        }
      : state.scopes[key] ?? emptyScope()
    const next = {
      ...current,
      pinnedChunkId,
      activeChunkId: activeChunkId(current.hoveredChunkId, pinnedChunkId),
    }
    if (key === DEFAULT_SCOPE_ID) return next
    return { scopes: { ...state.scopes, [key]: next } }
  }),
  setCautionChunkIds: (cautionChunkIds, scopeId) => set((state) => {
    const key = scopeKey(scopeId)
    if (key === DEFAULT_SCOPE_ID) return { cautionChunkIds }
    const next = {
      ...(state.scopes[key] ?? emptyScope()),
      cautionChunkIds,
    }
    return { scopes: { ...state.scopes, [key]: next } }
  }),
  setConnectedChunkIds: (connectedChunkIds, scopeId) => set((state) => {
    const key = scopeKey(scopeId)
    if (key === DEFAULT_SCOPE_ID) return { connectedChunkIds }
    const next = {
      ...(state.scopes[key] ?? emptyScope()),
      connectedChunkIds,
    }
    return { scopes: { ...state.scopes, [key]: next } }
  }),
  selectSection: (chunkId, scopeId) => set((state) => {
    const key = scopeKey(scopeId)
    const next = {
      ...(key === DEFAULT_SCOPE_ID
        ? { cautionChunkIds: state.cautionChunkIds, connectedChunkIds: state.connectedChunkIds }
        : state.scopes[key] ?? emptyScope()),
      hoveredChunkId: null,
      pinnedChunkId: chunkId,
      activeChunkId: chunkId,
    }
    if (key === DEFAULT_SCOPE_ID) return next
    return { scopes: { ...state.scopes, [key]: next } }
  }),
  clearSelection: (scopeId) => set((state) => {
    const key = scopeKey(scopeId)
    const cleared = {
      hoveredChunkId: null,
      pinnedChunkId: null,
      activeChunkId: null,
    }
    if (key === DEFAULT_SCOPE_ID) return cleared
    return {
      ...cleared,
      scopes: {
        ...state.scopes,
        [key]: {
          ...(state.scopes[key] ?? emptyScope()),
          ...cleared,
        },
      },
    }
  }),
}))

export function clearPreviewSelectionForTests(): void {
  usePreviewSelectionStore.setState({
    hoveredChunkId: null,
    pinnedChunkId: null,
    activeChunkId: null,
    cautionChunkIds: [],
    connectedChunkIds: [],
    scopes: {},
  })
}
