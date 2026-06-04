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
  callTool(name: string, params: Record<string, unknown>, signal?: AbortSignal): Promise<unknown>
  close(): Promise<void>
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

  const client = new Client({ name: 'cate-flashquery', version: '1.0.0' })
  const headers = handoff.authMode === 'bearer' && handoff.bearerToken
    ? new Headers({ Authorization: `Bearer ${handoff.bearerToken}` })
    : undefined
  const transport = new StreamableHTTPClientTransport(new URL(buildMcpUrl(handoff.endpointUrl)), {
    ...(headers ? { requestInit: { headers } } : {}),
  })
  await client.connect(transport)

  return {
    async listRegistryTools(signal) {
      const result = await client.listTools(undefined, { signal })
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
    async callTool(name, params, signal) {
      return client.callTool({ name, arguments: params }, undefined, { signal })
    },
    async close() {
      await client.close()
    },
  }
}

function buildMcpUrl(endpointUrl: string): string {
  const trimmed = endpointUrl.replace(/\/+$/, '')
  return trimmed.endsWith('/mcp') ? trimmed : `${trimmed}/mcp`
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
