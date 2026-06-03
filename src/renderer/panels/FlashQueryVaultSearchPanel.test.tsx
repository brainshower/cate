import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import FlashQueryVaultSearchPanel from './FlashQueryVaultSearchPanel'
import { useAppStore } from '../stores/appStore'
import type { FlashQuerySearchResponse, FlashQueryStatusBroadcastPayload } from '../../shared/types'

type ElectronApiMock = Pick<
  Window['electronAPI'],
  'flashquerySearch' | 'flashqueryRetry' | 'onFlashQueryStatus' | 'isE2E'
>

const workspaceId = 'workspace-1'
let statusListener: ((payload: FlashQueryStatusBroadcastPayload) => void) | null = null

function makeResponse(overrides: Partial<FlashQuerySearchResponse> = {}): FlashQuerySearchResponse {
  return {
    documents: [{
      filename: 'Plan.md',
      fullPath: 'Docs/Plan.md',
      title: 'Cate Plan',
      snippet: 'Cate search notes',
    }],
    memories: [{
      id: 'memory-1',
      title: 'Cate memory',
      text: 'Remember Cate search behavior',
    }],
    total_documents: 1,
    total_memories: 1,
    ...overrides,
  }
}

function makeElectronApi(searchImpl?: ElectronApiMock['flashquerySearch']): ElectronApiMock {
  return {
    isE2E: false,
    flashquerySearch: searchImpl ?? vi.fn().mockResolvedValue(makeResponse()),
    flashqueryRetry: vi.fn().mockResolvedValue(undefined),
    onFlashQueryStatus: vi.fn((callback) => {
      statusListener = callback
      return () => {
        statusListener = null
      }
    }),
  }
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
  return render(<FlashQueryVaultSearchPanel panelId="panel-1" workspaceId={workspaceId} />)
}

function emitStatus(payload: FlashQueryStatusBroadcastPayload) {
  act(() => {
    statusListener?.(payload)
  })
}

function deferredResponse() {
  let resolve!: (value: FlashQuerySearchResponse) => void
  const promise = new Promise<FlashQuerySearchResponse>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

beforeEach(() => {
  statusListener = null
  setElectronApi(makeElectronApi())
  seedWorkspace({ transport: 'http', url: 'https://flashquery.local:8787/mcp' })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FlashQueryVaultSearchPanel T-U-010 core search behavior', () => {
  it('renders required chrome and idle state', () => {
    renderPanel()

    expect(screen.getByText('Vault Search')).toBeTruthy()
    expect(screen.getByPlaceholderText('Search the vault...')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'mixed' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Type a query and press Search.')).toBeTruthy()
  })

  it('dispatches only from Search click or Enter with default mixed documents and memories params', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    fireEvent.change(screen.getByPlaceholderText('Search the vault...'), { target: { value: ' cate ' } })
    fireEvent.click(screen.getByRole('button', { name: 'filesystem' }))
    fireEvent.click(screen.getByRole('button', { name: 'memories' }))

    expect(api.flashquerySearch).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    await waitFor(() => expect(api.flashquerySearch).toHaveBeenCalledWith(workspaceId, {
      query: 'cate',
      mode: 'filesystem',
      entity_types: ['documents'],
      limit: 50,
    }))

    fireEvent.keyDown(screen.getByPlaceholderText('Search the vault...'), { key: 'Enter' })
    await waitFor(() => expect(api.flashquerySearch).toHaveBeenCalledTimes(2))
  })

  it('allows empty mixed search, blocks empty semantic search, and exposes the required tooltip', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    await waitFor(() => expect(api.flashquerySearch).toHaveBeenCalledWith(workspaceId, expect.objectContaining({
      query: '',
      mode: 'mixed',
    })))

    fireEvent.click(screen.getByRole('button', { name: 'semantic' }))

    expect((screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Type a query to search semantically.')).toBeTruthy()
  })

  it('renders groups, no-result states, highlights non-list-all matches, and clears on Escape', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    fireEvent.change(screen.getByPlaceholderText('Search the vault...'), { target: { value: 'cate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Vault')).toBeTruthy()
    expect(screen.getByText('Memories')).toBeTruthy()
    expect(screen.getAllByText('Cate', { exact: false }).length).toBeGreaterThan(0)
    expect(document.querySelectorAll('mark')).not.toHaveLength(0)

    fireEvent.keyDown(screen.getByPlaceholderText('Search the vault...'), { key: 'Escape' })

    expect(screen.getByText('Type a query and press Search.')).toBeTruthy()
    expect((screen.getByPlaceholderText('Search the vault...') as HTMLInputElement).value).toBe('')
  })

  it('renders both-off and active empty-group states exactly', async () => {
    const api = makeElectronApi(vi.fn().mockResolvedValue(makeResponse({
      documents: [],
      memories: [],
      total_documents: 0,
      total_memories: 0,
    })))
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    fireEvent.click(screen.getByRole('button', { name: 'documents' }))
    fireEvent.click(screen.getByRole('button', { name: 'memories' }))
    expect(screen.getByText('Enable Documents or Memories to see results.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'documents' }))
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('Vault')).toBeTruthy()
    expect(screen.getByText('No results.')).toBeTruthy()
  })

  it('shows more when totals exceed rows and reissues with a larger limit', async () => {
    const api = makeElectronApi(vi.fn().mockResolvedValue(makeResponse({ total_documents: 2 })))
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    fireEvent.change(screen.getByPlaceholderText('Search the vault...'), { target: { value: 'cate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Show more' }))

    await waitFor(() => expect(api.flashquerySearch).toHaveBeenLastCalledWith(workspaceId, expect.objectContaining({
      limit: 100,
    })))
  })

  it('shows an in-flight spinner, ignores repeat clicks, and drops stale older responses', async () => {
    const first = deferredResponse()
    const second = deferredResponse()
    const api = makeElectronApi(vi.fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise))
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    fireEvent.change(screen.getByPlaceholderText('Search the vault...'), { target: { value: 'first' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.click(screen.getByRole('button', { name: /Search/ }))
    expect(api.flashquerySearch).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Searching')).toBeTruthy()

    first.resolve(makeResponse({ documents: [{ filename: 'Old.md', fullPath: 'Docs/Old.md' }], memories: [], total_documents: 1, total_memories: 0 }))
    await screen.findByText('Old.md')

    fireEvent.change(screen.getByPlaceholderText('Search the vault...'), { target: { value: 'second' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    second.resolve(makeResponse({ documents: [{ filename: 'New.md', fullPath: 'Docs/New.md' }], memories: [], total_documents: 1, total_memories: 0 }))

    expect(await screen.findByText('New.md')).toBeTruthy()
    expect(screen.queryByText('Old.md')).toBeNull()
  })

  it('clears current results and disables Search on disconnect', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    renderPanel()
    emitStatus({ workspaceId, status: 'live' })

    fireEvent.change(screen.getByPlaceholderText('Search the vault...'), { target: { value: 'cate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(await screen.findByText('Docs/Plan.md')).toBeTruthy()

    emitStatus({ workspaceId, status: 'disconnected', error: 'offline' })

    expect(await screen.findByTestId('vault-search-disconnected-icon')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Search' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.queryByText('Docs/Plan.md')).toBeNull()
  })
})
