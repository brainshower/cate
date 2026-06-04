---
phase: 18-call-model-call-macro-and-diagnostics-data
plan: 02
subsystem: agent-extension
tags: [flashquery, pi-extension, call-macro, progress, diagnostics]
requires:
  - phase: 18-call-model-call-macro-and-diagnostics-data
    provides: Shared FlashQuery diagnostics normalization and client options support from Plan 18-01
provides:
  - call_macro Pi tool wrapper with inline source confirmation and source_ref no-confirm dispatch
  - default interactive macro progress options and request-scoped progress forwarding
  - exact disconnected macro error text and preserved macro result envelopes
affects: [phase-19-toolcards, flashquery-pi-extension, agent-diagnostics]
tech-stack:
  added: []
  patterns:
    - Specialized FlashQuery wrappers use ordinary Pi tool results with structured FlashQuery details
    - Live macro progress forwards only MCP-provided messages without fabricated status rows
key-files:
  created:
    - src/agent/extensions/cate-flashquery/macro-tool.ts
  modified:
    - src/agent/extensions/cate-flashquery/lifecycle.ts
    - src/agent/extensions/cate-flashquery/lifecycle.test.ts
key-decisions:
  - "Inline macro source requires ctx.ui.confirm; source_ref dispatch remains direct because the referenced macro is already workspace-scoped."
  - "Macro progress uses request-scoped onprogress callbacks and forwards latest real text only."
patterns-established:
  - "Macro needs_user_input remains a tool-result envelope for the host model rather than a hard transport error."
requirements-completed: [REQ-016]
duration: 8 min
completed: 2026-06-04
---

# Phase 18 Plan 02: call_macro Specialization Summary

**FlashQuery call_macro Pi wrapper with inline confirmation, interactive progress defaults, live progress forwarding, and macro diagnostics**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-04T15:11:00Z
- **Completed:** 2026-06-04T15:19:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Added T-U-017/REQ-016 coverage for `source_ref`, inline source confirmation, defaults, progress forwarding, `needs_user_input`, and exact disconnected text.
- Implemented `macro-tool.ts` and lifecycle dispatch for `call_macro`.
- Preserved macro final envelopes and traces in FlashQuery details without adding Phase 19 rendering.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add call_macro unit expectations first** - `d82f11b` (test)
2. **Task 2: Implement call_macro specialization and progress handling** - `3d08ea0` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/agent/extensions/cate-flashquery/macro-tool.ts` - Handles macro confirmation, defaults, progress, disconnected, and result details.
- `src/agent/extensions/cate-flashquery/lifecycle.ts` - Branches `call_macro` execution to the specialized wrapper.
- `src/agent/extensions/cate-flashquery/lifecycle.test.ts` - Adds T-U-017/REQ-016 expectations.

## Decisions Made

- Inline macro source is shown verbatim in the confirmation prompt before dispatch.
- `source_ref` execution does not ask for pre-confirmation.
- Progress updates send only the latest real MCP progress message or `Running macro...` when the notification lacks text.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope changes.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` - passed
- `npm run typecheck` - passed

## Next Phase Readiness

`call_model` and `call_macro` now both produce structured FlashQuery details for Plan 18-03 to preserve through live renderer state, session replay, and mocked E2E evidence.

---
*Phase: 18-call-model-call-macro-and-diagnostics-data*
*Completed: 2026-06-04*
