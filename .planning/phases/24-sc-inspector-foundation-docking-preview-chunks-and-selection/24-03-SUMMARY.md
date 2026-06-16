---
phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection
plan: 03
subsystem: renderer-preview
tags: [react, markdown-preview, editor-panel, semantic-connections, tdd]
requires:
  - phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection
    provides: Plan 24-01 semantic connection foundations and existing Phase 23 preview heading IDs
provides:
  - Heading-scoped Markdown preview wrappers with stable `data-chunk-id`
  - Preview wrapper rerender refresh and preview-exit cleanup coverage
  - Component tests for T-I-001, T-I-002, and T-I-003
affects: [phase-24, phase-25, preview-selection, semantic-connections-adapter]
tech-stack:
  added: []
  patterns:
    - Split Markdown preview rendering into pre-heading content and heading-scoped chunks
    - Reuse `createHeadingIdTracker()` and `slugifyHeading()` for preview chunk identity
key-files:
  created:
    - .planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/deferred-items.md
  modified:
    - src/renderer/panels/EditorPanel.tsx
    - src/renderer/panels/EditorPanel.test.tsx
key-decisions:
  - "Preview chunk IDs are computed before rendering with `createHeadingIdTracker()` and then reused as heading IDs to avoid render-time duplicate suffix drift."
  - "Preview content changes now refresh `markdownContent` while preview mode is active so wrappers are regenerated on rerender."
patterns-established:
  - "Markdown preview chunk wrappers use `div[data-chunk-id]` around a heading and all rendered content until the next heading."
  - "Pre-heading Markdown preview content renders without `data-chunk-id` instead of inventing a synthetic section ID."
requirements-completed: [REQ-004, REQ-005, REQ-006]
duration: 9min
completed: 2026-06-16
---

# Phase 24 Plan 03: Markdown Preview Chunk Wrappers Summary

**Heading-scoped Markdown preview wrappers with stable `data-chunk-id` values and rerender cleanup coverage for Semantic Connections selection.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-16T20:48:32Z
- **Completed:** 2026-06-16T20:57:23Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added stable `div[data-chunk-id]` wrappers around Markdown preview heading sections.
- Kept wrapper IDs aligned with rendered heading IDs, including duplicate headings and inline Markdown formatting.
- Preserved readable pre-heading content without assigning an invalid chunk ID.
- Refreshed preview wrapper DOM on active preview content changes and cleared wrappers on preview exit.

## Task Commits

1. **Tasks 24.3.1 and 24.3.2: Preview chunk wrappers and lifecycle** - `86c54b0` (feat)

## Files Created/Modified

- `src/renderer/panels/EditorPanel.tsx` - Splits Markdown preview content into heading-scoped chunks, renders wrappers, and refreshes preview content on active edits.
- `src/renderer/panels/EditorPanel.test.tsx` - Adds T-I-001 through T-I-003 wrapper tests plus rerender and preview-exit lifecycle coverage.
- `.planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/deferred-items.md` - Records the transient out-of-scope docking typecheck failure and its concurrent resolution.

## Decisions Made

- Wrapper IDs are computed with `createHeadingIdTracker()` before rendering and reused as the section heading `id`, avoiding duplicate suffix drift from mutable render-time heading tracking.
- Content before the first heading remains outside chunk wrappers so selection code can distinguish whole-document/pre-section content from section chunks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Refreshed preview content during active edits**
- **Found during:** Task 24.3.2 (Refresh and clean preview chunk wrapper lifecycle)
- **Issue:** Existing preview mode only loaded `markdownContent` when preview toggled on; Monaco content changes while preview stayed active did not rerender preview wrappers.
- **Fix:** Added active-preview tracking and update `markdownContent` from the editor model on Monaco content changes.
- **Files modified:** `src/renderer/panels/EditorPanel.tsx`
- **Verification:** `refreshes preview chunk wrappers on rerender and clears them when preview exits` passes.
- **Committed in:** `86c54b0`

**Total deviations:** 1 auto-fixed (Rule 2)
**Impact on plan:** Required for REQ-006 lifecycle correctness. No package installs or scope expansion beyond preview wrapper lifecycle.

## Issues Encountered

- `npx -p node@22 npm run typecheck` initially failed in `src/renderer/docking/DockSplitContainer.test.tsx` at lines 80, 92, 104, and 119 because `DockLayoutNode` was passed where `DockSplitNode` is expected. This was outside Plan 24-03 and was resolved concurrently by commit `bd53939`.

## Verification

- PASS: `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx`
- PASS: `npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts src/renderer/panels/EditorPanel.test.tsx`
- PASS: `npx -p node@22 npm run typecheck`

## Known Stubs

None.

## Threat Flags

None.

## Next Phase Readiness

Phase 25 can target `[data-chunk-id]` wrappers directly for section-level selection, adapter mapping, and preview decoration work.

## Self-Check: PASSED

- Found `src/renderer/panels/EditorPanel.tsx`
- Found `src/renderer/panels/EditorPanel.test.tsx`
- Found commit `86c54b0`

---
*Phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection*
*Completed: 2026-06-16*
