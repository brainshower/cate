import { createHash, randomBytes } from 'node:crypto'

const objectTraceIds = new WeakMap<object, string>()
const stringTraceIds = new Map<string, string>()
const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567'

export function getOrCreateFlashQueryTraceId(workspaceId: string, ctx: unknown): string {
  if (ctx && typeof ctx === 'object') {
    const existing = objectTraceIds.get(ctx)
    if (existing) return existing
    const next = buildTraceId(workspaceId)
    objectTraceIds.set(ctx, next)
    return next
  }

  const key = `${workspaceId}:${String(ctx ?? 'default')}`
  const existing = stringTraceIds.get(key)
  if (existing) return existing
  const next = buildTraceId(workspaceId)
  stringTraceIds.set(key, next)
  return next
}

function buildTraceId(workspaceId: string): string {
  const workspaceHash = createHash('sha256').update(workspaceId).digest('hex').slice(0, 8)
  return `cate-ws-${workspaceHash}-conv-${randomBase32(16)}`
}

function randomBase32(length: number): string {
  let output = ''
  const bytes = randomBytes(length)
  for (const byte of bytes) output += BASE32_ALPHABET[byte % BASE32_ALPHABET.length]
  return output
}
