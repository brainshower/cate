import { create } from 'zustand'

export interface PreviewSelectionState {
  hoveredChunkId: string | null
  pinnedChunkId: string | null
  activeChunkId: string | null
  setHoveredChunkId: (chunkId: string | null) => void
  setPinnedChunkId: (chunkId: string | null) => void
  selectSection: (chunkId: string) => void
  clearSelection: () => void
}

function activeChunkId(hoveredChunkId: string | null, pinnedChunkId: string | null): string | null {
  return hoveredChunkId || pinnedChunkId
}

export const usePreviewSelectionStore = create<PreviewSelectionState>((set) => ({
  hoveredChunkId: null,
  pinnedChunkId: null,
  activeChunkId: null,
  setHoveredChunkId: (hoveredChunkId) => set((state) => ({
    hoveredChunkId,
    activeChunkId: activeChunkId(hoveredChunkId, state.pinnedChunkId),
  })),
  setPinnedChunkId: (pinnedChunkId) => set((state) => ({
    pinnedChunkId,
    activeChunkId: activeChunkId(state.hoveredChunkId, pinnedChunkId),
  })),
  selectSection: (chunkId) => set({
    hoveredChunkId: null,
    pinnedChunkId: chunkId,
    activeChunkId: chunkId,
  }),
  clearSelection: () => set({
    hoveredChunkId: null,
    pinnedChunkId: null,
    activeChunkId: null,
  }),
}))

export function clearPreviewSelectionForTests(): void {
  usePreviewSelectionStore.setState({
    hoveredChunkId: null,
    pinnedChunkId: null,
    activeChunkId: null,
  })
}
