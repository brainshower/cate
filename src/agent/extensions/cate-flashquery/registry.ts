export interface FlashQueryRegistryRecord {
  name?: unknown
  id?: unknown
  label?: unknown
  description?: unknown
  inputSchema?: unknown
  schema?: unknown
  source?: unknown
  server?: unknown
  toolId?: unknown
  model?: unknown
  purpose?: unknown
  status?: unknown
  hostEligible?: unknown
  metadata?: Record<string, unknown>
}

export interface FlashQueryToolCandidate {
  name: string
  label: string
  description: string
  inputSchema: unknown
  source?: string
  server?: string
  toolId: string
  model?: string
  purpose?: string
  original: FlashQueryRegistryRecord
}

const CURRENT_STATUSES = new Set(['final', 'transitional', 'current'])

export function normalizePiToolName(input: string): string {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
  return normalized || 'flashquery_tool'
}

export function registryRecordsToToolCandidates(records: FlashQueryRegistryRecord[]): FlashQueryToolCandidate[] {
  const used = new Map<string, number>()
  const candidates: FlashQueryToolCandidate[] = []

  for (const record of records) {
    if (!isEligible(record)) continue

    const toolId = firstString(record.toolId, record.metadata?.toolId, record.id, record.name)
    if (!toolId) continue

    const displayName = firstString(record.name, record.metadata?.name, toolId) ?? toolId
    const baseName = normalizePiToolName(displayName)
    const piName = distinctName(baseName, used)
    const label = firstString(record.label, record.metadata?.label, displayName) ?? displayName
    const description =
      firstString(record.description, record.metadata?.description)
      ?? `Run FlashQuery tool ${displayName}.`

    candidates.push({
      name: piName,
      label,
      description,
      inputSchema: record.inputSchema ?? record.metadata?.inputSchema ?? record.schema ?? record.metadata?.schema,
      source: firstString(record.source, record.metadata?.source) ?? undefined,
      server: firstString(record.server, record.metadata?.server) ?? undefined,
      toolId,
      model: firstString(record.model, record.metadata?.model) ?? undefined,
      purpose: firstString(record.purpose, record.metadata?.purpose) ?? undefined,
      original: record,
    })
  }

  return candidates
}

export function areToolCandidatesStale(
  previous: FlashQueryToolCandidate[],
  next: FlashQueryToolCandidate[],
): boolean {
  return candidateSignature(previous) !== candidateSignature(next)
}

function isEligible(record: FlashQueryRegistryRecord): boolean {
  const status = firstString(record.status, record.metadata?.status)
  const hasHostEligible = record.hostEligible !== undefined || record.metadata?.hostEligible !== undefined
  const hasEligibilityMetadata = Boolean(status) || hasHostEligible

  if (!hasEligibilityMetadata) {
    return true
  }

  if (!status || !CURRENT_STATUSES.has(status)) return false
  if (record.hostEligible === false || record.metadata?.hostEligible === false) return false
  return record.hostEligible === true || record.metadata?.hostEligible === true
}

function distinctName(baseName: string, used: Map<string, number>): string {
  const count = used.get(baseName) ?? 0
  used.set(baseName, count + 1)
  return count === 0 ? baseName : `${baseName}_${count + 1}`
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value
  }
  return null
}

function candidateSignature(candidates: FlashQueryToolCandidate[]): string {
  return JSON.stringify(candidates.map((candidate) => ({
    name: candidate.name,
    toolId: candidate.toolId,
    source: candidate.source,
    server: candidate.server,
  })))
}
