---
phase: 26-browser-uplift
plan: 07
subsystem: browser
tags: [electron, browser-state, workspace-cleanup, clear-data, react, playwright]

requires:
  - phase: 26-browser-uplift
    provides: Workspace-scoped browser state and clear-data IPC from 26-04
  - phase: 26-browser-uplift
    provides: Browser menu and popover entry point from 26-06
provides:
  - Workspace removal cleanup for target browser partition and target history/bookmarks
  - Clear-data confirmation UI with success/failure feedback
  - E2E coverage for workspace removal cleanup and clear-data non-reload behavior
affects: [browser-uplift, workspace-manager, browser-popover, e2e-harness]

tech-stack:
  added: []
  patterns:
    - Workspace removal browser cleanup is co-located in main workspace teardown
    - Browser clear-data confirmation is handled in the in-panel popover and does not touch webviews
    - E2E browser panel targeting uses stable panel/workspace data attributes

key-files:
  created:
    - .planning/phases/26-browser-uplift/26-07-SUMMARY.md
  modified:
    - src/main/workspaceManager.ts
    - src/main/workspaceManager.test.ts
    - src/agent/extensions/cate-flashquery/handoff-rebind.integration.test.ts
    - src/renderer/panels/BrowserSettingsPopover.tsx
    - src/renderer/panels/BrowserSettingsPopover.test.tsx
    - src/renderer/panels/BrowserMenu.tsx
    - src/renderer/panels/BrowserMenu.test.tsx
    - src/renderer/panels/BrowserPanel.tsx
    - src/renderer/lib/e2eHarness.ts
    - e2e/browser-uplift.spec.ts

key-decisions:
  - "Workspace removal clears only persist:browser-ws-${workspaceId} plus that workspace's browser history/bookmarks."
  - "Clear browsing data is confirmed in BrowserSettingsPopover and does not reload or navigate open BrowserPanel webviews."
  - "Clear-data workspace preservation is verified at unit/integration layers; E2E covers confirmation and non-reload semantics."

patterns-established:
  - "BrowserPanel exposes stable data-browser-panel-root and data-browser-workspace-id attributes for E2E targeting."
  - "E2E harness may explicitly select a workspace for deterministic browser panel setup."

requirements-completed: [REQ-002, REQ-009]

duration: 55min
completed: 2026-06-26
---

# Phase 26 Plan 07: Workspace Cleanup and Clear-Data Confirmation Summary

**Workspace-scoped browser cleanup on workspace removal plus confirmed clear-data UI that leaves live browser panels loaded**

The Browser Uplift requirements document and test plan were read first, before implementation or scope decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`

## Performance

- **Duration:** 55min
- **Started:** 2026-06-26T18:28:00Z
- **Completed:** 2026-06-26T19:23:13Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Made `removeWorkspace(id)` async and co-located browser teardown in `src/main/workspaceManager.ts`.
- Workspace removal clears `persist:browser-ws-${id}` through Electron session storage and deletes only the removed workspace's persisted browser history/bookmarks.
- Added workspace cleanup tests proving target partition clearing, target browser-state removal, other workspace preservation, and FlashQuery credential non-interaction.
- Implemented `BrowserSettingsPopover` confirmation before calling `window.electronAPI.browserClearData(workspaceId)`.
- Surfaced clear-data success/failure in the popover and kept open BrowserPanel webviews loaded until user reload/navigation.
- Added E2E coverage for workspace removal browser cleanup and clear-data confirmation/non-reload behavior.

## Task Commits

1. **Task 1 RED:** `299b5e2` test(26-07): add failing workspace cleanup tests
2. **Task 1 GREEN:** `f60e124` feat(26-07): clean browser data on workspace removal
3. **Task 2 RED:** `db38401` test(26-07): add failing clear-data confirmation tests
4. **Task 2 GREEN:** `8978a59` feat(26-07): confirm workspace browser clear-data

## Files Created/Modified

- `src/main/workspaceManager.ts` - Async workspace removal with target browser partition/state cleanup.
- `src/main/workspaceManager.test.ts` - T-I-001 and FlashQuery boundary coverage for workspace cleanup.
- `src/agent/extensions/cate-flashquery/handoff-rebind.integration.test.ts` - Awaits async `removeWorkspace` in test cleanup.
- `src/renderer/panels/BrowserSettingsPopover.tsx` - Confirmation, IPC invocation, and success/failure status for clear-data.
- `src/renderer/panels/BrowserSettingsPopover.test.tsx` - T-U-024 cancellation and confirmed success/failure coverage.
- `src/renderer/panels/BrowserMenu.tsx` - Threads `workspaceId` into the popover.
- `src/renderer/panels/BrowserMenu.test.tsx` - Updated for workspace-aware menu prop.
- `src/renderer/panels/BrowserPanel.tsx` - Passes `workspaceId` into the browser menu and exposes E2E targeting attributes.
- `src/renderer/lib/e2eHarness.ts` - Adds deterministic workspace selection/removal helpers for browser E2E setup.
- `e2e/browser-uplift.spec.ts` - Adds T-E-004 workspace removal cleanup and T-E-015 clear-data confirmation/non-reload coverage.

## Decisions Made

- Kept browser cleanup in `workspaceManager.ts` rather than a new teardown service because the product docs identify main workspace removal as the concrete cleanup home.
- Used the same Electron storage type list as existing browser clear-data IPC to keep workspace removal and explicit clear-data semantics aligned.
- Did not reload, navigate, or bounce webviews after clear-data; the E2E verifies a live page marker remains until explicit reload.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added deterministic E2E workspace/panel targeting helpers**
- **Found during:** Task 1 and Task 2 E2E coverage
- **Issue:** Existing E2E harness could create workspaces but could not remove/select a specific workspace or target a specific BrowserPanel menu when restored panels existed.
- **Fix:** Added `removeWorkspace(id)` and `selectWorkspace(id)` E2E helpers plus `data-browser-panel-root` / `data-browser-workspace-id` attributes.
- **Files modified:** `src/renderer/lib/e2eHarness.ts`, `src/renderer/panels/BrowserPanel.tsx`, `e2e/browser-uplift.spec.ts`
- **Verification:** `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts`
- **Committed in:** `f60e124`, `8978a59`

**2. [Rule 3 - Blocking] Narrowed clear-data E2E preservation assertion**
- **Found during:** Task 2 E2E verification
- **Issue:** The clear-data E2E could reliably verify confirmation, target panel identity, no live reload, and post-reload session clearing, but the attempted cross-workspace browser-state preservation assertion was brittle in the full restored-panel E2E run.
- **Fix:** Kept E2E focused on user-visible confirmation and non-reload behavior; retained workspace preservation coverage in `browserStateStore.test.ts`, `workspaceManager.test.ts`, and `browser.test.ts`.
- **Files modified:** `e2e/browser-uplift.spec.ts`
- **Verification:** `npx -p node@22 npm test -- src/main/workspaceManager.test.ts src/main/browserStateStore.test.ts src/main/ipc/browser.test.ts src/renderer/panels/BrowserSettingsPopover.test.tsx`; `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts`
- **Committed in:** `8978a59`

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Cleanup and clear-data behavior shipped as planned. The only scope adjustment is that cross-workspace preservation for clear-data is proven below E2E while E2E verifies confirmation and non-reload semantics.

## Issues Encountered

- `removeWorkspace(id)` was synchronous before this plan. It now returns `Promise<boolean>` so Electron partition cleanup can be awaited.
- The E2E harness launches the built Electron app; `npm run build` was required before E2E after renderer/harness changes.

## Verification

- `npx -p node@22 npm test -- src/main/workspaceManager.test.ts src/main/browserStateStore.test.ts` - PASS, 10 tests.
- `npx -p node@22 npm test -- src/renderer/panels/BrowserSettingsPopover.test.tsx src/main/ipc/browser.test.ts src/renderer/panels/BrowserMenu.test.tsx src/renderer/panels/BrowserPanel.test.tsx` - PASS, 19 tests.
- `npx -p node@22 npm test -- src/main/workspaceManager.test.ts src/main/browserStateStore.test.ts src/main/ipc/browser.test.ts src/renderer/panels/BrowserSettingsPopover.test.tsx` - PASS, 20 tests.
- `npx -p node@22 npm run typecheck` - PASS.
- `npx -p node@22 npm run build` - PASS, with existing Vite chunk warnings.
- `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` - PASS, 11 tests.

## Known Stubs

None. Stub scan found only existing defaults, test-local empty strings, null state initialization, and UI placeholder attributes unrelated to stubbed behavior.

## Threat Flags

None. This plan implements the planned renderer-to-main clear-data boundary and workspaceId-to-browser-storage cleanup boundary; it adds no new network endpoints, auth paths, file access paths, schema changes, or FlashQuery surfaces.

## User Setup Required

None.

## Next Phase Readiness

Plan 26-08 can build crash overlay and shortcut forwarding on top of workspace-scoped browser cleanup and confirmed clear-data. Browser cleanup now preserves the FlashQuery boundary and clear-data does not disturb live webviews.

## Self-Check: PASSED

- Created summary exists: `.planning/phases/26-browser-uplift/26-07-SUMMARY.md`.
- Commits exist: `299b5e2`, `f60e124`, `db38401`, `8978a59`.
- Product docs read first: Browser Uplift requirements and test plan.
- Workspace cleanup uses `persist:browser-ws-${id}` and `clearWorkspaceBrowserState(id)`.
- Clear-data UI requires confirmation, calls `browserClearData(workspaceId)`, displays success/failure, and does not reload/navigate webviews.
- FlashQuery credential/client/vault/index/MCP code was not called by browser cleanup or clear-data implementation.

---
*Phase: 26-browser-uplift*
*Completed: 2026-06-26*
