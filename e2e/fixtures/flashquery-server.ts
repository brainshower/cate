import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { AddressInfo } from 'node:net'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'

export interface FlashQueryStubCounts {
  infoRequestCount: number
  mcpPostCount: number
}

export interface FlashQueryStubDocument {
  body: string
  frontmatter?: Record<string, unknown>
}

export interface FlashQueryStubMemory {
  text: string
  title?: string
}

export interface FlashQueryStubRegistryTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export interface FlashQueryStubServer {
  baseUrl: string
  close: () => Promise<void>
  counts: () => FlashQueryStubCounts
  resetCounts: () => void
  setAvailable: (available: boolean) => void
  resetDocuments: () => void
  seedEmptyVault: () => void
  seedDocuments: (documents: Record<string, string | FlashQueryStubDocument>) => void
  seedMemories: (memories: Record<string, string | FlashQueryStubMemory>) => void
  seedRegistryTools: (tools: FlashQueryStubRegistryTool[]) => void
  setDocumentTitles: (titles: Record<string, string | null>) => void
  documentBody: (vaultPath: string) => string | null
  documentFrontmatter: (vaultPath: string) => Record<string, unknown> | null
  setDocumentBody: (vaultPath: string, body: string) => void
  setDocumentFrontmatter: (vaultPath: string, frontmatter: Record<string, unknown>) => void
  setDocumentNotFound: (vaultPath: string, notFound: boolean) => void
  lastGetArgs: () => Record<string, unknown> | null
  lastSearchArgs: () => Record<string, unknown> | null
  lastWriteArgs: () => Record<string, unknown> | null
  sawMcpMethod: (method: string) => boolean
}

export interface FlashQueryStubServerOptions {
  expectedBearerToken?: string
}

const DEFAULT_BEARER_TOKEN = 'fixture-token'
const DEFAULT_DOCUMENTS: Record<string, FlashQueryStubDocument> = {
  'Welcome.md': { body: '# Welcome\n\nThis is the starter document.' },
  'Projects/Cate.md': { body: '# Cate\n\nCate integration notes.' },
  'Projects/Deep/Nested.md': { body: '# Nested\n\nMulti-level vault content.' },
}

function jsonResponse(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function textResponse(res: ServerResponse, status: number, text: string): void {
  res.writeHead(status, { 'content-type': 'text/plain' })
  res.end(text)
}

function normalizeVaultPath(value: unknown): string {
  if (typeof value !== 'string' || value === '/' || value.trim() === '') return ''
  return value.replace(/^\/+|\/+$/g, '')
}

function folderChildren(
  documents: Map<string, FlashQueryStubDocument>,
  titleOverrides: Map<string, string | null>,
  folderPath: string,
) {
  const prefix = folderPath ? `${folderPath}/` : ''
  const seen = new Set<string>()
  const entries: Array<{ name: string; type: 'folder' | 'file'; path: string; title?: string }> = []

  for (const documentPath of Array.from(documents.keys()).sort()) {
    if (!documentPath.startsWith(prefix)) continue
    const remainder = documentPath.slice(prefix.length)
    if (!remainder || remainder === documentPath && prefix) continue
    const [head, ...tail] = remainder.split('/')
    const childPath = prefix ? `${prefix}${head}` : head
    if (seen.has(childPath)) continue
    seen.add(childPath)

    if (tail.length > 0) {
      entries.push({ name: head, type: 'folder', path: childPath })
    } else {
      const overrideTitle = titleOverrides.get(childPath)
      entries.push({
        name: head,
        type: 'file',
        path: childPath,
        ...(overrideTitle === null
          ? {}
          : { title: overrideTitle ?? head.replace(/\.md$/i, '') }),
      })
    }
  }

  return entries
}

function searchResults(
  documents: Map<string, FlashQueryStubDocument>,
  titleOverrides: Map<string, string | null>,
  query: string,
  listAll: boolean,
) {
  const normalizedQuery = query.trim().toLowerCase()
  return Array.from(documents.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([path, document]) => {
      if (listAll || !normalizedQuery) return true
      return path.toLowerCase().includes(normalizedQuery) || document.body.toLowerCase().includes(normalizedQuery)
    })
    .map(([path, document]) => {
      const titleOverride = titleOverrides.get(path)
      const firstContentLine = document.body.split(/\r?\n/).find((line) => line.trim().length > 0) ?? ''
      return {
        entity_type: 'document' as const,
        identifier: path,
        path,
        ...(titleOverride === null
          ? {}
          : { title: titleOverride ?? path.split('/').at(-1)?.replace(/\.md$/i, '') ?? path }),
        content_preview: firstContentLine,
      }
    })
}

function memorySearchResults(
  memories: Map<string, FlashQueryStubMemory>,
  query: string,
  listAll: boolean,
) {
  const normalizedQuery = query.trim().toLowerCase()
  return Array.from(memories.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([, memory]) => {
      if (listAll || !normalizedQuery) return true
      return memory.text.toLowerCase().includes(normalizedQuery) || memory.title?.toLowerCase().includes(normalizedQuery)
    })
    .map(([id, memory]) => ({
      entity_type: 'memory' as const,
      identifier: id,
      memory_id: id,
      ...(memory.title ? { title: memory.title } : {}),
      content_preview: memory.text,
    }))
}

function mcpText(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
  }
}

function makeMcpServer(
  documents: Map<string, FlashQueryStubDocument>,
  memories: Map<string, FlashQueryStubMemory>,
  registryTools: FlashQueryStubRegistryTool[],
  titleOverrides: Map<string, string | null>,
  missingDocuments: Set<string>,
  recordGetArgs: (args: Record<string, unknown>) => void,
  recordSearchArgs: (args: Record<string, unknown>) => void,
  recordWriteArgs: (args: Record<string, unknown>) => void,
): McpServer {
  const server = new McpServer({ name: 'flashquery-e2e-stub', version: '1.0.0-e2e' })

  for (const tool of registryTools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description ?? `Fixture registry tool ${tool.name}`,
        inputSchema: z.record(z.string(), z.unknown()).optional(),
        _meta: tool.metadata,
      },
      async () => mcpText({ ok: true, tool: tool.name }),
    )
  }

  server.registerTool(
    'list_vault',
    {
      description: 'List deterministic in-memory vault entries',
      inputSchema: z.object({
        path: z.string().optional(),
        include: z.array(z.string()).optional(),
      }),
    },
    async ({ path }) => mcpText({ entries: folderChildren(documents, titleOverrides, normalizeVaultPath(path)) }),
  )

  server.registerTool(
    'get_document',
    {
      description: 'Read deterministic in-memory vault document body',
      inputSchema: z.object({
        identifiers: z.string(),
        include: z.array(z.string()).optional(),
      }),
    },
    async ({ identifiers, include }) => {
      const vaultPath = normalizeVaultPath(identifiers)
      recordGetArgs({ identifiers: vaultPath, include })
      const document = documents.get(vaultPath)
      if (!document || missingDocuments.has(vaultPath)) {
        return mcpText({ error: 'not_found', message: `No document found for ${identifiers}` })
      }
      const includeParts = Array.isArray(include) && include.length > 0 ? include : ['body']
      return mcpText({
        ...(includeParts.includes('body') ? { body: document.body } : {}),
        ...(includeParts.includes('frontmatter') ? { frontmatter: document.frontmatter ?? {} } : {}),
        version_token: 'stub-version-1',
        modified: new Date(0).toISOString(),
      })
    },
  )

  server.registerTool(
    'write_document',
    {
      description: 'Update deterministic in-memory vault document body',
      inputSchema: z.object({
        mode: z.string(),
        identifier: z.string(),
        content: z.string().optional(),
        frontmatter: z.record(z.string(), z.unknown()).optional(),
        tags: z.array(z.string()).optional(),
      }),
    },
    async ({ mode, identifier, content, frontmatter, tags }) => {
      const vaultPath = normalizeVaultPath(identifier)
      recordWriteArgs({
        mode,
        identifier: vaultPath,
        ...(content !== undefined ? { content } : {}),
        ...(frontmatter !== undefined ? { frontmatter } : {}),
        ...(tags !== undefined ? { tags } : {}),
      })
      if (mode !== 'update') {
        return mcpText({ error: 'unsupported_mode', message: 'Only update mode is supported by the E2E stub' })
      }
      const document = documents.get(vaultPath)
      if (!document || missingDocuments.has(vaultPath)) {
        return mcpText({ error: 'not_found', message: `No document found for ${identifier}` })
      }
      documents.set(vaultPath, {
        body: content ?? document.body,
        frontmatter: frontmatter ?? document.frontmatter,
      })
      return mcpText({ modified: new Date(1_000).toISOString() })
    },
  )

  server.registerTool(
    'search',
    {
      description: 'Search deterministic in-memory vault documents',
      inputSchema: z.object({
        query: z.string().optional(),
        mode: z.string().optional(),
        entity_types: z.array(z.string()).optional(),
        limit: z.number().optional(),
        include_archived: z.boolean().optional(),
        list_all: z.boolean().optional(),
      }),
    },
    async ({ query = '', mode, entity_types, limit = 50, include_archived, list_all }) => {
      recordSearchArgs({ query, mode, entity_types, limit, include_archived, list_all })
      const wantsDocuments = !entity_types?.length || entity_types.includes('documents')
      const wantsMemories = !entity_types?.length || entity_types.includes('memories')
      const documentResults = wantsDocuments
        ? searchResults(documents, titleOverrides, query, list_all === true)
        : []
      const memoryResults = wantsMemories
        ? memorySearchResults(memories, query, list_all === true)
        : []
      const results = [...documentResults, ...memoryResults].slice(0, limit)
      return mcpText({
        query,
        entity_types,
        mode,
        total: results.length,
        results,
      })
    },
  )

  return server
}

export async function startFlashQueryStubServer(
  options: FlashQueryStubServerOptions = {},
): Promise<FlashQueryStubServer> {
  let infoRequestCount = 0
  let mcpPostCount = 0
  const mcpMethods: string[] = []
  let available = true
  let lastGetArgs: Record<string, unknown> | null = null
  let lastSearchArgs: Record<string, unknown> | null = null
  let lastWriteArgs: Record<string, unknown> | null = null
  const expectedAuthorization = `Bearer ${options.expectedBearerToken ?? DEFAULT_BEARER_TOKEN}`
  const documents = new Map(Object.entries(DEFAULT_DOCUMENTS))
  const memories = new Map<string, FlashQueryStubMemory>()
  const registryTools: FlashQueryStubRegistryTool[] = []
  const titleOverrides = new Map<string, string | null>()
  const missingDocuments = new Set<string>()

  const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')

    if (!available) {
      textResponse(res, 503, 'FlashQuery stub unavailable')
      return
    }

    if (req.method === 'GET' && url.pathname === '/mcp/info') {
      infoRequestCount += 1
      if (req.headers.authorization) {
        jsonResponse(res, 400, { error: 'authorization_not_allowed_on_info' })
        return
      }
      jsonResponse(res, 200, {
        version: '1.0.0-e2e',
        instance_id: 'fq-e2e-stub',
        auth_schemes: ['bearer'],
      })
      return
    }

    if (req.method === 'POST' && url.pathname === '/mcp') {
      mcpPostCount += 1
      recordJsonRpcMethods(req, mcpMethods)
      if (req.headers.authorization !== expectedAuthorization) {
        jsonResponse(res, 401, {
          error: req.headers.authorization ? 'invalid_authorization' : 'missing_authorization',
        })
        return
      }

      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      const mcpServer = makeMcpServer(
        documents,
        memories,
        registryTools,
        titleOverrides,
        missingDocuments,
        (args) => { lastGetArgs = args },
        (args) => { lastSearchArgs = args },
        (args) => { lastWriteArgs = args },
      )
      try {
        await mcpServer.connect(transport)
        await transport.handleRequest(req, res)
      } catch (error) {
        if (!res.headersSent) {
          jsonResponse(res, 500, { error: error instanceof Error ? error.message : String(error) })
        } else {
          res.end()
        }
      } finally {
        await mcpServer.close().catch(() => {})
      }
      return
    }

    textResponse(res, 404, 'Not found')
  })

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject)
      resolve()
    })
  })

  const { port } = server.address() as AddressInfo

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error)
        else resolve()
      })
    }),
    counts: () => ({ infoRequestCount, mcpPostCount }),
    resetCounts: () => {
      infoRequestCount = 0
      mcpPostCount = 0
      mcpMethods.length = 0
    },
    setAvailable: (nextAvailable: boolean) => {
      available = nextAvailable
    },
    resetDocuments: () => {
      documents.clear()
      memories.clear()
      registryTools.length = 0
      titleOverrides.clear()
      missingDocuments.clear()
      for (const [vaultPath, body] of Object.entries(DEFAULT_DOCUMENTS)) {
        documents.set(vaultPath, { ...body })
      }
    },
    seedEmptyVault: () => {
      documents.clear()
      memories.clear()
      registryTools.length = 0
      titleOverrides.clear()
      missingDocuments.clear()
    },
    seedDocuments: (nextDocuments: Record<string, string | FlashQueryStubDocument>) => {
      documents.clear()
      titleOverrides.clear()
      missingDocuments.clear()
      for (const [vaultPath, body] of Object.entries(nextDocuments)) {
        documents.set(normalizeVaultPath(vaultPath), typeof body === 'string' ? { body } : { ...body })
      }
    },
    seedMemories: (nextMemories: Record<string, string | FlashQueryStubMemory>) => {
      memories.clear()
      for (const [id, memory] of Object.entries(nextMemories)) {
        memories.set(id, typeof memory === 'string' ? { text: memory } : { ...memory })
      }
    },
    seedRegistryTools: (tools: FlashQueryStubRegistryTool[]) => {
      registryTools.length = 0
      registryTools.push(...tools)
    },
    setDocumentTitles: (titles: Record<string, string | null>) => {
      titleOverrides.clear()
      for (const [vaultPath, title] of Object.entries(titles)) {
        titleOverrides.set(normalizeVaultPath(vaultPath), title)
      }
    },
    documentBody: (vaultPath: string) => documents.get(normalizeVaultPath(vaultPath))?.body ?? null,
    documentFrontmatter: (vaultPath: string) => documents.get(normalizeVaultPath(vaultPath))?.frontmatter ?? null,
    setDocumentBody: (vaultPath: string, body: string) => {
      const normalized = normalizeVaultPath(vaultPath)
      const current = documents.get(normalized) ?? { body: '' }
      documents.set(normalized, { ...current, body })
    },
    setDocumentFrontmatter: (vaultPath: string, frontmatter: Record<string, unknown>) => {
      const normalized = normalizeVaultPath(vaultPath)
      const current = documents.get(normalized) ?? { body: '' }
      documents.set(normalized, { ...current, frontmatter })
    },
    setDocumentNotFound: (vaultPath: string, notFound: boolean) => {
      const normalized = normalizeVaultPath(vaultPath)
      if (notFound) missingDocuments.add(normalized)
      else missingDocuments.delete(normalized)
    },
    lastGetArgs: () => lastGetArgs ? { ...lastGetArgs } : null,
    lastSearchArgs: () => lastSearchArgs ? { ...lastSearchArgs } : null,
    lastWriteArgs: () => lastWriteArgs ? { ...lastWriteArgs } : null,
    sawMcpMethod: (method: string) => mcpMethods.includes(method),
  }
}

function recordJsonRpcMethods(req: IncomingMessage, methods: string[]): void {
  const originalEmit = req.emit.bind(req)
  const chunks: Buffer[] = []
  req.emit = ((event: string | symbol, ...args: unknown[]) => {
    if (event === 'data' && Buffer.isBuffer(args[0])) {
      chunks.push(args[0])
    }
    if (event === 'end' && chunks.length > 0) {
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf-8'))
        const messages = Array.isArray(parsed) ? parsed : [parsed]
        for (const message of messages) {
          if (message && typeof message === 'object') {
            const method = (message as Record<string, unknown>).method
            if (typeof method === 'string') methods.push(method)
          }
        }
      } catch {
        // The MCP transport owns request validation; method recording is best-effort evidence.
      }
    }
    return originalEmit(event, ...args)
  }) as IncomingMessage['emit']
}
