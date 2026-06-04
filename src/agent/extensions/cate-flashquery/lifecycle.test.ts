import { describe, expect, it, vi } from 'vitest'
import { createCateFlashQueryLifecycle } from './lifecycle'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import type { FlashQueryRegistryRecord } from './registry'

describe('cate-flashquery lifecycle', () => {
  it('T-U-015 connects on session start and fetches registry, model, and purpose metadata', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [
      eligible({ name: 'call_model' }),
      eligible({ name: 'search_tools' }),
    ])
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => client,
    })

    await lifecycle.rebind('/workspace-a')

    expect(client.listRegistryTools).toHaveBeenCalledTimes(1)
    expect(client.listModels).toHaveBeenCalledTimes(1)
    expect(client.listPurposes).toHaveBeenCalledTimes(1)
    expect(lifecycle.currentGeneration()).toMatchObject({
      id: 1,
      handoff: { workspaceId: 'ws-a' },
      models: [{ id: 'ws-a-model' }],
      purposes: [{ id: 'ws-a-purpose' }],
    })
    expect(pi.registerTool.mock.calls.map(([tool]) => tool.name)).toEqual(['call_model', 'search_tools'])
  })

  it('T-U-015 rebinds workspaces, refreshes metadata, and ignores late old responses', async () => {
    const pi = mockPi()
    const deferredA = deferred<FlashQueryRegistryRecord[]>()
    const clientA = mockClient('ws-a', [])
    clientA.listRegistryTools = vi.fn(() => deferredA.promise)
    const clientB = mockClient('ws-b', [eligible({ name: 'ws_b_tool' })])
    const handoffs = [handoff('ws-a'), handoff('ws-b')]
    const clients = [clientA, clientB]
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoffs.shift() ?? null,
      openClient: async () => clients.shift() ?? null,
    })

    const first = lifecycle.rebind('/workspace-a')
    const second = lifecycle.rebind('/workspace-b')
    await second
    deferredA.resolve([eligible({ name: 'ws_a_tool' })])
    await first

    expect(lifecycle.currentGeneration()).toMatchObject({
      id: 2,
      handoff: { workspaceId: 'ws-b' },
      candidates: [{ name: 'ws_b_tool' }],
    })
    expect(pi.registerTool.mock.calls.map(([tool]) => tool.name)).toEqual(['ws_b_tool'])
    expect(clientA.close).toHaveBeenCalledTimes(1)
    expect(clientB.close).not.toHaveBeenCalled()
  })

  it('T-U-015 lets old in-flight calls complete on the old client while later calls use the new client', async () => {
    const pi = mockPi()
    const oldCall = deferred<unknown>()
    const clientA = mockClient('ws-a', [eligible({ name: 'shared_tool', toolId: 'old_shared_tool' })])
    clientA.callTool = vi.fn(() => oldCall.promise)
    const clientB = mockClient('ws-b', [eligible({ name: 'shared_tool', toolId: 'new_shared_tool' })])
    const handoffs = [handoff('ws-a'), handoff('ws-b')]
    const clients = [clientA, clientB]
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoffs.shift() ?? null,
      openClient: async () => clients.shift() ?? null,
    })

    await lifecycle.rebind('/workspace-a')
    const oldTool = pi.registerTool.mock.calls.at(-1)?.[0]
    const oldResultPromise = oldTool.execute('call-1', { value: 'old' }, undefined, undefined, {})

    await lifecycle.rebind('/workspace-b')
    expect(clientA.close).not.toHaveBeenCalled()
    const newTool = pi.registerTool.mock.calls.at(-1)?.[0]
    const newResult = await newTool.execute('call-2', { value: 'new' }, undefined, undefined, {})
    oldCall.resolve({ content: [{ type: 'text', text: 'old result' }] })
    const oldResult = await oldResultPromise

    expect(clientA.callTool).toHaveBeenCalledWith('old_shared_tool', { value: 'old' }, undefined)
    expect(clientB.callTool).toHaveBeenCalledWith('new_shared_tool', { value: 'new' }, undefined)
    expect(oldResult.details).toMatchObject({ workspaceId: 'ws-a', generation: 1 })
    expect(newResult.details).toMatchObject({ workspaceId: 'ws-b', generation: 2 })
    expect(clientA.close).toHaveBeenCalledTimes(1)
  })
})

function mockPi() {
  const registerTool = vi.fn()
  const api = {
    on: vi.fn(),
    registerTool,
  } as unknown as ExtensionAPI
  return { api, registerTool }
}

function mockClient(workspaceId: string, records: FlashQueryRegistryRecord[]): FlashQueryExtensionClient {
  return {
    listRegistryTools: vi.fn(async () => records),
    listModels: vi.fn(async () => [{ id: `${workspaceId}-model` }]),
    listPurposes: vi.fn(async () => [{ id: `${workspaceId}-purpose` }]),
    callTool: vi.fn(async () => ({ content: [{ type: 'text', text: `${workspaceId} ok` }] })),
    close: vi.fn(async () => {}),
  }
}

function eligible(overrides: FlashQueryRegistryRecord): FlashQueryRegistryRecord {
  return {
    name: 'tool',
    status: 'current',
    hostEligible: true,
    inputSchema: { type: 'object', properties: {} },
    ...overrides,
  }
}

function handoff(workspaceId: string): FlashQueryHandoff {
  return {
    version: 1,
    workspaceId,
    endpointUrl: `http://127.0.0.1/${workspaceId}`,
    authMode: 'none',
  }
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
