# Phase 27: Graph Data Contract and Whole-Document Graph View - Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 17
**Analogs found:** 17 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/renderer/lib/semanticConnections.ts` | utility/model | transform | `src/renderer/lib/semanticConnections.ts` | exact |
| `src/renderer/lib/semanticConnectionsProvider.ts` | service/provider | request-response + transform | `src/renderer/lib/semanticConnectionsProvider.ts` | exact |
| `src/renderer/panels/SemanticConnectionsPanel.tsx` | component | event-driven + request-response | `src/renderer/panels/SemanticConnectionsPanel.tsx` | exact |
| `src/renderer/stores/previewSelectionStore.ts` | store | event-driven | `src/renderer/stores/previewSelectionStore.ts` | exact |
| `src/renderer/stores/semanticConnectionsChromeStore.ts` | store | event-driven | `src/renderer/stores/semanticConnectionsChromeStore.ts` | exact |
| `src/shared/types.ts` | model/contract | request-response | `src/shared/types.ts` | exact |
| `src/shared/ipc-channels.ts` | config/contract | request-response | `src/shared/ipc-channels.ts` | exact |
| `src/shared/electron-api.d.ts` | model/contract | request-response | `src/shared/electron-api.d.ts` | exact |
| `src/main/flashquery/clientManager.ts` | service | request-response | `src/main/flashquery/clientManager.ts` | exact |
| `src/main/ipc/flashquery.ts` | controller/IPC route | request-response | `src/main/ipc/flashquery.ts` | exact |
| `src/preload/index.ts` | provider/bridge | request-response | `src/preload/index.ts` | exact |
| `src/renderer/lib/semanticConnections.test.ts` | test | transform | `src/renderer/lib/semanticConnections.test.ts` | exact |
| `src/renderer/lib/semanticConnectionsProvider.test.ts` | test | request-response + transform | `src/renderer/lib/semanticConnectionsProvider.test.ts` | exact |
| `src/renderer/panels/SemanticConnectionsPanel.test.tsx` | test | event-driven + request-response | `src/renderer/panels/SemanticConnectionsPanel.test.tsx` | exact |
| `src/main/flashquery/clientManager.test.ts` | test | request-response | `src/main/flashquery/clientManager.test.ts` | exact |
| `src/main/ipc/flashquery.test.ts` | test | request-response | `src/main/ipc/flashquery.test.ts` | exact |
| `src/preload/index.test.ts` | test | request-response | `src/preload/index.test.ts` | exact |

## Pattern Assignments

### `src/renderer/lib/semanticConnections.ts` (utility/model, transform)

**Analog:** `src/renderer/lib/semanticConnections.ts`

**Imports pattern:** none. Keep this module dependency-light and pure.

**Type contract pattern** (lines 1-33):
```typescript
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

export interface SemanticConnection {
  id: string
  score: number
  rel?: SemanticConnectionRel
  dir?: SemanticConnectionDirection
  target: SemanticConnectionTarget
}
```

**Result shape pattern** (lines 64-72):
```typescript
export interface SemanticConnectionsResult {
  mode: SemanticConnectionMode
  overall: readonly SemanticConnection[]
  byChunkId: Record<string, readonly SemanticConnection[]>
  chunkOrder: string[]
  chunkMap: Record<string, SemanticConnectionsTargetMapEntry>
  diagnostics: string[]
  stale?: boolean
}
```

**Relation metadata and fallback pattern** (lines 97-123):
```typescript
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

export function scEdgeLabel(rel?: SemanticConnectionRel, dir?: SemanticConnectionDirection): string {
  if (!rel) return 'Similarity only'
  const edge = SC_EDGE[rel]
  if (!edge) return titleCase(rel.replace(/_/g, ' '))
  if (edge.kind === 'symmetric') return titleCase(edge.sym ?? rel.replace(/_/g, ' '))
  return titleCase((dir === 'in' ? edge.in : edge.out) ?? edge.out ?? rel.replace(/_/g, ' '))
}
```

**Sorting/grouping helper pattern** (lines 136-158):
```typescript
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
```

**Apply to Phase 27:** Extend these same exported unions/interfaces and pure helpers. Make `score` optional defensively, add graph fields as optional, expand `SC_EDGE`, and add grouping/filter/mode helpers here or in a small adjacent pure module only if `semanticConnections.ts` becomes unwieldy.

---

### `src/renderer/lib/semanticConnectionsProvider.ts` (service/provider, request-response + transform)

**Analog:** `src/renderer/lib/semanticConnectionsProvider.ts`

**Imports pattern** (lines 1-30):
```typescript
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
  FlashQuerySourceChunkConnections,
} from '../../shared/types'
import type {
  SemanticConnection,
  SemanticConnectionDirection,
  SemanticConnectionRel,
  SemanticConnectionsProvider,
  SemanticConnectionsProviderInput,
  SemanticConnectionsResult,
} from './semanticConnections'
```

**Preview chunk mapping pattern** (lines 120-218):
```typescript
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
```

**Connection translation pattern** (lines 220-243):
```typescript
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
      inDocument: false,
      documentId: target.documentId,
      headingPath: target.headingPath,
    },
  }
  if (connection.rel) panelConnection.rel = connection.rel
  if (connection.dir) panelConnection.dir = connection.dir
  return panelConnection
}
```

**Document-connections provider path** (lines 517-537):
```typescript
export function createFlashQuerySemanticConnectionsProvider(
  search: FlashQuerySearchFn = (workspaceId, params) => window.electronAPI.flashquerySearch(workspaceId, params),
  documentConnections?: FlashQueryDocumentConnectionsFn,
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
        return buildConnectionsResultFromDocumentConnections(input.markdown, response)
      }
```

**Apply to Phase 27:** Keep `previewChunkId` as the renderer-local ID. Preserve FlashQuery IDs only in `chunkMap`/diagnostics. Add a dependency-injectable `queryGraph` function like the existing `search`/`documentConnections` functions so tests can mock progressive node metadata without real IPC.

---

### `src/renderer/panels/SemanticConnectionsPanel.tsx` (component, event-driven + request-response)

**Analog:** `src/renderer/panels/SemanticConnectionsPanel.tsx`

**Imports pattern** (lines 1-29):
```typescript
import { ArrowSquareOut, SlidersHorizontal } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SemanticConnectionsPanelProps } from './types'
import {
  arrangeForDisplay,
  getAllRels,
  scEdgeLabel,
  type SemanticConnection,
  type SemanticConnectionSortMode,
  type SemanticConnectionsProvider,
  type SemanticConnectionsResult,
} from '../lib/semanticConnections'
import { usePreviewSelectionStore } from '../stores/previewSelectionStore'
import { useSemanticConnectionsChromeStore } from '../stores/semanticConnectionsChromeStore'
```

**Runtime result validation pattern** (lines 77-106):
```typescript
function isSemanticConnectionsResult(value: unknown): value is SemanticConnectionsResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SemanticConnectionsResult>
  return (candidate.mode === 'embeddings-only' || candidate.mode === 'mixed' || candidate.mode === 'typed')
    && Array.isArray(candidate.overall)
    && candidate.overall.every(isSemanticConnection)
    && Boolean(candidate.byChunkId)
    && typeof candidate.byChunkId === 'object'
    && Object.values(candidate.byChunkId).every((connections) => Array.isArray(connections) && connections.every(isSemanticConnection))
    && Array.isArray(candidate.chunkOrder)
    && candidate.chunkOrder.every((chunkId) => typeof chunkId === 'string')
    && Boolean(candidate.chunkMap)
    && typeof candidate.chunkMap === 'object'
    && Array.isArray(candidate.diagnostics)
    && candidate.diagnostics.every((diagnostic) => typeof diagnostic === 'string')
}
```

**Recoverable issue mapping pattern** (lines 108-116):
```typescript
function issueFromError(error: unknown): Exclude<LoadIssue, null> {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (code === 'NO_VAULT_CONNECTED' || message.includes('no vault')) return 'no-vault'
  if (code === 'FLASHQUERY_UNAVAILABLE' || message.includes('unavailable') || message.includes('service down')) {
    return 'flashquery-unavailable'
  }
  return 'adapter-error'
}
```

**Navigation pattern through preview selection** (lines 365-378):
```typescript
const handleOpenConnection = useCallback((connection: SemanticConnection) => {
  if (!hasOpenMetadata(connection)) return
  const { target } = connection
  const heading = target.heading!
  const chunkId = target.chunkId
  const path = target.path
  const editorPath = editorPathForTarget(workspaceId, documentPath, path)
  const sameDocument = target.inDocument || path === documentPath || editorPath === documentPath

  if (sameDocument) {
    snapshot.scrollPreviewToHeading?.(heading)
    const resolvedChunkId = snapshot.resolvePreviewChunkIdForHeading?.(heading)
    if (resolvedChunkId) usePreviewSelectionStore.getState().selectSection(resolvedChunkId, selectionScopeId)
    return
  }
```

**Load/race/stale cache pattern** (lines 406-454):
```typescript
useEffect(() => {
  if (precondition || !snapshot.panelId || !documentPath) return
  const key = cacheKey(workspaceId, snapshot.panelId, documentPath, markdownHash)
  const docKey = documentCacheKey(workspaceId, snapshot.panelId, documentPath)
  const cached = loadKey === 0 ? resultCacheRef.current.get(key) : undefined
  if (cached) {
    setResult(cached)
    setLoading(false)
    setLoadIssue(null)
    return
  }

  const latest = latestResultRef.current.get(docKey)
  if (latest && latest.hash !== markdownHash) {
    setResult({ ...latest.result, stale: true })
  }

  const requestId = requestRef.current + 1
  requestRef.current = requestId
  setLoading(true)
  setLoadIssue(null)
  const input = {
    workspaceId,
    editorPanelId: snapshot.panelId,
    documentPath,
    markdown,
    contentHash: markdownHash,
    scopeChunkId: activeChunkId,
  }
```

**Chrome publication pattern** (lines 499-509):
```typescript
useEffect(() => {
  useSemanticConnectionsChromeStore.getState().setPanelChrome(panelId, {
    connectionCount: scopedConnections.length,
    configOpen,
    configActive,
    toggleConfig,
  })
  return () => {
    useSemanticConnectionsChromeStore.getState().clearPanelChrome(panelId)
  }
}, [configActive, configOpen, panelId, scopedConnections.length, toggleConfig])
```

**Apply to Phase 27:** Keep this component as state owner unless extracting view components reduces test weight. Add graph mode branches below the existing toolbar. Preserve embeddings-only `ConnectionCard` path and only show graph controls for typed/mixed graph data.

---

### `src/shared/types.ts` (model/contract, request-response)

**Analog:** `src/shared/types.ts`

**FlashQuery contract pattern** (lines 198-310):
```typescript
export type FlashQueryDocumentPart = 'body' | 'frontmatter' | 'connections'

export interface FlashQueryGetDocumentOptions {
  include?: FlashQueryDocumentPart[]
  connections?: Omit<FlashQueryDocumentConnectionsParams, 'identifier'>
}

export interface FlashQueryDocumentConnectionTarget {
  chunk_id: string
  document_id?: string
  path: string
  title: string
  heading_path?: string
  content?: string
}

export interface FlashQueryDocumentConnection {
  id: string
  score: number
  target: FlashQueryDocumentConnectionTarget
}

export interface FlashQueryDocumentConnectionsResponse {
  source: {
    document_id: string
    path: string
    title?: string
  }
  overall: FlashQueryDocumentConnection[]
  source_chunks: FlashQuerySourceChunkConnections[]
  error?: string
}
```

**Credential sanitation pattern** (lines 327-354):
```typescript
export function isFlashQueryConnection(value: unknown): value is FlashQueryConnection {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (obj.transport !== 'http' || typeof obj.url !== 'string' || obj.url.length === 0) return false
  if (obj.auth === undefined) return true
  if (!obj.auth || typeof obj.auth !== 'object') return false
  const auth = obj.auth as Record<string, unknown>
  return auth.type === 'bearer' && typeof auth.token === 'string'
}

export function sanitizeFlashQueryConnection(value: unknown): FlashQueryConnection | undefined {
  if (!isFlashQueryConnection(value)) return undefined
  const url = normalizeFlashQueryConnectionUrl(value.url)
  return url ? { transport: 'http', url } : undefined
}
```

**Apply to Phase 27:** Add `graph_summary` (and optionally `headings`) to `FlashQueryDocumentPart`, expand connection/source chunk/graph summary/query graph types here, and keep all fields serializable. Credentials never belong in renderer-facing types.

---

### `src/shared/ipc-channels.ts` (config/contract, request-response)

**Analog:** `src/shared/ipc-channels.ts`

**Channel constant pattern** (lines 138-152):
```typescript
// FlashQuery
export const FLASHQUERY_SET_CONNECTION = 'flashquery:setConnection'
export const FLASHQUERY_PROBE = 'flashquery:probe'
export const FLASHQUERY_LIST_VAULT = 'flashquery:listVault'
export const FLASHQUERY_GET_DOCUMENT = 'flashquery:getDocument'
export const FLASHQUERY_WRITE_DOCUMENT = 'flashquery:writeDocument'
export const FLASHQUERY_CREATE_DOCUMENT = 'flashquery:createDocument'
export const FLASHQUERY_MANAGE_DIRECTORY = 'flashquery:manageDirectory'
export const FLASHQUERY_MOVE_DOCUMENT = 'flashquery:moveDocument'
export const FLASHQUERY_REMOVE_DOCUMENT = 'flashquery:removeDocument'
export const FLASHQUERY_SEARCH = 'flashquery:search'
export const FLASHQUERY_DOCUMENT_CONNECTIONS = 'flashquery:documentConnections'
export const FLASHQUERY_LIST_VAULT_INDEX = 'flashquery:list-vault-index'
export const FLASHQUERY_RETRY = 'flashquery:retry'
export const FLASHQUERY_STATUS = 'flashquery:status' // main -> renderer
```

**Apply to Phase 27:** Add `FLASHQUERY_QUERY_GRAPH = 'flashquery:queryGraph'` adjacent to these constants and update channel tests to assert the exact string.

---

### `src/main/ipc/flashquery.ts` (controller/IPC route, request-response)

**Analog:** `src/main/ipc/flashquery.ts`

**Imports pattern** (lines 4-19, 20-36):
```typescript
import {
  FLASHQUERY_CREATE_DOCUMENT,
  FLASHQUERY_DOCUMENT_CONNECTIONS,
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_SEARCH,
  FLASHQUERY_STATUS,
  FLASHQUERY_SET_CONNECTION,
} from '../../shared/ipc-channels'
import type {
  FlashQueryConnection,
  FlashQueryDocumentConnectionsParams,
  FlashQueryDocumentConnectionsResponse,
  FlashQueryGetDocumentOptions,
  FlashQuerySearchParams,
} from '../../shared/types'
import { FlashQueryClientManager } from '../flashquery/clientManager'
```

**Boundary validation pattern** (lines 254-284):
```typescript
function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

function requireStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    throw new Error(`${field} must be an array of non-empty strings`)
  }
  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
```

**Get-document include validation pattern** (lines 286-310):
```typescript
function validateGetDocumentOptions(value: unknown): FlashQueryGetDocumentOptions | undefined {
  if (value === undefined) return undefined
  if (!isPlainObject(value)) throw new Error('options must be an object when provided')
  const include = value.include
  if (include === undefined) return {}
  if (!Array.isArray(include)) throw new Error('options.include must be an array')
  for (const part of include) {
    if (part !== 'body' && part !== 'frontmatter' && part !== 'connections') {
      throw new Error('options.include must contain only body, frontmatter, or connections')
    }
  }
```

**Safe response wrapper pattern** (lines 520-534):
```typescript
async function documentConnections(workspaceId: string, params: unknown): Promise<FlashQueryDocumentConnectionsResponse> {
  try {
    return await flashQueryClientManager.documentConnections(
      requireNonEmptyString(workspaceId, 'workspaceId'),
      validateDocumentConnectionsParams(params),
    )
  } catch (error) {
    return {
      source: { document_id: '', path: '' },
      overall: [],
      source_chunks: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
```

**Handler registration pattern** (lines 548-591):
```typescript
export function registerHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(FLASHQUERY_GET_DOCUMENT, async (_event, workspaceId: string, vaultPath: string, options?: unknown) => {
    return getDocument(workspaceId, vaultPath, options)
  })
  ipcMain.handle(FLASHQUERY_SEARCH, async (_event, workspaceId: string, params: unknown) => {
    return search(workspaceId, params)
  })
  ipcMain.handle(FLASHQUERY_DOCUMENT_CONNECTIONS, async (_event, workspaceId: string, params: unknown) => {
    return documentConnections(workspaceId, params)
  })
}
```

**Apply to Phase 27:** Validate `query_graph` params here before manager dispatch. Return safe per-call error payloads for graph queries instead of throwing into renderer flows. Keep renderer credentials out of the payload.

---

### `src/main/flashquery/clientManager.ts` (service, request-response)

**Analog:** `src/main/flashquery/clientManager.ts`

**MCP client and credential pattern** (lines 567-611):
```typescript
private async getOrCreateMcpClient(workspaceId: string): Promise<FlashQueryMcpToolClient | null> {
  const state = this.getOrCreateWorkspaceState(workspaceId)
  if (state.mcpClient) return state.mcpClient
  if (state.mcpClientPromise) return state.mcpClientPromise

  const connection = state.connection ?? this.getConfiguredConnection(workspaceId)
  if (!connection) return null

  const creation = (async (): Promise<FlashQueryMcpToolClient | null> => {
    state.connection = connection
    const attemptId = state.attemptId
    const token = await getWorkspaceToken(workspaceId)
    if (!this.isCurrentAttempt(workspaceId, state, attemptId) || state.connection !== connection) {
      return null
    }

    state.token = token
    const client = await this.createMcpClient(workspaceId, connection, token)
```

**Tool-call JSON parsing pattern** (lines 613-633):
```typescript
private async callJsonTool(
  client: FlashQueryMcpToolClient,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const result = await client.callTool({ name, arguments: args })
  const resultObject = result && typeof result === 'object' ? result as Record<string, unknown> : {}
  if (resultObject.isError === true) {
    throw new Error(this.extractTextContent(resultObject) || `FlashQuery ${name} failed`)
  }
  const text = this.extractTextContent(resultObject)
  if (!text) return {}
  try {
    const parsed = JSON.parse(text)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : {}
  } catch {
    throw new Error(`FlashQuery ${name} returned malformed JSON`)
  }
}
```

**Document connections request pattern** (lines 749-770):
```typescript
private normalizeDocumentConnectionsArgs(params: FlashQueryDocumentConnectionsParams): Record<string, unknown> {
  const identifier = typeof params.identifier === 'string' ? params.identifier.trim() : ''
  if (!identifier) throw new Error('Document identifier is required.')
  const connections = this.normalizeDocumentConnectionsOptions(params)
  return {
    identifiers: identifier,
    include: ['connections'],
    connections,
  }
}
```

**Normalization pattern** (lines 805-850):
```typescript
private normalizeDocumentConnectionsResponse(payload: Record<string, unknown>): FlashQueryDocumentConnectionsResponse {
  const connectionsPayload = this.isPlainObject(payload.connections) ? payload.connections : payload
  return {
    source: {
      document_id: this.firstString(payload.fq_id, payload.document_id, payload.id) ?? '',
      path: this.normalizePath(this.firstString(payload.path, payload.identifier)) ?? '',
      ...(typeof payload.title === 'string' ? { title: payload.title } : {}),
    },
    overall: this.arrayFrom(connectionsPayload.overall).flatMap((entry) => this.normalizeDocumentConnection(entry)),
    source_chunks: this.arrayFrom(connectionsPayload.source_chunks).flatMap((entry) => {
      if (!this.isPlainObject(entry)) return []
      const chunkId = this.firstString(entry.chunk_id, entry.id)
      if (!chunkId) return []
      return [{
        chunk_id: chunkId,
        ...(typeof entry.heading_path === 'string' ? { heading_path: entry.heading_path } : {}),
        ...(typeof entry.breadcrumb === 'string' ? { breadcrumb: entry.breadcrumb } : {}),
        connections: this.arrayFrom(entry.connections).flatMap((connection) => this.normalizeDocumentConnection(connection)),
      }]
    }),
  }
}
```

**Redaction pattern source:** `src/main/flashquery/clientManager.test.ts` lines 1551-1562 asserts token-bearing failures become `[redacted]`.

**Apply to Phase 27:** Add a public `queryGraph(workspaceId, params)` that calls `callJsonTool(client, 'query_graph', args)`. Extend `normalizeDocumentConnectionsArgs()` to include `graph_summary`, and extend normalization by omitting malformed optional fields rather than dropping valid rows.

---

### `src/preload/index.ts` (provider/bridge, request-response)

**Analog:** `src/preload/index.ts`

**Import channel pattern** (lines 194-207):
```typescript
  FLASHQUERY_CREATE_DOCUMENT,
  FLASHQUERY_DOCUMENT_CONNECTIONS,
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT_INDEX,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_MANAGE_DIRECTORY,
  FLASHQUERY_MOVE_DOCUMENT,
  FLASHQUERY_PROBE,
  FLASHQUERY_REMOVE_DOCUMENT,
  FLASHQUERY_RETRY,
  FLASHQUERY_SEARCH,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_STATUS,
  FLASHQUERY_WRITE_DOCUMENT,
```

**Bridge method pattern** (lines 1102-1144):
```typescript
flashqueryGetDocument(workspaceId: string, vaultPath: string, options?: unknown): Promise<unknown> {
  return ipcRenderer.invoke(FLASHQUERY_GET_DOCUMENT, workspaceId, vaultPath, options)
},

flashquerySearch(workspaceId: string, params: unknown): Promise<unknown> {
  return ipcRenderer.invoke(FLASHQUERY_SEARCH, workspaceId, params)
},

flashqueryDocumentConnections(workspaceId: string, params: unknown): Promise<unknown> {
  return ipcRenderer.invoke(FLASHQUERY_DOCUMENT_CONNECTIONS, workspaceId, params)
},
```

**Status subscription pattern** (lines 1154-1162):
```typescript
onFlashQueryStatus(callback: (payload: unknown) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
    callback(payload)
  }
  ipcRenderer.on(FLASHQUERY_STATUS, listener)
  return () => {
    ipcRenderer.removeListener(FLASHQUERY_STATUS, listener)
  }
},
```

**Apply to Phase 27:** Add `FLASHQUERY_QUERY_GRAPH` to imports and expose `flashqueryQueryGraph(workspaceId, params): Promise<unknown>` with the same `ipcRenderer.invoke` style.

---

### `src/shared/electron-api.d.ts` (model/contract, request-response)

**Analog:** `src/shared/electron-api.d.ts`

**Import type pattern** (line 5):
```typescript
import type { AgentCreateOptions, AppSettings, FlashQueryConnection, FlashQueryDocumentBody, FlashQueryDocumentConnectionsParams, FlashQueryDocumentConnectionsResponse, FlashQueryGetDocumentOptions, FlashQueryProbeResult, FlashQuerySearchParams, FlashQuerySearchResponse, FlashQueryStatusBroadcastPayload, FlashQueryVaultEntry, FlashQueryVaultIndexEntry, FlashQueryWritePayload, FlashQueryWriteResult, WorkspaceMutationResult } from './types'
```

**FlashQuery API declaration pattern** (lines 605-636):
```typescript
flashquerySetConnection(workspaceId: string, connection: FlashQueryConnection | null): Promise<WorkspaceMutationResult>

flashqueryProbe(workspaceId: string, connection: FlashQueryConnection): Promise<FlashQueryProbeResult>

flashqueryListVault(workspaceId: string, vaultPath?: string): Promise<FlashQueryVaultEntry[]>

flashqueryGetDocument(workspaceId: string, vaultPath: string, options?: FlashQueryGetDocumentOptions): Promise<FlashQueryDocumentBody>

flashquerySearch(workspaceId: string, params: FlashQuerySearchParams): Promise<FlashQuerySearchResponse>

flashqueryDocumentConnections(workspaceId: string, params: FlashQueryDocumentConnectionsParams): Promise<FlashQueryDocumentConnectionsResponse>

flashqueryListVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]>

flashqueryRetry(workspaceId: string): Promise<void>

onFlashQueryStatus(callback: (payload: FlashQueryStatusBroadcastPayload) => void): () => void
```

**Apply to Phase 27:** Add `FlashQueryQueryGraphParams`/response imports from `types.ts` and declare `flashqueryQueryGraph(workspaceId: string, params: FlashQueryQueryGraphParams): Promise<FlashQueryQueryGraphResponse>`.

---

### `src/renderer/stores/previewSelectionStore.ts` (store, event-driven)

**Analog:** `src/renderer/stores/previewSelectionStore.ts`

**Scoped selection pattern** (lines 3-17):
```typescript
export interface PreviewSelectionState {
  hoveredChunkId: string | null
  pinnedChunkId: string | null
  activeChunkId: string | null
  cautionChunkIds: string[]
  connectedChunkIds: string[]
  scopes: Record<string, PreviewSelectionScope>
  getScope: (scopeId?: string | null) => PreviewSelectionScope
  setHoveredChunkId: (chunkId: string | null, scopeId?: string | null) => void
  setPinnedChunkId: (chunkId: string | null, scopeId?: string | null) => void
  setCautionChunkIds: (chunkIds: string[], scopeId?: string | null) => void
  setConnectedChunkIds: (chunkIds: string[], scopeId?: string | null) => void
  selectSection: (chunkId: string, scopeId?: string | null) => void
  clearSelection: (scopeId?: string | null) => void
}
```

**Section selection pattern** (lines 124-136):
```typescript
selectSection: (chunkId, scopeId) => set((state) => {
  const key = scopeKey(scopeId)
  const next = {
    ...(key === DEFAULT_SCOPE_ID
      ? { cautionChunkIds: state.cautionChunkIds, connectedChunkIds: state.connectedChunkIds }
      : state.scopes[key] ?? emptyScope()),
    hoveredChunkId: null,
    pinnedChunkId: chunkId,
    activeChunkId: chunkId,
  }
  if (key === DEFAULT_SCOPE_ID) return next
  return { scopes: { ...state.scopes, [key]: next } }
}),
```

**Apply to Phase 27:** Do not introduce graph-only IDs here. Attention, section, and traceable whole-document connection rows should call `selectSection(previewChunkId, selectionScopeId)`.

---

### `src/renderer/stores/semanticConnectionsChromeStore.ts` (store, event-driven)

**Analog:** `src/renderer/stores/semanticConnectionsChromeStore.ts`

**Chrome entry pattern** (lines 3-14):
```typescript
export interface SemanticConnectionsChromeStateEntry {
  connectionCount: number
  configOpen: boolean
  configActive: boolean
  toggleConfig: () => void
}

interface SemanticConnectionsChromeState {
  panels: Record<string, SemanticConnectionsChromeStateEntry | undefined>
  setPanelChrome: (panelId: string, entry: SemanticConnectionsChromeStateEntry) => void
  clearPanelChrome: (panelId: string) => void
}
```

**Store update/cleanup pattern** (lines 16-28):
```typescript
export const useSemanticConnectionsChromeStore = create<SemanticConnectionsChromeState>((set) => ({
  panels: {},
  setPanelChrome: (panelId, entry) => set((state) => ({
    panels: {
      ...state.panels,
      [panelId]: entry,
    },
  })),
  clearPanelChrome: (panelId) => set((state) => {
    const { [panelId]: _removed, ...panels } = state.panels
    return { panels }
  }),
}))
```

**Apply to Phase 27:** Extend this entry only if needed for distinct filter active state. Preserve `clearPanelChrome` cleanup on panel unmount.

---

## Test Pattern Assignments

### `src/renderer/lib/semanticConnections.test.ts` (test, transform)

**Analog:** `src/renderer/lib/semanticConnections.test.ts`

**Fixture and trace-ID pattern** (lines 1-8, 70-104):
```typescript
import { describe, expect, it } from 'vitest'
import {
  arrangeForDisplay,
  getAllRels,
  scCautionFlags,
  scEdgeLabel,
  type SemanticConnection,
} from './semanticConnections'

describe('semantic connection utilities', () => {
  it('T-U-004 resolves directed and symmetric edge labels', () => {
    expect(scEdgeLabel('depends_on', 'out')).toBe('Depends on')
    expect(scEdgeLabel('depends_on', 'in')).toBe('Required by')
    expect(scEdgeLabel('contradicts')).toBe('Contradicts')
    expect(scEdgeLabel(undefined, undefined)).toBe('Similarity only')
  })
```

**Apply to Phase 27:** Add T-U-001, T-U-006, T-U-007, T-U-008, T-U-017, and T-U-018 here. Use explicit fixtures, no renderer mocks.

---

### `src/renderer/lib/semanticConnectionsProvider.test.ts` (test, request-response + transform)

**Analog:** `src/renderer/lib/semanticConnectionsProvider.test.ts`

**Provider fixture pattern** (lines 77-110):
```typescript
describe('semantic connections provider boundary', () => {
  it('T-U-011 maps FlashQuery heading path and duplicate occurrence metadata to preview chunk IDs', () => {
    const mapped = mapFlashQueryChunksToPreview({
      markdown,
      targets: flashqueryConnections.map((connection) => connection.target),
    })

    expect(mapped.chunkMap.scope?.flashqueryChunkId).toBe('11111111-1111-4111-8111-111111111111')
    expect(mapped.chunkMap.details?.flashqueryChunkId).toBe('22222222-2222-4222-8222-222222222222')
    expect(mapped.chunkMap['scope-1']?.flashqueryChunkId).toBe('33333333-3333-4333-8333-333333333333')
    expect(mapped.chunkMapByFlashQueryId['22222222-2222-4222-8222-222222222222']?.previewChunkId).toBe('details')
    expect(mapped.diagnostics).toEqual([])
  })
```

**Document connections injection pattern** (lines 286-395):
```typescript
it('loads whole-document connections as deduped source-chunk outbound links without a text search', async () => {
  const search = vi.fn()
  const connections = vi.fn().mockResolvedValue({
    source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
    overall: [
      {
        id: 'Docs/Beta.md#beta-chunk',
        score: 0.94,
        target: {
          chunk_id: 'beta-chunk',
          document_id: 'doc-beta',
          path: 'Docs/Beta.md',
          title: 'Beta',
          heading_path: 'Beta > Strong',
          content: 'Best duplicate target.',
        },
      },
    ],
    source_chunks: [
      {
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: [/* ... */],
      },
    ],
  } satisfies FlashQueryDocumentConnectionsResponse)
  const provider = createFlashQuerySemanticConnectionsProvider(search, connections)
```

**Apply to Phase 27:** Add `queryGraph` as a third injected function and test node metadata backfill with mocked per-chunk resolves/rejects. Keep embeddings-only tests as regression boundaries.

---

### `src/renderer/panels/SemanticConnectionsPanel.test.tsx` (test, event-driven + request-response)

**Analog:** `src/renderer/panels/SemanticConnectionsPanel.test.tsx`

**Testing Library setup pattern** (lines 1-25):
```typescript
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const openRoutingMock = vi.hoisted(() => ({
  openFileAsPanel: vi.fn(() => 'opened-panel'),
}))

vi.mock('../lib/fileRouting', () => ({
  openFileAsPanel: openRoutingMock.openFileAsPanel,
}))
```

**Render helper pattern** (lines 133-148):
```typescript
function renderPanel(result: SemanticConnectionsResult, options: { activeChunkId?: string } = {}) {
  const filePath = readyEditor()
  if (options.activeChunkId) {
    const activeChunkId = options.activeChunkId
    act(() => usePreviewSelectionStore.getState().selectSection(activeChunkId, 'editor-1'))
  }
  return render(
    <SemanticConnectionsPanel
      panelId="sc-1"
      workspaceId="workspace-1"
      sourceEditorPanelId="editor-1"
      sourceFilePath={filePath}
      provider={provider(result)}
    />,
  )
}
```

**Store side-effect assertion pattern** (lines 165-180):
```typescript
it('T-I-009 renders embeddings-only cards and hides nature sort/filter controls', async () => {
  renderPanel(embeddingsOnlyResult)

  expect(await screen.findByText('Alpha Notes')).toBeTruthy()
  expect(screen.getByText('Beta Plan')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Show whole document semantic connections' }).textContent).toBe('Whole Document')
  await waitFor(() => expect(useSemanticConnectionsChromeStore.getState().panels['sc-1']?.connectionCount).toBe(2))
  expect(screen.queryByText('Sort by nature')).toBeNull()
  expect(screen.queryByText('Nature filters')).toBeNull()
})
```

**Navigation assertion pattern** (lines 582-621):
```typescript
it('REQ-036 opens a same-document target by scrolling preview and pinning the target chunk', async () => {
  const scrollPreviewToHeading = vi.fn()
  readyEditor('/workspace/Plan.md')
  act(() => {
    updateActiveEditorPreview('workspace-1', 'editor-1', {
      markdownPreview: true,
      filePath: '/workspace/Plan.md',
      scrollPreviewToHeading,
      resolvePreviewChunkIdForHeading: vi.fn(() => 'scope'),
    })
  })
  // ...
  fireEvent.click(await screen.findByRole('button', { name: 'Open Plan Scope' }))

  expect(scrollPreviewToHeading).toHaveBeenCalledWith('Scope')
  expect(usePreviewSelectionStore.getState().getScope('editor-1').pinnedChunkId).toBe('scope')
})
```

**Apply to Phase 27:** Add T-C-001 through T-C-029 and T-C-063/T-C-064 as applicable. Prefer role/text queries, assert store state for navigation/chrome, and keep embeddings-only cases green.

---

### `src/main/ipc/flashquery.test.ts` (test, request-response)

**Analog:** `src/main/ipc/flashquery.test.ts`

**Mock manager pattern** (lines 85-112):
```typescript
vi.mock('../flashquery/clientManager', () => {
  class MockFlashQueryClientManager {
    connect = vi.fn().mockResolvedValue({ workspaceId: 'workspace-1', status: 'live' })
    dispose = vi.fn()
    documentConnections = vi.fn()
    listVault = vi.fn()
    getDocument = vi.fn()
    search = vi.fn()
    writeDocument = vi.fn()
    subscriptions: Array<{ workspaceId: string; type: string; handler: (payload: unknown) => void }> = []
    subscribe = vi.fn((workspaceId: string, type: string, handler: (payload: unknown) => void) => {
      this.subscriptions.push({ workspaceId, type, handler })
      return vi.fn()
    })

    constructor() {
      mocks.managerInstances.push(this)
    }
  }

  return { FlashQueryClientManager: MockFlashQueryClientManager }
})
```

**Registered handler lookup pattern** (lines 151-157):
```typescript
async function registeredHandler<T extends (...args: never[]) => unknown>(channelName: string): Promise<T> {
  const { registerHandlers } = await import('./flashquery')
  registerHandlers()
  const call = mocks.handle.mock.calls.find(([channel]) => channel === channelName)
  expect(call).toBeTruthy()
  return call?.[1] as T
}
```

**Exact channel registration pattern** (lines 159-196):
```typescript
it('T-U-002 registers renderer-to-main FlashQuery invoke channels exactly once', async () => {
  const { registerHandlers } = await import('./flashquery')

  registerHandlers()

  expect(mocks.handle).toHaveBeenCalledTimes(13)
  expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual([
    FLASHQUERY_SET_CONNECTION,
    FLASHQUERY_PROBE,
    FLASHQUERY_LIST_VAULT,
    FLASHQUERY_GET_DOCUMENT,
    FLASHQUERY_WRITE_DOCUMENT,
    FLASHQUERY_CREATE_DOCUMENT,
    FLASHQUERY_MANAGE_DIRECTORY,
    FLASHQUERY_MOVE_DOCUMENT,
    FLASHQUERY_REMOVE_DOCUMENT,
    FLASHQUERY_SEARCH,
    FLASHQUERY_DOCUMENT_CONNECTIONS,
    FLASHQUERY_LIST_VAULT_INDEX,
    FLASHQUERY_RETRY,
  ])
})
```

**Validation-before-dispatch pattern** (lines 563-590):
```typescript
it('T-U-003 passes valid get-document include options and rejects invalid values before manager dispatch', async () => {
  const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, options?: unknown) => Promise<unknown>>(FLASHQUERY_GET_DOCUMENT)
  mocks.managerInstances[0].getDocument.mockResolvedValueOnce({
    body: 'body',
    frontmatter: { title: 'Plan' },
  })

  await expect(handler({}, 'workspace-1', 'Plan.md', {
    include: ['body', 'frontmatter', 'connections'],
    connections: {
      limit: 200,
      limit_per_chunk: 5,
    },
  })).resolves.toEqual({
    body: 'body',
    frontmatter: { title: 'Plan' },
  })
  await expect(handler({}, 'workspace-1', 'Plan.md', { include: ['bad'] })).rejects.toThrow('options.include must contain only body, frontmatter, or connections')
```

**Apply to Phase 27:** Update handler count/channel list for `FLASHQUERY_QUERY_GRAPH`. Add T-I-005/T-I-006/T-I-009 by asserting valid graph params reach `manager.queryGraph` and invalid params return safe errors without dispatch.

---

### `src/main/flashquery/clientManager.test.ts` (test, request-response)

**Analog:** `src/main/flashquery/clientManager.test.ts`

**MCP call fixture pattern** (lines 1319-1399):
```typescript
it('loads document connections through get_document include connections', async () => {
  const callTool = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({
      identifier: 'Docs/Plan.md',
      path: 'Docs/Plan.md',
      title: 'Plan',
      fq_id: 'doc-1',
      connections: {
        overall: [{
          id: 'Docs/Other.md#chunk-2',
          score: 0.94,
          target: {
            chunk_id: 'chunk-2',
            document_id: 'doc-2',
            path: 'Docs/Other.md',
            title: 'Other',
            heading_path: 'Section',
            content: 'Other content',
          },
        }],
        source_chunks: [{
          chunk_id: 'source-1',
          heading_path: 'Intro',
          breadcrumb: 'Intro',
          connections: [/* ... */],
        }],
      },
    }) }],
  })
  workspaceMock.workspaces = [workspaceInfo()]
  const manager = new FlashQueryClientManager({ createMcpClient: async () => ({ callTool }) })
```

**Expected tool args pattern** (lines 1386-1398):
```typescript
expect(callTool).toHaveBeenCalledWith({
  name: 'get_document',
  arguments: {
    identifiers: 'Docs/Plan.md',
    include: ['connections'],
    connections: {
      limit: 40,
      limit_per_chunk: 5,
      embedding_names: ['primary'],
    },
  },
})
expect(callTool).not.toHaveBeenCalledWith(expect.objectContaining({ name: 'get_document_connections' }))
```

**Safe error pattern** (lines 1401-1434):
```typescript
it('preserves get_document connection expected errors as local connection errors', async () => {
  const callTool = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify({
      error: 'unsupported',
      message: 'Document connections are unavailable because no embeddings are configured in flashquery.yml',
      identifier: 'connections',
      details: { reason: 'embeddings_not_configured' },
    }) }],
    isError: false,
  })
  // ...
  await expect(manager.documentConnections('workspace-1', {
    identifier: 'Docs/Plan.md',
  })).resolves.toEqual({
    source: { document_id: '', path: '' },
    overall: [],
    source_chunks: [],
    error: 'Document connections are unavailable because no embeddings are configured in flashquery.yml',
  })
})
```

**Apply to Phase 27:** Add tests for `include: ['connections', 'graph_summary']`, target health-tier fields, optional malformed graph fields, `query_graph` tool args, and redaction. Keep `callTool` assertions exact.

---

### `src/preload/index.test.ts` (test, request-response)

**Analog:** `src/preload/index.test.ts`

**Electron preload mock pattern** (lines 3-32):
```typescript
const electronMocks = vi.hoisted(() => ({
  exposedApi: undefined as Record<string, unknown> | undefined,
  exposeInMainWorld: vi.fn((name: string, api: Record<string, unknown>) => {
    if (name === 'electronAPI') {
      electronMocks.exposedApi = api
    }
  }),
  invoke: vi.fn().mockResolvedValue(null),
  on: vi.fn(),
  removeListener: vi.fn(),
  send: vi.fn(),
  sendSync: vi.fn(() => false),
  getPathForFile: vi.fn(() => '/tmp/file.txt'),
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMocks.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
    send: electronMocks.send,
    sendSync: electronMocks.sendSync,
  },
  webUtils: {
    getPathForFile: electronMocks.getPathForFile,
  },
}))
```

**Module reload pattern** (lines 34-49):
```typescript
async function loadPreload(cateE2E?: string) {
  vi.resetModules()
  electronMocks.exposedApi = undefined
  electronMocks.exposeInMainWorld.mockClear()
  electronMocks.invoke.mockClear()
  if (cateE2E === undefined) {
    delete process.env.CATE_E2E
  } else {
    process.env.CATE_E2E = cateE2E
  }

  await import('./index')

  expect(electronMocks.exposedApi).toBeDefined()
  return electronMocks.exposedApi!
}
```

**Apply to Phase 27:** Add a focused test that loads preload, calls `api.flashqueryQueryGraph('workspace-1', params)`, and asserts `ipcRenderer.invoke` receives `'flashquery:queryGraph'`, workspace ID, and params.

---

## Shared Patterns

### Process Boundary and Security

**Sources:** `src/shared/ipc-channels.ts` lines 138-152; `src/preload/index.ts` lines 1102-1144; `src/main/ipc/flashquery.ts` lines 548-591.

**Apply to:** `query_graph`, graph summary include, document connections, provider calls.

Pattern:
```typescript
// shared
export const FLASHQUERY_DOCUMENT_CONNECTIONS = 'flashquery:documentConnections'

// preload
flashqueryDocumentConnections(workspaceId: string, params: unknown): Promise<unknown> {
  return ipcRenderer.invoke(FLASHQUERY_DOCUMENT_CONNECTIONS, workspaceId, params)
}

// main
ipcMain.handle(FLASHQUERY_DOCUMENT_CONNECTIONS, async (_event, workspaceId: string, params: unknown) => {
  return documentConnections(workspaceId, params)
})
```

Renderer code must call `window.electronAPI`; it must not import Electron, MCP, Node APIs, or receive FlashQuery credentials.

### Main-Process Validation and Safe Fallbacks

**Source:** `src/main/ipc/flashquery.ts` lines 254-284, 509-534.

**Apply to:** every new graph request shape.

Pattern:
```typescript
function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

async function documentConnections(workspaceId: string, params: unknown): Promise<FlashQueryDocumentConnectionsResponse> {
  try {
    return await flashQueryClientManager.documentConnections(
      requireNonEmptyString(workspaceId, 'workspaceId'),
      validateDocumentConnectionsParams(params),
    )
  } catch (error) {
    return {
      source: { document_id: '', path: '' },
      overall: [],
      source_chunks: [],
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
```

### FlashQuery MCP Tool Calls

**Source:** `src/main/flashquery/clientManager.ts` lines 613-633.

**Apply to:** `get_document` graph summary and `query_graph`.

Pattern:
```typescript
const result = await client.callTool({ name, arguments: args })
const resultObject = result && typeof result === 'object' ? result as Record<string, unknown> : {}
if (resultObject.isError === true) {
  throw new Error(this.extractTextContent(resultObject) || `FlashQuery ${name} failed`)
}
const text = this.extractTextContent(resultObject)
if (!text) return {}
try {
  const parsed = JSON.parse(text)
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : {}
} catch {
  throw new Error(`FlashQuery ${name} returned malformed JSON`)
}
```

### Preview Chunk Mapping

**Source:** `src/renderer/lib/semanticConnectionsProvider.ts` lines 120-218.

**Apply to:** source chunks, attention rows, section rows, connection-source navigation.

Pattern:
```typescript
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
```

### Panel Loading, Stale Cache, and Recovery

**Source:** `src/renderer/panels/SemanticConnectionsPanel.tsx` lines 406-454, 648-674, 694-698.

**Apply to:** graph result loads and progressive node metadata.

Pattern:
```typescript
const requestId = requestRef.current + 1
requestRef.current = requestId
setLoading(true)
setLoadIssue(null)
provider.loadDocumentConnections(input).then((nextResult) => {
  if (requestRef.current !== requestId) return
  if (!isSemanticConnectionsResult(nextResult)) {
    setResult(null)
    setLoadIssue('malformed')
    return
  }
  setResult(nextResult)
}).catch((error) => {
  if (requestRef.current !== requestId) return
  setResult(null)
  setLoadIssue(issueFromError(error))
}).finally(() => {
  if (requestRef.current === requestId) setLoading(false)
})
```

### Store Side Effects

**Sources:** `src/renderer/stores/previewSelectionStore.ts` lines 124-136; `src/renderer/panels/SemanticConnectionsPanel.tsx` lines 490-509.

**Apply to:** graph row navigation, connected/caution markers, chrome counts.

Pattern:
```typescript
usePreviewSelectionStore.getState().setConnectedChunkIds(connectedChunkIds, selectionScopeId)
usePreviewSelectionStore.getState().selectSection(resolvedChunkId, selectionScopeId)

useSemanticConnectionsChromeStore.getState().setPanelChrome(panelId, {
  connectionCount: scopedConnections.length,
  configOpen,
  configActive,
  toggleConfig,
})
```

## No Analog Found

No Phase 27 file lacks a close analog. The only new behavior with no existing exact implementation is `query_graph`, but it should copy the established FlashQuery IPC/preload/client-manager pattern rather than introduce a new architecture.

## Metadata

**Analog search scope:** `src/shared`, `src/main/flashquery`, `src/main/ipc`, `src/preload`, `src/renderer/lib`, `src/renderer/panels`, `src/renderer/stores`, colocated tests.
**Files scanned:** 17 primary files plus phase/product docs.
**Pattern extraction date:** 2026-06-30.
