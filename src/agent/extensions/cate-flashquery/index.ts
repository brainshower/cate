// =============================================================================
// cate-flashquery — bundled Pi extension for Cate-provided FlashQuery workspace
// handoff. It registers host-eligible current FlashQuery MCP tools as Pi tools
// and delegates execution through the current workspace's FlashQuery client.
// =============================================================================

import type { AgentToolResult, ExtensionAPI } from '@earendil-works/pi-coding-agent'
import type { TSchema } from 'typebox'
import { openFlashQueryClient, readFlashQueryHandoff } from './client'
import { registryRecordsToToolCandidates } from './registry'
import { flashQuerySchemaToTypeBox } from './schema'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import type { FlashQueryToolCandidate } from './registry'

export interface CateFlashQueryExtensionDeps {
  readHandoff?: (cwd: string) => Promise<FlashQueryHandoff | null>
  openClient?: (handoff: FlashQueryHandoff) => Promise<FlashQueryExtensionClient | null>
}

interface FlashQueryToolDetails {
  flashquery: true
  toolId: string
  toolName: string
  result?: unknown
  disconnected?: boolean
  error?: string
}

type FlashQueryToolResult = AgentToolResult<FlashQueryToolDetails> & { isError?: boolean }

export function createCateFlashQueryExtension(
  pi: ExtensionAPI,
  deps: CateFlashQueryExtensionDeps = {},
): void {
  const readHandoffImpl = deps.readHandoff ?? readFlashQueryHandoff
  const openClientImpl = deps.openClient ?? openFlashQueryClient
  let currentClient: FlashQueryExtensionClient | null = null

  pi.on('session_start', async (_event, ctx) => {
    const handoff = await readHandoffImpl(ctx.cwd)
    currentClient = handoff ? await openClientImpl(handoff) : null
    if (!currentClient) return

    const records = await currentClient.listRegistryTools(ctx.signal)
    for (const candidate of registryRecordsToToolCandidates(records)) {
      pi.registerTool<TSchema, FlashQueryToolDetails>({
        name: candidate.name,
        label: candidate.label,
        description: candidate.description,
        parameters: flashQuerySchemaToTypeBox(candidate.inputSchema),
        async execute(_toolCallId, params, signal) {
          return executeFlashQueryTool(currentClient, candidate, params, signal)
        },
      })
    }
  })

  pi.on('session_shutdown', async () => {
    const client = currentClient
    currentClient = null
    await client?.close()
  })
}

export default function (pi: ExtensionAPI): void {
  createCateFlashQueryExtension(pi)
}

async function executeFlashQueryTool(
  client: FlashQueryExtensionClient | null,
  candidate: FlashQueryToolCandidate,
  params: unknown,
  signal?: AbortSignal,
): Promise<FlashQueryToolResult> {
  if (!client) {
    return {
      isError: true,
      content: [{ type: 'text' as const, text: 'FlashQuery disconnected. Reconnect this workspace and retry.' }],
      details: {
        flashquery: true,
        toolId: candidate.toolId,
        toolName: candidate.name,
        disconnected: true,
      } satisfies FlashQueryToolDetails,
    }
  }

  try {
    const args = params && typeof params === 'object' && !Array.isArray(params)
      ? params as Record<string, unknown>
      : {}
    const result = await client.callTool(candidate.toolId, args, signal)
    return normalizeFlashQueryToolResult(result, candidate)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'FlashQuery tool call failed'
    return {
      isError: true,
      content: [{ type: 'text' as const, text: message }],
      details: {
        flashquery: true,
        toolId: candidate.toolId,
        toolName: candidate.name,
        error: message,
      } satisfies FlashQueryToolDetails,
    }
  }
}

function normalizeFlashQueryToolResult(result: unknown, candidate: FlashQueryToolCandidate): FlashQueryToolResult {
  const resultObject = result && typeof result === 'object' ? result as Record<string, unknown> : {}
  const content = Array.isArray(resultObject.content)
    ? resultObject.content.filter(isTextOrImageContent)
    : [{ type: 'text' as const, text: stringifyResult(result) }]
  return {
    ...(resultObject.isError === true ? { isError: true } : {}),
    content,
    details: {
      flashquery: true,
      toolId: candidate.toolId,
      toolName: candidate.name,
      result,
    } satisfies FlashQueryToolDetails,
  }
}

function isTextOrImageContent(value: unknown): value is { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string } {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (record.type === 'text') return typeof record.text === 'string'
  if (record.type === 'image') return typeof record.data === 'string' && typeof record.mimeType === 'string'
  return false
}

function stringifyResult(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}
