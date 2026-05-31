---
phase: 02-connection-layer
plan: 02
subsystem: flashquery-connection
tags: [flashquery, electron-main, retry, vitest, fake-timers]

requires:
  - phase: 02-connection-layer
    provides: Plan 02-01 FlashQuery `/mcp/info` probe and status payload contract
provides:
  - Per-workspace bounded exponential retry for failed FlashQuery probes
  - Public `FlashQueryClientManager.retry(workspaceId)` manual retry entry point
  - Dispose cleanup that cancels retry timers and suppresses stale async completions
affects: [flashquery-client-manager, phase-03-ipc, phase-04-status-chip]

tech-stack:
  added: []
  patterns: [workspace-scoped-retry-state, fake-timer-backoff-tests, generation-guarded-status-events]

key-files:
  created:
    - .planning/phases/02-connection-layer/02-02-SUMMARY.md
  modified:
    - src/main/flashquery/clientManager.ts
    - src/main/flashquery/clientManager.test.ts

key-decisions:
  - "Manual retry clears the pending timer and immediately probes while preserving consecutive-failure backoff progression."
  - "Retry timers are owned by the workspace state and cleared before every explicit probe, on success, and on dispose."
  - "Stale completions after dispose are suppressed by checking the current workspace state and attempt generation before emitting or scheduling."

patterns-established:
  - "Failed probes emit `disconnected` and schedule retry using the current delay before advancing the next delay."
  - "Successful probes clear retry timers and reset the next retry delay to 2_000 ms."
  - "Timer callbacks re-enter the same probe path and no-op if the workspace state has been disposed or superseded."

requirements-completed: [REQ-005, REQ-011]

duration: 4min
completed: 2026-05-29
---

# Phase 02 Plan 02: State Machine and Retry Summary

**FlashQuery manager retry state now handles transient outages with bounded backoff, manual retry, and dispose-safe cleanup.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-29T03:45:42Z
- **Completed:** 2026-05-29T03:49:55Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added fake-timer coverage for T-U-026 through T-U-032, including retry boundaries, manual retry timer clearing, success reset, and dispose cleanup.
- Implemented per-workspace retry delay/timer state with 2_000 ms initial delay, exponential doubling, and 60_000 ms cap.
- Added `FlashQueryClientManager.retry(workspaceId)` for Phase 3/UI callers to trigger immediate reconnect attempts.
- Updated dispose and async probe handling so disposed workspaces do not retain timers, emit late statuses, or recreate manager state.

## Task Commits

1. **Task 1: Add fake-timer tests for retry and disposal** - `1fd506e` (test)
2. **Task 2: Implement retry state, manual retry, and cleanup** - `c66b39f` (feat)

## Files Created/Modified

- `src/main/flashquery/clientManager.ts` - Adds retry constants, retry timer ownership, manual retry, success reset, dispose cleanup, and stale-completion guards.
- `src/main/flashquery/clientManager.test.ts` - Adds fake-timer coverage for T-U-026 through T-U-032 while preserving Plan 01 probe tests.
- `.planning/phases/02-connection-layer/02-02-SUMMARY.md` - Records execution outcome and verification evidence.

## Verification

- `npx vitest run src/main/flashquery/clientManager.test.ts` passed: 15 tests.
- `npm run typecheck` passed.
- `rg -n "flashquery:" src/preload src/shared/ipc-channels.ts src/main/ipc || true` returned no matches, confirming no Phase 2 IPC/preload surface was added.

## Decisions Made

- Manual retry cancels the old pending timer and probes immediately; if that probe also fails, it is treated as the next consecutive failed probe for backoff progression.
- `retry(workspaceId)` returns a safe disconnected payload when no prior connection exists instead of throwing.
- Timer callbacks use the same probe implementation as explicit `connect`/`retry`, guarded by workspace state identity and attempt generation.

## Deviations from Plan

None - plan executed exactly as written.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope changes; implementation stayed within the declared manager and test files.

## Issues Encountered

- The first RED test version assumed the retry scheduled after a failed manual retry would fire at 2 seconds. During GREEN implementation, this was corrected to assert the actual required behavior: the old pending timer is cleared and consecutive failed probes continue backoff progression.

## Known Stubs

None.

## Threat Flags

None - retry timers, network failure status payloads, stored connection retries, and stale completion handling were covered by the plan threat model.

## TDD Gate Compliance

- RED gate: `1fd506e` adds failing retry/manual retry/dispose tests.
- GREEN gate: `c66b39f` implements retry behavior and makes the focused tests pass.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 02-03 can finalize manager subscription-event behavior and isolation on top of the status event and retry lifecycle implemented here. Phase 3 can call `connect`, `retry`, `getStatus`, and `subscribe` without adding retry ownership outside the manager.

## Self-Check: PASSED

- Found `src/main/flashquery/clientManager.ts`.
- Found `src/main/flashquery/clientManager.test.ts`.
- Found `.planning/phases/02-connection-layer/02-02-SUMMARY.md`.
- Found task commits `1fd506e` and `c66b39f`.

---
*Phase: 02-connection-layer*
*Completed: 2026-05-29*
