import type { AgentToolUpdateCallback, ExtensionContext } from '@earendil-works/pi-coding-agent'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import { normalizeFlashQueryToolResult, type FlashQueryToolDetails, type FlashQueryToolResult } from './diagnostics'
import { withFlashQueryTrace } from './dispatch'
import type { FlashQueryToolCandidate } from './registry'

export const FLASHQUERY_DISCONNECTED_MESSAGE = 'FlashQuery is not connected.'

export interface CallMacroGenerationContext {
  id: number
  handoff: FlashQueryHandoff
  client: FlashQueryExtensionClient
}

export async function executeCallMacroTool(
  generation: CallMacroGenerationContext,
  candidate: FlashQueryToolCandidate,
  params: unknown,
  signal: AbortSignal | undefined,
  onUpdate: AgentToolUpdateCallback<FlashQueryToolDetails> | undefined,
  ctx: ExtensionContext,
): Promise<FlashQueryToolResult> {
  const args = params && typeof params === 'object' && !Array.isArray(params)
    ? { ...(params as Record<string, unknown>) }
    : {}

  if (typeof args.source === 'string' && typeof args.source_ref !== 'string') {
    const confirmed = await ctx.ui.confirm(
      'Run FlashQuery macro?',
      args.source,
      { signal },
    )
    if (!confirmed) return macroCancelledResult(candidate, generation)
  }

  const { interactive: _unsupportedInteractive, ...macroArgs } = args
  const traced = withFlashQueryTrace(generation.handoff, ctx, macroArgs)
  const dispatchArgs = {
    ...traced.args,
    progress: macroArgs.progress ?? 'milestones',
    _meta: traced.args._meta,
  }
  let result: unknown
  try {
    result = await generation.client.callTool(candidate.toolId, dispatchArgs, {
      signal,
      onprogress(progress) {
        onUpdate?.({
          content: [{ type: 'text' as const, text: progressMessage(progress) }],
          details: {
            flashquery: true,
            toolId: candidate.toolId,
            toolName: candidate.name,
            workspaceId: generation.handoff.workspaceId,
            generation: generation.id,
            traceId: traced.traceId,
            macroProgress: progress,
          },
        })
      },
    })
  } catch (err) {
    if (!isTransportDisconnectError(err)) throw err
    return disconnectedCallMacroResult(candidate, generation, traced.traceId)
  }

  return normalizeFlashQueryToolResult({
    candidate,
    handoff: generation.handoff,
    generationId: generation.id,
    result,
    traceId: traced.traceId,
  })
}

export function disconnectedCallMacroResult(
  candidate: FlashQueryToolCandidate,
  generation: Pick<CallMacroGenerationContext, 'id' | 'handoff'>,
  traceId?: string,
): FlashQueryToolResult {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: FLASHQUERY_DISCONNECTED_MESSAGE }],
    details: {
      flashquery: true,
      toolId: candidate.toolId,
      toolName: candidate.name,
      workspaceId: generation.handoff.workspaceId,
      generation: generation.id,
      ...(traceId ? { traceId } : {}),
      disconnected: true,
      error: FLASHQUERY_DISCONNECTED_MESSAGE,
    },
  }
}

function macroCancelledResult(
  candidate: FlashQueryToolCandidate,
  generation: CallMacroGenerationContext,
): FlashQueryToolResult {
  return {
    content: [{ type: 'text' as const, text: 'FlashQuery macro execution cancelled by user.' }],
    details: {
      flashquery: true,
      toolId: candidate.toolId,
      toolName: candidate.name,
      workspaceId: generation.handoff.workspaceId,
      generation: generation.id,
      result: { cancelled: true },
    },
  }
}

function progressMessage(progress: unknown): string {
  if (progress && typeof progress === 'object') {
    const message = (progress as Record<string, unknown>).message
    if (typeof message === 'string' && message.trim().length > 0) return message
  }
  return 'Running macro...'
}

function isTransportDisconnectError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const record = err as Record<string, unknown>
  if (record.name === 'AbortError') return false
  const message = typeof record.message === 'string' ? record.message.toLowerCase() : ''
  if (message.length === 0) return false
  return [
    'connection closed',
    'connection reset',
    'connection refused',
    'connect econn',
    'econnreset',
    'econnrefused',
    'enotfound',
    'network error',
    'fetch failed',
    'socket',
    'transport',
  ].some((needle) => message.includes(needle))
}
