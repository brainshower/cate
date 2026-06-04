import type { AgentToolUpdateCallback, ExtensionContext } from '@earendil-works/pi-coding-agent'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import { errorFlashQueryToolResult, normalizeFlashQueryToolResult, type FlashQueryToolDetails, type FlashQueryToolResult } from './diagnostics'
import { findFlashQueryRefs, resolveFlashQueryRefs } from './refs'
import type { FlashQueryToolCandidate } from './registry'
import { getOrCreateFlashQueryTraceId } from './trace'

export interface CallModelGenerationContext {
  id: number
  handoff: FlashQueryHandoff
  client: FlashQueryExtensionClient
}

export function buildCallModelDescription(
  candidate: FlashQueryToolCandidate,
  models: unknown[],
  purposes: unknown[],
): string {
  const purposeLines = formatMetadataList(purposes)
  const modelLines = formatMetadataList(models)
  if (purposeLines.length === 0 && modelLines.length === 0) {
    return `${candidate.description}\n\nAvailable purposes: loading...`
  }

  return [
    candidate.description,
    '',
    purposeLines.length > 0 ? `Available purposes: ${purposeLines.join(', ')}` : 'Available purposes: loading...',
    modelLines.length > 0 ? `Available models: ${modelLines.join(', ')}` : 'Available models: loading...',
  ].join('\n')
}

export async function executeCallModelTool(
  generation: CallModelGenerationContext,
  candidate: FlashQueryToolCandidate,
  params: unknown,
  signal: AbortSignal | undefined,
  _onUpdate: AgentToolUpdateCallback<FlashQueryToolDetails> | undefined,
  ctx: ExtensionContext,
): Promise<FlashQueryToolResult> {
  const args = params && typeof params === 'object' && !Array.isArray(params)
    ? { ...(params as Record<string, unknown>) }
    : {}
  const traceId = getOrCreateFlashQueryTraceId(generation.handoff.workspaceId, ctx)
  const refs = await resolveFlashQueryRefs(generation.client, findFlashQueryRefs(args), { signal })
  const unresolved = refs.find((ref) => !ref.resolved)
  if (unresolved) {
    return errorFlashQueryToolResult({
      candidate,
      handoff: generation.handoff,
      generationId: generation.id,
      traceId,
      refs,
      message: `Reference {{ref:${unresolved.path}}} could not be resolved (document not found).`,
    })
  }

  const existingMeta = args._meta && typeof args._meta === 'object' && !Array.isArray(args._meta)
    ? args._meta as Record<string, unknown>
    : {}
  const dispatchArgs = {
    ...args,
    return_messages: true,
    _meta: {
      ...existingMeta,
      trace_id: traceId,
    },
  }
  const result = await generation.client.callTool(candidate.toolId, dispatchArgs, { signal })
  return normalizeFlashQueryToolResult({
    candidate,
    handoff: generation.handoff,
    generationId: generation.id,
    result,
    traceId,
    refs,
  })
}

function formatMetadataList(items: unknown[]): string[] {
  return items.map(formatMetadataItem).filter((item): item is string => Boolean(item))
}

function formatMetadataItem(item: unknown): string | null {
  if (typeof item === 'string') return item
  if (!item || typeof item !== 'object') return null
  const record = item as Record<string, unknown>
  const name = firstString(record.name, record.label, record.title)
  const id = firstString(record.id, record.model, record.purpose)
  if (name && id && name !== id) return `${name} (${id})`
  return name ?? id
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return null
}
