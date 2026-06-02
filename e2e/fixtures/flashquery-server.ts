import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { AddressInfo } from 'node:net'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { z } from 'zod'

export interface FlashQueryStubCounts {
  infoRequestCount: number
  mcpPostCount: number
}

export interface FlashQueryStubServer {
  baseUrl: string
  close: () => Promise<void>
  counts: () => FlashQueryStubCounts
  resetCounts: () => void
  setAvailable: (available: boolean) => void
  resetDocuments: () => void
  seedEmptyVault: () => void
  seedDocuments: (documents: Record<string, string>) => void
  setDocumentTitles: (titles: Record<string, string | null>) => void
  documentBody: (vaultPath: string) => string | null
}

export interface FlashQueryStubServerOptions {
  expectedBearerToken?: string
}

const DEFAULT_BEARER_TOKEN = 'fixture-token'
const DEFAULT_DOCUMENTS: Record<string, string> = {
  'Welcome.md': '# Welcome\n\nThis is the starter document.',
  'Projects/Cate.md': '# Cate\n\nCate integration notes.',
  'Projects/Deep/Nested.md': '# Nested\n\nMulti-level vault content.',
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
  documents: Map<string, string>,
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

function mcpText(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
  }
}

function makeMcpServer(documents: Map<string, string>, titleOverrides: Map<string, string | null>): McpServer {
  const server = new McpServer({ name: 'flashquery-e2e-stub', version: '1.0.0-e2e' })

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
    async ({ identifiers }) => {
      const body = documents.get(normalizeVaultPath(identifiers))
      if (body == null) {
        return mcpText({ error: 'not_found', message: `No document found for ${identifiers}` })
      }
      return mcpText({ body, version_token: 'stub-version-1', modified: new Date(0).toISOString() })
    },
  )

  server.registerTool(
    'write_document',
    {
      description: 'Update deterministic in-memory vault document body',
      inputSchema: z.object({
        mode: z.string(),
        identifier: z.string(),
        content: z.string(),
      }),
    },
    async ({ mode, identifier, content }) => {
      const vaultPath = normalizeVaultPath(identifier)
      if (mode !== 'update') {
        return mcpText({ error: 'unsupported_mode', message: 'Only update mode is supported by the E2E stub' })
      }
      if (!documents.has(vaultPath)) {
        return mcpText({ error: 'not_found', message: `No document found for ${identifier}` })
      }
      documents.set(vaultPath, content)
      return mcpText({ modified: new Date(1_000).toISOString() })
    },
  )

  return server
}

export async function startFlashQueryStubServer(
  options: FlashQueryStubServerOptions = {},
): Promise<FlashQueryStubServer> {
  let infoRequestCount = 0
  let mcpPostCount = 0
  let available = true
  const expectedAuthorization = `Bearer ${options.expectedBearerToken ?? DEFAULT_BEARER_TOKEN}`
  const documents = new Map(Object.entries(DEFAULT_DOCUMENTS))
  const titleOverrides = new Map<string, string | null>()

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
      if (req.headers.authorization !== expectedAuthorization) {
        jsonResponse(res, 401, {
          error: req.headers.authorization ? 'invalid_authorization' : 'missing_authorization',
        })
        return
      }

      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
      const mcpServer = makeMcpServer(documents, titleOverrides)
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
    },
    setAvailable: (nextAvailable: boolean) => {
      available = nextAvailable
    },
    resetDocuments: () => {
      documents.clear()
      titleOverrides.clear()
      for (const [vaultPath, body] of Object.entries(DEFAULT_DOCUMENTS)) {
        documents.set(vaultPath, body)
      }
    },
    seedEmptyVault: () => {
      documents.clear()
      titleOverrides.clear()
    },
    seedDocuments: (nextDocuments: Record<string, string>) => {
      documents.clear()
      titleOverrides.clear()
      for (const [vaultPath, body] of Object.entries(nextDocuments)) {
        documents.set(normalizeVaultPath(vaultPath), body)
      }
    },
    setDocumentTitles: (titles: Record<string, string | null>) => {
      titleOverrides.clear()
      for (const [vaultPath, title] of Object.entries(titles)) {
        titleOverrides.set(normalizeVaultPath(vaultPath), title)
      }
    },
    documentBody: (vaultPath: string) => documents.get(normalizeVaultPath(vaultPath)) ?? null,
  }
}
