---
phase: 27-graph-data-contract-and-whole-document-graph-view
verified: 2026-07-01T00:09:10Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open Cate's Semantic Connections panel with deterministic graph fixture data in a dock."
    expected: "Whole-document graph mode is visually coherent: Summary, Needs attention, Sections, grouped Connections, config controls, and responsive truncation/wrapping are usable without overlap."
    why_human: "Automated component tests verify DOM behavior and classes, but final dock visual quality and interaction feel require human inspection."
---

# Phase 27: Graph Data Contract and Whole-Document Graph View Verification Report

**Phase Goal:** Safely carry FlashQuery typed graph data through Cate and render the whole-document graph intelligence experience without regressing embeddings-only Semantic Connections.
**Verified:** 2026-07-01T00:09:10Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Context Resolution

The actual Cate phase artifacts were found and verified at `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/phases/27-graph-data-contract-and-whole-document-graph-view/`. This report is written in the Cate repo alongside the Phase 27 planning artifacts.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | Embeddings-only panel behavior remains green and graph-only controls stay hidden in fallback mode. | VERIFIED | `SemanticConnectionsPanel.tsx` gates graph UI on graph document structure and mode. In `SemanticConnectionsPanel.test.tsx`: `T-C-001` (embeddings-only cards render, nature sort/filter hidden), `T-C-002` (stale cached fallback stays visible while fresh data loads), and `T-C-021`/`T-C-025` (embeddings-only stays flat, graph controls hidden) pass. |
| 2 | Graph fields survive main/preload/shared normalization and invalid optional fields do not discard valid rows. | VERIFIED | `src/shared/types.ts` defines `graph_summary`, source chunks, target health fields, and `FlashQueryQueryGraph*`; `clientManager.ts` normalizes graph overlay and diagnostics; T-I-001/T-I-002/T-I-003/T-I-007/T-I-008 pass. |
| 3 | `query_graph` node metadata backfill is progressive, credential-safe, and partial-failure tolerant. | VERIFIED | `FLASHQUERY_QUERY_GRAPH`, `flashqueryQueryGraph()`, IPC validation, and provider `backfillNodeMeta()` are wired; T-I-005/T-I-006/T-I-009 and T-U-023/T-U-025 pass. |
| 4 | Whole-document graph mode renders Summary, Needs attention, Sections, grouped Connections, Top-N, relation filters, and chrome state. | VERIFIED | `WholeDocumentGraphView` renders summary/attention/sections/grouped rows; `groupWholeDocumentConnections()` handles grouping/sorting; T-C-005 through T-C-030 plus T-C-063/T-C-064 pass. |
| 5 | Attention rows, section rows, and traceable whole-document connection rows select the local preview section without opening the wrong target. | VERIFIED | Panel calls `usePreviewSelectionStore.getState().selectSection(...)` for section, attention, and traceable graph row navigation; T-C-017/T-C-026/T-C-027 pass. |
| 6 | Graph relation data can cross Cate's shared/main/renderer boundary without requiring embeddings scores. | VERIFIED | `SemanticConnection.score` is optional; graph rows use `confidenceScore` fallback; T-U-002/T-U-026 and typecheck pass. |
| 7 | FlashQuery `get_document` graph summaries and partial graph rows remain useful when optional graph fields are malformed. | VERIFIED | `normalizeDocumentConnectionsResponse()` preserves valid rows and adds redacted diagnostics; T-I-003 and T-U-016 pass. |
| 8 | FlashQuery source chunks map to Cate preview chunk IDs without putting graph-only chunk IDs into preview selection state. | VERIFIED | `mapFlashQueryChunksToPreview()` builds `chunkMap` keyed by preview IDs and retains FlashQuery IDs separately; T-U-009/T-U-010/T-U-011 pass. |
| 9 | Provider derives typed, mixed, or embeddings-only mode from graph summary and relation coverage. | VERIFIED | `deriveMode()` uses `graph_summary.edge_count` and rendered relation coverage; T-U-012/T-U-013/T-U-014 pass. |
| 10 | Node metadata backfill degrades one chunk only on `query_graph` failure. | VERIFIED | `backfillNodeMeta()` records per-chunk diagnostics while keeping other graph data; T-U-015/T-U-025 pass. |
| 11 | Top-N and relation filters affect connection lists only, never Summary, Needs attention, or Sections. | VERIFIED | Panel computes filtered `scopedConnections` for grouped rows only; T-C-012/T-C-022/T-C-023 pass. |
| 12 | Dock chrome publishes accurate count and config active state without fixed-width or overlapping UI classes. | VERIFIED | `setPanelChrome(panelId, { connectionCount, configActive, ... })` is wired; responsive/truncating class tests T-C-028/T-C-029 pass. |
| 13 | FlashQuery bearer tokens and connection credentials do not appear in normalized graph diagnostics or renderer graph API. | VERIFIED | `redactSensitiveText()`/`safeDiagnostic()` are used for graph diagnostics; preload exposes typed `flashqueryQueryGraph()` and no `flashqueryCallTool`; T-U-028 and preload T-I-005/T-I-009 pass. |

**Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/renderer/lib/semanticConnections.ts` | Graph-aware types, relation metadata, optional score, grouping helpers | VERIFIED | 321 lines; defines full relation union, `SC_EDGE`, `scEdgeLabel()`, `groupWholeDocumentConnections()`, confidence sorting. |
| `src/shared/types.ts` | Shared graph summary, source chunk, target health, query_graph contracts | VERIFIED | Defines `FlashQueryDocumentPart` with `graph_summary`; graph connection/summary/source chunk/query graph types. |
| `src/main/flashquery/clientManager.ts` | Main normalization, redacted diagnostics, query_graph client route | VERIFIED | `documentConnections()` requests `connections` + `graph_summary`; `queryGraph()` calls MCP `query_graph`; normalization preserves graph fields. |
| `src/main/ipc/flashquery.ts` | Validated get_document/query_graph IPC boundary | VERIFIED | Validates include/options and `query_graph` params; registers `FLASHQUERY_QUERY_GRAPH`. |
| `src/preload/index.ts` and `src/shared/electron-api.d.ts` | Renderer-safe `flashqueryQueryGraph()` bridge | VERIFIED | Preload invokes `FLASHQUERY_QUERY_GRAPH`; API declaration exposes typed method only. |
| `src/renderer/lib/semanticConnectionsProvider.ts` | Mode derivation, chunk mapping, node metadata backfill | VERIFIED | Builds `chunkMap`, `byChunkId`, mode, diagnostics, and `nodeMeta` via injected query graph function. |
| `src/renderer/panels/SemanticConnectionsPanel.tsx` | Whole-document graph UI, navigation, filters, chrome state | VERIFIED | Renders Summary/Attention/Sections/Connections, navigates through preview selection store, publishes chrome. |
| Phase tests | Required T-U/T-I/T-C coverage for Phase 27 | VERIFIED | Focused suites pass locally: renderer/provider and panel tests include grep-able T-C-001..T-C-004, T-U-004, and active-edge invariant T-C-030 coverage. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `clientManager.ts` | `types.ts` | `FlashQueryDocumentConnectionsResponse`, `GraphDocumentSummary`, target health fields | WIRED | Shared graph contract is imported and returned by main normalization. |
| `flashquery.ts` | `clientManager.ts` | `validateQueryGraphParams()` then `flashQueryClientManager.queryGraph()` | WIRED | IPC validates untrusted params and delegates to typed client method. |
| `preload/index.ts` | `ipc-channels.ts` | `ipcRenderer.invoke(FLASHQUERY_QUERY_GRAPH, ...)` | WIRED | Renderer API is typed in `electron-api.d.ts`. |
| `semanticConnectionsProvider.ts` | `window.electronAPI.flashqueryQueryGraph` | dependency-injected `queryGraph` function | WIRED | Provider uses graph bridge to backfill `nodeMeta`. |
| `SemanticConnectionsPanel.tsx` | `previewSelectionStore.ts` | `selectSection()` | WIRED | Section, attention, and traceable graph rows select preview chunk IDs. |
| `SemanticConnectionsPanel.tsx` | `semanticConnectionsChromeStore.ts` | `setPanelChrome()` | WIRED | Publishes count/config state and unregisters on cleanup. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `clientManager.ts` | `connections`, `source_chunks`, `graph_summary` | FlashQuery MCP `get_document` with `include: ['connections','graph_summary']` | Yes | FLOWING |
| `clientManager.ts` | query graph payload | FlashQuery MCP `query_graph` | Yes | FLOWING |
| `semanticConnectionsProvider.ts` | `SemanticConnectionsResult` | `window.electronAPI.flashqueryDocumentConnections()` and injected `queryGraph()` | Yes | FLOWING |
| `SemanticConnectionsPanel.tsx` | `result` | Provider `load()` result, validated by `isSemanticConnectionsResult()` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Renderer/provider graph contract tests | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts` | 2 files, 30 tests passed | PASS |
| Main/preload graph IPC tests | `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts` | 3 files, 95 tests passed | PASS |
| Whole-document panel tests | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | 1 file, 35 tests passed | PASS |
| Active edge invariant | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | T-C-030 asserts stale/deleted graph edges are absent from grouped connection lists, dock chrome counts, connected chunk markers, and section tallies | PASS |
| Phase 27 test ID coverage | Retired temporary gap-resolution guard | Required Phase 27 component/provider IDs, including T-C-001..T-C-004 and T-U-004, were verified during v1.6 gap closeout; normal `npm test` coverage remains authoritative | PASS |
| TypeScript graph-expanded contracts | `npm run typecheck` | `tsc --noEmit` passed | PASS |

Note: local commands ran under Node `v26.0.0`; Cate officially supports Node 20/22. Orchestrator evidence reports `npm run build` and full `npm test` passed after review fix.

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| Phase probes | `find scripts -path '*/tests/probe-*.sh' -type f` | No phase-declared or conventional probes found for this UI/data-contract phase | SKIP |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| REQ-001 | 27-01 | Graph-aware semantic connection types and optional scores | SATISFIED | Types/helpers in `semanticConnections.ts`; T-U-001/T-U-002/T-U-003/T-U-026 pass. |
| REQ-002 | 27-02/27-03 | Embeddings-only fallback preserved | SATISFIED | Provider and panel fallback tests pass; graph controls hidden in fallback. |
| REQ-003 | 27-01 | Normalize `get_document` graph payloads | SATISFIED | Shared/main normalization and IPC tests T-I-001..004/T-I-007/T-I-008 pass. |
| REQ-004 | 27-01/27-03 | Complete safe edge display metadata | SATISFIED | `SC_EDGE`, labels, unknown relation fallback, grouping helpers tested. |
| REQ-005 | 27-02 | Source chunks map to preview chunk IDs | SATISFIED | `mapFlashQueryChunksToPreview()` and T-U-009/T-U-010/T-U-011. |
| REQ-006 | 27-02 | Typed/mixed/embeddings mode and partial diagnostics | SATISFIED | `deriveMode()` and diagnostics tests T-U-012..016. |
| REQ-007 | 27-03 | Whole-document community Summary | SATISFIED | `WholeDocumentGraphView`; T-C-005/T-C-006/T-C-007. |
| REQ-008 | 27-03 | Needs attention for contradictions/questions/uncertainty | SATISFIED | T-C-008..012/T-C-026/T-C-063. |
| REQ-009 | 27-03 | Ordered graph-enhanced Sections list | SATISFIED | T-C-013..017. |
| REQ-010 | 27-03 | Grouped/sorted typed whole-document connections | SATISFIED | `groupWholeDocumentConnections()` and T-U-017/T-U-018/T-C-018..021/T-C-064. |
| REQ-011 | 27-03 | Top-N/relation filters scoped to connections | SATISFIED | T-C-022/T-C-023/T-C-024/T-C-025. |
| REQ-023 foundation/node backfill | 27-02 | Typed `query_graph` bridge and progressive node metadata backfill | SATISFIED | `FLASHQUERY_QUERY_GRAPH`, preload/API bridge, provider `backfillNodeMeta()`; T-I-005/T-I-006/T-I-009/T-U-023/T-U-025. Edge overlay consumption is explicitly Phase 28. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| - | - | No unresolved `TBD`, `FIXME`, `XXX`, placeholder implementation, or console-only handler found in Phase 27 modified files | - | - |

### Human Verification Required

#### 1. Dock Visual Smoke

**Test:** Open Cate's Semantic Connections panel with deterministic graph fixture data in a dock.
**Expected:** Whole-document graph mode is visually coherent: Summary, Needs attention, Sections, grouped Connections, config controls, and responsive truncation/wrapping are usable without overlap.
**Why human:** Automated component tests verify DOM behavior and classes, but final dock visual quality and interaction feel require human inspection.

### Gaps Summary

No blocking implementation gaps found for Phase 27's scoped goal. Full REQ-023 edge metadata overlay consumption, selection detail, local text filter, and integrated E2E hardening are intentionally deferred to Phase 28 per Cate roadmap and requirements.

---

_Verified: 2026-07-01T00:09:10Z_
_Verifier: the agent (gsd-verifier)_
