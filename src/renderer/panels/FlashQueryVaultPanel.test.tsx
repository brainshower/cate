import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

const makeElectronApi = (entries: FlashQueryVaultEntry[] = []): ElectronApiMock => ({
  flashqueryListVault: vi.fn().mockResolvedValue(entries),
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
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FlashQueryVaultPanel Header', () => {
  it('renders the vault identity, host context, status chip, and refresh button', async () => {
    renderPanel()

    expect(screen.getByText('FlashQuery Vault')).toBeTruthy()
    expect(screen.getByText(/flashquery\.local:8787/)).toBeTruthy()
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
