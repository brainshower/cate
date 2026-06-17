import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const openRoutingMock = vi.hoisted(() => ({
  openFileAsPanel: vi.fn(() => 'opened-panel'),
}))

vi.mock('../lib/fileRouting', () => ({
  openFileAsPanel: openRoutingMock.openFileAsPanel,
}))

import {
  clearActiveEditorRegistryForTests,
  getActiveEditorSnapshot,
  registerActiveEditor,
  updateActiveEditorModel,
  updateActiveEditorPreview,
  type ActiveEditorLike,
  type ActiveEditorModelLike,
} from '../lib/activeEditorRegistry'
import { clearPreviewSelectionForTests, usePreviewSelectionStore } from '../stores/previewSelectionStore'
import { clearSemanticConnectionsChromeForTests, useSemanticConnectionsChromeStore } from '../stores/semanticConnectionsChromeStore'
import type { SemanticConnectionsProvider, SemanticConnectionsResult } from '../lib/semanticConnections'
import SemanticConnectionsPanel from './SemanticConnectionsPanel'

function model(text: string): ActiveEditorModelLike {
  const lines = text.split('\n')
  return {
    getLineCount: () => lines.length,
    getLineContent: (lineNumber) => lines[lineNumber - 1] ?? '',
  }
}

function mutableModel(text: string): ActiveEditorModelLike & { setText: (nextText: string) => void } {
  let currentText = text
  return {
    setText: (nextText) => {
      currentText = nextText
    },
    getLineCount: () => currentText.split('\n').length,
    getLineContent: (lineNumber) => currentText.split('\n')[lineNumber - 1] ?? '',
  }
}

function editor(activeModel: ActiveEditorModelLike | null): ActiveEditorLike {
  return {
    getModel: () => activeModel,
    onDidChangeCursorPosition: () => ({ dispose: vi.fn() }),
    onDidChangeModelContent: () => ({ dispose: vi.fn() }),
    revealLineInCenter: vi.fn(),
    setPosition: vi.fn(),
    focus: vi.fn(),
  }
}

function readyEditor(filePath = '/workspace/Plan.md') {
  act(() => {
    registerActiveEditor('workspace-1', 'editor-1', editor(model('# Plan\n\n## Scope\nBody')))
    updateActiveEditorPreview('workspace-1', 'editor-1', { markdownPreview: true, filePath })
  })
  return filePath
}

function provider(result: SemanticConnectionsResult): SemanticConnectionsProvider {
  return {
    loadDocumentConnections: vi.fn().mockResolvedValue(result),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })
  return { promise, resolve, reject }
}

const embeddingsOnlyResult: SemanticConnectionsResult = {
  mode: 'embeddings-only',
  overall: [
    {
      id: 'alpha',
      score: 0.87,
      target: {
        title: 'Alpha Notes',
        path: 'Docs/Alpha.md',
        heading: 'Launch checklist',
        chunkId: 'launch-checklist',
        snippet: 'The launch checklist keeps adapter rollout narrow.',
        body: 'The launch checklist keeps adapter rollout narrow. It also records the fallback state.',
      },
    },
    {
      id: 'beta',
      score: 0.64,
      target: {
        title: 'Beta Plan',
        path: 'Docs/Beta.md',
        heading: 'Risk review',
        chunkId: 'risk-review',
        snippet: 'Risk review covers cache invalidation and stale embeddings.',
      },
    },
  ],
  byChunkId: {
    scope: [],
  },
  chunkOrder: ['scope'],
  chunkMap: {},
  diagnostics: [],
}

const mixedResult: SemanticConnectionsResult = {
  ...embeddingsOnlyResult,
  mode: 'mixed',
  overall: [
    {
      ...embeddingsOnlyResult.overall[0],
      id: 'typed',
      rel: 'depends_on',
      dir: 'out',
    },
    {
      ...embeddingsOnlyResult.overall[1],
      id: 'untyped',
    },
  ],
}

function renderPanel(result: SemanticConnectionsResult, options: { activeChunkId?: string } = {}) {
  const filePath = readyEditor()
  if (options.activeChunkId) {
    const activeChunkId = options.activeChunkId
    act(() => usePreviewSelectionStore.getState().selectSection(activeChunkId, 'editor-1'))
  }
  return render(
    <SemanticConnectionsPanel
      panelId="sc-1"
      workspaceId="workspace-1"
      sourceEditorPanelId="editor-1"
      sourceFilePath={filePath}
      provider={provider(result)}
    />,
  )
}

describe('SemanticConnectionsPanel', () => {
  beforeEach(() => {
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()
    openRoutingMock.openFileAsPanel.mockClear()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()
    clearSemanticConnectionsChromeForTests()
  })

  it('T-I-009 renders embeddings-only cards and hides nature sort/filter controls', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(screen.getByText('Beta Plan')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show whole document semantic connections' }).textContent).toBe('Whole Document')
    expect((screen.getByRole('button', { name: 'Show selected section semantic connections' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByLabelText('Connection count: 2 connections').textContent).toBe('2')
    expect(screen.queryByText('Docs/Alpha.md')).toBeNull()
    await waitFor(() => expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.connectionCount).toBe(2))
    expect(screen.queryByText('Sort by nature')).toBeNull()
    expect(screen.queryByText('Nature filters')).toBeNull()
    expect(screen.queryByText('Depends on')).toBeNull()
  })

  it('publishes preview chunk markers only for sections with non-empty connection lists', async () => {
    renderPanel({
      ...embeddingsOnlyResult,
      byChunkId: {
        scope: [embeddingsOnlyResult.overall[0]],
        details: [],
      },
      chunkOrder: ['scope', 'details'],
    })

    await screen.findByText('Alpha Notes')
    await waitFor(() => {
      expect(usePreviewSelectionStore.getState().getScope('editor-1').connectedChunkIds).toEqual(['scope'])
    })
  })

  it('T-I-010 renders typed banners only for typed cards in sparse mixed data', async () => {
    renderPanel(mixedResult)

    const typed = await screen.findByTestId('semantic-connection-card-typed')
    const untyped = screen.getByTestId('semantic-connection-card-untyped')

    expect(within(typed).getByText('Depends on')).toBeTruthy()
    expect(within(untyped).queryByText('Depends on')).toBeNull()

    act(() => useSemanticConnectionsChromeStore.getState().panels['sc-1']?.toggleConfig())

    expect(screen.getByText('Sort by nature')).toBeTruthy()
    expect(screen.getByText('Nature filters')).toBeTruthy()
  })

  it('T-I-010 filters typed connections by selected nature and marks config active', async () => {
    renderPanel(mixedResult)

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(screen.getByText('Beta Plan')).toBeTruthy()

    act(() => useSemanticConnectionsChromeStore.getState().panels['sc-1']?.toggleConfig())
    fireEvent.click(screen.getByRole('button', { name: 'Depends on' }))

    expect(screen.getByText('Alpha Notes')).toBeTruthy()
    expect(screen.queryByText('Beta Plan')).toBeNull()
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(true)
  })

  it('T-I-011 renders Top-N Max and finite counts with the config indicator only when active', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByText('Showing all 2 connections')).toBeTruthy()
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(false)

    act(() => useSemanticConnectionsChromeStore.getState().panels['sc-1']?.toggleConfig())
    fireEvent.change(screen.getByLabelText('Top N connections'), { target: { value: '1' } })

    expect(screen.getByText('Showing 1 of 2 connections')).toBeTruthy()
    expect(screen.getByText('1 additional connection hidden by Top-N')).toBeTruthy()
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(true)

    fireEvent.change(screen.getByLabelText('Top N connections'), { target: { value: '2' } })

    expect(screen.getByText('Showing all 2 connections')).toBeTruthy()
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(false)
  })

  it('T-I-012 expands a card by hiding snippet and showing body without duplicated text', async () => {
    renderPanel(embeddingsOnlyResult)

    const card = await screen.findByTestId('semantic-connection-card-alpha')
    expect(within(card).getByText('The launch checklist keeps adapter rollout narrow.')).toBeTruthy()

    fireEvent.click(within(card).getByRole('button', { name: 'Expand Alpha Notes Launch checklist' }))

    expect(within(card).queryByText('The launch checklist keeps adapter rollout narrow.')).toBeNull()
    expect(within(card).getByText('It also records the fallback state.', { exact: false })).toBeTruthy()
    expect(within(card).getAllByText('The launch checklist keeps adapter rollout narrow.', { exact: false })).toHaveLength(1)
  })

  it('T-I-013 exposes cosine tooltip equivalents without visible score text', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByLabelText('Cosine similarity 87%')).toBeTruthy()
    expect(screen.queryByText('87% match')).toBeNull()
    expect(screen.getByLabelText('Cosine similarity 64%')).toBeTruthy()
    expect(screen.queryByText('64% match')).toBeNull()
  })

  it('T-I-014, T-I-015, and T-I-016 blocks unsupported, source-mode, and no-editor preconditions without provider calls', () => {
    const blockedProvider: SemanticConnectionsProvider = { loadDocumentConnections: vi.fn() }

    act(() => {
      registerActiveEditor('workspace-1', 'editor-json', editor(model('{ "name": "Cate" }')))
      updateActiveEditorPreview('workspace-1', 'editor-json', { markdownPreview: true })
    })
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-json"
        sourceFilePath="/workspace/data.json"
        provider={blockedProvider}
      />,
    )
    expect(screen.getByText('Connections are not available for this file type')).toBeTruthy()
    expect(blockedProvider.loadDocumentConnections).not.toHaveBeenCalled()
    cleanup()
    clearActiveEditorRegistryForTests()

    act(() => {
      registerActiveEditor('workspace-1', 'editor-1', editor(model('# Plan')))
      updateActiveEditorPreview('workspace-1', 'editor-1', { markdownPreview: false })
    })
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        provider={blockedProvider}
      />,
    )
    expect(screen.getByText('Switch to Preview')).toBeTruthy()
    expect(blockedProvider.loadDocumentConnections).not.toHaveBeenCalled()
    cleanup()
    clearActiveEditorRegistryForTests()

    render(<SemanticConnectionsPanel panelId="sc-1" workspaceId="workspace-1" provider={blockedProvider} />)
    expect(screen.getByText('Open a document')).toBeTruthy()
    expect(blockedProvider.loadDocumentConnections).not.toHaveBeenCalled()
  })

  it('T-I-017 recovers from source guidance when preview becomes active', async () => {
    const gate = deferred<SemanticConnectionsResult>()
    const asyncProvider: SemanticConnectionsProvider = { loadDocumentConnections: vi.fn().mockReturnValue(gate.promise) }

    act(() => {
      registerActiveEditor('workspace-1', 'editor-1', editor(model('# Plan')))
      updateActiveEditorPreview('workspace-1', 'editor-1', { markdownPreview: false })
    })
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        provider={asyncProvider}
      />,
    )

    expect(screen.getByText('Switch to Preview')).toBeTruthy()

    act(() => updateActiveEditorPreview('workspace-1', 'editor-1', { markdownPreview: true }))

    expect(await screen.findByText('Loading connections')).toBeTruthy()
    expect(asyncProvider.loadDocumentConnections).toHaveBeenCalledTimes(1)

    await act(async () => gate.resolve(embeddingsOnlyResult))

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
  })

  it('T-I-018 and T-I-019 renders whole-document and section empty states without clearing selection', async () => {
    renderPanel({ ...embeddingsOnlyResult, overall: [], byChunkId: { scope: [] } })

    expect(await screen.findByText('No connections exist for this document')).toBeTruthy()
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.connectionCount).toBe(0)
    cleanup()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()

    renderPanel({ ...embeddingsOnlyResult, overall: embeddingsOnlyResult.overall, byChunkId: { scope: [] } }, { activeChunkId: 'scope' })

    expect(await screen.findByText('No connections exist for this section')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show whole document semantic connections' }).getAttribute('aria-pressed')).toBe('false')
    expect(screen.getByRole('button', { name: 'Show selected section semantic connections' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByLabelText('Connection count: 0 connections').textContent).toBe('0')
    expect(usePreviewSelectionStore.getState().getScope('editor-1').activeChunkId).toBe('scope')
  })

  it('T-I-020 keeps stale connections visible with a subtle stale indicator', async () => {
    renderPanel({ ...embeddingsOnlyResult, stale: true })

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(screen.getByText('Based on last indexed version')).toBeTruthy()
  })

  it('T-I-020 and T-I-042 keeps cached cards visible as stale after material content changes until fresh data arrives', async () => {
    const activeModel = mutableModel('# Plan\n\n## Scope\nBody')
    const fresh = deferred<SemanticConnectionsResult>()
    const asyncProvider: SemanticConnectionsProvider = {
      loadDocumentConnections: vi.fn()
        .mockResolvedValueOnce(embeddingsOnlyResult)
        .mockReturnValueOnce(fresh.promise),
    }

    act(() => {
      registerActiveEditor('workspace-1', 'editor-1', editor(activeModel))
      updateActiveEditorPreview('workspace-1', 'editor-1', { markdownPreview: true })
    })
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        provider={asyncProvider}
      />,
    )

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()

    act(() => {
      activeModel.setText('# Plan\n\n## Scope\nChanged body')
      updateActiveEditorModel('workspace-1', 'editor-1')
    })

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(screen.getByText('Based on last indexed version')).toBeTruthy()
    expect(screen.getByText('Refreshing...')).toBeTruthy()

    await act(async () => {
      fresh.resolve({
        ...embeddingsOnlyResult,
        overall: [{
          ...embeddingsOnlyResult.overall[1],
          id: 'fresh-content',
          target: { ...embeddingsOnlyResult.overall[1].target, title: 'Fresh Content' },
        }],
      })
    })

    expect(await screen.findByText('Fresh Content')).toBeTruthy()
    expect(screen.queryByText('Alpha Notes')).toBeNull()
    expect(screen.queryByText('Based on last indexed version')).toBeNull()
    expect(asyncProvider.loadDocumentConnections).toHaveBeenCalledTimes(2)
  })

  it('T-I-024 omits unmapped per-section rows and retains diagnostics as debug data', async () => {
    renderPanel({
      ...embeddingsOnlyResult,
      overall: [
        embeddingsOnlyResult.overall[0],
        {
          ...embeddingsOnlyResult.overall[1],
          id: 'unmapped',
          target: {
            ...embeddingsOnlyResult.overall[1].target,
            title: 'Unmapped Whole Document',
            chunkId: 'flashquery-uuid-without-preview-match',
          },
        },
      ],
      byChunkId: {
        scope: [embeddingsOnlyResult.overall[0]],
      },
      diagnostics: ['Unable to map FlashQuery chunk flashquery-uuid-without-preview-match'],
    }, { activeChunkId: 'scope' })

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(screen.queryByText('Unmapped Whole Document')).toBeNull()
    expect(screen.getByTestId('semantic-connections-panel').dataset.semanticDiagnosticsCount).toBe('1')
  })

  it('T-I-042 reuses successful cached results for the same editor document and content hash', async () => {
    const cachedProvider: SemanticConnectionsProvider = {
      loadDocumentConnections: vi.fn().mockResolvedValue(embeddingsOnlyResult),
    }

    renderPanelWithProvider(cachedProvider)
    expect(await screen.findByText('Alpha Notes')).toBeTruthy()

    act(() => usePreviewSelectionStore.getState().selectSection('scope', 'editor-1'))

    await waitFor(() => expect(cachedProvider.loadDocumentConnections).toHaveBeenCalledTimes(1))
  })

  it('T-I-021, T-I-022, and T-I-023 renders recoverable provider error states', async () => {
    const unavailable: SemanticConnectionsProvider = {
      loadDocumentConnections: vi.fn().mockRejectedValue(Object.assign(new Error('service down'), { code: 'FLASHQUERY_UNAVAILABLE' })),
    }
    renderPanelWithProvider(unavailable)
    expect(await screen.findByText('Unable to reach FlashQuery')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry connections' })).toBeTruthy()
    cleanup()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()

    const noVault: SemanticConnectionsProvider = {
      loadDocumentConnections: vi.fn().mockRejectedValue(Object.assign(new Error('no vault'), { code: 'NO_VAULT_CONNECTED' })),
    }
    renderPanelWithProvider(noVault)
    expect(await screen.findByText('No vault connected to this workspace')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload connections' })).toBeTruthy()
    cleanup()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()

    const malformed: SemanticConnectionsProvider = {
      loadDocumentConnections: vi.fn().mockResolvedValue({ overall: null } as unknown as SemanticConnectionsResult),
    }
    renderPanelWithProvider(malformed)
    expect(await screen.findByText('Unable to load semantic connections')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry connections' })).toBeTruthy()
  })

  it('T-I-023 and T-I-043 reject element-level malformed connections before card render', async () => {
    const malformed: SemanticConnectionsProvider = {
      loadDocumentConnections: vi.fn().mockResolvedValue({
        mode: 'embeddings-only',
        overall: [{ id: 'broken', score: 0.9 }],
        byChunkId: {},
        chunkOrder: [],
        chunkMap: {},
        diagnostics: [],
      } as unknown as SemanticConnectionsResult),
    }

    renderPanelWithProvider(malformed)

    expect(await screen.findByText('Unable to load semantic connections')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Retry connections' })).toBeTruthy()
    expect(screen.queryByTestId('semantic-connection-card-broken')).toBeNull()
  })

  it('T-I-025 and T-I-026 shows loading and supersedes stale in-flight requests', async () => {
    const first = deferred<SemanticConnectionsResult>()
    const second = deferred<SemanticConnectionsResult>()
    const asyncProvider: SemanticConnectionsProvider = {
      loadDocumentConnections: vi.fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise),
    }

    renderPanelWithProvider(asyncProvider)

    expect(await screen.findByText('Loading connections')).toBeTruthy()
    expect(screen.getByTestId('semantic-connections-panel').className).toContain('overflow-hidden')

    act(() => usePreviewSelectionStore.getState().selectSection('scope', 'editor-1'))
    await waitFor(() => expect(asyncProvider.loadDocumentConnections).toHaveBeenCalledTimes(2))

    await act(async () => {
      first.resolve({
        ...embeddingsOnlyResult,
        overall: [{
          ...embeddingsOnlyResult.overall[0],
          id: 'stale-first',
          target: { ...embeddingsOnlyResult.overall[0].target, title: 'Stale First' },
        }],
      })
      second.resolve({
        ...embeddingsOnlyResult,
        byChunkId: {
          scope: [{
            ...embeddingsOnlyResult.overall[1],
            id: 'fresh-second',
            target: { ...embeddingsOnlyResult.overall[1].target, title: 'Fresh Second' },
          }],
        },
      })
    })

    expect(await screen.findByText('Fresh Second')).toBeTruthy()
    expect(screen.queryByText('Stale First')).toBeNull()
  })

  it('REQ-036 opens a same-document target by scrolling preview and pinning the target chunk', async () => {
    const scrollPreviewToHeading = vi.fn()
    readyEditor('/workspace/Plan.md')
    act(() => {
      updateActiveEditorPreview('workspace-1', 'editor-1', {
        markdownPreview: true,
        filePath: '/workspace/Plan.md',
        scrollPreviewToHeading,
      })
    })
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        provider={provider({
          ...embeddingsOnlyResult,
          overall: [{
            ...embeddingsOnlyResult.overall[0],
            id: 'same-doc',
            target: {
              ...embeddingsOnlyResult.overall[0].target,
              title: 'Plan',
              path: '/workspace/Plan.md',
              heading: 'Scope',
              chunkId: 'scope',
              inDocument: true,
            },
          }],
        })}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Plan Scope' }))

    expect(scrollPreviewToHeading).toHaveBeenCalledWith('Scope')
    expect(usePreviewSelectionStore.getState().getScope('editor-1').pinnedChunkId).toBe('scope')
  })

  it('REQ-036 opens a cross-document target through a registered preview editor when available', async () => {
    const targetScroll = vi.fn()
    const targetEditor = editor(model('# Target\n\n## Details'))
    readyEditor('/workspace/Plan.md')
    act(() => {
      registerActiveEditor('workspace-1', 'editor-target', targetEditor)
      updateActiveEditorPreview('workspace-1', 'editor-target', {
        markdownPreview: true,
        filePath: '/workspace/Target.md',
        scrollPreviewToHeading: targetScroll,
      })
      registerActiveEditor('workspace-1', 'editor-1', editor(model('# Plan')))
    })
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        provider={provider({
          ...embeddingsOnlyResult,
          overall: [{
            ...embeddingsOnlyResult.overall[0],
            id: 'cross-doc',
            target: {
              ...embeddingsOnlyResult.overall[0].target,
              title: 'Target',
              path: '/workspace/Target.md',
              heading: 'Details',
              chunkId: 'details',
              inDocument: false,
            },
          }],
        })}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Target Details' }))

    expect(targetScroll).toHaveBeenCalledWith('Details')
    expect(targetEditor.focus).toHaveBeenCalled()
    expect(usePreviewSelectionStore.getState().getScope('editor-target').pinnedChunkId).toBe('details')
  })

  it('REQ-036 creates an editor for cross-document targets when no registered editor is available', async () => {
    const createEditor = vi.fn().mockReturnValue('created-editor')
    const setPanelMarkdownPreview = vi.fn()
    readyEditor('/workspace/Plan.md')
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        createEditorForOpen={createEditor}
        setEditorPreviewForOpen={setPanelMarkdownPreview}
        provider={provider({
          ...embeddingsOnlyResult,
          overall: [{
            ...embeddingsOnlyResult.overall[0],
            id: 'create-doc',
            target: {
              ...embeddingsOnlyResult.overall[0].target,
              title: 'Created',
              path: '/workspace/Created.md',
              heading: 'Details',
              chunkId: 'details',
              inDocument: false,
            },
          }],
        })}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Created Details' }))

    expect(createEditor).toHaveBeenCalledWith('workspace-1', '/workspace/Created.md', { sourceEditorPanelId: 'editor-1' })
    expect(setPanelMarkdownPreview).not.toHaveBeenCalled()
    expect(getActiveEditorSnapshot('workspace-1').panelId).toBe('editor-1')
  })

  it('REQ-036 opens unregistered cross-document targets in the center dock by default', async () => {
    readyEditor('/workspace/Plan.md')
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        provider={provider({
          ...embeddingsOnlyResult,
          overall: [{
            ...embeddingsOnlyResult.overall[0],
            id: 'default-open-doc',
            target: {
              ...embeddingsOnlyResult.overall[0].target,
              title: 'Default Open',
              path: 'Docs/Default.md',
              heading: 'Details',
              chunkId: 'details',
              inDocument: false,
            },
          }],
        })}
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Open Default Open Details' }))

    await waitFor(() => {
      expect(openRoutingMock.openFileAsPanel).toHaveBeenCalledWith('workspace-1', 'flashquery://workspace-1/Docs/Default.md', undefined, {
        target: 'dock',
        zone: 'center',
      })
    })
  })

  it('REQ-036 disables Open when target path, heading, or chunk metadata is incomplete', async () => {
    renderPanel({
      ...embeddingsOnlyResult,
      overall: [
        {
          ...embeddingsOnlyResult.overall[0],
          id: 'missing-heading',
          target: {
            ...embeddingsOnlyResult.overall[0].target,
            heading: undefined,
          },
        },
      ],
    })

    const open = await screen.findByRole('button', { name: 'Open Alpha Notes' }) as HTMLButtonElement
    expect(open.disabled).toBe(true)
  })

  it('REQ-037 preserves a pinned selection when Escape occurs outside the panel or preview', async () => {
    renderPanel({
      ...embeddingsOnlyResult,
      byChunkId: { scope: [embeddingsOnlyResult.overall[0]] },
    }, { activeChunkId: 'scope' })

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(usePreviewSelectionStore.getState().getScope('editor-1').pinnedChunkId).toBe('scope')

    const unrelated = document.createElement('button')
    unrelated.textContent = 'Unrelated'
    document.body.appendChild(unrelated)
    unrelated.focus()
    fireEvent.keyDown(unrelated, { key: 'Escape' })

    expect(usePreviewSelectionStore.getState().getScope('editor-1').pinnedChunkId).toBe('scope')

    fireEvent.keyDown(screen.getByTestId('semantic-connections-panel'), { key: 'Escape' })

    expect(usePreviewSelectionStore.getState().getScope('editor-1').pinnedChunkId).toBeNull()
  })
})

function renderPanelWithProvider(activeProvider: SemanticConnectionsProvider) {
  const filePath = readyEditor()
  return render(
    <SemanticConnectionsPanel
      panelId="sc-1"
      workspaceId="workspace-1"
      sourceEditorPanelId="editor-1"
      sourceFilePath={filePath}
      provider={activeProvider}
    />,
  )
}
