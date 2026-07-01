export type SemanticConnectionDirection = 'out' | 'in' | 'sym'
export type SemanticConnectionTone = 'neutral' | 'caution' | 'warn'
export type SemanticConnectionScoreTone = 'red' | 'orange' | 'teal' | 'green'
export type SemanticConnectionConfidence = 'high' | 'medium' | 'low' | 'unknown'
export type SemanticConnectionStatus = 'active' | 'stale' | 'deleted' | 'unknown'

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
  | 'supports'
  | 'extends'
  | 'resolves'
  | 'semantically_similar_to'

export type SemanticConnectionRelation = SemanticConnectionRel | (string & {})

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
  targetChunkSummary?: string
  targetStale?: boolean
  targetAnalyzedAt?: string
  targetCommunityId?: string
}

export interface SemanticConnection {
  id: string
  score?: number
  rel?: SemanticConnectionRelation
  dir?: SemanticConnectionDirection
  confidence?: SemanticConnectionConfidence | string
  confidenceScore?: number
  reasoning?: string
  sourceClaimsReferenced?: number[]
  targetClaimsReferenced?: number[]
  status?: SemanticConnectionStatus | string
  qualifiers?: string[]
  metadata?: unknown
  target: SemanticConnectionTarget
}

export interface SemanticConnectionEdgeDef {
  kind: 'directed' | 'symmetric'
  tone: SemanticConnectionTone
  color: string
  icon: string
  out?: string
  in?: string
  sym?: string
}

export type SemanticConnectionSortMode = 'similarity' | 'nature'

export interface SemanticConnectionBuckets {
  overall?: readonly SemanticConnection[]
  byChunkId?: Record<string, readonly SemanticConnection[]>
}

export type SemanticConnectionMode = 'embeddings-only' | 'mixed' | 'typed'

export interface SemanticConnectionsTargetMapEntry {
  flashqueryChunkId?: string
  previewChunkId: string | null
  documentId?: string
  documentPath: string
  documentTitle: string
  headingPath?: string[]
  headingText?: string
  sourceStartLine?: number
  sourceEndLine?: number
}

export interface GraphDocumentSummary {
  edge_count: number
  edge_counts_by_relation: Record<string, number>
  stale_edge_count: number
  community_labels: string[]
  has_contradictions: boolean
  has_open_questions: boolean
  open_question_count: number
}

export interface SemanticConnectionsCommunitySummary {
  dominantLabel?: string
  summary?: string
  labels?: string[]
}

export interface SemanticConnectionNodeMeta {
  chunkSummary?: string
  keyClaims?: unknown[]
  certaintyLevel?: SemanticConnectionConfidence | string
  stalenessRisk?: string
  externalRefs?: string[]
  temporalMarkers?: string[]
  questionStatus?: 'open' | 'deferred' | 'resolved' | 'none' | string
  questionResolution?: string
  communityId?: string
  communityLabel?: string
  communitySummary?: string
  content?: string
  analyzed?: boolean
  stale?: boolean
  analyzedAt?: string
  diagnostics?: string[]
}

export interface SemanticConnectionsResult {
  mode: SemanticConnectionMode
  overall: readonly SemanticConnection[]
  byChunkId: Record<string, readonly SemanticConnection[]>
  chunkOrder: string[]
  chunkMap: Record<string, SemanticConnectionsTargetMapEntry>
  diagnostics: string[]
  stale?: boolean
  graphSummary?: GraphDocumentSummary
  communitySummary?: SemanticConnectionsCommunitySummary
  nodeMeta?: Record<string, SemanticConnectionNodeMeta>
  nodeMetaLoading?: boolean
}

export interface SemanticConnectionsProviderInput {
  workspaceId: string
  editorPanelId: string
  documentId?: string
  documentPath: string
  markdown: string
  contentHash?: string
  embeddingNames?: string[]
  /** Optional UI scope hint; providers may ignore it and return document-wide results. */
  scopeChunkId?: string | null
}

export interface SemanticConnectionsProvider {
  loadDocumentConnections: (input: SemanticConnectionsProviderInput) => Promise<SemanticConnectionsResult>
  invalidateDocumentConnections?: (input: SemanticConnectionsProviderInput) => void
}

export interface SemanticConnectionCautionFlags {
  warn: number
  caution: number
  total: number
}

export interface SemanticConnectionGroup {
  key: string
  label: string
  connections: SemanticConnection[]
}

export interface SemanticConnectionClaimGroup {
  index: number
  text: string
  connections: SemanticConnection[]
}

export interface SemanticConnectionSelectionGroups {
  claims: SemanticConnectionClaimGroup[]
  generalConnections: SemanticConnection[]
}

export interface SemanticConnectionMetadataProseInput {
  metadata?: unknown
  qualifiers?: readonly string[]
}

export const SC_EDGE: Record<SemanticConnectionRel, SemanticConnectionEdgeDef> = {
  contradicts: { kind: 'symmetric', tone: 'warn', sym: 'contradicts', color: '#dc2626', icon: 'warning' },
  depends_on: { kind: 'directed', tone: 'neutral', out: 'depends on', in: 'required by', color: '#2563eb', icon: 'link' },
  supersedes: { kind: 'directed', tone: 'caution', out: 'supersedes', in: 'superseded by', color: '#d97706', icon: 'arrow-clockwise' },
  resolves: { kind: 'directed', tone: 'neutral', out: 'resolves', in: 'resolved by', color: '#16a34a', icon: 'check-circle' },
  supports: { kind: 'directed', tone: 'neutral', out: 'supports', in: 'supported by', color: '#059669', icon: 'thumbs-up' },
  references: { kind: 'directed', tone: 'neutral', out: 'references', in: 'referenced by', color: '#4f46e5', icon: 'bookmark' },
  extends: { kind: 'directed', tone: 'neutral', out: 'extends', in: 'extended by', color: '#0891b2', icon: 'tree-structure' },
  elaborates: { kind: 'directed', tone: 'neutral', out: 'elaborates', in: 'elaborated by', color: '#0d9488', icon: 'article' },
  rationale_for: { kind: 'directed', tone: 'neutral', out: 'rationale for', in: 'has rationale', color: '#7c3aed', icon: 'lightbulb' },
  summarizes: { kind: 'directed', tone: 'neutral', out: 'summarizes', in: 'summarized by', color: '#65a30d', icon: 'list' },
  contains: { kind: 'directed', tone: 'neutral', out: 'contains', in: 'contained by', color: '#475569', icon: 'folder' },
  duplicates: { kind: 'symmetric', tone: 'neutral', sym: 'duplicates', color: '#64748b', icon: 'copy' },
  semantically_similar_to: { kind: 'symmetric', tone: 'neutral', sym: 'semantically similar to', color: '#6b7280', icon: 'sparkle' },
}

function titleCase(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value
}

function scoreDescending(a: SemanticConnection, b: SemanticConnection): number {
  return scoreValue(b) - scoreValue(a)
}

function isKnownRelation(rel: SemanticConnectionRelation | undefined): rel is SemanticConnectionRel {
  return Boolean(rel && rel in SC_EDGE)
}

function scoreValue(connection: SemanticConnection): number {
  return connection.score ?? connection.confidenceScore ?? 0
}

function graphSortValue(connection: SemanticConnection): number {
  return connection.confidenceScore ?? connection.score ?? 0
}

export function scUnknownRelationDiagnostic(rel: string): string {
  return `Unknown semantic relation: ${rel}`
}

export function scEdgeLabel(rel?: SemanticConnectionRelation, dir?: SemanticConnectionDirection): string {
  if (!rel) return 'Similarity only'
  const edge = isKnownRelation(rel) ? SC_EDGE[rel] : undefined
  if (!edge) return titleCase(rel.replace(/_/g, ' '))
  if (edge.kind === 'symmetric') return titleCase(edge.sym ?? rel.replace(/_/g, ' '))
  return titleCase((dir === 'in' ? edge.in : edge.out) ?? edge.out ?? rel.replace(/_/g, ' '))
}

export function scScoreTone(score: number): SemanticConnectionScoreTone {
  if (score < 0.4) return 'red'
  if (score < 0.6) return 'orange'
  if (score < 0.8) return 'teal'
  return 'green'
}

const DISPLAY_METADATA_LABELS: Record<string, string> = {
  severity: 'Severity',
  strength: 'Strength',
  dependency_type: 'Dependency type',
}

function displayableMetadataValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : null
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

export function scEdgeMetadataProse(input: SemanticConnectionMetadataProseInput): string[] {
  const prose: string[] = []
  for (const qualifier of input.qualifiers ?? []) {
    const value = qualifier.trim()
    if (value.length > 0) prose.push(`Qualifier: ${value}`)
  }

  if (!input.metadata || typeof input.metadata !== 'object' || Array.isArray(input.metadata)) return prose
  const metadata = input.metadata as Record<string, unknown>
  for (const [key, label] of Object.entries(DISPLAY_METADATA_LABELS)) {
    const value = displayableMetadataValue(metadata[key])
    if (value) prose.push(`${label}: ${value}`)
  }
  return prose
}

export function isActiveSemanticConnection(connection: SemanticConnection): boolean {
  return connection.status !== 'stale' && connection.status !== 'deleted'
}

export function semanticClaimText(claim: unknown): string | null {
  if (typeof claim === 'string') {
    const value = claim.trim()
    return value.length > 0 ? value : null
  }
  if (!claim || typeof claim !== 'object') return null
  const record = claim as Record<string, unknown>
  for (const key of ['text', 'claim', 'content']) {
    const value = record[key]
    if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  }
  return null
}

export function groupSelectionClaimsAndConnections(
  claimsInput: readonly unknown[] | undefined,
  connectionsInput: readonly SemanticConnection[],
): SemanticConnectionSelectionGroups {
  const claims = (claimsInput ?? [])
    .map((claim, index) => ({ index, text: semanticClaimText(claim), connections: [] as SemanticConnection[] }))
    .filter((claim): claim is SemanticConnectionClaimGroup => claim.text !== null)
  const claimsByIndex = new Map(claims.map((claim) => [claim.index, claim]))
  const generalConnections: SemanticConnection[] = []

  for (const connection of connectionsInput.filter(isActiveSemanticConnection)) {
    const validClaimRefs = (connection.sourceClaimsReferenced ?? [])
      .filter((index) => Number.isInteger(index) && claimsByIndex.has(index))
    if (validClaimRefs.length === 0) {
      generalConnections.push(connection)
      continue
    }
    for (const index of validClaimRefs) {
      claimsByIndex.get(index)?.connections.push(connection)
    }
  }

  return {
    claims,
    generalConnections,
  }
}

function connectionTone(connection: SemanticConnection): SemanticConnectionTone {
  return isKnownRelation(connection.rel) ? SC_EDGE[connection.rel].tone : 'neutral'
}

function natureRank(connection: SemanticConnection): number {
  const tone = connectionTone(connection)
  if (tone === 'warn') return 0
  if (tone === 'caution') return 1
  return 2
}

const RELATION_GROUP_PRIORITY: SemanticConnectionRel[] = [
  'contradicts',
  'supersedes',
  'resolves',
  'depends_on',
  'supports',
  'extends',
  'references',
  'rationale_for',
  'elaborates',
  'summarizes',
  'contains',
  'duplicates',
]

function groupKey(connection: SemanticConnection): string {
  if (!connection.rel) return 'similarity'
  return String(connection.rel)
}

function groupRank(key: string): number {
  if (key === 'similarity') return 90
  if (key === 'semantically_similar_to') return 100
  const index = RELATION_GROUP_PRIORITY.indexOf(key as SemanticConnectionRel)
  if (index >= 0) return index
  return 80
}

export function groupWholeDocumentConnections(
  list: readonly SemanticConnection[],
): SemanticConnectionGroup[] {
  const groups = new Map<string, SemanticConnection[]>()
  for (const connection of list) {
    const key = groupKey(connection)
    const group = groups.get(key) ?? []
    group.push(connection)
    groups.set(key, group)
  }

  return [...groups.entries()]
    .map(([key, connections]) => ({
      key,
      label: key === 'similarity' ? 'Similarity' : scEdgeLabel(key as SemanticConnectionRelation),
      connections: [...connections].sort((a, b) => graphSortValue(b) - graphSortValue(a)),
    }))
    .sort((a, b) => {
      const rankDelta = groupRank(a.key) - groupRank(b.key)
      if (rankDelta !== 0) return rankDelta
      return graphSortValue(b.connections[0]) - graphSortValue(a.connections[0])
    })
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
      return scoreValue(b[0]) - scoreValue(a[0])
    })
    .flat()
}

export function getAllRels(payload: SemanticConnectionBuckets): SemanticConnectionRel[] {
  const rels = new Set<SemanticConnectionRel>()
  for (const connection of payload.overall ?? []) {
    if (isKnownRelation(connection.rel)) rels.add(connection.rel)
  }
  for (const connections of Object.values(payload.byChunkId ?? {})) {
    for (const connection of connections) {
      if (isKnownRelation(connection.rel)) rels.add(connection.rel)
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
