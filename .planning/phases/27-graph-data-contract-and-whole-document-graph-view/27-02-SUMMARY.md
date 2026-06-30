---
phase: 27-graph-data-contract-and-whole-document-graph-view
plan: 02
subsystem: flashquery-graph-provider
tags: [electron, ipc, preload, flashquery, query-graph, semantic-connections, vitest]

requires:
  - phase: 27-graph-data-contract-and-whole-document-graph-view
    provides: Graph-aware shared contracts and normalized get_document graph payloads from 27-01
provides:
  - Provider typed, mixed, and embeddings-only mode derivation from graph summary and relation coverage
  - FlashQuery source chunk to Cate preview chunk mapping with diagnostics for unmapped chunks
  - Typed query_graph main/preload/client bridge with renderer-safe API declaration
  - Provider node metadata backfill with per-chunk degradation diagnostics
affects: [phase-27, phase-28, semantic-connections, flashquery-ipc, graph-intelligence]

tech-stack:
  added: []
  patterns:
    - Dependency-injected renderer provider graph backfill for query_graph node metadata
    - Narrow typed Electron IPC bridge for FlashQuery graph queries instead of generic MCP calls
    - Provider keeps preview chunk IDs for local section state while retaining FlashQuery chunk IDs in chunkMap

key-files:
  created:
    - .planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-02-SUMMARY.md
  modified:
    - src/renderer/lib/semanticConnectionsProvider.ts
    - src/renderer/lib/semanticConnectionsProvider.test.ts
    - src/shared/ipc-channels.ts
    - src/shared/electron-api.d.ts
    - src/shared/types.ts
    - src/main/flashquery/clientManager.ts
    - src/main/flashquery/clientManager.test.ts
    - src/main/ipc/flashquery.ts
    - src/main/ipc/flashquery.test.ts
    - src/preload/index.ts
    - src/preload/index.test.ts

key-decisions:
  - "Bulk query_graph actions default include_content to false; action:'node' preserves FlashQuery's default content behavior."
  - "Provider node metadata backfill is dependency-injected and keyed by Cate preview chunk ID, with FlashQuery chunk IDs retained only for graph calls and diagnostics."
  - "REQ-023 remains split: Phase 27 Plan 02 implements the typed bridge and node metadata foundation; Phase 28 owns rich edge metadata overlay consumption."

patterns-established:
  - "Use flashqueryQueryGraph() as the only renderer-visible graph query bridge; do not expose generic MCP tool calls."
  - "Map source_chunks through heading path/source order into preview IDs before populating byChunkId/nodeMeta."

requirements-completed: [REQ-002, REQ-005, REQ-006, REQ-021, REQ-023]

duration: 10m 28s
completed: 2026-06-30
---

# Phase 27 Plan 02: Provider Graph Mode and Query Graph Backfill Summary

**Semantic Connections provider now derives graph modes, maps FlashQuery source chunks to Cate preview IDs, and backfills node metadata through a typed `query_graph` Electron bridge.**

## Performance

- **Duration:** 10m 28s
- **Started:** 2026-06-30T23:25:45Z
- **Completed:** 2026-06-30T23:36:13Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Added TDD coverage and implementation for provider mode derivation: `typed`, `mixed`, and `embeddings-only` now come from graph summary edge count plus relation coverage.
- Preserved Cate preview chunk IDs as the renderer-local section IDs while retaining FlashQuery source chunk IDs in `chunkMap` and diagnostics.
- Added `FLASHQUERY_QUERY_GRAPH`, shared query graph types, `FlashQueryClientManager.queryGraph()`, main IPC validation, preload bridge, and `window.electronAPI.flashqueryQueryGraph()`.
- Added provider node metadata backfill from `query_graph action:'node'`, including key claims, summaries, certainty/staleness/question fields, refs, community fields, content, analyzed/stale flags, and per-chunk diagnostics.

## Task Commits

1. **Task 1 RED: provider graph mode tests** - `18d56c3` (test)
2. **Task 1 GREEN: provider graph mode derivation** - `c26589e` (feat)
3. **Task 2 RED: query_graph bridge tests** - `c1ea26d` (test)
4. **Task 2 GREEN: typed query_graph bridge** - `0d7de93` (feat)
5. **Task 3 RED: node metadata backfill tests** - `9f9c9d2` (test)
6. **Task 3 GREEN: provider node metadata backfill** - `e887d7b` (feat)

**Plan metadata:** pending final metadata commit.

## Files Created/Modified

- `src/renderer/lib/semanticConnectionsProvider.ts` - Derives graph modes, maps source chunks through preview IDs, preserves graph fields, and backfills node metadata through injected `queryGraph`.
- `src/renderer/lib/semanticConnectionsProvider.test.ts` - Adds Wave 2 TDD coverage for T-U-009 through T-U-016, T-U-023, and T-U-025.
- `src/shared/ipc-channels.ts` - Adds `FLASHQUERY_QUERY_GRAPH`.
- `src/shared/electron-api.d.ts` - Declares renderer-safe `flashqueryQueryGraph()`.
- `src/shared/types.ts` - Adds shared `FlashQueryQueryGraphParams` and response contract.
- `src/main/flashquery/clientManager.ts` - Adds `queryGraph()` routed to FlashQuery MCP `query_graph` with bulk content gating.
- `src/main/flashquery/clientManager.test.ts` - Covers query_graph MCP routing and include_content defaults.
- `src/main/ipc/flashquery.ts` - Validates graph query params and returns per-call error objects across IPC.
- `src/main/ipc/flashquery.test.ts` - Covers query_graph IPC registration, validation, failure handling, and content gating.
- `src/preload/index.ts` - Exposes only `flashqueryQueryGraph()`, not a generic tool bridge.
- `src/preload/index.test.ts` - Covers preload bridge routing and absence of generic `flashqueryCallTool`.

## Decisions Made

- Bulk graph actions (`edges`, `neighbors`, `subgraph`) set `include_content:false` unless explicitly requested; `action:'node'` does not force that flag so node content can flow by default.
- Node metadata is merged after document connections load and keyed by preview chunk ID so Phase 27/28 UI code never needs to put graph-only chunk IDs into preview selection state.
- Query graph failure is per-call/per-chunk data, so IPC returns `{ error }` and provider records diagnostics rather than throwing through the renderer boundary.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion; implementation stayed within provider mode, source mapping, typed query_graph bridge, and node metadata backfill.

## Issues Encountered

- The required Node precheck fails in this shell because only Node `v26.0.0` is available; Cate verification is specified for Node 20 or 22. Focused unit suites and typecheck passed under the available runtime.

## Verification

- `node -e "const [major]=process.versions.node.split('.').map(Number); if (major !== 20 && major !== 22) throw new Error('Use Node 20 or 22 for Cate verification, not Node '+process.versions.node)"` - FAIL in this shell: Node `v26.0.0`.
- `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts` - PASS, 27 tests.
- `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts` - PASS, 95 tests.
- `npm run typecheck` - PASS.

## Known Stubs

None.

## Threat Flags

None beyond the plan threat model. The new renderer graph surface is a typed `flashqueryQueryGraph()` method with main-process validation; no bearer tokens, connection credentials, or generic MCP tool-call API are exposed to the renderer.

## User Setup Required

None.

## Next Phase Readiness

Plan 27-03 can build whole-document Summary, Needs attention, Sections, grouped connections, relation filters, Top-N allocation, navigation, and dock chrome on top of stable `mode`, `chunkMap`, `nodeMeta`, `nodeMetaLoading`, and diagnostics fields.

## Self-Check: PASSED

- Created summary file exists.
- Task commits are present in git history.
- Focused renderer/provider tests, main/preload IPC tests, and typecheck passed, with the Node-version precheck caveat documented.

---
*Phase: 27-graph-data-contract-and-whole-document-graph-view*
*Completed: 2026-06-30*
