import type { FlashQueryHandoff } from './client'
import { getOrCreateFlashQueryTraceId } from './trace'

export function withFlashQueryTrace(
  handoff: Pick<FlashQueryHandoff, 'workspaceId'>,
  ctx: unknown,
  args: Record<string, unknown>,
): { args: Record<string, unknown>; traceId: string } {
  const traceId = getOrCreateFlashQueryTraceId(handoff.workspaceId, ctx)
  const existingMeta = args._meta && typeof args._meta === 'object' && !Array.isArray(args._meta)
    ? args._meta as Record<string, unknown>
    : {}
  return {
    traceId,
    args: {
      ...args,
      _meta: {
        ...existingMeta,
        trace_id: traceId,
      },
    },
  }
}
