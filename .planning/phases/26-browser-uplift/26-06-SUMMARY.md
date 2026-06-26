---
phase: 26-browser-uplift
plan: 06
subsystem: browser
tags: [electron, react, settings, browser-menu, bookmarks, playwright]

requires:
  - phase: 26-browser-uplift
    provides: Workspace-scoped browser store and bookmarks bar/star from 26-05
provides:
  - Browser toolbar overflow menu without New Tab or excluded upstream controls
  - Scoped in-panel browser settings popover for bookmarks-bar visibility and clear-data entry
  - Persisted browserShowBookmarksBar setting across AppSettings, defaults, schema validation, and Settings-window UI
  - Unit and E2E coverage for REQ-008
affects: [browser-uplift, browser-panel, settings, e2e-harness]

tech-stack:
  added: []
  patterns:
    - Browser quick settings intentionally omit homepage/search and proxy/start-page/autocomplete controls
    - Settings schema validation is exposed through validateSettingValue and enforced on SETTINGS_SET
    - Settings-window Browser panel remains homepage/search source of truth while also surfacing bookmarks-bar visibility

key-files:
  created:
    - src/renderer/panels/BrowserMenu.tsx
    - src/renderer/panels/BrowserMenu.test.tsx
    - src/renderer/panels/BrowserSettingsPopover.tsx
    - src/renderer/panels/BrowserSettingsPopover.test.tsx
    - src/main/store.test.ts
    - src/renderer/settings/BrowserSettings.test.tsx
  modified:
    - src/renderer/panels/BrowserPanel.tsx
    - src/shared/types.ts
    - src/main/store.ts
    - src/renderer/settings/SettingsComponents.tsx
    - src/renderer/settings/BrowserSettings.tsx
    - e2e/browser-uplift.spec.ts

key-decisions:
  - "The BrowserPanel overflow menu exposes bookmarks-bar visibility, clear-data entry, and Browser Settings navigation, but never New Tab."
  - "The in-panel BrowserSettingsPopover contains only bookmarks-bar visibility and scoped clear-data entry; homepage/search remain in the Settings-window Browser panel."
  - "browserShowBookmarksBar defaults to true and is validated as a boolean by main-process settings schema logic."

patterns-established:
  - "Settings-window browser controls use the reusable Toggle with an accessible aria-label."
  - "E2E browser settings persistence uses a pinned workspace root across app restarts."

requirements-completed: [REQ-008]

duration: 35min
completed: 2026-06-26
---

# Phase 26 Plan 06: Browser Menu, Popover, and Bookmarks-Bar Setting Summary

**Browser overflow/settings controls for REQ-008 with persisted bookmarks-bar visibility and homepage/search kept in the Settings window**

The Browser Uplift requirements document and test plan were read first, before implementation or scope decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`

## Performance

- **Duration:** 35min
- **Started:** 2026-06-26T18:25:00Z
- **Completed:** 2026-06-26T19:00:42Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- Added `BrowserMenu` with bookmarks-bar toggle, clear-data entry point, and Browser Settings navigation while excluding New Tab and upstream tab controls.
- Added `BrowserSettingsPopover` scoped to bookmarks-bar visibility and clear-data entry only; it intentionally has no homepage/search/proxy/autocomplete/start-page controls.
- Wired BrowserPanel to show the menu without disturbing navigation, screenshot, star, or existing workspace-scoped bookmarks behavior.
- Added `browserShowBookmarksBar` to `AppSettings`, `DEFAULT_SETTINGS`, `SETTINGS_SCHEMA`, main settings validation, Settings-window Browser UI, and E2E persistence coverage.

## Task Commits

1. **Task 1 RED:** `205f389` test(26-06): add failing browser menu tests
2. **Task 1 GREEN:** `ddaaa49` feat(26-06): add browser menu and popover
3. **Task 2 RED:** `b35433e` test(26-06): add failing browser settings tests
4. **Task 2 GREEN:** `99fd11c` feat(26-06): persist bookmarks bar setting

## Files Created/Modified

- `src/renderer/panels/BrowserMenu.tsx` - Browser overflow menu with bookmarks-bar toggle, clear-data entry, and Settings-window navigation.
- `src/renderer/panels/BrowserMenu.test.tsx` - T-U-019 coverage for excluded New Tab and required menu controls.
- `src/renderer/panels/BrowserSettingsPopover.tsx` - Scoped in-panel quick settings surface with bookmarks-bar toggle and clear-data entry.
- `src/renderer/panels/BrowserSettingsPopover.test.tsx` - T-U-020 coverage and negative checks against homepage/search/proxy/autocomplete/start-page controls.
- `src/renderer/panels/BrowserPanel.tsx` - Browser menu integration and bookmarks-bar visibility gating.
- `src/shared/types.ts` - `browserShowBookmarksBar` AppSettings type and default.
- `src/main/store.ts` - `browserShowBookmarksBar` schema entry and `validateSettingValue()` enforcement for persisted settings.
- `src/main/store.test.ts` - T-U-021 settings schema validation coverage.
- `src/renderer/settings/SettingsComponents.tsx` - Optional accessible label support for reusable toggles.
- `src/renderer/settings/BrowserSettings.tsx` - Settings-window bookmarks-bar toggle while keeping homepage/search controls there.
- `src/renderer/settings/BrowserSettings.test.tsx` - T-U-031 coverage for Settings-window source-of-truth behavior.
- `e2e/browser-uplift.spec.ts` - T-E-014 persistence coverage for bookmarks-bar visibility across restart.

## Decisions Made

- Followed product Option A: homepage/search remain only in `src/renderer/settings/BrowserSettings.tsx`; the in-panel popover does not duplicate them.
- Clear-data remains an entry point in this plan. Confirmation and IPC behavior are left to 26-07 as planned.
- `browserShowBookmarksBar` defaults to enabled so the bookmarks bar added in 26-05 remains visible unless the user turns it off.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The initial T-E-014 implementation used the transient default workspace across restarts. The test was corrected to pin a workspace root with the existing E2E harness pattern so bookmark visibility persistence is measured against the same workspace.
- Vitest does not load jest-dom matchers globally, so one new assertion was written with plain DOM `getAttribute()`.
- A partial ambient `window.electronAPI` from the test environment caused a settings-store fire-and-forget save warning; the BrowserSettings test now deletes the ambient bridge for isolation.

## Verification

- `npx -p node@22 npm test -- src/renderer/panels/BrowserMenu.test.tsx src/renderer/panels/BrowserSettingsPopover.test.tsx src/renderer/panels/BrowserPanel.test.tsx` - PASS, 10 tests.
- `npx -p node@22 npm test -- src/main/store.test.ts src/renderer/settings/BrowserSettings.test.tsx src/renderer/panels/BrowserSettingsPopover.test.tsx` - PASS, 3 tests.
- `npx -p node@22 npm run typecheck` - PASS.
- `npx -p node@22 npm run build` - PASS, with existing Vite chunk warnings.
- `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` - PASS, 9 tests.

## Known Stubs

None. Stub scan found only existing input placeholders, typed nullable state, timer nulling, and test-local empty-string initialization.

## Threat Flags

None. This plan adds settings validation and renderer UI only; it introduces no new network endpoints, privileged file access, auth paths, FlashQuery calls, or browser partition clear behavior.

## User Setup Required

None.

## Next Phase Readiness

Plan 26-07 can wire the existing clear-data entry point to confirmation, browser-state cleanup, workspace partition clearing, and FlashQuery isolation tests. The UI intentionally exposes the entry now without implementing the clear-data IPC ahead of that plan.

## Self-Check: PASSED

- Created files exist: `src/renderer/panels/BrowserMenu.tsx`, `src/renderer/panels/BrowserMenu.test.tsx`, `src/renderer/panels/BrowserSettingsPopover.tsx`, `src/renderer/panels/BrowserSettingsPopover.test.tsx`, `src/main/store.test.ts`, `src/renderer/settings/BrowserSettings.test.tsx`.
- Commits exist: `205f389`, `ddaaa49`, `b35433e`, `99fd11c`.
- `BrowserMenu.tsx` and `BrowserSettingsPopover.tsx` contain no New Tab, homepage/search, proxy, autocomplete, or start-page controls.
- `browserShowBookmarksBar` is present in `AppSettings`, `DEFAULT_SETTINGS`, `SETTINGS_SCHEMA`, BrowserPanel, Settings-window Browser UI, and tests.
- The two mandatory product docs were read before implementation.

---
*Phase: 26-browser-uplift*
*Completed: 2026-06-26*
