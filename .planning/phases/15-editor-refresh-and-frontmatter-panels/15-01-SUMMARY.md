---
phase: 15-editor-refresh-and-frontmatter-panels
plan: 15.1
subsystem: ui
tags: [flashquery, editor, frontmatter, docking, canvas, react, zustand]

requires:
  - phase: 14-shared-flashquery-contracts-and-ipc
    provides: FlashQuery URI parsing/building and IPC contracts used by editor panels
provides:
  - FlashQuery frontmatter editor creation from body editor panels
  - Dock-tab and canvas-adjacent placement for frontmatter panels
  - Vault tree context-menu action for opening frontmatter directly
affects: [editor, dock-tabs, vault-panel, flashquery]

tech-stack:
  added: []
  patterns: [FlashQuery body/frontmatter part routing by URI query string, duplicate-safe panel focusing]

key-files:
  created: []
  modified:
    - src/renderer/stores/appStore.ts
    - src/renderer/stores/appStore.test.ts
    - src/renderer/docking/DockTabBar.tsx
    - src/renderer/docking/DockTabBar.test.tsx
    - src/renderer/panels/FlashQueryVaultPanel.tsx
    - src/renderer/panels/FlashQueryVaultPanel.test.tsx

key-decisions:
  - "Used `buildVaultUri(..., 'frontmatter')` for every frontmatter panel path so body and frontmatter editors never share a model cache key."
  - "Focused an existing frontmatter editor instead of opening duplicates for the same workspace and vault path."
  - "Rendered `Open frontmatter` only for active FlashQuery body editor tabs."

patterns-established:
  - "Frontmatter panels are independent editor panels addressed by full FlashQuery URI."
  - "Docked source panels open frontmatter as a sibling tab; canvas source panels open frontmatter adjacent to the source node."

requirements-completed: [REQ-005, REQ-006]

duration: 1h
completed: 2026-06-03
---

# Phase 15.1: Frontmatter Editor Opening And Placement Summary

**Independent FlashQuery frontmatter editor panels with URI-safe creation, duplicate focusing, and dock/canvas placement**

## Performance

- **Duration:** 1h
- **Started:** 2026-06-03T17:00:00Z
- **Completed:** 2026-06-03T18:00:00Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added `openFlashQueryFrontmatterEditor` to create/focus frontmatter editors from existing FlashQuery body panels.
- Added the tab chrome `Open frontmatter` affordance for FlashQuery body editor tabs.
- Added the vault tree `Open frontmatter` context menu path while preserving double-click body open behavior.

## Task Commits

1. **Tasks 1-3: Frontmatter opening, tab action, and vault context action** - `3d12af1` (feat)

## Files Created/Modified

- `src/renderer/stores/appStore.ts` - Frontmatter panel creation, duplicate focus, and dock/canvas placement.
- `src/renderer/stores/appStore.test.ts` - T-U-007 coverage for URI shape, invalid inputs, duplicate focus, and placement.
- `src/renderer/docking/DockTabBar.tsx` - Active body-tab `Open frontmatter` icon action.
- `src/renderer/docking/DockTabBar.test.tsx` - Visibility and click coverage for the tab action.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` - Vault document context menu action for frontmatter.
- `src/renderer/panels/FlashQueryVaultPanel.test.tsx` - Context menu ordering and URI coverage.

## Decisions Made

Used full FlashQuery URIs as editor identity, including `?part=frontmatter`, to keep body and frontmatter state separate. Placement follows the source panel location so the new editor opens near the body document the user is already editing.

## Deviations from Plan

Tasks were committed together because the store action, tab action, and vault context menu were tightly coupled and shared the same T-U-007 surface. No scope outside Plan 15.1 was introduced.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test -- src/renderer/stores/appStore.test.ts src/renderer/docking/DockTabBar.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx`
- `npm run typecheck`

## Next Phase Readiness

Plan 15.2 can rely on body and frontmatter editors existing as distinct panel instances with distinct URI strings.

---
*Phase: 15-editor-refresh-and-frontmatter-panels*
*Completed: 2026-06-03*
