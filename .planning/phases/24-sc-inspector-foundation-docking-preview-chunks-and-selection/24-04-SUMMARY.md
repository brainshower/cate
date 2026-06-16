---
phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection
plan: 04
subsystem: renderer-ui
tags: [react, zustand, markdown-preview, outline, semantic-connections, playwright]
requires:
  - phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection
    provides: "24-01 panel registration and semantic connection utility foundation"
  - phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection
    provides: "24-03 markdown preview chunk wrappers with stable data-chunk-id values"
provides:
  - "Renderer-local preview selection store with hover, pin, active, clear, and caution state"
  - "Markdown preview hover, click-pin, clear, and wrapper decoration behavior"
  - "Initial Outline and Semantic Connections shell awareness of shared preview selection"
  - "Focused Playwright proof for Preview -> SC shell -> Outline synchronization"
affects: [phase-25-semantic-connections-ui, outline, markdown-preview]
tech-stack:
  added: []
  patterns:
    - "Dedicated renderer-local Zustand store for cross-panel preview selection"
    - "Wrapper-level preview chunk interaction and decoration classes"
key-files:
  created:
    - src/renderer/stores/previewSelectionStore.ts
    - src/renderer/stores/previewSelectionStore.test.ts
    - e2e/semantic-connections-preview-selection.spec.ts
  modified:
    - src/renderer/panels/EditorPanel.tsx
    - src/renderer/panels/EditorPanel.test.tsx
    - src/renderer/panels/OutlinePanel.tsx
    - src/renderer/panels/OutlinePanel.test.tsx
    - src/renderer/panels/SemanticConnectionsPanel.tsx
    - src/renderer/lib/e2eHarness.ts
    - .planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/deferred-items.md
key-decisions:
  - "Use a dedicated renderer-local Zustand store instead of CustomEvent preview bridges."
  - "Keep Outline matching in Phase 24 slug-based and line-mapped; full two-pass DOM fallback remains Phase 25 scope."
  - "Place the E2E Semantic Connections panel in the bottom dock so Preview, Outline, and SC shell are simultaneously observable."
patterns-established:
  - "Preview chunk wrappers own interaction hit-testing via closest('[data-chunk-id]')."
  - "activeChunkId is derived as hoveredChunkId || pinnedChunkId in the store."
requirements-completed: [REQ-007, REQ-008, REQ-009, REQ-013, REQ-014]
duration: 18min
completed: 2026-06-16
---

# Phase 24 Plan 04: Shared Preview Selection Summary

**Shared preview-selection state with Markdown preview hover/pin behavior, initial Outline/SC shell awareness, and focused Electron E2E coverage**

## Performance

- **Duration:** 18 min
- **Started:** 2026-06-16T21:02:00Z
- **Completed:** 2026-06-16T21:20:01Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added `usePreviewSelectionStore` with `hoveredChunkId`, `pinnedChunkId`, derived `activeChunkId`, section selection, clearing, and caution chunk state.
- Wired Markdown preview chunk wrappers to update shared hover/pin state, preserve text selection, clear on Escape/empty preview clicks, and render active/pinned/caution wrapper classes.
- Updated Outline to prefer shared active chunk highlight while preserving source-mode cursor fallback and preview routing behavior.
- Updated the SC shell to show whole-document vs selected-section scope from the shared store.
- Added focused Vitest coverage and `T-E-004` Playwright coverage for Preview hover synchronization.

## Task Commits

1. **Task 24.4.1: Add shared preview-selection state** - `6daf004` (feat)
2. **Task 24.4.2: Wire preview hover, pin, clear, and decoration behavior** - `9f343f1` (feat)
3. **Task 24.4.3: Add initial Outline awareness and focused end-to-end proof** - `6068c67` (feat)

## Files Created/Modified

- `src/renderer/stores/previewSelectionStore.ts` - Shared renderer-local selection and caution state.
- `src/renderer/stores/previewSelectionStore.test.ts` - Store precedence and clear/reset coverage.
- `src/renderer/panels/EditorPanel.tsx` - Preview wrapper hit-testing, hover/pin/clear handling, and wrapper classes.
- `src/renderer/panels/EditorPanel.test.tsx` - Preview interaction, drag-selection, decoration, and embeddings-only coverage.
- `src/renderer/panels/OutlinePanel.tsx` - Shared active selection highlight and preview click pinning.
- `src/renderer/panels/OutlinePanel.test.tsx` - Shared selection and preview pin tests.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` - Scope row consumes shared selection and clears to whole document.
- `src/renderer/lib/e2eHarness.ts` - E2E-only helper to open the SC panel deterministically.
- `e2e/semantic-connections-preview-selection.spec.ts` - Focused preview hover synchronization proof.
- `.planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/deferred-items.md` - Records pre-existing grep matches outside 24-04 scope.

## Decisions Made

- Kept the shared state renderer-local; no IPC or browser event bridge was added for preview selection.
- Added `cautionChunkIds` to the same store so wrapper-level caution styling can be proven without inventing Phase 25 adapter data.
- Used slug/duplicate ID generation from the source model for initial Outline awareness. Full DOM fallback matching remains intentionally out of scope for Phase 25.

## Deviations from Plan

### Auto-fixed Issues

None.

### Verification Deviation

**1. [Scope Boundary] Required grep matches pre-existing non-preview CustomEvent usage**
- **Found during:** Task 24.4.2 verification
- **Issue:** `! rg -n "CustomEvent|preview-section-select" src/renderer src/shared` fails because existing editor save/title and FlashQuery vault code already uses `CustomEvent`.
- **Fix:** No broad refactor was made because those event paths are outside 24-04 preview-selection ownership and are not `preview-section-select`.
- **Files modified:** `.planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/deferred-items.md`
- **Verification:** Preview-selection code introduced no `CustomEvent` or `preview-section-select`; the exact grep command was run and its matches are documented.

**Total deviations:** 1 documented scope-boundary verification deviation.
**Impact on plan:** Preview-selection implementation satisfies the no-preview-event-bridge requirement; the global grep command remains blocked by unrelated pre-existing code.

## Issues Encountered

- The Electron E2E command launches the built `dist/main/index.js`, so the new E2E harness method required a local `npm run build` before the focused E2E could observe it.

## Verification

- PASS: `npx -p node@22 npm test -- src/renderer/stores/previewSelectionStore.test.ts`
- PASS: `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx`
- PASS: `npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx src/renderer/stores/previewSelectionStore.test.ts`
- PASS: `npx -p node@22 npm run test:e2e -- e2e/semantic-connections-preview-selection.spec.ts` after `npx -p node@22 npm run build`
- FAIL, documented scope-boundary issue: `! rg -n "CustomEvent|preview-section-select" src/renderer src/shared`
- PASS: `npx -p node@22 npm run typecheck`

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 25 can consume one shared preview-selection surface across Preview, Outline, and the SC shell. The remaining work is the full Semantic Connections UI/adapter behavior and the two-pass Outline matching fallback described in the product requirements.

## Self-Check: PASSED

- Created summary file exists.
- Task commits found: `6daf004`, `9f343f1`, `6068c67`.
- Key created files exist: `src/renderer/stores/previewSelectionStore.ts`, `src/renderer/stores/previewSelectionStore.test.ts`, `e2e/semantic-connections-preview-selection.spec.ts`.

---
*Phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection*
*Completed: 2026-06-16*
