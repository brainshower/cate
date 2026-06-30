import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FLASHQUERY_CREATE_DOCUMENT,
  FLASHQUERY_DOCUMENT_CONNECTIONS,
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT_INDEX,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_MANAGE_DIRECTORY,
  FLASHQUERY_MOVE_DOCUMENT,
  FLASHQUERY_PROBE,
  FLASHQUERY_QUERY_GRAPH,
  FLASHQUERY_REMOVE_DOCUMENT,
  FLASHQUERY_RETRY,
  FLASHQUERY_SEARCH,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_STATUS,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'
import type { FlashQueryConnection, WorkspaceInfo } from '../../shared/types'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  updateWorkspace: vi.fn(),
  broadcastWorkspaceChange: vi.fn(),
  broadcastToAll: vi.fn(),
  getWorkspaceToken: vi.fn(),
  setWorkspaceToken: vi.fn(),
  fetch: vi.fn(),
  mcpClientConnect: vi.fn(),
  mcpClientClose: vi.fn(),
  mcpTransport: vi.fn(function MockStreamableHTTPClientTransport(
    this: { url: URL; options: unknown },
    url: URL,
    options: unknown,
  ) {
    this.url = url
    this.options = options
  }),
  managerInstances: [] as Array<{
    connect: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
    documentConnections: ReturnType<typeof vi.fn>
    queryGraph: ReturnType<typeof vi.fn>
    listVault: ReturnType<typeof vi.fn>
    getDocument: ReturnType<typeof vi.fn>
    listVaultIndex: ReturnType<typeof vi.fn>
    createDocument: ReturnType<typeof vi.fn>
    manageDirectory: ReturnType<typeof vi.fn>
    moveDocument: ReturnType<typeof vi.fn>
    removeDocument: ReturnType<typeof vi.fn>
    retry: ReturnType<typeof vi.fn>
    search: ReturnType<typeof vi.fn>
    writeDocument: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
    subscriptions: Array<{ workspaceId: string; type: string; handler: (payload: unknown) => void }>
  }>,
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
}))

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(() => ({
    connect: mocks.mcpClientConnect,
    close: mocks.mcpClientClose,
  })),
}))

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: mocks.mcpTransport,
}))

vi.mock('../workspaceManager', () => ({
  updateWorkspace: mocks.updateWorkspace,
  broadcastWorkspaceChange: mocks.broadcastWorkspaceChange,
}))

vi.mock('../windowRegistry', () => ({
  broadcastToAll: mocks.broadcastToAll,
}))

vi.mock('../flashquery/credentials', () => ({
  setWorkspaceToken: mocks.setWorkspaceToken,
}))

vi.mock('../flashquery/clientManager', () => {
  class MockFlashQueryClientManager {
    connect = vi.fn().mockResolvedValue({ workspaceId: 'workspace-1', status: 'live' })
    dispose = vi.fn()
    documentConnections = vi.fn()
    queryGraph = vi.fn()
    listVault = vi.fn()
    getDocument = vi.fn()
    listVaultIndex = vi.fn()
    createDocument = vi.fn()
    manageDirectory = vi.fn()
    moveDocument = vi.fn()
    removeDocument = vi.fn()
    retry = vi.fn()
    search = vi.fn()
    writeDocument = vi.fn()
    subscriptions: Array<{ workspaceId: string; type: string; handler: (payload: unknown) => void }> = []
    subscribe = vi.fn((workspaceId: string, type: string, handler: (payload: unknown) => void) => {
      this.subscriptions.push({ workspaceId, type, handler })
      return vi.fn()
    })

    constructor() {
      mocks.managerInstances.push(this)
    }
  }

  return { FlashQueryClientManager: MockFlashQueryClientManager }
})

describe('FlashQuery IPC handlers', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.handle.mockClear()
    mocks.updateWorkspace.mockReset()
    mocks.broadcastWorkspaceChange.mockReset()
    mocks.broadcastToAll.mockReset()
    mocks.getWorkspaceToken.mockReset()
    mocks.setWorkspaceToken.mockReset()
    mocks.fetch.mockReset()
    mocks.mcpClientConnect.mockReset()
    mocks.mcpClientClose.mockReset()
    mocks.mcpTransport.mockClear()
    mocks.mcpClientConnect.mockResolvedValue(undefined)
    mocks.mcpClientClose.mockResolvedValue(undefined)
    mocks.managerInstances.length = 0
    vi.stubGlobal('fetch', mocks.fetch)
  })

  function workspace(overrides: Partial<WorkspaceInfo> = {}): WorkspaceInfo {
    return {
      id: 'workspace-1',
      name: 'Workspace',
      color: '#00aaff',
      rootPath: '/tmp/workspace',
      ...overrides,
    }
  }

  async function registeredSetConnectionHandler() {
    const { registerHandlers } = await import('./flashquery')
    registerHandlers()
    const call = mocks.handle.mock.calls.find(([channel]) => channel === FLASHQUERY_SET_CONNECTION)
    expect(call).toBeTruthy()
    return call?.[1] as (_event: unknown, workspaceId: string, connection: FlashQueryConnection | null) => Promise<unknown>
  }

  async function registeredHandler<T extends (...args: never[]) => unknown>(channelName: string): Promise<T> {
    const { registerHandlers } = await import('./flashquery')
    registerHandlers()
    const call = mocks.handle.mock.calls.find(([channel]) => channel === channelName)
    expect(call).toBeTruthy()
    return call?.[1] as T
  }

  it('T-U-002 registers renderer-to-main FlashQuery invoke channels exactly once', async () => {
    const { registerHandlers } = await import('./flashquery')

    registerHandlers()

    expect(mocks.handle).toHaveBeenCalledTimes(13)
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual([
      FLASHQUERY_SET_CONNECTION,
      FLASHQUERY_PROBE,
      FLASHQUERY_LIST_VAULT,
      FLASHQUERY_GET_DOCUMENT,
      FLASHQUERY_WRITE_DOCUMENT,
      FLASHQUERY_CREATE_DOCUMENT,
      FLASHQUERY_MANAGE_DIRECTORY,
      FLASHQUERY_MOVE_DOCUMENT,
      FLASHQUERY_REMOVE_DOCUMENT,
      FLASHQUERY_SEARCH,
      FLASHQUERY_DOCUMENT_CONNECTIONS,
      FLASHQUERY_LIST_VAULT_INDEX,
      FLASHQUERY_RETRY,
    ])
    expect(mocks.handle.mock.calls.map(([, handler]) => handler)).toEqual([
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    ])
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).not.toContain(FLASHQUERY_STATUS)
  })

  it('keeps FlashQuery handler registration idempotent', async () => {
    const { registerHandlers } = await import('./flashquery')

    registerHandlers()
    registerHandlers()

    expect(mocks.handle).toHaveBeenCalledTimes(13)
  })

  it('declares the exact Phase 3 FlashQuery channel strings', () => {
    expect(FLASHQUERY_SET_CONNECTION).toBe('flashquery:setConnection')
    expect(FLASHQUERY_PROBE).toBe('flashquery:probe')
    expect(FLASHQUERY_LIST_VAULT).toBe('flashquery:listVault')
    expect(FLASHQUERY_GET_DOCUMENT).toBe('flashquery:getDocument')
    expect(FLASHQUERY_WRITE_DOCUMENT).toBe('flashquery:writeDocument')
    expect(FLASHQUERY_CREATE_DOCUMENT).toBe('flashquery:createDocument')
    expect(FLASHQUERY_MANAGE_DIRECTORY).toBe('flashquery:manageDirectory')
    expect(FLASHQUERY_MOVE_DOCUMENT).toBe('flashquery:moveDocument')
    expect(FLASHQUERY_REMOVE_DOCUMENT).toBe('flashquery:removeDocument')
    expect(FLASHQUERY_SEARCH).toBe('flashquery:search')
    expect(FLASHQUERY_DOCUMENT_CONNECTIONS).toBe('flashquery:documentConnections')
    expect(FLASHQUERY_LIST_VAULT_INDEX).toBe('flashquery:list-vault-index')
    expect(FLASHQUERY_RETRY).toBe('flashquery:retry')
    expect(FLASHQUERY_STATUS).toBe('flashquery:status')
  })

  it('T-U-041 persists a valid connection through workspace manager and starts a fresh manager probe', async () => {
    const connection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local',
      auth: { type: 'bearer', token: 'secret-token' },
    }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'https://flashquery.local' } }),
    })
    const handler = await registeredSetConnectionHandler()

    const result = await handler({}, 'workspace-1', connection)

    expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', { flashqueryConnection: connection })
    expect(mocks.broadcastWorkspaceChange).toHaveBeenCalledTimes(1)
    expect(mocks.managerInstances[0].dispose).toHaveBeenCalledWith('workspace-1')
    expect(mocks.managerInstances[0].connect).toHaveBeenCalledWith('workspace-1', connection)
    expect(JSON.stringify(result)).not.toContain('secret-token')
    expect(JSON.stringify(mocks.broadcastWorkspaceChange.mock.calls)).not.toContain('secret-token')
  })

  it('normalizes whitespace-only bearer tokens before persisting a connection', async () => {
    const rawConnection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local',
      auth: { type: 'bearer', token: '   ' },
    }
    const normalizedConnection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local',
    }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: normalizedConnection }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', rawConnection)

    expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', { flashqueryConnection: normalizedConnection })
    expect(mocks.managerInstances[0].connect).toHaveBeenCalledWith('workspace-1', normalizedConnection)
  })

  it('preserves the existing token when the dialog saves an edit-mode connection with no replacement token', async () => {
    const connection = {
      transport: 'http',
      url: 'https://flashquery.local',
      preserveExistingToken: true,
    } satisfies FlashQueryConnection & { preserveExistingToken: true }
    const normalizedConnection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local',
    }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: normalizedConnection }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', connection)

    expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', {
      flashqueryConnection: {
        ...normalizedConnection,
        preserveExistingToken: true,
      },
    })
    expect(mocks.managerInstances[0].connect).toHaveBeenCalledWith('workspace-1', normalizedConnection)
  })

  it('T-U-042 clears a connection through workspace manager, disposes manager state, and broadcasts no-connection status', async () => {
    mocks.updateWorkspace.mockResolvedValue({ ok: true, workspace: workspace() })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', null)

    expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', { flashqueryConnection: undefined })
    expect(mocks.managerInstances[0].dispose).toHaveBeenCalledWith('workspace-1')
    expect(mocks.managerInstances[0].connect).not.toHaveBeenCalled()
    expect(mocks.broadcastWorkspaceChange).toHaveBeenCalledTimes(1)
    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'disconnected',
      error: 'No FlashQuery connection is configured for this workspace',
    })
  })

  it('T-U-043 disposes prior manager state before replacing a connection', async () => {
    const connection: FlashQueryConnection = { transport: 'http', url: 'http://127.0.0.1:3100' }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'http://127.0.0.1:3100' } }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', connection)

    expect(mocks.managerInstances[0].dispose.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.managerInstances[0].connect.mock.invocationCallOrder[0])
  })

  it('T-U-044 rejects an unparseable FlashQuery URL descriptively', async () => {
    const handler = await registeredSetConnectionHandler()

    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'http://[bad' }))
      .rejects.toThrow(/valid FlashQuery URL/i)
    expect(mocks.updateWorkspace).not.toHaveBeenCalled()
  })

  it('T-U-045 rejects non-http FlashQuery URLs descriptively', async () => {
    const handler = await registeredSetConnectionHandler()

    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'ftp://flashquery.local' }))
      .rejects.toThrow(/http or https/i)
    expect(mocks.updateWorkspace).not.toHaveBeenCalled()
  })

  it('normalizes pasted /mcp FlashQuery endpoints before persisting and connecting', async () => {
    const rawConnection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local/mcp/',
      auth: { type: 'bearer', token: 'secret-token' },
    }
    const normalizedConnection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local',
      auth: { type: 'bearer', token: 'secret-token' },
    }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: normalizedConnection }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', rawConnection)

    expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', { flashqueryConnection: normalizedConnection })
    expect(mocks.managerInstances[0].connect).toHaveBeenCalledWith('workspace-1', normalizedConnection)
  })

  it('rejects FlashQuery URLs with credentials, query, or fragment before persistence', async () => {
    const handler = await registeredSetConnectionHandler()

    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'https://user:pass@flashquery.local' }))
      .rejects.toThrow('must not include credentials, query, or fragment')
    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'https://flashquery.local?token=bad' }))
      .rejects.toThrow('must not include credentials, query, or fragment')
    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'https://flashquery.local#section' }))
      .rejects.toThrow('must not include credentials, query, or fragment')
    expect(mocks.updateWorkspace).not.toHaveBeenCalled()
  })

  it('T-I-012 and T-I-013 broadcasts direct manager status payloads with safe error handling', async () => {
    const connection: FlashQueryConnection = { transport: 'http', url: 'https://flashquery.local' }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'https://flashquery.local' } }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', connection)
    const subscription = mocks.managerInstances[0].subscriptions[0]

    expect(subscription).toMatchObject({ workspaceId: 'workspace-1', type: 'status' })

    subscription.handler({ workspaceId: 'workspace-1', status: 'connecting', error: 'stale error' })
    subscription.handler({ workspaceId: 'workspace-1', status: 'live', version: '1.2.3', error: 'stale error' })
    subscription.handler({ workspaceId: 'workspace-1', status: 'disconnected', error: 'Connection refused' })

    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'connecting',
    })
    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'live',
      version: '1.2.3',
    })
    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'disconnected',
      error: 'Connection refused',
    })
  })

  it('T-I-062 dry-runs the provided URL without sending bearer auth or persisting connection state', async () => {
    const handler = await registeredHandler<(
      _event: unknown,
      workspaceId: string,
      connection: FlashQueryConnection,
    ) => Promise<unknown>>(FLASHQUERY_PROBE)
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      version: '1.2.3',
      instance_id: 'instance-abcdef',
    }), { status: 200 }))

    await expect(handler({}, 'workspace-1', {
      transport: 'http',
      url: 'https://flashquery.local/mcp',
      auth: { type: 'bearer', token: 'current-token' },
    })).resolves.toEqual({
      ok: true,
      version: '1.2.3',
      instanceId: 'instance-abcdef',
    })

    expect(mocks.fetch).toHaveBeenCalledWith('https://flashquery.local/mcp/info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: expect.any(AbortSignal),
    })
    expect(mocks.mcpTransport).toHaveBeenCalledWith(new URL('https://flashquery.local/mcp'), {
      requestInit: { headers: expect.any(Headers) },
    })
    const [, transportOptions] = mocks.mcpTransport.mock.calls[0]
    expect((transportOptions as { requestInit: { headers: Headers } }).requestInit.headers.get('Authorization'))
      .toBe('Bearer current-token')
    expect(mocks.mcpClientConnect).toHaveBeenCalledWith(expect.objectContaining({
      url: new URL('https://flashquery.local/mcp'),
    }))
    expect(mocks.updateWorkspace).not.toHaveBeenCalled()
    expect(mocks.broadcastWorkspaceChange).not.toHaveBeenCalled()
    expect(mocks.setWorkspaceToken).not.toHaveBeenCalled()
    expect(mocks.managerInstances[0].connect).not.toHaveBeenCalled()
  })

  it('T-I-062 omits Authorization for empty dialog token values', async () => {
    const handler = await registeredHandler<(
      _event: unknown,
      workspaceId: string,
      connection: FlashQueryConnection,
    ) => Promise<unknown>>(FLASHQUERY_PROBE)
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      version: '1.2.3',
      instance_id: 'instance-abcdef',
    }), { status: 200 }))

    await handler({}, 'workspace-1', {
      transport: 'http',
      url: 'http://localhost:3100',
      auth: { type: 'bearer', token: '   ' },
    })

    expect(mocks.fetch).toHaveBeenCalledWith('http://localhost:3100/mcp/info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: expect.any(AbortSignal),
    })
  })

  it('T-I-065 returns safe one-line probe failures without throwing ordinary connection errors', async () => {
    const handler = await registeredHandler<(
      _event: unknown,
      workspaceId: string,
      connection: FlashQueryConnection,
    ) => Promise<unknown>>(FLASHQUERY_PROBE)

    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'ftp://flashquery.local' }))
      .resolves.toEqual({ ok: false, error: 'FlashQuery connection URL must use http or https' })

    mocks.fetch.mockResolvedValueOnce(new Response('nope', { status: 401, statusText: 'Unauthorized' }))
    await expect(handler({}, 'workspace-1', {
      transport: 'http',
      url: 'https://flashquery.local',
      auth: { type: 'bearer', token: 'secret-token' },
    })).resolves.toEqual({ ok: false, error: 'FlashQuery probe failed with 401 Unauthorized' })

    mocks.fetch.mockRejectedValueOnce(new Error('network failed for secret-token\nwith stack details'))
    await expect(handler({}, 'workspace-1', {
      transport: 'http',
      url: 'https://flashquery.local',
      auth: { type: 'bearer', token: 'secret-token' },
    })).resolves.toEqual({ ok: false, error: 'network failed for [redacted]' })
  })

  it('T-I-014 uses broadcastToAll as the status fanout primitive without duplicate workspace subscriptions', async () => {
    const connection: FlashQueryConnection = { transport: 'http', url: 'https://flashquery.local' }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'https://flashquery.local' } }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', connection)
    await handler({}, 'workspace-1', connection)

    expect(mocks.managerInstances[0].subscribe).toHaveBeenCalledTimes(2)
    mocks.managerInstances[0].subscriptions[1].handler({ workspaceId: 'workspace-1', status: 'live' })

    expect(mocks.broadcastToAll).toHaveBeenLastCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'live',
    })
  })

  it('T-I-001 through T-I-004 maps listVault IPC to manager root/folder calls and returns normalized entries', async () => {
    const rootEntries = [
      { name: 'Projects', type: 'folder', vaultPath: 'Projects' },
      { name: 'Plan.md', type: 'document', vaultPath: 'Plan.md', title: 'Plan' },
    ]
    const folderEntries = [{ name: 'Alpha.md', type: 'document', vaultPath: 'Projects/Alpha.md', title: 'Alpha' }]
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath?: string) => Promise<unknown[]>>(FLASHQUERY_LIST_VAULT)
    mocks.managerInstances[0].listVault
      .mockResolvedValueOnce(rootEntries)
      .mockResolvedValueOnce(folderEntries)
      .mockResolvedValueOnce([])

    await expect(handler({}, 'workspace-1')).resolves.toEqual(rootEntries)
    await expect(handler({}, 'workspace-1', 'Projects')).resolves.toEqual(folderEntries)
    await expect(handler({}, 'workspace-1', 'Disconnected')).resolves.toEqual([])

    expect(mocks.managerInstances[0].listVault).toHaveBeenNthCalledWith(1, 'workspace-1', undefined)
    expect(mocks.managerInstances[0].listVault).toHaveBeenNthCalledWith(2, 'workspace-1', 'Projects')
    expect(rootEntries[0]).toMatchObject({ name: expect.any(String), type: 'folder', vaultPath: expect.any(String) })
    expect(rootEntries[1]).toMatchObject({ name: expect.any(String), type: 'document', vaultPath: expect.any(String) })
  })

  it('T-I-006 through T-I-008 maps getDocument IPC results and does not retain version tokens', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string) => Promise<unknown>>(FLASHQUERY_GET_DOCUMENT)
    mocks.managerInstances[0].getDocument
      .mockResolvedValueOnce({ body: 'first', version_token: 'v1', modified: '2026-05-01T00:00:00Z' })
      .mockResolvedValueOnce({ body: 'second', version_token: 'v2', modified: '2026-05-02T00:00:00Z' })
      .mockRejectedValueOnce(new Error('Document not found: Missing.md'))

    await expect(handler({}, 'workspace-1', 'Plan.md')).resolves.toEqual({
      body: 'first',
      version_token: 'v1',
      modified: '2026-05-01T00:00:00Z',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md')).resolves.toEqual({
      body: 'second',
      version_token: 'v2',
      modified: '2026-05-02T00:00:00Z',
    })
    await expect(handler({}, 'workspace-1', 'Missing.md')).rejects.toThrow('Document not found: Missing.md')
    expect(mocks.managerInstances[0].getDocument).toHaveBeenCalledWith('workspace-1', 'Plan.md', undefined)
  })

  it('T-U-003 passes valid get-document include options and rejects invalid values before manager dispatch', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, options?: unknown) => Promise<unknown>>(FLASHQUERY_GET_DOCUMENT)
    mocks.managerInstances[0].getDocument.mockResolvedValueOnce({
      body: 'body',
      frontmatter: { title: 'Plan' },
    })

    await expect(handler({}, 'workspace-1', 'Plan.md', {
      include: ['body', 'frontmatter', 'connections'],
      connections: {
        limit: 200,
        limit_per_chunk: 5,
      },
    })).resolves.toEqual({
      body: 'body',
      frontmatter: { title: 'Plan' },
    })
    await expect(handler({}, 'workspace-1', 'Plan.md', { include: ['bad'] }))
      .rejects.toThrow('options.include must contain only body, frontmatter, connections, graph_summary, or headings')

    expect(mocks.managerInstances[0].getDocument).toHaveBeenCalledWith('workspace-1', 'Plan.md', {
      include: ['body', 'frontmatter', 'connections'],
      connections: {
        limit: 200,
        limit_per_chunk: 5,
      },
    })
    expect(mocks.managerInstances[0].getDocument).toHaveBeenCalledTimes(1)
  })

  it('T-I-004 accepts graph get-document options and rejects invalid include/connection option shapes', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, options?: unknown) => Promise<unknown>>(FLASHQUERY_GET_DOCUMENT)
    mocks.managerInstances[0].getDocument.mockResolvedValue({ body: 'body' })

    await expect(handler({}, 'workspace-1', 'Plan.md', {
      include: ['connections', 'graph_summary'],
      connections: {
        limit: 200,
        limit_per_chunk: 5,
        embedding_names: ['primary'],
      },
    })).resolves.toEqual({ body: 'body' })
    await expect(handler({}, 'workspace-1', 'Plan.md', { include: ['connections', 'not_a_part'] }))
      .rejects.toThrow('options.include must contain only body, frontmatter, connections, graph_summary, or headings')
    await expect(handler({}, 'workspace-1', 'Plan.md', { include: ['connections'], connections: 'bad' }))
      .rejects.toThrow('options.connections must be an object when provided')
    await expect(handler({}, 'workspace-1', 'Plan.md', { include: ['connections'], connections: { limit: 0 } }))
      .rejects.toThrow('Document connections limit must be a positive integer')
    await expect(handler({}, 'workspace-1', 'Plan.md', { include: ['connections'], connections: { limit_per_chunk: -1 } }))
      .rejects.toThrow('Document connections limit_per_chunk must be a positive integer')

    expect(mocks.managerInstances[0].getDocument).toHaveBeenCalledWith('workspace-1', 'Plan.md', {
      include: ['connections', 'graph_summary'],
      connections: {
        limit: 200,
        limit_per_chunk: 5,
        embedding_names: ['primary'],
      },
    })
    expect(mocks.managerInstances[0].getDocument).toHaveBeenCalledTimes(1)
  })

  it('T-I-009 through T-I-011 maps writeDocument IPC success and failure results without throwing', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, content: string) => Promise<unknown>>(FLASHQUERY_WRITE_DOCUMENT)
    mocks.managerInstances[0].writeDocument
      .mockResolvedValueOnce({ success: true, modified: '2026-05-03T00:00:00Z' })
      .mockResolvedValueOnce({ success: false, error: 'transport failed' })
      .mockRejectedValueOnce(new Error('bad path'))

    await expect(handler({}, 'workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: true,
      modified: '2026-05-03T00:00:00Z',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: false,
      error: 'transport failed',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: false,
      error: 'bad path',
    })
    expect(mocks.managerInstances[0].writeDocument).toHaveBeenCalledWith('workspace-1', 'Plan.md', 'body')
  })

  it('T-U-004 passes valid object write payloads and rejects invalid payloads before manager dispatch', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, payload: unknown) => Promise<unknown>>(FLASHQUERY_WRITE_DOCUMENT)
    mocks.managerInstances[0].writeDocument.mockResolvedValueOnce({ success: true, modified: '2026-06-03T00:00:00Z' })

    await expect(handler({}, 'workspace-1', 'Plan.md', {
      content: 'body',
      frontmatter: { title: 'Plan' },
      tags: ['project'],
    })).resolves.toEqual({ success: true, modified: '2026-06-03T00:00:00Z' })
    await expect(handler({}, 'workspace-1', 'Plan.md', { tags: ['ok', 3] })).resolves.toEqual({
      success: false,
      error: 'payload.tags must be an array of strings',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md', {})).resolves.toEqual({
      success: false,
      error: 'payload must include content, frontmatter, or tags',
    })

    expect(mocks.managerInstances[0].writeDocument).toHaveBeenCalledWith('workspace-1', 'Plan.md', {
      content: 'body',
      frontmatter: { title: 'Plan' },
      tags: ['project'],
    })
    expect(mocks.managerInstances[0].writeDocument).toHaveBeenCalledTimes(1)
  })

  it('maps FlashQuery vault mutation IPC channels to client manager methods', async () => {
    const createHandler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, title: string) => Promise<unknown>>(FLASHQUERY_CREATE_DOCUMENT)
    mocks.managerInstances[0].createDocument.mockResolvedValueOnce({ success: true, modified: '' })

    await expect(createHandler({}, 'workspace-1', 'Draft.md', 'Draft')).resolves.toEqual({ success: true, modified: '' })
    expect(mocks.managerInstances[0].createDocument).toHaveBeenCalledWith('workspace-1', 'Draft.md', 'Draft')

    const directoryHandler = await registeredHandler<(_event: unknown, workspaceId: string, action: string, paths: string[], destinations?: string[]) => Promise<unknown>>(FLASHQUERY_MANAGE_DIRECTORY)
    mocks.managerInstances[0].manageDirectory.mockResolvedValueOnce({ success: true, modified: '' })

    await expect(directoryHandler({}, 'workspace-1', 'rename', ['Notes'], ['Archive/Notes'])).resolves.toEqual({ success: true, modified: '' })
    expect(mocks.managerInstances[0].manageDirectory).toHaveBeenCalledWith('workspace-1', 'rename', ['Notes'], ['Archive/Notes'])

    const moveHandler = await registeredHandler<(_event: unknown, workspaceId: string, identifier: string, destination: string) => Promise<unknown>>(FLASHQUERY_MOVE_DOCUMENT)
    mocks.managerInstances[0].moveDocument.mockResolvedValueOnce({ success: true, modified: '' })

    await expect(moveHandler({}, 'workspace-1', 'Docs/A.md', 'Docs/B.md')).resolves.toEqual({ success: true, modified: '' })
    expect(mocks.managerInstances[0].moveDocument).toHaveBeenCalledWith('workspace-1', 'Docs/A.md', 'Docs/B.md')

    const removeHandler = await registeredHandler<(_event: unknown, workspaceId: string, identifiers: string) => Promise<unknown>>(FLASHQUERY_REMOVE_DOCUMENT)
    mocks.managerInstances[0].removeDocument.mockResolvedValueOnce({ success: true, modified: '' })

    await expect(removeHandler({}, 'workspace-1', 'Docs/B.md')).resolves.toEqual({ success: true, modified: '' })
    expect(mocks.managerInstances[0].removeDocument).toHaveBeenCalledWith('workspace-1', 'Docs/B.md')
  })

  it('T-U-005 validates search params and returns safe errors before manager dispatch', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, params: unknown) => Promise<unknown>>(FLASHQUERY_SEARCH)
    mocks.managerInstances[0].search.mockResolvedValueOnce({
      documents: [],
      memories: [],
      total_documents: 0,
      total_memories: 0,
    })

    await expect(handler({}, 'workspace-1', {
      query: 'plan',
      mode: 'mixed',
      entity_types: ['documents', 'memories'],
      limit: 25,
    })).resolves.toEqual({
      documents: [],
      memories: [],
      total_documents: 0,
      total_memories: 0,
    })
    await expect(handler({}, 'workspace-1', { mode: 'bogus' })).resolves.toMatchObject({
      error: 'search mode must be filesystem, mixed, or semantic',
      documents: [],
      memories: [],
    })
    await expect(handler({}, 'workspace-1', { entity_types: ['bad'] })).resolves.toMatchObject({
      error: 'search entity_types must contain only documents or memories',
      documents: [],
      memories: [],
    })
    await expect(handler({}, 'workspace-1', { limit: 0 })).resolves.toMatchObject({
      error: 'search limit must be a positive integer',
      documents: [],
      memories: [],
    })
    await expect(handler({}, 'workspace-1', { mode: 'semantic', query: '' })).resolves.toMatchObject({
      error: 'Type a query to search semantically.',
      documents: [],
      memories: [],
    })

    expect(mocks.managerInstances[0].search).toHaveBeenCalledWith('workspace-1', {
      query: 'plan',
      mode: 'mixed',
      entity_types: ['documents', 'memories'],
      limit: 25,
    })
    expect(mocks.managerInstances[0].search).toHaveBeenCalledTimes(1)
  })

  it('delegates document connection requests to the FlashQuery manager', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, params: unknown) => Promise<unknown>>(FLASHQUERY_DOCUMENT_CONNECTIONS)
    mocks.managerInstances[0].documentConnections.mockResolvedValueOnce({
      source: { document_id: 'doc-1', path: 'Docs/Plan.md' },
      overall: [],
      source_chunks: [],
    })

    await expect(handler({}, 'workspace-1', {
      identifier: 'Docs/Plan.md',
      limit: 40,
      limit_per_chunk: 5,
      embedding_names: ['primary'],
    })).resolves.toEqual({
      source: { document_id: 'doc-1', path: 'Docs/Plan.md' },
      overall: [],
      source_chunks: [],
    })
    expect(mocks.managerInstances[0].documentConnections).toHaveBeenCalledWith('workspace-1', {
      identifier: 'Docs/Plan.md',
      limit: 40,
      limit_per_chunk: 5,
      embedding_names: ['primary'],
    })
  })

  it('T-I-004 rejects invalid document connection request option shapes before manager dispatch', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, params: unknown) => Promise<unknown>>(FLASHQUERY_DOCUMENT_CONNECTIONS)

    await expect(handler({}, 'workspace-1', {
      identifier: 'Docs/Plan.md',
      limit: 0,
    })).resolves.toMatchObject({ error: 'Document connections limit must be a positive integer' })
    await expect(handler({}, 'workspace-1', {
      identifier: 'Docs/Plan.md',
      limit_per_chunk: Number.NaN,
    })).resolves.toMatchObject({ error: 'Document connections limit_per_chunk must be a positive integer' })
    await expect(handler({}, 'workspace-1', {
      identifier: 'Docs/Plan.md',
      embedding_names: ['primary', ''],
    })).resolves.toMatchObject({ error: 'embedding_names must be an array of non-empty strings' })

    expect(mocks.managerInstances[0].documentConnections).not.toHaveBeenCalled()
  })

  it('T-I-005 round-trips query_graph node payloads through a typed IPC channel', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, params: unknown) => Promise<unknown>>(FLASHQUERY_QUERY_GRAPH)
    mocks.managerInstances[0].queryGraph.mockResolvedValueOnce({
      action: 'node',
      chunk_id: 'chunk-1',
      content: 'Node content',
      key_claims: ['Claim one'],
      chunk_summary: 'Chunk summary',
      certainty_level: 'high',
      staleness_risk: 'low',
      external_refs: ['https://example.test/ref'],
      temporal_markers: ['2026-Q2'],
      question_status: 'open',
      question_resolution: 'Needs follow-up',
      analyzed: true,
      stale: false,
      edges: [{
        id: 'edge-1',
        relation: 'supports',
        direction: 'out',
        metadata: {
          qualifiers: ['normative'],
          source_claims_referenced: [0],
          target_claims_referenced: [1],
        },
      }],
    })

    await expect(handler({}, 'workspace-1', {
      action: 'node',
      chunk_id: 'chunk-1',
      direction: 'both',
      limit: 25,
    })).resolves.toMatchObject({
      action: 'node',
      chunk_id: 'chunk-1',
      content: 'Node content',
      key_claims: ['Claim one'],
      chunk_summary: 'Chunk summary',
      certainty_level: 'high',
      edges: [{
        id: 'edge-1',
        metadata: {
          qualifiers: ['normative'],
          source_claims_referenced: [0],
          target_claims_referenced: [1],
        },
      }],
    })

    expect(mocks.managerInstances[0].queryGraph).toHaveBeenCalledWith('workspace-1', {
      action: 'node',
      chunk_id: 'chunk-1',
      direction: 'both',
      limit: 25,
    })
  })

  it('T-I-006 validates query_graph params and returns per-call failures without throwing across IPC', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, params: unknown) => Promise<unknown>>(FLASHQUERY_QUERY_GRAPH)
    mocks.managerInstances[0].queryGraph.mockRejectedValueOnce(new Error('query_graph failed'))

    await expect(handler({}, 'workspace-1', { action: 'node', chunk_id: 'chunk-1' })).resolves.toEqual({
      error: 'query_graph failed',
    })
    await expect(handler({}, 'workspace-1', { action: 'node' })).resolves.toMatchObject({
      error: 'query_graph chunk_id is required for action node',
    })
    await expect(handler({}, 'workspace-1', { action: 'bad', chunk_id: 'chunk-1' })).resolves.toMatchObject({
      error: 'query_graph action must be node, edges, neighbors, or subgraph',
    })
    await expect(handler({}, 'workspace-1', { action: 'edges', direction: 'sideways' })).resolves.toMatchObject({
      error: 'query_graph direction must be in, out, or both',
    })
    await expect(handler({}, 'workspace-1', { action: 'edges', include_content: 'yes' })).resolves.toMatchObject({
      error: 'query_graph include_content must be a boolean',
    })
    await expect(handler({}, 'workspace-1', { action: 'edges', limit: 0 })).resolves.toMatchObject({
      error: 'query_graph limit must be a positive integer',
    })

    expect(mocks.managerInstances[0].queryGraph).toHaveBeenCalledTimes(1)
  })

  it('T-I-009 preserves query_graph include_content gating for node and bulk actions', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, params: unknown) => Promise<unknown>>(FLASHQUERY_QUERY_GRAPH)
    mocks.managerInstances[0].queryGraph.mockResolvedValue({})

    await handler({}, 'workspace-1', { action: 'node', chunk_id: 'chunk-1' })
    await handler({}, 'workspace-1', { action: 'edges' })
    await handler({}, 'workspace-1', { action: 'subgraph', include_content: true })

    expect(mocks.managerInstances[0].queryGraph).toHaveBeenNthCalledWith(1, 'workspace-1', {
      action: 'node',
      chunk_id: 'chunk-1',
    })
    expect(mocks.managerInstances[0].queryGraph).toHaveBeenNthCalledWith(2, 'workspace-1', {
      action: 'edges',
      include_content: false,
    })
    expect(mocks.managerInstances[0].queryGraph).toHaveBeenNthCalledWith(3, 'workspace-1', {
      action: 'subgraph',
      include_content: true,
    })
  })

  it('T-U-006 registers vault-index IPC and delegates valid workspace IDs to manager', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string) => Promise<unknown>>(FLASHQUERY_LIST_VAULT_INDEX)
    mocks.managerInstances[0].listVaultIndex.mockResolvedValueOnce([
      { filename: 'Plan.md', fullPath: 'Docs/Plan.md' },
    ])

    await expect(handler({}, 'workspace-1')).resolves.toEqual([
      { filename: 'Plan.md', fullPath: 'Docs/Plan.md' },
    ])
    await expect(handler({}, '')).rejects.toThrow('workspaceId must be a non-empty string')

    expect(mocks.managerInstances[0].listVaultIndex).toHaveBeenCalledWith('workspace-1')
    expect(mocks.managerInstances[0].listVaultIndex).toHaveBeenCalledTimes(1)
  })

  it('allows empty and whitespace-only document body writes', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, content: string) => Promise<unknown>>(FLASHQUERY_WRITE_DOCUMENT)
    mocks.managerInstances[0].writeDocument
      .mockResolvedValueOnce({ success: true, modified: '2026-05-04T00:00:00Z' })
      .mockResolvedValueOnce({ success: true, modified: '2026-05-04T00:00:01Z' })

    await expect(handler({}, 'workspace-1', 'Plan.md', '')).resolves.toEqual({
      success: true,
      modified: '2026-05-04T00:00:00Z',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md', '\n  \n')).resolves.toEqual({
      success: true,
      modified: '2026-05-04T00:00:01Z',
    })

    expect(mocks.managerInstances[0].writeDocument).toHaveBeenNthCalledWith(1, 'workspace-1', 'Plan.md', '')
    expect(mocks.managerInstances[0].writeDocument).toHaveBeenNthCalledWith(2, 'workspace-1', 'Plan.md', '\n  \n')
  })

  it('registers manual retry and delegates valid workspace IDs to the manager', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string) => Promise<void>>(FLASHQUERY_RETRY)
    mocks.managerInstances[0].retry.mockResolvedValueOnce({ workspaceId: 'workspace-1', status: 'connecting' })

    await expect(handler({}, 'workspace-1')).resolves.toBeUndefined()

    expect(mocks.managerInstances[0].retry).toHaveBeenCalledTimes(1)
    expect(mocks.managerInstances[0].retry).toHaveBeenCalledWith('workspace-1')
    expect(mocks.managerInstances[0].connect).not.toHaveBeenCalled()
  })

  it('rejects invalid manual retry workspace IDs before reaching the manager', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: unknown) => Promise<void>>(FLASHQUERY_RETRY)

    await expect(handler({}, '')).rejects.toThrow('workspaceId must be a non-empty string')
    await expect(handler({}, '   ')).rejects.toThrow('workspaceId must be a non-empty string')
    await expect(handler({}, null)).rejects.toThrow('workspaceId must be a non-empty string')

    expect(mocks.managerInstances[0].retry).not.toHaveBeenCalled()
  })
})
