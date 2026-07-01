---
phase: 28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin
plan: 01
subsystem: renderer-ui
tags: [react, typescript, vitest, semantic-connections, flashquery, query-graph]

requires:
  - phase: 27-graph-data-contract-and-whole-document-graph-view
    provides: typed graph result contracts, query_graph IPC/preload bridge, node metadata backfill, whole-document graph UI
provides:
  - query_graph edge metadata overlay merge by edge id
  - selected-section graph detail view with header, status notes, claims, and General connections
  - pure active-edge and claim grouping helpers
affects: [semantic-connections-panel, graph-intelligence, phase-28-plan-02, phase-28-plan-03, phase-28-plan-04]

tech-stack:
  added: []
  patterns:
    - provider-side query_graph enrichment with per-chunk degradation
    - pure renderer grouping helpers for selection claims and active edges
    - graph selection branch before embeddings/card fallback

key-files:
  created:
    - .planning/phases/28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin/28-01-SUMMARY.md
  modified:
    - src/renderer/lib/semanticConnectionsProvider.ts
    - src/renderer/lib/semanticConnectionsProvider.test.ts
    - src/renderer/lib/semanticConnections.ts
    - src/renderer/lib/semanticConnections.test.ts
    - src/renderer/panels/SemanticConnectionsPanel.tsx
    - src/renderer/panels/SemanticConnectionsPanel.test.tsx

key-decisions:
  - "Edge metadata overlay runs after node metadata backfill and degrades per chunk without blanking base get_document rows."
  - "Selection claim grouping is pure renderer logic: stale/deleted edges are removed first, valid source claim refs nest under claims, invalid or absent refs go to General connections."
  - "Structured claim objects are forward-compatible input only; v1 UI renders claim text and omits basis/per-claim question chrome."

patterns-established:
  - "Provider edge overlay: query_graph action edges, direction both, include_content false, merge recognized fields by connection id."
  - "Selection graph branch: activeChunkId plus typed/mixed graph mode renders section detail before fallback card mode."

requirements-completed: [REQ-012, REQ-013, REQ-014, REQ-019, REQ-020, REQ-021, REQ-023]

duration: 7min
completed: 2026-07-01
---

# Phase 28 Plan 01: Selection Detail Graph Surface Summary

**Selected graph sections now render inspectable status notes, ordered claims, claim-linked active edges, General connections, and query_graph edge metadata overlays.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-07-01T10:48:14Z
- **Completed:** 2026-07-01T10:55:27Z
- **Tasks:** 3
- **Files modified:** 6 source/test files plus this summary

## Accomplishments

- Added provider-side `query_graph` edge metadata overlay for qualifiers, claim references, and known metadata keys, merged by edge id while preserving base rows on partial failures.
- Added pure selection helpers for active-edge filtering, forward-compatible claim text extraction, and claim/general edge grouping.
- Added the selected-section graph UI branch with back control, section heading, summary/community context, status notes, expandable temporal markers, ordered claims, linked edges, and General connections.

## Task Commits

1. **Task 1: Merge edge metadata overlay in the provider** - `cdb9f4e` (`feat`)
2. **Task 2: Add selection helper contracts for active edges and claims** - `6582b67` (`feat`)
3. **Task 3: Render graph selection header, status notes, claims, and General connections** - `6ac43d6` (`feat`)

## Files Created/Modified

- `src/renderer/lib/semanticConnectionsProvider.ts` - Adds `query_graph` edge overlay loading and redacted per-chunk diagnostics.
- `src/renderer/lib/semanticConnectionsProvider.test.ts` - Covers T-U-024 edge overlay merge and partial edge metadata failure.
- `src/renderer/lib/semanticConnections.ts` - Adds active-edge, claim text, and claim/grouping helpers.
- `src/renderer/lib/semanticConnections.test.ts` - Covers claim ordering, structured claim text, stale/deleted filtering, and General connections routing.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` - Adds selected-section graph rendering before fallback card mode.
- `src/renderer/panels/SemanticConnectionsPanel.test.tsx` - Covers T-C-030 through T-C-042 and T-C-065 selection detail behavior.

## Decisions Made

- Edge metadata uses `query_graph` `action: 'edges'`, `direction: 'both'`, and `include_content: false` per chunk, so renderer enrichment stays credential-safe and does not request nested content.
- Known edge metadata is intentionally limited to user-facing keys (`severity`, `strength`, `dependency_type`) for this plan; raw metadata dumps remain deferred to Plan 28-02 readable detail work.
- Selection edge rows keep target-opening behavior available, but expandable edge detail prose remains scoped to Plan 28-02.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- `STATE.md` already contained an execution-start diff when execution began. It was preserved and carried into the final planning metadata update instead of being staged with task commits.

## Verification

- `npm run test:unit -- src/renderer/lib/semanticConnectionsProvider.test.ts` - passed
- `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts` - passed
- `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` - passed
- `npm run typecheck` - passed

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 28-02 can build on the selected-section rows to add expansion, readable qualifier/metadata prose, score threshold coloring, intra-claim sort behavior, target-opening regression coverage, and narrow-width assertions.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin/28-01-SUMMARY.md`.
- Task commits found: `cdb9f4e`, `6582b67`, `6ac43d6`.

---
*Phase: 28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin*
*Completed: 2026-07-01*
