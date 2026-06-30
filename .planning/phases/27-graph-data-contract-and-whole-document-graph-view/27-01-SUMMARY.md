---
phase: 27-graph-data-contract-and-whole-document-graph-view
plan: 01
subsystem: flashquery-graph-contract
tags: [electron, ipc, flashquery, graph, semantic-connections, vitest]

requires: []
provides:
  - Graph-aware renderer semantic connection relation metadata and optional-score support
  - Shared FlashQuery get_document graph summary, graph overlay, source chunk, and target health contracts
  - Main-process graph payload normalization with credential-safe diagnostics
  - IPC validation for graph-aware get_document include and connection option shapes
affects: [phase-27, phase-28, semantic-connections, flashquery-ipc]

tech-stack:
  added: []
  patterns:
    - Contract-first graph payload normalization across shared/main/renderer boundaries
    - Optional graph fields are omitted or diagnosed rather than rejecting valid rows

key-files:
  created:
    - .planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-01-SUMMARY.md
  modified:
    - src/renderer/lib/semanticConnections.ts
    - src/renderer/lib/semanticConnections.test.ts
    - src/renderer/lib/semanticConnectionsProvider.ts
    - src/renderer/lib/semanticConnectionsProvider.test.ts
    - src/shared/types.ts
    - src/main/flashquery/clientManager.ts
    - src/main/flashquery/clientManager.test.ts
    - src/main/ipc/flashquery.ts
    - src/main/ipc/flashquery.test.ts
    - src/renderer/panels/SemanticConnectionsPanel.tsx

key-decisions:
  - "Graph document connection requests now include graph_summary with connections by default."
  - "Graph-only rows may omit score; renderer score UI is hidden when score is absent."
  - "Malformed optional graph fields become redacted diagnostics while valid rows remain."

patterns-established:
  - "Use optional graph fields in shared contracts and preserve unknown metadata as opaque data."
  - "Validate untrusted renderer graph include/options at the IPC boundary before manager dispatch."

requirements-completed: [REQ-001, REQ-003, REQ-004, REQ-021]

duration: 11m 17s
completed: 2026-06-30
---

# Phase 27 Plan 01: Graph Data Contract Summary

**Graph-aware FlashQuery document connection contracts now carry relation metadata, graph summaries, source chunks, target health fields, and credential-safe diagnostics across Cate boundaries.**

## Performance

- **Duration:** 11m 17s
- **Started:** 2026-06-30T23:09:16Z
- **Completed:** 2026-06-30T23:20:33Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Expanded renderer semantic connection contracts to cover all graph relations, relation display metadata, optional scores, node/community/result fields, target health fields, and unknown-relation diagnostics.
- Extended shared/main FlashQuery document connection contracts to preserve graph summary, graph overlay fields, source chunks, and target health-tier fields.
- Added credential-safe malformed optional-field diagnostics and IPC validation for graph-aware include/options shapes.

## Task Commits

1. **Task 1 RED: renderer graph relation contract tests** - `0220c73` (test)
2. **Task 1 GREEN: renderer graph relation contract** - `32ac93d` (feat)
3. **Task 2 RED: graph payload normalization tests** - `a4d7558` (test)
4. **Task 2 GREEN: graph payload normalization** - `b442aac` (feat)
5. **Task 3 RED: graph IPC validation tests** - `abf0736` (test)
6. **Task 3 GREEN: graph IPC validation** - `479ea82` (feat)
7. **Auto-fix: optional score typecheck compatibility** - `b70b382` (fix)

**Plan metadata:** pending final metadata commit.

## Files Created/Modified

- `src/renderer/lib/semanticConnections.ts` - Expanded graph relation types, metadata, optional scores, target health fields, node/community result fields, and unknown relation diagnostics.
- `src/renderer/lib/semanticConnectionsProvider.ts` - Preserves graph-aware connection fields, optional scores, graph summary/community/node result fields, and unknown relation diagnostics.
- `src/shared/types.ts` - Adds `graph_summary`, graph overlay fields, optional document connection scores, diagnostics, and target health fields.
- `src/main/flashquery/clientManager.ts` - Requests `include:['connections','graph_summary']`, preserves graph payloads, diagnoses malformed optional graph fields, and redacts secrets.
- `src/main/ipc/flashquery.ts` - Accepts graph-aware include values and rejects invalid graph connection option shapes.
- Test files under `src/renderer/lib`, `src/main/flashquery`, and `src/main/ipc` - Add Wave 1 TDD and regression coverage.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` - Hides score pie for graph-only rows without score.

## Decisions Made

- `documentConnections()` requests `graph_summary` with `connections` so downstream provider mode derivation has the document graph summary available.
- Optional graph fields remain optional and opaque at the renderer contract; malformed optional values are diagnosed rather than causing whole-response failure.
- Score-specific UI remains guarded because graph-only rows may carry confidence without embedding score.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed optional-score typecheck regression**
- **Found during:** Task 3 verification
- **Issue:** Making `SemanticConnection.score` optional exposed a renderer assumption that every row could render `ScorePie`, and the main normalizer missed an imported connection type.
- **Fix:** Guarded `ScorePie` rendering when score is absent and imported the shared normalized connection type.
- **Files modified:** `src/renderer/panels/SemanticConnectionsPanel.tsx`, `src/main/flashquery/clientManager.ts`
- **Verification:** `npm run typecheck` passed.
- **Committed in:** `b70b382`

---

**Total deviations:** 1 auto-fixed (Rule 1).
**Impact on plan:** Required compatibility fix for the optional-score contract; no scope expansion beyond keeping existing renderer code type-safe.

## Issues Encountered

- The required Node precheck failed because this shell only has Node `v26.0.0`; Cate requires Node 20 or 22 for official verification. Focused Vitest suites and typecheck still passed under the available shell runtime.

## Verification

- `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts` - PASS, 20 tests.
- `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts` - PASS, 87 tests.
- `npm run typecheck` - PASS.
- Node 20/22 precheck - FAIL in this shell: `Use Node 20 or 22 for Cate verification, not Node 26.0.0`.

## Known Stubs

None.

## Threat Flags

None beyond the plan threat model. Renderer graph options remain validated at IPC; main-process diagnostics redact bearer tokens and credential-bearing URLs.

## User Setup Required

None.

## Next Phase Readiness

Plan 27-02 can build provider mode derivation, chunk mapping, and `query_graph` backfill on the expanded graph contract and normalized `get_document` payloads.

## Self-Check: PASSED

- Created summary file exists.
- Task commits are present in git history.
- Focused unit verification and typecheck passed, with the Node-version precheck caveat documented.

---
*Phase: 27-graph-data-contract-and-whole-document-graph-view*
*Completed: 2026-06-30*
