# Phase 28: Selection Detail, Local Filter, Chrome Polish, and E2E Hardening - Research

**Researched:** 2026-07-01
**Domain:** Electron/React/TypeScript Semantic Connections graph panel, local renderer filtering, Playwright Electron E2E
**Confidence:** HIGH

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Downstream implementation agents MUST read the Graph Intelligence Monaco Side Panel Requirements document and Test Plan before making planning or implementation decisions. [VERIFIED: 28-CONTEXT.md]
- Product docs win over repo-local planning docs when product behavior is specified; `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `28-CONTEXT.md`, and Phase 28 research/pattern docs are the local GSD traceability layer. [VERIFIED: 28-CONTEXT.md]
- If product docs and prototype disagree, the requirements document wins; the prototype is visual/behavioral reference only. [VERIFIED: 28-CONTEXT.md]
- Implement REQ-012, REQ-013, REQ-014, REQ-015, REQ-019, REQ-020, and the edge-metadata overlay portion of REQ-023 in selection detail. [VERIFIED: 28-CONTEXT.md]
- Selection view is entered when `activeChunkId` is set and must provide a back control to whole-document view. [VERIFIED: 28-CONTEXT.md]
- FlashQuery v1 claims are `string[]`; render them as plain text in array order and do not invent basis tags or per-claim question styling. [VERIFIED: product requirements]
- Structured claim objects are forward-compatible input only; render claim text without crashing, but keep basis tags and per-claim question text out of v1 UI. [VERIFIED: product requirements]
- Stale and deleted edges must be filtered out before claim nesting or General connections are rendered. [VERIFIED: product requirements]
- Provider must merge `query_graph` edge metadata onto active chunk connections by edge `id`; claim-linked edges nest by `sourceClaimsReferenced` claim index. [VERIFIED: 28-CONTEXT.md]
- Local filter must be pure renderer logic over loaded result data and must never call FlashQuery, provider reload, semantic search, graph query, or network APIs. [VERIFIED: 28-CONTEXT.md]
- Integrated E2E must be deterministic and must not require a live external FlashQuery instance unless explicitly provisioned by a test. [VERIFIED: 28-CONTEXT.md]
- Renderer code must continue calling typed preload/provider APIs only and must not import Electron/Node APIs or receive FlashQuery bearer tokens or connection credentials. [VERIFIED: AGENTS.md]

### the agent's Discretion

- Exact helper names, component extraction boundaries, row disclosure UI, qualifier prose wording, filter helper location, and E2E fixture structure are implementation discretion as long as the requirements, tests, and Cate conventions are satisfied. [VERIFIED: 28-CONTEXT.md]
- The planner may split Phase 28 into four plans matching `.planning/ROADMAP.md` waves or slightly finer plans if dependency ordering makes execution safer. [VERIFIED: 28-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)

- Per-claim basis tags and per-claim question text remain out of v1 scope because FlashQuery v1 emits `key_claims` as `string[]`. [VERIFIED: product requirements]
- Graph generation, graph linting, community detection, and LLM extraction stay in FlashQuery, not Cate. [VERIFIED: product requirements]
- Additional graph actions such as accepting/resolving/dismissing findings remain future scope. [VERIFIED: product requirements]
- Highlight-in-place filtering and editor-level graph search/verification query UI remain future scope. [VERIFIED: product requirements]

## Project Constraints (from AGENTS.md)

- Use Cate's existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; do not add a web backend or UI framework. [VERIFIED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work goes through typed preload APIs and main-process validation. [VERIFIED: AGENTS.md]
- FlashQuery data remains in the configured FlashQuery instance/vault; Cate stores only connection metadata, preferences, and UI/session state. [VERIFIED: AGENTS.md]
- Do not break existing Cate agent, terminal, editor, browser, Git, workspace, dock, preview selection, or layout behavior. [VERIFIED: AGENTS.md]
- Add focused unit tests for pure helpers, IPC validation, renderer UI state, and Electron E2E for UI workflows. [VERIFIED: AGENTS.md]

## Summary

Phase 28 should extend the Phase 27 implementation in place, not replace it. Phase 27 already delivered optional graph scores, all relation metadata, `get_document include:['connections','graph_summary']`, typed `query_graph` preload/main IPC, progressive node metadata backfill, whole-document Summary/Needs attention/Sections/grouped Connections UI, relation filters, Top-N, preview-section navigation, and chrome count/config state. [VERIFIED: 27-VERIFICATION.md] The main missing runtime branch is selected-section graph detail: `SemanticConnectionsPanel.tsx` currently uses the old fallback card list whenever `activeChunkId` is set, even for typed graph results. [VERIFIED: codebase grep]

The highest-risk change is edge metadata overlay. `src/shared/types.ts`, `FlashQueryClientManager.normalizeDocumentConnection()`, and provider `toPanelConnection()` already preserve `source_claims_referenced`, `target_claims_referenced`, `qualifiers`, and object `metadata` when those fields are present in document-connection rows. [VERIFIED: codebase grep] But provider `backfillNodeMeta()` currently calls `query_graph action:'node'` only and does not yet merge edge traversal metadata by edge `id`; that is the Phase 28 REQ-023 gap. [VERIFIED: codebase grep]

**Primary recommendation:** Plan four waves: edge metadata plus selection header/status/claims, expandable edge rows/navigation, local filter plus chrome store polish, then graph-aware E2E fixture hardening. [VERIFIED: ROADMAP.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Selection view rendering | Renderer panel | Preview selection store | `activeChunkId` is already read from `usePreviewSelectionStore`; the panel owns conditional whole-document vs selection UI. [VERIFIED: codebase grep] |
| Edge metadata overlay | Renderer provider | Main/preload `query_graph` bridge | Main/preload bridge exists; provider should merge edge metadata into `SemanticConnection` rows before UI nesting. [VERIFIED: codebase grep] |
| Local keyword filtering | Renderer pure helpers + panel state | Chrome store | Product docs require no FlashQuery/provider/network calls; filtering belongs over loaded `SemanticConnectionsResult`. [VERIFIED: product requirements] |
| Target opening | Renderer panel | Active editor registry/file routing | `handleOpenConnection()` already preserves same-document and cross-document open behavior. [VERIFIED: codebase grep] |
| Deterministic integrated tests | Playwright Electron + E2E fixtures | Renderer E2E harness / FlashQuery stub | Existing E2E uses `launchApp()`, `window.__cateE2E`, and `startFlashQueryStubServer()` for deterministic app-shell flows. [VERIFIED: codebase grep] |

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-012 | Selection view header/back, heading, summary, community context. | Implement a graph selection branch in `SemanticConnectionsPanel.tsx`; currently active selection falls through to card layout. [VERIFIED: codebase grep] |
| REQ-013 | Selection status notes for question/certainty/staleness/external refs/temporal markers. | `SemanticConnectionNodeMeta` already carries these fields; UI must render them structurally. [VERIFIED: codebase grep] |
| REQ-014 | Claims and claim-linked edges. | `keyClaims?: string[]` exists; edge refs exist on `SemanticConnection`, but edge overlay merge remains missing. [VERIFIED: codebase grep] |
| REQ-015 | Expandable edge rows with relation, score, target, reasoning/body/qualifiers/metadata prose. | Existing `ConnectionCard` is insufficient for graph details; reuse target opening and `scEdgeLabel()`. [VERIFIED: product test plan] |
| REQ-016 | Toolbar-local text filter. | Add panel state/input behavior; must not call provider or `flashqueryQueryGraph`. [VERIFIED: product requirements] |
| REQ-017 | Exact searchable field rules. | Add pure matcher helpers in `semanticConnections.ts` or adjacent pure module with T-U-019..022. [VERIFIED: product test plan] |
| REQ-018 | Correct filter granularity/no-results state. | Component tests T-C-055..059 should pin structural vs filterable UI. [VERIFIED: product test plan] |
| REQ-019 | Preserve local section and target navigation. | Whole-document navigation exists; selection edge rows must call existing `handleOpenConnection()`. [VERIFIED: codebase grep] |
| REQ-020 | Dock-native responsive/accessibility behavior. | Existing classes use `min-w-0`, `truncate`, `line-clamp`; selection rows need equivalent narrow-width coverage. [VERIFIED: codebase grep] |
| REQ-021 | Recoverable loading/error/partial states. | Keep existing `LoadIssue`, stale cache, and node metadata degradation; add edge metadata partial diagnostics without blanking panel. [VERIFIED: codebase grep] |
| REQ-022 | Accurate chrome counts and separate config/filter state; unregister on unmount. | Store currently has `connectionCount`, `configOpen`, `configActive`, `toggleConfig`; it lacks filter state fields. [VERIFIED: codebase grep] |
| REQ-023 | Edge metadata overlay. | `flashqueryQueryGraph()` exists; provider must call edge traversal and merge metadata by edge `id`. [VERIFIED: codebase grep] |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 installed | Strict shared/main/preload/renderer contracts | Existing Cate stack and `npm run typecheck` gate. [VERIFIED: package-lock] |
| Electron | 41.2.0 installed | Main/preload/renderer process boundary | Cate runtime; official Electron docs recommend exposing specific preload APIs instead of raw `ipcRenderer`. [VERIFIED: package-lock] [CITED: /electron/electron context-isolation docs] |
| React | 18.3.1 installed | Panel rendering and interaction state | Existing renderer framework; React docs support state-driven conditional rendering and effect cleanup patterns. [VERIFIED: package-lock] [CITED: /reactjs/react.dev] |
| Zustand | 5.0.12 installed | Preview selection and chrome stores | Existing store framework used by `previewSelectionStore` and `semanticConnectionsChromeStore`. [VERIFIED: package-lock] |
| Vitest + Testing Library | Vitest 3.2.4 installed | Unit/jsdom component tests | Existing test runner for `src/**/*.test.ts(x)`. [VERIFIED: package-lock] |
| Playwright | 1.60.0 installed | Electron E2E tests | Existing `e2e/fixtures/electron-app.ts` uses `_electron.launch()` and `firstWindow()`, matching Playwright Electron docs. [VERIFIED: package-lock] [CITED: /microsoft/playwright Electron docs] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @modelcontextprotocol/sdk | 1.29.0 installed | E2E FlashQuery stub MCP server and main FlashQuery client | Use only in main/tests; renderer remains behind preload. [VERIFIED: package-lock] |
| @phosphor-icons/react | 2.1.10 installed | Existing semantic panel icons | Reuse for filter/search/disclosure if needed; do not add icon packages. [VERIFIED: package-lock] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing IPC/preload bridge | Direct renderer FlashQuery/MCP calls | Violates AGENTS.md security and token-boundary rules. [VERIFIED: AGENTS.md] |
| Existing semantic panel/provider | Separate graph panel implementation | Would duplicate dock, preview selection, cache, and target-opening behavior; Phase 28 is an extension. [VERIFIED: codebase grep] |
| Existing E2E stub/harness | Live FlashQuery service for all graph E2E | Product test plan requires deterministic fixtures and no live dependency by default. [VERIFIED: product test plan] |

**Installation:** No new packages should be installed for Phase 28. [VERIFIED: package.json]

## Package Legitimacy Audit

No new external packages are recommended or required for this phase. [VERIFIED: package.json]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| N/A | N/A | N/A | N/A | N/A | N/A | No new package install |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: package.json]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Markdown preview active section
  -> usePreviewSelectionStore.activeChunkId
  -> SemanticConnectionsPanel
     -> if no activeChunkId: WholeDocumentGraphView (Phase 27)
     -> if activeChunkId: SelectionGraphView (Phase 28)
        -> nodeMeta[activeChunkId] for header/status/claims
        -> byChunkId[activeChunkId] active edges only
        -> provider edge overlay merged by connection.id
           -> window.electronAPI.flashqueryQueryGraph()
           -> ipcMain FLASHQUERY_QUERY_GRAPH validation
           -> FlashQueryClientManager.callJsonTool('query_graph')
        -> claim grouping by sourceClaimsReferenced
        -> expandable edge rows
           -> same-document preview select OR cross-document open via existing handleOpenConnection()

Toolbar filter state
  -> pure matcher helpers over loaded SemanticConnectionsResult
  -> filtered whole-document/selection render models
  -> semanticConnectionsChromeStore filterActive + configActive
  -> no provider.loadDocumentConnections(), no flashqueryQueryGraph(), no search/network

E2E graph fixture
  -> Playwright launchApp(CATE_E2E=1)
  -> open Markdown preview
  -> create semantic-connections dock panel
  -> deterministic provider/stub graph responses
  -> assert graph open/navigation/filter/fallback/error flows
```

### Recommended Project Structure

```text
src/
├── renderer/
│   ├── lib/
│   │   ├── semanticConnections.ts          # active-edge, claim grouping, score color, filter match helpers
│   │   ├── semanticConnectionsProvider.ts  # query_graph edge metadata overlay merge
│   │   └── e2eHarness.ts                   # graph scenario fixture if E2E uses renderer provider injection
│   ├── panels/
│   │   ├── SemanticConnectionsPanel.tsx    # selection view, filter toolbar, chrome publication
│   │   └── SemanticConnectionsPanel.test.tsx
│   └── stores/
│       └── semanticConnectionsChromeStore.ts # filterActive/filterOpen/toggleFilter additions
└── e2e/
    ├── semantic-connections-graph.spec.ts  # T-E-001..T-E-005
    └── fixtures/
        └── flashquery-server.ts            # graph get_document/query_graph fixture support if using live IPC path
```

### Pattern 1: Provider Edge Overlay Merge

**What:** Extend `semanticConnectionsProvider.ts` so graph-mode results can enrich chunk connections with edge metadata returned by `query_graph` edge traversal, matching by `connection.id`. [VERIFIED: product requirements]

**When to use:** Before selection UI groups claims, because claim nesting depends on `sourceClaimsReferenced` from edge metadata. [VERIFIED: product requirements]

**Example:**

```typescript
// Source: product REQ-023 + existing provider injection pattern
function mergeEdgeMetadata(
  connections: readonly SemanticConnection[],
  overlayById: ReadonlyMap<string, Partial<SemanticConnection>>,
): SemanticConnection[] {
  return connections.map((connection) => ({
    ...connection,
    ...(overlayById.get(connection.id) ?? {}),
  }))
}
```

### Pattern 2: Selection View as Graph Branch, Not Card Mode

**What:** Add a graph selection branch beside `WholeDocumentGraphView`; keep embeddings-only selection cards as fallback. [VERIFIED: codebase grep]

**When to use:** `result.mode !== 'embeddings-only' && activeChunkId` and a mapped section exists. [VERIFIED: product requirements]

### Pattern 3: Pure Local Filter Helpers

**What:** Put match rules in pure helpers that accept a term and connection/section model; component code should only wire input state and render filtered models. [VERIFIED: product test plan]

**When to use:** T-U-019..022 and T-C-050..059; this is the easiest way to prove the no-provider-call invariant. [VERIFIED: product test plan]

### Anti-Patterns to Avoid

- **Calling provider reload from filter changes:** violates REQ-016 and makes T-C-054/T-E-003 flaky. [VERIFIED: product requirements]
- **Grouping stale/deleted edges after claims:** stale/deleted edges must be removed before claim nesting and General connections. [VERIFIED: product requirements]
- **Rendering raw metadata JSON:** REQ-015 requires readable prose for known metadata keys such as `severity`, `strength`, and `dependency_type`. [VERIFIED: product requirements]
- **Using structural UI labels as filter text:** REQ-017 excludes labels, icons, counts, community summaries, temporal marker text, external ref URLs, and basis labels from matching. [VERIFIED: product requirements]
- **Relying on live FlashQuery in E2E:** product test plan requires deterministic graph fixtures. [VERIFIED: product test plan]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Renderer privileged access | Direct MCP/HTTP client | Existing `flashqueryQueryGraph()` preload bridge | Maintains context isolation and credential safety. [CITED: /electron/electron context-isolation docs] |
| Section selection model | Panel-local selection store | `usePreviewSelectionStore.selectSection/clearSelection` | Existing preview/semantic selection scope already drives `activeChunkId`. [VERIFIED: codebase grep] |
| Cross-document opening | New file opener | Existing `handleOpenConnection()` path | Already handles same-document preview scroll, registered editors, and `openFileAsPanel()`. [VERIFIED: codebase grep] |
| E2E app launcher | Custom Electron process launcher | `e2e/fixtures/electron-app.ts` | Existing fixture sets `CATE_E2E=1` and waits for `window.__cateE2E.ready`. [VERIFIED: codebase grep] |
| Metadata serialization | JSON dump UI | Explicit formatter/prose helper | Product requires readable known metadata prose. [VERIFIED: product requirements] |

## Current Implementation State After Phase 27

| Surface | Exists Now | Phase 28 Extension | Must Not Regress |
|---------|------------|--------------------|------------------|
| `semanticConnections.ts` | Full relation union, optional `score`, `SemanticConnectionNodeMeta`, `groupWholeDocumentConnections()`, `scEdgeLabel()`. [VERIFIED: codebase grep] | Add score color helper, active-edge helper, claim grouping, filter match helpers, metadata prose helpers. [VERIFIED: product test plan] | T-U-001..018, T-U-026 remain green. [VERIFIED: 27-VERIFICATION.md] |
| `semanticConnectionsProvider.ts` | Maps source chunks, derives mode, backfills node metadata via `query_graph action:'node'`. [VERIFIED: codebase grep] | Backfill/merge edge metadata by edge `id`; preserve partial failure diagnostics. [VERIFIED: product requirements] | Embeddings-only fallback and node backfill tests T-U-023/T-U-025. [VERIFIED: 27-VERIFICATION.md] |
| `SemanticConnectionsPanel.tsx` | Whole-document graph view plus embeddings/card fallback; active selection currently falls to card list. [VERIFIED: codebase grep] | Add graph selection view, filter toolbar, filter render models, chrome filter state. [VERIFIED: product test plan] | Whole-document Summary/Attention/Sections/Connections and relation filters. [VERIFIED: 27-VERIFICATION.md] |
| `semanticConnectionsChromeStore.ts` | Stores connection count/config open/config active/toggle config. [VERIFIED: codebase grep] | Add independent filter open/active/toggle filter fields and cleanup coverage. [VERIFIED: product test plan] | Existing config active indicator and unmount cleanup. [VERIFIED: 27-VERIFICATION.md] |
| Main/preload/shared graph IPC | `FLASHQUERY_QUERY_GRAPH`, validation, client `queryGraph()`, preload/electronAPI method exist. [VERIFIED: codebase grep] | Likely no new IPC needed unless edge traversal params need wider action/direction support. [VERIFIED: codebase grep] | Credential redaction and content-gating behavior. [VERIFIED: 27-VERIFICATION.md] |
| E2E fixtures | Embeddings-era semantic inspector spec and FlashQuery stub exist; stub lacks graph `get_document`/`query_graph` behavior. [VERIFIED: codebase grep] | Add graph deterministic scenario through E2E harness provider or extend MCP stub tools. [VERIFIED: product test plan] | Existing semantic inspector E2E and FlashQuery stub tests. [VERIFIED: codebase grep] |

## Suggested Plan Split

| Wave | Scope | Dependencies | Primary Files | Required Test IDs |
|------|-------|--------------|---------------|-------------------|
| 1 | Selection header/status/claims + edge metadata overlay | Phase 27 `query_graph` bridge and nodeMeta | `semanticConnectionsProvider.ts`, `semanticConnections.ts`, `SemanticConnectionsPanel.tsx`, provider/panel tests | T-U-024, T-C-030..042, T-C-065 |
| 2 | Expandable edge rows, score colors, metadata prose, target opening | Wave 1 claim/edge data available | `semanticConnections.ts`, `SemanticConnectionsPanel.tsx`, panel tests | T-U-027, T-C-043..049 |
| 3 | Toolbar local filter + chrome polish | Waves 1-2 render models stable | `semanticConnections.ts`, `SemanticConnectionsPanel.tsx`, `semanticConnectionsChromeStore.ts`, tests | T-U-019..022, T-C-050..062 |
| 4 | Integrated E2E and final regression | Waves 1-3 user flow complete | `e2e/semantic-connections-graph.spec.ts`, `e2e/fixtures/flashquery-server.ts` or `e2eHarness.ts` | T-E-001..005, T-A-001..004 |

## Common Pitfalls

### Pitfall 1: Selection Graph Mode Accidentally Uses Old Cards

**What goes wrong:** Active graph selection renders `ConnectionCard` instead of claims/status/edge rows. [VERIFIED: codebase grep]
**Why it happens:** `graphWholeDocumentMode` is false whenever `activeChunkId` exists, and the non-graph branch renders sorted cards. [VERIFIED: codebase grep]
**How to avoid:** Add explicit `graphSelectionMode` branch before the fallback card branch. [VERIFIED: product requirements]
**Warning signs:** T-C-030 or T-C-038 sees card-era expand labels instead of back/header/claims. [VERIFIED: product test plan]

### Pitfall 2: Edge Metadata Overlay Fetch Blocks or Blanks the Panel

**What goes wrong:** One failed `query_graph` edge call removes valid section graph data. [VERIFIED: product requirements]
**Why it happens:** Node metadata backfill already handles per-chunk failures; edge overlay must follow the same partial-degradation model. [VERIFIED: codebase grep]
**How to avoid:** Merge edge metadata opportunistically, keep original connections, and add diagnostics on edge overlay failure. [VERIFIED: product requirements]
**Warning signs:** Selection view disappears when qualifiers fail to load. [VERIFIED: product test plan]

### Pitfall 3: Filter Changes Trigger Provider Calls

**What goes wrong:** Typing in the filter reloads `get_document`, `query_graph`, or semantic search. [VERIFIED: product requirements]
**Why it happens:** Filter state gets added to provider input/effect dependencies. [ASSUMED]
**How to avoid:** Keep filter state out of provider load dependencies and test provider call counts. [VERIFIED: product test plan]
**Warning signs:** T-C-054 or T-E-003 observes backend counters increasing after filter text changes. [VERIFIED: product test plan]

### Pitfall 4: Chrome Count Uses Post-Filter Rows

**What goes wrong:** Dock badge changes as the local filter hides rows. [VERIFIED: product requirements]
**Why it happens:** Existing chrome count uses `activeScopedConnections.length`; if replaced with filtered length, REQ-022 regresses. [VERIFIED: codebase grep]
**How to avoid:** Publish pre-filter active connection count and separate `filterActive`. [VERIFIED: product test plan]
**Warning signs:** T-C-061 fails. [VERIFIED: product test plan]

### Pitfall 5: Narrow Dock Rows Overlap

**What goes wrong:** Expanded edge details, metadata prose, buttons, and score pies overlap in a 330-360px dock. [VERIFIED: product requirements]
**Why it happens:** Existing narrow-width coverage only covers whole-document rows. [VERIFIED: 27-VERIFICATION.md]
**How to avoid:** Use `min-w-0`, wrapping/truncation, fixed icon/score dimensions, and T-C-049/E2E dock smoke. [VERIFIED: codebase grep]
**Warning signs:** Human dock smoke or T-C-049 finds overlapping target/snippet/action controls. [VERIFIED: product test plan]

## Code Examples

### Score Color Helper

```typescript
// Source: product REQ-015 / T-U-027
export function scoreTone(score: number): 'red' | 'orange' | 'teal' | 'green' {
  if (score < 0.4) return 'red'
  if (score < 0.6) return 'orange'
  if (score < 0.8) return 'teal'
  return 'green'
}
```

### Claim Grouping Model

```typescript
// Source: product REQ-014
type ClaimEntry = string | { index?: number; claim?: string; text?: string }

function claimText(entry: ClaimEntry): string {
  return typeof entry === 'string' ? entry : entry.claim ?? entry.text ?? ''
}
```

### Filter No-Provider-Call Test Shape

```typescript
// Source: product T-C-054 + existing Testing Library tests
const provider = { loadDocumentConnections: vi.fn(async () => graphResult) }
renderPanel(graphResult, { provider })
await user.click(screen.getByRole('button', { name: /filter/i }))
await user.type(screen.getByRole('textbox', { name: /filter/i }), 'severity')
expect(provider.loadDocumentConnections).toHaveBeenCalledTimes(1)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Embeddings-only card list for all selected scopes | Whole-document graph view exists, selected-section graph view pending | Phase 27 completed 2026-07-01 | Phase 28 must add selection graph branch while preserving embeddings fallback. [VERIFIED: 27-VERIFICATION.md] |
| `query_graph` absent in Cate | `query_graph` main/preload/provider node path exists | Phase 27 Plan 02 | Phase 28 should reuse it for edge metadata overlay, not add a renderer-side backend. [VERIFIED: 27-VERIFICATION.md] |
| Config-only dock chrome | Config state exists; filter state pending | Phase 27 Plan 03 | Store schema needs independent filter state for Phase 28. [VERIFIED: codebase grep] |
| Embeddings-era E2E semantic spec | Graph-specific E2E pending | Phase 28 scope | Add `semantic-connections-graph.spec.ts` or extend closest existing graph E2E file. [VERIFIED: ROADMAP.md] |

**Deprecated/outdated:**
- Treating `activeChunkId` selection as just a filtered card list is outdated for graph mode; Phase 28 requires section header/status/claims/edge details. [VERIFIED: product requirements]
- Assuming all graph edge metadata arrives through `get_document` is outdated; product docs assign qualifiers/claim refs/metadata to `query_graph` edge traversal merged by edge `id`. [VERIFIED: product requirements]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | RESOLVED: Edge overlay should use the existing Cate `FlashQueryQueryGraphAction` contract, primarily `action:'edges'` with `chunk_id:<source chunk id>`, `direction:'both'`, `include_content:false`, and a bounded `limit`; `neighbors` or `subgraph` remain fallback actions only if implementation-time tests prove `edges` lacks the needed target node context. [VERIFIED: Cate `src/shared/types.ts`, `src/main/ipc/flashquery.ts`, FlashQuery `src/graph/queries.ts`] | Suggested Plan Split | Low: Cate already validates `edges`, FlashQuery implements `edgesAction()` returning `{ edges: GraphEdgePayload[] }`, and `GraphEdgePayload.metadata` carries the required overlay fields. |
| A2 | RESOLVED: E2E should prefer extending `e2e/fixtures/flashquery-server.ts` so T-E-003 can prove no backend reload through deterministic `get_document` / `query_graph` counters. Renderer harness graph scenarios are acceptable only as a fallback if the stub cannot reach the app flow, and must still expose provider-call counters. [VERIFIED: product test plan, existing E2E fixture patterns] | Current Implementation State | Low/medium: stub work is more realistic and gives stronger backend-call evidence, but harness fallback remains valid if documented in Plan 28-04 summary. |

## Open Questions (RESOLVED)

1. **Which exact `query_graph` edge traversal shape should provider use for edge overlay?**
   - Resolution: Use `window.electronAPI.flashqueryQueryGraph(workspaceId, { action: 'edges', chunk_id: flashqueryChunkId, direction: 'both', include_content: false, limit })` through the existing provider injection path. Cate validates `edges` and defaults bulk `include_content` to false; FlashQuery `edgesAction()` returns an `edges` array of `GraphEdgePayload` objects filtered by `chunk_id`; each edge includes `id`, `source`, `target`, `relation`, `direction`, `confidence`, `confidence_score`, `reasoning`, `stale`, and `metadata`. [VERIFIED: Cate `src/main/ipc/flashquery.ts`, Cate `src/main/ipc/flashquery.test.ts`, FlashQuery `src/graph/queries.ts`]
   - Payload extraction rule for implementation: support both FlashQuery's JSON envelope shape (`payload.data.edges`) and Cate/unit fixture flattened shapes (`payload.edges`, plus node-adjacent `payload.data.node.edges` / `payload.node.edges` if present). This preserves compatibility with Phase 27 tests while matching current FlashQuery source. [VERIFIED: FlashQuery `graphToolResult()`, Cate `clientManager.queryGraph()` tests]
   - Merge rule: for each returned edge, merge by `edge.id` onto existing `SemanticConnection.id`. Read `qualifiers`, `source_claims_referenced`, and `target_claims_referenced` from `edge.metadata` first; tolerate already-promoted `edge.qualifiers`, `edge.source_claims_referenced`, and `edge.target_claims_referenced` in fixtures. Keep unknown metadata opaque and append diagnostics for malformed overlay entries instead of dropping base connections. [VERIFIED: product REQ-023, Phase 27 provider patterns]

2. **Should E2E graph data flow through the real FlashQuery stub or the renderer harness provider?**
   - Resolution: Prefer the FlashQuery stub route. Extend `e2e/fixtures/flashquery-server.ts` with deterministic graph `get_document` and `query_graph` responses plus per-tool counters so T-E-003 can assert filter typing does not increment backend calls. [VERIFIED: product T-E-003 and existing stub-server patterns]
   - Fallback: If the stub path cannot drive the existing app shell reliably, extend `src/renderer/lib/e2eHarness.ts` with graph scenarios and provider-call counters. The implementation summary must document the fallback and still prove no provider/FlashQuery reload while filtering. [VERIFIED: 28-PATTERNS.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts/typecheck/tests/E2E | Wrong version in current shell | v26.0.0; package requires `>=20 <23` | Switch to Node 20 or 22 before verification. [VERIFIED: shell] [VERIFIED: package.json] |
| npm | package scripts | Yes | 11.12.1 | Use npm to match lockfile. [VERIFIED: shell] |
| git | repo workflow | Yes | 2.50.1 | - [VERIFIED: shell] |
| rg | code search | Yes | 15.1.0 | - [VERIFIED: shell] |
| Playwright/Electron deps | E2E | Installed in lockfile | Playwright 1.60.0, Electron 41.2.0 | Existing project setup. [VERIFIED: package-lock] |

**Missing dependencies with no fallback:**
- A supported Node runtime (`>=20 <23`) is required for reliable `npm run typecheck`, `npm run test:unit`, and `npm run test:e2e`; current shell Node v26 is outside Cate's engine range. [VERIFIED: shell] [VERIFIED: package.json]

**Missing dependencies with fallback:**
- None identified. [VERIFIED: codebase grep]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 for unit/jsdom tests; Playwright 1.60.0 for Electron E2E. [VERIFIED: package-lock] |
| Config file | `vitest.config.ts`, `playwright.config.ts`. [VERIFIED: AGENTS.md] |
| Quick run command | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` [VERIFIED: product test plan] |
| Full suite command | `npm run test:unit && npm run typecheck && npm run lint && npm run test:e2e` [VERIFIED: ROADMAP.md] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-012 | Selection header/back/summary/community | component/E2E | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | Yes [VERIFIED: codebase grep] |
| REQ-013 | Status notes/external refs/temporal markers | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | Yes [VERIFIED: codebase grep] |
| REQ-014 | Claims and claim-linked active edges | unit/component | `npm run test:unit -- src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` | Yes [VERIFIED: codebase grep] |
| REQ-015 | Expandable edge rows/score colors/metadata prose | unit/component | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` | Yes [VERIFIED: codebase grep] |
| REQ-016 | Toolbar filter behavior/no provider calls | component/E2E | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | Yes [VERIFIED: codebase grep] |
| REQ-017 | Searchable field rules | unit | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts` | Yes [VERIFIED: codebase grep] |
| REQ-018 | Filter granularity/no-results | component/E2E | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | Yes [VERIFIED: codebase grep] |
| REQ-019/020 | Target opening and dock accessibility | component/E2E | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx && npm run test:e2e -- e2e/semantic-connections-graph.spec.ts` | E2E file missing [VERIFIED: codebase grep] |
| REQ-021/022/023 | Recovery, chrome, edge overlay | unit/component/E2E | focused suites plus `npm run test:e2e -- e2e/semantic-connections-graph.spec.ts` | E2E file missing [VERIFIED: codebase grep] |

### Sampling Rate

- **Per task commit:** run the touched layer's focused Vitest file. [VERIFIED: product test plan]
- **Per wave merge:** run all Phase 28 focused Vitest files and `npm run typecheck`. [VERIFIED: ROADMAP.md]
- **Phase gate:** run `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run test:e2e` under Node 20/22. [VERIFIED: ROADMAP.md]

### Wave 0 Gaps

- [ ] Add T-U-019..022 and T-U-027 to `src/renderer/lib/semanticConnections.test.ts`. [VERIFIED: product test plan]
- [ ] Add T-U-024 to `src/renderer/lib/semanticConnectionsProvider.test.ts`. [VERIFIED: product test plan]
- [ ] Add T-C-030..065 Phase 28 component tests to `SemanticConnectionsPanel.test.tsx`; note existing T-C-030 currently covers a Phase 27 stale/deleted invariant and may need renaming or expansion to avoid ID collision. [VERIFIED: codebase grep]
- [ ] Create `e2e/semantic-connections-graph.spec.ts` or extend the closest existing semantic graph E2E spec for T-E-001..005. [VERIFIED: product test plan]
- [ ] Ensure `npm run lint` is available and run under supported Node; package scripts include `lint`. [VERIFIED: package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Yes | Main-process FlashQuery connection/token handling; renderer sees only typed API responses. [VERIFIED: AGENTS.md] |
| V3 Session Management | No | MCP calls are stateless from renderer perspective; no server-side session state should be added. [VERIFIED: AGENTS.md] |
| V4 Access Control | Yes | Workspace-scoped FlashQuery APIs and selected workspace IDs. [VERIFIED: AGENTS.md] |
| V5 Input Validation | Yes | Main IPC validation for `query_graph` params and renderer runtime result validation. [VERIFIED: codebase grep] |
| V6 Cryptography | No new crypto | Do not hand-roll crypto; preserve existing bearer-token redaction. [VERIFIED: 27-VERIFICATION.md] |

### Known Threat Patterns for Electron/FlashQuery Boundary

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Renderer obtains raw `ipcRenderer` or tokens | Information Disclosure/Elevation | Expose only specific preload methods via `contextBridge`; never expose raw Electron APIs. [CITED: /electron/electron context-isolation docs] |
| Filter text triggers network query unexpectedly | Information Disclosure | Keep filter local and verify provider/FlashQuery call counts. [VERIFIED: product requirements] |
| Diagnostics leak bearer token | Information Disclosure | Preserve Phase 27 safe diagnostics/redaction tests. [VERIFIED: 27-VERIFICATION.md] |
| Malformed graph metadata crashes renderer | Denial of Service | Normalize optional fields, render known metadata prose, and ignore unknown/malformed optional fields. [VERIFIED: product requirements] |

## Sources

### Primary (HIGH confidence)

- `AGENTS.md` - Cate stack, process-boundary, testing, and no-web-UI constraints. [VERIFIED: AGENTS.md]
- `.planning/ROADMAP.md` - Phase 28 wave split, requirement IDs, test IDs, and verification commands. [VERIFIED: ROADMAP.md]
- `.planning/REQUIREMENTS.md` - v1.6 REQ-012..023 status and traceability. [VERIFIED: REQUIREMENTS.md]
- `28-CONTEXT.md` - locked Phase 28 decisions and deferred scope. [VERIFIED: 28-CONTEXT.md]
- Product Requirements and Test Plan - selection/filter/E2E behavior and T-U/T-C/T-E/T-A matrix. [VERIFIED: product docs]
- Phase 27 `27-VERIFICATION.md` - current implementation state after Phase 27. [VERIFIED: 27-VERIFICATION.md]
- Cate code surfaces listed in the prompt - current functions, types, stores, IPC, preload, and E2E fixture patterns. [VERIFIED: codebase grep]
- Context7 `/electron/electron`, `/reactjs/react.dev`, `/microsoft/playwright` - official docs for preload IPC, React state/effects, and Electron E2E launch patterns. [CITED: Context7]

### Secondary (MEDIUM confidence)

- npm registry version lookups for latest public package versions; used only to note that Cate intentionally remains on installed versions. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- None used as authoritative source. [VERIFIED: research log]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing installed stack and docs verified; no new packages recommended. [VERIFIED: package-lock]
- Architecture: HIGH - Phase 27 verification and current code align on provider/panel/preload boundaries. [VERIFIED: 27-VERIFICATION.md]
- Pitfalls: HIGH for product/code-derived pitfalls; MEDIUM for exact edge traversal payload shape because Cate has not implemented the merge yet. [VERIFIED: product requirements] [ASSUMED]

**Research date:** 2026-07-01
**Valid until:** 2026-07-31 for repo-local planning; re-check product docs and FlashQuery `query_graph` edge payload before implementation if delayed. [ASSUMED]
