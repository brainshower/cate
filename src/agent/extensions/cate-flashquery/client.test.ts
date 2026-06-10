import { describe, expect, it, vi, beforeEach } from 'vitest'
import { openFlashQueryClient } from './client'

const mocks = vi.hoisted(() => ({
  instances: [] as Array<{
    connect: ReturnType<typeof vi.fn>
    listTools: ReturnType<typeof vi.fn>
    callTool: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
  }>,
  transports: [] as unknown[],
}))

vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn(function () {
    const instance = {
      connect: vi.fn(async () => {}),
      listTools: vi.fn(async () => ({ tools: [] })),
      callTool: vi.fn(async () => ({ content: [{ type: 'text', text: '[]' }] })),
      close: vi.fn(async () => {}),
    }
    mocks.instances.push(instance)
    return instance
  }),
}))

vi.mock('@modelcontextprotocol/sdk/client/streamableHttp.js', () => ({
  StreamableHTTPClientTransport: vi.fn(function () {
    const transport = {}
    mocks.transports.push(transport)
    return transport
  }),
}))

describe('cate-flashquery MCP client adapter', () => {
  beforeEach(() => {
    mocks.instances.length = 0
    mocks.transports.length = 0
  })

  it('T-U-015 fetches model and purpose metadata through call_model discovery resolvers', async () => {
    const client = await openFlashQueryClient({
      version: 1,
      workspaceId: 'workspace-1',
      endpointUrl: 'http://127.0.0.1:3210',
      authMode: 'none',
    })
    expect(client).toBeTruthy()
    const mcp = mocks.instances[0]
    mcp.callTool
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify({ models: [{ id: 'gpt-5' }] }) }] })
      .mockResolvedValueOnce({ content: [{ type: 'text', text: JSON.stringify({ purposes: [{ id: 'architect' }] }) }] })

    await expect(client!.listModels()).resolves.toEqual([{ id: 'gpt-5' }])
    await expect(client!.listPurposes()).resolves.toEqual([{ id: 'architect' }])

    expect(mcp.callTool).toHaveBeenNthCalledWith(
      1,
      { name: 'call_model', arguments: { resolver: 'list_models' } },
      undefined,
      { signal: undefined },
    )
    expect(mcp.callTool).toHaveBeenNthCalledWith(
      2,
      { name: 'call_model', arguments: { resolver: 'list_purposes' } },
      undefined,
      { signal: undefined },
    )
    expect(mcp.callTool.mock.calls.map(([call]) => call.name)).not.toContain('list_models')
    expect(mcp.callTool.mock.calls.map(([call]) => call.name)).not.toContain('list_purposes')
  })

  it('reconnects and retries once when FlashQuery rejects a stale MCP session ID', async () => {
    const client = await openFlashQueryClient({
      version: 1,
      workspaceId: 'workspace-1',
      endpointUrl: 'http://127.0.0.1:3210',
      authMode: 'none',
    })
    expect(client).toBeTruthy()
    const staleSessionError = new Error('Streamable HTTP error: Error POSTing to endpoint: {"jsonrpc":"2.0","error":{"code":-32000,"message":"Bad Request: No valid session ID"},"id":null}')
    mocks.instances[0].callTool.mockRejectedValueOnce(staleSessionError)

    await expect(client!.callTool('search', { query: 'session' })).resolves.toEqual({
      content: [{ type: 'text', text: '[]' }],
    })

    expect(mocks.instances).toHaveLength(2)
    expect(mocks.transports).toHaveLength(2)
    expect(mocks.instances[0].connect).toHaveBeenCalledWith(mocks.transports[0])
    expect(mocks.instances[0].callTool).toHaveBeenCalledTimes(1)
    expect(mocks.instances[0].close).toHaveBeenCalledTimes(1)
    expect(mocks.instances[1].connect).toHaveBeenCalledWith(mocks.transports[1])
    expect(mocks.instances[1].callTool).toHaveBeenCalledWith(
      { name: 'search', arguments: { query: 'session' } },
      undefined,
      { signal: undefined },
    )
  })
})
