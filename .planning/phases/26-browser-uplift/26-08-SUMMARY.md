---
phase: 26-browser-uplift
plan: 08
subsystem: browser
tags: [electron, webview, shortcuts, crash-recovery, preload, playwright]

requires:
  - phase: 26-browser-uplift
    provides: Main-frame browser error handling from 26-02
  - phase: 26-browser-uplift
    provides: Browser workspace targeting and E2E harness from 26-07
provides:
  - Reloadable BrowserPanel crash overlay for non-clean webview renderer exits
  - Narrow webview shortcut classifier and main-to-renderer forwarding
  - Typed `BROWSER_SHORTCUT` preload subscription
  - Focus-owned BrowserPanel command execution for reload, URL focus, back, and forward
affects: [browser-uplift, webview-security, preload-api, e2e-harness]

tech-stack:
  added: []
  patterns:
    - Main webview `before-input-event` classifier forwards only allowlisted browser commands
    - Renderer applies browser shortcut commands only when the panel owns the focused webview
    - CATE_E2E harness may simulate unreliably automatable webview crash/shortcut events

key-files:
  created:
    - src/main/webSecurity.test.ts
    - .planning/phases/26-browser-uplift/26-08-SUMMARY.md
  modified:
    - src/main/webSecurity.ts
    - src/shared/ipc-channels.ts
    - src/shared/types.ts
    - src/preload/index.ts
    - src/shared/electron-api.d.ts
    - src/renderer/panels/BrowserPanel.tsx
    - src/renderer/panels/BrowserPanel.test.tsx
    - src/renderer/lib/e2eHarness.ts
    - e2e/browser-uplift.spec.ts

key-decisions:
  - "Browser crash E2E uses the allowed CATE_E2E simulation hook instead of inducing a real Chromium crash."
  - "Shortcut forwarding is allowlist-only and rejects app-management shortcuts including Cmd/Ctrl+T, Cmd/Ctrl+W, and Cmd/Ctrl+Shift+B."
  - "Back/forward shortcut behavior is verified at unit level because Electron webview guest history was not reliable under Playwright automation."

patterns-established:
  - "Shared browser events use explicit action unions and unsubscribe-returning preload APIs."
  - "BrowserPanel webview command execution is guarded by focused-webview ownership."

requirements-completed: [REQ-005, REQ-006]

duration: 85min
completed: 2026-06-26
---

# Phase 26 Plan 08: Crash Recovery and Shortcut Forwarding Summary

**Reloadable browser crash recovery plus allowlisted focused-webview shortcut forwarding**

The Browser Uplift requirements document and test plan were read first, before implementation or scope decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`

## Performance

- **Duration:** 85min
- **Started:** 2026-06-26T18:22:00Z
- **Completed:** 2026-06-26T19:47:13Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added BrowserPanel crash state for `render-process-gone` / `crashed`, ignoring `clean-exit` and showing a distinct reload overlay for non-clean exits.
- Added `BROWSER_SHORTCUT` with typed preload subscription and `BrowserShortcutAction`.
- Added `classifyWebviewShortcut()` in `webSecurity.ts`, forwarding only Cmd/Ctrl+R, L, `[`, and `]` from webview guest contents.
- Added BrowserPanel `runBrowserAction()` for reload, focus URL, back, and forward, guarded to the focused owning webview.
- Added focused unit and E2E coverage for T-U-012 through T-U-016, T-E-009, T-E-010, and T-E-011 where feasible.

## Task Commits

1. **Task 1 RED:** `619e310` test(26-08): add failing browser crash recovery tests
2. **Task 1 GREEN:** `c4fafb2` feat(26-08): recover crashed browser webviews
3. **Task 2 RED:** `d656526` test(26-08): add failing browser shortcut tests
4. **Task 2 GREEN:** `41979fd` feat(26-08): forward scoped browser shortcuts

## Files Created/Modified

- `src/main/webSecurity.ts` - Webview shortcut classifier and forwarding from guest contents to host renderer.
- `src/main/webSecurity.test.ts` - T-U-014 and T-U-015 classifier coverage.
- `src/shared/ipc-channels.ts` - Adds `BROWSER_SHORTCUT`.
- `src/shared/types.ts` - Adds `BrowserShortcutAction`.
- `src/preload/index.ts` - Adds `onBrowserShortcut()` subscription.
- `src/shared/electron-api.d.ts` - Declares the browser shortcut preload API.
- `src/renderer/panels/BrowserPanel.tsx` - Adds crash overlay and focused-webview shortcut command handling.
- `src/renderer/panels/BrowserPanel.test.tsx` - Adds T-U-012, T-U-013, and T-U-016 coverage.
- `src/renderer/lib/e2eHarness.ts` - Adds CATE_E2E crash/shortcut simulation helpers.
- `e2e/browser-uplift.spec.ts` - Adds T-E-009, T-E-010, and T-E-011 coverage.

## Decisions Made

- Used `event.code` first for shortcut classification, with key fallback, to match the product requirement for layout-independent recognition where available.
- Did not add tab commands or browser tab behavior.
- Kept app-management shortcuts out of the browser forwarding allowlist so Cate menu/shortcut handling remains authoritative.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added E2E shortcut simulation hook**
- **Found during:** Task 2 (Scoped shortcut forwarding)
- **Issue:** Playwright keyboard input did not reliably reach Electron webview guest `before-input-event`, even after clicking and focusing the guest document.
- **Fix:** Added a CATE_E2E-gated `simulateBrowserShortcut(panelId, action)` harness path that dispatches to the target webview only. Main-process classifier behavior remains covered by `webSecurity.test.ts`.
- **Files modified:** `src/renderer/lib/e2eHarness.ts`, `src/renderer/panels/BrowserPanel.tsx`, `e2e/browser-uplift.spec.ts`
- **Verification:** `npx -p node@22 npm test -- src/main/webSecurity.test.ts src/renderer/panels/BrowserPanel.test.tsx`; `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts`
- **Committed in:** `41979fd`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** Production behavior remained in scope. E2E directly verifies crash recovery, reload/focus-url shortcut effects, and app shortcut non-tab behavior; back/forward command dispatch is verified in T-U-016 because Electron webview history navigation was unreliable under Playwright.

## Issues Encountered

- Direct Chromium crash induction was not used; the plan explicitly allowed a `CATE_E2E` simulation hook for T-E-009.
- Electron webview guest keyboard and history navigation are brittle under Playwright. The final E2E uses targeted harness simulation for shortcut delivery and omits direct back/forward history assertions; T-U-016 covers the actual `goBack()` / `goForward()` method mapping.

## Verification

- `npx -p node@22 npm test -- src/renderer/panels/BrowserPanel.test.tsx` - PASS, 11 tests after Task 1.
- `npx -p node@22 npm run build` - PASS, with existing Vite dynamic-import chunk warnings.
- `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` - PASS, 12 tests after Task 1.
- `npx -p node@22 npm test -- src/main/webSecurity.test.ts src/renderer/panels/BrowserPanel.test.tsx` - PASS, 15 tests.
- `npx -p node@22 npm run typecheck` - PASS.
- `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` - PASS, 14 tests.
- Final plan-level command: `npx -p node@22 npm test -- src/main/webSecurity.test.ts src/renderer/panels/BrowserPanel.test.tsx && npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts && npx -p node@22 npm run typecheck` - PASS.

## Known Stubs

None. Stub scan hits were existing placeholder wording/types, null initialization, and test-local empty values; no incomplete runtime behavior was introduced.

## Threat Flags

None. The plan implements the expected webview guest-to-host shortcut boundary and focused panel ownership check; it adds no network endpoints, auth paths, file access paths, schema changes, or FlashQuery surfaces.

## User Setup Required

None.

## Next Phase Readiness

Plan 26-09 can add FlashQuery isolation contract tests on top of crash recovery and shortcut forwarding. Browser shortcut forwarding is narrow, typed, and isolated to focused browser panels.

## Self-Check: PASSED

- Created files exist: `src/main/webSecurity.test.ts`, `.planning/phases/26-browser-uplift/26-08-SUMMARY.md`.
- Commits exist: `619e310`, `c4fafb2`, `d656526`, `41979fd`.
- Product docs read first: Browser Uplift requirements and test plan.
- `BROWSER_SHORTCUT` and `runBrowserAction` now exist.
- Final verification command passed.

---
*Phase: 26-browser-uplift*
*Completed: 2026-06-26*
