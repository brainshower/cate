import type { AgentToolUpdateCallback, ExtensionContext } from '@earendil-works/pi-coding-agent'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import { normalizeFlashQueryToolResult, type FlashQueryToolDetails, type FlashQueryToolResult } from './diagnostics'
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

  const dispatchArgs = {
    ...args,
    interactive: args.interactive ?? true,
    progress: args.progress ?? 'milestones',
  }
  const result = await generation.client.callTool(candidate.toolId, dispatchArgs, {
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
          macroProgress: progress,
        },
      })
    },
  })

  return normalizeFlashQueryToolResult({
    candidate,
    handoff: generation.handoff,
    generationId: generation.id,
    result,
  })
}

export function disconnectedCallMacroResult(
  candidate: FlashQueryToolCandidate,
  generation: Pick<CallMacroGenerationContext, 'id' | 'handoff'>,
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
