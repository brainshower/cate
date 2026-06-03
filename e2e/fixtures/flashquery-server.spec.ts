import { test, expect } from '@playwright/test'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { startFlashQueryStubServer } from './flashquery-server'

async function callTool(
  baseUrl: string,
  name: string,
  args: Record<string, unknown>,
  token = 'fixture-token',
) {
  const client = new Client({ name: 'cate-e2e-fixture-test', version: '1.0.0' })
  const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`), {
    requestInit: { headers: new Headers({ Authorization: `Bearer ${token}` }) },
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

test('T-E-005 FlashQuery stub lists nested vault folders and empty vault state', async () => {
  const server = await startFlashQueryStubServer()
  try {
    const info = await fetch(`${server.baseUrl}/mcp/info`)
    expect(info.ok).toBe(true)
    expect(await info.json()).toMatchObject({ version: '1.0.0-e2e', instance_id: 'fq-e2e-stub' })

    const unauthorizedInfo = await fetch(`${server.baseUrl}/mcp/info`, {
      headers: { Authorization: 'Bearer should-not-be-sent' },
    })
    expect(unauthorizedInfo.status).toBe(400)

    await expect(callTool(server.baseUrl, 'list_vault', { path: '/' }, 'wrong-token')).rejects.toThrow()

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
    expect(await callTool(server.baseUrl, 'search', {
      query: '',
      mode: 'filesystem',
      entity_types: ['documents'],
      include_archived: true,
      list_all: true,
    })).toMatchObject({
      total: 3,
      results: [
        {
          entity_type: 'document',
          identifier: 'Projects/Cate.md',
          path: 'Projects/Cate.md',
          content_preview: '# Cate',
        },
        {
          entity_type: 'document',
          identifier: 'Projects/Deep/Nested.md',
          path: 'Projects/Deep/Nested.md',
        },
        {
          entity_type: 'document',
          identifier: 'Welcome.md',
          path: 'Welcome.md',
        },
      ],
    })

    server.seedEmptyVault()
    expect(await callTool(server.baseUrl, 'list_vault', { path: '/', include: ['tracking'] })).toEqual({ entries: [] })
  } finally {
    await server.close()
  }
})

test('T-E-005 FlashQuery stub reads, update-writes, resets state, and exposes counters', async () => {
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

test('T-E-002 FlashQuery stub supports frontmatter reads, writes, and call inspection', async () => {
  const server = await startFlashQueryStubServer()
  try {
    server.seedDocuments({
      'Plan.md': {
        body: '# Plan\n\nBody',
        frontmatter: { title: 'Plan', tags: ['one'] },
      },
    })

    expect(await callTool(server.baseUrl, 'get_document', { identifiers: 'Plan.md', include: ['frontmatter'] })).toMatchObject({
      frontmatter: { title: 'Plan', tags: ['one'] },
      version_token: 'stub-version-1',
    })
    expect(await callTool(server.baseUrl, 'get_document', { identifiers: 'Plan.md', include: ['body', 'frontmatter'] })).toMatchObject({
      body: '# Plan\n\nBody',
      frontmatter: { title: 'Plan', tags: ['one'] },
    })
    expect(server.lastGetArgs()).toEqual({ identifiers: 'Plan.md', include: ['body', 'frontmatter'] })

    await callTool(server.baseUrl, 'write_document', {
      mode: 'update',
      identifier: 'Plan.md',
      content: '# Plan\n\nBody updated',
    })
    expect(server.documentBody('Plan.md')).toBe('# Plan\n\nBody updated')
    expect(server.documentFrontmatter('Plan.md')).toEqual({ title: 'Plan', tags: ['one'] })

    await callTool(server.baseUrl, 'write_document', {
      mode: 'update',
      identifier: 'Plan.md',
      frontmatter: { title: 'Plan 2' },
    })
    expect(server.documentBody('Plan.md')).toBe('# Plan\n\nBody updated')
    expect(server.documentFrontmatter('Plan.md')).toEqual({ title: 'Plan 2' })
    expect(server.lastWriteArgs()).toEqual({
      mode: 'update',
      identifier: 'Plan.md',
      frontmatter: { title: 'Plan 2' },
    })

    server.setDocumentBody('Plan.md', 'latest body')
    server.setDocumentFrontmatter('Plan.md', { title: 'Latest' })
    expect(server.documentBody('Plan.md')).toBe('latest body')
    expect(server.documentFrontmatter('Plan.md')).toEqual({ title: 'Latest' })

    server.setDocumentNotFound('Plan.md', true)
    expect(await callTool(server.baseUrl, 'get_document', { identifiers: 'Plan.md', include: ['body'] })).toMatchObject({
      error: 'not_found',
    })
  } finally {
    await server.close()
  }
})

test('T-E-005 FlashQuery stub validates a caller-provided expected bearer token', async () => {
  const server = await startFlashQueryStubServer({ expectedBearerToken: 'persisted-e2e-token' })
  try {
    await expect(callTool(server.baseUrl, 'list_vault', { path: '/' }, 'fixture-token')).rejects.toThrow()
    await expect(callTool(server.baseUrl, 'list_vault', { path: '/' }, 'persisted-e2e-token')).resolves.toMatchObject({
      entries: expect.any(Array),
    })
  } finally {
    await server.close()
  }
})
