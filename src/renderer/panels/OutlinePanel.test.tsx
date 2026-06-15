import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearActiveEditorRegistryForTests,
  registerActiveEditor,
  unregisterActiveEditor,
  updateActiveEditorModel,
  updateActiveEditorPreview,
  type ActiveEditorLike,
  type ActiveEditorModelLike,
  type DisposableLike,
} from '../lib/activeEditorRegistry'
import OutlinePanel from './OutlinePanel'

type Listener<T = void> = (event: T) => void

class MockModel implements ActiveEditorModelLike {
  private lines: string[]
  private languageListeners = new Set<Listener>()
  private disposed = false

  constructor(text: string) {
    this.lines = text.split('\n')
  }

  getLineCount = () => this.lines.length
  getLineContent = (lineNumber: number) => this.lines[lineNumber - 1] ?? ''
  isDisposed = () => this.disposed
  dispose = () => { this.disposed = true }
  setText(text: string) { this.lines = text.split('\n') }
  emitLanguageChange() { for (const listener of this.languageListeners) listener() }
  onDidChangeLanguage = (listener: Listener): DisposableLike => {
    this.languageListeners.add(listener)
    return { dispose: () => this.languageListeners.delete(listener) }
  }
}

class MockEditor implements ActiveEditorLike {
  private cursorListeners = new Set<Listener<{ position: { lineNumber: number } }>>()
  private contentListeners = new Set<Listener>()
  private disposed = false
  private cursorLine = 1
  model: MockModel | null
  revealLineInCenter = vi.fn()
  setPosition = vi.fn()
  focus = vi.fn()

  constructor(model: MockModel | null) {
    this.model = model
  }

  getModel = () => this.model
  getPosition = () => ({ lineNumber: this.cursorLine })
  setModel(model: MockModel | null) { this.model = model }
  isDisposed = () => this.disposed
  dispose = () => { this.disposed = true }
  onDidChangeCursorPosition = (listener: Listener<{ position: { lineNumber: number } }>): DisposableLike => {
    this.cursorListeners.add(listener)
    return { dispose: () => this.cursorListeners.delete(listener) }
  }
  onDidChangeModelContent = (listener: Listener): DisposableLike => {
    this.contentListeners.add(listener)
    return { dispose: () => this.contentListeners.delete(listener) }
  }
  emitCursor(lineNumber: number) {
    this.cursorLine = lineNumber
    for (const listener of this.cursorListeners) listener({ position: { lineNumber } })
  }
  emitContentChange() {
    for (const listener of this.contentListeners) listener()
  }
  listenerCounts() {
    return {
      cursor: this.cursorListeners.size,
      content: this.contentListeners.size,
    }
  }
}

function renderOutline(panelId = 'outline-1', sourceEditorPanelId?: string) {
  return render(<OutlinePanel panelId={panelId} workspaceId="workspace-1" sourceEditorPanelId={sourceEditorPanelId} />)
}

function bindEditor(panelId: string, text: string) {
  const model = new MockModel(text)
  const editor = new MockEditor(model)
  act(() => registerActiveEditor('workspace-1', panelId, editor))
  return { editor, model }
}

function setPreviewRouting(panelId: string, markdownPreview: boolean, scrollPreviewToHeading = vi.fn()) {
  act(() => {
    updateActiveEditorPreview('workspace-1', panelId, {
      markdownPreview,
      scrollPreviewToHeading,
    })
  })
  return scrollPreviewToHeading
}

describe('OutlinePanel source mode', () => {
  beforeEach(() => {
    clearActiveEditorRegistryForTests()
    vi.useRealTimers()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    clearActiveEditorRegistryForTests()
  })

  it('binds an Outline panel to its source editor instead of the active editor', () => {
    const first = bindEditor('editor-1', '# First File\n## First Target')
    const second = bindEditor('editor-2', '# Second File\n## Second Target')

    renderOutline('outline-editor-1', 'editor-1')

    expect(screen.getByText('First File')).toBeTruthy()
    expect(screen.queryByText('Second File')).toBeNull()

    fireEvent.click(screen.getByText('First Target'))

    expect(first.editor.revealLineInCenter).toHaveBeenCalledWith(2)
    expect(second.editor.revealLineInCenter).not.toHaveBeenCalled()
    expect(second.editor.setPosition).not.toHaveBeenCalled()
  })

  it('T-I-001 renders depth options with H1-H3 selected by default', () => {
    bindEditor('editor-1', '# One\n## Two\n### Three\n#### Four')
    renderOutline()

    const depth = screen.getByLabelText('Outline depth') as HTMLSelectElement
    expect([...depth.options].map((option) => option.textContent)).toEqual(['H1-H2', 'H1-H3', 'H1-H4', 'H1-H5', 'H1-H6'])
    expect(depth.value).toBe('3')
  })

  it('keeps depth and search controls themed and contained in the Outline panel', () => {
    bindEditor('editor-1', '# One\n## Two')
    renderOutline()

    const depth = screen.getByLabelText('Outline depth')
    const search = screen.getByLabelText('Search outline')

    expect(depth.className).toContain('box-border')
    expect(depth.className).toContain('max-w-full')
    expect(depth.className).toContain('min-w-0')
    expect(depth.className).toContain('border-subtle')
    expect(depth.className).toContain('bg-surface-2')
    expect(depth.className).toContain('text-primary')
    expect(depth.className).not.toContain('bg-background')
    expect(search.className).toContain('box-border')
    expect(search.className).toContain('max-w-full')
    expect(search.className).toContain('min-w-0')
    expect(search.className).toContain('border-subtle')
    expect(search.className).toContain('bg-surface-2')
    expect(search.className).toContain('text-primary')
    expect(search.className).toContain('placeholder:text-muted')
    expect(search.className).not.toContain('bg-background')
  })

  it('T-I-002 renders row indentation and level-based text styling', () => {
    bindEditor('editor-1', '# One\n## Two\n#### Four')
    renderOutline()
    fireEvent.change(screen.getByLabelText('Outline depth'), { target: { value: '4' } })

    const rows = screen.getAllByTestId('outline-heading-row')
    expect(rows[0].style.paddingLeft).toBe('14px')
    expect(rows[0].className).toContain('font-semibold')
    expect(rows[1].style.paddingLeft).toBe('28px')
    expect(rows[2].style.paddingLeft).toBe('56px')
    expect(rows[2].className).toContain('text-xs')
    expect(rows[0].className).toContain('border-l-2')
  })

  it('T-I-003 and T-I-010 shows an empty state when no active editor or headings exist', () => {
    renderOutline()

    expect(screen.getByText('No active editor headings.')).toBeTruthy()
  })

  it('T-I-004 changes visible headings without remounting the panel', () => {
    bindEditor('editor-1', '# One\n## Two\n### Three\n#### Four')
    renderOutline()

    expect(screen.queryByText('Four')).toBeNull()
    fireEvent.change(screen.getByLabelText('Outline depth'), { target: { value: '4' } })

    expect(screen.getByText('Four')).toBeTruthy()
  })

  it('T-I-005 isolates depth and search state between panel instances', () => {
    bindEditor('editor-1', '# Alpha\n## Beta\n#### Delta')
    renderOutline('outline-a')
    renderOutline('outline-b')

    const [firstDepth, secondDepth] = screen.getAllByLabelText('Outline depth')
    fireEvent.change(firstDepth, { target: { value: '4' } })
    fireEvent.change(screen.getAllByLabelText('Search outline')[0], { target: { value: 'delta' } })

    expect((firstDepth as HTMLSelectElement).value).toBe('4')
    expect((secondDepth as HTMLSelectElement).value).toBe('3')
    expect((screen.getAllByLabelText('Search outline')[1] as HTMLInputElement).value).toBe('')
  })

  it('T-I-006 and T-I-007 rebinds to the focused active editor', () => {
    bindEditor('editor-1', '# First')
    renderOutline()
    expect(screen.getByText('First')).toBeTruthy()

    act(() => registerActiveEditor('workspace-1', 'editor-2', new MockEditor(new MockModel('# Second'))))

    expect(screen.getByText('Second')).toBeTruthy()
    expect(screen.queryByText('First')).toBeNull()
  })

  it('T-I-008 highlights the current cursor heading on initial bind', () => {
    const { editor } = bindEditor('editor-1', '# One\nbody\n## Two\nbody')
    editor.emitCursor(4)

    renderOutline()

    expect(screen.getByText('Two').closest('button')!.className).toContain('bg-blue-500/15')
    expect(screen.getByText('One').closest('button')!.className).not.toContain('bg-blue-500/15')
  })

  it('T-I-008 highlights the nearest heading at or before cursor line', () => {
    const { editor } = bindEditor('editor-1', '# One\nbody\n## Two\nbody')
    renderOutline()

    act(() => editor.emitCursor(4))

    const two = screen.getByText('Two').closest('button')!
    expect(two.className).toContain('bg-blue-500/15')
  })

  it('T-I-009 uses the newly active editor cursor line when rebinding', () => {
    const first = bindEditor('editor-1', '# First\nbody\n## First Child')
    first.editor.emitCursor(3)
    renderOutline()
    expect(screen.getByText('First Child').closest('button')!.className).toContain('bg-blue-500/15')

    const secondModel = new MockModel('# Second\nbody\n## Second Child\nbody')
    const secondEditor = new MockEditor(secondModel)
    secondEditor.emitCursor(1)

    act(() => registerActiveEditor('workspace-1', 'editor-2', secondEditor))

    expect(screen.getByText('Second').closest('button')!.className).toContain('bg-blue-500/15')
    expect(screen.getByText('Second Child').closest('button')!.className).not.toContain('bg-blue-500/15')
  })

  it('T-I-009 and T-I-033 recalculates after model changes and depth changes', () => {
    const { editor } = bindEditor('editor-1', '# One')
    renderOutline()

    const nextModel = new MockModel('# Next\n## Child')
    act(() => {
      editor.setModel(nextModel)
      updateActiveEditorModel('workspace-1', 'editor-1')
    })

    expect(screen.getByText('Next')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Outline depth'), { target: { value: '2' } })
    expect(screen.getByText('Child')).toBeTruthy()
  })

  it('T-I-011 clicks a source heading and calls Monaco navigation APIs', () => {
    const { editor } = bindEditor('editor-1', '# One\n## Two')
    renderOutline()

    fireEvent.click(screen.getByText('Two'))

    expect(editor.revealLineInCenter).toHaveBeenCalledWith(2)
    expect(editor.setPosition).toHaveBeenCalledWith({ lineNumber: 2, column: 1 })
    expect(editor.focus).toHaveBeenCalled()
  })

  it('T-I-026 and T-I-030 clicks a heading in preview mode without Monaco navigation or selection dispatch', () => {
    const { editor } = bindEditor('editor-1', '# One\n## Two')
    renderOutline()
    const scrollPreviewToHeading = setPreviewRouting('editor-1', true)
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

    fireEvent.click(screen.getByText('Two'))

    expect(scrollPreviewToHeading).toHaveBeenCalledWith('Two', 0)
    const rows = screen.getAllByTestId('outline-heading-row')
    expect(rows[0].className).not.toContain('bg-blue-500/15')
    expect(rows[1].className).toContain('bg-blue-500/15')
    expect(editor.revealLineInCenter).not.toHaveBeenCalled()
    expect(editor.setPosition).not.toHaveBeenCalled()
    expect(editor.focus).not.toHaveBeenCalled()
    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: `preview-section${'-select'}` }))
  })

  it('T-I-026 routes duplicate preview heading clicks with occurrence indexes', () => {
    const { editor } = bindEditor('editor-1', '# Overview\nbody\n## Overview\nbody')
    renderOutline()
    const scrollPreviewToHeading = setPreviewRouting('editor-1', true)

    fireEvent.click(screen.getAllByText('Overview')[1])

    expect(scrollPreviewToHeading).toHaveBeenCalledWith('Overview', 1)
    expect(editor.revealLineInCenter).not.toHaveBeenCalled()
  })

  it('T-I-026 routes duplicate preview heading clicks with indexes from hidden deeper headings', () => {
    bindEditor('editor-1', '# Setup\n## Notes\n### Notes\n## Notes')
    renderOutline()
    fireEvent.change(screen.getByLabelText('Outline depth'), { target: { value: '2' } })
    const scrollPreviewToHeading = setPreviewRouting('editor-1', true)

    fireEvent.click(screen.getAllByText('Notes')[1])

    expect(scrollPreviewToHeading).toHaveBeenCalledWith('Notes', 2)
  })

  it('T-I-031 debounces content-change reparsing by 300ms', () => {
    vi.useFakeTimers()
    const { editor, model } = bindEditor('editor-1', '# One')
    renderOutline()

    act(() => {
      model.setText('# Updated')
      editor.emitContentChange()
    })

    expect(screen.queryByText('Updated')).toBeNull()
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByText('Updated')).toBeTruthy()
  })

  it('T-I-032 reparses when the model language changes', () => {
    const { model } = bindEditor('editor-1', '# One')
    renderOutline()

    act(() => {
      model.setText('# Language Updated')
      model.emitLanguageChange()
    })

    expect(screen.getByText('Language Updated')).toBeTruthy()
  })

  it('T-I-034 disposes subscriptions and clears timers on unmount', () => {
    vi.useFakeTimers()
    const { editor, model } = bindEditor('editor-1', '# One')
    const view = renderOutline()

    act(() => {
      model.setText('# Updated')
      editor.emitContentChange()
    })
    view.unmount()
    act(() => vi.runOnlyPendingTimers())

    expect(editor.listenerCounts()).toEqual({ cursor: 0, content: 0 })
  })

  it('T-I-035 does not navigate through disposed editor/model refs', () => {
    const { editor, model } = bindEditor('editor-1', '# One')
    renderOutline()
    model.dispose()

    fireEvent.click(screen.getByText('One'))

    expect(editor.revealLineInCenter).not.toHaveBeenCalled()
  })

  it('T-I-012 ignores whitespace-only search and matches case-insensitively', () => {
    bindEditor('editor-1', '# Alpha\n## Beta')
    renderOutline()
    const search = screen.getByLabelText('Search outline')

    fireEvent.change(search, { target: { value: '   ' } })
    expect(screen.getByText('Alpha').closest('button')!.className).not.toContain('bg-yellow')

    fireEvent.change(search, { target: { value: 'beta' } })
    expect(screen.getByText('Beta').closest('button')!.className).toContain('bg-yellow-400/20')
  })

  it('T-I-013 keeps non-matching headings visible and highlights matching substrings', () => {
    bindEditor('editor-1', '# Alpha\n## Beta')
    renderOutline()

    fireEvent.change(screen.getByLabelText('Search outline'), { target: { value: 'alp' } })

    const rows = screen.getAllByTestId('outline-heading-row')
    expect(screen.getByText('Beta')).toBeTruthy()
    expect(rows[0].className).toContain('bg-yellow-400/20')
    expect(rows[1].className).not.toContain('bg-blue-500')
    expect(rows[1].className).not.toContain('text-white')
    expect(within(rows[0]).getByText(/Alp/i).tagName).toBe('MARK')
  })

  it('T-I-014 clear button clears search, resets focus, and is hidden when empty', () => {
    bindEditor('editor-1', '# Alpha')
    renderOutline()
    const search = screen.getByLabelText('Search outline') as HTMLInputElement

    expect(screen.queryByLabelText('Clear outline search')).toBeNull()
    fireEvent.change(search, { target: { value: 'alp' } })
    fireEvent.click(screen.getByLabelText('Clear outline search'))

    expect(search.value).toBe('')
    expect(document.activeElement).toBe(search)
    expect(screen.queryByLabelText('Clear outline search')).toBeNull()
  })

  it('T-I-015 cycles search matches, wraps, applies focus styling, and navigates source lines', () => {
    const { editor } = bindEditor('editor-1', '# Alpha\n## Beta Alpha')
    renderOutline()
    const search = screen.getByLabelText('Search outline')

    fireEvent.change(search, { target: { value: 'alpha' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(editor.revealLineInCenter).toHaveBeenLastCalledWith(1)
    let rows = screen.getAllByTestId('outline-heading-row')
    expect(rows[0].className).toContain('bg-blue-500')
    expect(rows[1].className).not.toContain('bg-blue-500')

    fireEvent.keyDown(search, { key: 'Enter' })
    expect(editor.revealLineInCenter).toHaveBeenLastCalledWith(2)
    rows = screen.getAllByTestId('outline-heading-row')
    expect(rows[0].className).not.toContain('bg-blue-500')
    expect(rows[1].className).toContain('bg-blue-500')
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(editor.revealLineInCenter).toHaveBeenLastCalledWith(1)
  })

  it('T-I-027 Enter-to-cycle uses preview routing for each match, wraps, and preserves state across preview toggles', () => {
    const { editor } = bindEditor('editor-1', '# Alpha\n## Beta Alpha\n#### Alpha Deep')
    renderOutline()
    fireEvent.change(screen.getByLabelText('Outline depth'), { target: { value: '4' } })
    const scrollPreviewToHeading = setPreviewRouting('editor-1', true)
    const search = screen.getByLabelText('Search outline') as HTMLInputElement

    fireEvent.change(search, { target: { value: 'alpha' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    fireEvent.keyDown(search, { key: 'Enter' })
    fireEvent.keyDown(search, { key: 'Enter' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(scrollPreviewToHeading.mock.calls.map((call) => call[0])).toEqual([
      'Alpha',
      'Beta Alpha',
      'Alpha Deep',
      'Alpha',
    ])
    expect(scrollPreviewToHeading.mock.calls.map((call) => call[1])).toEqual([0, 0, 0, 0])
    expect(editor.revealLineInCenter).not.toHaveBeenCalled()
    expect(screen.getAllByTestId('outline-heading-row').some((row) => row.textContent === 'Alpha Deep')).toBe(true)
    expect(search.value).toBe('alpha')
    expect((screen.getByLabelText('Outline depth') as HTMLSelectElement).value).toBe('4')

    setPreviewRouting('editor-1', false, scrollPreviewToHeading)

    expect(search.value).toBe('alpha')
    expect((screen.getByLabelText('Outline depth') as HTMLSelectElement).value).toBe('4')
    expect(screen.getAllByTestId('outline-heading-row').some((row) => row.textContent === 'Alpha Deep')).toBe(true)
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(editor.revealLineInCenter).toHaveBeenLastCalledWith(2)
  })

  it('T-I-027 Enter-to-cycle routes duplicate preview matches with occurrence indexes', () => {
    bindEditor('editor-1', '# Overview\n## Overview')
    renderOutline()
    const scrollPreviewToHeading = setPreviewRouting('editor-1', true)
    const search = screen.getByLabelText('Search outline')

    fireEvent.change(search, { target: { value: 'overview' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(scrollPreviewToHeading.mock.calls).toEqual([
      ['Overview', 0],
      ['Overview', 1],
    ])
  })

  it('T-I-016 resets search cycle index when the query changes', () => {
    const { editor } = bindEditor('editor-1', '# Alpha\n## Beta Alpha\n## Beta')
    renderOutline()
    const search = screen.getByLabelText('Search outline')

    fireEvent.change(search, { target: { value: 'alpha' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    fireEvent.keyDown(search, { key: 'Enter' })
    fireEvent.change(search, { target: { value: 'beta' } })
    fireEvent.keyDown(search, { key: 'Enter' })

    expect(editor.revealLineInCenter).toHaveBeenLastCalledWith(2)
  })

  it('does not throw when the active editor unregisters while mounted', () => {
    bindEditor('editor-1', '# One')
    renderOutline()

    act(() => unregisterActiveEditor('workspace-1', 'editor-1'))

    expect(screen.getByText('No active editor headings.')).toBeTruthy()
  })
})
