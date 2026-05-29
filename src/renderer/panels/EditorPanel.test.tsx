import React from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
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
import { useAppStore } from '../stores/appStore'
import { confirmCloseDirtyPanels } from '../lib/confirmCloseDirty'
import type { FlashQueryWriteResult, PanelState } from '../../shared/types'

type ElectronApiMock = Pick<
  Window['electronAPI'],
  | 'fsReadFile'
  | 'fsWriteFile'
  | 'flashqueryGetDocument'
  | 'flashqueryWriteDocument'
  | 'gitDiff'
  | 'gitDiffStaged'
  | 'saveFileDialog'
  | 'confirmUnsavedChanges'
>

const workspaceId = 'workspace-1'
const panelId = 'editor-1'
const vaultUri = 'flashquery://workspace-1/Docs/Plan.md'
const localPath = '/repo/Docs/Plan.md'

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
    gitDiff: vi.fn(() => Promise.resolve('')),
    gitDiffStaged: vi.fn(() => Promise.resolve('')),
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

beforeEach(() => {
  vi.useRealTimers()
  monacoMock().reset()
  global.ResizeObserver = class {
    observe() {}
    disconnect() {}
  } as any
  setElectronApi(makeElectronApi())
  seedWorkspace()
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

    expect(api.flashqueryGetDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Plan.md')
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

  it('T-I-086 failed vault save preserves dirty state and surfaces a visible error', async () => {
    const api = makeElectronApi({ success: false, error: 'FlashQuery offline' })
    setElectronApi(api)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('changed')
      window.dispatchEvent(new Event('save-file'))
    })

    expect((await screen.findByRole('alert')).textContent).toBe('Save failed: FlashQuery offline')
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

  it('T-I-093 dirty vault close confirmation uses existing confirmUnsavedChanges flow and save registry', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    await renderEditor(vaultUri)

    act(() => {
      monacoMock().focusLatestEditor()
      monacoMock().setLatestValue('dirty close')
    })

    const proceed = await confirmCloseDirtyPanels([useAppStore.getState().workspaces[0].panels[panelId]])

    expect(proceed).toBe(true)
    expect(api.confirmUnsavedChanges).toHaveBeenCalledWith({
      fileName: 'Plan.md',
      multiple: false,
      filePath: vaultUri,
    })
    expect(api.flashqueryWriteDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Plan.md', 'dirty close')
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
    expect(api.flashqueryGetDocument).toHaveBeenCalledWith('workspace-1', 'Docs/Diff-Only.md')
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
