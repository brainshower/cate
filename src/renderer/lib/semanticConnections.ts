export type SemanticConnectionDirection = 'out' | 'in' | 'sym'
export type SemanticConnectionTone = 'neutral' | 'caution' | 'warn'

export type SemanticConnectionRel =
  | 'contains'
  | 'references'
  | 'depends_on'
  | 'supersedes'
  | 'rationale_for'
  | 'elaborates'
  | 'summarizes'
  | 'contradicts'
  | 'duplicates'

export interface SemanticConnectionTarget {
  title: string
  path: string
  heading?: string
  chunkId: string
  snippet: string
  body?: string
  inDocument?: boolean
  documentId?: string
  headingPath?: string[]
}

export interface SemanticConnection {
  id: string
  score: number
  rel?: SemanticConnectionRel
  dir?: SemanticConnectionDirection
  target: SemanticConnectionTarget
}

export interface SemanticConnectionEdgeDef {
  kind: 'directed' | 'symmetric'
  tone: SemanticConnectionTone
  out?: string
  in?: string
  sym?: string
}

export type SemanticConnectionSortMode = 'similarity' | 'nature'

export interface SemanticConnectionBuckets {
  overall?: readonly SemanticConnection[]
  byChunkId?: Record<string, readonly SemanticConnection[]>
}

export interface SemanticConnectionCautionFlags {
  warn: number
  caution: number
  total: number
}

export const SC_EDGE: Record<SemanticConnectionRel, SemanticConnectionEdgeDef> = {
  contains: { kind: 'directed', tone: 'neutral', out: 'contains', in: 'contained by' },
  references: { kind: 'directed', tone: 'neutral', out: 'references', in: 'referenced by' },
  depends_on: { kind: 'directed', tone: 'neutral', out: 'depends on', in: 'required by' },
  supersedes: { kind: 'directed', tone: 'caution', out: 'supersedes', in: 'superseded by' },
  rationale_for: { kind: 'directed', tone: 'neutral', out: 'rationale for', in: 'has rationale' },
  elaborates: { kind: 'directed', tone: 'neutral', out: 'elaborates', in: 'elaborated by' },
  summarizes: { kind: 'directed', tone: 'neutral', out: 'summarizes', in: 'summarized by' },
  contradicts: { kind: 'symmetric', tone: 'warn', sym: 'contradicts' },
  duplicates: { kind: 'symmetric', tone: 'neutral', sym: 'duplicates' },
}

function titleCase(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value
}

function scoreDescending(a: SemanticConnection, b: SemanticConnection): number {
  return b.score - a.score
}

export function scEdgeLabel(rel?: SemanticConnectionRel, dir?: SemanticConnectionDirection): string {
  if (!rel) return 'Similarity only'
  const edge = SC_EDGE[rel]
  if (!edge) return titleCase(rel.replace(/_/g, ' '))
  if (edge.kind === 'symmetric') return titleCase(edge.sym ?? rel.replace(/_/g, ' '))
  return titleCase((dir === 'in' ? edge.in : edge.out) ?? edge.out ?? rel.replace(/_/g, ' '))
}

function connectionTone(connection: SemanticConnection): SemanticConnectionTone {
  return connection.rel ? SC_EDGE[connection.rel]?.tone ?? 'neutral' : 'neutral'
}

function natureRank(connection: SemanticConnection): number {
  const tone = connectionTone(connection)
  if (tone === 'warn') return 0
  if (tone === 'caution') return 1
  return 2
}

export function arrangeForDisplay(
  list: readonly SemanticConnection[],
  sortMode: SemanticConnectionSortMode,
): SemanticConnection[] {
  if (sortMode === 'similarity') return [...list].sort(scoreDescending)

  const groups = new Map<string, SemanticConnection[]>()
  for (const connection of list) {
    const label = scEdgeLabel(connection.rel, connection.dir)
    const group = groups.get(label) ?? []
    group.push(connection)
    groups.set(label, group)
  }

  return [...groups.values()]
    .map((group) => [...group].sort(scoreDescending))
    .sort((a, b) => {
      const rankDelta = natureRank(a[0]) - natureRank(b[0])
      if (rankDelta !== 0) return rankDelta
      return b[0].score - a[0].score
    })
    .flat()
}

export function getAllRels(payload: SemanticConnectionBuckets): SemanticConnectionRel[] {
  const rels = new Set<SemanticConnectionRel>()
  for (const connection of payload.overall ?? []) {
    if (connection.rel) rels.add(connection.rel)
  }
  for (const connections of Object.values(payload.byChunkId ?? {})) {
    for (const connection of connections) {
      if (connection.rel) rels.add(connection.rel)
    }
  }
  return [...rels].sort()
}

export function scCautionFlags(connections: readonly SemanticConnection[]): SemanticConnectionCautionFlags {
  let warn = 0
  let caution = 0
  for (const connection of connections) {
    const tone = connectionTone(connection)
    if (tone === 'warn') warn++
    else if (tone === 'caution') caution++
  }
  return { warn, caution, total: warn + caution }
}
