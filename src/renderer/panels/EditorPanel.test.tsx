import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('monaco-editor', () => {
  type Listener = () => void
  type MockUri = { raw: string; toString: () => string }
  type MockModel = {
    uri?: MockUri
    value: string
    disposed: boolean
    getValue: () => string
    getLineCount: () => number
    getLineContent: (lineNumber: number) => string
    getLineMaxColumn: (lineNumber: number) => number
    setValue: (value: string) => void
    isDisposed: () => boolean
    dispose: () => void
  }
  type MockEditor = {
    model: MockModel | null
    position: { lineNumber: number; column: number }
    focusListeners: Listener[]
    changeListeners: Listener[]
    decorationCollections: Array<{
      set: ReturnType<typeof vi.fn>
      clear: ReturnType<typeof vi.fn>
    }>
    getValue: () => string
    getModel: () => MockModel | null
    getPosition: () => { lineNumber: number; column: number }
    setModel: (model: MockModel) => void
    onDidFocusEditorText: (listener: Listener) => { dispose: () => void }
    onDidChangeModelContent: (listener: Listener) => { dispose: () => void }
    createDecorationsCollection: ReturnType<typeof vi.fn>
    revealLineInCenter: ReturnType<typeof vi.fn>
    setPosition: ReturnType<typeof vi.fn>
    focus: ReturnType<typeof vi.fn>
    updateOptions: ReturnType<typeof vi.fn>
    layout: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
  }

  const models = new Map<string, MockModel>()
  const editors: MockEditor[] = []
  const diffEditors: any[] = []
  const uriFileCalls: string[] = []
  const uriParseCalls: string[] = []

  const uriFrom = (raw: string): MockUri => ({ raw, toString: () => raw })

  const makeModel = (value: string, uri?: MockUri): MockModel => {
    const model: MockModel = {
      uri,
      value,
      disposed: false,
      getValue: () => model.value,
      getLineCount: () => model.value.split('\n').length,
      getLineContent: (lineNumber) => model.value.split('\n')[lineNumber - 1] ?? '',
      getLineMaxColumn: (lineNumber) => (model.value.split('\n')[lineNumber - 1]?.length ?? 0) + 1,
      setValue: (next) => { model.value = next },
      isDisposed: () => model.disposed,
      dispose: () => { model.disposed = true },
    }
    if (uri) models.set(uri.toString(), model)
    return model
  }

  const makeEditor = (): MockEditor => {
    const editor: MockEditor = {
      model: null,
      position: { lineNumber: 1, column: 1 },
      focusListeners: [],
      changeListeners: [],
      decorationCollections: [],
      getValue: () => editor.model?.getValue() ?? '',
      getModel: () => editor.model,
      getPosition: () => editor.position,
      setModel: (model) => { editor.model = model },
      onDidFocusEditorText: (listener) => {
        editor.focusListeners.push(listener)
        return { dispose: () => { editor.focusListeners = editor.focusListeners.filter((item) => item !== listener) } }
      },
      onDidChangeModelContent: (listener) => {
        editor.changeListeners.push(listener)
        return { dispose: () => { editor.changeListeners = editor.changeListeners.filter((item) => item !== listener) } }
      },
      createDecorationsCollection: vi.fn(() => {
        const collection = {
          set: vi.fn(),
          clear: vi.fn(),
        }
        editor.decorationCollections.push(collection)
        return collection
      }),
      revealLineInCenter: vi.fn(),
      setPosition: vi.fn((position) => { editor.position = position }),
      focus: vi.fn(),
      updateOptions: vi.fn(),
      layout: vi.fn(),
      dispose: vi.fn(),
    }
    editors.push(editor)
    return editor
  }

  const mock = {
    models,
    editors,
    diffEditors,
    uriFileCalls,
    uriParseCalls,
    reset: () => {
      models.clear()
      editors.length = 0
      diffEditors.length = 0
      uriFileCalls.length = 0
      uriParseCalls.length = 0
    },
    latestEditor: () => editors[editors.length - 1],
    setLatestValue: (value: string) => {
      const editor = editors[editors.length - 1]
      editor?.model?.setValue(value)
      editor?.changeListeners.forEach((listener) => listener())
    },
    focusLatestEditor: () => {
      const editor = editors[editors.length - 1]
      editor?.focusListeners.forEach((listener) => listener())
    },
    getModelByRawUri: (raw: string) => models.get(raw),
  }

  return {
    __mock: mock,
    Uri: {
      file: vi.fn((filePath: string) => {
        uriFileCalls.push(filePath)
        return uriFrom(`file://${filePath}`)
      }),
      parse: vi.fn((value: string) => {
        uriParseCalls.push(value)
        return uriFrom(value)
      }),
    },
    Range: class Range {
      constructor(
        public startLineNumber: number,
        public startColumn: number,
        public endLineNumber: number,
        public endColumn: number,
      ) {}
    },
    languages: {
      getLanguages: vi.fn(() => [
        { id: 'markdown', extensions: ['.md', '.mdx'] },
        { id: 'typescript', extensions: ['.ts'] },
      ]),
    },
    editor: {
      defineTheme: vi.fn(),
      setTheme: vi.fn(),
      create: vi.fn(() => makeEditor()),
      createDiffEditor: vi.fn(() => {
        const diffEditor = {
          layout: vi.fn(),
          updateOptions: vi.fn(),
          setModel: vi.fn(),
          getModel: vi.fn(() => ({ original: makeModel(''), modified: makeModel('') })),
          dispose: vi.fn(),
        }
        diffEditors.push(diffEditor)
        return diffEditor
      }),
      createModel: vi.fn((value: string, _language?: string, uri?: MockUri) => makeModel(value, uri)),
      getModel: vi.fn((uri: MockUri) => models.get(uri.toString()) ?? null),
    },
  }
})

import * as monaco from 'monaco-editor'
import log from '../lib/logger'
import EditorPanel from './EditorPanel'
import { VaultBadge } from '../components/VaultBadge'
import {
  FLASHQUERY_EDITOR_TITLE_ACTION_EVENT,
  FlashQueryEditorTitleActions,
  type FlashQueryEditorTitleAction,
} from '../components/FlashQueryEditorTitleActions'
import { useAgentStore } from '../../agent/renderer/agentStore'
import { useAppStore } from '../stores/appStore'
import { useDockStore } from '../stores/dockStore'
import { useSettingsStore } from '../stores/settingsStore'
import { CanvasStoreProvider } from '../stores/CanvasStoreContext'
import { createCanvasStore } from '../stores/canvasStore'
import { clearActiveEditorRegistryForTests, getActiveEditorSnapshot } from '../lib/activeEditorRegistry'
import { confirmCloseDirtyPanels } from '../lib/confirmCloseDirty'
import { setPendingReveal } from '../lib/editorReveal'
import { clearPreviewSelectionForTests, usePreviewSelectionStore } from '../stores/previewSelectionStore'
import type { FlashQueryStatusBroadcastPayload, FlashQueryWriteResult, PanelState } from '../../shared/types'

type ElectronApiMock = Pick<
  Window['electronAPI'],
  | 'fsReadFile'
  | 'fsWriteFile'
  | 'flashqueryGetDocument'
  | 'flashqueryDocumentConnections'
  | 'flashqueryWriteDocument'
  | 'flashqueryListVaultIndex'
  | 'gitDiff'
  | 'gitDiffStaged'
  | 'onFlashQueryStatus'
  | 'showContextMenu'
  | 'saveFileDialog'
  | 'confirmUnsavedChanges'
>

const workspaceId = 'workspace-1'
const panelId = 'editor-1'
const vaultUri = 'flashquery://workspace-1/Docs/Plan.md'
const frontmatterUri = 'flashquery://workspace-1/Docs/Plan.md?part=frontmatter'
const localPath = '/repo/Docs/Plan.md'
let statusListener: ((payload: FlashQueryStatusBroadcastPayload) => void) | null = null

function monacoMock() {
  return (monaco as any).__mock
}

function makeElectronApi(writeResult: FlashQueryWriteResult = { success: true, modified: 'now' }): ElectronApiMock {
  return {
    fsReadFile: vi.fn((filePath: string) => Promise.resolve(`local:${filePath}`)),
    fsWriteFile: vi.fn(() => Promise.resolve()),
    flashqueryGetDocument: vi.fn(() => Promise.resolve({
      body: 'vault body',
      version_token: 'ignored-token',
      modified: 'ignored-modified',
    })),
    flashqueryDocumentConnections: vi.fn(() => Promise.resolve({
      source: { document_id: 'source-doc', path: 'Docs/Plan.md', title: 'Plan' },
      overall: [],
      source_chunks: [],
    })),
    flashqueryWriteDocument: vi.fn(() => Promise.resolve(writeResult)),
    flashqueryListVaultIndex: vi.fn(() => Promise.resolve([])),
    gitDiff: vi.fn(() => Promise.resolve('')),
    gitDiffStaged: vi.fn(() => Promise.resolve('')),
    onFlashQueryStatus: vi.fn((callback) => {
      statusListener = callback
      return () => {
        statusListener = null
      }
    }),
    showContextMenu: vi.fn().mockResolvedValue(null),
    saveFileDialog: vi.fn(() => Promise.resolve(null)),
    confirmUnsavedChanges: vi.fn(() => Promise.resolve('save' as const)),
  }
}

function setElectronApi(api: ElectronApiMock) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api,
  })
}

function makePanel(filePath: string, diffMode?: 'staged' | 'working'): PanelState {
  return {
    id: panelId,
    type: 'editor',
    title: filePath.split('/').pop() ?? 'Plan.md',
    isDirty: false,
    filePath,
    diffMode,
  }
}

function seedWorkspace(panel: PanelState = makePanel(vaultUri)) {
  useAppStore.setState({
    selectedWorkspaceId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name: 'Workspace',
      color: '#5AD8B8',
      rootPath: '/repo',
      panels: { [panel.id]: panel },
      canvasNodes: {},
      regions: {},
      zoomLevel: 1,
      viewportOffset: { x: 0, y: 0 },
      focusedNodeId: null,
      flashqueryConnection: { transport: 'http', url: 'https://fq.local:3100/mcp' },
    }],
  })
}

async function renderEditor(filePath: string, diffMode?: 'staged' | 'working') {
  const panel = makePanel(filePath, diffMode)
  seedWorkspace(panel)
  const result = render(<EditorPanel panelId={panelId} workspaceId={workspaceId} filePath={filePath} />)
  await waitFor(() => expect(monacoMock().latestEditor()?.getModel()).toBeTruthy())
  return result
}

function dispatchTitleAction(action: FlashQueryEditorTitleAction) {
  window.dispatchEvent(
    new CustomEvent(FLASHQUERY_EDITOR_TITLE_ACTION_EVENT, {
      detail: { panelId, action },
    }),
  )
}

function EditorTitleChrome({ panel }: { panel: PanelState }) {
  const workspace = useAppStore.getState().workspaces.find((item) => item.id === workspaceId)
  const connectionUrl = workspace?.flashqueryConnection?.transport === 'http'
    ? workspace.flashqueryConnection.url
    : undefined

  return (
    <div>
      <span>{panel.title}</span>
      <FlashQueryEditorTitleActions panel={panel} workspaceId={workspaceId} />
      {panel.type === 'editor' && (
        <VaultBadge filePath={panel.filePath} connectionUrl={connectionUrl} />
      )}
    </div>
  )
}

beforeEach(() => {
  vi.useRealTimers()
  statusListener = null
  monacoMock().reset()
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as any
  setElectronApi(makeElectronApi())
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
  Object.defineProperty(window, 'getSelection', {
    configurable: true,
    value: () => ({ toString: () => '' }),
  })
  seedWorkspace()
  useSettingsStore.setState({ ...useSettingsStore.getState(), previewFontSize: 20, appFontSize: 16 })
  useAgentStore.setState({ panels: {} })
  clearActiveEditorRegistryForTests()
  clearPreviewSelectionForTests()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  clearActiveEditorRegistryForTests()
  clearPreviewSelectionForTests()
})

describe('EditorPanel FlashQuery URI routing', () => {
  it('T-I-017 renders the Outline toggle next to Preview for regular editors', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Outline-Toolbar.md')

    expect(screen.getByLabelText('Toggle document outline')).toBeTruthy()
    expect(screen.getByLabelText('Toggle document graph')).toBeTruthy()
    expect(screen.getByTitle('Preview markdown')).toBeTruthy()
  })

  it('T-I-018 hides the Outline toggle in diff mode', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    seedWorkspace(makePanel(localPath, 'staged'))

    render(<EditorPanel panelId={panelId} workspaceId={workspaceId} filePath={localPath} />)

    await waitFor(() => expect(monaco.editor.createDiffEditor).toHaveBeenCalled())
    expect(screen.queryByLabelText('Toggle document outline')).toBeNull()
    expect(screen.queryByLabelText('Toggle document graph')).toBeNull()
  })

  it('T-I-019 opens Outline in the right dock zone for a docked editor with source editor association', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Outline-Open.md')

    fireEvent.click(screen.getByLabelText('Toggle document outline'))

    const workspace = useAppStore.getState().workspaces[0]
    const outlinePanel = Object.values(workspace.panels).find((panel) => panel.type === 'outline')
    expect(outlinePanel).toMatchObject({
      title: 'Outline',
      sourceEditorPanelId: panelId,
    })
    expect(useDockStore.getState().panelLocations[outlinePanel!.id]).toMatchObject({
      type: 'dock',
      zone: 'right',
    })
  })

  it('opens Graph in the right dock zone for a docked editor with source editor association', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Graph-Open.md')

    fireEvent.click(screen.getByLabelText('Toggle document graph'))

    const workspace = useAppStore.getState().workspaces[0]
    const graphPanel = Object.values(workspace.panels).find((panel) => panel.type === 'semantic-connections')
    expect(graphPanel).toMatchObject({
      title: 'Connections',
      sourceEditorPanelId: panelId,
    })
    expect(useDockStore.getState().panelLocations[graphPanel!.id]).toMatchObject({
      type: 'dock',
      zone: 'right',
    })
  })

  it('switches a Markdown editor to Preview when opening Graph from source mode', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Graph-Preview.md')

    expect(useAppStore.getState().workspaces[0].panels[panelId].markdownPreview).toBeUndefined()

    fireEvent.click(screen.getByLabelText('Toggle document graph'))

    expect(useAppStore.getState().workspaces[0].panels[panelId].markdownPreview).toBe(true)
    expect(Object.values(useAppStore.getState().workspaces[0].panels).some((panel) =>
      panel.type === 'semantic-connections' && panel.sourceEditorPanelId === panelId
    )).toBe(true)
  })

  it('opens Graph without forcing Preview when the source editor is not Markdown', async () => {
    await renderEditor('/repo/notes.txt')

    fireEvent.click(screen.getByLabelText('Toggle document graph'))

    expect(useAppStore.getState().workspaces[0].panels[panelId].markdownPreview).toBeUndefined()
    expect(Object.values(useAppStore.getState().workspaces[0].panels).some((panel) =>
      panel.type === 'semantic-connections' && panel.sourceEditorPanelId === panelId
    )).toBe(true)
  })

  it('opens Outline inside the source canvas node when the editor is canvas-mounted', async () => {
    const panel = makePanel('flashquery://workspace-1/Docs/Canvas-Outline.md')
    seedWorkspace(panel)
    const originalCreateOutline = useAppStore.getState().createOutline
    const createOutline = vi.fn()
    useAppStore.setState({ createOutline } as Partial<ReturnType<typeof useAppStore.getState>>)

    render(<EditorPanel panelId={panelId} workspaceId={workspaceId} nodeId="node-1" filePath={panel.filePath} />)
    await waitFor(() => expect(monacoMock().latestEditor()?.getModel()).toBeTruthy())

    fireEvent.click(screen.getByLabelText('Toggle document outline'))

    expect(createOutline).toHaveBeenCalledWith(
      workspaceId,
      undefined,
      { target: 'none' },
      panelId,
      'node-1',
    )
    useAppStore.setState({ createOutline: originalCreateOutline } as Partial<ReturnType<typeof useAppStore.getState>>)
  })

  it('opens Graph inside the source canvas node when the editor is canvas-mounted', async () => {
    const panel = makePanel('flashquery://workspace-1/Docs/Canvas-Graph.md')
    seedWorkspace(panel)
    const originalCreateSemanticConnections = useAppStore.getState().createSemanticConnections
    const createSemanticConnections = vi.fn()
    useAppStore.setState({ createSemanticConnections } as Partial<ReturnType<typeof useAppStore.getState>>)

    render(<EditorPanel panelId={panelId} workspaceId={workspaceId} nodeId="node-1" filePath={panel.filePath} />)
    await waitFor(() => expect(monacoMock().latestEditor()?.getModel()).toBeTruthy())

    fireEvent.click(screen.getByLabelText('Toggle document graph'))

    expect(createSemanticConnections).toHaveBeenCalledWith(
      workspaceId,
      undefined,
      { target: 'none' },
      panelId,
      'node-1',
    )
    useAppStore.setState({ createSemanticConnections: originalCreateSemanticConnections } as Partial<ReturnType<typeof useAppStore.getState>>)
  })

  it('T-I-020 closes only the associated Outline panel and preserves unrelated right-zone panels', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Outline-Close.md')
    let unrelatedPanelId = ''
    act(() => {
      unrelatedPanelId = useAppStore.getState().createFlashQueryVaultSearch(workspaceId, undefined, {
        target: 'dock',
        zone: 'right',
      })
    })

    fireEvent.click(screen.getByLabelText('Toggle document outline'))
    const outlinePanelId = Object.values(useAppStore.getState().workspaces[0].panels)
      .find((panel) => panel.type === 'outline' && panel.sourceEditorPanelId === panelId)!.id
    fireEvent.click(screen.getByLabelText('Toggle document outline'))

    const workspace = useAppStore.getState().workspaces[0]
    expect(workspace.panels[outlinePanelId]).toBeUndefined()
    expect(workspace.panels[unrelatedPanelId]).toMatchObject({ type: 'flashqueryVaultSearch' })
    expect(useDockStore.getState().panelLocations[unrelatedPanelId]).toMatchObject({
      type: 'dock',
      zone: 'right',
    })
  })

  it('T-I-020 keeps Outline association scoped to the source editor panel', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Outline-Scope.md')
    let firstOutlineId = ''
    act(() => {
      firstOutlineId = useAppStore.getState().createOutline(workspaceId, undefined, {
        target: 'dock',
        zone: 'right',
      }, 'other-editor')
    })

    fireEvent.click(screen.getByLabelText('Toggle document outline'))

    const workspace = useAppStore.getState().workspaces[0]
    expect(workspace.panels[firstOutlineId]).toMatchObject({ sourceEditorPanelId: 'other-editor' })
    expect(Object.values(workspace.panels).filter((panel) => panel.type === 'outline')).toHaveLength(2)
  })

  it('T-I-021 uses muted/off and blue/on visual states', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Outline-State.md')
    const toggle = screen.getByLabelText('Toggle document outline')

    expect(toggle.className).toContain('text-neutral')
    fireEvent.click(toggle)
    expect(toggle.className).toContain('text-blue-400')
  })

  it('T-I-022 opening Outline does not change preview, dirty state, or editor model content', async () => {
    await renderEditor('flashquery://workspace-1/Docs/Outline-Noninterference.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const beforeContent = monacoMock().latestEditor().getValue()
    const beforePanel = useAppStore.getState().workspaces[0].panels[panelId]

    fireEvent.click(screen.getByLabelText('Toggle document outline'))

    const afterPanel = useAppStore.getState().workspaces[0].panels[panelId]
    expect(afterPanel.markdownPreview).toBe(true)
    expect(afterPanel.isDirty).toBe(beforePanel.isDirty)
    expect(monacoMock().latestEditor().getValue()).toBe(beforeContent)
  })

  it('T-I-079 mounts vault URI through flashqueryGetDocument and not fsReadFile', async () => {
    const api = makeElectronApi()
    setElectronApi(api)

    await renderEditor(vaultUri)

    expect(api.flashqueryGetDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Plan.md', { include: ['body'] })
    expect(api.fsReadFile).not.toHaveBeenCalled()
    expect(monacoMock().latestEditor().getValue()).toBe('vault body')
  })

  it('preloads semantic connections after mounting a FlashQuery markdown body document', async () => {
    const api = makeElectronApi()
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preload.md')

    await waitFor(() => expect(api.flashqueryDocumentConnections).toHaveBeenCalledWith('workspace-1', {
      identifier: 'Docs/Preload.md',
      limit: 200,
      limit_per_chunk: 5,
    }))
  })

  it('T-I-080 mounts local path through fsReadFile and not flashqueryGetDocument', async () => {
    const api = makeElectronApi()
    setElectronApi(api)

    await renderEditor(localPath)

    expect(api.fsReadFile).toHaveBeenCalledWith(localPath)
    expect(api.flashqueryGetDocument).not.toHaveBeenCalled()
    expect(monacoMock().latestEditor().getValue()).toBe(`local:${localPath}`)
  })

  it('T-I-081 and T-I-082 cache by full URI and retrieve with monaco.Uri.parse', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    const cacheUri = 'flashquery://workspace-1/Docs/Cache-Only.md'

    const first = await renderEditor(cacheUri)
    await waitFor(() => expect(monacoMock().getModelByRawUri(cacheUri)).toBeTruthy())
    first.unmount()

    await renderEditor(cacheUri)

    expect(api.flashqueryGetDocument).toHaveBeenCalledTimes(1)
    expect(monacoMock().uriParseCalls).toContain(cacheUri)
    expect(monacoMock().uriFileCalls).not.toContain(cacheUri)
    expect(monaco.editor.getModel(monaco.Uri.parse(cacheUri) as any)).toBe(monacoMock().getModelByRawUri(cacheUri))
  })

  it('uses the Preview font size setting for rendered markdown preview text', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Heading\n\nPreview body',
      version_token: 'ignored-token',
      modified: 'ignored-modified',
    })
    setElectronApi(api)
    useSettingsStore.setState({ ...useSettingsStore.getState(), previewFontSize: 22 })

    await renderEditor('flashquery://workspace-1/Docs/Preview-Font.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))

    expect(screen.getByTestId('markdown-preview-body').style.fontSize).toBe('22px')
    expect(screen.getByRole('heading', { name: 'Heading', level: 1 }).style.fontSize).toBe('36px')
    expect(screen.getByText('Preview body')).toBeTruthy()
  })

  it('T-I-001 and T-I-002 MarkdownPreview wraps each heading-scoped section with body content', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: [
        'Intro before heading',
        '',
        '# First Section',
        '',
        'First paragraph',
        '',
        '- First item',
        '',
        '## Second Section',
        '',
        'Second paragraph',
      ].join('\n'),
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Chunks.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))

    const previewBody = await screen.findByTestId('markdown-preview-body')
    const chunks = [...previewBody.querySelectorAll<HTMLDivElement>('div[data-chunk-id]')]

    expect(chunks.map((chunk) => chunk.dataset.chunkId)).toEqual(['first-section', 'second-section'])
    expect(screen.getByText('Intro before heading').closest('[data-chunk-id]')).toBeNull()
    expect(chunks[0].querySelector('h1')?.id).toBe('first-section')
    expect(chunks[0].contains(screen.getByRole('heading', { name: 'First Section', level: 1 }))).toBe(true)
    expect(chunks[0].contains(screen.getByText('First paragraph'))).toBe(true)
    expect(chunks[0].contains(screen.getByText('First item'))).toBe(true)
    expect(chunks[0].contains(screen.getByRole('heading', { name: 'Second Section', level: 2 }))).toBe(false)
    expect(chunks[1].contains(screen.getByRole('heading', { name: 'Second Section', level: 2 }))).toBe(true)
    expect(chunks[1].contains(screen.getByText('Second paragraph'))).toBe(true)
  })

  it('T-I-003 MarkdownPreview chunk IDs match duplicate heading ID suffixes', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Repeat\n\nFirst\n\n## Repeat\n\nSecond\n\n# **Repeat**\n\nThird',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Duplicate-Chunks.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))

    const previewBody = await screen.findByTestId('markdown-preview-body')
    const chunks = [...previewBody.querySelectorAll<HTMLDivElement>('div[data-chunk-id]')]
    const headings = await screen.findAllByRole('heading', { name: 'Repeat' })

    expect(chunks.map((chunk) => chunk.dataset.chunkId)).toEqual(['repeat', 'repeat-1', 'repeat-2'])
    expect(headings.map((heading) => heading.id)).toEqual(['repeat', 'repeat-1', 'repeat-2'])
    for (const [index, chunk] of chunks.entries()) {
      expect(chunk.dataset.chunkId).toBe(headings[index].id)
      expect(chunk.contains(headings[index])).toBe(true)
    }
  })

  it('T-I-003 MarkdownPreview chunk IDs share Outline heading enumeration for frontmatter and HTML headings', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: [
        '---',
        'title: Notes',
        '---',
        '',
        '<h2>Notes</h2>',
        '',
        'HTML body',
        '',
        '## Notes',
        '',
        'First markdown body',
        '',
        '## Notes',
        '',
        'Second markdown body',
      ].join('\n'),
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Shared-Heading-Ids.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))

    const previewBody = await screen.findByTestId('markdown-preview-body')
    const chunks = [...previewBody.querySelectorAll<HTMLDivElement>('div[data-chunk-id]')]

    expect(chunks.map((chunk) => chunk.dataset.chunkId)).toEqual(['notes', 'notes-1', 'notes-2'])
    expect(previewBody.querySelector('[data-chunk-id="title-notes"]')).toBeNull()
    expect(screen.getByText('First markdown body').closest('[data-chunk-id]')?.getAttribute('data-chunk-id')).toBe('notes-1')
    expect(screen.getByText('Second markdown body').closest('[data-chunk-id]')?.getAttribute('data-chunk-id')).toBe('notes-2')
  })

  it('refreshes preview chunk wrappers on rerender and clears them when preview exits', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Before\n\nOld body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Chunk-Lifecycle.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))

    const previewBody = await screen.findByTestId('markdown-preview-body')
    await waitFor(() => expect(previewBody.querySelectorAll('[data-chunk-id="before"]')).toHaveLength(1))

    act(() => {
      monacoMock().setLatestValue('# After\n\nNew body')
    })

    await waitFor(() => {
      expect(screen.getByTestId('markdown-preview-body').querySelectorAll('[data-chunk-id="before"]')).toHaveLength(0)
      expect(screen.getByTestId('markdown-preview-body').querySelectorAll('[data-chunk-id="after"]')).toHaveLength(1)
    })
    expect(screen.getByTestId('markdown-preview-body').querySelector('[data-chunk-id="after"]')?.contains(screen.getByText('New body'))).toBe(true)

    fireEvent.click(screen.getByTitle('Show source'))

    await waitFor(() => expect(screen.queryByTestId('markdown-preview-body')).toBeNull())
    expect(document.querySelectorAll('[data-chunk-id]')).toHaveLength(0)
  })

  it('REQ-006 clears shared preview selection when preview exits', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Selected\n\nBody',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Selection-Cleanup.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    await screen.findByTestId('markdown-preview-body')

    act(() => usePreviewSelectionStore.getState().selectSection('selected', panelId))
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBe('selected')

    fireEvent.click(screen.getByTitle('Show source'))

    await waitFor(() => expect(screen.queryByTestId('markdown-preview-body')).toBeNull())
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBeNull()
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBeNull()
  })

  it('highlights a source heading line through the active editor registry callback', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# One\n\n## Target\n\nBody',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Source-Highlight.md')
    await waitFor(() => expect(getActiveEditorSnapshot(workspaceId).highlightSourceLine).toBeTypeOf('function'))
    vi.useFakeTimers()

    act(() => {
      getActiveEditorSnapshot(workspaceId).highlightSourceLine?.(3)
    })
    act(() => vi.advanceTimersByTime(0))

    const collection = monacoMock().latestEditor().decorationCollections[0]
    expect(collection.set).toHaveBeenCalledWith([expect.objectContaining({
      range: expect.objectContaining({ startLineNumber: 3, endLineNumber: 3 }),
      options: expect.objectContaining({
        isWholeLine: true,
        className: 'cate-outline-target-line',
      }),
    })])

    act(() => {
      getActiveEditorSnapshot(workspaceId).highlightSourceLine?.(1)
    })
    act(() => vi.advanceTimersByTime(0))

    expect(collection.clear).toHaveBeenCalled()
    expect(collection.set).toHaveBeenLastCalledWith([expect.objectContaining({
      range: expect.objectContaining({ startLineNumber: 1, endLineNumber: 1 }),
      options: expect.objectContaining({
        isWholeLine: true,
        className: 'cate-outline-target-line',
      }),
    })])

    act(() => vi.advanceTimersByTime(2200))

    expect(collection.clear).toHaveBeenCalled()
  })

  it('reveals a pending Markdown heading after the editor model loads', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# One\n\n## Target Section\n\nBody',
    })
    setElectronApi(api)

    setPendingReveal(panelId, { headingText: 'Target Section' })
    await renderEditor('flashquery://workspace-1/Docs/Pending-Reveal.md')
    await waitFor(() => expect(monacoMock().latestEditor().revealLineInCenter).toHaveBeenCalledWith(3))

    expect(monacoMock().latestEditor().setPosition).toHaveBeenCalledWith({ lineNumber: 3, column: 1 })
    expect(monacoMock().latestEditor().focus).toHaveBeenCalled()
  })

  it('T-I-023 and T-I-024 MarkdownPreview renders deterministic IDs for h1-h6 and duplicate headings', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Intro\n## Intro\n### Deep\n#### Four\n##### Five\n###### Six',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Ids.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))

    expect((await screen.findByRole('heading', { name: 'Intro', level: 1 })).id).toBe('intro')
    expect(screen.getByRole('heading', { name: 'Intro', level: 2 }).id).toBe('intro-1')
    expect(screen.getByRole('heading', { name: 'Deep', level: 3 }).id).toBe('deep')
    expect(screen.getByRole('heading', { name: 'Four', level: 4 }).id).toBe('four')
    expect(screen.getByRole('heading', { name: 'Five', level: 5 }).id).toBe('five')
    expect(screen.getByRole('heading', { name: 'Six', level: 6 }).id).toBe('six')
  })

  it('T-I-025 MarkdownPreview heading IDs use stripped text consistently with slugifyHeading', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# **Bold** [Link](https://example.com) `Code`!',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Formatted-Ids.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))

    expect((await screen.findByRole('heading', { name: 'Bold Link Code!', level: 1 })).id).toBe('bold-link-code')
  })

  it('T-I-028, T-I-029, and T-I-030 preview scrolls smoothly, selects the chunk, and dispatches no Graph Explorer event', async () => {
    const scrollIntoView = vi.fn()
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent')
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Intro\n## Target Heading',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Scroll.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const target = await screen.findByRole('heading', { name: 'Target Heading', level: 2 })
    await waitFor(() => expect(getActiveEditorSnapshot(workspaceId).markdownPreview).toBe(true))

    expect(() => getActiveEditorSnapshot(workspaceId).scrollPreviewToHeading?.('Missing Heading')).not.toThrow()
    act(() => {
      getActiveEditorSnapshot(workspaceId).scrollPreviewToHeading?.('Target Heading')
    })

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(target.classList.contains('cate-preview-target-heading')).toBe(false)
    expect(target.style.backgroundColor).toBe('')
    expect(target.style.outline).toBe('')
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('target-heading')
    await waitFor(() => {
      expect(screen.getByTestId('markdown-preview-body').querySelector('[data-chunk-id="target-heading"]')?.getAttribute('class') ?? '')
        .toContain('cate-preview-chunk-pinned')
    })
    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: `preview-section${'-select'}` }))
  })

  it('keeps the current source section visible when switching from source to preview', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Intro\n\nIntro body\n\n## Target Section\n\nTarget body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Source-To-Preview.md')
    monacoMock().latestEditor().setPosition({ lineNumber: 7, column: 1 })
    fireEvent.click(screen.getByTitle('Preview markdown'))

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' }))
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('target-section')
  })

  it('keeps a pending preview reveal visible after the canvas node is refocused', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Intro\n\nIntro body\n\n## Target Section\n\nTarget body',
    })
    setElectronApi(api)

    const canvasStore = createCanvasStore()
    canvasStore.getState().addNode(panelId, 'editor')
    const nodeId = canvasStore.getState().nodeForPanel(panelId)!
    canvasStore.getState().focusNode(nodeId)
    const panel = { ...makePanel('flashquery://workspace-1/Docs/Refocus-Reveal.md'), markdownPreview: true }
    seedWorkspace(panel)
    setPendingReveal(panelId, { headingText: 'Target Section' })

    render(
      <CanvasStoreProvider store={canvasStore}>
        <EditorPanel
          panelId={panelId}
          workspaceId={workspaceId}
          nodeId={nodeId}
          filePath={panel.filePath}
        />
      </CanvasStoreProvider>,
    )

    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1))
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('target-section')

    act(() => {
      canvasStore.getState().focusNode(nodeId)
    })
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(scrollIntoView).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('reveals the selected preview section when switching back to source', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# First Section\n\nFirst body\n\n## Second Section\n\nSecond body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-To-Source.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    await screen.findByText('Second body')
    act(() => usePreviewSelectionStore.getState().selectSection('second-section', panelId))

    fireEvent.click(screen.getByTitle('Show source'))

    expect(monacoMock().latestEditor().revealLineInCenter).toHaveBeenCalledWith(5)
    expect(monacoMock().latestEditor().setPosition).toHaveBeenCalledWith({ lineNumber: 5, column: 1 })
    expect(monacoMock().latestEditor().focus).toHaveBeenCalled()
  })

  it('T-I-024 and T-I-026 preview scroll can target duplicate heading occurrences by suffix id', async () => {
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Intro\n\nFirst\n\n## Intro\n\nSecond',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Duplicate-Scroll.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const headings = await screen.findAllByRole('heading', { name: 'Intro' })
    await waitFor(() => expect(getActiveEditorSnapshot(workspaceId).markdownPreview).toBe(true))
    const previewBody = screen.getByTestId('markdown-preview-body')

    act(() => {
      getActiveEditorSnapshot(workspaceId).scrollPreviewToHeading?.('Intro', 1)
    })

    expect(headings.map((heading) => heading.id)).toEqual(['intro', 'intro-1'])
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('intro-1')
    await waitFor(() => expect(previewBody.querySelector('[data-chunk-id="intro-1"]')?.getAttribute('class') ?? '').toContain('cate-preview-chunk-pinned'))
    expect(previewBody.querySelector('[data-chunk-id="intro"]')?.getAttribute('class') ?? '').not.toContain('cate-preview-chunk-pinned')

    act(() => {
      getActiveEditorSnapshot(workspaceId).scrollPreviewToHeading?.('Intro', 0)
    })
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('intro')
    await waitFor(() => expect(previewBody.querySelector('[data-chunk-id="intro"]')?.getAttribute('class') ?? '').toContain('cate-preview-chunk-pinned'))
    expect(previewBody.querySelector('[data-chunk-id="intro-1"]')?.getAttribute('class') ?? '').not.toContain('cate-preview-chunk-pinned')
  })

  it('T-I-004 and T-I-031 resolves nested preview targets to the enclosing chunk on hover', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# First Section\n\nParagraph with **nested emphasis**.\n\n- Nested list item',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Hover.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    await screen.findByText('nested emphasis')

    fireEvent.mouseOver(screen.getByText('nested emphasis'))
    expect(usePreviewSelectionStore.getState().getScope(panelId).hoveredChunkId).toBe('first-section')
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBe('first-section')

    fireEvent.mouseOut(screen.getByText('Nested list item'))
    expect(usePreviewSelectionStore.getState().getScope(panelId).hoveredChunkId).toBeNull()
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBeNull()
  })

  it('T-I-005 preserves drag text selection without pinning', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Drag Target\n\nSelectable body text',
    })
    setElectronApi(api)
    Object.defineProperty(window, 'getSelection', {
      configurable: true,
      value: () => ({ toString: () => 'Selectable' }),
    })

    await renderEditor('flashquery://workspace-1/Docs/Preview-Drag.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const text = await screen.findByText('Selectable body text')

    fireEvent.mouseDown(text, { clientX: 10, clientY: 10 })
    fireEvent.mouseUp(text, { clientX: 60, clientY: 10 })
    fireEvent.click(text)

    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBeNull()
  })

  it('T-I-006 and T-I-008 applies active, pinned, and caution classes to chunk wrappers', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Active Section\n\nActive body\n\n## Pinned Section\n\nPinned body\n\n## Risk Section\n\nRisk body\n\n## Selected Risk\n\nSelected risk body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Decorations.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const previewBody = await screen.findByTestId('markdown-preview-body')

    act(() => {
      usePreviewSelectionStore.getState().setPinnedChunkId('pinned-section', panelId)
      usePreviewSelectionStore.getState().setHoveredChunkId('active-section', panelId)
      usePreviewSelectionStore.getState().setCautionChunkIds(['risk-section', 'selected-risk'], panelId)
    })

    const active = previewBody.querySelector('[data-chunk-id="active-section"]')!
    const pinned = previewBody.querySelector('[data-chunk-id="pinned-section"]')!
    const caution = previewBody.querySelector('[data-chunk-id="risk-section"]')!
    const selectedCaution = previewBody.querySelector('[data-chunk-id="selected-risk"]')!

    expect(active.className).toContain('cate-preview-chunk-active')
    expect(pinned.className).toContain('cate-preview-chunk-pinned')
    expect(caution.className).toContain('cate-preview-chunk-caution')
    expect(caution.getAttribute('data-caution')).toBe('true')

    act(() => usePreviewSelectionStore.getState().selectSection('selected-risk', panelId))

    expect(selectedCaution.className).toContain('cate-preview-chunk-active')
    expect(selectedCaution.className).toContain('cate-preview-chunk-pinned')
    expect(selectedCaution.className).toContain('cate-preview-chunk-caution')
    expect(selectedCaution.className).toContain('border-orange-400')
    expect(selectedCaution.className).toContain('bg-orange-500/10')
    expect(selectedCaution.className).toContain('ring-orange-400/60')
    expect(selectedCaution.className).not.toContain('border-teal-400')
    expect(selectedCaution.className).not.toContain('bg-teal-500/10')
    expect(selectedCaution.className).not.toContain('ring-teal-400/50')
  })

  it('marks preview chunks with connection cards using a subtle left border', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Connected Section\n\nConnected body\n\n## Empty Section\n\nEmpty body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Connected.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const previewBody = await screen.findByTestId('markdown-preview-body')

    act(() => {
      usePreviewSelectionStore.getState().setConnectedChunkIds(['connected-section'], panelId)
    })

    const connected = previewBody.querySelector<HTMLElement>('[data-chunk-id="connected-section"]')!
    const empty = previewBody.querySelector<HTMLElement>('[data-chunk-id="empty-section"]')!

    expect(connected.getAttribute('data-connected')).toBe('true')
    expect(connected.style.borderLeftColor).toBe('rgba(45, 212, 191, 0.3)')
    expect(connected.style.borderLeftWidth).toBe('1px')
    expect(empty.getAttribute('data-connected')).toBeNull()
    expect(empty.style.borderLeftColor).toBe('')
  })

  it('T-I-007 leaves embeddings-only fixtures without caution decoration', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# Embeddings Only\n\nSimilarity body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Embeddings.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const previewBody = await screen.findByTestId('markdown-preview-body')

    expect(previewBody.querySelector('[data-caution="true"]')).toBeNull()
    expect(previewBody.querySelector('[data-chunk-id="embeddings-only"]')?.className).not.toContain('cate-preview-chunk-caution')
  })

  it('T-I-032 through T-I-035 pins, restores pinned scope after hover, and clears selection', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# First Section\n\nFirst body\n\n## Second Section\n\nSecond body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Selection.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    const first = await screen.findByText('First body')
    await screen.findByText('Second body')
    const secondChunk = screen.getByTestId('markdown-preview-body').querySelector('[data-chunk-id="second-section"]')!

    fireEvent.click(first)
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('first-section')
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBe('first-section')

    fireEvent.mouseOver(secondChunk)
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBe('second-section')

    fireEvent.mouseOut(secondChunk)
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBe('first-section')

    fireEvent.keyDown(screen.getByTestId('markdown-preview-body'), { key: 'Escape' })
    expect(usePreviewSelectionStore.getState().getScope(panelId).activeChunkId).toBeNull()

    act(() => usePreviewSelectionStore.getState().selectSection('first-section', panelId))
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('first-section')
    fireEvent.click(screen.getByTestId('markdown-preview-body'))
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBeNull()
  })

  it('REQ-007 keeps a pinned scope when Escape is owned by another editing surface', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '# First Section\n\nFirst body',
    })
    setElectronApi(api)

    await renderEditor('flashquery://workspace-1/Docs/Preview-Escape-Scope.md')
    fireEvent.click(screen.getByTitle('Preview markdown'))
    await screen.findByText('First body')

    act(() => usePreviewSelectionStore.getState().selectSection('first-section', panelId))
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('first-section')

    // Escape while a terminal owns focus must NOT clear the pinned scope.
    const terminal = document.createElement('div')
    terminal.className = 'xterm'
    const terminalInput = document.createElement('textarea')
    terminal.appendChild(terminalInput)
    document.body.appendChild(terminal)
    terminalInput.focus()
    fireEvent.keyDown(terminalInput, { key: 'Escape' })
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBe('first-section')

    // Escape with no foreign editing surface focused still clears (pin-then-Esc).
    terminalInput.blur()
    fireEvent.keyDown(screen.getByTestId('markdown-preview-body'), { key: 'Escape' })
    expect(usePreviewSelectionStore.getState().getScope(panelId).pinnedChunkId).toBeNull()

    terminal.remove()
  })
})

describe('EditorPanel FlashQuery save and dirty behavior', () => {
  it('T-I-083 saves vault editor through flashqueryWriteDocument with exactly three arguments', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('updated vault body')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(api.flashqueryWriteDocument).toHaveBeenCalledWith(
      'workspace-1',
      'Docs/Plan.md',
      'updated vault body',
    ))
    expect(api.flashqueryWriteDocument).toHaveBeenCalledTimes(1)
    expect(vi.mocked(api.flashqueryWriteDocument).mock.calls[0]).toHaveLength(3)
    expect(api.fsWriteFile).not.toHaveBeenCalled()
  })

  it('T-U-006 refreshes the agent vault-index cache after a successful FlashQuery document write', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryListVaultIndex).mockResolvedValueOnce([
      { filename: 'Plan.md', fullPath: 'Docs/Plan.md' },
    ])
    setElectronApi(api)
    useAgentStore.getState().init('agent-panel', workspaceId)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('updated vault body')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(api.flashqueryWriteDocument).toHaveBeenCalledWith(
      'workspace-1',
      'Docs/Plan.md',
      'updated vault body',
    ))
    await waitFor(() => expect(api.flashqueryListVaultIndex).toHaveBeenCalledWith('workspace-1'))
    expect(useAgentStore.getState().panels['agent-panel'].vaultIndex).toEqual([
      { filename: 'Plan.md', fullPath: 'Docs/Plan.md' },
    ])
  })

  it('T-I-084 saves local editor through fsWriteFile', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    await renderEditor(localPath)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('updated local body')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(api.fsWriteFile).toHaveBeenCalledWith(localPath, 'updated local body'))
    expect(api.flashqueryWriteDocument).not.toHaveBeenCalled()
  })

  it('T-I-085 successful vault save clears dirty state and removes dirty title marker', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('changed')
    })

    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(true)
    expect(useAppStore.getState().workspaces[0].panels[panelId].title).toBe('Plan.md •')

    act(() => {
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false))
    expect(useAppStore.getState().workspaces[0].panels[panelId].title).toBe('Plan.md')
  })

  it('T-I-086 REQ-020 failed vault save preserves editor text, dirty state, and surfaces a visible error', async () => {
    const api = makeElectronApi({ success: false, error: 'FlashQuery offline' })
    setElectronApi(api)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('changed')
      window.dispatchEvent(new Event('save-file'))
    })

    expect((await screen.findByRole('alert')).textContent).toBe('Save failed: FlashQuery offline')
    expect(monacoMock().latestEditor().getValue()).toBe('changed')
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(true)
  })

  it('T-I-087 attempts vault save even if the workspace status is disconnected', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    useAppStore.setState({
      flashqueryStatuses: {
        [workspaceId]: { status: 'disconnected', error: 'offline' },
      },
    } as any)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('changed while offline')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(api.flashqueryWriteDocument).toHaveBeenCalled())
  })

  it('T-I-091 and T-I-092 dirty vault edits use decoded basename and do not persist unsavedContent', async () => {
    const encodedUri = 'flashquery://workspace-1/Docs/Space%20Plan.md'
    await renderEditor(encodedUri)

    act(() => {
      monacoMock().setLatestValue('dirty')
    })

    const panel = useAppStore.getState().workspaces[0].panels[panelId]
    expect(panel.isDirty).toBe(true)
    expect(panel.title).toBe('Space Plan.md •')
    expect(panel.unsavedContent).toBeUndefined()
  })

  it('keeps a FlashQuery entry filename title stable across dirty edits and save', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    const encodedUri = 'flashquery://workspace-1/Product/Website/FQ%2520GSD%2520workflow%2520notes.md'
    const panel = makePanel(encodedUri)
    panel.title = 'Errors4'
    seedWorkspace(panel)

    render(<EditorPanel panelId={panelId} workspaceId={workspaceId} filePath={encodedUri} />)
    await waitFor(() => expect(monacoMock().latestEditor()?.getModel()).toBeTruthy())

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('dirty')
    })

    expect(useAppStore.getState().workspaces[0].panels[panelId].title).toBe('Errors4 •')

    act(() => {
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false))
    expect(useAppStore.getState().workspaces[0].panels[panelId].title).toBe('Errors4')
  })

  it('T-I-093 dirty vault close confirmation uses existing confirmUnsavedChanges flow and save registry', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('dirty close')
    })

    let proceed = false
    await act(async () => {
      proceed = await confirmCloseDirtyPanels([useAppStore.getState().workspaces[0].panels[panelId]])
    })

    expect(proceed).toBe(true)
    expect(api.confirmUnsavedChanges).toHaveBeenCalledWith({
      fileName: 'Plan.md',
      multiple: false,
      filePath: vaultUri,
    })
    expect(api.flashqueryWriteDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Plan.md', 'dirty close')
  })
})

describe('EditorPanel FlashQuery clipboard title action', () => {
  it('T-U-012 does not render FlashQuery title actions inside editor content', async () => {
    await renderEditor(vaultUri)
    expect(screen.queryByLabelText('Copy vault path or reference')).toBeNull()
    expect(screen.queryByLabelText('Refresh from vault')).toBeNull()
    expect(screen.queryByLabelText('Open frontmatter')).toBeNull()

    cleanup()
    monacoMock().reset()
    await renderEditor('flashquery://workspace-1/Docs/Clipboard.md?part=frontmatter')
    expect(screen.queryByLabelText('Copy vault path or reference')).toBeNull()

    cleanup()
    monacoMock().reset()
    await renderEditor(localPath)
    expect(screen.queryByLabelText('Copy vault path or reference')).toBeNull()
  })

  it('T-U-012 copies decoded vault paths and whole-document references from the editor title action', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    const encodedUri = 'flashquery://workspace-1/Docs/Space%20Plan.md'
    await renderEditor(encodedUri)

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('copy-path')
    act(() => dispatchTitleAction('copy-reference'))
    await waitFor(() => expect(api.showContextMenu).toHaveBeenCalledWith([
      { id: 'copy-path', label: 'Copy vault path' },
      { id: 'copy-reference', label: 'Copy as reference' },
    ]))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Docs/Space Plan.md'))

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('copy-reference')
    act(() => dispatchTitleAction('copy-reference'))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{{ref:Docs/Space Plan.md}}'))

    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining('%20'))
    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining('flashquery://'))
    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining('#'))
    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining(']('))
  })
})

describe('EditorPanel FlashQuery frontmatter behavior', () => {
  it('T-U-008 loads frontmatter with include frontmatter and creates a YAML model', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '',
      frontmatter: { title: 'Plan' },
    })
    setElectronApi(api)

    await renderEditor(frontmatterUri)

    expect(api.flashqueryGetDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Plan.md', { include: ['frontmatter'] })
    expect(monaco.editor.createModel).toHaveBeenCalledWith(
      expect.stringContaining('title'),
      'yaml',
      expect.anything(),
    )
    expect(screen.queryByTitle('Preview markdown')).toBeNull()
    expect(screen.queryByLabelText('Refresh from vault')).toBeNull()
  })

  it('T-U-008 saves frontmatter as a parsed frontmatter-only payload', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({
      body: '',
      frontmatter: { title: 'Old' },
    })
    setElectronApi(api)
    await renderEditor(frontmatterUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('title: Plan')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(api.flashqueryWriteDocument).toHaveBeenCalledWith(
      'workspace-1',
      'Docs/Plan.md',
      { frontmatter: { title: 'Plan' } },
    ))
  })

  it('T-U-008 REQ-020 blocks invalid YAML while preserving frontmatter text and dirty state', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({ body: '', frontmatter: {} })
    setElectronApi(api)
    await renderEditor(frontmatterUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('- bad')
      window.dispatchEvent(new Event('save-file'))
    })

    expect((await screen.findByRole('alert')).textContent).toMatch(/Invalid frontmatter YAML/)
    expect(monacoMock().latestEditor().getValue()).toBe('- bad')
    expect(api.flashqueryWriteDocument).not.toHaveBeenCalled()
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(true)
  })

  it('T-U-008 filters managed fields and treats managed-only edits as a clean no-op', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({ body: '', frontmatter: { fq_id: 'x' } })
    setElectronApi(api)
    await renderEditor(frontmatterUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('fq_id: x\ntitle: Plan')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(api.flashqueryWriteDocument).toHaveBeenCalledWith(
      'workspace-1',
      'Docs/Plan.md',
      { frontmatter: { title: 'Plan' } },
    ))

    vi.mocked(api.flashqueryWriteDocument).mockClear()
    act(() => {
      monacoMock().setLatestValue('fq_id: y')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false))
    expect(api.flashqueryWriteDocument).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('T-U-008 treats an empty frontmatter save as a clean no-op without write IPC', async () => {
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({ body: '', frontmatter: {} })
    setElectronApi(api)
    await renderEditor(frontmatterUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('')
      window.dispatchEvent(new Event('save-file'))
    })

    await waitFor(() => expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false))
    expect(api.flashqueryWriteDocument).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('EditorPanel FlashQuery refresh behavior', () => {
  it('T-U-009 clean refresh fetches body, updates content, and clears dirty state', async () => {
    const refreshUri = 'flashquery://workspace-1/Docs/RefreshClean.md'
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument)
      .mockResolvedValueOnce({ body: 'old body' })
      .mockResolvedValueOnce({ body: 'fresh body' })
      .mockResolvedValue({ body: 'fresh body' })
    setElectronApi(api)
    await renderEditor(refreshUri)
    await waitFor(() => expect(monacoMock().latestEditor().getValue()).toBe('old body'))

    act(() => dispatchTitleAction('refresh-from-vault'))

    await waitFor(() => expect(monacoMock().latestEditor().getValue()).toBe('fresh body'))
    expect(api.flashqueryGetDocument).toHaveBeenLastCalledWith('workspace-1', 'Docs/RefreshClean.md', { include: ['body'] })
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false)
  })

  it('T-U-009 dirty refresh supports Cancel and Discard and refresh', async () => {
    const refreshUri = 'flashquery://workspace-1/Docs/RefreshDirty.md'
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument)
      .mockResolvedValueOnce({ body: 'old body' })
      .mockResolvedValueOnce({ body: 'server body' })
    setElectronApi(api)
    await renderEditor(refreshUri)

    act(() => {
      monacoMock().setLatestValue('local dirty')
    })

    act(() => dispatchTitleAction('refresh-from-vault'))
    expect(await screen.findByRole('dialog', { name: 'Unsaved changes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(monacoMock().latestEditor().getValue()).toBe('local dirty')
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(true)

    act(() => dispatchTitleAction('refresh-from-vault'))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard and refresh' }))

    await waitFor(() => expect(monacoMock().latestEditor().getValue()).toBe('server body'))
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false)
  })

  it('T-U-009 dirty refresh supports Save and refresh', async () => {
    const refreshUri = 'flashquery://workspace-1/Docs/RefreshSave.md'
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument)
      .mockResolvedValueOnce({ body: 'old body' })
      .mockResolvedValueOnce({ body: 'saved server body' })
    setElectronApi(api)
    await renderEditor(refreshUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('body to save')
    })

    act(() => dispatchTitleAction('refresh-from-vault'))
    fireEvent.click(await screen.findByRole('button', { name: 'Save and refresh' }))

    await waitFor(() => expect(api.flashqueryWriteDocument).toHaveBeenCalledWith('workspace-1', 'Docs/RefreshSave.md', 'body to save'))
    await waitFor(() => expect(monacoMock().latestEditor().getValue()).toBe('saved server body'))
  })

  it('T-U-009 T-U-021 REQ-020 refresh failure preserves editor content and dirty state', async () => {
    const refreshUri = 'flashquery://workspace-1/Docs/RefreshFailure.md'
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument)
      .mockResolvedValueOnce({ body: 'old body' })
      .mockRejectedValueOnce(new Error('not found'))
    setElectronApi(api)
    await renderEditor(refreshUri)

    act(() => {
      monacoMock().setLatestValue('local dirty')
    })
    act(() => dispatchTitleAction('refresh-from-vault'))
    fireEvent.click(await screen.findByRole('button', { name: 'Discard and refresh' }))

    expect((await screen.findByRole('alert')).textContent).toBe('Refresh failed: Document not found in FlashQuery vault.')
    expect(monacoMock().latestEditor().getValue()).toBe('local dirty')
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(true)
  })

  it('T-U-009 T-U-021 REQ-020 disconnected refresh fails locally without issuing a read request', async () => {
    const refreshUri = 'flashquery://workspace-1/Docs/Disconnected.md'
    const api = makeElectronApi()
    vi.mocked(api.flashqueryGetDocument).mockResolvedValueOnce({ body: 'old body' })
    setElectronApi(api)
    await renderEditor(refreshUri)

    act(() => {
      statusListener?.({ workspaceId, status: 'disconnected', error: 'offline' })
    })
    act(() => dispatchTitleAction('refresh-from-vault'))

    expect((await screen.findByRole('alert')).textContent).toBe('Refresh failed: FlashQuery is disconnected.')
    expect(api.flashqueryGetDocument).toHaveBeenCalledTimes(1)
    expect(monacoMock().latestEditor().getValue()).toBe('old body')
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false)
  })
})

describe('EditorPanel FlashQuery diff guardrails', () => {
  it('uses fixed Monaco overflow widgets so canvas transforms do not offset editor context menus', async () => {
    const api = makeElectronApi()
    setElectronApi(api)

    await renderEditor(vaultUri)

    expect(monaco.editor.create).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ fixedOverflowWidgets: true }),
    )
  })

  it('T-I-088 and T-I-090 render vault diff requests as standard editors without local diff IPC', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    const diffVaultUri = 'flashquery://workspace-1/Docs/Diff-Only.md'

    await renderEditor(diffVaultUri, 'staged')

    expect(monaco.editor.createDiffEditor).not.toHaveBeenCalled()
    expect(monaco.editor.create).toHaveBeenCalled()
    expect(api.flashqueryGetDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Diff-Only.md', { include: ['body'] })
    expect(api.fsReadFile).not.toHaveBeenCalled()
    expect(api.gitDiff).not.toHaveBeenCalled()
    expect(api.gitDiffStaged).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledWith(
      '[EditorPanel] Git diff mode is not supported for FlashQuery vault documents:',
      diffVaultUri,
    )
  })

  it('T-I-089 preserves local staged diff behavior', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    seedWorkspace(makePanel(localPath, 'staged'))

    render(<EditorPanel panelId={panelId} workspaceId={workspaceId} filePath={localPath} />)

    await waitFor(() => expect(monaco.editor.createDiffEditor).toHaveBeenCalled())
    expect(monaco.editor.createDiffEditor).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ fixedOverflowWidgets: true }),
    )
    await waitFor(() => expect(api.gitDiffStaged).toHaveBeenCalledWith('/repo', 'Docs/Plan.md'))
    expect(api.flashqueryGetDocument).not.toHaveBeenCalled()
  })
})

describe('EditorPanel FlashQuery vault badge title chrome', () => {
  it('T-I-094 vault editor title bar renders the vault badge', () => {
    const panel = makePanel(vaultUri)
    seedWorkspace(panel)

    render(<EditorTitleChrome panel={panel} />)

    expect(screen.getByTestId('vault-badge').getAttribute('aria-label')).toBe('Vault · fq.local:3100')
    expect(screen.getByText('· fq.local:3100')).toBeTruthy()
  })

  it('T-I-096 local-file editor title bar does not render the vault badge', () => {
    const panel = makePanel(localPath)
    seedWorkspace(panel)

    render(<EditorTitleChrome panel={panel} />)

    expect(screen.queryByTestId('vault-badge')).toBeNull()
  })
})
