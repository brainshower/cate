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
import { takePendingReveal } from '../lib/editorReveal'
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

const graphResult: SemanticConnectionsResult = {
  mode: 'typed',
  overall: [
    {
      id: 'contradiction-scope',
      rel: 'contradicts',
      confidenceScore: 0.91,
      status: 'active',
      target: {
        title: 'Risk Notes',
        path: 'Docs/Risk.md',
        heading: 'Contrary evidence',
        chunkId: 'risk-evidence',
        snippet: 'Contrary evidence challenges the rollout claim.',
      },
    },
    {
      id: 'support-details',
      rel: 'supports',
      confidenceScore: 0.72,
      status: 'active',
      target: {
        title: 'Support Notes',
        path: 'Docs/Support.md',
        heading: 'Supporting data',
        chunkId: 'supporting-data',
        snippet: 'Supporting data confirms the expected flow.',
      },
    },
  ],
  byChunkId: {
    scope: [
      {
        id: 'scope-contradiction',
        rel: 'contradicts',
        confidenceScore: 0.9,
        status: 'active',
        target: {
          title: 'Risk Notes',
          path: 'Docs/Risk.md',
          heading: 'Contrary evidence',
          chunkId: 'risk-evidence',
          snippet: 'Contrary evidence challenges the rollout claim.',
        },
      },
    ],
    details: [],
    appendix: [],
  },
  chunkOrder: ['scope', 'details', 'appendix'],
  chunkMap: {
    scope: {
      previewChunkId: 'scope',
      flashqueryChunkId: 'fq-scope',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingText: 'Scope',
      headingPath: ['Plan', 'Scope'],
    },
    details: {
      previewChunkId: 'details',
      flashqueryChunkId: 'fq-details',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingText: 'Details',
      headingPath: ['Plan', 'Details'],
    },
    appendix: {
      previewChunkId: 'appendix',
      flashqueryChunkId: 'fq-appendix',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingText: 'Appendix',
      headingPath: ['Plan', 'Appendix'],
    },
  },
  communitySummary: {
    dominantLabel: 'Graph rollout',
    summary: 'Graph rollout connects implementation risks with supporting evidence.',
    labels: ['Graph rollout', 'Adapter health', 'Preview UX'],
  },
  nodeMeta: {
    scope: {
      chunkSummary: 'Scope carries the riskiest rollout assumptions.',
      certaintyLevel: 'medium',
      questionStatus: 'none',
    },
    details: {
      chunkSummary: 'Details still has an unresolved implementation question.',
      certaintyLevel: 'high',
      questionStatus: 'open',
      questionResolution: 'Which graph rows should remain visible during filtering?',
    },
    appendix: {
      chunkSummary: 'Appendix has a tentative source note.',
      certaintyLevel: 'low',
      questionStatus: 'none',
    },
  },
  diagnostics: [],
}

const groupedGraphResult: SemanticConnectionsResult = {
  ...graphResult,
  mode: 'mixed',
  overall: [
    {
      id: 'contradicts-main',
      rel: 'contradicts',
      confidenceScore: 0.91,
      status: 'active',
      target: { title: 'Conflict A', path: 'Docs/A.md', chunkId: 'a', snippet: 'Conflict A snippet' },
    },
    {
      id: 'supports-1',
      rel: 'supports',
      confidenceScore: 0.9,
      target: { title: 'Support 1', path: 'Docs/S1.md', chunkId: 's1', snippet: 'Support 1 snippet' },
    },
    {
      id: 'supports-2',
      rel: 'supports',
      confidenceScore: 0.8,
      target: { title: 'Support 2', path: 'Docs/S2.md', chunkId: 's2', snippet: 'Support 2 snippet' },
    },
    {
      id: 'supports-3',
      rel: 'supports',
      confidenceScore: 0.7,
      target: { title: 'Support 3', path: 'Docs/S3.md', chunkId: 's3', snippet: 'Support 3 snippet' },
    },
    {
      id: 'supports-4',
      rel: 'supports',
      confidenceScore: 0.6,
      target: { title: 'Support 4', path: 'Docs/S4.md', chunkId: 's4', snippet: 'Support 4 snippet' },
    },
    {
      id: 'untyped-overall',
      score: 0.99,
      target: { title: 'Untyped Similarity', path: 'Docs/U.md', chunkId: 'u', snippet: 'Untyped snippet' },
    },
    {
      id: 'semantic-similarity',
      rel: 'semantically_similar_to',
      confidenceScore: 0.95,
      target: { title: 'Typed Similarity', path: 'Docs/T.md', chunkId: 't', snippet: 'Typed similarity snippet' },
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

  it('T-C-001 and T-I-009 renders embeddings-only cards and hides nature sort/filter controls', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(screen.getByText('Beta Plan')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Show whole document semantic connections' }).textContent).toBe('Whole Document')
    expect((screen.getByRole('button', { name: 'Show selected section semantic connections' }) as HTMLButtonElement).disabled).toBe(true)
    const configButton = screen.getByRole('button', { name: 'Configure semantic connections' })
    expect(configButton.compareDocumentPosition(screen.getByLabelText('Connection count: 2 connections')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByLabelText('Connection count: 2 connections').textContent).toBe('2')
    expect(screen.queryByText('Docs/Alpha.md')).toBeNull()
    await waitFor(() => expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.connectionCount).toBe(2))
    expect(screen.queryByText('Sort by nature')).toBeNull()
    expect(screen.queryByText('Nature filters')).toBeNull()
    expect(screen.queryByText('Depends on')).toBeNull()
    expect(screen.queryByText('Sections')).toBeNull()
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
    const configButton = screen.getByRole('button', { name: 'Configure semantic connections' })
    expect(configButton.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByTestId('semantic-config-indicator')).toBeNull()
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(false)

    fireEvent.click(configButton)
    expect(configButton.getAttribute('aria-expanded')).toBe('true')
    fireEvent.change(screen.getByLabelText('Top N connections'), { target: { value: '1' } })

    expect(screen.getByText('Showing 1 of 2 connections')).toBeTruthy()
    expect(screen.getByText('1 additional connection hidden by Top-N')).toBeTruthy()
    expect(screen.getByTestId('semantic-config-indicator')).toBeTruthy()
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

  it('renders connection snippets and expanded bodies as plain text without Markdown syntax', async () => {
    renderPanel({
      ...embeddingsOnlyResult,
      overall: [{
        ...embeddingsOnlyResult.overall[0],
        id: 'markdown-text',
        target: {
          ...embeddingsOnlyResult.overall[0].target,
          snippet: 'See **bold** [reference](https://example.com) and `code`.',
          body: [
            '## Heading',
            '',
            '- First **item** with [link](https://example.com)',
            '- Second `item`',
          ].join('\n'),
        },
      }],
    })

    const card = await screen.findByTestId('semantic-connection-card-markdown-text')
    expect(within(card).getByText('See bold reference and code.')).toBeTruthy()
    expect(within(card).queryByText(/https:\/\/example\.com/)).toBeNull()
    expect(within(card).queryByText(/\*\*/)).toBeNull()

    fireEvent.click(within(card).getByRole('button', { name: 'Expand Alpha Notes Launch checklist' }))

    expect(within(card).getByText('Heading First item with link Second item')).toBeTruthy()
    expect(within(card).queryByText(/`item`/)).toBeNull()
  })

  it('T-I-013 exposes cosine tooltip equivalents without visible score text', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByLabelText('Cosine similarity 87%')).toBeTruthy()
    expect(screen.queryByText('87% match')).toBeNull()
    expect(screen.getByLabelText('Cosine similarity 64%')).toBeTruthy()
    expect(screen.queryByText('64% match')).toBeNull()
  })

  it('T-C-003, T-I-014, T-I-015, and T-I-016 blocks unsupported, source-mode, and no-editor preconditions without provider calls', () => {
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

  it('T-C-002 and T-I-020 keeps stale connections visible with a subtle stale indicator', async () => {
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

  it('T-C-004, T-I-021, T-I-022, and T-I-023 renders recoverable provider error states', async () => {
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

  it('T-C-005, T-C-006, and T-C-007 renders graph summary only when community data exists', async () => {
    renderPanel(graphResult)

    expect(await screen.findByText('Summary')).toBeTruthy()
    expect(screen.getByText('Graph rollout')).toBeTruthy()
    expect(screen.getByText('Graph rollout connects implementation risks with supporting evidence.')).toBeTruthy()
    expect(screen.getByText('Adapter health')).toBeTruthy()
    expect(screen.getByText('Preview UX')).toBeTruthy()
    cleanup()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()

    renderPanel({ ...graphResult, communitySummary: undefined })

    await screen.findByText('Sections')
    expect(screen.queryByText('Summary')).toBeNull()
  })

  it('T-C-008, T-C-009, T-C-010, T-C-011, T-C-012, T-C-026, and T-C-063 renders attention rows with scoped navigation and filter immunity', async () => {
    renderPanel({ ...graphResult, nodeMetaLoading: true })

    expect(await screen.findByText('Needs attention')).toBeTruthy()
    expect(screen.getByText('Checking graph metadata...')).toBeTruthy()
    expect(screen.queryByText('No graph attention items found')).toBeNull()
    expect(screen.getByText('Contradictions')).toBeTruthy()
    expect(screen.getByText('Open questions')).toBeTruthy()
    expect(screen.getByText('Uncertain sections')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Review contradiction in Scope' })).toBeTruthy()
    expect(screen.getByText('Which graph rows should remain visible during filtering?')).toBeTruthy()
    expect(screen.getByText('Appendix has a tentative source note.')).toBeTruthy()

    act(() => useSemanticConnectionsChromeStore.getState().panels['sc-1']?.toggleConfig())
    fireEvent.click(screen.getByRole('button', { name: 'Supports' }))

    expect(screen.getByRole('button', { name: 'Review contradiction in Scope' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Review contradiction in Scope' }))
    expect(usePreviewSelectionStore.getState().getScope('editor-1').activeChunkId).toBe('scope')
    expect(screen.getByRole('button', { name: 'Show selected section semantic connections' }).getAttribute('aria-pressed')).toBe('true')
    cleanup()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()

    renderPanel({
      ...graphResult,
      overall: graphResult.overall.filter((connection) => connection.rel !== 'contradicts'),
      byChunkId: { scope: [], details: [], appendix: [] },
      nodeMeta: {
        scope: { certaintyLevel: 'high', questionStatus: 'none' },
        details: { certaintyLevel: 'unknown', questionStatus: 'none' },
        appendix: { certaintyLevel: 'unknown', questionStatus: 'none' },
      },
      nodeMetaLoading: false,
    })

    await screen.findByText('Sections')
    expect(screen.queryByText('Needs attention')).toBeNull()
  })

  it('T-C-013, T-C-014, T-C-015, T-C-016, and T-C-017 renders ordered sections with graph flags and selection', async () => {
    renderPanel(graphResult)

    const sections = await screen.findByTestId('semantic-graph-sections')
    expect(within(sections).getAllByRole('button').map((button) => button.textContent)).toEqual([
      expect.stringContaining('Scope'),
      expect.stringContaining('Details'),
      expect.stringContaining('Appendix'),
    ])
    expect(within(sections).getByText('Contradiction')).toBeTruthy()
    expect(within(sections).getByText('Question')).toBeTruthy()
    expect(within(sections).getByText('Medium certainty')).toBeTruthy()
    expect(within(sections).getByText('High certainty')).toBeTruthy()
    expect(within(sections).getByText('Low certainty')).toBeTruthy()
    expect(within(sections).getAllByText('—')).toHaveLength(2)

    fireEvent.click(within(sections).getByRole('button', { name: 'Open section Details' }))

    expect(usePreviewSelectionStore.getState().getScope('editor-1').activeChunkId).toBe('details')
    expect(screen.getByRole('button', { name: 'Show selected section semantic connections' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('T-C-018, T-C-019, T-C-020, and T-C-064 renders grouped graph rows with overflow and score text omitted', async () => {
    renderPanel(groupedGraphResult)

    const connections = await screen.findByTestId('semantic-graph-connections')
    expect(within(connections).getAllByTestId(/semantic-graph-group-/).map((group) => group.dataset.groupKey)).toEqual([
      'contradicts',
      'supports',
      'similarity',
      'semantically_similar_to',
    ])
    expect(within(connections).getByText('Conflict A')).toBeTruthy()
    expect(within(connections).getByText('Support 1')).toBeTruthy()
    expect(within(connections).queryByText('Support 4')).toBeNull()
    expect(within(connections).queryByLabelText(/Cosine similarity/)).toBeNull()
    expect(within(connections).queryByText(/90%/)).toBeNull()

    fireEvent.click(within(connections).getByRole('button', { name: 'Show 1 more Supports connection' }))

    expect(within(connections).getByText('Support 4')).toBeTruthy()
  })

  it('T-C-030 filters stale and deleted graph edges from connection lists, counts, and section tallies', async () => {
    renderPanel({
      ...graphResult,
      overall: [
        {
          id: 'active-edge',
          rel: 'supports',
          status: 'active',
          target: { title: 'Active Edge', path: 'Docs/Active.md', chunkId: 'active', snippet: 'Active edge snippet' },
        },
        {
          id: 'stale-edge',
          rel: 'supports',
          status: 'stale',
          target: { title: 'Stale Edge', path: 'Docs/Stale.md', chunkId: 'stale', snippet: 'Stale edge snippet' },
        },
        {
          id: 'deleted-edge',
          rel: 'contradicts',
          status: 'deleted',
          target: { title: 'Deleted Edge', path: 'Docs/Deleted.md', chunkId: 'deleted', snippet: 'Deleted edge snippet' },
        },
      ],
      byChunkId: {
        scope: [{
          id: 'scope-active-edge',
          rel: 'supports',
          status: 'active',
          target: { title: 'Scope Active Edge', path: 'Docs/Scope.md', chunkId: 'scope-active', snippet: 'Scope active edge snippet' },
        }],
        details: [{
          id: 'details-stale-edge',
          rel: 'supports',
          status: 'stale',
          target: { title: 'Details Stale Edge', path: 'Docs/Details.md', chunkId: 'details-stale', snippet: 'Details stale edge snippet' },
        }],
        appendix: [],
      },
    })

    const connections = await screen.findByTestId('semantic-graph-connections')
    expect(within(connections).getByText('Active Edge')).toBeTruthy()
    expect(within(connections).queryByText('Stale Edge')).toBeNull()
    expect(within(connections).queryByText('Deleted Edge')).toBeNull()
    expect(screen.getByLabelText('Connection count: 1 connection').textContent).toBe('1')
    await waitFor(() => expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.connectionCount).toBe(1))

    const sections = screen.getByTestId('semantic-graph-sections')
    const details = within(sections).getByRole('button', { name: 'Open section Details' })
    expect(within(details).getByText('—')).toBeTruthy()
    await waitFor(() => {
      expect(usePreviewSelectionStore.getState().getScope('editor-1').connectedChunkIds).toEqual(['scope'])
    })
  })

  it('T-C-022, T-C-023, and T-C-024 applies Top-N and relation filters to graph connections only', async () => {
    renderPanel(groupedGraphResult)

    expect(await screen.findByText('Needs attention')).toBeTruthy()
    act(() => useSemanticConnectionsChromeStore.getState().panels['sc-1']?.toggleConfig())
    fireEvent.change(screen.getByLabelText('Top N connections'), { target: { value: '2' } })

    const connections = screen.getByTestId('semantic-graph-connections')
    expect(within(connections).getByText('Conflict A')).toBeTruthy()
    expect(within(connections).getByText('Support 1')).toBeTruthy()
    expect(within(connections).queryByText('Support 2')).toBeNull()
    expect(screen.getByText('Needs attention')).toBeTruthy()
    expect(screen.getByText('Sections')).toBeTruthy()
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Supports' }))

    expect(within(connections).queryByText('Conflict A')).toBeNull()
    expect(within(connections).getByText('Support 1')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Review contradiction in Scope' })).toBeTruthy()
  })

  it('T-C-021 and T-C-025 keeps embeddings-only fallback flat and hides graph controls', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByTestId('semantic-connection-card-alpha')).toBeTruthy()
    expect(screen.queryByTestId('semantic-graph-connections')).toBeNull()
    expect(screen.queryByText('Nature filters')).toBeNull()
    expect(screen.queryByText('Sections')).toBeNull()
  })

  it('T-C-027 selects a traceable whole-document graph row and no-ops untraceable rows with diagnostics', async () => {
    renderPanel({
      ...groupedGraphResult,
      byChunkId: {
        ...groupedGraphResult.byChunkId,
        scope: [groupedGraphResult.overall[1]],
      },
    })

    const traceableRow = await screen.findByRole('button', { name: 'Open source section for Support 1' })
    fireEvent.click(traceableRow)
    expect(usePreviewSelectionStore.getState().getScope('editor-1').activeChunkId).toBe('scope')
    cleanup()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()

    renderPanel(groupedGraphResult)

    fireEvent.click(await screen.findByRole('button', { name: 'Open source section for Support 1' }))
    expect(usePreviewSelectionStore.getState().getScope('editor-1').activeChunkId).toBeNull()
    expect(screen.getByTestId('semantic-connections-panel').dataset.semanticNavigationDiagnosticsCount).toBe('1')
  })

  it('T-C-028 uses responsive truncating dock classes for graph containers and rows', async () => {
    renderPanel(groupedGraphResult)

    const panel = await screen.findByTestId('semantic-connections-panel')
    const connections = screen.getByTestId('semantic-graph-connections')
    const row = screen.getByTestId('semantic-graph-connection-supports-1')

    expect(panel.className).toContain('min-w-0')
    expect(panel.className).toContain('overflow-hidden')
    expect(connections.className).toContain('space-y-3')
    expect(row.className).toContain('min-w-0')
    expect(within(row).getByText('Support 1').className).toContain('truncate')
  })

  it('T-C-029 publishes whole-document graph connection count and config active state to dock chrome', async () => {
    renderPanel(groupedGraphResult)

    await screen.findByTestId('semantic-graph-connections')
    await waitFor(() => expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.connectionCount).toBe(7))
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(false)

    act(() => useSemanticConnectionsChromeStore.getState().panels['sc-1']?.toggleConfig())
    fireEvent.change(screen.getByLabelText('Top N connections'), { target: { value: '2' } })

    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.connectionCount).toBe(7)
    expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.configActive).toBe(true)
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
        resolvePreviewChunkIdForHeading: vi.fn(() => 'scope'),
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
        resolvePreviewChunkIdForHeading: vi.fn(() => 'details'),
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
              chunkId: 'flashquery-target-chunk',
              inDocument: false,
            },
          }],
        })}
      />,
    )

    const openButton = await screen.findByRole('button', { name: 'Open Target Details' })
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 0
    })
    fireEvent.click(openButton)

    expect(targetEditor.focus).toHaveBeenCalled()
    expect(targetScroll).toHaveBeenCalledWith('Details')
    expect(usePreviewSelectionStore.getState().getScope('editor-target').pinnedChunkId).toBe('details')
  })

  it('REQ-036 reveals a cross-document target heading in an already registered source editor', async () => {
    const targetEditor = editor(model('# Target\n\n## Details\n\nBody'))
    readyEditor('/workspace/Plan.md')
    act(() => {
      registerActiveEditor('workspace-1', 'editor-target', targetEditor)
      updateActiveEditorPreview('workspace-1', 'editor-target', {
        markdownPreview: false,
        filePath: '/workspace/Target.md',
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
            id: 'cross-source-doc',
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

    expect(targetEditor.revealLineInCenter).toHaveBeenCalledWith(3)
    expect(targetEditor.setPosition).toHaveBeenCalledWith({ lineNumber: 3, column: 1 })
    expect(targetEditor.focus).toHaveBeenCalled()
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

    expect(createEditor).toHaveBeenCalledWith('workspace-1', '/workspace/Created.md', {
      sourceEditorPanelId: 'editor-1',
      markdownPreview: true,
    })
    expect(takePendingReveal('created-editor')).toEqual({ headingText: 'Details' })
    expect(setPanelMarkdownPreview).toHaveBeenCalledWith('workspace-1', 'created-editor', true)
    expect(getActiveEditorSnapshot('workspace-1').panelId).toBe('editor-1')
  })

  it('REQ-036 opens unregistered cross-document targets in the center dock by default', async () => {
    const setPanelMarkdownPreview = vi.fn()
    readyEditor('/workspace/Plan.md')
    render(
      <SemanticConnectionsPanel
        panelId="sc-1"
        workspaceId="workspace-1"
        sourceEditorPanelId="editor-1"
        sourceFilePath="/workspace/Plan.md"
        setEditorPreviewForOpen={setPanelMarkdownPreview}
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
    expect(setPanelMarkdownPreview).toHaveBeenCalledWith('workspace-1', 'opened-panel', true)
    expect(takePendingReveal('opened-panel')).toEqual({ headingText: 'Details' })
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
