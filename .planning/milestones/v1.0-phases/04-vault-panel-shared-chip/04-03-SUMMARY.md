---
phase: 04-vault-panel-shared-chip
plan: 03
subsystem: renderer-ipc
tags: [electron, ipc, flashquery, zustand, uri]
requires:
  - phase: 03-ipc-surface
    provides: FlashQuery IPC handlers and manager domain methods
provides:
  - Renderer-safe FlashQuery URI helper module
  - Main-process compatibility re-export for FlashQuery URI helpers
  - Manual FlashQuery retry IPC/preload/API bridge
  - Future FlashQuery connection dialog visibility state
affects: [phase-04-vault-panel, phase-05-settings-dialog, phase-06-editor-uri-awareness]
tech-stack:
  added: []
  patterns: [shared pure URI helpers, narrow preload retry bridge, zustand dialog visibility flag]
key-files:
  created:
    - src/shared/flashqueryUri.ts
    - src/shared/flashqueryUri.test.ts
    - src/renderer/stores/uiStore.test.ts
  modified:
    - src/main/flashquery/uri.ts
    - src/main/flashquery/uri.test.ts
    - src/shared/ipc-channels.ts
    - src/shared/electron-api.d.ts
    - src/preload/index.ts
    - src/main/ipc/flashquery.ts
    - src/main/ipc/flashquery.test.ts
    - src/renderer/stores/uiStore.ts
key-decisions:
  - "Keep URI parsing/building as dependency-free shared TypeScript and preserve main imports with a compatibility re-export."
  - "Expose manual retry only as flashqueryRetry(workspaceId), delegating to FlashQueryClientManager.retry after non-empty string validation."
  - "Add only UI-store visibility state for the future connection dialog; no Phase 5 dialog or workspace menu behavior was implemented."
patterns-established:
  - "Renderer FlashQuery URI creation should import from src/shared/flashqueryUri.ts, not src/main/flashquery/uri.ts."
  - "Manual FlashQuery retry uses a narrow invoke channel and does not expose generic manager or MCP execution."
requirements-completed: [REQ-017, REQ-019, REQ-025]
duration: 6min
completed: 2026-05-29
---

# Phase 04 Plan 03: Narrow Renderer Hooks Summary

**Renderer-safe FlashQuery URI helpers, manual retry IPC, and future connection-dialog visibility state**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-29T15:43:39Z
- **Completed:** 2026-05-29T15:49:29Z
- **Tasks:** 3
- **Files modified:** 11

## Accomplishments

- Moved canonical `flashquery://` URI build/parse logic into `src/shared/flashqueryUri.ts` for renderer-safe imports.
- Added `flashquery:retry` across shared constants, Electron API types, preload, and main IPC handler delegation.
- Added `showFlashQueryConnectionDialog` and `setShowFlashQueryConnectionDialog` to `uiStore` for Phase 4 actions without implementing the Phase 5 dialog.

## Task Commits

1. **Task 1 RED: shared URI helper contract** - `ffa203f` (test)
2. **Task 1 GREEN: shared URI helper extraction** - `7961159` (feat)
3. **Task 2 RED: manual retry IPC coverage** - `eae13bb` (test)
4. **Task 2 GREEN: manual retry IPC bridge** - `0c09ec2` (feat)
5. **Task 3 RED: FlashQuery dialog UI-store coverage** - `518dceb` (test)
6. **Task 3 GREEN: FlashQuery dialog visibility state** - `d23c482` (feat)

**Plan metadata:** this summary commit.

## Files Created/Modified

- `src/shared/flashqueryUri.ts` - Canonical dependency-free URI helper implementation.
- `src/shared/flashqueryUri.test.ts` - Shared helper contract tests.
- `src/main/flashquery/uri.ts` - Compatibility re-export for existing main imports.
- `src/main/flashquery/uri.test.ts` - Existing compatibility coverage continued to pass.
- `src/shared/ipc-channels.ts` - Adds `FLASHQUERY_RETRY = 'flashquery:retry'`.
- `src/shared/electron-api.d.ts` - Adds `flashqueryRetry(workspaceId): Promise<void>`.
- `src/preload/index.ts` - Exposes `flashqueryRetry` via `ipcRenderer.invoke`.
- `src/main/ipc/flashquery.ts` - Validates retry `workspaceId` and delegates to manager retry.
- `src/main/ipc/flashquery.test.ts` - Covers retry registration, validation, and manager delegation.
- `src/renderer/stores/uiStore.ts` - Adds future dialog visibility flag and setter.
- `src/renderer/stores/uiStore.test.ts` - Covers closed default, open, and close behavior.

## Decisions Made

- Kept `src/main/flashquery/uri.ts` as a no-logic wrapper so Phase 3 imports remain stable.
- Returned `void` from the renderer-facing retry API; status changes still flow through the existing status broadcast path.
- Used the existing boolean dialog-state style in `uiStore` and deferred all dialog fields, save/remove/probe behavior, and workspace menu wiring.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No Phase 5 dialog component, URL/token fields, or workspace menu entry were added.

## Issues Encountered

The local default `node` binary is v24.7.0, outside Cate's supported `>=20 <23` range. Verification was run through `npx -p node@22`, which used Node v22.22.3.

During execution another workstream had uncommitted `src/renderer/components/Chip.*` changes in the tree. They were not staged or modified by this plan.

## Verification

- `npx -p node@22 npm test -- src/shared/flashqueryUri.test.ts src/main/flashquery/uri.test.ts src/main/ipc/flashquery.test.ts src/renderer/stores/uiStore.test.ts` - PASSED, 4 files / 32 tests.
- `npx -p node@22 npm run typecheck` - PASSED.

## Known Stubs

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 4 vault panel work can import `buildVaultUri` from `src/shared/flashqueryUri.ts`, call `window.electronAPI.flashqueryRetry(workspaceId)`, and open the future connection-dialog state through `useUIStore`.

## Self-Check: PASSED

Verified all 11 task files plus this summary exist on disk. Verified task commits `ffa203f`, `7961159`, `eae13bb`, `0c09ec2`, `518dceb`, and `d23c482` exist in git history.

---
*Phase: 04-vault-panel-shared-chip*
*Completed: 2026-05-29*
