import {
  createHeadingIdTracker,
  parseDocumentHeadings,
  type DocumentHeading,
} from './parseDocumentHeadings'
import { parseVaultUri } from '../../shared/flashqueryUri'
import type {
  FlashQueryDocumentConnection,
  FlashQueryDocumentConnectionsParams,
  FlashQueryDocumentConnectionsResponse,
  FlashQueryDocumentSearchResult,
  FlashQueryQueryGraphParams,
  FlashQueryQueryGraphResponse,
  FlashQuerySearchParams,
  FlashQuerySearchResponse,
  FlashQuerySourceChunkConnections,
} from '../../shared/types'
import {
  DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
  DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
  loadCachedFlashQueryDocumentConnections,
} from './semanticConnectionsDocumentCache'
import type {
  GraphDocumentSummary,
  SemanticConnection,
  SemanticConnectionDirection,
  SemanticConnectionNodeMeta,
  SemanticConnectionRel,
  SemanticConnectionRelation,
  SemanticConnectionsCommunitySummary,
  SemanticConnectionsProvider,
  SemanticConnectionsProviderInput,
  SemanticConnectionsResult,
  SemanticConnectionsTargetMapEntry,
  SemanticConnectionMode,
} from './semanticConnections'

export type {
  SemanticConnectionMode,
  SemanticConnectionsProvider,
  SemanticConnectionsProviderInput,
  SemanticConnectionsResult,
} from './semanticConnections'

export interface FlashQuerySemanticConnectionTarget {
  flashqueryChunkId: string
  documentId?: string
  documentPath: string
  documentTitle: string
  headingPath?: string[]
  headingText?: string
  snippet: string
  body?: string
  sourceStartLine?: number
  sourceEndLine?: number
  targetChunkSummary?: string
  targetStale?: boolean
  targetAnalyzedAt?: string
  targetCommunityId?: string
}

export interface FlashQuerySemanticConnection {
  id: string
  score?: number | null
  rel?: SemanticConnectionRelation
  dir?: SemanticConnectionDirection
  confidence?: string
  confidenceScore?: number
  reasoning?: string
  sourceClaimsReferenced?: number[]
  targetClaimsReferenced?: number[]
  status?: string
  qualifiers?: string[]
  metadata?: unknown
  target: FlashQuerySemanticConnectionTarget
}

export interface SemanticConnectionsMappingInput {
  markdown: string
  targets: readonly FlashQuerySemanticConnectionTarget[]
}

export interface SemanticConnectionsMappingResult {
  chunkOrder: string[]
  chunkMap: Record<string, SemanticConnectionsTargetMapEntry>
  chunkMapByFlashQueryId: Record<string, SemanticConnectionsTargetMapEntry>
  diagnostics: string[]
}

export interface BuildSemanticConnectionsResultInput {
  markdown: string
  mode: SemanticConnectionMode
  connections: readonly FlashQuerySemanticConnection[]
  graphSummary?: GraphDocumentSummary
  communitySummary?: SemanticConnectionsCommunitySummary
  nodeMeta?: Record<string, SemanticConnectionNodeMeta>
  nodeMetaLoading?: boolean
  diagnostics?: string[]
}

type FlashQuerySearchFn = (
  workspaceId: string,
  params: FlashQuerySearchParams,
) => Promise<FlashQuerySearchResponse>

type FlashQueryDocumentConnectionsFn = (
  workspaceId: string,
  params: FlashQueryDocumentConnectionsParams,
) => Promise<FlashQueryDocumentConnectionsResponse>

type FlashQueryQueryGraphFn = (
  workspaceId: string,
  params: FlashQueryQueryGraphParams,
) => Promise<FlashQueryQueryGraphResponse>

interface PreviewChunkHeading {
  heading: DocumentHeading
  previewChunkId: string
  headingPath: string[]
}

interface SourcePreviewChunk extends PreviewChunkHeading {
  markdown: string
  sourceStartLine: number
  sourceEndLine: number
}

interface BuildScopedSemanticConnectionsResultInput {
  markdown: string
  mode: SemanticConnectionMode
  overallConnections: readonly FlashQuerySemanticConnection[]
  byPreviewChunkId: Record<string, readonly FlashQuerySemanticConnection[]>
}

function markdownModel(markdown: string) {
  const lines = markdown.split('\n')
  return {
    getLineCount: () => lines.length,
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
  }
}

function sameHeadingPath(left?: readonly string[], right?: readonly string[]): boolean {
  if (!left?.length || !right?.length || left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function previewHeadingsFromMarkdown(markdown: string): PreviewChunkHeading[] {
  const nextChunkId = createHeadingIdTracker()
  const stack: DocumentHeading[] = []

  return parseDocumentHeadings(markdownModel(markdown), 6).map((heading) => {
    while (stack.length && stack[stack.length - 1].level >= heading.level) stack.pop()
    stack.push(heading)
    return {
      heading,
      previewChunkId: nextChunkId(heading.text),
      headingPath: stack.map((entry) => entry.text),
    }
  })
}

function sourcePreviewChunksFromMarkdown(markdown: string): SourcePreviewChunk[] {
  const headings = previewHeadingsFromMarkdown(markdown)
  if (headings.length === 0) return []

  const lines = markdown.split('\n')
  return headings.map((entry, index) => {
    const nextSiblingOrAncestor = headings.slice(index + 1).find((candidate) =>
      candidate.heading.level <= entry.heading.level)
    const sourceStartLine = entry.heading.line
    const sourceEndLine = (nextSiblingOrAncestor?.heading.line ?? (lines.length + 1)) - 1
    return {
      ...entry,
      sourceStartLine,
      sourceEndLine,
      markdown: lines.slice(sourceStartLine - 1, sourceEndLine).join('\n').trim(),
    }
  }).filter((chunk) => chunk.markdown.length > 0)
}

function findPreviewHeading(
  target: FlashQuerySemanticConnectionTarget,
  previewHeadings: readonly PreviewChunkHeading[],
  usedPreviewIds: Set<string>,
): PreviewChunkHeading | null {
  const samePath = previewHeadings.filter((candidate) => sameHeadingPath(candidate.headingPath, target.headingPath))
  const candidates = samePath.length > 0
    ? samePath
    : previewHeadings.filter((candidate) => candidate.heading.text === target.headingText)
  if (candidates.length === 0) return null

  if (target.sourceStartLine) {
    const lineMatch = candidates.find((candidate) => candidate.heading.line === target.sourceStartLine)
    if (lineMatch) return lineMatch
  }

  return candidates.find((candidate) => !usedPreviewIds.has(candidate.previewChunkId)) ?? candidates[0] ?? null
}

function mappingEntry(
  target: FlashQuerySemanticConnectionTarget,
  previewHeading: PreviewChunkHeading | null,
): SemanticConnectionsTargetMapEntry {
  return {
    flashqueryChunkId: target.flashqueryChunkId,
    previewChunkId: previewHeading?.previewChunkId ?? null,
    documentId: target.documentId,
    documentPath: target.documentPath,
    documentTitle: target.documentTitle,
    headingPath: target.headingPath,
    headingText: target.headingText,
    sourceStartLine: target.sourceStartLine,
    sourceEndLine: target.sourceEndLine,
  }
}

export function mapFlashQueryChunksToPreview(input: SemanticConnectionsMappingInput): SemanticConnectionsMappingResult {
  const previewHeadings = previewHeadingsFromMarkdown(input.markdown)
  const usedPreviewIds = new Set<string>()
  const chunkMap: Record<string, SemanticConnectionsTargetMapEntry> = {}
  const chunkMapByFlashQueryId: Record<string, SemanticConnectionsTargetMapEntry> = {}
  const diagnostics: string[] = []

  for (const target of input.targets) {
    const previewHeading = findPreviewHeading(target, previewHeadings, usedPreviewIds)
    if (previewHeading) {
      usedPreviewIds.add(previewHeading.previewChunkId)
    } else {
      diagnostics.push(
        `Unable to map FlashQuery chunk ${target.flashqueryChunkId} for ${target.documentPath}`
        + `${target.headingPath?.length ? ` at ${target.headingPath.join(' > ')}` : ''}`,
      )
    }
    const entry = mappingEntry(target, previewHeading)
    chunkMapByFlashQueryId[target.flashqueryChunkId] = entry
    if (entry.previewChunkId) chunkMap[entry.previewChunkId] = entry
  }

  return {
    chunkOrder: previewHeadings.map((heading) => heading.previewChunkId),
    chunkMap,
    chunkMapByFlashQueryId,
    diagnostics,
  }
}

function toPanelConnection(
  connection: FlashQuerySemanticConnection,
  entry: SemanticConnectionsTargetMapEntry,
): SemanticConnection {
  const target = connection.target
  const panelConnection: SemanticConnection = {
    id: connection.id,
    target: {
      title: target.documentTitle,
      path: target.documentPath,
      heading: target.headingText,
      chunkId: entry.previewChunkId ?? target.flashqueryChunkId,
      snippet: target.snippet,
      body: target.body,
      inDocument: false,
      documentId: target.documentId,
      headingPath: target.headingPath,
      targetChunkSummary: target.targetChunkSummary,
      targetStale: target.targetStale,
      targetAnalyzedAt: target.targetAnalyzedAt,
      targetCommunityId: target.targetCommunityId,
    },
  }
  if (typeof connection.score === 'number' && Number.isFinite(connection.score)) panelConnection.score = connection.score
  if (connection.rel) panelConnection.rel = connection.rel
  if (connection.dir) panelConnection.dir = connection.dir
  if (connection.confidence) panelConnection.confidence = connection.confidence
  if (typeof connection.confidenceScore === 'number' && Number.isFinite(connection.confidenceScore)) {
    panelConnection.confidenceScore = connection.confidenceScore
  }
  if (connection.reasoning) panelConnection.reasoning = connection.reasoning
  if (connection.sourceClaimsReferenced) panelConnection.sourceClaimsReferenced = connection.sourceClaimsReferenced
  if (connection.targetClaimsReferenced) panelConnection.targetClaimsReferenced = connection.targetClaimsReferenced
  if (connection.status) panelConnection.status = connection.status
  if (connection.qualifiers) panelConnection.qualifiers = connection.qualifiers
  if (connection.metadata !== undefined) panelConnection.metadata = connection.metadata
  return panelConnection
}

function toUnscopedPanelConnection(connection: FlashQuerySemanticConnection): SemanticConnection {
  return toPanelConnection(connection, mappingEntry(connection.target, null))
}

function dedupeConnections(connections: readonly SemanticConnection[]): SemanticConnection[] {
  const seen = new Set<string>()
  const deduped: SemanticConnection[] = []
  for (const connection of connections) {
    const key = connection.id
    if (seen.has(key)) continue
    seen.add(connection.id)
    deduped.push(connection)
  }
  return deduped
}

function dedupeBestConnections(connections: readonly SemanticConnection[]): SemanticConnection[] {
  const byId = new Map<string, SemanticConnection>()
  for (const connection of connections) {
    const existing = byId.get(connection.id)
    if (!existing || connectionScore(connection) > connectionScore(existing)) byId.set(connection.id, connection)
  }
  return [...byId.values()].sort((left, right) => {
    const scoreDelta = connectionScore(right) - connectionScore(left)
    if (scoreDelta !== 0) return scoreDelta
    return left.id.localeCompare(right.id)
  })
}

function connectionScore(connection: SemanticConnection): number {
  return connection.score ?? connection.confidenceScore ?? 0
}

function unknownRelationDiagnostics(connections: readonly SemanticConnection[]): string[] {
  const knownRelations = new Set<string>([
    'contains',
    'references',
    'depends_on',
    'supersedes',
    'rationale_for',
    'elaborates',
    'summarizes',
    'contradicts',
    'duplicates',
    'supports',
    'extends',
    'resolves',
    'semantically_similar_to',
  ])
  const diagnostics = new Set<string>()
  for (const connection of connections) {
    if (connection.rel && !knownRelations.has(connection.rel)) {
      diagnostics.add(`Unknown semantic relation: ${connection.rel}`)
    }
  }
  return [...diagnostics]
}

export function buildSemanticConnectionsResult(input: BuildSemanticConnectionsResultInput): SemanticConnectionsResult {
  const mapping = mapFlashQueryChunksToPreview({
    markdown: input.markdown,
    targets: input.connections.map((connection) => connection.target),
  })
  const byChunkId: Record<string, SemanticConnection[]> = Object.fromEntries(
    mapping.chunkOrder.map((chunkId) => [chunkId, []]),
  )
  const overall: SemanticConnection[] = []

  for (const connection of input.connections) {
    const entry = mapping.chunkMapByFlashQueryId[connection.target.flashqueryChunkId]
    if (!entry) continue
    const panelConnection = toPanelConnection(connection, entry)
    overall.push(panelConnection)
    if (entry.previewChunkId) {
      byChunkId[entry.previewChunkId] = [...(byChunkId[entry.previewChunkId] ?? []), panelConnection]
    }
  }

  return {
    mode: input.mode,
    overall,
    byChunkId,
    chunkOrder: mapping.chunkOrder,
    chunkMap: mapping.chunkMap,
    diagnostics: [
      ...mapping.diagnostics,
      ...(input.diagnostics ?? []),
      ...unknownRelationDiagnostics(overall),
    ],
    ...(input.graphSummary ? { graphSummary: input.graphSummary } : {}),
    ...(input.communitySummary ? { communitySummary: input.communitySummary } : {}),
    ...(input.nodeMeta ? { nodeMeta: input.nodeMeta } : {}),
    ...(input.nodeMetaLoading !== undefined ? { nodeMetaLoading: input.nodeMetaLoading } : {}),
  }
}

function buildScopedSemanticConnectionsResult(input: BuildScopedSemanticConnectionsResultInput): SemanticConnectionsResult {
  const sourceChunks = sourcePreviewChunksFromMarkdown(input.markdown)
  const byChunkId: Record<string, SemanticConnection[]> = Object.fromEntries(
    sourceChunks.map((chunk) => [chunk.previewChunkId, []]),
  )
  const chunkMap: Record<string, SemanticConnectionsTargetMapEntry> = Object.fromEntries(
    sourceChunks.map((chunk) => [
      chunk.previewChunkId,
      {
        previewChunkId: chunk.previewChunkId,
        documentPath: '',
        documentTitle: '',
        headingPath: chunk.headingPath,
        headingText: chunk.heading.text,
        sourceStartLine: chunk.sourceStartLine,
        sourceEndLine: chunk.sourceEndLine,
      },
    ]),
  )

  for (const [previewChunkId, connections] of Object.entries(input.byPreviewChunkId)) {
    byChunkId[previewChunkId] = dedupeConnections(connections.map(toUnscopedPanelConnection))
  }

  return {
    mode: input.mode,
    overall: dedupeConnections(input.overallConnections.map(toUnscopedPanelConnection)),
    byChunkId,
    chunkOrder: sourceChunks.map((chunk) => chunk.previewChunkId),
    chunkMap,
    diagnostics: [],
  }
}

function targetFromConnection(connection: FlashQueryDocumentConnection): FlashQuerySemanticConnectionTarget {
  const headingPath = headingPathFrom(connection.target.heading_path)
  return {
    flashqueryChunkId: connection.target.chunk_id,
    documentId: connection.target.document_id,
    documentPath: connection.target.path,
    documentTitle: connection.target.title,
    headingPath,
    headingText: headingFromPath(connection.target.heading_path),
    snippet: snippetFrom(connection.target.content, undefined),
    body: connection.target.content,
    targetChunkSummary: connection.target.chunk_summary,
    targetStale: connection.target.stale,
    targetAnalyzedAt: connection.target.analyzed_at,
    targetCommunityId: connection.target.community_id,
  }
}

function sourceChunkTarget(
  sourceChunk: FlashQuerySourceChunkConnections,
  response: FlashQueryDocumentConnectionsResponse,
): FlashQuerySemanticConnectionTarget {
  const headingPath = headingPathFrom(sourceChunk.heading_path ?? sourceChunk.breadcrumb)
  return {
    flashqueryChunkId: sourceChunk.chunk_id,
    documentId: response.source.document_id,
    documentPath: response.source.path,
    documentTitle: response.source.title ?? response.source.path,
    headingPath,
    headingText: headingFromPath(sourceChunk.heading_path ?? sourceChunk.breadcrumb),
    snippet: '',
  }
}

function toFlashQuerySemanticConnection(connection: FlashQueryDocumentConnection): FlashQuerySemanticConnection {
  return {
    id: connection.id,
    score: connection.score,
    rel: connection.relation,
    dir: connection.direction as SemanticConnectionDirection | undefined,
    confidence: connection.confidence,
    confidenceScore: connection.confidence_score,
    reasoning: connection.reasoning,
    sourceClaimsReferenced: connection.source_claims_referenced,
    targetClaimsReferenced: connection.target_claims_referenced,
    status: connection.status,
    qualifiers: connection.qualifiers,
    metadata: connection.metadata,
    target: targetFromConnection(connection),
  }
}

function toSemanticConnection(connection: FlashQueryDocumentConnection): SemanticConnection {
  return toUnscopedPanelConnection(toFlashQuerySemanticConnection(connection))
}

function sourcePreviewChunkId(
  sourceChunk: FlashQuerySourceChunkConnections,
  markdown: string,
): string | null {
  const headingPath = headingPathFrom(sourceChunk.heading_path ?? sourceChunk.breadcrumb)
  const headingText = headingFromPath(sourceChunk.heading_path ?? sourceChunk.breadcrumb)
  const mappingTarget: FlashQuerySemanticConnectionTarget = {
    flashqueryChunkId: sourceChunk.chunk_id,
    documentPath: '',
    documentTitle: '',
    headingPath,
    headingText,
    snippet: '',
  }
  const previewHeading = findPreviewHeading(mappingTarget, previewHeadingsFromMarkdown(markdown), new Set())
  return previewHeading?.previewChunkId ?? null
}

function deriveMode(
  graphSummary: GraphDocumentSummary | undefined,
  renderedConnections: readonly SemanticConnection[],
): SemanticConnectionMode {
  if (!graphSummary || graphSummary.edge_count <= 0) return 'embeddings-only'
  return renderedConnections.some((connection) => !connection.rel) ? 'mixed' : 'typed'
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : undefined
}

function nodeMetaFromQueryGraph(payload: FlashQueryQueryGraphResponse): SemanticConnectionNodeMeta | null {
  if (payload.error) return null
  const meta: SemanticConnectionNodeMeta = {}
  if (typeof payload.chunk_summary === 'string') meta.chunkSummary = payload.chunk_summary
  const keyClaims = stringArray(payload.key_claims)
  if (keyClaims) meta.keyClaims = keyClaims
  if (typeof payload.certainty_level === 'string') meta.certaintyLevel = payload.certainty_level
  if (typeof payload.staleness_risk === 'string') meta.stalenessRisk = payload.staleness_risk
  const externalRefs = stringArray(payload.external_refs)
  if (externalRefs) meta.externalRefs = externalRefs
  const temporalMarkers = stringArray(payload.temporal_markers)
  if (temporalMarkers) meta.temporalMarkers = temporalMarkers
  if (typeof payload.question_status === 'string') meta.questionStatus = payload.question_status
  if (typeof payload.question_resolution === 'string') meta.questionResolution = payload.question_resolution
  if (typeof payload.community_id === 'string') meta.communityId = payload.community_id
  if (typeof payload.community_label === 'string') meta.communityLabel = payload.community_label
  if (typeof payload.community_summary === 'string') meta.communitySummary = payload.community_summary
  if (typeof payload.content === 'string') meta.content = payload.content
  if (typeof payload.analyzed === 'boolean') meta.analyzed = payload.analyzed
  if (typeof payload.stale === 'boolean') meta.stale = payload.stale
  if (typeof payload.analyzed_at === 'string') meta.analyzedAt = payload.analyzed_at
  return Object.keys(meta).length > 0 ? meta : null
}

async function backfillNodeMeta(
  workspaceId: string,
  result: SemanticConnectionsResult,
  queryGraph: FlashQueryQueryGraphFn,
): Promise<SemanticConnectionsResult> {
  const entries = Object.values(result.chunkMap)
    .filter((entry): entry is SemanticConnectionsTargetMapEntry & { flashqueryChunkId: string; previewChunkId: string } =>
      Boolean(entry.flashqueryChunkId && entry.previewChunkId))
  if (entries.length === 0) return result

  const nodeMeta: Record<string, SemanticConnectionNodeMeta> = {}
  const diagnostics: string[] = []
  await Promise.all(entries.map(async (entry) => {
    try {
      const payload = await queryGraph(workspaceId, {
        action: 'node',
        chunk_id: entry.flashqueryChunkId,
      })
      if (payload.error) {
        diagnostics.push(`Unable to load node metadata for ${entry.flashqueryChunkId}: ${payload.error}`)
        return
      }
      const meta = nodeMetaFromQueryGraph(payload)
      if (meta) nodeMeta[entry.previewChunkId] = meta
    } catch (error) {
      diagnostics.push(
        `Unable to load node metadata for ${entry.flashqueryChunkId}: `
        + `${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }))

  return {
    ...result,
    nodeMeta: {
      ...(result.nodeMeta ?? {}),
      ...nodeMeta,
    },
    nodeMetaLoading: false,
    diagnostics: [
      ...result.diagnostics,
      ...diagnostics,
    ],
  }
}

function buildConnectionsResultFromDocumentConnections(
  markdown: string,
  response: FlashQueryDocumentConnectionsResponse,
): SemanticConnectionsResult {
  if (response.error) throw new Error(response.error)

  const mapping = mapFlashQueryChunksToPreview({
    markdown,
    targets: response.source_chunks.map((sourceChunk) => sourceChunkTarget(sourceChunk, response)),
  })
  const byChunkId: Record<string, SemanticConnection[]> = Object.fromEntries(
    mapping.chunkOrder.map((chunkId) => [chunkId, []]),
  )

  for (const sourceChunk of response.source_chunks) {
    const entry = mapping.chunkMapByFlashQueryId[sourceChunk.chunk_id]
    if (!entry?.previewChunkId) continue
    byChunkId[entry.previewChunkId] = dedupeBestConnections(sourceChunk.connections.map(toSemanticConnection))
  }

  const overall = dedupeBestConnections(response.overall.map(toSemanticConnection))
  const renderedConnections = dedupeBestConnections([
    ...overall,
    ...Object.values(byChunkId).flat(),
  ])
  const communityLabels = response.graph_summary?.community_labels.filter((label) => label.trim().length > 0) ?? []
  const communitySummary: SemanticConnectionsCommunitySummary | undefined = communityLabels.length > 0
    ? {
        dominantLabel: communityLabels[0],
        labels: communityLabels,
      }
    : undefined

  return {
    mode: deriveMode(response.graph_summary, renderedConnections),
    overall,
    byChunkId,
    chunkOrder: mapping.chunkOrder,
    chunkMap: mapping.chunkMap,
    diagnostics: [
      ...mapping.diagnostics,
      ...(response.diagnostics ?? []),
      ...unknownRelationDiagnostics(renderedConnections),
    ],
    ...(response.graph_summary ? { graphSummary: response.graph_summary } : {}),
    ...(communitySummary ? { communitySummary } : {}),
  }
}

function cacheKey(input: SemanticConnectionsProviderInput): string {
  return [
    input.workspaceId,
    input.editorPanelId,
    input.documentPath,
    input.documentId ?? '',
    input.contentHash ?? input.markdown,
    input.embeddingNames?.join(',') ?? '',
  ].join('\u001f')
}

export function createCachedSemanticConnectionsProvider(
  provider: SemanticConnectionsProvider,
): SemanticConnectionsProvider {
  const cache = new Map<string, Promise<SemanticConnectionsResult> | SemanticConnectionsResult>()

  return {
    async loadDocumentConnections(input) {
      const key = cacheKey(input)
      const cached = cache.get(key)
      if (cached) return cached

      const pending = provider.loadDocumentConnections(input)
        .then((result) => {
          cache.set(key, result)
          return result
        })
        .catch((error) => {
          cache.delete(key)
          throw error
        })
      cache.set(key, pending)
      return pending
    },
    invalidateDocumentConnections(input) {
      cache.delete(cacheKey(input))
    },
  }
}

function sourceVaultPath(documentPath: string): string {
  return parseVaultUri(documentPath)?.vaultPath ?? documentPath
}

function headingFromPath(value: string | undefined): string | undefined {
  if (!value) return undefined
  const parts = value.split('>').map((part) => part.trim()).filter(Boolean)
  return parts.at(-1)
}

function headingPathFrom(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  const parts = value.split('>').map((part) => part.trim()).filter(Boolean)
  return parts.length > 0 ? parts : undefined
}

function snippetFrom(content: string | undefined, fallback: string | undefined): string {
  const value = (content ?? fallback ?? '').replace(/\s+/g, ' ').trim()
  return value.length > 240 ? `${value.slice(0, 237)}...` : value
}

function connectionsFromDocument(doc: FlashQueryDocumentSearchResult): FlashQuerySemanticConnection[] {
  const chunks = doc.matched_chunks?.length
    ? doc.matched_chunks
    : [{
        chunk_id: doc.fullPath,
        content: doc.snippet,
        score: doc.score,
      }]

  return chunks.map((chunk, index) => {
    const headingPath = headingPathFrom(chunk.heading_path ?? chunk.breadcrumb)
    return {
      id: `${doc.fullPath}#${chunk.chunk_id || index}`,
      score: chunk.score ?? doc.score ?? 0,
      target: {
        flashqueryChunkId: chunk.chunk_id || `${doc.fullPath}#${index}`,
        documentPath: doc.fullPath,
        documentTitle: doc.title ?? doc.filename,
        headingPath,
        headingText: headingFromPath(chunk.heading_path ?? chunk.breadcrumb),
        snippet: snippetFrom(chunk.content, doc.snippet),
        body: chunk.content,
      },
    }
  })
}

function connectionsFromResponse(response: FlashQuerySearchResponse, sourcePath: string): FlashQuerySemanticConnection[] {
  if (response.error) {
    throw new Error(response.error)
  }

  return response.documents
    .filter((doc) => doc.fullPath !== sourcePath)
    .flatMap((doc) => connectionsFromDocument(doc))
}

export function createFlashQuerySemanticConnectionsProvider(
  search: FlashQuerySearchFn = (workspaceId, params) => window.electronAPI.flashquerySearch(workspaceId, params),
  documentConnections?: FlashQueryDocumentConnectionsFn,
  queryGraph?: FlashQueryQueryGraphFn,
): SemanticConnectionsProvider {
  return createCachedSemanticConnectionsProvider({
    async loadDocumentConnections(input) {
      const query = input.markdown.trim()
      if (!query) return buildSemanticConnectionsResult({ markdown: input.markdown, mode: 'embeddings-only', connections: [] })

      const sourcePath = sourceVaultPath(input.documentPath)
      const loadDocumentConnections = documentConnections
        ?? (typeof window === 'undefined' ? undefined : loadCachedFlashQueryDocumentConnections)
      if (loadDocumentConnections) {
        const response = await loadDocumentConnections(input.workspaceId, {
          identifier: sourcePath,
          limit: DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
          limit_per_chunk: DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
          ...(input.embeddingNames?.length ? { embedding_names: input.embeddingNames } : {}),
        })
        const result = buildConnectionsResultFromDocumentConnections(input.markdown, response)
        const loadQueryGraph = queryGraph
          ?? (typeof window === 'undefined' ? undefined : window.electronAPI.flashqueryQueryGraph)
        if (!loadQueryGraph || result.mode === 'embeddings-only') return result
        return backfillNodeMeta(input.workspaceId, result, loadQueryGraph)
      }

      const searchParams = {
        mode: 'semantic',
        entity_types: ['documents'],
        limit: 12,
        limit_chunks_per_result: 5,
        ...(input.embeddingNames?.length ? { embedding_names: input.embeddingNames } : {}),
      } satisfies Omit<FlashQuerySearchParams, 'query'>

      const response = await search(input.workspaceId, {
        query,
        ...searchParams,
      })
      const overallConnections = connectionsFromResponse(response, sourcePath)
      const sourceChunks = sourcePreviewChunksFromMarkdown(input.markdown)

      const sectionResults = await Promise.all(sourceChunks.map(async (chunk) => {
        const sectionResponse = await search(input.workspaceId, {
          query: chunk.markdown,
          ...searchParams,
        })
        return [chunk.previewChunkId, connectionsFromResponse(sectionResponse, sourcePath)] as const
      }))

      return buildScopedSemanticConnectionsResult({
        markdown: input.markdown,
        mode: 'embeddings-only',
        overallConnections,
        byPreviewChunkId: Object.fromEntries(sectionResults),
      })
    },
  })
}
