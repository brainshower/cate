import type { AgentToolResult } from '@earendil-works/pi-coding-agent'
import type { FlashQueryHandoff } from './client'
import type { FlashQueryToolCandidate } from './registry'

export interface FlashQueryResultContext {
  candidate: FlashQueryToolCandidate
  handoff: Pick<FlashQueryHandoff, 'workspaceId'>
  generationId: number
  result: unknown
  traceId?: string
  refs?: FlashQueryRefDiagnostic[]
  macroProgress?: unknown
  error?: string
}

export interface FlashQueryRefDiagnostic {
  path: string
  resolved: boolean
  body?: string
  error?: string
}

export interface FlashQueryToolDetails {
  flashquery: true
  toolId: string
  toolName: string
  workspaceId?: string
  generation?: number
  result?: unknown
  diagnostics?: unknown
  traceId?: string
  refs?: FlashQueryRefDiagnostic[]
  macroProgress?: unknown
  disconnected?: boolean
  stale?: boolean
  error?: string
}

export type FlashQueryToolResult = AgentToolResult<FlashQueryToolDetails> & { isError?: boolean }

export function normalizeFlashQueryToolResult(context: FlashQueryResultContext): FlashQueryToolResult {
  const resultObject = context.result && typeof context.result === 'object'
    ? context.result as Record<string, unknown>
    : {}
  const content = Array.isArray(resultObject.content)
    ? resultObject.content.filter(isTextOrImageContent)
    : [{ type: 'text' as const, text: stringifyResult(context.result) }]
  const diagnostics = resultObject.diagnostics ?? resultObject.details
  const error = context.error ?? (typeof resultObject.error === 'string' ? resultObject.error : undefined)

  return {
    ...(resultObject.isError === true || error ? { isError: true } : {}),
    content,
    details: {
      flashquery: true,
      toolId: context.candidate.toolId,
      toolName: context.candidate.name,
      workspaceId: context.handoff.workspaceId,
      generation: context.generationId,
      result: context.result,
      ...(diagnostics !== undefined ? { diagnostics } : {}),
      ...(context.traceId ? { traceId: context.traceId } : {}),
      ...(context.refs ? { refs: context.refs } : {}),
      ...(context.macroProgress !== undefined ? { macroProgress: context.macroProgress } : {}),
      ...(error ? { error } : {}),
    } satisfies FlashQueryToolDetails,
  }
}

export function errorFlashQueryToolResult(
  context: Omit<FlashQueryResultContext, 'result'> & { message: string; stale?: boolean; disconnected?: boolean },
): FlashQueryToolResult {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: context.message }],
    details: {
      flashquery: true,
      toolId: context.candidate.toolId,
      toolName: context.candidate.name,
      workspaceId: context.handoff.workspaceId,
      generation: context.generationId,
      ...(context.traceId ? { traceId: context.traceId } : {}),
      ...(context.refs ? { refs: context.refs } : {}),
      ...(context.stale ? { stale: true } : {}),
      ...(context.disconnected ? { disconnected: true } : {}),
      error: context.message,
    } satisfies FlashQueryToolDetails,
  }
}

export function isTextOrImageContent(value: unknown): value is { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string } {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (record.type === 'text') return typeof record.text === 'string'
  if (record.type === 'image') return typeof record.data === 'string' && typeof record.mimeType === 'string'
  return false
}

export function stringifyResult(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}
