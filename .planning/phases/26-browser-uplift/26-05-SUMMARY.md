---
phase: 26-browser-uplift
plan: 05
subsystem: browser
tags: [electron, react, zustand, bookmarks, browser-state, playwright]

requires:
  - phase: 26-browser-uplift
    provides: Browser history/bookmark preload contracts from 26-04
provides:
  - Workspace-scoped renderer browser store
  - BrowserPanel visit recording and workspace-scoped star toggle
  - Bookmarks bar UI scoped to the current browser panel workspace
  - E2E coverage for bookmark UI persistence and workspace isolation
affects: [browser-uplift, renderer-store, browser-panel, e2e-harness]

tech-stack:
  added: []
  patterns:
    - Renderer browser selectors and actions take explicit workspaceId arguments
    - BrowserPanel passes workspace-scoped bookmarks into a dumb BookmarksBar component
    - Browser store invalidation listeners refresh only the workspace named by main-process broadcasts

key-files:
  created:
    - src/renderer/stores/browserStore.ts
    - src/renderer/stores/browserStore.test.ts
    - src/renderer/panels/BookmarksBar.tsx
    - src/renderer/panels/BookmarksBar.test.tsx
  modified:
    - src/renderer/panels/BrowserPanel.tsx
    - src/renderer/panels/BrowserPanel.test.tsx
    - e2e/browser-uplift.spec.ts

key-decisions:
  - "BrowserPanel owns workspace scoping and passes only current-workspace bookmarks to BookmarksBar."
  - "Renderer browser store exposes workspaceId-parameterized selectors/actions instead of a global active workspace."
  - "Bookmarks bar click navigation reuses BrowserPanel's existing navigateTo path for the active webview."

patterns-established:
  - "Renderer browser invalidation callbacks call refreshHistory/refreshBookmarks only for payload.workspaceId."
  - "Zustand selectors that may return empty arrays use stable empty constants to avoid production render loops."

requirements-completed: [REQ-003, REQ-007]

duration: 15min
completed: 2026-06-26
---

# Phase 26 Plan 05: Renderer Browser Store and Bookmarks UI Summary

**Workspace-scoped renderer browser state with BrowserPanel visit recording, star toggle, bookmarks bar, and persistence/isolation E2E coverage**

The Browser Uplift requirements document and test plan were read first, before implementation or scope decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`

## Performance

- **Duration:** 15min
- **Started:** 2026-06-26T18:34:00Z
- **Completed:** 2026-06-26T18:48:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added `src/renderer/stores/browserStore.ts` with workspaceId-parameterized history/bookmark selectors and actions over the Wave 4 preload APIs.
- Wired `BrowserPanel` to refresh its own workspace browser state, record visits on navigation/title events, and add/remove bookmarks through a star toggle for its own `workspaceId`.
- Added `BookmarksBar` as a scoped presentational component and integrated it below the BrowserPanel URL bar.
- Added Playwright coverage proving bookmark UI persistence after restart and absence in a different workspace.

## Task Commits

1. **Task 1 RED:** `b29e1a6` test(26-05): add failing renderer browser store tests
2. **Task 1 GREEN:** `2ed8aeb` feat(26-05): add workspace renderer browser store
3. **Task 2 RED:** `e4996d9` test(26-05): add failing bookmarks bar tests
4. **Task 2 GREEN:** `9928659` feat(26-05): add workspace bookmarks bar

## Files Created/Modified

- `src/renderer/stores/browserStore.ts` - Workspace-scoped renderer browser state, preload actions, and invalidation subscriptions.
- `src/renderer/stores/browserStore.test.ts` - T-U-008, T-U-017, and T-U-030 coverage.
- `src/renderer/panels/BookmarksBar.tsx` - Bookmarks strip rendering only supplied workspace bookmarks.
- `src/renderer/panels/BookmarksBar.test.tsx` - T-U-018 coverage for supplied bookmarks and click navigation.
- `src/renderer/panels/BrowserPanel.tsx` - Visit recording, star toggle, store refresh, and bookmarks bar integration.
- `src/renderer/panels/BrowserPanel.test.tsx` - BrowserPanel visit recording and star toggle coverage.
- `e2e/browser-uplift.spec.ts` - T-E-012/T-E-013 bookmark UI persistence/isolation coverage.

## Decisions Made

- BookmarksBar is intentionally presentational: BrowserPanel resolves `workspaceId` and supplies only the current workspace's bookmarks.
- Bookmark add uses the current page title when available, falling back to URL.
- No tabs, start page, autocomplete, proxy, global bookmarks promotion, menu, popover, settings, or clear-data UI was added in this plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Stabilized empty browser store selector results**
- **Found during:** Task 2 (Bookmarks bar UI and E2E)
- **Issue:** Production E2E after build hit React maximum update depth because the missing-workspace bookmark selector returned a fresh empty array on each render.
- **Fix:** Added stable `EMPTY_HISTORY` and `EMPTY_BOOKMARKS` constants for missing workspace selector results.
- **Files modified:** `src/renderer/stores/browserStore.ts`
- **Verification:** `npx -p node@22 npm test -- src/renderer/stores/browserStore.test.ts src/renderer/panels/BookmarksBar.test.tsx src/renderer/panels/BrowserPanel.test.tsx`; `npx -p node@22 npm run build`; `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts`
- **Committed in:** `9928659`

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** The fix was required for production renderer correctness and did not expand feature scope.

## Issues Encountered

- E2E initially launched stale built renderer assets and did not show the new star button. Running `npm run build` before E2E resolved the stale asset issue.
- After rebuilding, production E2E exposed the unstable empty-array selector bug documented above.

## Verification

- `npx -p node@22 npm test -- src/renderer/stores/browserStore.test.ts src/renderer/panels/BrowserPanel.test.tsx` - PASS, 10 tests.
- `npx -p node@22 npm test -- src/renderer/panels/BookmarksBar.test.tsx src/renderer/stores/browserStore.test.ts` - PASS, 5 tests.
- `npx -p node@22 npm test -- src/renderer/stores/browserStore.test.ts src/renderer/panels/BookmarksBar.test.tsx src/renderer/panels/BrowserPanel.test.tsx` - PASS, 12 tests.
- `npx -p node@22 npm run typecheck` - PASS.
- `npx -p node@22 npm run build` - PASS.
- `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` - PASS, 8 tests.

## Known Stubs

None. Stub scan found only stable empty store constants, local test initialization, nullable component state, and pre-existing URL input placeholder text.

## Threat Flags

None. This plan used the planned renderer-to-preload browser history/bookmark surface from 26-04 and did not introduce new network endpoints, auth paths, file access patterns, schema changes, or FlashQuery coupling.

## User Setup Required

None.

## Next Phase Readiness

Plan 26-06 can add menu/popover/settings controls on top of the renderer store and bookmarks bar. BrowserPanel now has workspace-scoped bookmark state and the UI is covered by unit and E2E tests.

## Self-Check: PASSED

- Created files exist: `src/renderer/stores/browserStore.ts`, `src/renderer/stores/browserStore.test.ts`, `src/renderer/panels/BookmarksBar.tsx`, `src/renderer/panels/BookmarksBar.test.tsx`.
- Commits exist: `b29e1a6`, `2ed8aeb`, `e4996d9`, `9928659`.
- Browser store selectors/actions require explicit `workspaceId`.
- BrowserPanel star toggle and visit recording pass its own `workspaceId`.
- BookmarksBar receives supplied workspace bookmarks and does not query global active workspace state.
- The two mandatory product docs were read before implementation.

---
*Phase: 26-browser-uplift*
*Completed: 2026-06-26*
