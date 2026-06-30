# Phase 27: Graph Data Contract and Whole-Document Graph View - Research

**Researched:** 2026-06-30
**Domain:** Electron/React/TypeScript graph data contract, FlashQuery MCP bridge, Semantic Connections panel
**Confidence:** HIGH

## Reconciliation Note

After this research pass completed, `27-CONTEXT.md` and `27-UI-SPEC.md` were restored and committed for this phase. Downstream planning and implementation agents MUST read those files first, then use this research as supporting technical analysis. The "User Constraints" section below reflects the research-time filesystem state only.

## User Constraints

No `27-CONTEXT.md` file was present in `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/` at research time, so no phase-local locked decisions could be copied verbatim. [VERIFIED: codebase grep]

No `27-UI-SPEC.md` file was present in `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/` at research time, even though the research prompt listed it as required reading. [VERIFIED: codebase grep]

The active source-of-truth constraints for this research are therefore `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, and the two product docs under `flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/`. [VERIFIED: codebase grep]

## Project Constraints (from AGENTS.md)

- Use Cate's existing Electron, React, TypeScript, Zustand, IPC, and Vitest/Playwright stack; do not add a separate web backend or UI framework. [VERIFIED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work must go through typed preload APIs and main-process validation. [VERIFIED: AGENTS.md]
- FlashQuery data remains in the configured FlashQuery instance/vault; Cate stores connection metadata, preferences, and UI/session state only. [VERIFIED: AGENTS.md]
- Connection/context behavior should be workspace-aware. [VERIFIED: AGENTS.md]
- Prefer FlashQuery's host-visible MCP/HTTP surface, with stdio only as later fallback if needed. [VERIFIED: AGENTS.md]
- Do not break existing Cate agent, terminal, editor, browser, Git, workspace, or layout behavior. [VERIFIED: AGENTS.md]
- Add focused unit tests for config, IPC validation, pure helpers, renderer UI state, and Electron smoke/E2E where UI exists. [VERIFIED: AGENTS.md]

## Summary

Phase 27 should be planned as a contract-first vertical slice: shared graph types and main-process normalization must land before provider and UI work, because the current Cate contract only preserves embeddings-style connection fields and requires numeric `score` on every `SemanticConnection`. [VERIFIED: codebase grep] The Phase 27 requirements require optional scores, graph summary, typed relations, target health fields, source chunk mapping, typed/mixed/embeddings-only mode, and progressive `query_graph` metadata backfill. [VERIFIED: product requirements]

The safest implementation order is: expand shared graph and renderer semantic types, update `get_document`/document-connections normalization to request and preserve `connections` plus `graph_summary`, add a typed `query_graph` main/preload/electronAPI bridge, then update the renderer provider to map FlashQuery chunk IDs to preview chunk IDs and progressively backfill node metadata. [VERIFIED: codebase grep] Whole-document UI should be built on top of normalized provider output and must keep the existing embeddings-only card/list fallback green. [VERIFIED: product requirements]

**Primary recommendation:** Plan Phase 27 in three waves matching the roadmap: shared graph contract, provider plus `query_graph` backfill, then whole-document graph UI and navigation. [VERIFIED: ROADMAP.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| FlashQuery graph reads | Main process | FlashQuery MCP service | Main owns credentials and MCP client; renderer must not receive bearer tokens. [VERIFIED: AGENTS.md] |
| IPC/preload graph contract | Shared + Preload | Main process | Channel constants/types live in `src/shared`, preload wraps `ipcRenderer.invoke`, and main validates input. [VERIFIED: codebase grep] |
| Source chunk to preview chunk mapping | Renderer provider | Preview selection store | Mapping uses Monaco markdown headings and preview IDs; selection store consumes preview chunk IDs. [VERIFIED: codebase grep] |
| Whole-document graph presentation | Renderer panel | Zustand chrome/selection stores | `SemanticConnectionsPanel.tsx` owns panel UI while stores publish chrome and preview selection state. [VERIFIED: codebase grep] |
| FlashQuery graph generation/storage | FlashQuery service | — | Cate consumes returned graph fields and does not implement graph generation, linting, or community detection. [VERIFIED: product requirements] |

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-001 | Expand graph-aware semantic connection types. | Current union has 9 relations and required `score`; extend before provider/UI. [VERIFIED: codebase grep] |
| REQ-002 | Preserve embeddings-only fallback. | Existing panel/provider/tests are embeddings-first and should remain regression fixtures. [VERIFIED: codebase grep] |
| REQ-003 | Normalize graph connection payloads. | Current client manager drops graph overlay fields and requests only `include:['connections']`. [VERIFIED: codebase grep] |
| REQ-004 | Define complete edge display metadata. | `SC_EDGE` needs all graph relation labels and fallback behavior. [VERIFIED: codebase grep] |
| REQ-005 | Map source chunks to preview chunk IDs. | Existing heading path/source-line mapper is the correct base. [VERIFIED: codebase grep] |
| REQ-006 | Derive typed/mixed/embeddings modes and diagnostics. | Provider currently hardcodes `mode:'embeddings-only'` for document connections. [VERIFIED: codebase grep] |
| REQ-007 | Render community summary. | FlashQuery node payload and graph summary can carry community fields. [VERIFIED: FlashQuery source] |
| REQ-008 | Render attention area. | Contradictions come from active edges; questions/certainty come from node metadata. [VERIFIED: product requirements] |
| REQ-009 | Render graph-enhanced sections list. | `chunkOrder` and `chunkMap` already exist as provider output slots. [VERIFIED: codebase grep] |
| REQ-010 | Render grouped whole-document connections. | Pure helpers should own relation priority/group sorting before component tests. [VERIFIED: product test plan] |
| REQ-011 | Apply Top-N and relation filters only to connection lists. | Existing Top-N/filter UI can be adapted, but attention/sections must bypass relation filters. [VERIFIED: product requirements] |
| REQ-021 | Recover from loading/error/partial metadata states. | Current panel has recoverable load issues; add node metadata pending/partial states. [VERIFIED: codebase grep] |
| REQ-023 | Add `query_graph` foundation/node backfill. | No current Cate `query_graph` channel exists; FlashQuery exposes `query_graph`. [VERIFIED: codebase grep] |

</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.9.3 installed | Shared contracts, strict renderer/main/preload types | Existing Cate stack and strict typecheck gate. [VERIFIED: package-lock] |
| Electron | 41.2.0 installed | Main/preload/renderer process boundary | Existing app runtime; ContextBridge/IPC pattern is official Electron security guidance. [VERIFIED: package-lock] [CITED: https://github.com/electron/electron/blob/main/docs/tutorial/context-isolation.md] |
| React | 18.3.1 installed | Semantic Connections panel UI | Existing renderer framework; official docs support component list rendering and effect cleanup patterns. [VERIFIED: package-lock] [CITED: https://github.com/reactjs/react.dev/blob/main/src/content/learn/rendering-lists.md] |
| Zustand | 5.0.12 installed | Preview selection and chrome stores | Existing renderer state store for `previewSelectionStore` and `semanticConnectionsChromeStore`. [VERIFIED: package-lock] |
| Vitest | 3.2.4 installed | Unit/jsdom test runner | Existing colocated test infrastructure. [VERIFIED: package-lock] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @modelcontextprotocol/sdk | 1.29.0 installed | Main-process FlashQuery MCP client | Use only in main-process FlashQuery client manager, not renderer. [VERIFIED: package-lock] [VERIFIED: codebase grep] |
| @phosphor-icons/react | 2.1.10 installed | Existing panel toolbar/open icons | Use existing icon family in `SemanticConnectionsPanel`; do not add an icon package. [VERIFIED: package-lock] |
| @testing-library/react | 16.3.2 installed | Component interaction tests | Use for whole-document graph view and navigation tests. [VERIFIED: package-lock] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing IPC/preload path | Direct renderer MCP client | Violates project security constraint and risks token exposure. [VERIFIED: AGENTS.md] |
| Existing React/Tailwind panel | Prototype HTML/CSS copy | Product doc says prototype is reference only and Cate theme/dock sizing are authoritative. [VERIFIED: product requirements] |
| Existing Vitest component tests | E2E for every UI behavior | Product test plan assigns most graph UI behavior to jsdom component tests; E2E is for integrated app shell behavior. [VERIFIED: product test plan] |

**Installation:** No new packages should be installed for Phase 27. [VERIFIED: package.json]

## Package Legitimacy Audit

No new external packages are recommended for this phase. [VERIFIED: package.json]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| electron | npm | existing dependency | not needed | official Electron project | OK | Existing, no install |
| @modelcontextprotocol/sdk | npm | existing dependency | not needed | official MCP SDK package | OK | Existing, no install |
| react | npm | existing dependency | not needed | official React project | OK | Existing, no install |
| zustand | npm | existing dependency | not needed | existing dependency | OK | Existing, no install |
| vitest | npm | existing dev dependency | not needed | existing dependency | SUS by slopcheck typo heuristic | Existing, no install; do not replace |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: slopcheck]
**Packages flagged as suspicious [SUS]:** `vitest` was flagged by slopcheck as close to `vite`; it is already installed and used by the repo, so this is not a new package decision. [VERIFIED: slopcheck] [VERIFIED: package-lock]

## Architecture Patterns

### System Architecture Diagram

```text
Markdown preview editor
  -> activeEditorRegistry snapshot
  -> SemanticConnectionsPanel load effect
  -> SemanticConnectionsProvider
     -> documentConnections/get_document bridge
        -> preload flashqueryDocumentConnections()
        -> ipcMain FLASHQUERY_DOCUMENT_CONNECTIONS validation
        -> FlashQueryClientManager.callJsonTool('get_document', include ['connections','graph_summary'])
        -> FlashQuery MCP service
     -> map source_chunks FlashQuery chunk IDs to Cate preview chunk IDs
     -> derive mode typed|mixed|embeddings-only and diagnostics
     -> progressive queryGraph backfill
        -> preload flashqueryQueryGraph()
        -> ipcMain FLASHQUERY_QUERY_GRAPH validation
        -> FlashQueryClientManager.callJsonTool('query_graph', action node/edges)
        -> merge nodeMeta and edge metadata by preview chunk / edge id
  -> WholeDocumentGraphView
     -> Summary / Needs attention / Sections / Grouped connections
     -> previewSelectionStore.selectSection(previewChunkId)
  -> Selection view deferred mostly to Phase 28
```

### Recommended Project Structure

```text
src/
├── shared/
│   ├── types.ts                 # FlashQuery graph/query_graph shared contracts
│   ├── ipc-channels.ts          # FLASHQUERY_QUERY_GRAPH channel
│   └── electron-api.d.ts        # preload API signature
├── main/
│   ├── flashquery/clientManager.ts  # get_document graph normalization + queryGraph method
│   └── ipc/flashquery.ts            # query_graph validation/handler
├── preload/
│   └── index.ts                 # flashqueryQueryGraph bridge
└── renderer/
    ├── lib/semanticConnections.ts         # graph model, relation metadata, grouping/filter helpers
    ├── lib/semanticConnectionsProvider.ts # payload translation, mapping, query_graph backfill
    ├── panels/SemanticConnectionsPanel.tsx # whole-document graph UI
    └── stores/previewSelectionStore.ts     # existing preview chunk selection surface
```

### Pattern 1: Typed Preload IPC Bridge

**What:** Add a channel constant, validate inputs in main, expose one specific preload method, and declare it in `electron-api.d.ts`. [VERIFIED: codebase grep]

**When to use:** Every renderer-to-main FlashQuery operation, including `query_graph`. [VERIFIED: AGENTS.md]

**Example:**

```typescript
// Source: Cate existing pattern + Electron contextBridge docs
export const FLASHQUERY_QUERY_GRAPH = 'flashquery:queryGraph'

// preload
flashqueryQueryGraph(workspaceId: string, params: unknown): Promise<unknown> {
  return ipcRenderer.invoke(FLASHQUERY_QUERY_GRAPH, workspaceId, params)
}
```

### Pattern 2: Normalize at the Main Boundary, Translate at Provider Boundary

**What:** Main-process normalization should preserve FlashQuery field names safely; renderer provider should translate them into `SemanticConnection` names like `rel`, `dir`, `targetChunkSummary`, and diagnostics. [VERIFIED: codebase grep]

**When to use:** For `get_document` connection overlay, `graph_summary`, source chunks, and `query_graph` node/edge payloads. [VERIFIED: product requirements]

### Pattern 3: Pure Helpers Before Panel JSX

**What:** Relation metadata coverage, grouping priority, score fallback sorting, mode derivation, Top-N allocation, and match/filter helpers should live in `semanticConnections.ts` or small adjacent pure modules with direct tests. [VERIFIED: product test plan]

**When to use:** Any rule reused by UI rendering and tests. [VERIFIED: codebase grep]

### Anti-Patterns to Avoid

- **Renderer calls MCP directly:** violates Cate's security boundary and risks token leakage. [VERIFIED: AGENTS.md]
- **Making graph fields required everywhere:** breaks embeddings-only fallback fixtures and violates optional-score requirement. [VERIFIED: product requirements]
- **Using FlashQuery chunk IDs as preview selection IDs:** preview selection store expects Cate preview chunk IDs. [VERIFIED: codebase grep]
- **Filtering attention rows with relation filters:** product requirements say attention and section rows are not affected by nature filters. [VERIFIED: product requirements]
- **Copying prototype fixed-width CSS:** product requirements require dock-native fluid Cate styling. [VERIFIED: product requirements]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Renderer-to-main security | Renderer MCP/HTTP client | Existing Electron preload + IPC + main client manager | Preserves context isolation and token safety. [VERIFIED: AGENTS.md] |
| Markdown heading parsing | New parser | `parseDocumentHeadings` + `createHeadingIdTracker` | Existing preview ID logic handles duplicate headings. [VERIFIED: codebase grep] |
| Selection routing | Custom panel-local selection model | `usePreviewSelectionStore.selectSection/clearSelection` | Shared Preview/Outline/Semantic Connections surface already exists. [VERIFIED: codebase grep] |
| FlashQuery graph extraction | Local graph inference | FlashQuery `get_document` and `query_graph` | Cate consumes graph data; FlashQuery owns graph generation/storage. [VERIFIED: product requirements] |
| Test runner/UI harness | New testing stack | Vitest + Testing Library + Playwright | Existing project tooling and product test plan align on these layers. [VERIFIED: product test plan] |

**Key insight:** The complex part is not rendering rows; it is preserving typed graph data across four boundaries without corrupting the embeddings-only fallback: FlashQuery MCP -> main normalization -> preload/shared contract -> provider translation -> panel UI. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: `score` Requiredness Silently Drops Graph Rows

**What goes wrong:** Current main and renderer validators reject connections without finite numeric `score`. [VERIFIED: codebase grep]
**Why it happens:** Existing embeddings-only contract treats cosine score as required. [VERIFIED: codebase grep]
**How to avoid:** Make `score` optional where graph rows can use `confidenceScore`; sort by `confidenceScore` then score. [VERIFIED: product requirements]
**Warning signs:** T-U-026 or malformed-result component tests fail. [VERIFIED: product test plan]

### Pitfall 2: `get_document` Does Not Request `graph_summary`

**What goes wrong:** Provider cannot derive typed/mixed/embeddings-only mode correctly. [VERIFIED: codebase grep]
**Why it happens:** `normalizeDocumentConnectionsArgs()` currently sets `include: ['connections']`. [VERIFIED: codebase grep]
**How to avoid:** Extend `FlashQueryDocumentPart` and request/normalize `graph_summary` for document connections. [VERIFIED: FlashQuery source]
**Warning signs:** Graph-enabled empty data looks identical to embeddings-only fallback. [VERIFIED: product requirements]

### Pitfall 3: `query_graph` Backfill Blocks First Paint

**What goes wrong:** The panel waits for N per-chunk graph calls before showing connection data. [VERIFIED: product requirements]
**Why it happens:** Node metadata is needed for attention/sections, but first paint only requires `get_document` overlay. [VERIFIED: product requirements]
**How to avoid:** Render from `get_document` first, expose `nodeMetaLoading`, and merge metadata progressively by preview chunk ID. [VERIFIED: product requirements]
**Warning signs:** Loading state persists until all chunks finish or a single chunk failure blanks the graph panel. [VERIFIED: product test plan]

### Pitfall 4: Mixing Edge Staleness and Node Staleness

**What goes wrong:** UI labels target node freshness as edge stale status or shows stale/deleted edges as actionable. [VERIFIED: product requirements]
**Why it happens:** FlashQuery exposes edge `status/stale` and target health-tier fields separately. [VERIFIED: FlashQuery source]
**How to avoid:** Keep edge `status`/`stale` separate from `targetStale`, `targetAnalyzedAt`, and node `stale`. [VERIFIED: product requirements]
**Warning signs:** Stale/deleted edges appear in attention/connection rows. [VERIFIED: product requirements]

### Pitfall 5: Test ID Drift

**What goes wrong:** Existing tests use prior milestone IDs, while v1.6 product docs require REQ/T-ID traceability. [VERIFIED: codebase grep]
**Why it happens:** The component and provider tests already predate Phase 27. [VERIFIED: codebase grep]
**How to avoid:** Add product test IDs in new/updated test names or comments while preserving existing regression coverage. [VERIFIED: product test plan]

## Code Examples

### FlashQuery `query_graph` Shape

```typescript
// Source: FlashQuery src/mcp/tools/graph.ts and src/graph/queries.ts
type QueryGraphInput = {
  action: 'node' | 'edges' | 'neighbors' | 'subgraph' | string
  chunk_id?: string
  direction?: 'in' | 'out' | 'both'
  include_content?: boolean
  limit?: number
}
```

### Provider Mode Derivation

```typescript
// Source: Product REQ-006, implement as pure helper
function deriveMode(hasGraphSummary: boolean, edgeCount: number, connections: readonly SemanticConnection[]) {
  if (!hasGraphSummary || edgeCount === 0) return 'embeddings-only'
  return connections.every((connection) => connection.rel) ? 'typed' : 'mixed'
}
```

### Edge Display Fallback

```typescript
// Source: Existing scEdgeLabel pattern
function safeRelationLabel(rel: string, dir?: SemanticConnectionDirection) {
  const edge = SC_EDGE[rel as SemanticConnectionRel]
  if (!edge) return titleCase(rel.replace(/_/g, ' '))
  return edge.kind === 'symmetric' ? titleCase(edge.sym ?? rel) : titleCase((dir === 'in' ? edge.in : edge.out) ?? rel)
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Embeddings-only flat cards | Graph-aware whole-document + section graph inspector with embeddings fallback | v1.6 planning, 2026-06-30 | Provider must support typed/mixed/embeddings-only modes. [VERIFIED: REQUIREMENTS.md] |
| `get_document include:['connections']` only | `get_document include:['connections','graph_summary']` plus `query_graph` node/edge backfill | Product docs dated 2026-06-27 and FlashQuery source verified 2026-06-30 | Main/preload/provider contract must expand. [VERIFIED: product requirements] [VERIFIED: FlashQuery source] |
| Card-era typed labels | Relation groups, attention rows, section list | v1.6 planning, 2026-06-30 | Whole-document graph mode should not render card UI except fallback. [VERIFIED: product requirements] |

**Deprecated/outdated:**
- Treating relation filters as "nature sort" over cards is insufficient for Phase 27 graph mode; graph mode needs grouped relation lists and attention/sections unaffected by relation filters. [VERIFIED: product requirements]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `vitest` slopcheck SUS verdict is a false positive typo heuristic because the repo already uses Vitest as its established test runner. [ASSUMED] | Package Legitimacy Audit | Planner might add an unnecessary human checkpoint before running existing tests. |

## Open Questions

1. **Where are `27-CONTEXT.md` and `27-UI-SPEC.md`?**
   - What we know: The requested phase-local files were absent. [VERIFIED: codebase grep]
   - What's unclear: Whether they were not generated or live outside the phase directory. [ASSUMED]
   - Recommendation: Planner should proceed from ROADMAP/REQUIREMENTS/product docs, but add a checkpoint if those files appear before execution. [ASSUMED]

2. **Should `query_graph` edge metadata backfill happen in Phase 27 or be stubbed for Phase 28 edge detail?**
   - What we know: REQ-023 spans Phase 27 and Phase 28; roadmap says Phase 27 includes foundation/node backfill. [VERIFIED: ROADMAP.md]
   - What's unclear: Whether Phase 27 should fetch edge traversal data now or only create the bridge and node metadata. [ASSUMED]
   - Recommendation: Implement the bridge and node backfill in Phase 27; design the provider API so Phase 28 can add lazy edge metadata merge without another IPC contract change. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Typecheck/tests/build | ✗ current shell outside engine | v26.0.0, project requires `>=20 <23` | Use Node 20 or 22 before running npm verification. [VERIFIED: shell] [VERIFIED: package.json] |
| npm | Scripts/package registry checks | ✓ | 11.12.1 | — [VERIFIED: shell] |
| git | Diff/status and repo workflow | ✓ | 2.50.1 | — [VERIFIED: shell] |
| rg | Codebase research | ✓ | 15.1.0 | — [VERIFIED: shell] |
| FlashQuery local repo | Source contract verification | ✓ | commit `dbb7143f` | Product docs if unavailable. [VERIFIED: git] |

**Missing dependencies with no fallback:**
- A Node runtime matching `>=20 <23` is required before reliable `npm run typecheck`/`npm run test:unit`; current shell Node is v26.0.0 and triggers `EBADENGINE`. [VERIFIED: shell]

**Missing dependencies with fallback:**
- None. [VERIFIED: shell]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + jsdom/Testing Library for TSX, Playwright 1.60.0 for E2E. [VERIFIED: package-lock] |
| Config file | `vitest.config.ts`, `playwright.config.ts`. [VERIFIED: codebase grep] |
| Quick run command | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts` [VERIFIED: product test plan] |
| Full suite command | `npm run test:unit && npm run typecheck` for Phase 27 gate; add `npm run test:e2e` only if Phase 27 adds app-shell E2E. [VERIFIED: ROADMAP.md] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-001/004/010/011 | Relation metadata, grouping, sorting, optional scores, Top-N helpers | unit | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts` | Yes [VERIFIED: codebase grep] |
| REQ-002/005/006/023 | Provider mapping, mode derivation, diagnostics, node metadata backfill | unit | `npm run test:unit -- src/renderer/lib/semanticConnectionsProvider.test.ts` | Yes [VERIFIED: codebase grep] |
| REQ-003/021/023 | Main normalization, graph summary, token redaction, query_graph manager method | unit | `npm run test:unit -- src/main/flashquery/clientManager.test.ts` | Yes [VERIFIED: codebase grep] |
| REQ-003/023 | IPC validation and channel registration | unit | `npm run test:unit -- src/main/ipc/flashquery.test.ts src/preload/index.test.ts` | Yes [VERIFIED: codebase grep] |
| REQ-002/007/008/009/010/011/021 | Whole-document graph UI and fallback/error states | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | Yes [VERIFIED: codebase grep] |

### Sampling Rate

- **Per task commit:** targeted test file for the touched layer. [VERIFIED: product test plan]
- **Per wave merge:** all Phase 27 targeted files plus `npm run typecheck`. [VERIFIED: ROADMAP.md]
- **Phase gate:** `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` and `npm run typecheck`. [VERIFIED: ROADMAP.md]

### Wave 0 Gaps

- [ ] Add/rename tests to preserve v1.6 product IDs T-U-001 through T-C-029 and T-I-001 through T-I-009 in existing files. [VERIFIED: product test plan]
- [ ] Add `query_graph` preload tests because current `src/preload/index.test.ts` only covers E2E bridge gating. [VERIFIED: codebase grep]
- [ ] Ensure Node 20/22 is active before running npm scripts. [VERIFIED: package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Bearer token remains in main-process credential path; renderer receives no token. [VERIFIED: codebase grep] |
| V3 Session Management | no | MCP calls are workspace-scoped stateless requests, not renderer sessions. [VERIFIED: AGENTS.md] |
| V4 Access Control | yes | Main IPC validation gates workspace ID and graph query params before MCP call. [VERIFIED: codebase grep] |
| V5 Input Validation | yes | TypeScript validators in `src/main/ipc/flashquery.ts`; no raw renderer params to MCP. [VERIFIED: codebase grep] |
| V6 Cryptography | yes | Do not hand-roll crypto; preserve existing token redaction and MCP SDK transport. [VERIFIED: codebase grep] |

### Known Threat Patterns for Electron/FlashQuery Graph IPC

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Renderer invokes arbitrary MCP tool | Elevation of privilege | Expose only `flashqueryQueryGraph()` with validated action/params, not generic `callTool`. [VERIFIED: Electron docs] |
| Bearer token in diagnostics | Information disclosure | Use existing `errorToSafeMessage()` redaction pattern and add tests for graph errors. [VERIFIED: codebase grep] |
| Malformed graph payload crashes renderer | Denial of service | Omit invalid optional fields, record diagnostics, keep valid rows. [VERIFIED: product requirements] |
| Bulk `query_graph` returns full chunk content unexpectedly | Information disclosure | Preserve `include_content` defaults and pass `false` for bulk edge/neighbor backfill unless content is explicitly needed. [VERIFIED: FlashQuery source] |

## Sources

### Primary (HIGH confidence)

- `/Users/matt/Documents/Claude/Projects/Cate/cate/AGENTS.md` - project constraints. [VERIFIED: AGENTS.md]
- `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md` - phase scope, waves, requirements, validation commands. [VERIFIED: codebase grep]
- Product requirements and test plan under `flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/` - REQ/T-ID behavior. [VERIFIED: product requirements]
- Cate source files listed in the research prompt - live implementation and tests. [VERIFIED: codebase grep]
- FlashQuery local source `src/mcp/tools/graph.ts`, `src/graph/queries.ts`, `src/mcp/utils/document-connections.ts`, `src/mcp/utils/document-output.ts` - graph payload shape. [VERIFIED: FlashQuery source]
- Context7 `/electron/electron` - contextBridge/preload IPC guidance. [CITED: https://github.com/electron/electron/blob/main/docs/tutorial/context-isolation.md]
- Context7 `/reactjs/react.dev` - list rendering and effect cleanup patterns. [CITED: https://github.com/reactjs/react.dev/blob/main/src/content/learn/rendering-lists.md]

### Secondary (MEDIUM confidence)

- npm registry current-version checks for package currency; no package upgrades recommended. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- None. [VERIFIED: codebase grep]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing package lock and AGENTS.md define the stack; no new package decisions. [VERIFIED: package-lock]
- Architecture: HIGH - code paths and Electron docs agree on shared/main/preload/renderer responsibilities. [VERIFIED: codebase grep]
- Pitfalls: HIGH - each pitfall maps to current code limitations or explicit product requirements. [VERIFIED: product requirements]

**Research date:** 2026-06-30
**Valid until:** 2026-07-07 for FlashQuery graph payload details; 2026-07-30 for Cate architecture and test infrastructure. [ASSUMED]
