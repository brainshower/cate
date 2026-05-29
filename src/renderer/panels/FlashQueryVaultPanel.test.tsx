import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import FlashQueryVaultPanel from './FlashQueryVaultPanel'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'
import type { FlashQueryStatusBroadcastPayload, FlashQueryVaultEntry } from '../../shared/types'

type ElectronApiMock = Pick<
  Window['electronAPI'],
  'flashqueryListVault' | 'flashqueryRetry' | 'onFlashQueryStatus' | 'showContextMenu'
>

const workspaceId = 'workspace-1'
let statusListener: ((payload: FlashQueryStatusBroadcastPayload) => void) | null = null
let createEditorSpy: ReturnType<typeof vi.fn>

const makeElectronApi = (
  entries: FlashQueryVaultEntry[] = [],
  childrenByPath: Record<string, FlashQueryVaultEntry[]> = {},
): ElectronApiMock => ({
  flashqueryListVault: vi.fn((_: string, vaultPath?: string) => Promise.resolve(
    vaultPath ? childrenByPath[vaultPath] ?? [] : entries,
  )),
  flashqueryRetry: vi.fn().mockResolvedValue(undefined),
  onFlashQueryStatus: vi.fn((callback) => {
    statusListener = callback
    return () => {
      statusListener = null
    }
  }),
  showContextMenu: vi.fn().mockResolvedValue(null),
})

const makeSequencedElectronApi = (
  rootResponses: Array<FlashQueryVaultEntry[] | Promise<FlashQueryVaultEntry[]>>,
  childrenByPath: Record<string, FlashQueryVaultEntry[]> = {},
): ElectronApiMock => {
  let rootIndex = 0
  return {
    flashqueryListVault: vi.fn((_: string, vaultPath?: string) => {
      if (vaultPath) return Promise.resolve(childrenByPath[vaultPath] ?? [])
      const response = rootResponses[Math.min(rootIndex, rootResponses.length - 1)] ?? []
      rootIndex += 1
      return Promise.resolve(response)
    }),
    flashqueryRetry: vi.fn().mockResolvedValue(undefined),
    onFlashQueryStatus: vi.fn((callback) => {
      statusListener = callback
      return () => {
        statusListener = null
      }
    }),
    showContextMenu: vi.fn().mockResolvedValue(null),
  }
}

function deferredEntries() {
  let resolve!: (entries: FlashQueryVaultEntry[]) => void
  const promise = new Promise<FlashQueryVaultEntry[]>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function setElectronApi(api: ElectronApiMock) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api,
  })
}

function seedWorkspace(connection?: { transport: 'http'; url: string }) {
  useAppStore.setState({
    selectedWorkspaceId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name: 'Workspace',
      color: '#5AD8B8',
      rootPath: '/workspace',
      panels: {},
      canvasNodes: {},
      regions: {},
      zoomLevel: 1,
      viewportOffset: { x: 0, y: 0 },
      focusedNodeId: null,
      flashqueryConnection: connection,
    }],
  })
}

function renderPanel() {
  return render(<FlashQueryVaultPanel panelId="panel-1" workspaceId={workspaceId} />)
}

beforeEach(() => {
  statusListener = null
  setElectronApi(makeElectronApi())
  seedWorkspace({ transport: 'http', url: 'https://flashquery.local:8787/mcp' })
  useUIStore.setState({ showFlashQueryConnectionDialog: false })
  createEditorSpy = vi.fn(() => 'editor-1')
  useAppStore.setState({ createEditor: createEditorSpy as any })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FlashQueryVaultPanel Header', () => {
  it('renders the vault identity, host context, status chip, and refresh button', async () => {
    renderPanel()

    const label = screen.getByTestId('vault-panel-header-label')
    const host = screen.getByTestId('vault-panel-header-host')
    const header = screen.getByTestId('vault-panel-header')

    expect(label.textContent).toBe('FlashQuery Vault')
    expect(label.className).toContain('text-secondary')
    expect(host.textContent).toBe('· flashquery.local:8787')
    expect(host.className).toContain('truncate')
    expect(label.compareDocumentPosition(host) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(header.className).toContain('h-8')
    expect(screen.getByLabelText('Refresh vault')).toBeTruthy()

    statusListener?.({ workspaceId, status: 'live' })

    expect(await screen.findByText('Live')).toBeTruthy()
  })

  it('keeps the FlashQuery Vault label visible while a long host is truncatable', () => {
    seedWorkspace({ transport: 'http', url: 'https://a-very-long-flashquery-hostname-that-should-truncate.example.internal:8787/mcp' })
    renderPanel()

    expect(screen.getByTestId('vault-panel-header-label').textContent).toBe('FlashQuery Vault')
    expect(screen.getByTestId('vault-panel-header-host').className).toContain('truncate')
  })
})

describe('FlashQueryVaultPanel State', () => {
  it('renders no-connection state and opens workspace settings', () => {
    seedWorkspace(undefined)
    renderPanel()

    expect(screen.getByTestId('vault-state-no-connection-icon')).toBeTruthy()
    expect(screen.getByText('No FlashQuery connection configured for this workspace.')).toBeTruthy()
    expect(screen.getByText("Right-click the workspace name in the sidebar and pick 'FlashQuery connection…' to set one up.")).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Open workspace settings' }))

    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
  })

  it('renders connecting skeleton rows and probing footer', () => {
    renderPanel()

    expect(screen.getByTestId('vault-skeleton-tree')).toBeTruthy()
    expect(screen.getByText('probing flashquery.local:8787')).toBeTruthy()
  })

  it('renders disconnected state, retries, and opens edit connection', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    renderPanel()

    statusListener?.({ workspaceId, status: 'disconnected', error: 'ECONNREFUSED' })

    expect(await screen.findByTestId('vault-state-disconnected-icon')).toBeTruthy()
    expect(await screen.findByText("Can't reach FlashQuery.")).toBeTruthy()
    expect(screen.getByText('ECONNREFUSED')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit connection' }))

    expect(api.flashqueryRetry).toHaveBeenCalledWith(workspaceId)
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
  })

  it('renders an empty-vault state without a create action', async () => {
    renderPanel()
    statusListener?.({ workspaceId, status: 'live' })

    expect(await screen.findByText('This vault has no documents yet.')).toBeTruthy()
    expect(screen.getByTestId('vault-state-empty-icon')).toBeTruthy()
    expect(screen.getByText('Create a document in FlashQuery to see it here.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /create/i })).toBeNull()
  })

  it('renders a populated tree from live root entries', async () => {
    setElectronApi(makeElectronApi([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
      { name: 'Project.md', title: 'Project Brief', type: 'document', vaultPath: 'Project.md' },
    ]))
    renderPanel()
    statusListener?.({ workspaceId, status: 'live' })

    await waitFor(() => expect(screen.getByText('Notes')).toBeTruthy())
    expect(screen.getByText('Project Brief')).toBeTruthy()
  })
})

describe('FlashQueryVaultPanel row and folder behavior', () => {
  async function renderLiveTree(
    entries: FlashQueryVaultEntry[],
    childrenByPath: Record<string, FlashQueryVaultEntry[]> = {},
  ) {
    const api = makeElectronApi(entries, childrenByPath)
    setElectronApi(api)
    renderPanel()
    statusListener?.({ workspaceId, status: 'live' })
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledWith(workspaceId))
    return api
  }

  it('renders folder and document rows with labels and indentation', async () => {
    await renderLiveTree([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
      { name: 'Project.md', title: 'Project Brief', type: 'document', vaultPath: 'Project.md' },
    ])

    expect(screen.getByRole('treeitem', { name: /Notes/ })).toHaveProperty('style.paddingLeft', '8px')
    expect(screen.getByRole('treeitem', { name: /Project Brief/ })).toHaveProperty('style.paddingLeft', '8px')
    expect(screen.getByTestId('vault-row-chevron-Notes')).toBeTruthy()
    expect(screen.getByTestId('vault-row-icon-Notes')).toBeTruthy()
    expect(screen.getByTestId('vault-row-icon-Project.md')).toBeTruthy()
  })

  it('loads a folder once when expanded and shows a folder loading indicator', async () => {
    const api = await renderLiveTree(
      [{ name: 'Notes', type: 'folder', vaultPath: 'Notes' }],
      { Notes: [{ name: 'Daily.md', type: 'document', vaultPath: 'Notes/Daily.md' }] },
    )

    fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))

    expect(await screen.findByText('Daily.md')).toBeTruthy()
    expect(api.flashqueryListVault).toHaveBeenCalledWith(workspaceId, 'Notes')

    fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))
    fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))

    expect(api.flashqueryListVault).toHaveBeenCalledTimes(2)
  })

  it('shows a folder loading indicator while lazy folder fetch is in flight', async () => {
    const pending = deferredEntries()
    const rootEntries: FlashQueryVaultEntry[] = [{ name: 'Notes', type: 'folder', vaultPath: 'Notes' }]
    const api: ElectronApiMock = {
      flashqueryListVault: vi.fn((_: string, vaultPath?: string) => {
        if (vaultPath === 'Notes') return pending.promise
        return Promise.resolve(rootEntries)
      }),
      flashqueryRetry: vi.fn().mockResolvedValue(undefined),
      onFlashQueryStatus: vi.fn((callback) => {
        statusListener = callback
        return () => {
          statusListener = null
        }
      }),
      showContextMenu: vi.fn().mockResolvedValue(null),
    }
    setElectronApi(api)
    renderPanel()
    statusListener?.({ workspaceId, status: 'live' })
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledWith(workspaceId))

    fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))

    expect(await screen.findByTestId('vault-loading-Notes')).toBeTruthy()

    pending.resolve([{ name: 'Daily.md', type: 'document', vaultPath: 'Notes/Daily.md' }])
    expect(await screen.findByText('Daily.md')).toBeTruthy()
    await waitFor(() => expect(screen.queryByTestId('vault-loading-Notes')).toBeNull())
  })

  it('selects a document row on single click without opening it', async () => {
    await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Project.md' },
    ])

    fireEvent.click(screen.getByRole('treeitem', { name: /Project.md/ }))

    expect(screen.getByRole('treeitem', { name: /Project.md/ }).getAttribute('aria-selected')).toBe('true')
    expect(createEditorSpy).not.toHaveBeenCalled()
  })

  it('opens a document row in the center dock on double click', async () => {
    await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Project.md' },
    ])

    fireEvent.doubleClick(screen.getByRole('treeitem', { name: /Project.md/ }))

    expect(createEditorSpy).toHaveBeenCalledWith(
      workspaceId,
      'flashquery://workspace-1/Project.md',
      undefined,
      { target: 'dock', zone: 'center' },
    )
  })

  it('opens document context actions through exactly Open and Open on Canvas', async () => {
    const api = await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Project.md' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('open-on-canvas')

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))

    await waitFor(() => expect(api.showContextMenu).toHaveBeenCalledTimes(1))
    expect(api.showContextMenu).toHaveBeenCalledWith([
      { id: 'open', label: 'Open' },
      { id: 'open-on-canvas', label: 'Open on Canvas' },
    ])
    expect(createEditorSpy).toHaveBeenCalledWith(
      workspaceId,
      'flashquery://workspace-1/Project.md',
      undefined,
      { target: 'canvas' },
    )
  })

  it('opens the document in dock mode from the Open context menu action', async () => {
    const api = await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Project.md' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('open')

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))

    await waitFor(() => expect(createEditorSpy).toHaveBeenCalledWith(
      workspaceId,
      'flashquery://workspace-1/Project.md',
      undefined,
      { target: 'dock', zone: 'center' },
    ))
  })

  it('does not show a context menu for folder rows', async () => {
    const api = await renderLiveTree([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
    ])

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Notes/ }))

    expect(api.showContextMenu).not.toHaveBeenCalled()
  })

  it('supports visible-row multi-select with modifier and shift clicks', async () => {
    await renderLiveTree([
      { name: 'A.md', type: 'document', vaultPath: 'A.md' },
      { name: 'B.md', type: 'document', vaultPath: 'B.md' },
      { name: 'C.md', type: 'document', vaultPath: 'C.md' },
    ])

    fireEvent.click(screen.getByRole('treeitem', { name: /A.md/ }))
    fireEvent.click(screen.getByRole('treeitem', { name: /C.md/ }), { shiftKey: true })

    expect(screen.getByRole('treeitem', { name: /A.md/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('treeitem', { name: /B.md/ }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('treeitem', { name: /C.md/ }).getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByRole('treeitem', { name: /B.md/ }), { metaKey: true })

    expect(screen.getByRole('treeitem', { name: /B.md/ }).getAttribute('aria-selected')).toBe('false')
  })
})

describe('FlashQueryVaultPanel refresh behavior and design tokens', () => {
  async function renderLiveTreeWithApi(api: ElectronApiMock) {
    setElectronApi(api)
    renderPanel()
    statusListener?.({ workspaceId, status: 'live' })
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledWith(workspaceId))
  }

  it('refresh calls the root vault listing', async () => {
    const api = makeSequencedElectronApi([
      [{ name: 'A.md', type: 'document', vaultPath: 'A.md' }],
      [{ name: 'B.md', type: 'document', vaultPath: 'B.md' }],
    ])
    await renderLiveTreeWithApi(api)

    fireEvent.click(screen.getByLabelText('Refresh vault'))

    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledTimes(2))
    expect(api.flashqueryListVault).toHaveBeenLastCalledWith(workspaceId)
    expect(await screen.findByText('B.md')).toBeTruthy()
  })

  it('ignores duplicate refresh clicks while root reload is in flight', async () => {
    const pending = deferredEntries()
    const api = makeSequencedElectronApi([
      [{ name: 'A.md', type: 'document', vaultPath: 'A.md' }],
      pending.promise,
    ])
    await renderLiveTreeWithApi(api)

    fireEvent.click(screen.getByLabelText('Refresh vault'))
    fireEvent.click(screen.getByLabelText('Refresh vault'))

    expect(api.flashqueryListVault).toHaveBeenCalledTimes(2)

    pending.resolve([{ name: 'B.md', type: 'document', vaultPath: 'B.md' }])
    expect(await screen.findByText('B.md')).toBeTruthy()
  })

  it('preserves expanded folders that still exist after refresh', async () => {
    const api = makeSequencedElectronApi(
      [
        [{ name: 'Notes', type: 'folder', vaultPath: 'Notes' }],
        [{ name: 'Notes', type: 'folder', vaultPath: 'Notes' }],
      ],
      { Notes: [{ name: 'Daily.md', type: 'document', vaultPath: 'Notes/Daily.md' }] },
    )
    await renderLiveTreeWithApi(api)
    fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))
    expect(await screen.findByText('Daily.md')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Refresh vault'))

    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledTimes(3))
    expect(screen.getByText('Daily.md')).toBeTruthy()
  })

  it('removes expansion and selection for vault paths missing after refresh', async () => {
    const api = makeSequencedElectronApi(
      [
        [{ name: 'Notes', type: 'folder', vaultPath: 'Notes' }],
        [{ name: 'Other.md', type: 'document', vaultPath: 'Other.md' }],
      ],
      { Notes: [{ name: 'Daily.md', type: 'document', vaultPath: 'Notes/Daily.md' }] },
    )
    await renderLiveTreeWithApi(api)
    fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))
    fireEvent.click(await screen.findByRole('treeitem', { name: /Daily.md/ }))
    expect(screen.getByRole('treeitem', { name: /Daily.md/ }).getAttribute('aria-selected')).toBe('true')

    fireEvent.click(screen.getByLabelText('Refresh vault'))

    await waitFor(() => expect(screen.queryByText('Daily.md')).toBeNull())
    expect(screen.queryByRole('treeitem', { name: /Notes/ })).toBeNull()
  })

  it('keeps a selected row selected when its vault path remains after refresh', async () => {
    const api = makeSequencedElectronApi([
      [{ name: 'A.md', type: 'document', vaultPath: 'A.md' }],
      [{ name: 'A.md', title: 'A title', type: 'document', vaultPath: 'A.md' }],
    ])
    await renderLiveTreeWithApi(api)
    fireEvent.click(screen.getByRole('treeitem', { name: /A.md/ }))

    fireEvent.click(screen.getByLabelText('Refresh vault'))

    expect(await screen.findByRole('treeitem', { name: /A title/ })).toHaveProperty('ariaSelected', 'true')
  })

  it('does not mutate open editor panels during refresh', async () => {
    const api = makeSequencedElectronApi([
      [{ name: 'A.md', type: 'document', vaultPath: 'A.md' }],
      [{ name: 'A.md', type: 'document', vaultPath: 'A.md' }],
    ])
    seedWorkspace({ transport: 'http', url: 'https://flashquery.local:8787/mcp' })
    useAppStore.setState((state) => ({
      workspaces: state.workspaces.map((workspace) => workspace.id === workspaceId
        ? {
            ...workspace,
            panels: {
              editor_existing: {
                id: 'editor_existing',
                type: 'editor',
                title: 'Existing.md',
                isDirty: false,
                filePath: 'flashquery://workspace-1/Existing.md',
              },
            },
          }
        : workspace),
    }))
    await renderLiveTreeWithApi(api)

    fireEvent.click(screen.getByLabelText('Refresh vault'))
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledTimes(2))

    const panels = useAppStore.getState().workspaces.find((workspace) => workspace.id === workspaceId)?.panels
    expect(Object.keys(panels ?? {})).toEqual(['editor_existing'])
    expect(createEditorSpy).not.toHaveBeenCalled()
  })

  it('does not render forbidden stock neutral utility classes', () => {
    const rendered = render(<FlashQueryVaultPanel panelId="panel-1" workspaceId={workspaceId} />).container.innerHTML
    const forbiddenStockNeutralPattern = /\b(?:gray|slate|zinc)\b/

    expect(rendered).not.toMatch(forbiddenStockNeutralPattern)
  })
})
