---
phase: 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish
plan: 03
subsystem: ui
tags: [react, renderer, outline, semantic-connections, markdown-preview]

requires:
  - phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection
    provides: Preview chunk wrappers, shared preview selection store, and initial Semantic Connections shell
  - phase: 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish/25-01
    provides: Semantic Connections card UI and interaction surface
  - phase: 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish/25-02
    provides: Semantic Connections provider/cache result shape and metadata
provides:
  - Final Outline shared-selection synchronization with slug-first and DOM-fallback matching
  - Safe Semantic Connections card Open behavior for same-document and cross-document targets
  - Active editor registry callbacks for preview chunk resolution and path-based editor lookup
affects: [semantic-connections, outline, markdown-preview, active-editor-registry]

tech-stack:
  added: []
  patterns:
    - Active editor registry remains the renderer-local bridge for preview scroll and routing callbacks
    - Card Open actions require explicit path, heading, and chunk metadata before navigating

key-files:
  created:
    - .planning/phases/25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish/25-03-SUMMARY.md
  modified:
    - src/renderer/panels/OutlinePanel.tsx
    - src/renderer/panels/OutlinePanel.test.tsx
    - src/renderer/panels/EditorPanel.tsx
    - src/renderer/panels/EditorPanel.test.tsx
    - src/renderer/panels/SemanticConnectionsPanel.tsx
    - src/renderer/panels/SemanticConnectionsPanel.test.tsx
    - src/renderer/lib/activeEditorRegistry.ts
    - src/renderer/lib/activeEditorRegistry.test.ts
    - src/renderer/panels/types.ts

key-decisions:
  - "Use active editor registry callbacks for Outline DOM fallback instead of production CustomEvents."
  - "Disable card Open when target path, heading, or chunk metadata is missing rather than guessing a destination."
  - "Keep app-store editor creation as a lazy production fallback and inject it in tests to avoid heavyweight store side effects."

patterns-established:
  - "Outline matching: generated preview slug/occurrence IDs are authoritative first pass; rendered preview DOM heading text is fallback only."
  - "Semantic card routing: same-document scrolls current preview; registered cross-document previews scroll directly; unopened documents are created in preview mode then handled when registered."

requirements-completed: [REQ-010, REQ-011, REQ-012, REQ-036, REQ-037]

duration: 20min
completed: 2026-06-17
---

# Phase 25 Plan 03: Outline Sync and Card Open Routing Summary

**Outline shared-selection sync with DOM fallback matching and Semantic Connections cards that only deep-link when target metadata is sufficient.**

## Performance

- **Duration:** 20 min
- **Started:** 2026-06-17T03:05:00Z
- **Completed:** 2026-06-17T03:24:14Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Completed Outline bidirectional synchronization: shared `activeChunkId` wins when resolvable, cursor-derived active heading remains the fallback, and search-focused styling/Enter cycling remains intact.
- Added two-pass Outline matching: slug/occurrence mapping first, then preview DOM fallback via `resolvePreviewChunkIdForHeading`.
- Implemented safe Semantic Connections card Open actions with focusable accessible buttons, same-document preview scrolling/pinning, registered cross-document preview routing, and editor creation for unopened documents.
- Disabled Open when path, heading, or chunk metadata is incomplete so the UI never navigates to a guessed target.

## Task Commits

1. **Task 25.3.1: Finish Outline bidirectional selection sync** - `bedc6ad` (`feat`)
2. **Task 25.3.2: Implement safe card open behavior** - `a06bbaa` (`feat`)

## Files Created/Modified

- `src/renderer/panels/OutlinePanel.tsx` - Adds two-pass active chunk matching and preview pin fallback.
- `src/renderer/panels/OutlinePanel.test.tsx` - Adds coverage for DOM fallback selection matching.
- `src/renderer/panels/EditorPanel.tsx` - Exposes preview DOM chunk resolution through active editor registration.
- `src/renderer/panels/EditorPanel.test.tsx` - Existing preview scroll/pin coverage remains passing.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` - Adds safe Open actions and routing behavior.
- `src/renderer/panels/SemanticConnectionsPanel.test.tsx` - Adds same-document, cross-document, create-editor, and incomplete-metadata Open coverage.
- `src/renderer/lib/activeEditorRegistry.ts` - Adds preview chunk resolver and path snapshot lookup.
- `src/renderer/lib/activeEditorRegistry.test.ts` - Adds registry coverage for resolver and path lookup.
- `src/renderer/panels/types.ts` - Adds optional injectable card-open editor routing callbacks for tests.

## Decisions Made

- Active editor registry remains the boundary for renderer preview navigation. This preserves the no-production-`CustomEvent` architecture from Phase 24.
- Card Open requires `target.path`, `target.heading`, and `target.chunkId`; incomplete metadata disables the button.
- Production cross-document editor creation is lazy-loaded through the existing app store only when needed. Tests inject lightweight callbacks.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Avoided top-level app-store import in SemanticConnectionsPanel tests**
- **Found during:** Task 25.3.2
- **Issue:** A top-level `appStore` import in the Semantic Connections panel caused the component test process to hang before assertions.
- **Fix:** Kept production routing on the existing app-store path via lazy import and added injectable test callbacks for editor creation/preview activation.
- **Files modified:** `src/renderer/panels/SemanticConnectionsPanel.tsx`, `src/renderer/panels/SemanticConnectionsPanel.test.tsx`, `src/renderer/panels/types.ts`
- **Verification:** `npx -p node@22 npm test -- src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx`
- **Committed in:** `a06bbaa`

**Total deviations:** 1 auto-fixed blocking issue.
**Impact on plan:** No scope expansion; the fix preserves the planned app-store routing while keeping component tests deterministic.

## Known Stubs

None. Stub scan found only ordinary empty collections/null cleanup state, existing UI copy for unsupported file types, and a pre-existing comment about malformed placeholders.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: renderer-routing | `src/renderer/panels/SemanticConnectionsPanel.tsx` | Connection metadata can route editor creation and preview scrolling; mitigated by requiring explicit path, heading, and chunk metadata. |

## Issues Encountered

- The initial SemanticConnectionsPanel RED run hung because the unimplemented Open path plus top-level app-store import interacted poorly with the component test environment. The final implementation removes the top-level dependency and all targeted tests complete normally.

## Verification

- `npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/lib/activeEditorRegistry.test.ts` - passed, 112 tests.
- `npx -p node@22 npm run typecheck` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 25-03 is ready for downstream E2E/manual acceptance work. Remaining residual risk is limited to Electron-level focus behavior for newly created cross-document editors, which is covered by the next phase's E2E/manual acceptance scope.

## Self-Check: PASSED

- Summary file exists.
- Task commit `bedc6ad` exists.
- Task commit `a06bbaa` exists.

---
*Phase: 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish*
*Completed: 2026-06-17*
