import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlashQueryClientManager } from './clientManager'
import type { FlashQueryStatusPayload } from './clientManager'
import type { FlashQueryConnection } from '../../shared/types'
import { getWorkspaceToken } from './credentials'

const sdkMock = vi.hoisted(() => ({
  clientConnect: vi.fn(),
  clientCallTool: vi.fn(),
  Client: vi.fn(),
  StreamableHTTPClientTransport: vi.fn(),
}))

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: sdkMock.Client.mockImplementation(() => ({
    connect: sdkMock.clientConnect,
    callTool: sdkMock.clientCallTool,
  })),
}))

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: sdkMock.StreamableHTTPClientTransport.mockImplementation((url: URL, options?: unknown) => ({
    url,
    options,
  })),
}))

const workspaceMock = vi.hoisted(() => ({
  workspaces: [] as Array<{ id: string; name: string; color: string; rootPath: string; flashqueryConnection?: FlashQueryConnection }>,
  token: null as string | null,
}))

vi.mock('../workspaceManager', () => ({
  listWorkspaces: () => workspaceMock.workspaces,
}))

vi.mock('./credentials', () => ({
  getWorkspaceToken: vi.fn(async () => workspaceMock.token),
}))

const originalFetch = globalThis.fetch

function installFetchMock() {
  const fetchMock = vi.fn()
  Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true })
  return fetchMock
}

function okInfoResponse(version = '1.2.3', instanceId = 'fq-instance-1') {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: vi.fn().mockResolvedValue({
      version,
      instance_id: instanceId,
      auth_schemes: ['bearer'],
    }),
  }
}

function failedInfoResponse(status = 503, statusText = 'Service Unavailable') {
  return {
    ok: false,
    status,
    statusText,
    json: vi.fn(),
  }
}

function statusPayloads(handler: ReturnType<typeof vi.fn>): FlashQueryStatusPayload[] {
  return handler.mock.calls.map((call) => call[0] as FlashQueryStatusPayload)
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

afterEach(() => {
  Object.defineProperty(globalThis, 'fetch', { value: originalFetch, configurable: true })
  vi.clearAllMocks()
  vi.useRealTimers()
  workspaceMock.workspaces = []
  workspaceMock.token = null
})

describe('FlashQueryClientManager', () => {
  it('constructs without eager network work', () => {
    const fetchSpy = installFetchMock()

    new FlashQueryClientManager()

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('allows status, vault-changed, tools-changed, and future subscriptions without side effects', () => {
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    const vaultHandler = vi.fn()
    const toolsHandler = vi.fn()
    const futureHandler = vi.fn()

    const unsubscribeStatus = manager.subscribe('workspace-1', 'status', statusHandler)
    const unsubscribeVault = manager.subscribe('workspace-1', 'vault-changed', vaultHandler)
    const unsubscribeTools = manager.subscribe('workspace-1', 'tools-changed', toolsHandler)
    const unsubscribeFuture = manager.subscribe<{ changed: boolean }>('workspace-1', 'custom-event', futureHandler)

    const states = (manager as unknown as { workspaceStates: Map<string, { subscribers: Map<string, Set<unknown>> }> }).workspaceStates
    expect(states.get('workspace-1')?.subscribers.get('status')?.size).toBe(1)
    expect(states.get('workspace-1')?.subscribers.get('vault-changed')?.size).toBe(1)
    expect(states.get('workspace-1')?.subscribers.get('tools-changed')?.size).toBe(1)
    expect(states.get('workspace-1')?.subscribers.get('custom-event')?.size).toBe(1)

    unsubscribeStatus()
    unsubscribeVault()
    unsubscribeTools()
    unsubscribeFuture()

    expect(states.get('workspace-1')?.subscribers.get('status')?.size).toBe(0)
    expect(states.get('workspace-1')?.subscribers.get('vault-changed')?.size).toBe(0)
    expect(states.get('workspace-1')?.subscribers.get('tools-changed')?.size).toBe(0)
    expect(states.get('workspace-1')?.subscribers.get('custom-event')?.size).toBe(0)
  })

  it('scopes state by workspace and releases it on dispose', () => {
    const manager = new FlashQueryClientManager()

    manager.subscribe('workspace-1', 'status', vi.fn())
    manager.subscribe('workspace-2', 'status', vi.fn())
    manager.dispose('workspace-1')
    manager.dispose('workspace-1')

    const states = (manager as unknown as { workspaceStates: Map<string, unknown> }).workspaceStates
    expect(states.has('workspace-1')).toBe(false)
    expect(states.has('workspace-2')).toBe(true)
  })

  it('probes GET /mcp/info without Authorization and normalizes trailing slashes', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    const manager = new FlashQueryClientManager()

    await manager.connect('workspace-1', { transport: 'http', url: 'http://127.0.0.1:3100' })
    await manager.connect('workspace-2', { transport: 'http', url: 'http://127.0.0.1:3100/' })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'http://127.0.0.1:3100/mcp/info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: expect.any(AbortSignal),
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://127.0.0.1:3100/mcp/info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: expect.any(AbortSignal),
    })
  })

  it('T-U-021 omits bearer Authorization during the public connection info probe', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    const manager = new FlashQueryClientManager()

    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'https://flashquery.local/',
      auth: { type: 'bearer', token: 'secret-token' },
    })

    expect(fetchMock).toHaveBeenCalledWith('https://flashquery.local/mcp/info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: expect.any(AbortSignal),
    })
  })

  it('transitions from connecting to live with version and instance metadata', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse('2.0.0', 'fq-main'))
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', statusHandler)

    const result = await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })

    expect(result).toEqual({ workspaceId: 'workspace-1', status: 'live', version: '2.0.0', instanceId: 'fq-main' })
    expect(manager.getStatus('workspace-1')).toEqual(result)
    expect(statusPayloads(statusHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'live', version: '2.0.0', instanceId: 'fq-main' },
    ])
  })

  it('closes and clears a cached MCP client when reconnecting with a new connection', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    workspaceMock.workspaces = [workspaceInfo()]
    const oldClose = vi.fn()
    const oldCallTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ entries: [] }) }],
    })
    const newCallTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        entries: [{ name: 'New.md', path: 'New.md', type: 'file' }],
      }) }],
    })
    const createMcpClient = vi.fn()
      .mockResolvedValueOnce({ callTool: oldCallTool, close: oldClose })
      .mockResolvedValueOnce({ callTool: newCallTool })
    const manager = new FlashQueryClientManager({ createMcpClient })

    await manager.connect('workspace-1', { transport: 'http', url: 'http://old.local:3100' })
    await manager.listVault('workspace-1')
    await manager.connect('workspace-1', { transport: 'http', url: 'http://new.local:3100' })

    await expect(manager.listVault('workspace-1')).resolves.toEqual([
      { name: 'New.md', type: 'document', vaultPath: 'New.md' },
    ])
    expect(oldClose).toHaveBeenCalledTimes(1)
    expect(createMcpClient).toHaveBeenCalledTimes(2)
    expect(oldCallTool).toHaveBeenCalledTimes(1)
    expect(newCallTool).toHaveBeenCalledTimes(1)
  })

  it('ignores an in-flight MCP client created for a stale connection after reconnect', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    workspaceMock.workspaces = [workspaceInfo({ transport: 'http', url: 'http://old.local:3100' })]
    const oldClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ entries: [] }) }],
      }),
      close: vi.fn(),
    }
    const newClient = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({
          entries: [{ name: 'Fresh.md', path: 'Fresh.md', type: 'file' }],
        }) }],
      }),
    }
    const pendingOldClient = deferred<typeof oldClient>()
    const createMcpClient = vi.fn()
      .mockReturnValueOnce(pendingOldClient.promise)
      .mockResolvedValueOnce(newClient)
    const manager = new FlashQueryClientManager({ createMcpClient })

    const staleListPromise = manager.listVault('workspace-1')
    await Promise.resolve()

    await manager.connect('workspace-1', { transport: 'http', url: 'http://new.local:3100' })
    pendingOldClient.resolve(oldClient)
    await expect(staleListPromise).resolves.toEqual([])

    await expect(manager.listVault('workspace-1')).resolves.toEqual([
      { name: 'Fresh.md', type: 'document', vaultPath: 'Fresh.md' },
    ])
    expect(oldClient.close).toHaveBeenCalledTimes(1)
    expect(oldClient.callTool).not.toHaveBeenCalled()
    expect(newClient.callTool).toHaveBeenCalledTimes(1)
    expect(createMcpClient).toHaveBeenNthCalledWith(1, 'workspace-1', { transport: 'http', url: 'http://old.local:3100' }, null)
    expect(createMcpClient).toHaveBeenNthCalledWith(2, 'workspace-1', { transport: 'http', url: 'http://new.local:3100' }, null)
  })

  it('shares same-generation MCP client creation across concurrent tool calls', async () => {
    workspaceMock.workspaces = [workspaceInfo()]
    const client = {
      callTool: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ entries: [] }) }],
      }),
    }
    const pendingClient = deferred<typeof client>()
    const createMcpClient = vi.fn().mockReturnValue(pendingClient.promise)
    const manager = new FlashQueryClientManager({ createMcpClient })

    const firstList = manager.listVault('workspace-1')
    const secondList = manager.listVault('workspace-1')
    await Promise.resolve()

    expect(createMcpClient).toHaveBeenCalledTimes(1)
    pendingClient.resolve(client)

    await expect(firstList).resolves.toEqual([])
    await expect(secondList).resolves.toEqual([])
    expect(client.callTool).toHaveBeenCalledTimes(2)
  })

  it('sends no bearer auth and performs no POST /mcp during the info probe', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    const connection: FlashQueryConnection = {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
      auth: { type: 'bearer', token: 'secret-token' },
    }
    manager.subscribe('workspace-1', 'status', statusHandler)

    const result = await manager.connect('workspace-1', connection)

    expect(result.status).toBe('live')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('GET')
    expect(init.headers).toEqual({ Accept: 'application/json' })
    expect(JSON.stringify(statusHandler.mock.calls)).not.toContain('secret-token')
  })

  it('transitions to disconnected with safe error text for non-200 responses', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: vi.fn(),
    })
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', statusHandler)

    const result = await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
      auth: { type: 'bearer', token: 'secret-token' },
    })

    expect(result.status).toBe('disconnected')
    expect(result.error).toContain('503')
    expect(result.error).toContain('Service Unavailable')
    expect(result.error).not.toContain('secret-token')
    expect(statusPayloads(statusHandler)).toEqual([{ workspaceId: 'workspace-1', status: 'connecting' }, result])
  })

  it('transitions to disconnected when the info payload is malformed', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockResolvedValue({ version: '2.0.0' }),
    })
    const manager = new FlashQueryClientManager()

    const result = await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })

    expect(result).toEqual({
      workspaceId: 'workspace-1',
      status: 'disconnected',
      error: 'FlashQuery info probe returned an invalid response',
    })
  })

  it('transitions to disconnected when the info response is invalid JSON', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: vi.fn().mockRejectedValue(new Error('Unexpected token < in JSON')),
    })
    const manager = new FlashQueryClientManager()

    const result = await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })

    expect(result).toEqual({ workspaceId: 'workspace-1', status: 'disconnected', error: 'Unexpected token < in JSON' })
  })

  it('transitions to disconnected with safe rejection reason text when fetch rejects', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockRejectedValue(new Error('connection refused'))
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', statusHandler)

    const result = await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
      auth: { type: 'bearer', token: 'secret-token' },
    })

    expect(result).toEqual({ workspaceId: 'workspace-1', status: 'disconnected', error: 'connection refused' })
    expect(JSON.stringify(statusHandler.mock.calls)).not.toContain('secret-token')
    expect(statusPayloads(statusHandler)).toEqual([{ workspaceId: 'workspace-1', status: 'connecting' }, result])
  })

  it('times out a hung info probe and schedules retry', async () => {
    vi.useFakeTimers()
    const fetchMock = installFetchMock()
    fetchMock.mockImplementation((_, init?: RequestInit) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(init.signal?.reason)
      })
    }))
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', statusHandler)

    const connectPromise = manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: expect.any(AbortSignal),
    })

    await vi.advanceTimersByTimeAsync(9_999)
    expect(statusPayloads(statusHandler)).toEqual([{ workspaceId: 'workspace-1', status: 'connecting' }])
    await vi.advanceTimersByTimeAsync(1)
    await expect(connectPromise).resolves.toEqual({
      status: 'disconnected',
      workspaceId: 'workspace-1',
      error: 'FlashQuery info probe timed out',
    })
    expect(statusPayloads(statusHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'disconnected', error: 'FlashQuery info probe timed out' },
    ])

    await vi.advanceTimersByTimeAsync(2_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('T-U-026 through T-U-028 emits connecting first, live on success, and disconnected with error on failure', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValueOnce(okInfoResponse('2.1.0', 'fq-live'))
    fetchMock.mockResolvedValueOnce(failedInfoResponse(502, 'Bad Gateway'))
    const manager = new FlashQueryClientManager()
    const liveHandler = vi.fn()
    const failedHandler = vi.fn()
    manager.subscribe('workspace-live', 'status', liveHandler)
    manager.subscribe('workspace-failed', 'status', failedHandler)

    const liveResult = await manager.connect('workspace-live', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })
    const failedResult = await manager.connect('workspace-failed', {
      transport: 'http',
      url: 'http://127.0.0.1:3200',
    })

    expect(liveResult).toEqual({ workspaceId: 'workspace-live', status: 'live', version: '2.1.0', instanceId: 'fq-live' })
    expect(failedResult.status).toBe('disconnected')
    expect(failedResult.error).toContain('502')
    expect(statusPayloads(liveHandler)).toEqual([
      { workspaceId: 'workspace-live', status: 'connecting' },
      { workspaceId: 'workspace-live', status: 'live', version: '2.1.0', instanceId: 'fq-live' },
    ])
    expect(statusPayloads(failedHandler)).toEqual([
      { workspaceId: 'workspace-failed', status: 'connecting' },
      failedResult,
    ])
  })

  it('T-U-029 schedules repeated failures at 2s, 4s, 8s, and caps retry at 60s', async () => {
    vi.useFakeTimers()
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(failedInfoResponse())
    const manager = new FlashQueryClientManager()
    const connection: FlashQueryConnection = { transport: 'http', url: 'http://127.0.0.1:3100' }

    await manager.connect('workspace-1', connection)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(3_999)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)

    await vi.advanceTimersByTimeAsync(7_999)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(4)

    for (const delay of [16_000, 32_000, 60_000, 60_000]) {
      await vi.advanceTimersByTimeAsync(delay - 1)
      const beforeBoundary = fetchMock.mock.calls.length
      await vi.advanceTimersByTimeAsync(1)
      expect(fetchMock).toHaveBeenCalledTimes(beforeBoundary + 1)
    }
  })

  it('T-U-030 manual retry clears the pending backoff timer and probes immediately', async () => {
    vi.useFakeTimers()
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(failedInfoResponse())
    const manager = new FlashQueryClientManager()
    const connection: FlashQueryConnection = { transport: 'http', url: 'http://127.0.0.1:3100' }

    await manager.connect('workspace-1', connection)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1_000)
    await manager.retry('workspace-1')
    expect(fetchMock).toHaveBeenCalledTimes(2)

    await vi.advanceTimersByTimeAsync(999)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(2_999)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('T-U-031 successful probe after failure resets the next retry delay to 2s', async () => {
    vi.useFakeTimers()
    const fetchMock = installFetchMock()
    fetchMock
      .mockResolvedValueOnce(failedInfoResponse())
      .mockResolvedValueOnce(okInfoResponse('2.2.0', 'fq-reset'))
      .mockResolvedValue(failedInfoResponse())
    const manager = new FlashQueryClientManager()
    const connection: FlashQueryConnection = { transport: 'http', url: 'http://127.0.0.1:3100' }

    await manager.connect('workspace-1', connection)
    await vi.advanceTimersByTimeAsync(2_000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(manager.getStatus('workspace-1')).toEqual({
      workspaceId: 'workspace-1',
      status: 'live',
      version: '2.2.0',
      instanceId: 'fq-reset',
    })

    await manager.connect('workspace-1', connection)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1_999)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('T-U-032 dispose cancels retry timers and suppresses late in-flight status events', async () => {
    vi.useFakeTimers()
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValueOnce(failedInfoResponse())
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', statusHandler)

    await manager.connect('workspace-1', { transport: 'http', url: 'http://127.0.0.1:3100' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    manager.dispose('workspace-1')
    await vi.advanceTimersByTimeAsync(2_000)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    let resolveFetch: (response: ReturnType<typeof okInfoResponse>) => void = () => {}
    fetchMock.mockReturnValueOnce(new Promise((resolve) => {
      resolveFetch = resolve
    }))
    const lateHandler = vi.fn()
    manager.subscribe('workspace-late', 'status', lateHandler)
    const connectPromise = manager.connect('workspace-late', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })
    expect(statusPayloads(lateHandler)).toEqual([{ workspaceId: 'workspace-late', status: 'connecting' }])
    manager.dispose('workspace-late')
    resolveFetch(okInfoResponse('9.9.9', 'fq-late'))
    await connectPromise
    expect(statusPayloads(lateHandler)).toEqual([{ workspaceId: 'workspace-late', status: 'connecting' }])
    expect(manager.getStatus('workspace-late')).toBeNull()
  })

  it('T-U-033 and T-U-035 invokes every same-workspace status subscriber on each status transition', async () => {
    const fetchMock = installFetchMock()
    fetchMock
      .mockResolvedValueOnce(okInfoResponse('3.0.0', 'fq-subscriber'))
      .mockRejectedValueOnce(new Error('subscriber connection refused'))
    const manager = new FlashQueryClientManager()
    const firstHandler = vi.fn()
    const secondHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', firstHandler)
    manager.subscribe('workspace-1', 'status', secondHandler)

    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })
    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })

    const expectedPayloads: FlashQueryStatusPayload[] = [
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'live', version: '3.0.0', instanceId: 'fq-subscriber' },
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'disconnected', error: 'subscriber connection refused' },
    ]
    expect(statusPayloads(firstHandler)).toEqual(expectedPayloads)
    expect(statusPayloads(secondHandler)).toEqual(expectedPayloads)
    for (const call of firstHandler.mock.calls) {
      expect(call[0]).toMatchObject({ workspaceId: 'workspace-1' })
      expect(call[0]).not.toHaveProperty('type')
      expect(call[0]).not.toHaveProperty('payload')
    }
  })

  it('isolates throwing status subscribers from connection state and other subscribers', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse('3.0.1', 'fq-subscriber-safe'))
    const manager = new FlashQueryClientManager()
    const throwingHandler = vi.fn(() => {
      throw new Error('subscriber failed')
    })
    const healthyHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', throwingHandler)
    manager.subscribe('workspace-1', 'status', healthyHandler)

    await expect(manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })).resolves.toEqual({ workspaceId: 'workspace-1', status: 'live', version: '3.0.1', instanceId: 'fq-subscriber-safe' })

    expect(statusPayloads(healthyHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'live', version: '3.0.1', instanceId: 'fq-subscriber-safe' },
    ])
    expect(throwingHandler).toHaveBeenCalledTimes(2)
    expect(manager.getStatus('workspace-1')).toEqual({
      workspaceId: 'workspace-1',
      status: 'live',
      version: '3.0.1',
      instanceId: 'fq-subscriber-safe',
    })
  })

  it('T-U-034 stops invoking an unsubscribed status handler', async () => {
    const fetchMock = installFetchMock()
    fetchMock
      .mockResolvedValueOnce(okInfoResponse('3.1.0', 'fq-before-unsubscribe'))
      .mockResolvedValueOnce(okInfoResponse('3.2.0', 'fq-after-unsubscribe'))
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    const unsubscribe = manager.subscribe('workspace-1', 'status', statusHandler)

    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })
    unsubscribe()
    unsubscribe()
    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })

    expect(statusPayloads(statusHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'live', version: '3.1.0', instanceId: 'fq-before-unsubscribe' },
    ])
  })

  it('T-U-036 and T-U-037 isolates subscribers by workspace and future event type', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse('3.3.0', 'fq-isolated'))
    const manager = new FlashQueryClientManager()
    const workspaceHandler = vi.fn()
    const otherWorkspaceHandler = vi.fn()
    const vaultHandler = vi.fn()
    const toolsHandler = vi.fn()
    const futureHandler = vi.fn()
    const unsubscribeVault = manager.subscribe('workspace-1', 'vault-changed', vaultHandler)
    const unsubscribeTools = manager.subscribe('workspace-1', 'tools-changed', toolsHandler)
    const unsubscribeFuture = manager.subscribe('workspace-1', 'future-event', futureHandler)
    manager.subscribe('workspace-1', 'status', workspaceHandler)
    manager.subscribe('workspace-2', 'status', otherWorkspaceHandler)

    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })
    unsubscribeVault()
    unsubscribeTools()
    unsubscribeFuture()

    expect(statusPayloads(workspaceHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'live', version: '3.3.0', instanceId: 'fq-isolated' },
    ])
    expect(otherWorkspaceHandler).not.toHaveBeenCalled()
    expect(vaultHandler).not.toHaveBeenCalled()
    expect(toolsHandler).not.toHaveBeenCalled()
    expect(futureHandler).not.toHaveBeenCalled()
  })

  it('T-U-038 and T-U-039 emits error only for disconnected status payloads', async () => {
    const fetchMock = installFetchMock()
    fetchMock
      .mockResolvedValueOnce(okInfoResponse('3.4.0', 'fq-payload-shape'))
      .mockResolvedValueOnce(failedInfoResponse(503, 'Unavailable'))
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    manager.subscribe('workspace-1', 'status', statusHandler)

    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })
    await manager.connect('workspace-1', {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
    })

    const payloads = statusPayloads(statusHandler)
    expect(payloads.map((payload) => payload.status)).toEqual([
      'connecting',
      'live',
      'connecting',
      'disconnected',
    ])
    expect(payloads.filter((payload) => payload.status === 'disconnected')).toEqual([
      expect.objectContaining({ status: 'disconnected', error: expect.stringContaining('503') }),
    ])
    for (const payload of payloads.filter((item) => item.status === 'connecting' || item.status === 'live')) {
      expect(payload).not.toHaveProperty('error')
    }
  })

  it('REQ-008 calls list_vault with root and folder arguments and normalizes entries', async () => {
    const callTool = vi.fn()
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({
          entries: [
            { name: 'Projects', path: 'Projects', type: 'directory' },
            { name: 'Plan.md', path: 'Plan.md', type: 'file', title: 'Plan' },
          ],
        }) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify({
          entries: [{ name: 'Alpha.md', path: 'Projects/Alpha.md', type: 'file', title: 'Alpha' }],
        }) }],
      })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.listVault('workspace-1')).resolves.toEqual([
      { name: 'Projects', type: 'folder', vaultPath: 'Projects' },
      { name: 'Plan.md', type: 'document', vaultPath: 'Plan.md', title: 'Plan' },
    ])
    await expect(manager.listVault('workspace-1', 'Projects')).resolves.toEqual([
      { name: 'Alpha.md', type: 'document', vaultPath: 'Projects/Alpha.md', title: 'Alpha' },
    ])

    expect(callTool).toHaveBeenNthCalledWith(1, {
      name: 'list_vault',
      arguments: { path: '/', include: ['tracking'] },
    })
    expect(callTool).toHaveBeenNthCalledWith(2, {
      name: 'list_vault',
      arguments: { path: 'Projects', include: ['tracking'] },
    })
  })

  it('REQ-008 returns an empty vault listing for unconfigured or disconnected workspaces', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    const callTool = vi.fn()
    workspaceMock.workspaces = []
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.listVault('workspace-1')).resolves.toEqual([])

    workspaceMock.workspaces = [workspaceInfo()]
    await manager.connect('workspace-1', { transport: 'http', url: 'http://127.0.0.1:3100' })
    ;(manager as unknown as { workspaceStates: Map<string, { status: FlashQueryStatusPayload }> })
      .workspaceStates.get('workspace-1')!.status = { workspaceId: 'workspace-1', status: 'disconnected', error: 'offline' }

    await expect(manager.listVault('workspace-1')).resolves.toEqual([])
  })

  it('returns an empty vault listing when configured client creation fails before disconnected status exists', async () => {
    workspaceMock.workspaces = [workspaceInfo()]
    workspaceMock.token = 'secret-token'
    const statusHandler = vi.fn()
    const manager = new FlashQueryClientManager({
      createMcpClient: async () => {
        throw new Error('Authorization failed for secret-token')
      },
    })
    manager.subscribe('workspace-1', 'status', statusHandler)

    await expect(manager.listVault('workspace-1')).resolves.toEqual([])

    expect(statusPayloads(statusHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'disconnected', error: 'Authorization failed for [redacted]' },
    ])
  })

  it('returns an empty vault listing when a live workspace loses transport during list_vault', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    workspaceMock.workspaces = [workspaceInfo()]
    workspaceMock.token = 'secret-token'
    const callTool = vi.fn().mockRejectedValue(new Error('transport failed for secret-token'))
    const statusHandler = vi.fn()
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })
    manager.subscribe('workspace-1', 'status', statusHandler)

    await manager.connect('workspace-1', { transport: 'http', url: 'http://127.0.0.1:3100' })
    await expect(manager.listVault('workspace-1')).resolves.toEqual([])

    expect(statusPayloads(statusHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'live', version: '1.2.3', instanceId: 'fq-instance-1' },
      { workspaceId: 'workspace-1', status: 'disconnected', error: 'transport failed for [redacted]' },
    ])
  })

  it('closes and recreates a cached MCP client after transport failure and retry recovery', async () => {
    vi.useFakeTimers()
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    workspaceMock.workspaces = [workspaceInfo()]
    const staleClose = vi.fn()
    const staleCallTool = vi.fn().mockRejectedValue(new Error('transport failed'))
    const freshCallTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        entries: [{ name: 'Recovered.md', path: 'Recovered.md', type: 'file' }],
      }) }],
    })
    const createMcpClient = vi.fn()
      .mockResolvedValueOnce({ callTool: staleCallTool, close: staleClose })
      .mockResolvedValueOnce({ callTool: freshCallTool })
    const manager = new FlashQueryClientManager({ createMcpClient })

    await manager.connect('workspace-1', { transport: 'http', url: 'http://127.0.0.1:3100' })
    await expect(manager.listVault('workspace-1')).resolves.toEqual([])
    expect(staleClose).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(2_000)

    await expect(manager.listVault('workspace-1')).resolves.toEqual([
      { name: 'Recovered.md', type: 'document', vaultPath: 'Recovered.md' },
    ])
    expect(createMcpClient).toHaveBeenCalledTimes(2)
    expect(freshCallTool).toHaveBeenCalledWith({
      name: 'list_vault',
      arguments: { path: '/', include: ['tracking'] },
    })
  })

  it('T-I-005 omits malformed list_vault entries while returning valid entries', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        entries: [
          { name: 'Plan.md', path: 'Plan.md', type: 'file', title: 'Plan' },
          { name: 'Broken.md', type: 'file' },
          { name: 'Ideas', path: 'Ideas', type: 'directory' },
        ],
      }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.listVault('workspace-1')).resolves.toEqual([
      { name: 'Plan.md', type: 'document', vaultPath: 'Plan.md', title: 'Plan' },
      { name: 'Ideas', type: 'folder', vaultPath: 'Ideas' },
    ])
  })

  it('T-U-046 and T-U-047 calls get_document with body-only include and returns document body metadata', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        body: '# Body',
        version_token: 'v1',
        modified: '2026-05-01T00:00:00Z',
      }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.getDocument('workspace-1', 'Plan.md')).resolves.toEqual({
      body: '# Body',
      version_token: 'v1',
      modified: '2026-05-01T00:00:00Z',
    })

    expect(callTool).toHaveBeenCalledWith({
      name: 'get_document',
      arguments: { identifiers: 'Plan.md', include: ['body'] },
    })
    const args = callTool.mock.calls[0][0].arguments
    expect(args.include).toEqual(['body'])
    expect(args.include).not.toContain('frontmatter')
    expect(args.include).not.toContain('headings')
  })

  it('T-U-003 sends requested include parts and normalizes body, frontmatter, and version metadata', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        body: '# Body',
        frontmatter: { title: 'Plan' },
        version_token: 'v2',
        modified: '2026-06-03T00:00:00Z',
      }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.getDocument('workspace-1', 'Docs/Plan.md', { include: ['body', 'frontmatter', 'body'] })).resolves.toEqual({
      body: '# Body',
      frontmatter: { title: 'Plan' },
      version_token: 'v2',
      modified: '2026-06-03T00:00:00Z',
    })

    expect(callTool).toHaveBeenCalledWith({
      name: 'get_document',
      arguments: { identifiers: 'Docs/Plan.md', include: ['body', 'frontmatter'] },
    })
  })

  it('T-U-003 returns token-safe getDocument errors for missing requested parts and error envelopes', async () => {
    workspaceMock.workspaces = [workspaceInfo()]
    workspaceMock.token = 'secret-token'
    const missingPartManager = new FlashQueryClientManager({
      createMcpClient: async () => ({
        callTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify({ body: '# Body' }) }],
        }),
      }),
    })

    await expect(missingPartManager.getDocument('workspace-1', 'Plan.md', { include: ['frontmatter'] }))
      .rejects.toThrow('FlashQuery get_document returned no frontmatter for Plan.md')

    const envelopeManager = new FlashQueryClientManager({
      createMcpClient: async () => ({
        callTool: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: JSON.stringify({ error: 'Unauthorized secret-token' }) }],
        }),
      }),
    })

    await expect(envelopeManager.getDocument('workspace-1', 'Plan.md'))
      .rejects.toThrow('Unauthorized [redacted]')
  })

  it('T-U-048 through T-U-050 and T-U-099 through T-U-101 calls write_document update-only with body content and forbidden keys absent', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ modified: '2026-05-03T00:00:00Z' }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.writeDocument('workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: true,
      modified: '2026-05-03T00:00:00Z',
    })

    expect(callTool).toHaveBeenCalledWith({
      name: 'write_document',
      arguments: { mode: 'update', identifier: 'Plan.md', content: 'body' },
    })
    const args = callTool.mock.calls[0][0].arguments
    expect(args.mode).toBe('update')
    expect(args.mode).not.toBe('create')
    expect(args).not.toHaveProperty('frontmatter')
    expect(args).not.toHaveProperty('title')
    expect(args).not.toHaveProperty('tags')
    expect(args).not.toHaveProperty('expected_version')
    expect(args).not.toHaveProperty('if_match')
  })

  it('T-U-004 writes object payload content and filters managed frontmatter fields', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ modified: '2026-06-03T01:00:00Z' }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.writeDocument('workspace-1', 'Plan.md', {
      content: '# Body',
      frontmatter: {
        title: 'Plan',
        fq_id: 'managed-id',
        fq_created: 'managed-created',
        fq_updated: 'managed-updated',
        fq_archived_at: null,
        fq_instance: 'instance',
        fq_owner: 'owner',
        fq_type: 'document',
      },
      tags: ['project'],
    })).resolves.toEqual({ success: true, modified: '2026-06-03T01:00:00Z' })

    expect(callTool).toHaveBeenCalledWith({
      name: 'write_document',
      arguments: {
        mode: 'update',
        identifier: 'Plan.md',
        content: '# Body',
        frontmatter: { title: 'Plan' },
        tags: ['project'],
      },
    })
  })

  it('T-U-004 rejects invalid tags and empty object writes before calling MCP', async () => {
    const callTool = vi.fn()
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.writeDocument('workspace-1', 'Plan.md', { tags: ['ok', 3] } as never)).resolves.toEqual({
      success: false,
      error: 'FlashQuery write payload tags must be strings',
    })
    await expect(manager.writeDocument('workspace-1', 'Plan.md', {})).resolves.toEqual({
      success: false,
      error: 'FlashQuery write payload must include content, frontmatter, or tags',
    })
    expect(callTool).not.toHaveBeenCalled()
  })

  it('T-U-004 treats managed-only frontmatter writes as a successful no-op', async () => {
    const callTool = vi.fn()
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.writeDocument('workspace-1', 'Plan.md', {
      frontmatter: {
        fq_id: 'managed-id',
        fq_updated: '2026-06-03T01:00:00Z',
      },
    })).resolves.toEqual({ success: true, modified: '' })

    expect(callTool).not.toHaveBeenCalled()
  })

  it('T-U-005 searches with include_archived, defaults, and list-all semantics', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        results: [
          {
            entity_type: 'document',
            identifier: 'Docs\\Plan.md',
            path: 'Docs\\Plan.md',
            title: 'Plan',
            content_preview: 'plan preview',
          },
          {
            entity_type: 'memory',
            identifier: 'memory-identifier-1',
            memory_id: 'memory-1',
            title: 'Memory',
            content_preview: 'Remember this',
          },
        ],
        total: 2,
      }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.search('workspace-1', { query: '' })).resolves.toEqual({
      documents: [{ filename: 'Plan.md', fullPath: 'Docs/Plan.md', title: 'Plan', snippet: 'plan preview' }],
      memories: [{ id: 'memory-1', text: 'Remember this', title: 'Memory', snippet: 'Remember this' }],
      total_documents: 1,
      total_memories: 1,
    })

    expect(callTool).toHaveBeenCalledWith({
      name: 'search',
      arguments: {
        query: '',
        mode: 'mixed',
        entity_types: ['documents', 'memories'],
        limit: 50,
        include_archived: true,
        list_all: true,
      },
    })
  })

  it('T-U-005 returns a safe empty response for empty semantic searches without calling MCP', async () => {
    const callTool = vi.fn()
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.search('workspace-1', { query: '   ', mode: 'semantic' })).resolves.toEqual({
      documents: [],
      memories: [],
      total_documents: 0,
      total_memories: 0,
      error: 'Type a query to search semantically.',
    })
    expect(callTool).not.toHaveBeenCalled()
  })

  it('T-U-006 normalizes vault-index entries from FlashQuery search and returns empty results when disconnected', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({
        results: [
          { entity_type: 'document', path: 'Docs\\Plan.md' },
          { entity_type: 'document', identifier: 'Notes/Today.md' },
          { entity_type: 'memory', identifier: 'memory-1', content_preview: 'Memory' },
        ],
        total: 3,
      }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.listVaultIndex('workspace-1')).resolves.toEqual([
      { filename: 'Plan.md', fullPath: 'Docs/Plan.md' },
      { filename: 'Today.md', fullPath: 'Notes/Today.md' },
    ])

    expect(callTool).toHaveBeenCalledWith({
      name: 'search',
      arguments: {
        query: '',
        mode: 'filesystem',
        entity_types: ['documents'],
        limit: 1000,
        include_archived: true,
        list_all: true,
      },
    })

    ;(manager as unknown as { workspaceStates: Map<string, { status: FlashQueryStatusPayload }> })
      .workspaceStates.get('workspace-1')!.status = { workspaceId: 'workspace-1', status: 'disconnected', error: 'offline' }
    await expect(manager.listVaultIndex('workspace-1')).resolves.toEqual([])
  })

  it('T-U-006 keeps the live workspace connected when vault-index search fails', async () => {
    const fetchMock = installFetchMock()
    fetchMock.mockResolvedValue(okInfoResponse())
    workspaceMock.workspaces = [workspaceInfo()]
    workspaceMock.token = 'secret-token'
    const callTool = vi.fn().mockRejectedValue(new Error('transport failed for secret-token'))
    const statusHandler = vi.fn()
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })
    manager.subscribe('workspace-1', 'status', statusHandler)

    await manager.connect('workspace-1', { transport: 'http', url: 'http://127.0.0.1:3100' })
    await expect(manager.listVaultIndex('workspace-1')).resolves.toEqual([])

    expect(statusPayloads(statusHandler)).toEqual([
      { workspaceId: 'workspace-1', status: 'connecting' },
      { workspaceId: 'workspace-1', status: 'live', version: '1.2.3', instanceId: 'fq-instance-1' },
    ])
  })

  it('passes an empty body through to write_document unchanged', async () => {
    const callTool = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ modified: '2026-05-04T00:00:00Z' }) }],
    })
    workspaceMock.workspaces = [workspaceInfo()]
    const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })

    await expect(manager.writeDocument('workspace-1', 'Plan.md', '')).resolves.toEqual({
      success: true,
      modified: '2026-05-04T00:00:00Z',
    })

    expect(callTool).toHaveBeenCalledWith({
      name: 'write_document',
      arguments: { mode: 'update', identifier: 'Plan.md', content: '' },
    })
  })

  it('T-U-023 positive half sends the rehydrated bearer token on MCP transport calls only', async () => {
    workspaceMock.workspaces = [workspaceInfo({
      transport: 'http',
      url: 'http://127.0.0.1:3100/',
      auth: { type: 'bearer', token: 'inline-token' },
    })]
    workspaceMock.token = 'stored-token'
    sdkMock.clientConnect.mockResolvedValue(undefined)
    sdkMock.clientCallTool.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify({ entries: [] }) }],
    })
    const manager = new FlashQueryClientManager()

    await expect(manager.listVault('workspace-1')).resolves.toEqual([])

    expect(getWorkspaceToken).toHaveBeenCalledWith('workspace-1')
    expect(sdkMock.StreamableHTTPClientTransport).toHaveBeenCalledTimes(1)
    const [url, options] = sdkMock.StreamableHTTPClientTransport.mock.calls[0] as [URL, { requestInit?: { headers?: Headers } }]
    expect(url.toString()).toBe('http://127.0.0.1:3100/mcp')
    expect(options.requestInit?.headers?.get('Authorization')).toBe('Bearer stored-token')
    expect(JSON.stringify(sdkMock.StreamableHTTPClientTransport.mock.calls)).not.toContain('inline-token')
  })

  it('redacts token-bearing getDocument failures before they reach the renderer', async () => {
    workspaceMock.workspaces = [workspaceInfo()]
    workspaceMock.token = 'secret-token'
    const manager = new FlashQueryClientManager({
      createMcpClient: async () => ({
        callTool: vi.fn().mockRejectedValue(new Error('Authorization failed for secret-token')),
      }),
    })

    await expect(manager.getDocument('workspace-1', 'Plan.md'))
      .rejects.toThrow('Authorization failed for [redacted]')
  })

  it('returns safe write failures for malformed JSON and token-bearing transport errors', async () => {
    workspaceMock.workspaces = [workspaceInfo({ transport: 'http', url: 'http://127.0.0.1:3100' })]
    workspaceMock.token = 'secret-token'
    const malformedManager = new FlashQueryClientManager({
      createMcpClient: async () => ({
        callTool: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: '{not-json' }] }),
      }),
    })

    await expect(malformedManager.writeDocument('workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: false,
      error: 'FlashQuery write_document returned malformed JSON',
    })

    const rejectingManager = new FlashQueryClientManager({
      createMcpClient: async () => ({
        callTool: vi.fn().mockRejectedValue(new Error('Authorization failed for secret-token')),
      }),
    })

    await expect(rejectingManager.writeDocument('workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: false,
      error: 'Authorization failed for [redacted]',
    })
  })
})

function workspaceInfo(connection: FlashQueryConnection = { transport: 'http', url: 'http://127.0.0.1:3100' }) {
  return {
    id: 'workspace-1',
    name: 'Workspace',
    color: '#00aaff',
    rootPath: '/tmp/workspace',
    flashqueryConnection: connection,
  }
}
