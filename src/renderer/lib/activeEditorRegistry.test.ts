import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearActiveEditorRegistryForTests,
  getActiveEditorSnapshot,
  getEditorSnapshotForPanel,
  registerActiveEditor,
  subscribeActiveEditor,
  unregisterActiveEditor,
  updateActiveEditorModel,
  updateActiveEditorPreview,
  type ActiveEditorLike,
  type ActiveEditorModelLike,
} from './activeEditorRegistry'

function model(lineCount = 1): ActiveEditorModelLike {
  return {
    getLineCount: () => lineCount,
    getLineContent: (lineNumber) => `line ${lineNumber}`,
  }
}

function editor(activeModel: ActiveEditorModelLike | null): ActiveEditorLike & { setModel: (next: ActiveEditorModelLike | null) => void; dispose: () => void } {
  let currentModel = activeModel
  let disposed = false
  return {
    getModel: () => currentModel,
    setModel: (next) => { currentModel = next },
    isDisposed: () => disposed,
    dispose: () => { disposed = true },
    onDidChangeCursorPosition: () => ({ dispose: vi.fn() }),
    onDidChangeModelContent: () => ({ dispose: vi.fn() }),
    revealLineInCenter: vi.fn(),
    setPosition: vi.fn(),
    focus: vi.fn(),
  }
}

describe('activeEditorRegistry', () => {
  beforeEach(() => {
    clearActiveEditorRegistryForTests()
  })

  it('T-I-006 stores active editor entries by workspace and panel id', () => {
    const first = editor(model())
    registerActiveEditor('workspace-1', 'panel-1', first)

    expect(getActiveEditorSnapshot('workspace-1')).toMatchObject({
      panelId: 'panel-1',
      editor: first,
    })
  })

  it('T-I-007 focusing a different editor updates the active snapshot', () => {
    const first = editor(model())
    const second = editor(model())

    registerActiveEditor('workspace-1', 'panel-1', first)
    registerActiveEditor('workspace-1', 'panel-2', second)

    expect(getActiveEditorSnapshot('workspace-1')).toMatchObject({
      panelId: 'panel-2',
      editor: second,
    })
  })

  it('returns a snapshot for a specific editor panel without using active focus', () => {
    const first = editor(model())
    const second = editor(model())

    registerActiveEditor('workspace-1', 'panel-1', first)
    registerActiveEditor('workspace-1', 'panel-2', second)

    expect(getActiveEditorSnapshot('workspace-1')).toMatchObject({
      panelId: 'panel-2',
      editor: second,
    })
    expect(getEditorSnapshotForPanel('workspace-1', 'panel-1')).toMatchObject({
      panelId: 'panel-1',
      editor: first,
    })
  })

  it('T-I-010 and T-I-035 clears disposed or unregistered active editor refs safely', () => {
    const active = editor(model())
    registerActiveEditor('workspace-1', 'panel-1', active)

    active.dispose()

    expect(getActiveEditorSnapshot('workspace-1')).toEqual({
      panelId: null,
      editor: null,
      model: null,
      markdownPreview: false,
    })

    unregisterActiveEditor('workspace-1', 'panel-1')
    expect(getActiveEditorSnapshot('workspace-1').editor).toBeNull()
  })

  it('T-I-033 notifies subscribers when an active editor model changes', () => {
    const active = editor(model(1))
    const listener = vi.fn()
    registerActiveEditor('workspace-1', 'panel-1', active)
    subscribeActiveEditor('workspace-1', listener)

    active.setModel(model(2))
    updateActiveEditorModel('workspace-1', 'panel-1')

    expect(listener).toHaveBeenCalledTimes(1)
    expect(getActiveEditorSnapshot('workspace-1').model?.getLineCount()).toBe(2)
  })

  it('stores preview mode and scroll callback with duplicate occurrence support on the active editor snapshot', () => {
    const active = editor(model())
    const scrollPreviewToHeading = vi.fn((_headingText: string, _occurrenceIndex?: number) => {})
    registerActiveEditor('workspace-1', 'panel-1', active)

    updateActiveEditorPreview('workspace-1', 'panel-1', {
      markdownPreview: true,
      scrollPreviewToHeading,
    })

    expect(getActiveEditorSnapshot('workspace-1')).toMatchObject({
      panelId: 'panel-1',
      markdownPreview: true,
      scrollPreviewToHeading,
    })

    getActiveEditorSnapshot('workspace-1').scrollPreviewToHeading?.('Intro', 1)

    expect(scrollPreviewToHeading).toHaveBeenCalledWith('Intro', 1)
  })

  it('preserves preview/highlight callbacks when the same editor re-registers on focus', () => {
    const active = editor(model())
    const scrollPreviewToHeading = vi.fn((_headingText: string, _occurrenceIndex?: number) => {})
    const highlightSourceLine = vi.fn((_lineNumber: number) => {})
    registerActiveEditor('workspace-1', 'panel-1', active)

    updateActiveEditorPreview('workspace-1', 'panel-1', {
      markdownPreview: false,
      scrollPreviewToHeading,
      highlightSourceLine,
    })
    registerActiveEditor('workspace-1', 'panel-1', active)

    expect(getActiveEditorSnapshot('workspace-1')).toMatchObject({
      panelId: 'panel-1',
      markdownPreview: false,
      scrollPreviewToHeading,
      highlightSourceLine,
    })
  })

  it('T-I-034 unsubscribes registry listeners', () => {
    const active = editor(model())
    const listener = vi.fn()
    const unsubscribe = subscribeActiveEditor('workspace-1', listener)

    unsubscribe()
    registerActiveEditor('workspace-1', 'panel-1', active)

    expect(listener).not.toHaveBeenCalled()
  })
})
