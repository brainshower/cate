import { test, expect } from '@playwright/test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { startFlashQueryStubServer } from './flashquery-server'

async function callTool(baseUrl: string, name: string, args: Record<string, unknown>) {
  const client = new Client({ name: 'cate-e2e-fixture-test', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: new Headers({ Authorization: 'Bearer fixture-token' }) },
  })
  await client.connect(transport)
  try {
    const result = await client.callTool({ name, arguments: args })
    const text = result.content.find((part) => part.type === 'text')?.text
    return text ? JSON.parse(text) as Record<string, unknown> : {}
  } finally {
    await client.close()
  }
}

test('FlashQuery stub lists nested vault folders and empty vault state', async () => {
  const server = await startFlashQueryStubServer()
  try {
    const info = await fetch(`${server.baseUrl}/mcp/info`)
    expect(info.ok).toBe(true)
    expect(await info.json()).toMatchObject({ version: '1.0.0-e2e', instance_id: 'fq-e2e-stub' })

    const unauthorizedInfo = await fetch(`${server.baseUrl}/mcp/info`, {
      headers: { Authorization: 'Bearer should-not-be-sent' },
    })
    expect(unauthorizedInfo.status).toBe(400)

    expect(await callTool(server.baseUrl, 'list_vault', { path: '/', include: ['tracking'] })).toMatchObject({
      entries: [
        { name: 'Projects', type: 'folder', path: 'Projects' },
        { name: 'Welcome.md', type: 'file', path: 'Welcome.md' },
      ],
    })
    expect(await callTool(server.baseUrl, 'list_vault', { path: 'Projects', include: ['tracking'] })).toMatchObject({
      entries: [
        { name: 'Cate.md', type: 'file', path: 'Projects/Cate.md' },
        { name: 'Deep', type: 'folder', path: 'Projects/Deep' },
      ],
    })

    server.seedEmptyVault()
    expect(await callTool(server.baseUrl, 'list_vault', { path: '/', include: ['tracking'] })).toEqual({ entries: [] })
  } finally {
    await server.close()
  }
})

test('FlashQuery stub reads, update-writes, resets state, and exposes counters', async () => {
  const server = await startFlashQueryStubServer()
  try {
    expect(server.counts()).toEqual({ infoRequestCount: 0, mcpPostCount: 0 })

    await fetch(`${server.baseUrl}/mcp/info`)
    expect(await callTool(server.baseUrl, 'get_document', { identifiers: 'Welcome.md', include: ['body'] })).toMatchObject({
      body: '# Welcome\n\nThis is the starter document.',
    })

    const write = await callTool(server.baseUrl, 'write_document', {
      mode: 'update',
      identifier: 'Welcome.md',
      content: '# Welcome\n\nUpdated from E2E.',
    })
    expect(write).toMatchObject({ modified: expect.any(String) })
    expect(server.documentBody('Welcome.md')).toBe('# Welcome\n\nUpdated from E2E.')
    expect(await callTool(server.baseUrl, 'get_document', { identifiers: 'Welcome.md', include: ['body'] })).toMatchObject({
      body: '# Welcome\n\nUpdated from E2E.',
    })

    const create = await callTool(server.baseUrl, 'write_document', {
      mode: 'create',
      identifier: 'New.md',
      content: 'not allowed',
    })
    expect(create).toMatchObject({ error: 'unsupported_mode' })

    expect(server.counts().infoRequestCount).toBe(1)
    expect(server.counts().mcpPostCount).toBeGreaterThanOrEqual(4)

    server.resetCounts()
    server.resetDocuments()
    expect(server.counts()).toEqual({ infoRequestCount: 0, mcpPostCount: 0 })
    expect(server.documentBody('Welcome.md')).toBe('# Welcome\n\nThis is the starter document.')
  } finally {
    await server.close()
  }
})
