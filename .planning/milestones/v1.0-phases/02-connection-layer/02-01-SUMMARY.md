---
phase: 02-connection-layer
plan: 01
subsystem: flashquery-connection
tags: [flashquery, electron-main, http-probe, vitest]

requires:
  - phase: 01-foundation
    provides: Inert FlashQueryClientManager skeleton and workspace FlashQueryConnection type
provides:
  - Explicit FlashQuery `/mcp/info` probe through `FlashQueryClientManager.connect`
  - Workspace-scoped connecting/live/disconnected status payloads
  - Safe error classification for failed, malformed, invalid JSON, and rejected probes
affects: [flashquery-client-manager, phase-02-retry, phase-03-ipc]

tech-stack:
  added: []
  patterns: [mocked-fetch-probe-tests, workspace-scoped-status-events, safe-network-error-payloads]

key-files:
  created:
    - .planning/phases/02-connection-layer/02-01-SUMMARY.md
  modified:
    - src/main/flashquery/clientManager.ts
    - src/main/flashquery/clientManager.test.ts

key-decisions:
  - "Keep `/mcp/info` unauthenticated even when the workspace connection includes bearer auth."
- "Expose manager status through the generic subscribe callback as the status payload itself, carrying workspaceId inline for later renderer broadcasts."
  - "Leave retry timers and manual retry for Plan 02-02 while preserving attempt tracking for superseded probes."

patterns-established:
  - "Status transitions are emitted through `subscribe(workspaceId, 'status', handler)` and also stored for `getStatus`."
  - "FlashQuery info payloads must include string `version` and `instance_id` before the manager reports `live`."

requirements-completed: [REQ-004, REQ-011]

duration: 4min
completed: 2026-05-29
---

# Phase 02 Plan 01: Probe Transport Summary

**FlashQuery manager now performs explicit unauthenticated `/mcp/info` probes and reports safe workspace-scoped status payloads.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-29T03:37:50Z
- **Completed:** 2026-05-29T03:41:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added failing RED coverage for the Phase 2 probe contract, including URL normalization, no Authorization header, live metadata, non-200 failures, fetch rejection failures, and token redaction.
- Implemented `connect(workspaceId, connection)` and `getStatus(workspaceId)` on `FlashQueryClientManager`.
- Added status payload exports for `connecting`, `live`, and `disconnected`, with `version` and `instanceId` only on live payloads and `error` only on disconnected payloads.
- Classified malformed info payloads and invalid JSON as disconnected without adding IPC, preload, renderer, vault, or UI surfaces.

## Task Commits

1. **Task 1: Add probe transport tests for REQ-004** - `b9b9fb7` (test)
2. **Task 2: Implement explicit HTTP info probe and status payloads** - `f8d59b0` (feat)

## Files Created/Modified

- `src/main/flashquery/clientManager.ts` - Adds the explicit `/mcp/info` probe, status types, status storage, event emission, response validation, and safe error mapping.
- `src/main/flashquery/clientManager.test.ts` - Covers T-U-021 through T-U-025 plus manager-side status payload shape checks for live/connecting/disconnected.
- `.planning/phases/02-connection-layer/02-01-SUMMARY.md` - Records execution outcome and verification evidence.

## Verification

- `npx vitest run src/main/flashquery/clientManager.test.ts` passed: 10 tests.
- `npm run typecheck` passed.
- `rg -n "flashquery:" src/preload src/shared/ipc-channels.ts src/main/ipc || true` returned no matches, confirming no new IPC/preload surface.

## Decisions Made

- The manager now emits `FlashQueryStatusPayload` directly to status subscribers, with `workspaceId` inline, so Phase 3 can map manager events to renderer broadcasts while preserving the REQ-006 `(event: T) => void` callback contract.
- The probe request uses only `method: 'GET'` and `Accept: 'application/json'`; bearer tokens are not read or sent for `/mcp/info`.
- Retry scheduling remains deferred to Plan 02-02 per this plan's explicit scope.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Typecheck caught an overly narrow test helper tuple cast after the GREEN implementation; fixed in the Task 2 commit.

## Known Stubs

None.

## Threat Flags

None - the new network response and bearer-token surfaces were already covered by the plan threat model.

## TDD Gate Compliance

- RED gate: `b9b9fb7` adds failing probe tests.
- GREEN gate: `f8d59b0` implements the probe and makes the focused tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-02 can extend the manager with retry timers, manual retry, backoff reset, and disposal cleanup using the status and attempt state introduced here.

## Self-Check: PASSED

- Found `src/main/flashquery/clientManager.ts`.
- Found `src/main/flashquery/clientManager.test.ts`.
- Found `.planning/phases/02-connection-layer/02-01-SUMMARY.md`.
- Found task commits `b9b9fb7` and `f8d59b0`.

---
*Phase: 02-connection-layer*
*Completed: 2026-05-29*
