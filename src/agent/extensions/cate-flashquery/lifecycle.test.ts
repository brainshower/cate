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

  it('T-U-015 invalidates old workspace tools when rebind to a new workspace fails', async () => {
    const pi = mockPi()
    const clientA = mockClient('ws-a', [eligible({ name: 'old_tool' })])
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: vi.fn()
        .mockResolvedValueOnce(handoff('ws-a'))
        .mockResolvedValueOnce(handoff('ws-b')),
      openClient: vi.fn()
        .mockResolvedValueOnce(clientA)
        .mockRejectedValueOnce(new Error('new workspace unavailable')),
    })

    await lifecycle.rebind('/workspace-a')
    const oldTool = pi.registerTool.mock.calls.find(([tool]) => tool.name === 'old_tool')?.[0]

    await expect(lifecycle.rebind('/workspace-b')).rejects.toThrow('new workspace unavailable')
    const staleResult = await oldTool.execute('call-after-failed-rebind', {}, undefined, undefined, {})

    expect(staleResult).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: expect.stringContaining('not available in the current FlashQuery workspace') }],
      details: { stale: true },
    })
    expect(clientA.callTool).not.toHaveBeenCalled()
    expect(clientA.close).toHaveBeenCalledTimes(1)
  })

  it('T-U-015 reconciles removed, changed, and newly available tools without provider unregister APIs', async () => {
    const pi = mockPi()
    const clientA = mockClient('ws-a', [
      eligible({
        name: 'stale_tool',
        inputSchema: {
          type: 'object',
          properties: { oldOnly: { type: 'string' } },
          required: ['oldOnly'],
        },
      }),
      eligible({
        name: 'changed_tool',
        inputSchema: {
          type: 'object',
          properties: { oldValue: { type: 'string' } },
          required: ['oldValue'],
        },
      }),
    ])
    const clientB = mockClient('ws-b', [
      eligible({
        name: 'changed_tool',
        inputSchema: {
          type: 'object',
          properties: { newValue: { type: 'number' } },
          required: ['newValue'],
        },
      }),
      eligible({ name: 'new_tool' }),
    ])
    const handoffs = [handoff('ws-a'), handoff('ws-b')]
    const clients = [clientA, clientB]
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoffs.shift() ?? null,
      openClient: async () => clients.shift() ?? null,
    })

    await lifecycle.rebind('/workspace-a')
    const staleTool = pi.registerTool.mock.calls.find(([tool]) => tool.name === 'stale_tool')?.[0]

    await lifecycle.rebind('/workspace-b')
    const changedRegistrations = pi.registerTool.mock.calls.filter(([tool]) => tool.name === 'changed_tool')
    const newTool = pi.registerTool.mock.calls.find(([tool]) => tool.name === 'new_tool')?.[0]
    const staleResult = await staleTool.execute('call-stale', {}, undefined, undefined, {})

    expect(changedRegistrations).toHaveLength(2)
    expect(changedRegistrations[1][0].parameters.properties).toHaveProperty('newValue')
    expect(newTool).toBeTruthy()
    expect(staleResult).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: expect.stringContaining('not available in the current FlashQuery workspace') }],
      details: { stale: true },
    })
    expect(pi.unregisterProvider).not.toHaveBeenCalled()
  })

  it('T-U-016 REQ-015 enriches call_model description from discovery metadata or loading placeholder', async () => {
    const discoveredPi = mockPi()
    const discoveredClient = mockClient('ws-a', [eligible({ name: 'call_model', description: 'Base call_model.' })], {
      models: [{ id: 'gpt-5', name: 'GPT-5' }],
      purposes: [{ id: 'architect', name: 'Architect' }],
    })
    const discoveredLifecycle = createCateFlashQueryLifecycle(discoveredPi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => discoveredClient,
    })

    await discoveredLifecycle.rebind('/workspace-a')

    const discoveredTool = registeredTool(discoveredPi, 'call_model')
    expect(discoveredTool.description).toContain('Architect')
    expect(discoveredTool.description).toContain('architect')
    expect(discoveredTool.description).toContain('GPT-5')
    expect(discoveredTool.description).toContain('gpt-5')
    expect(discoveredClient.callTool.mock.calls.map(([name]) => name)).not.toContain('list_models')
    expect(discoveredClient.callTool.mock.calls.map(([name]) => name)).not.toContain('list_purposes')

    const loadingPi = mockPi()
    const loadingClient = mockClient('ws-b', [eligible({ name: 'call_model' })], {
      models: [],
      purposes: [],
    })
    const loadingLifecycle = createCateFlashQueryLifecycle(loadingPi.api, {
      readHandoff: async () => handoff('ws-b'),
      openClient: async () => loadingClient,
    })

    await loadingLifecycle.rebind('/workspace-b')

    expect(registeredTool(loadingPi, 'call_model').description).toContain('Available purposes: loading...')
  })

  it('T-U-016 REQ-015 dispatches call_model with return messages, threaded trace IDs, and no live progress', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [eligible({ name: 'call_model' })])
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => client,
    })
    await lifecycle.rebind('/workspace-a')
    const tool = registeredTool(pi, 'call_model')
    const onUpdate = vi.fn()
    const ctx = { conversationId: 'conversation-1' }

    const first = await tool.execute('call-1', { prompt: 'Summarize this.' }, undefined, onUpdate, ctx)
    const second = await tool.execute('call-2', { prompt: 'Continue.' }, undefined, onUpdate, ctx)

    expect(client.callTool).toHaveBeenNthCalledWith(
      1,
      'call_model',
      expect.objectContaining({
        prompt: 'Summarize this.',
        return_messages: true,
        _meta: { trace_id: expect.stringMatching(/^cate-ws-[a-z0-9]{8}-conv-[a-z2-7]{16}$/) },
      }),
      expect.any(Object),
    )
    expect(client.callTool).toHaveBeenNthCalledWith(
      2,
      'call_model',
      expect.objectContaining({
        return_messages: true,
        _meta: { trace_id: client.callTool.mock.calls[0][1]._meta.trace_id },
      }),
      expect.any(Object),
    )
    expect(first.details).toMatchObject({ flashquery: true, toolName: 'call_model', traceId: client.callTool.mock.calls[0][1]._meta.trace_id })
    expect(second.details).toMatchObject({ traceId: client.callTool.mock.calls[0][1]._meta.trace_id })
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('T-U-016 REQ-015 hydrates resolved refs before call_model and preserves ref diagnostics', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [eligible({ name: 'call_model' })])
    client.callTool = vi.fn(async (name: string) => {
      if (name === 'get_document') return { content: [{ type: 'text', text: '# Hydrated body' }] }
      return { content: [{ type: 'text', text: 'model result' }], diagnostics: { tokens: 17 } }
    })
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => client,
    })
    await lifecycle.rebind('/workspace-a')

    const result = await registeredTool(pi, 'call_model').execute(
      'call-1',
      { messages: [{ role: 'user', content: 'Use {{ref:Path/to/Doc.md}} please.' }] },
      undefined,
      undefined,
      { conversationId: 'conversation-1' },
    )

    expect(client.callTool).toHaveBeenNthCalledWith(
      1,
      'get_document',
      { path: 'Path/to/Doc.md', include: ['body'] },
      expect.any(Object),
    )
    expect(client.callTool).toHaveBeenNthCalledWith(
      2,
      'call_model',
      expect.objectContaining({ return_messages: true }),
      expect.any(Object),
    )
    expect(result.details).toMatchObject({
      flashquery: true,
      refs: [{ path: 'Path/to/Doc.md', resolved: true }],
      diagnostics: { tokens: 17 },
    })
  })

  it('T-U-016 REQ-015 blocks unresolved refs and preserves mid-stream error diagnostics', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [eligible({ name: 'call_model' })])
    client.callTool = vi.fn(async (name: string) => {
      if (name === 'get_document') throw new Error('not found')
      return { content: [{ type: 'text', text: 'should not dispatch' }] }
    })
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => client,
    })
    await lifecycle.rebind('/workspace-a')
    const tool = registeredTool(pi, 'call_model')

    const unresolved = await tool.execute(
      'call-1',
      { prompt: 'Use {{ref:Path/to/Doc.md}}.' },
      undefined,
      undefined,
      { conversationId: 'conversation-1' },
    )

    expect(unresolved).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: 'Reference {{ref:Path/to/Doc.md}} could not be resolved (document not found).' }],
      details: { flashquery: true, refs: [{ path: 'Path/to/Doc.md', resolved: false }] },
    })
    expect(client.callTool.mock.calls.map(([name]) => name)).toEqual(['get_document'])

    client.callTool = vi.fn(async () => ({
      isError: true,
      content: [{ type: 'text', text: 'FlashQuery model stream failed' }],
      diagnostics: { cost_usd: 0.03, tokens: 42 },
      partial: true,
    }))
    const errored = await tool.execute('call-2', { prompt: 'No ref.' }, undefined, undefined, { conversationId: 'conversation-1' })

    expect(errored).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: 'FlashQuery model stream failed' }],
      details: {
        flashquery: true,
        toolName: 'call_model',
        diagnostics: { cost_usd: 0.03, tokens: 42 },
        result: { partial: true },
      },
    })
  })

  it('T-U-017 REQ-016 executes source_ref call_macro without confirmation and applies defaults', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [eligible({ name: 'call_macro' })])
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => client,
    })
    await lifecycle.rebind('/workspace-a')
    const ctx = { ui: { confirm: vi.fn() } }

    const result = await registeredTool(pi, 'call_macro').execute(
      'macro-1',
      { source_ref: 'macros/summarize.md' },
      undefined,
      undefined,
      ctx,
    )

    expect(ctx.ui.confirm).not.toHaveBeenCalled()
    expect(client.callTool).toHaveBeenCalledWith(
      'call_macro',
      expect.objectContaining({
        source_ref: 'macros/summarize.md',
        interactive: true,
        progress: 'milestones',
      }),
      expect.objectContaining({ onprogress: expect.any(Function) }),
    )
    expect(result.details).toMatchObject({ flashquery: true, toolName: 'call_macro' })
  })

  it('T-U-017 REQ-016 confirms inline source and cancels without dispatch', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [eligible({ name: 'call_macro' })])
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => client,
    })
    await lifecycle.rebind('/workspace-a')
    const ctx = { ui: { confirm: vi.fn(async () => false) } }

    const result = await registeredTool(pi, 'call_macro').execute(
      'macro-1',
      { source: 'WRITE memory note' },
      undefined,
      undefined,
      ctx,
    )

    expect(ctx.ui.confirm).toHaveBeenCalledWith(
      expect.stringContaining('FlashQuery macro'),
      expect.stringContaining('WRITE memory note'),
      expect.any(Object),
    )
    expect(client.callTool).not.toHaveBeenCalled()
    expect(result.content).toEqual([{ type: 'text', text: expect.stringContaining('cancelled') }])
  })

  it('T-U-017 REQ-016 preserves explicit macro options, forwards latest real progress, and keeps needs_user_input as a result', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [eligible({ name: 'call_macro' })])
    client.callTool = vi.fn(async (_name: string, _params: Record<string, unknown>, options?: { onprogress?: (progress: unknown) => void }) => {
      options?.onprogress?.({ progressToken: 'token-1', progress: 0.4, message: 'Reading vault' })
      options?.onprogress?.({ progressToken: 'token-1', progress: 0.7 })
      return {
        content: [{ type: 'text', text: 'Need a choice from the user' }],
        needs_user_input: { prompt: 'Pick target' },
        trace: [{ kind: 'tool', name: 'get_document', elapsed_ms: 12 }],
      }
    })
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: async () => handoff('ws-a'),
      openClient: async () => client,
    })
    await lifecycle.rebind('/workspace-a')
    const onUpdate = vi.fn()

    const result = await registeredTool(pi, 'call_macro').execute(
      'macro-1',
      { source_ref: 'macros/ask.md', interactive: false, progress: 'none' },
      undefined,
      onUpdate,
      { ui: { confirm: vi.fn() } },
    )

    expect(client.callTool).toHaveBeenCalledWith(
      'call_macro',
      expect.objectContaining({ interactive: false, progress: 'none' }),
      expect.objectContaining({ onprogress: expect.any(Function) }),
    )
    expect(onUpdate).toHaveBeenNthCalledWith(1, {
      content: [{ type: 'text', text: 'Reading vault' }],
      details: expect.objectContaining({ flashquery: true, toolName: 'call_macro', macroProgress: expect.any(Object) }),
    })
    expect(onUpdate).toHaveBeenNthCalledWith(2, {
      content: [{ type: 'text', text: 'Running macro...' }],
      details: expect.objectContaining({ flashquery: true, toolName: 'call_macro', macroProgress: expect.any(Object) }),
    })
    expect(onUpdate.mock.calls.map(([partial]) => partial.content[0].text).join('\n')).not.toMatch(/✓|pending|elapsed|complete 1\/|step row/i)
    expect(result).not.toHaveProperty('isError')
    expect(result.details).toMatchObject({
      flashquery: true,
      toolName: 'call_macro',
      result: {
        needs_user_input: { prompt: 'Pick target' },
        trace: [{ kind: 'tool', name: 'get_document', elapsed_ms: 12 }],
      },
    })
  })

  it('T-U-017 REQ-016 returns exact disconnected text for stale call_macro execution', async () => {
    const pi = mockPi()
    const client = mockClient('ws-a', [eligible({ name: 'call_macro' })])
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      readHandoff: vi.fn()
        .mockResolvedValueOnce(handoff('ws-a'))
        .mockResolvedValueOnce(null),
      openClient: async () => client,
    })
    await lifecycle.rebind('/workspace-a')
    const macroTool = registeredTool(pi, 'call_macro')
    await lifecycle.rebind('/workspace-a')

    const result = await macroTool.execute('macro-stale', { source_ref: 'macros/a.md' }, undefined, undefined, { ui: { confirm: vi.fn() } })

    expect(result).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: 'FlashQuery is not connected.' }],
      details: { flashquery: true, toolName: 'call_macro', disconnected: true },
    })
  })
})

function mockPi() {
  const registerTool = vi.fn()
  const unregisterProvider = vi.fn()
  const api = {
    on: vi.fn(),
    registerTool,
    unregisterProvider,
  } as unknown as ExtensionAPI
  return { api, registerTool, unregisterProvider }
}

function registeredTool(pi: ReturnType<typeof mockPi>, name: string) {
  const tool = pi.registerTool.mock.calls.find(([registered]) => registered.name === name)?.[0]
  if (!tool) throw new Error(`Tool not registered: ${name}`)
  return tool
}

function mockClient(
  workspaceId: string,
  records: FlashQueryRegistryRecord[],
  metadata: { models?: unknown[]; purposes?: unknown[] } = {},
): FlashQueryExtensionClient & { callTool: ReturnType<typeof vi.fn> } {
  return {
    listRegistryTools: vi.fn(async () => records),
    listModels: vi.fn(async () => metadata.models ?? [{ id: `${workspaceId}-model` }]),
    listPurposes: vi.fn(async () => metadata.purposes ?? [{ id: `${workspaceId}-purpose` }]),
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
