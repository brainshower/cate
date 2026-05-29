import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlashQueryClientManager } from './clientManager'
import type { FlashQueryClientEvent, FlashQueryStatusPayload } from './clientManager'
import type { FlashQueryConnection } from '../../shared/types'

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
  return handler.mock.calls.map((call) => (call[0] as FlashQueryClientEvent<FlashQueryStatusPayload>).payload)
}

afterEach(() => {
  Object.defineProperty(globalThis, 'fetch', { value: originalFetch, configurable: true })
  vi.restoreAllMocks()
  vi.useRealTimers()
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

    expect(result).toEqual({ status: 'live', version: '2.0.0', instanceId: 'fq-main' })
    expect(manager.getStatus('workspace-1')).toEqual(result)
    expect(statusPayloads(statusHandler)).toEqual([
      { status: 'connecting' },
      { status: 'live', version: '2.0.0', instanceId: 'fq-main' },
    ])
  })

  it('does not send bearer auth or perform POST /mcp during the info probe', async () => {
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
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain('secret-token')
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
    expect(statusPayloads(statusHandler)).toEqual([{ status: 'connecting' }, result])
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

    expect(result).toEqual({ status: 'disconnected', error: 'Unexpected token < in JSON' })
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

    expect(result).toEqual({ status: 'disconnected', error: 'connection refused' })
    expect(JSON.stringify(statusHandler.mock.calls)).not.toContain('secret-token')
    expect(statusPayloads(statusHandler)).toEqual([{ status: 'connecting' }, result])
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
    expect(statusPayloads(statusHandler)).toEqual([{ status: 'connecting' }])
    await vi.advanceTimersByTimeAsync(1)
    await expect(connectPromise).resolves.toEqual({
      status: 'disconnected',
      error: 'FlashQuery info probe timed out',
    })
    expect(statusPayloads(statusHandler)).toEqual([
      { status: 'connecting' },
      { status: 'disconnected', error: 'FlashQuery info probe timed out' },
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

    expect(liveResult).toEqual({ status: 'live', version: '2.1.0', instanceId: 'fq-live' })
    expect(failedResult.status).toBe('disconnected')
    expect(failedResult.error).toContain('502')
    expect(statusPayloads(liveHandler)).toEqual([
      { status: 'connecting' },
      { status: 'live', version: '2.1.0', instanceId: 'fq-live' },
    ])
    expect(statusPayloads(failedHandler)).toEqual([
      { status: 'connecting' },
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
    expect(statusPayloads(lateHandler)).toEqual([{ status: 'connecting' }])
    manager.dispose('workspace-late')
    resolveFetch(okInfoResponse('9.9.9', 'fq-late'))
    await connectPromise
    expect(statusPayloads(lateHandler)).toEqual([{ status: 'connecting' }])
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
      { status: 'connecting' },
      { status: 'live', version: '3.0.0', instanceId: 'fq-subscriber' },
      { status: 'connecting' },
      { status: 'disconnected', error: 'subscriber connection refused' },
    ]
    expect(statusPayloads(firstHandler)).toEqual(expectedPayloads)
    expect(statusPayloads(secondHandler)).toEqual(expectedPayloads)
    for (const call of firstHandler.mock.calls) {
      expect(call[0]).toMatchObject({ workspaceId: 'workspace-1', type: 'status' })
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
    })).resolves.toEqual({ status: 'live', version: '3.0.1', instanceId: 'fq-subscriber-safe' })

    expect(statusPayloads(healthyHandler)).toEqual([
      { status: 'connecting' },
      { status: 'live', version: '3.0.1', instanceId: 'fq-subscriber-safe' },
    ])
    expect(throwingHandler).toHaveBeenCalledTimes(2)
    expect(manager.getStatus('workspace-1')).toEqual({
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
      { status: 'connecting' },
      { status: 'live', version: '3.1.0', instanceId: 'fq-before-unsubscribe' },
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
      { status: 'connecting' },
      { status: 'live', version: '3.3.0', instanceId: 'fq-isolated' },
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
})
