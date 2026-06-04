---
phase: 19-pi-toolcard-observability-rendering
plan: 01
subsystem: agent-renderer
tags: [flashquery, toolcards, react, diagnostics, vitest]
requires:
  - phase: 18-call-model-call-macro-and-diagnostics-data
    provides: sanitized ToolMessage.flashquery diagnostics for call_model and call_macro
provides:
  - rich call_model ToolCard summary and expanded diagnostics rendering
  - completed call_macro trace table rendering inside normal Pi ToolCards
  - T-U-019 component coverage for REQ-017 ToolCard behavior and degradation
affects: [phase-19-toolcard-ui, flashquery-observability, agent-chat-rendering]
tech-stack:
  added: []
  patterns:
    - Existing ToolMessage rows branch to rich rendering only for call_model and call_macro
    - Renderer reads whitelisted diagnostic fields and recursively filters displayed payload keys
key-files:
  created:
    - src/agent/renderer/ChatThread.test.tsx
  modified:
    - src/agent/renderer/ChatThread.tsx
    - src/agent/renderer/ChatThread.test.tsx
key-decisions:
  - "Rich FlashQuery observability stays inside existing Pi ToolCard rows; running call_model/call_macro rows continue through generic ToolCard behavior."
  - "Displayed diagnostic payloads are limited to whitelisted sections and recursively filter credential-bearing keys."
patterns-established:
  - "Final-only FlashQuery ToolCard summaries are built from present diagnostic segments and omit malformed values."
  - "Long call_model messages payloads render behind a nested disclosure control."
requirements-completed: [REQ-017]
duration: 22 min
completed: 2026-06-04
---

# Phase 19 Plan 01: Pi ToolCard Observability Rendering Summary

**FlashQuery call_model and call_macro observability through Cate's existing Pi ToolCard rows**

## Performance

- **Duration:** 22 min
- **Started:** 2026-06-04T16:45:00Z
- **Completed:** 2026-06-04T17:07:50Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `T-U-019` component coverage for `REQ-017` collapsed summaries, expanded diagnostics, macro trace tables, generic fallback, running-state behavior, and sanitized degradation.
- Added `call_model` rich ToolCard rendering for resolution chain, injected refs, server-side FlashQuery tool loop, cost, template params, and nested messages payload.
- Added completed `call_macro` trace table rendering while keeping ordinary FlashQuery tools and running special tools on the generic ToolCard path.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add T-U-019 ToolCard rendering expectations** - `9edf7ca` (test)
2. **Task 2: Implement rich FlashQuery ToolCard rendering** - `d05b830` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/agent/renderer/ChatThread.test.tsx` - New `T-U-019` component tests for `REQ-017` behavior and sanitization boundaries.
- `src/agent/renderer/ChatThread.tsx` - Adds isolated rich FlashQuery ToolCard branch and defensive diagnostic helpers.

## Decisions Made

- Rich FlashQuery rendering is selected only for existing `ToolMessage` rows with `msg.flashquery` and `name === 'call_model' || name === 'call_macro'`.
- Running/pending `call_model` and `call_macro` rows return to the existing generic `ToolCard`, preserving standard pulse and real partial-text behavior without fabricated progress.
- Template params and messages payloads are displayed only after recursive filtering for credential-bearing keys such as authorization, bearer/token fields, headers, cookies, handoff, endpoint, request-init, API key, secret, and password fields.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Stabilized the new component test harness**
- **Found during:** Task 1
- **Issue:** Initial `ChatThread.test.tsx` run hung because the renderer import graph pulled in the normal logger path and jsdom lacked `scrollTo`.
- **Fix:** Added the existing renderer-test logger mock pattern and a local `Element.prototype.scrollTo` stub in the new test file.
- **Files modified:** `src/agent/renderer/ChatThread.test.tsx`
- **Verification:** `npm test -- src/agent/renderer/ChatThread.test.tsx -t "collapsed summary" --testTimeout=5000 --hookTimeout=5000` exited deterministically with the intended RED failure.
- **Committed in:** `9edf7ca`

**Total deviations:** 1 auto-fixed (Rule 3 blocking).
**Impact on plan:** No scope change; the fix made the planned RED/GREEN component suite runnable.

## Issues Encountered

- The first test patch was accidentally applied in the original FlashQuery working directory rather than the Cate repo. The accidental file was deleted before any commit, and `git status` in FlashQuery returned clean for that path.
- The Task 2 macro test initially queried `Used` as a unique row label and assumed running generic output was visible while collapsed. The test was tightened to expand the running generic row before asserting the real progress text.
- A hook-order issue was found before commit: `FlashQueryToolCard` originally returned early for running rows before calling `useState`. The hook now runs consistently before the running fallback.

## Verification

- `npm test -- src/agent/renderer/ChatThread.test.tsx` - failed before implementation with 4 expected RED failures after Task 1; passed after Task 2 with 6 tests.
- `npm test -- src/agent/renderer/agentStore.test.ts` - passed, 2 tests.
- `npm run typecheck` - passed.

## Known Stubs

None. Stub-pattern scan found only expected optional/fallback values in existing code and tests; no UI-blocking placeholder data was introduced.

## Threat Flags

None. No new network endpoints, auth paths, file access patterns, or schema changes were introduced.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 19-01 satisfies the component-level `REQ-017`/`T-U-019` behavior. E2E/manual evidence for mocked and live FlashQuery Pi diagnostics remains in the later validation scope from the phase plan.

## Self-Check: PASSED

- `src/agent/renderer/ChatThread.tsx` exists.
- `src/agent/renderer/ChatThread.test.tsx` exists.
- `.planning/phases/19-pi-toolcard-observability-rendering/19-01-SUMMARY.md` exists.
- Commit `9edf7ca` exists.
- Commit `d05b830` exists.

---
*Phase: 19-pi-toolcard-observability-rendering*
*Completed: 2026-06-04*
