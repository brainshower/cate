import {
  createHeadingIdTracker,
  parseDocumentHeadings,
  type DocumentHeading,
} from './parseDocumentHeadings'
import type {
  SemanticConnection,
  SemanticConnectionDirection,
  SemanticConnectionRel,
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
}

export interface FlashQuerySemanticConnection {
  id: string
  score: number
  rel?: SemanticConnectionRel
  dir?: SemanticConnectionDirection
  target: FlashQuerySemanticConnectionTarget
}

export interface SemanticConnectionsMappingInput {
  markdown: string
  targets: readonly FlashQuerySemanticConnectionTarget[]
}

export interface SemanticConnectionsMappingResult {
  chunkOrder: string[]
  chunkMap: Record<string, SemanticConnectionsTargetMapEntry>
  diagnostics: string[]
}

export interface BuildSemanticConnectionsResultInput {
  markdown: string
  mode: SemanticConnectionMode
  connections: readonly FlashQuerySemanticConnection[]
}

interface PreviewChunkHeading {
  heading: DocumentHeading
  previewChunkId: string
  headingPath: string[]
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
    chunkMap[target.flashqueryChunkId] = mappingEntry(target, previewHeading)
  }

  return {
    chunkOrder: previewHeadings.map((heading) => heading.previewChunkId),
    chunkMap,
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
    score: connection.score,
    target: {
      title: target.documentTitle,
      path: target.documentPath,
      heading: target.headingText,
      chunkId: entry.previewChunkId ?? target.flashqueryChunkId,
      snippet: target.snippet,
      body: target.body,
      inDocument: Boolean(entry.previewChunkId),
      documentId: target.documentId,
      headingPath: target.headingPath,
    },
  }
  if (connection.rel) panelConnection.rel = connection.rel
  if (connection.dir) panelConnection.dir = connection.dir
  return panelConnection
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
    const entry = mapping.chunkMap[connection.target.flashqueryChunkId]
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
    diagnostics: mapping.diagnostics,
  }
}

function cacheKey(input: SemanticConnectionsProviderInput): string {
  return [
    input.workspaceId,
    input.editorPanelId,
    input.documentPath,
    input.contentHash ?? input.markdown,
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
  }
}

// Phase 25 intentionally stops at this Cate-side adapter boundary. A real
// FlashQuery server-side "connections for document/chunk" API is a backend
// dependency for a later phase, not implemented in Cate here.
