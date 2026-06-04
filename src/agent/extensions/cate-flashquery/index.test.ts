import { describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import { createCateFlashQueryExtension } from './index'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import type { FlashQueryRegistryRecord } from './registry'

describe('cate-flashquery extension registration', () => {
  it('T-U-014 registers eligible native and brokered FlashQuery tools and never registers a provider', async () => {
    const pi = mockPi()
    const client = mockClient([
      eligible({ name: 'call_model' }),
      eligible({ name: 'call_macro' }),
      eligible({ name: 'search_tools' }),
      eligible({ name: 'get_document', source: 'flashquery_native' }),
      eligible({ name: 'github.create_issue', source: 'brokered_mcp', server: 'github', toolId: 'github.create_issue' }),
      eligible({ name: 'deprecated_tool', status: 'deprecated' }),
      eligible({ name: 'unavailable_tool', status: 'unavailable' }),
      eligible({ name: 'hidden_tool', hostEligible: false }),
    ])

    createCateFlashQueryExtension(pi.api, {
      readHandoff: async () => handoff(),
      openClient: async () => client,
    })
    await pi.handlers.session_start?.({}, { cwd: '/workspace', signal: undefined })

    expect(pi.registerTool).toHaveBeenCalledTimes(5)
    expect(pi.registerTool.mock.calls.map(([tool]) => tool.name)).toEqual([
      'call_model',
      'call_macro',
      'search_tools',
      'get_document',
      'github_create_issue',
    ])
    expect(pi.registerProvider).not.toHaveBeenCalled()
    for (const [tool] of pi.registerTool.mock.calls) {
      expect(tool).toMatchObject({
        name: expect.any(String),
        label: expect.any(String),
        description: expect.any(String),
        parameters: expect.any(Object),
        execute: expect.any(Function),
      })
    }
  })

  it('T-U-014 dispatches registered tools through the FlashQuery client with the original tool identifier', async () => {
    const pi = mockPi()
    const client = mockClient([
      eligible({ name: 'github.create_issue', source: 'brokered_mcp', toolId: 'github.create_issue' }),
    ])
    client.callTool = vi.fn(async () => ({
      content: [{ type: 'text', text: 'created issue' }],
      structuredContent: { id: 123 },
    }))

    createCateFlashQueryExtension(pi.api, {
      readHandoff: async () => handoff(),
      openClient: async () => client,
    })
    await pi.handlers.session_start?.({}, { cwd: '/workspace', signal: undefined })
    const [tool] = pi.registerTool.mock.calls[0]
    const result = await tool.execute('call-1', { title: 'Bug' }, AbortSignal.timeout(1_000), undefined, {})

    expect(client.callTool).toHaveBeenCalledWith('github.create_issue', { title: 'Bug' }, expect.any(AbortSignal))
    expect(result).toMatchObject({
      content: [{ type: 'text', text: 'created issue' }],
      details: {
        flashquery: true,
        toolId: 'github.create_issue',
        toolName: 'github_create_issue',
      },
    })
  })

  it('T-U-014 returns a disconnected error result when no current FlashQuery client is available', async () => {
    const pi = mockPi()
    createCateFlashQueryExtension(pi.api, {
      readHandoff: async () => handoff(),
      openClient: async () => null,
    })

    await pi.handlers.session_start?.({}, { cwd: '/workspace', signal: undefined })

    expect(pi.registerTool).not.toHaveBeenCalled()

    const client = mockClient([eligible({ name: 'call_model' })])
    createCateFlashQueryExtension(pi.api, {
      readHandoff: async () => handoff(),
      openClient: async () => client,
    })
    await pi.handlers.session_start?.({}, { cwd: '/workspace', signal: undefined })
    await pi.handlers.session_shutdown?.({}, { cwd: '/workspace', signal: undefined })
    const [tool] = pi.registerTool.mock.calls[0]
    const result = await tool.execute('call-1', {}, undefined, undefined, {})

    expect(result).toMatchObject({
      isError: true,
      content: [{ type: 'text', text: expect.stringContaining('not available in the current FlashQuery workspace') }],
      details: { stale: true },
    })
  })

  it('T-U-014 keeps FlashQuery out of provider registration and ProvidersView rows', () => {
    const extensionSource = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf-8')
    const providersView = fs.readFileSync(
      path.join(__dirname, '..', '..', 'renderer', 'ProvidersView.tsx'),
      'utf-8',
    )

    expect(extensionSource).not.toContain('registerProvider')
    expect(providersView).not.toMatch(/provider\s*[:=]\s*['"]flashquery['"]/i)
    expect(providersView).not.toMatch(/id\s*[:=]\s*['"]flashquery['"]/i)
  })
})

function mockPi() {
  const handlers: Record<string, ((event: unknown, ctx: { cwd: string; signal?: AbortSignal }) => Promise<void>) | undefined> = {}
  const registerTool = vi.fn()
  const registerProvider = vi.fn()
  const api = {
    on: vi.fn((event: string, handler: (event: unknown, ctx: { cwd: string; signal?: AbortSignal }) => Promise<void>) => {
      handlers[event] = handler
    }),
    registerTool,
    registerProvider,
  } as unknown as ExtensionAPI
  return { api, handlers, registerTool, registerProvider }
}

function mockClient(records: FlashQueryRegistryRecord[]): FlashQueryExtensionClient {
  return {
    listRegistryTools: vi.fn(async () => records),
    listModels: vi.fn(async () => []),
    listPurposes: vi.fn(async () => []),
    callTool: vi.fn(async () => ({ content: [{ type: 'text', text: 'ok' }] })),
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

function handoff(): FlashQueryHandoff {
  return {
    version: 1,
    workspaceId: 'workspace-1',
    endpointUrl: 'http://127.0.0.1:3210',
    authMode: 'none',
  }
}
