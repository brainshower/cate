import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPreviewSelectionForTests,
  usePreviewSelectionStore,
} from './previewSelectionStore'

describe('previewSelectionStore', () => {
  afterEach(() => {
    clearPreviewSelectionForTests()
  })

  it('T-U-009 resolves activeChunkId as hoveredChunkId before pinnedChunkId', () => {
    const store = usePreviewSelectionStore.getState()

    store.setPinnedChunkId('pinned-section')
    expect(usePreviewSelectionStore.getState()).toMatchObject({
      hoveredChunkId: null,
      pinnedChunkId: 'pinned-section',
      activeChunkId: 'pinned-section',
    })

    usePreviewSelectionStore.getState().setHoveredChunkId('hovered-section')
    expect(usePreviewSelectionStore.getState()).toMatchObject({
      hoveredChunkId: 'hovered-section',
      pinnedChunkId: 'pinned-section',
      activeChunkId: 'hovered-section',
    })

    usePreviewSelectionStore.getState().setHoveredChunkId(null)
    expect(usePreviewSelectionStore.getState().activeChunkId).toBe('pinned-section')
  })

  it('T-U-010 clears hover, pin, and active state', () => {
    const store = usePreviewSelectionStore.getState()

    store.setHoveredChunkId('hovered-section')
    store.setPinnedChunkId('pinned-section')
    expect(usePreviewSelectionStore.getState().activeChunkId).toBe('hovered-section')

    usePreviewSelectionStore.getState().clearSelection()

    expect(usePreviewSelectionStore.getState()).toMatchObject({
      hoveredChunkId: null,
      pinnedChunkId: null,
      activeChunkId: null,
    })
  })

  it('selectSection pins a chunk and clears transient hover state', () => {
    const store = usePreviewSelectionStore.getState()

    store.setHoveredChunkId('hovered-section')
    store.selectSection('pinned-section')

    expect(usePreviewSelectionStore.getState()).toMatchObject({
      hoveredChunkId: null,
      pinnedChunkId: 'pinned-section',
      activeChunkId: 'pinned-section',
    })
  })
})
