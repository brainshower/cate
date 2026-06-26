---
phase: 26-browser-uplift
plan: 03
subsystem: browser
tags: [electron, ipc, webview, screenshot, playwright, vitest]

requires:
  - phase: 26-browser-uplift
    provides: Workspace-scoped browser partitions from 26-01
  - phase: 26-browser-uplift
    provides: Load-error and portal bridge coverage from 26-02
provides:
  - Focused capture IPC module for page capture, webview screenshot, and native file drag
  - Webview screenshot ownership tests for authorized and unauthorized callers
  - Negative registration coverage excluding proxy and extraction handlers
  - Local screenshot-thumbnail E2E coverage
affects: [browser-uplift, main-ipc, e2e-harness]

tech-stack:
  added: []
  patterns:
    - Main-process capture handlers registered through registerCaptureHandlers()
    - Mocked Electron IPC handler tests invoke registered handlers directly

key-files:
  created:
    - src/main/ipc/capture.ts
    - src/main/ipc/capture.test.ts
  modified:
    - src/main/index.ts
    - e2e/browser-uplift.spec.ts

key-decisions:
  - "Capture IPC lives in src/main/ipc/capture.ts and is registered once from the critical startup handler set."
  - "Preload/API/channel names for capturePage(), webviewScreenshot(), and nativeFileDrag() remained unchanged."
  - "No upstream proxy, extraction, vault write, cate_browser, or FlashQuery code was added."

patterns-established:
  - "Screenshot IPC ownership checks stay in main and are pinned by direct mocked-Electron integration tests."
  - "Browser screenshot E2E uses a local HTTP page and asserts the existing draggable data URL thumbnail."

requirements-completed: [REQ-010]

duration: 10min
completed: 2026-06-26
---

# Phase 26 Plan 03: Capture IPC Relocation Summary

**Modular browser capture IPC preserving Desktop PNG screenshots, data URLs, and webview ownership checks**

The Browser Uplift requirements document and test plan were read first, before implementation or scope decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`

## Performance

- **Duration:** 10min
- **Started:** 2026-06-26T18:10:00Z
- **Completed:** 2026-06-26T18:19:18Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Moved `CAPTURE_PAGE`, `WEBVIEW_SCREENSHOT`, and `NATIVE_FILE_DRAG` handler registration into `src/main/ipc/capture.ts`.
- Registered `registerCaptureHandlers()` exactly once from `registerCriticalHandlers()` in `src/main/index.ts`.
- Preserved Desktop `screenshot-*.png` naming, `{ filePath, dataUrl }`, `nativeImage` drag behavior, and webview guest ownership validation using `BrowserWindow.fromWebContents`, `webContents.fromId`, and `hostWebContents`.
- Added T-I-004, T-I-005, T-I-006, and T-E-016 coverage without changing preload/API/channel names.

## Task Commits

1. **Task 1 RED:** `5cf30ce` test(26-03): add failing capture ipc tests
2. **Task 1 GREEN:** `d917c25` feat(26-03): relocate capture ipc handlers
3. **Task 2:** `5d8e237` test(26-03): cover browser screenshot thumbnail e2e

## Files Created/Modified

- `src/main/ipc/capture.ts` - New capture IPC registration module.
- `src/main/ipc/capture.test.ts` - T-I-004, T-I-005, and T-I-006 mocked-Electron integration coverage.
- `src/main/index.ts` - Imports and registers `registerCaptureHandlers()` once; inline capture handlers removed.
- `e2e/browser-uplift.spec.ts` - T-E-016 local-page screenshot thumbnail coverage.

## Decisions Made

Followed the plan scope exactly for production behavior. Existing shared channels, preload methods, and `ElectronAPI` declarations were left unchanged because the relocation did not require contract movement.

## Deviations from Plan

### Auto-fixed Issues

None.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** Production scope remained limited to REQ-010 relocation and verification.

## Issues Encountered

- The Task 2 E2E initially used `getByTitle('Screenshot')`, which also matched the local page title. The selector was narrowed to `getByRole('button', { name: 'Screenshot' })`; this was a test selector fix before commit.
- The Task 2 TDD RED gate did not fail after adding E2E coverage because the renderer/preload screenshot contract already existed and Task 1 preserved the main-process behavior. The test was committed as preservation coverage with no unnecessary production change.

## Verification

- `npx -p node@22 npm test -- src/main/ipc/capture.test.ts` - PASS, 3 tests.
- `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` - PASS, 6 tests.
- `npx -p node@22 npm run typecheck` - PASS.

## Known Stubs

None.

## Threat Flags

None.

## User Setup Required

None.

## Next Phase Readiness

Plan 26-04 can build browser state IPC/preload contracts with capture handlers isolated from `src/main/index.ts`. REQ-010 is covered without adding proxy, extraction, FlashQuery server, or vault-write behavior.

## Self-Check: PASSED

- Created files exist: `src/main/ipc/capture.ts`, `src/main/ipc/capture.test.ts`, `.planning/phases/26-browser-uplift/26-03-SUMMARY.md`.
- Modified E2E file exists: `e2e/browser-uplift.spec.ts`.
- Commits exist: `5cf30ce`, `d917c25`, `5d8e237`.
- `rg` confirms `CAPTURE_PAGE`, `WEBVIEW_SCREENSHOT`, and `NATIVE_FILE_DRAG` handler registration lives in `src/main/ipc/capture.ts`, with `registerCaptureHandlers()` called once from `src/main/index.ts`.
- The two mandatory product docs were read before implementation.

---
*Phase: 26-browser-uplift*
*Completed: 2026-06-26*
