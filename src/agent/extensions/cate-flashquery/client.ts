import fsp from 'fs/promises'
import path from 'path'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { FlashQueryRegistryRecord } from './registry'

const HANDOFF_FILE = 'flashquery-handoff.json'

export interface FlashQueryHandoff {
  version: 1
  workspaceId: string
  endpointUrl: string | null
  authMode: 'none' | 'bearer'
  bearerToken?: string
}

export interface FlashQueryExtensionClient {
  listRegistryTools(signal?: AbortSignal): Promise<FlashQueryRegistryRecord[]>
  listModels(signal?: AbortSignal): Promise<unknown[]>
  listPurposes(signal?: AbortSignal): Promise<unknown[]>
  callTool(name: string, params: Record<string, unknown>, options?: AbortSignal | FlashQueryToolCallOptions): Promise<unknown>
  close(): Promise<void>
}

export interface FlashQueryToolCallOptions {
  signal?: AbortSignal
  onprogress?: (progress: unknown) => void
}

export async function readFlashQueryHandoff(cwd: string): Promise<FlashQueryHandoff | null> {
  try {
    const text = await fsp.readFile(path.join(cwd, '.cate', 'pi-agent', HANDOFF_FILE), 'utf-8')
    const parsed = JSON.parse(text) as Partial<FlashQueryHandoff>
    if (parsed.version !== 1 || typeof parsed.workspaceId !== 'string') return null
    if (parsed.endpointUrl !== null && typeof parsed.endpointUrl !== 'string') return null
    if (parsed.authMode !== 'none' && parsed.authMode !== 'bearer') return null
    return {
      version: 1,
      workspaceId: parsed.workspaceId,
      endpointUrl: parsed.endpointUrl ?? null,
      authMode: parsed.authMode,
      ...(typeof parsed.bearerToken === 'string' ? { bearerToken: parsed.bearerToken } : {}),
    }
  } catch {
    return null
  }
}

export async function openFlashQueryClient(handoff: FlashQueryHandoff): Promise<FlashQueryExtensionClient | null> {
  if (!handoff.endpointUrl) return null

  const mcpUrl = new URL(buildMcpUrl(handoff.endpointUrl))
  let client = await connectFlashQuerySdkClient(handoff, mcpUrl)

  async function reconnectAfterStaleSession(): Promise<void> {
    const staleClient = client
    client = await connectFlashQuerySdkClient(handoff, mcpUrl)
    await staleClient.close().catch(() => {})
  }

  async function withStaleSessionRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch (err) {
      if (!isStaleMcpSessionError(err)) throw err
      await reconnectAfterStaleSession()
      return await operation()
    }
  }

  return {
    async listRegistryTools(signal) {
      const result = await withStaleSessionRetry(() => client.listTools(undefined, { signal }))
      return result.tools.map((tool) => {
        const record = tool as Record<string, unknown>
        const metadata = metadataFrom(record)
        return {
          name: tool.name,
          label: firstString(record.label, metadata.label, metadata.title, tool.annotations?.title),
          description: tool.description,
          inputSchema: tool.inputSchema,
          source: firstString(record.source, metadata.source),
          server: firstString(record.server, metadata.server),
          toolId: firstString(record.toolId, metadata.toolId, tool.name),
          model: firstString(record.model, metadata.model),
          purpose: firstString(record.purpose, metadata.purpose),
          status: firstString(record.status, metadata.status),
          hostEligible: record.hostEligible ?? metadata.hostEligible,
          metadata,
        }
      })
    },
    async listModels(signal) {
      return metadataListFromResult(await withStaleSessionRetry(() => client.callTool(
        { name: 'call_model', arguments: { resolver: 'list_models' } },
        undefined,
        { signal },
      )))
    },
    async listPurposes(signal) {
      return metadataListFromResult(await withStaleSessionRetry(() => client.callTool(
        { name: 'call_model', arguments: { resolver: 'list_purposes' } },
        undefined,
        { signal },
      )))
    },
    async callTool(name, params, options) {
      const requestOptions = normalizeToolCallOptions(options)
      return withStaleSessionRetry(() => client.callTool({ name, arguments: params }, undefined, requestOptions))
    },
    async close() {
      await client.close()
    },
  }
}

async function connectFlashQuerySdkClient(handoff: FlashQueryHandoff, mcpUrl: URL): Promise<Client> {
  const client = new Client({ name: 'cate-flashquery', version: '1.0.0' })
  const headers = handoff.authMode === 'bearer' && handoff.bearerToken
    ? new Headers({ Authorization: `Bearer ${handoff.bearerToken}` })
    : undefined
  const transport = new StreamableHTTPClientTransport(mcpUrl, {
    ...(headers ? { requestInit: { headers } } : {}),
  })
  await client.connect(transport)
  return client
}

function normalizeToolCallOptions(options?: AbortSignal | FlashQueryToolCallOptions): FlashQueryToolCallOptions {
  if (!options) return { signal: undefined }
  if (typeof AbortSignal !== 'undefined' && options instanceof AbortSignal) return { signal: options }
  return options as FlashQueryToolCallOptions
}

function buildMcpUrl(endpointUrl: string): string {
  const trimmed = endpointUrl.replace(/\/+$/, '')
  return trimmed.endsWith('/mcp') ? trimmed : `${trimmed}/mcp`
}

function isStaleMcpSessionError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const message = typeof (err as Record<string, unknown>).message === 'string'
    ? ((err as Record<string, unknown>).message as string).toLowerCase()
    : ''
  return message.includes('no valid session id') || message.includes('invalid or missing session id')
}

function metadataFrom(record: Record<string, unknown>): Record<string, unknown> {
  const direct = record.metadata
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    return direct as Record<string, unknown>
  }
  const meta = record._meta
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, unknown>
  }
  return {}
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0)
}

function metadataListFromResult(result: unknown): unknown[] {
  const parsed = parseMcpResult(result)
  if (Array.isArray(parsed)) return parsed
  if (parsed && typeof parsed === 'object') {
    const record = parsed as Record<string, unknown>
    if (Array.isArray(record.models)) return record.models
    if (Array.isArray(record.purposes)) return record.purposes
    if (Array.isArray(record.results)) return record.results
    if (Array.isArray(record.items)) return record.items
  }
  return []
}

function parseMcpResult(result: unknown): unknown {
  if (!result || typeof result !== 'object') return result
  const content = (result as Record<string, unknown>).content
  if (!Array.isArray(content)) return result
  for (const item of content) {
    if (!item || typeof item !== 'object') continue
    const record = item as Record<string, unknown>
    if (record.type !== 'text' || typeof record.text !== 'string') continue
    try {
      return JSON.parse(record.text)
    } catch {
      return result
    }
  }
  return result
}
