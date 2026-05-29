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
      nextZIndex: 1,
      canvas: { nodes: [], viewport: { x: 0, y: 0, zoom: 1 } },
      regions: [],
      activePanelId: null,
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

    expect(screen.getByText('FlashQuery Vault')).toBeTruthy()
    expect(screen.getAllByText(/flashquery\.local:8787/).length).toBeGreaterThan(0)
    expect(screen.getByLabelText('Refresh vault')).toBeTruthy()

    statusListener?.({ workspaceId, status: 'live' })

    expect(await screen.findByText('Live')).toBeTruthy()
  })
})

describe('FlashQueryVaultPanel State', () => {
  it('renders no-connection copy and opens workspace settings', () => {
    seedWorkspace(undefined)
    renderPanel()

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

  it('renders disconnected copy, retries, and opens edit connection', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    renderPanel()

    statusListener?.({ workspaceId, status: 'disconnected', error: 'ECONNREFUSED' })

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

    expect(screen.getByRole('treeitem', { name: /Notes/ })).toBeTruthy()
    expect(screen.getByRole('treeitem', { name: /Project Brief/ })).toBeTruthy()
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
