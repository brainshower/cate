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

function statusPayloads(handler: ReturnType<typeof vi.fn>): FlashQueryStatusPayload[] {
  return handler.mock.calls.map((call) => (call[0] as FlashQueryClientEvent<FlashQueryStatusPayload>).payload)
}

afterEach(() => {
  Object.defineProperty(globalThis, 'fetch', { value: originalFetch, configurable: true })
  vi.restoreAllMocks()
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
    })
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'http://127.0.0.1:3100/mcp/info', {
      method: 'GET',
      headers: { Accept: 'application/json' },
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
})
