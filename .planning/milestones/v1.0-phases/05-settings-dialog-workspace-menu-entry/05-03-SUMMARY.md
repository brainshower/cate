---
phase: 05-settings-dialog-workspace-menu-entry
plan: 03
subsystem: ui
tags: [react, electron, native-context-menu, zustand, vitest]

requires:
  - phase: 04-vault-panel-shared-chip
    provides: showFlashQueryConnectionDialog UI-store state
provides:
  - Workspace native context-menu entry for FlashQuery connection settings
  - Renderer coverage for menu item order, action dispatch, and no custom menu DOM
affects: [phase-05, workspace-sidebar, flashquery-connection-dialog]

tech-stack:
  added: []
  patterns:
    - Native workspace menu actions use window.electronAPI.showContextMenu and switch on returned ids.
    - FlashQuery connection dialog visibility is opened through useUIStore.getState().

key-files:
  created:
    - .planning/phases/05-settings-dialog-workspace-menu-entry/05-03-SUMMARY.md
  modified:
    - src/renderer/sidebar/WorkspaceTab.tsx
    - src/renderer/sidebar/WorkspaceTab.test.tsx

key-decisions:
  - "Keep the workspace menu native by adding only a NativeContextMenuItem and returned-id handler."
  - "Select the clicked workspace before opening showFlashQueryConnectionDialog so the dialog targets the row the user acted on."

patterns-established:
  - "Workspace menu tests can render WorkspaceTab under jsdom and assert the native menu descriptor array passed to showContextMenu."

requirements-completed: [REQ-039]

duration: 10min
completed: 2026-05-29
---

# Phase 05 Plan 03: Workspace Menu Entry Summary

**Native workspace context-menu entry opens the FlashQuery connection dialog through existing UI-store state.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-29T18:00:00Z
- **Completed:** 2026-05-29T18:10:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added focused WorkspaceTab tests for T-I-075 through T-I-078.
- Inserted `FlashQuery Connection...` into the native workspace menu between `copy-cwd` and `duplicate`, with separators on both sides.
- Handled the returned `flashquery-connection` id by selecting the clicked workspace, then opening `showFlashQueryConnectionDialog` without duplicating, closing, or mutating workspace metadata.

## Task Commits

1. **Task 1: Add workspace context-menu coverage** - `75e52af` (test)
2. **Task 2: Insert and handle the FlashQuery Connection native menu item** - `9e9c6bb` (feat)

## Files Created/Modified

- `src/renderer/sidebar/WorkspaceTab.tsx` - Adds the native menu item and returned-id handler.
- `src/renderer/sidebar/WorkspaceTab.test.tsx` - Covers item presence, exact order, returned-id behavior, and absence of custom menu DOM.
- `.planning/phases/05-settings-dialog-workspace-menu-entry/05-03-SUMMARY.md` - Execution summary and evidence.

## Verification

- PASS: `npx -p node@22 npm test -- src/renderer/sidebar/WorkspaceTab.test.tsx`
  - Result: 11 tests passed.
- PASS: `npx -p node@22 npm run typecheck`
  - Result: `tsc --noEmit` completed successfully in the current working tree.

## Decisions Made

- Used `FlashQuery Connection...` exactly as the plan specified.
- Preserved Cate's native menu pattern; no React dropdown, popover, portal, or menu library was added.
- Reused `useUIStore.getState().setShowFlashQueryConnectionDialog(true)` after ensuring the clicked workspace is selected, so the selected-workspace-scoped dialog edits the intended workspace.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The first RED run exposed a test locator issue before reaching the intended failing assertions. The harness was corrected to dispatch the context-menu event from the visible workspace label, after which RED failed for the expected missing menu item and missing handler.
- `npm run typecheck` initially reported an out-of-scope missing `src/renderer/dialogs/FlashQueryConnectionDialog` module from Phase 5 dialog work. A concurrent untracked `src/renderer/dialogs/FlashQueryConnectionDialog.tsx` appeared in the working tree before the final verification rerun, and typecheck then passed. That file was not created or staged by this plan.

## Known Stubs

None in the files created or modified by this plan.

## Threat Flags

None. This plan only adds a renderer menu descriptor and UI-store visibility toggle; it does not introduce new network, filesystem, auth, or persistence surfaces.

## User Setup Required

None.

## Next Phase Readiness

REQ-039 is covered at the renderer level. The workspace menu now opens the Phase 5 dialog visibility state once the dialog implementation is present.

## Self-Check: PASSED

- FOUND: `.planning/phases/05-settings-dialog-workspace-menu-entry/05-03-SUMMARY.md`
- FOUND: `src/renderer/sidebar/WorkspaceTab.tsx`
- FOUND: `src/renderer/sidebar/WorkspaceTab.test.tsx`
- FOUND commit: `75e52af`
- FOUND commit: `9e9c6bb`

---
*Phase: 05-settings-dialog-workspace-menu-entry*
*Completed: 2026-05-29*
