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

import FlashQueryVaultPanel from './FlashQueryVaultPanel'
import { SidebarViewContent, VIEW_META } from '../sidebar/Sidebar'
import { useAgentStore } from '../../agent/renderer/agentStore'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'
import type { FlashQueryStatusBroadcastPayload, FlashQueryVaultEntry } from '../../shared/types'
import { Vault } from '@phosphor-icons/react'

type ElectronApiMock = Pick<
  Window['electronAPI'],
  | 'flashqueryListVault'
  | 'flashqueryListVaultIndex'
  | 'flashqueryRetry'
  | 'flashqueryCreateDocument'
  | 'flashqueryManageDirectory'
  | 'flashqueryMoveDocument'
  | 'flashqueryRemoveDocument'
  | 'onFlashQueryStatus'
  | 'showContextMenu'
>

const workspaceId = 'workspace-1'
let statusListener: ((payload: FlashQueryStatusBroadcastPayload) => void) | null = null
let createEditorSpy: ReturnType<typeof vi.fn>
let updatePanelTitleSpy: ReturnType<typeof vi.fn>

const makeElectronApi = (
  entries: FlashQueryVaultEntry[] = [],
  childrenByPath: Record<string, FlashQueryVaultEntry[]> = {},
): ElectronApiMock => ({
  flashqueryListVault: vi.fn((_: string, vaultPath?: string) => Promise.resolve(
    vaultPath ? childrenByPath[vaultPath] ?? [] : entries,
  )),
  flashqueryListVaultIndex: vi.fn(() => Promise.resolve([])),
  flashqueryRetry: vi.fn().mockResolvedValue(undefined),
  flashqueryCreateDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
  flashqueryManageDirectory: vi.fn().mockResolvedValue({ success: true, modified: '' }),
  flashqueryMoveDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
  flashqueryRemoveDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
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
    flashqueryListVaultIndex: vi.fn(() => Promise.resolve([])),
    flashqueryRetry: vi.fn().mockResolvedValue(undefined),
    flashqueryCreateDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
    flashqueryManageDirectory: vi.fn().mockResolvedValue({ success: true, modified: '' }),
    flashqueryMoveDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
    flashqueryRemoveDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
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

function emitStatus(payload: FlashQueryStatusBroadcastPayload) {
  act(() => {
    statusListener?.(payload)
  })
}

beforeEach(() => {
  statusListener = null
  setElectronApi(makeElectronApi())
  seedWorkspace({ transport: 'http', url: 'https://flashquery.local:8787/mcp' })
  useUIStore.setState({ showFlashQueryConnectionDialog: false })
  useAgentStore.setState({ panels: {} })
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
  createEditorSpy = vi.fn(() => 'editor-1')
  updatePanelTitleSpy = vi.fn()
  useAppStore.setState({
    createEditor: createEditorSpy as any,
    updatePanelTitle: updatePanelTitleSpy as any,
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FlashQueryVaultPanel Header', () => {
  it('T-U-011 keeps the Sidebar flashqueryVault icon/title and mount path wired to FlashQueryVaultPanel', async () => {
    expect(VIEW_META.flashqueryVault).toEqual({
      icon: Vault,
      title: 'FlashQuery Vault',
    })

    render(<SidebarViewContent view="flashqueryVault" rootPath="/workspace" />)

    expect(await screen.findByTestId('vault-panel-header')).toBeTruthy()
    emitStatus({ workspaceId, status: 'live' })
    await waitFor(() => expect(window.electronAPI.flashqueryListVault).toHaveBeenCalledWith(workspaceId))
  })

  it('renders only net-new header chrome while wrapper owns the vault identity', async () => {
    renderPanel()

    const host = screen.getByTestId('vault-panel-header-host')
    const header = screen.getByTestId('vault-panel-header')

    expect(screen.queryByTestId('vault-panel-header-label')).toBeNull()
    expect(screen.queryByText('FlashQuery Vault')).toBeNull()
    expect(host.textContent).toBe('· flashquery.local:8787')
    expect(host.className).toContain('truncate')
    expect(header.querySelector('[data-testid="vault-panel-header-icon"]')).toBeNull()
    expect(header.className).toContain('h-8')
    expect(screen.getByLabelText('Refresh vault')).toBeTruthy()

    emitStatus({ workspaceId, status: 'live' })

    expect(await screen.findByText('Live')).toBeTruthy()
  })

  it('keeps the long host truncatable while wrapper owns the FlashQuery Vault label', () => {
    seedWorkspace({ transport: 'http', url: 'https://a-very-long-flashquery-hostname-that-should-truncate.example.internal:8787/mcp' })
    renderPanel()

    expect(screen.queryByText('FlashQuery Vault')).toBeNull()
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

    emitStatus({ workspaceId, status: 'disconnected', error: 'ECONNREFUSED' })

    expect(await screen.findByTestId('vault-state-disconnected-icon')).toBeTruthy()
    expect(await screen.findByText("Can't reach FlashQuery.")).toBeTruthy()
    expect(screen.getByText('ECONNREFUSED')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit connection' }))

    expect(api.flashqueryRetry).toHaveBeenCalledWith(workspaceId)
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
  })

  it('renders an empty-vault state without a create action', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    expect(await screen.findByText('This vault has no documents yet.')).toBeTruthy()
    expect(screen.getByTestId('vault-state-empty-icon')).toBeTruthy()
    expect(screen.getByText('Create a document in FlashQuery to see it here.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /create/i })).toBeNull()

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('new-folder')
    fireEvent.contextMenu(screen.getByText('This vault has no documents yet.'))

    const input = await screen.findByPlaceholderText('folder name')
    fireEvent.change(input, { target: { value: 'Ideas' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(api.flashqueryManageDirectory).toHaveBeenCalledWith(workspaceId, 'create', ['Ideas']))
  })

  it('renders document filenames rather than frontmatter titles in the vault tree', async () => {
    setElectronApi(makeElectronApi([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
      { name: 'Project.md', title: 'Project Brief', type: 'document', vaultPath: 'Project.md' },
    ]))
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    await waitFor(() => expect(screen.getByText('Notes')).toBeTruthy())
    expect(screen.getByText('Project.md')).toBeTruthy()
    expect(screen.queryByText('Project Brief')).toBeNull()
  })

  it('T-U-006 refreshes the agent vault-index cache after a successful vault tree refresh', async () => {
    const api = makeElectronApi([
      { name: 'Project.md', type: 'document', vaultPath: 'Project.md' },
    ])
    vi.mocked(api.flashqueryListVaultIndex).mockResolvedValueOnce([
      { filename: 'Project.md', fullPath: 'Project.md' },
    ])
    setElectronApi(api)
    useAgentStore.getState().init('agent-panel', workspaceId)

    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledWith(workspaceId))
    await waitFor(() => expect(api.flashqueryListVaultIndex).toHaveBeenCalledWith(workspaceId))
    expect(useAgentStore.getState().panels['agent-panel'].vaultIndex).toEqual([
      { filename: 'Project.md', fullPath: 'Project.md' },
    ])
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
    emitStatus({ workspaceId, status: 'live' })
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledWith(workspaceId))
    return api
  }

  it('renders folder and document rows with labels and indentation', async () => {
    await renderLiveTree([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
      { name: 'Project.md', title: 'Project Brief', type: 'document', vaultPath: 'Project.md' },
    ])

    expect(screen.getByRole('treeitem', { name: /Notes/ })).toHaveProperty('style.paddingLeft', '8px')
    expect(screen.getByRole('treeitem', { name: /Project.md/ })).toHaveProperty('style.paddingLeft', '8px')
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
      flashqueryListVaultIndex: vi.fn(() => Promise.resolve([])),
      flashqueryRetry: vi.fn().mockResolvedValue(undefined),
      flashqueryCreateDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
      flashqueryManageDirectory: vi.fn().mockResolvedValue({ success: true, modified: '' }),
      flashqueryMoveDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
      flashqueryRemoveDocument: vi.fn().mockResolvedValue({ success: true, modified: '' }),
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
    emitStatus({ workspaceId, status: 'live' })
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledWith(workspaceId))

    fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))

    expect(await screen.findByTestId('vault-loading-Notes')).toBeTruthy()

    await act(async () => {
      pending.resolve([{ name: 'Daily.md', type: 'document', vaultPath: 'Notes/Daily.md' }])
    })
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
    expect(updatePanelTitleSpy).toHaveBeenCalledWith(workspaceId, 'editor-1', 'Project.md')
  })

  it('opens a vault document with the filename as the editor title when metadata/path differ', async () => {
    await renderLiveTree([
      {
        name: 'Errors 4.md',
        title: 'FQ GSD workflow notes',
        type: 'document',
        vaultPath: 'Product/Website/FQ GSD workflow notes.md',
      },
    ])

    fireEvent.doubleClick(screen.getByRole('treeitem', { name: /Errors 4.md/ }))

    expect(createEditorSpy).toHaveBeenCalledWith(
      workspaceId,
      'flashquery://workspace-1/Product/Website/FQ%20GSD%20workflow%20notes.md',
      undefined,
      { target: 'dock', zone: 'center' },
    )
    expect(updatePanelTitleSpy).toHaveBeenCalledWith(workspaceId, 'editor-1', 'Errors 4.md')
  })

  it('T-U-007 opens document context actions with copy path and reference utilities', async () => {
    const api = await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Project.md' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('open-on-canvas')

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))

    await waitFor(() => expect(api.showContextMenu).toHaveBeenCalledTimes(1))
    expect(api.showContextMenu).toHaveBeenCalledWith([
      { id: 'open', label: 'Open' },
      { id: 'open-frontmatter', label: 'Open frontmatter' },
      { id: 'open-on-canvas', label: 'Open on Canvas' },
      { type: 'separator' },
      { id: 'copy-path', label: 'Copy vault path' },
      { id: 'copy-reference', label: 'Copy as reference' },
      { type: 'separator' },
      { id: 'rename', label: 'Rename…', accelerator: 'Return' },
      { id: 'delete', label: 'Delete', accelerator: 'Cmd+Backspace' },
    ])
    expect(createEditorSpy).toHaveBeenCalledWith(
      workspaceId,
      'flashquery://workspace-1/Project.md',
      undefined,
      { target: 'canvas' },
    )
  })

  it('T-U-012 T-U-021 REQ-020 copies exact vault tree paths and whole-document references', async () => {
    const api = await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Docs/Project.md' },
    ])

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('copy-path')
    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Docs/Project.md'))

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('copy-reference')
    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{{ref:Docs/Project.md}}'))

    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining('flashquery://'))
    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining('#'))
    expect(navigator.clipboard.writeText).not.toHaveBeenCalledWith(expect.stringContaining(']('))
  })

  it('T-U-007 opens frontmatter from the document context menu with a frontmatter URI', async () => {
    const api = await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Project.md' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('open-frontmatter')

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))

    await waitFor(() => expect(createEditorSpy).toHaveBeenCalledWith(
      workspaceId,
      'flashquery://workspace-1/Project.md?part=frontmatter',
      undefined,
      { target: 'dock', zone: 'center' },
    ))
    expect(updatePanelTitleSpy).toHaveBeenCalledWith(workspaceId, 'editor-1', 'Project.md Frontmatter')
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

  it('creates a folder under a folder row through FlashQuery MCP directory management', async () => {
    const api = await renderLiveTree([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('new-folder')

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Notes/ }))

    const input = await screen.findByPlaceholderText('folder name')
    fireEvent.change(input, { target: { value: 'Ideas' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(api.flashqueryManageDirectory).toHaveBeenCalledWith(
      workspaceId,
      'create',
      ['Notes/Ideas'],
    ))
  })

  it('creates a root document from empty vault space through FlashQuery MCP write_document create mode', async () => {
    const api = await renderLiveTree([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('new-file')

    fireEvent.contextMenu(screen.getByRole('tree', { name: 'FlashQuery vault' }))

    const input = await screen.findByPlaceholderText('file name')
    fireEvent.change(input, { target: { value: 'Draft' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(api.flashqueryCreateDocument).toHaveBeenCalledWith(
      workspaceId,
      'Draft.md',
      'Draft',
    ))
  })

  it('renames documents and folders inline, then deletes folders through FlashQuery MCP tools', async () => {
    const api = await renderLiveTree([
      { name: 'Notes', type: 'folder', vaultPath: 'Notes' },
      { name: 'Project.md', type: 'document', vaultPath: 'Docs/Project.md' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('rename').mockResolvedValueOnce('rename').mockResolvedValueOnce('delete')
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))
    const input = await screen.findByDisplayValue('Project.md')
    expect(input).toBe(document.activeElement)
    fireEvent.change(input, { target: { value: 'Renamed.md' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(api.flashqueryMoveDocument).toHaveBeenCalledWith(
      workspaceId,
      'Docs/Project.md',
      'Docs/Renamed.md',
    ))

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Notes/ }))
    const folderInput = await screen.findByDisplayValue('Notes')
    expect(folderInput).toBe(document.activeElement)
    fireEvent.change(folderInput, { target: { value: 'Archive' } })
    fireEvent.keyDown(folderInput, { key: 'Enter' })

    await waitFor(() => expect(api.flashqueryManageDirectory).toHaveBeenCalledWith(
      workspaceId,
      'rename',
      ['Notes'],
      ['Archive'],
    ))

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Notes/ }))
    await waitFor(() => expect(api.flashqueryManageDirectory).toHaveBeenCalledWith(
      workspaceId,
      'remove',
      ['Notes'],
    ))
  })

  it('deletes documents through FlashQuery MCP remove_document', async () => {
    const api = await renderLiveTree([
      { name: 'Project.md', type: 'document', vaultPath: 'Docs/Project.md' },
    ])
    vi.mocked(api.showContextMenu).mockResolvedValueOnce('delete')
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))

    await waitFor(() => expect(api.flashqueryRemoveDocument).toHaveBeenCalledWith(
      workspaceId,
      'Docs/Project.md',
    ))
  })

  it('deletes a root-level folder and immediately refreshes the root vault listing', async () => {
    const api = makeSequencedElectronApi([
      [{ name: 'Ideas', type: 'folder', vaultPath: 'Ideas' }],
      [],
    ])
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })
    await waitFor(() => expect(screen.getByRole('treeitem', { name: /Ideas/ })).toBeTruthy())

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('delete')
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)

    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Ideas/ }))

    await waitFor(() => expect(api.flashqueryManageDirectory).toHaveBeenCalledWith(
      workspaceId,
      'remove',
      ['Ideas'],
    ))
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('treeitem', { name: /Ideas/ })).toBeNull())
    expect(screen.getByText('This vault has no documents yet.')).toBeTruthy()
  })

  it('forces the post-mutation root refresh even when a manual root refresh is already in flight', async () => {
    const pendingRefresh = deferredEntries()
    const api = makeSequencedElectronApi([
      [{ name: 'Ideas', type: 'folder', vaultPath: 'Ideas' }],
      pendingRefresh.promise,
      [],
    ])
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })
    await waitFor(() => expect(screen.getByRole('treeitem', { name: /Ideas/ })).toBeTruthy())

    fireEvent.click(screen.getByLabelText('Refresh vault'))
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledTimes(2))

    vi.mocked(api.showContextMenu).mockResolvedValueOnce('delete')
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true)
    fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Ideas/ }))

    await waitFor(() => expect(api.flashqueryManageDirectory).toHaveBeenCalledWith(
      workspaceId,
      'remove',
      ['Ideas'],
    ))
    await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledTimes(3))
    await waitFor(() => expect(screen.queryByRole('treeitem', { name: /Ideas/ })).toBeNull())

    await act(async () => {
      pendingRefresh.resolve([{ name: 'Ideas', type: 'folder', vaultPath: 'Ideas' }])
    })
    expect(screen.queryByRole('treeitem', { name: /Ideas/ })).toBeNull()
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
    emitStatus({ workspaceId, status: 'live' })
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

    await act(async () => {
      pending.resolve([{ name: 'B.md', type: 'document', vaultPath: 'B.md' }])
    })
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

    expect(await screen.findByRole('treeitem', { name: /A.md/ })).toHaveProperty('ariaSelected', 'true')
    expect(screen.queryByText('A title')).toBeNull()
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
