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
    setValue: (value: string) => void
    isDisposed: () => boolean
    dispose: () => void
  }
  type MockEditor = {
    model: MockModel | null
    focusListeners: Listener[]
    changeListeners: Listener[]
    getValue: () => string
    getModel: () => MockModel | null
    setModel: (model: MockModel) => void
    onDidFocusEditorText: (listener: Listener) => { dispose: () => void }
    onDidChangeModelContent: (listener: Listener) => { dispose: () => void }
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
      focusListeners: [],
      changeListeners: [],
      getValue: () => editor.model?.getValue() ?? '',
      getModel: () => editor.model,
      setModel: (model) => { editor.model = model },
      onDidFocusEditorText: (listener) => {
        editor.focusListeners.push(listener)
        return { dispose: () => { editor.focusListeners = editor.focusListeners.filter((item) => item !== listener) } }
      },
      onDidChangeModelContent: (listener) => {
        editor.changeListeners.push(listener)
        return { dispose: () => { editor.changeListeners = editor.changeListeners.filter((item) => item !== listener) } }
      },
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
import { useAgentStore } from '../../agent/renderer/agentStore'
import { useAppStore } from '../stores/appStore'
import { confirmCloseDirtyPanels } from '../lib/confirmCloseDirty'
import type { FlashQueryStatusBroadcastPayload, FlashQueryWriteResult, PanelState } from '../../shared/types'

type ElectronApiMock = Pick<
  Window['electronAPI'],
  | 'fsReadFile'
  | 'fsWriteFile'
  | 'flashqueryGetDocument'
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

function EditorTitleChrome({ panel }: { panel: PanelState }) {
  const workspace = useAppStore.getState().workspaces.find((item) => item.id === workspaceId)
  const connectionUrl = workspace?.flashqueryConnection?.transport === 'http'
    ? workspace.flashqueryConnection.url
    : undefined

  return (
    <div>
      <span>{panel.title}</span>
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
  seedWorkspace()
  useAgentStore.setState({ panels: {} })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('EditorPanel FlashQuery URI routing', () => {
  it('T-I-079 mounts vault URI through flashqueryGetDocument and not fsReadFile', async () => {
    const api = makeElectronApi()
    setElectronApi(api)

    await renderEditor(vaultUri)

    expect(api.flashqueryGetDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Plan.md', { include: ['body'] })
    expect(api.fsReadFile).not.toHaveBeenCalled()
    expect(monacoMock().latestEditor().getValue()).toBe('vault body')
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
  it('T-U-012 shows Clipboard for FlashQuery body and frontmatter editors only', async () => {
    await renderEditor(vaultUri)
    expect(screen.getByLabelText('Copy vault path or reference')).toBeTruthy()

    cleanup()
    monacoMock().reset()
    await renderEditor('flashquery://workspace-1/Docs/Clipboard.md?part=frontmatter')
    expect(screen.getByLabelText('Copy vault path or reference')).toBeTruthy()

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
    fireEvent.click(screen.getByLabelText('Copy vault path or reference'))
    await waitFor(() => expect(api.showContextMenu).toHaveBeenCalledWith([
      { id: 'copy-path', label: 'Copy vault path' },
      { id: 'copy-reference', label: 'Copy as reference' },
    ]))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Docs/Space Plan.md'))

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('copy-reference')
    fireEvent.click(screen.getByLabelText('Copy vault path or reference'))
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
    setElectronApi(api)
    await renderEditor(refreshUri)

    fireEvent.click(screen.getByLabelText('Refresh from vault'))

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

    fireEvent.click(screen.getByLabelText('Refresh from vault'))
    expect(await screen.findByRole('dialog', { name: 'Unsaved changes' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(monacoMock().latestEditor().getValue()).toBe('local dirty')
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(true)

    fireEvent.click(screen.getByLabelText('Refresh from vault'))
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

    fireEvent.click(screen.getByLabelText('Refresh from vault'))
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
    fireEvent.click(screen.getByLabelText('Refresh from vault'))
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
    fireEvent.click(screen.getByLabelText('Refresh from vault'))

    expect((await screen.findByRole('alert')).textContent).toBe('Refresh failed: FlashQuery is disconnected.')
    expect(api.flashqueryGetDocument).toHaveBeenCalledTimes(1)
    expect(monacoMock().latestEditor().getValue()).toBe('old body')
    expect(useAppStore.getState().workspaces[0].panels[panelId].isDirty).toBe(false)
  })
})

describe('EditorPanel FlashQuery diff guardrails', () => {
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
