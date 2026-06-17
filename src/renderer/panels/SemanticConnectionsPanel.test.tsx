import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearActiveEditorRegistryForTests,
  registerActiveEditor,
  updateActiveEditorPreview,
  type ActiveEditorLike,
  type ActiveEditorModelLike,
} from '../lib/activeEditorRegistry'
import { clearPreviewSelectionForTests, usePreviewSelectionStore } from '../stores/previewSelectionStore'
import type { SemanticConnectionsProvider, SemanticConnectionsResult } from '../lib/semanticConnections'
import SemanticConnectionsPanel from './SemanticConnectionsPanel'

function model(text: string): ActiveEditorModelLike {
  const lines = text.split('\n')
  return {
    getLineCount: () => lines.length,
    getLineContent: (lineNumber) => lines[lineNumber - 1] ?? '',
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
    updateActiveEditorPreview('workspace-1', 'editor-1', { markdownPreview: true })
  })
  return filePath
}

function provider(result: SemanticConnectionsResult): SemanticConnectionsProvider {
  return {
    loadDocumentConnections: vi.fn().mockResolvedValue(result),
  }
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
    act(() => usePreviewSelectionStore.getState().selectSection(activeChunkId))
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
  })

  afterEach(() => {
    cleanup()
    clearActiveEditorRegistryForTests()
    clearPreviewSelectionForTests()
  })

  it('T-I-009 renders embeddings-only cards and hides nature sort/filter controls', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByText('Alpha Notes')).toBeTruthy()
    expect(screen.getByText('Beta Plan')).toBeTruthy()
    expect(screen.getByText('Whole document')).toBeTruthy()
    expect(screen.getByText('2 connections')).toBeTruthy()
    expect(screen.queryByText('Sort by nature')).toBeNull()
    expect(screen.queryByText('Nature filters')).toBeNull()
    expect(screen.queryByText('Depends on')).toBeNull()
  })

  it('T-I-010 renders typed banners only for typed cards in sparse mixed data', async () => {
    renderPanel(mixedResult)

    const typed = await screen.findByTestId('semantic-connection-card-typed')
    const untyped = screen.getByTestId('semantic-connection-card-untyped')

    expect(within(typed).getByText('Depends on')).toBeTruthy()
    expect(within(untyped).queryByText('Depends on')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Configure semantic connections' }))

    expect(screen.getByText('Sort by nature')).toBeTruthy()
    expect(screen.getByText('Nature filters')).toBeTruthy()
  })

  it('T-I-011 renders Top-N Max and finite counts with the config indicator only when active', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByText('Showing all 2 connections')).toBeTruthy()
    expect(screen.getByTestId('semantic-config-indicator').textContent).toBe('Default')

    fireEvent.click(screen.getByRole('button', { name: 'Configure semantic connections' }))
    fireEvent.change(screen.getByLabelText('Top N connections'), { target: { value: '1' } })

    expect(screen.getByText('Showing 1 of 2 connections')).toBeTruthy()
    expect(screen.getByText('1 additional connection hidden by Top-N')).toBeTruthy()
    expect(screen.getByTestId('semantic-config-indicator').textContent).toBe('Active')

    fireEvent.change(screen.getByLabelText('Top N connections'), { target: { value: '2' } })

    expect(screen.getByText('Showing all 2 connections')).toBeTruthy()
    expect(screen.getByTestId('semantic-config-indicator').textContent).toBe('Default')
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

  it('T-I-013 exposes score pie text equivalents for assistive tech', async () => {
    renderPanel(embeddingsOnlyResult)

    expect(await screen.findByLabelText('87% match')).toBeTruthy()
    expect(screen.getByText('87% match')).toBeTruthy()
    expect(screen.getByLabelText('64% match')).toBeTruthy()
  })
})
