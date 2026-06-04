---
phase: 18-call-model-call-macro-and-diagnostics-data
plan: 03
subsystem: agent-renderer
tags: [flashquery, diagnostics, agent-store, session-replay, e2e]
requires:
  - phase: 18-call-model-call-macro-and-diagnostics-data
    provides: call_model and call_macro structured FlashQuery details from Plans 18-01 and 18-02
provides:
  - live ToolMessage FlashQuery diagnostics preservation
  - session replay FlashQuery diagnostics preservation
  - mocked T-E-006 E2E evidence and T-M-002/T-M-003 manual blocker notes
affects: [phase-19-toolcards, agent-session-replay, flashquery-observability]
tech-stack:
  added: []
  patterns:
    - Existing tool messages carry optional flashquery details without new message types
    - E2E harness can dispatch mocked agent events through the real renderer handler
key-files:
  created:
    - src/agent/renderer/agentStore.test.ts
    - src/agent/main/sessionFiles.test.ts
    - e2e/flashquery-pi-diagnostics.spec.ts
    - .planning/phases/18-call-model-call-macro-and-diagnostics-data/18-UAT.md
  modified:
    - src/agent/renderer/agentStore.ts
    - src/agent/main/sessionFiles.ts
    - src/renderer/lib/e2eHarness.ts
key-decisions:
  - "FlashQuery diagnostics attach to existing ToolMessage data via optional flashquery details, not a new chat message type."
  - "Credential-bearing fields are stripped before FlashQuery diagnostics reach renderer/session state."
patterns-established:
  - "Renderer event tests mock onAgentEvent before importing agentStore because subscription happens at module import."
  - "Mocked E2E diagnostics evidence uses the real store event handler through a test-only harness hook."
requirements-completed: [REQ-015, REQ-016]
duration: 14 min
completed: 2026-06-04
---

# Phase 18 Plan 03: Diagnostics Preservation Summary

**FlashQuery diagnostics preserved through live agent tool messages, session replay, and mocked E2E evidence**

## Performance

- **Duration:** 14 min
- **Started:** 2026-06-04T15:20:00Z
- **Completed:** 2026-06-04T15:34:00Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added T-U-018 live/replay tests for FlashQuery diagnostics while preserving standard text and subagent behavior.
- Added optional `flashquery` diagnostics to renderer and replayed tool messages with credential-field filtering.
- Added runnable mocked T-E-006 E2E coverage and documented T-M-002/T-M-003 manual blockers/evidence expectations.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add diagnostics preservation tests first** - `8d5688f` (test)
2. **Task 2: Preserve FlashQuery details in store and replay** - `ce21dbe` (feat)
3. **Task 3: Add mocked E2E and manual evidence notes** - `9f7b2fd` (test)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/agent/renderer/agentStore.test.ts` - T-U-018 live event preservation tests.
- `src/agent/main/sessionFiles.test.ts` - T-U-018 replay preservation tests.
- `src/agent/renderer/agentStore.ts` - Preserves sanitized FlashQuery details on live tool update/end events.
- `src/agent/main/sessionFiles.ts` - Replays sanitized FlashQuery details from persisted tool results.
- `src/renderer/lib/e2eHarness.ts` - Adds E2E-only mocked agent event dispatch and message inspection.
- `e2e/flashquery-pi-diagnostics.spec.ts` - T-E-006 mocked diagnostics preservation coverage.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-UAT.md` - Automated evidence and manual blocker notes.

## Decisions Made

- Phase 18 stores data only; full collapsed/expanded ToolCard rendering remains Phase 19.
- FlashQuery diagnostic details are accepted only when `details.flashquery === true`.
- Token/header/handoff/endpoint/request-init fields are filtered from persisted renderer/session diagnostics.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope changes.

## Issues Encountered

- Initial E2E run used a stale built `dist` app, so the new harness methods were unavailable. Rebuilt with `npm run build` and reran the focused E2E successfully.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test -- src/agent/renderer/agentStore.test.ts src/agent/main/sessionFiles.test.ts` - passed
- `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` - passed after rebuild
- `npm run typecheck` - passed
- `npm run build` - passed

## Next Phase Readiness

Phase 19 can render rich FlashQuery ToolCards from existing tool messages using preserved `flashquery` details. Manual live-provider checks T-M-002 and T-M-003 remain blocked until a live FlashQuery macro/model runtime and provider credentials are available.

---
*Phase: 18-call-model-call-macro-and-diagnostics-data*
*Completed: 2026-06-04*
