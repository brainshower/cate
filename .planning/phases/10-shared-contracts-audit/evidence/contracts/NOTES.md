# Phase 10 Contract Evidence

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## IPC Channel Inventory

The post-handoff mainline tree keeps exactly seven FlashQuery IPC channel strings:

| Constant | Channel | Renderer API / event |
|----------|---------|----------------------|
| `FLASHQUERY_SET_CONNECTION` | `flashquery:setConnection` | `flashquerySetConnection()` |
| `FLASHQUERY_PROBE` | `flashquery:probe` | `flashqueryProbe()` |
| `FLASHQUERY_LIST_VAULT` | `flashquery:listVault` | `flashqueryListVault()` |
| `FLASHQUERY_GET_DOCUMENT` | `flashquery:getDocument` | `flashqueryGetDocument()` |
| `FLASHQUERY_WRITE_DOCUMENT` | `flashquery:writeDocument` | `flashqueryWriteDocument()` |
| `FLASHQUERY_RETRY` | `flashquery:retry` | `flashqueryRetry()` |
| `FLASHQUERY_STATUS` | `flashquery:status` | `onFlashQueryStatus()` main-to-renderer broadcast |

Evidence:

- `src/shared/ipc-channels.ts` exports the exact seven string values.
- `src/shared/ipc-channels.test.ts` asserts the exact FlashQuery channel set and rejects non-FlashQuery collisions (`T-U-001`, `T-U-002`).
- `src/main/ipc/flashquery.test.ts` asserts exact string constants and handler registration.
- `src/shared/electron-api.d.ts` declares the seven typed renderer methods/status subscription; `npm run typecheck` proves caller/API compatibility (`T-U-003`, `T-A-004`).

## Preload And Typed API Boundary

`src/preload/index.ts` exposes only the typed FlashQuery methods above. Each method invokes its matching channel and does not expose raw Node/Electron APIs to renderer code. Status remains subscription-only through `FLASHQUERY_STATUS`.

Phase 10 tightened `T-U-007` by changing `src/preload/index.ts` and adding `src/preload/index.test.ts`:

- Before the Phase 10 source change, the two `e2e*` context-menu helper properties were exposed on `window.electronAPI` in normal launches and guarded only inside their method bodies.
- Phase 10 moved those helpers into a conditional `Object.assign()` block that runs only when `CATE_E2E=1`, so the properties are absent in normal launches.
- With `CATE_E2E` unset, `isE2E` is false and E2E-only context-menu helpers are not present on `window.electronAPI`.
- With `CATE_E2E=1`, the helpers are present and intercept context-menu action selection for Playwright only.

This keeps preload helper reachability aligned with the optional E2E declarations in `src/shared/electron-api.d.ts`.

## E2E Harness Gate

The renderer harness remains gated by `window.electronAPI.isE2E` in `src/renderer/App.tsx`; `src/renderer/lib/e2eHarness.ts` installs `window.__cateE2E` only when dynamically imported by that gate. The Playwright fixture sets `CATE_E2E=1` in `e2e/fixtures/electron-app.ts`, so production launches do not install `window.__cateE2E`.

Evidence:

- `src/preload/index.test.ts` covers preload helper absence/presence under `CATE_E2E` (`T-U-007`).
- `src/renderer/lib/e2eHarnessGate.test.ts` covers the renderer harness half of `T-U-007`: when `isE2E` is false the harness importer is not called, and when `isE2E` is true the installer runs.
- `rg -n "CATE_E2E|__cateE2E|e2eHarness"` shows the gate in preload, App, harness, and Electron fixture surfaces.

## Phase 10 Preload Change Review

`src/preload/index.ts` is part of the `REQ-019` / `T-A-012` central conflict-review set. Phase 10 edited it to close a strict `REQ-010` reachability gap: the old production bridge exposed two inert-but-callable `e2e*` properties, while the current bridge assembles those properties only under `CATE_E2E=1`.

The local FlashQuery preload methods and channel wiring were preserved unchanged; only the E2E-only context-menu helper placement changed. The resolution is semantically correct because normal launches now have no reachable preload `e2e*` API, while Playwright launches still receive the same helper behavior through the `CATE_E2E` fixture path. Evidence is `src/preload/index.test.ts`, `src/renderer/lib/e2eHarnessGate.test.ts`, and the FlashQuery happy-path E2E context-menu flow included in the full FlashQuery E2E gate.

## Conflict Review Addendum

The Phase 8/9 central conflict review is complete for the `T-A-012` file set:

- `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/CONFLICT-REVIEW.md` covers `src/shared/ipc-channels.ts`, `src/shared/types.ts`, `src/shared/electron-api.d.ts`, `src/preload/index.ts`, `src/main/index.ts`, `src/renderer/lib/session.ts`, `src/renderer/stores/appStore.ts`, and removed/retained file decisions.
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md` records the T-A-012 addendum for `src/shared/types.ts`, `src/renderer/sidebar/Sidebar.tsx`, and `src/main/index.ts`.
- `.planning/phases/09-upstream-sync-mainline-handoff/09-VERIFICATION.md` records T-A-012 as passed after the fast-forward handoff to `main`.

## Commands

| Command | Result |
|---------|--------|
| `npm test -- src/preload/index.test.ts src/renderer/lib/e2eHarnessGate.test.ts src/shared/ipc-channels.test.ts src/main/ipc/flashquery.test.ts src/shared/types.test.ts` | Pass, 5 files / 30 tests |
| `npm run typecheck` | Pass |
| `rg -n "CATE_E2E|__cateE2E|e2eHarness" src/preload/index.ts src/renderer/lib/e2eHarness.ts e2e/fixtures/electron-app.ts src/shared/electron-api.d.ts` | Pass, expected gate references present |

## Result

Status: Passed.

No unresolved contract gaps remain for `REQ-008`, `REQ-010`, `REQ-019`, `REQ-024`, or `REQ-025`.
