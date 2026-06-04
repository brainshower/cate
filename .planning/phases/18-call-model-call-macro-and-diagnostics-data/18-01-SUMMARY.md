---
phase: 18-call-model-call-macro-and-diagnostics-data
plan: 01
subsystem: agent-extension
tags: [flashquery, pi-extension, call-model, diagnostics, refs]
requires:
  - phase: 17-flashquery-pi-extension-bootstrap
    provides: FlashQuery Pi extension lifecycle, registry discovery, and workspace handoff rebinds
provides:
  - call_model Pi tool description enrichment from FlashQuery model and purpose metadata
  - call_model dispatch wrapper with return_messages, trace IDs, ref preflight, and diagnostics preservation
  - shared FlashQuery diagnostics, trace, and reference helper modules
affects: [phase-19-toolcards, flashquery-pi-extension, agent-diagnostics]
tech-stack:
  added: []
  patterns:
    - Specialized FlashQuery tool wrappers branch inside lifecycle registration while generic tools keep the shared wrapper
    - FlashQuery details are normalized once through diagnostics.ts before renderer/session preservation
key-files:
  created:
    - src/agent/extensions/cate-flashquery/diagnostics.ts
    - src/agent/extensions/cate-flashquery/model-tool.ts
    - src/agent/extensions/cate-flashquery/refs.ts
    - src/agent/extensions/cate-flashquery/trace.ts
  modified:
    - src/agent/extensions/cate-flashquery/client.ts
    - src/agent/extensions/cate-flashquery/lifecycle.ts
    - src/agent/extensions/cate-flashquery/lifecycle.test.ts
key-decisions:
  - "Trace IDs are minted inside the Cate extension and keyed by Pi execution context so model-supplied metadata cannot spoof the trace."
  - "Ref hydration is a preflight document existence check; FlashQuery remains responsible for final model-side reference injection."
patterns-established:
  - "Specialized FlashQuery wrappers return ordinary Pi tool results with details.flashquery rather than new chat message types."
  - "MCP callTool accepts an options object for specialized wrappers while preserving legacy signal-only calls."
requirements-completed: [REQ-015]
duration: 10 min
completed: 2026-06-04
---

# Phase 18 Plan 01: call_model Specialization Summary

**FlashQuery call_model Pi wrapper with discovery descriptions, trace IDs, ref preflight blocking, and preserved diagnostics**

## Performance

- **Duration:** 10 min
- **Started:** 2026-06-04T15:00:00Z
- **Completed:** 2026-06-04T15:10:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added T-U-016/REQ-015 coverage for description enrichment, loading placeholder, return_messages, trace reuse, ref hydration, unresolved-ref blocking, error diagnostics, and no synthetic progress.
- Implemented `call_model` lifecycle specialization without changing registry eligibility or generic FlashQuery tool behavior.
- Added shared helpers for diagnostics normalization, trace ID minting, and `{{ref:...}}` preflight resolution.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add call_model unit expectations first** - `264e3c5` (test)
2. **Task 2: Implement call_model specialization and shared helpers** - `859756c` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/agent/extensions/cate-flashquery/diagnostics.ts` - Normalizes FlashQuery tool result content and structured details.
- `src/agent/extensions/cate-flashquery/model-tool.ts` - Builds call_model descriptions and executes the specialized wrapper.
- `src/agent/extensions/cate-flashquery/refs.ts` - Finds literal refs and preflights documents through `get_document`.
- `src/agent/extensions/cate-flashquery/trace.ts` - Mints required workspace/conversation trace IDs.
- `src/agent/extensions/cate-flashquery/client.ts` - Widens `callTool` to support request options while preserving signal-only calls.
- `src/agent/extensions/cate-flashquery/lifecycle.ts` - Branches `call_model` registration/execution to the specialized wrapper.
- `src/agent/extensions/cate-flashquery/lifecycle.test.ts` - Adds T-U-016/REQ-015 expectations.

## Decisions Made

- Trace IDs are generated internally from workspace hash plus random base32 suffix and are reused for the same Pi execution context.
- Resolved refs are recorded as diagnostics evidence, but the original prompt content remains FlashQuery's responsibility to hydrate during model dispatch.
- Unresolved refs return the exact required system/error text before any model dispatch.

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
- `npm test -- src/agent/extensions/cate-flashquery/client.test.ts` - passed
- `npm run typecheck` - passed

## Next Phase Readiness

`call_model` now exposes the structured diagnostics and trace/ref details that Plan 18-03 and Phase 19 ToolCard rendering can preserve and display. Ready for Plan 18-02 `call_macro` specialization.

---
*Phase: 18-call-model-call-macro-and-diagnostics-data*
*Completed: 2026-06-04*
