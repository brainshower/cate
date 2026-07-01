---
phase: 28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin
plan: 02
subsystem: renderer-ui
tags: [react, typescript, vitest, semantic-connections, graph-intelligence, selection-detail]

requires:
  - phase: 28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin
    provides: selection header, status notes, claim grouping, General connections, and edge metadata overlay from plan 28-01
provides:
  - deterministic score tone thresholds for selection edge score pies
  - safe qualifier and known metadata prose helpers without raw JSON dumps
  - expandable selection edge rows with collapsed target context and expanded detail
  - selection-view intra-group sorting and target-opening regression coverage
affects: [semantic-connections-panel, phase-28-plan-03, phase-28-plan-04]

tech-stack:
  added: []
  patterns:
    - pure renderer helpers for score tone and metadata prose
    - local expandable row component using existing Cate routing and preview selection stores

key-files:
  created:
    - .planning/phases/28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin/28-02-SUMMARY.md
  modified:
    - src/renderer/lib/semanticConnections.ts
    - src/renderer/lib/semanticConnections.test.ts
    - src/renderer/panels/SemanticConnectionsPanel.tsx
    - src/renderer/panels/SemanticConnectionsPanel.test.tsx

key-decisions:
  - "Selection edge metadata display is whitelist-only: qualifiers plus known primitive metadata keys render as prose; unsupported structures are ignored."
  - "Selection sort reuses the existing semantic connection ordering helper before claim/general grouping, preserving claim block order while reordering edges inside groups."
  - "Selection edge target-opening remains routed through the existing handleOpenConnection path; only row labels and disclosure UI changed."

patterns-established:
  - "Edge detail disclosure: collapsed row shows relation, optional score, target, heading, and clamped snippet; expanded row shows body/snippet, reasoning, qualifiers, and known metadata prose."
  - "Score tone thresholds: red < 0.4, orange >= 0.4 and < 0.6, teal >= 0.6 and < 0.8, green >= 0.8."

requirements-completed: [REQ-015, REQ-019, REQ-020, REQ-021]

duration: 9min
completed: 2026-07-01
---

# Phase 28 Plan 02: Expandable Selection Edge Rows Summary

**Selection graph edges now expand into readable, whitelisted detail while preserving score thresholds, intra-group sorting, dock-safe layout, and existing Cate target routing.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-07-01T10:56:30Z
- **Completed:** 2026-07-01T11:05:34Z
- **Tasks:** 2
- **Files modified:** 4 source/test files plus this summary

## Accomplishments

- Added pure score-tone and metadata-prose helpers with T-U-027 boundary coverage and safe handling of malformed opaque metadata.
- Reworked selection edge rows into accessible disclosure controls with optional score pies, target open actions, collapsed snippets, expanded body/reasoning/prose detail, and narrow dock classes.
- Added component coverage for T-C-043 through T-C-049, including absent score behavior, expanded details, intra-claim sorting, same-document target opening, and row accessibility/layout checks.

## Task Commits

1. **Task 1 RED: Add score tone and metadata helper tests** - `879411e` (`test`)
2. **Task 1 GREEN: Implement score tone and metadata helpers** - `b6bfe09` (`feat`)
3. **Task 2 RED: Add expandable selection edge row tests** - `d32ca15` (`test`)
4. **Task 2 GREEN: Implement expandable selection edge rows** - `0f00056` (`feat`)

## Files Created/Modified

- `src/renderer/lib/semanticConnections.ts` - Adds score tone classification and safe qualifier/metadata prose helpers.
- `src/renderer/lib/semanticConnections.test.ts` - Covers T-U-027 score boundaries and T-C-046 helper prerequisites.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` - Adds score-threshold coloring, expandable selection rows, safe detail prose, target labels, and selection sorted ordering.
- `src/renderer/panels/SemanticConnectionsPanel.test.tsx` - Covers T-C-043 through T-C-049 component behavior.

## Decisions Made

- Known metadata prose is intentionally limited to `severity`, `strength`, and `dependency_type` when values are primitive displayable values.
- Selection rows keep target opening inside `handleOpenConnection()` and do not add Electron or Node imports in the renderer.
- Nature/similarity sorting is applied before claim/general grouping, so claim blocks remain in source claim order while edges inside each block follow the selected sort mode.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- TDD RED commits intentionally failed before implementation: helper tests failed on missing exports, and panel tests failed on missing disclosure controls, old target labels, and unsorted selection rows. Both were resolved in the corresponding GREEN commits.

## Verification

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

Plan 28-03 can build local filtering over the now-expanded selection row data, using the same safe metadata prose helper for matching without introducing FlashQuery calls.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin/28-02-SUMMARY.md`.
- Task commits found: `879411e`, `b6bfe09`, `d32ca15`, `0f00056`.

---
*Phase: 28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin*
*Completed: 2026-07-01*
