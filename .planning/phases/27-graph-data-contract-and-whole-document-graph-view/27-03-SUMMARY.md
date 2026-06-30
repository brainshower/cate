---
phase: 27-graph-data-contract-and-whole-document-graph-view
plan: 03
subsystem: semantic-connections-graph-ui
tags: [electron, react, semantic-connections, graph-intelligence, vitest]

requires:
  - phase: 27-graph-data-contract-and-whole-document-graph-view
    provides: Graph contracts, provider mode derivation, chunk mapping, and query_graph node backfill from 27-01 and 27-02
provides:
  - Whole-document graph Summary, Needs attention, Sections, and grouped Connections UI
  - Relation-priority grouping helpers with confidence-score sorting and similarity catch-all behavior
  - Top-N and relation filters scoped to connection lists only
  - Whole-document source-section navigation and dock chrome count/config publication
affects: [phase-27, phase-28, semantic-connections, graph-intelligence]

tech-stack:
  added: []
  patterns:
    - RED/GREEN component tests for graph UI slices
    - Pure relation grouping helper feeding dock-native React rendering
    - Whole-document graph rows select source sections through previewSelectionStore only

key-files:
  created:
    - .planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-03-SUMMARY.md
  modified:
    - src/renderer/lib/semanticConnections.ts
    - src/renderer/lib/semanticConnections.test.ts
    - src/renderer/panels/SemanticConnectionsPanel.tsx
    - src/renderer/panels/SemanticConnectionsPanel.test.tsx

key-decisions:
  - "Whole-document graph mode activates only when graph document structure is present, preserving sparse mixed and embeddings-only fallback behavior."
  - "Top-N uses relation-priority ordering for graph whole-document rows before per-group overflow is applied."
  - "Whole-document row navigation derives source sections from byChunkId membership and records local diagnostics when a row is untraceable."

patterns-established:
  - "Keep graph-only Summary/Attention/Sections/Connections unmounted for embeddings-only results."
  - "Use grouped relation helpers for whole-document rows instead of card-era score UI."

requirements-completed: [REQ-004, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-019, REQ-020, REQ-022]

duration: 18m
completed: 2026-06-30
---

# Phase 27 Plan 03: Whole-Document Graph UI Summary

**Cate's Semantic Connections panel now renders whole-document graph triage with Summary, attention rows, graph sections, grouped relation connections, Top-N/filter scoping, and source-section navigation.**

## Performance

- **Duration:** 18m
- **Started:** 2026-06-30T23:34:00Z
- **Completed:** 2026-06-30T23:52:47Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added whole-document graph mode rendering for community Summary, Needs attention categories, and graph-enhanced Sections.
- Added relation-priority grouping and confidence-score sorting for graph Connections, with Top-N and relation filters scoped to connection rows only.
- Preserved embeddings-only fallback cards/list behavior and hid graph-only controls outside graph mode.
- Wired attention, section, and traceable whole-document connection rows to local preview section selection.
- Published dock chrome count/config state while keeping future filter-active state separate.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: graph summary/attention/sections tests** - `b46ccb0` (test)
2. **Task 1 GREEN: graph summary/attention/sections UI** - `c3b3335` (feat)
3. **Task 2 RED: grouped graph connection tests** - `a49a1e7` (test)
4. **Task 2 GREEN: grouped graph connection UI/helpers** - `c27e06b` (feat)
5. **Task 3 RED: graph row navigation/chrome tests** - `69a64dc` (test)
6. **Task 3 GREEN: graph row navigation/chrome wiring** - `d77834e` (feat)

**Plan metadata:** pending final metadata commit.

## Files Created/Modified

- `src/renderer/lib/semanticConnections.ts` - Added whole-document relation grouping helpers with graph priority and confidence sorting.
- `src/renderer/lib/semanticConnections.test.ts` - Added T-U-017 and T-U-018 coverage for relation grouping and confidence sorting.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` - Added graph Summary, Needs attention, Sections, grouped Connections, source navigation, diagnostics, and chrome-safe count behavior.
- `src/renderer/panels/SemanticConnectionsPanel.test.tsx` - Added component coverage for T-C-005 through T-C-029 plus T-C-063 and T-C-064.

## Decisions Made

- Whole-document graph mode requires graph document structure (`chunkMap`/`chunkOrder`) so older sparse mixed fixtures keep card-era behavior.
- Graph whole-document Top-N uses relation-priority ordering before group overflow, matching the triage-first UI requirement.
- Untraceable whole-document graph rows no-op locally and increment a renderer diagnostic counter rather than opening targets or guessing.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope expansion; implementation stayed within whole-document graph UI, grouping, scoped filters, navigation, and chrome state.

## Issues Encountered

- The required Node precheck fails in this shell because only Node `v26.0.0` is available; Cate verification is specified for Node 20 or 22. Focused suites and typecheck passed under the available runtime.

## Verification

- `node -e "const [major]=process.versions.node.split('.').map(Number); if (major !== 20 && major !== 22) throw new Error('Use Node 20 or 22 for Cate verification, not Node '+process.versions.node)"` - FAIL in this shell: Node `v26.0.0`.
- `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` - PASS, 34 tests.
- `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts` - PASS, 29 tests.
- `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts` - PASS, 95 tests.
- `npm run typecheck` - PASS.

## Known Stubs

None.

## Threat Flags

None beyond the plan threat model. Renderer graph UI consumes normalized provider data only, uses preview selection store for local navigation, and adds no Electron/Node/credential access.

## User Setup Required

None.

## Next Phase Readiness

Phase 27 is complete. Phase 28 can build the selected-section graph detail, local text filter, edge metadata overlay, final chrome polish, and integrated Electron regression coverage on top of this whole-document graph view.

## Self-Check: PASSED

- Created summary file exists.
- Task commits are present in git history.
- Focused renderer/provider tests, main/preload IPC tests, and typecheck passed, with the Node-version precheck caveat documented.

---
*Phase: 27-graph-data-contract-and-whole-document-graph-view*
*Completed: 2026-06-30*
