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

  it('keeps section selection isolated by editor scope', () => {
    const store = usePreviewSelectionStore.getState()

    store.selectSection('same-heading', 'editor-one')
    store.selectSection('other-heading', 'editor-two')
    store.setHoveredChunkId('hovered-heading', 'editor-one')

    expect(usePreviewSelectionStore.getState().getScope('editor-one')).toMatchObject({
      hoveredChunkId: 'hovered-heading',
      pinnedChunkId: 'same-heading',
      activeChunkId: 'hovered-heading',
    })
    expect(usePreviewSelectionStore.getState().getScope('editor-two')).toMatchObject({
      hoveredChunkId: null,
      pinnedChunkId: 'other-heading',
      activeChunkId: 'other-heading',
    })
    expect(usePreviewSelectionStore.getState().activeChunkId).toBeNull()
  })
})
