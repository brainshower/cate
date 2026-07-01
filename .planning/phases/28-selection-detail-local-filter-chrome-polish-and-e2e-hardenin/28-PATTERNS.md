# Phase 28: Selection Detail, Local Filter, Chrome Polish, and E2E Hardening - Pattern Map

**Mapped:** 2026-07-01
**Files analyzed:** 10
**Analogs found:** 10 / 10

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/renderer/lib/semanticConnections.ts` | utility/model | transform | `src/renderer/lib/semanticConnections.ts` | exact |
| `src/renderer/lib/semanticConnectionsProvider.ts` | service/provider | request-response + transform | `src/renderer/lib/semanticConnectionsProvider.ts` | exact |
| `src/renderer/panels/SemanticConnectionsPanel.tsx` | component | event-driven + request-response | `src/renderer/panels/SemanticConnectionsPanel.tsx` | exact |
| `src/renderer/stores/semanticConnectionsChromeStore.ts` | store | event-driven | `src/renderer/stores/semanticConnectionsChromeStore.ts` | exact |
| `src/renderer/lib/e2eHarness.ts` | test harness/provider | event-driven + transform | `src/renderer/lib/e2eHarness.ts` | role-match |
| `e2e/fixtures/flashquery-server.ts` | test fixture/service | request-response | `e2e/fixtures/flashquery-server.ts` | role-match |
| `e2e/semantic-connections-graph.spec.ts` | test | event-driven + request-response | `e2e/semantic-connections-inspector.spec.ts` | role-match |
| `src/renderer/lib/semanticConnections.test.ts` | test | transform | `src/renderer/lib/semanticConnections.test.ts` | exact |
| `src/renderer/lib/semanticConnectionsProvider.test.ts` | test | request-response + transform | `src/renderer/lib/semanticConnectionsProvider.test.ts` | exact |
| `src/renderer/panels/SemanticConnectionsPanel.test.tsx` | test | event-driven + request-response | `src/renderer/panels/SemanticConnectionsPanel.test.tsx` | exact |

## Pattern Assignments

### `src/renderer/lib/semanticConnections.ts` (utility/model, transform)

**Analog:** `src/renderer/lib/semanticConnections.ts`

**Imports pattern:** none. This file is intentionally pure and dependency-free.

**Graph type extension pattern** (lines 39-52):
```typescript
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
```

**Node metadata pattern** (lines 102-119):
```typescript
export interface SemanticConnectionNodeMeta {
  chunkSummary?: string
  keyClaims?: string[]
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
```

**Relation label and grouping pattern** (lines 204-209, 251-273):
```typescript
export function scEdgeLabel(rel?: SemanticConnectionRelation, dir?: SemanticConnectionDirection): string {
  if (!rel) return 'Similarity only'
  const edge = isKnownRelation(rel) ? SC_EDGE[rel] : undefined
  if (!edge) return titleCase(rel.replace(/_/g, ' '))
  if (edge.kind === 'symmetric') return titleCase(edge.sym ?? rel.replace(/_/g, ' '))
  return titleCase((dir === 'in' ? edge.in : edge.out) ?? edge.out ?? rel.replace(/_/g, ' '))
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
```

**Apply to Phase 28:** Add pure helpers here for active-edge filtering, score color thresholds, claim grouping, known metadata prose, and local filter matching. Keep helpers exported and deterministic so `semanticConnections.test.ts` can cover T-U-019..022 and T-U-027 without React or IPC.

---

### `src/renderer/lib/semanticConnectionsProvider.ts` (service/provider, request-response + transform)

**Analog:** `src/renderer/lib/semanticConnectionsProvider.ts`

**Imports/injection pattern** (lines 7-36, 101-114):
```typescript
import type {
  FlashQueryDocumentConnection,
  FlashQueryDocumentConnectionsParams,
  FlashQueryDocumentConnectionsResponse,
  FlashQueryQueryGraphParams,
  FlashQueryQueryGraphResponse,
} from '../../shared/types'
import type {
  SemanticConnection,
  SemanticConnectionNodeMeta,
  SemanticConnectionsResult,
} from './semanticConnections'

type FlashQueryQueryGraphFn = (
  workspaceId: string,
  params: FlashQueryQueryGraphParams,
) => Promise<FlashQueryQueryGraphResponse>
```

**Connection translation preserves edge metadata** (lines 451-466):
```typescript
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
```

**Progressive query_graph backfill pattern** (lines 527-570):
```typescript
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
```

**Provider bridge pattern** (lines 720-744):
```typescript
export function createFlashQuerySemanticConnectionsProvider(
  search: FlashQuerySearchFn = (workspaceId, params) => window.electronAPI.flashquerySearch(workspaceId, params),
  documentConnections?: FlashQueryDocumentConnectionsFn,
  queryGraph?: FlashQueryQueryGraphFn,
): SemanticConnectionsProvider {
  return createCachedSemanticConnectionsProvider({
    async loadDocumentConnections(input) {
      const loadDocumentConnections = documentConnections
        ?? (typeof window === 'undefined' ? undefined : loadCachedFlashQueryDocumentConnections)
      if (loadDocumentConnections) {
        const response = await loadDocumentConnections(input.workspaceId, {
          identifier: sourcePath,
          limit: DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
          limit_per_chunk: DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
        })
        const result = buildConnectionsResultFromDocumentConnections(input.markdown, response)
        const loadQueryGraph = queryGraph
          ?? (typeof window === 'undefined' ? undefined : window.electronAPI.flashqueryQueryGraph)
        if (!loadQueryGraph || result.mode === 'embeddings-only') return result
        return backfillNodeMeta(input.workspaceId, result, loadQueryGraph)
      }
    },
  })
}
```

**Apply to Phase 28:** Add edge overlay beside `backfillNodeMeta()`: call the injected `queryGraph`, tolerate per-call failures, merge by `connection.id`, and append diagnostics without blanking the base `SemanticConnectionsResult`. Do not introduce renderer credentials or direct MCP calls.

---

### `src/renderer/panels/SemanticConnectionsPanel.tsx` (component, event-driven + request-response)

**Analog:** `src/renderer/panels/SemanticConnectionsPanel.tsx`

**Imports pattern** (lines 1-17):
```typescript
import { ArrowSquareOut, SlidersHorizontal } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  arrangeForDisplay,
  getAllRels,
  groupWholeDocumentConnections,
  scEdgeLabel,
  type SemanticConnection,
  type SemanticConnectionNodeMeta,
  type SemanticConnectionsProvider,
  type SemanticConnectionsResult,
} from '../lib/semanticConnections'
```

**Active-edge and selection helpers** (lines 167-182):
```typescript
function isActiveConnection(connection: SemanticConnection): boolean {
  return connection.status !== 'stale' && connection.status !== 'deleted'
}

function sectionTitle(entry: SemanticConnectionsTargetMapEntry | undefined, chunkId: string): string {
  return entry?.headingText || entry?.headingPath?.[entry.headingPath.length - 1] || chunkId
}

function selectPreviewSection(chunkId: string, scopeId: string | null): void {
  usePreviewSelectionStore.getState().selectSection(chunkId, scopeId)
}
```

**Whole-document graph render branch pattern** (lines 364-397, 491-521):
```typescript
function WholeDocumentGraphView({
  result,
  connections,
  loading,
  selectionScopeId,
  onSelectConnectionSource,
}: {
  result: SemanticConnectionsResult
  connections: readonly SemanticConnection[]
  loading: boolean
  selectionScopeId: string | null
  onSelectConnectionSource: (connection: SemanticConnection) => void
}) {
  const sections = result.chunkOrder
    .map((chunkId) => ({
      chunkId,
      entry: result.chunkMap[chunkId],
      nodeMeta: result.nodeMeta?.[chunkId],
      connections: (result.byChunkId[chunkId] ?? []).filter(isActiveConnection),
    }))
    .filter((section) => section.entry?.previewChunkId)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
      <div className="flex shrink-0 items-center justify-between text-xs text-muted">
        <span>Whole-document graph</span>
        {loading && <span>Refreshing...</span>}
      </div>
      <SectionChrome title="Sections">
        <div data-testid="semantic-graph-sections" className="space-y-1.5">
          {/* rows select preview sections */}
        </div>
      </SectionChrome>
      <GroupedGraphConnections connections={connections} onSelectConnectionSource={onSelectConnectionSource} />
    </div>
  )
}
```

**Target opening pattern** (lines 657-696):
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

  const registered = getEditorSnapshotForPath(workspaceId, editorPath)
  if (registered.panelId) {
    if (!openRegisteredPreview(registered, heading, chunkId) && !revealHeadingInSourceEditor(registered, heading)) {
      focusEditorForOpen?.(workspaceId, registered.panelId)
      registered.editor?.focus()
    }
    return
  }

  const targetPanelId = openFileAsPanel(workspaceId, editorPath, undefined, { target: 'dock', zone: 'center' })
  setEditorPreviewForOpen?.(workspaceId, targetPanelId, true)
  setPendingReveal(targetPanelId, { headingText: heading })
}, [createEditorForOpen, documentPath, focusEditorForOpen, openRegisteredPreview, selectionScopeId, setEditorPreviewForOpen, snapshot, sourceEditorPanelId, workspaceId])
```

**Load and no-reload filter boundary pattern** (lines 698-746, 748-779):
```typescript
useEffect(() => {
  if (precondition || !snapshot.panelId || !documentPath) return
  const input = {
    workspaceId,
    editorPanelId: snapshot.panelId,
    documentPath,
    markdown,
    contentHash: markdownHash,
    scopeChunkId: activeChunkId,
  }
  if (loadKey > 0) provider.invalidateDocumentConnections?.(input)
  provider.loadDocumentConnections(input).then((nextResult) => {
    if (requestRef.current !== requestId) return
    setResult(nextResult)
  })
}, [activeChunkId, documentPath, loadKey, markdown, markdownHash, precondition, provider, snapshot.panelId, workspaceId])

const scopedConnections = useMemo(() => resultConnections(result ?? emptyResult, activeChunkId), [activeChunkId, result])
const activeScopedConnections = useMemo(() => scopedConnections.filter(isActiveConnection), [scopedConnections])
const filteredConnections = useMemo(() => {
  if (!hasTypedControls || activeRelFilters.size === 0) return activeScopedConnections
  return activeScopedConnections.filter((connection) => connection.rel && activeRelFilters.has(connection.rel))
}, [activeRelFilters, activeScopedConnections, hasTypedControls])
```

**Chrome publication and cleanup pattern** (lines 800-812):
```typescript
const toggleConfig = useCallback(() => setConfigOpen((value) => !value), [])

useEffect(() => {
  useSemanticConnectionsChromeStore.getState().setPanelChrome(panelId, {
    connectionCount: activeScopedConnections.length,
    configOpen,
    configActive,
    toggleConfig,
  })
  return () => {
    useSemanticConnectionsChromeStore.getState().clearPanelChrome(panelId)
  }
}, [activeScopedConnections.length, configActive, configOpen, panelId, toggleConfig])
```

**Apply to Phase 28:** Add a `graphSelectionMode` branch before the fallback card branch. Reuse `handleOpenConnection()` for selection edge rows. Add filter input state outside the provider load effect dependencies so filter changes never reload data. Preserve pre-filter `connectionCount` in chrome.

---

### `src/renderer/stores/semanticConnectionsChromeStore.ts` (store, event-driven)

**Analog:** `src/renderer/stores/semanticConnectionsChromeStore.ts`

**Zustand entry pattern** (lines 3-28):
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

**Test reset pattern** (lines 30-32):
```typescript
export function clearSemanticConnectionsChromeForTests(): void {
  useSemanticConnectionsChromeStore.setState({ panels: {} })
}
```

**Apply to Phase 28:** Extend the entry with independent filter fields such as `filterOpen`, `filterActive`, `toggleFilter`, and clear/close behavior. Keep `configActive` and `filterActive` separate. Continue clearing by panel ID on unmount.

---

### `src/renderer/lib/e2eHarness.ts` (test harness/provider, event-driven + transform)

**Analog:** `src/renderer/lib/e2eHarness.ts`

**Harness API pattern** (lines 24-63):
```typescript
type SemanticConnectionsScenario = 'default' | 'empty' | 'stale'

declare global {
  interface Window {
    __cateE2E?: {
      createSemanticConnections(point: Point, placement?: PanelPlacement): string
      setSemanticConnectionsScenario(scenario: SemanticConnectionsScenario): void
      semanticConnectionsProvider(): SemanticConnectionsProvider
      setSemanticConnectionsSource(panelId: string, sourceEditorPanelId: string): void
    }
  }
}
```

**Deterministic provider fixture pattern** (lines 100-199):
```typescript
let semanticConnectionsScenario: SemanticConnectionsScenario = 'default'

const semanticConnectionsFixtures = (): Record<SemanticConnectionsScenario, SemanticConnectionsResult> => {
  const defaultResult: SemanticConnectionsResult = {
    mode: 'embeddings-only',
    overall: [
      {
        id: 'design-companion',
        score: 0.91,
        target: {
          title: 'Design Companion',
          path: 'Docs/Design.md',
          heading: 'Design Brief',
          chunkId: 'design-brief',
          snippet: 'Design notes align the Inspector body with the compact brief.',
          body: 'Expanded design body stays reachable after preview pinning.',
        },
      },
    ],
    byChunkId: {
      'design-brief': [
        {
          id: 'design-deep-dive',
          score: 0.94,
          target: {
            title: 'Design Deep Dive',
            path: 'Docs/Design.md',
            heading: 'Design Brief',
            chunkId: 'design-brief',
            snippet: 'Design deep dive follows the selected preview chunk.',
            body: 'Expanded design body stays reachable after preview pinning.',
          },
        },
      ],
    },
    chunkOrder: ['overview', 'design-brief', 'runtime-notes'],
    chunkMap: {
      'design-brief': {
        previewChunkId: 'design-brief',
        documentPath: 'Docs/Design.md',
        documentTitle: 'Design Companion',
        headingText: 'Design Brief',
      },
    },
    diagnostics: [],
  }
  return {
    default: defaultResult,
    empty: emptyResult,
    stale: { ...defaultResult, stale: true },
  }
}

const semanticConnectionsProvider = (): SemanticConnectionsProvider => ({
  async loadDocumentConnections() {
    return semanticConnectionsFixtures()[semanticConnectionsScenario]
  },
})
```

**Apply to Phase 28:** Add graph scenarios here if the E2E suite uses renderer injection. Include typed `mode`, `graphSummary`, `nodeMeta`, claim-linked active/stale/deleted edges, and filterable text fields. Keep scenarios deterministic and credential-free.

---

### `e2e/fixtures/flashquery-server.ts` (test fixture/service, request-response)

**Analog:** `e2e/fixtures/flashquery-server.ts`

**Stub server API pattern** (lines 32-53):
```typescript
export interface FlashQueryStubServer {
  baseUrl: string
  close: () => Promise<void>
  counts: () => FlashQueryStubCounts
  resetCounts: () => void
  setAvailable: (available: boolean) => void
  resetDocuments: () => void
  seedEmptyVault: () => void
  seedDocuments: (documents: Record<string, string | FlashQueryStubDocument>) => void
  lastGetArgs: () => Record<string, unknown> | null
  lastSearchArgs: () => Record<string, unknown> | null
  sawMcpMethod: (method: string) => boolean
}
```

**MCP tool registration pattern** (lines 211-234, 273-304):
```typescript
server.registerTool(
  'get_document',
  {
    description: 'Read deterministic in-memory vault document body',
    inputSchema: z.object({
      identifiers: z.string(),
      include: z.array(z.string()).optional(),
    }),
  },
  async ({ identifiers, include }) => {
    const vaultPath = normalizeVaultPath(identifiers)
    recordGetArgs({ identifiers: vaultPath, include })
    const document = documents.get(vaultPath)
    if (!document || missingDocuments.has(vaultPath)) {
      return mcpText({ error: 'not_found', message: `No document found for ${identifiers}` })
    }
    return mcpText({
      body: document.body,
      version_token: 'stub-version-1',
      modified: new Date(0).toISOString(),
    })
  },
)

server.registerTool(
  'search',
  {
    description: 'Search deterministic in-memory vault documents',
    inputSchema: z.object({
      query: z.string().optional(),
      mode: z.string().optional(),
      entity_types: z.array(z.string()).optional(),
      limit: z.number().optional(),
    }),
  },
  async ({ query = '', mode, entity_types, limit = 50 }) => {
    recordSearchArgs({ query, mode, entity_types, limit })
    return mcpText({ query, entity_types, mode, total: results.length, results })
  },
)
```

**Availability/auth pattern** (lines 328-383):
```typescript
const server: Server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1')

  if (!available) {
    textResponse(res, 503, 'FlashQuery stub unavailable')
    return
  }

  if (req.method === 'POST' && url.pathname === '/mcp') {
    mcpPostCount += 1
    recordJsonRpcMethods(req, mcpMethods)
    if (req.headers.authorization !== expectedAuthorization) {
      jsonResponse(res, 401, {
        error: req.headers.authorization ? 'invalid_authorization' : 'missing_authorization',
      })
      return
    }
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    const mcpServer = makeMcpServer(...)
    await mcpServer.connect(transport)
    await transport.handleRequest(req, res)
    return
  }
})
```

**Apply to Phase 28:** If using the live IPC path instead of `e2eHarness` provider injection, extend this fixture with graph-aware `get_document include:['connections','graph_summary']` and `query_graph` tool responses. Add count/last-args evidence so T-E-003 can prove local filtering does not call backend tools.

---

### `e2e/semantic-connections-graph.spec.ts` (test, event-driven + request-response)

**Analog:** `e2e/semantic-connections-inspector.spec.ts`

**Launch/workspace/open preview pattern** (lines 12-33, 35-43):
```typescript
async function openPreview(
  page: Page,
  workspaceRoot: string,
  fileName = 'semantic.md',
  placement?: PreviewPlacement,
): Promise<{ filePath: string; editorPanelId: string }> {
  const filePath = path.join(workspaceRoot, fileName)
  await writeFile(filePath, markdown, 'utf8')
  const workspaceId = await page.evaluate(async (rootPath) => {
    return window.__cateE2E!.ensureWorkspaceRoot(rootPath)
  }, workspaceRoot)
  const editorPanelId = await page.evaluate(({ id, targetPath, targetPlacement }) => {
    return window.__cateE2E!.openFileEditor(id, targetPath, targetPlacement)
  }, { id: workspaceId, targetPath: filePath, targetPlacement: placement })
  await expect(page.getByText('Opening context.')).toBeVisible()
  await page.getByTitle('Preview markdown').click()
  await expect(page.getByTestId('markdown-preview-body')).toBeVisible()
  return { filePath, editorPanelId }
}

async function launchWithWorkspace(): Promise<{ app: ElectronApplication; page: Page; workspaceRoot: string }> {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-sc-inspector-'))
  const launched = await launchApp()
  return { app: launched.electronApp, page: launched.mainWindow, workspaceRoot }
}
```

**Create graph panel pattern** (lines 176-199):
```typescript
test('T-E-001 T-E-003 opens Semantic Connections in main right dock with embeddings-only cards and no typed controls', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchWithWorkspace()
    app = launched.app
    const { page, workspaceRoot } = launched
    await openPreview(page, workspaceRoot)
    await page.evaluate(() => window.__cateE2E!.setSemanticConnectionsScenario('default'))

    const panelId = await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
      { x: 360, y: 180 },
      { target: 'dock', zone: 'right' },
    ))

    const panel = page.getByTestId('semantic-connections-panel')
    await expect(panel).toBeVisible()
    await expect(panel).toContainText('Whole document')
    await expect.poll(() => page.evaluate((id) => window.__cateE2E!.panelLocation(id), panelId)).toBe('dock')
  } finally {
    if (app) await closeApp(app)
  }
})
```

**Preview selection pattern** (from `e2e/semantic-connections-preview-selection.spec.ts` lines 29-44):
```typescript
await page.evaluate(() => window.__cateE2E!.createSemanticConnections(
  { x: 360, y: 180 },
  { target: 'dock', zone: 'bottom' },
))

const secondChunk = page.locator('[data-chunk-id="second-section"]').first()
await expect(secondChunk).toBeVisible()
await secondChunk.hover()

await expect(page.getByTestId('semantic-connections-panel')).toContainText('One section selected')
await expect(page.getByTestId('semantic-connections-panel')).not.toContainText('second-section')
```

**Apply to Phase 28:** Create the new graph E2E spec around T-E-001..005. Prefer `window.__cateE2E` graph fixtures for deterministic UI flow unless the test must verify main/preload IPC; use `startFlashQueryStubServer()` only where backend unavailability/no-vault or call-count evidence is required.

---

### `src/renderer/lib/semanticConnections.test.ts` (test, transform)

**Analog:** `src/renderer/lib/semanticConnections.test.ts`

**Pure helper test pattern** (lines 1-12, 90-120):
```typescript
import { describe, expect, it } from 'vitest'
import {
  SC_EDGE,
  arrangeForDisplay,
  getAllRels,
  groupWholeDocumentConnections,
  scEdgeLabel,
  type SemanticConnection,
} from './semanticConnections'

describe('semantic connection utilities', () => {
  it('T-U-001 proves complete relation union and metadata map covers all graph relations', () => {
    expect(Object.keys(SC_EDGE).sort()).toEqual([...graphRelations].sort())
  })

  it('T-U-008 renders unknown relation strings safely and exposes a diagnostic path', () => {
    expect(scEdgeLabel('requires_manual_review' as SemanticConnectionRel)).toBe('Requires manual review')
    expect(scUnknownRelationDiagnostic('requires_manual_review')).toBe('Unknown semantic relation: requires_manual_review')
  })
})
```

**Sorting/grouping assertions** (lines 149-200):
```typescript
it('T-U-017 groups whole-document relations in graph priority order with similarity last', () => {
  const grouped = groupWholeDocumentConnections([
    { ...mixedTyped[0], id: 'untyped' },
    { ...mixedTyped[1], id: 'depends' },
    { ...mixedTyped[3], id: 'contradicts' },
  ])

  expect(grouped.map((group) => group.key)).toEqual([
    'contradicts',
    'depends_on',
    'similarity',
    'semantically_similar_to',
  ])
})
```

**Apply to Phase 28:** Add direct fixture objects for claim grouping, local filter matching, score color thresholds, and metadata prose. Keep test names prefixed with product IDs such as T-U-019.

---

### `src/renderer/lib/semanticConnectionsProvider.test.ts` (test, request-response + transform)

**Analog:** `src/renderer/lib/semanticConnectionsProvider.test.ts`

**Provider boundary fixture pattern** (lines 1-9, 29-75):
```typescript
import { describe, expect, it, vi } from 'vitest'
import {
  buildSemanticConnectionsResult,
  createFlashQuerySemanticConnectionsProvider,
  mapFlashQueryChunksToPreview,
  type FlashQuerySemanticConnection,
} from './semanticConnectionsProvider'
import type { FlashQueryDocumentConnectionsResponse } from '../../shared/types'

const flashqueryConnections: FlashQuerySemanticConnection[] = [
  {
    id: 'conn-1',
    score: 0.91,
    target: {
      flashqueryChunkId: '11111111-1111-4111-8111-111111111111',
      documentId: 'doc-1',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingPath: ['Plan', 'Scope'],
      headingText: 'Scope',
      snippet: 'First scope neighbor',
      sourceStartLine: 5,
      sourceEndLine: 7,
    },
  },
]
```

**Graph metadata preservation test pattern** (lines 148-217):
```typescript
it('T-U-002 accepts graph-aware result fields while embeddings-only fixtures stay valid', () => {
  const result = buildSemanticConnectionsResult({
    markdown,
    mode: 'typed',
    connections: [{
      id: 'graph-1',
      rel: 'supports',
      dir: 'out',
      confidence: 'high',
      confidenceScore: 0.93,
      reasoning: 'Scope supports the graph contract.',
      sourceClaimsReferenced: [0],
      targetClaimsReferenced: [1],
      status: 'active',
      qualifiers: ['normative'],
      metadata: { arbitraryNestedValue: { remains: ['opaque'] } },
      target: { flashqueryChunkId: '111...', documentPath: '/workspace/Plan.md', documentTitle: 'Plan', snippet: 'Graph target' },
    }],
  })

  expect(result.nodeMeta?.scope?.keyClaims).toEqual(['Claim one'])
  expect(result.overall[0]).toMatchObject({
    rel: 'supports',
    confidenceScore: 0.93,
  })
})
```

**Apply to Phase 28:** Add T-U-024 tests by injecting `queryGraph = vi.fn()`, returning edge payloads, and asserting merge-by-id plus partial diagnostics. Also assert no edge overlay call happens for embeddings-only mode.

---

### `src/renderer/panels/SemanticConnectionsPanel.test.tsx` (test, event-driven + request-response)

**Analog:** `src/renderer/panels/SemanticConnectionsPanel.test.tsx`

**Test setup/mocking pattern** (lines 1-25, 57-69):
```typescript
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const openRoutingMock = vi.hoisted(() => ({
  openFileAsPanel: vi.fn(() => 'opened-panel'),
}))

vi.mock('../lib/fileRouting', () => ({
  openFileAsPanel: openRoutingMock.openFileAsPanel,
}))

function readyEditor(filePath = '/workspace/Plan.md') {
  act(() => {
    registerActiveEditor('workspace-1', 'editor-1', editor(model('# Plan\n\n## Scope\nBody')))
    updateActiveEditorPreview('workspace-1', 'editor-1', { markdownPreview: true, filePath })
  })
  return filePath
}

function provider(result: SemanticConnectionsResult): SemanticConnectionsProvider {
  return {
    loadDocumentConnections: vi.fn().mockResolvedValue(result),
  }
}
```

**Graph fixture pattern** (lines 133-233):
```typescript
const graphResult: SemanticConnectionsResult = {
  mode: 'typed',
  overall: [
    {
      id: 'contradiction-scope',
      rel: 'contradicts',
      confidenceScore: 0.91,
      status: 'active',
      target: {
        title: 'Risk Notes',
        path: 'Docs/Risk.md',
        heading: 'Contrary evidence',
        chunkId: 'risk-evidence',
        snippet: 'Contrary evidence challenges the rollout claim.',
      },
    },
  ],
  byChunkId: {
    scope: [{
      id: 'scope-contradiction',
      rel: 'contradicts',
      confidenceScore: 0.9,
      status: 'active',
      target: { title: 'Risk Notes', path: 'Docs/Risk.md', heading: 'Contrary evidence', chunkId: 'risk-evidence', snippet: 'Contrary evidence challenges the rollout claim.' },
    }],
  },
  chunkOrder: ['scope', 'details', 'appendix'],
  chunkMap: {
    scope: {
      previewChunkId: 'scope',
      flashqueryChunkId: 'fq-scope',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingText: 'Scope',
      headingPath: ['Plan', 'Scope'],
    },
  },
  nodeMeta: {
    scope: {
      chunkSummary: 'Scope carries the riskiest rollout assumptions.',
      certaintyLevel: 'medium',
      questionStatus: 'none',
    },
  },
  diagnostics: [],
}
```

**Apply to Phase 28:** Extend this graph fixture with `keyClaims`, external refs, temporal markers, qualifier metadata, stale/deleted edges, and same/cross-document targets. Tests should render the panel, drive `usePreviewSelectionStore.getState().selectSection(...)`, assert the new selection branch, drive filter input, and assert provider mock call count stays unchanged.

## Shared Patterns

### Preview Selection

**Source:** `src/renderer/stores/previewSelectionStore.ts`
**Apply to:** `SemanticConnectionsPanel.tsx`, E2E selection tests

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
})
```

### Error and Empty States

**Source:** `src/renderer/panels/SemanticConnectionsPanel.tsx`
**Apply to:** Selection view and E2E unavailable/no-vault cases

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

### Responsive Row Styling

**Source:** `src/renderer/panels/SemanticConnectionsPanel.tsx`
**Apply to:** selection header, claim blocks, edge rows, filter no-results

```typescript
className="flex w-full min-w-0 items-center gap-2 rounded border border-subtle bg-surface-2 px-2 py-1.5 text-left hover:bg-hover"
...
<span className="min-w-0 flex-1 truncate text-sm font-medium text-primary">{title}</span>
<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
  {plainTextFromMarkdown(connection.target.snippet)}
</p>
```

### Verification Commands

**Source:** `28-VALIDATION.md`
**Apply to:** all plans

```bash
npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx
npm run typecheck
npm run lint
npm run test:e2e -- e2e/semantic-connections-graph.spec.ts
```

## No Analog Found

All Phase 28 files have close in-repo analogs. The only new path is likely `e2e/semantic-connections-graph.spec.ts`, which should copy structure from `e2e/semantic-connections-inspector.spec.ts` and `e2e/semantic-connections-preview-selection.spec.ts`.

## Metadata

**Analog search scope:** `src/renderer/lib`, `src/renderer/panels`, `src/renderer/stores`, `src/renderer/lib/e2eHarness.ts`, `e2e/fixtures`, `e2e/semantic-connections-*.spec.ts`
**Files scanned:** 18
**Pattern extraction date:** 2026-07-01
