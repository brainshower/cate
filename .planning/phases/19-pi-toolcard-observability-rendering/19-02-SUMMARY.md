---
phase: 19-pi-toolcard-observability-rendering
plan: 02
subsystem: agent-renderer-e2e
tags: [flashquery, pi, toolcard, e2e, uat]
requires:
  - phase: 19-pi-toolcard-observability-rendering
    provides: Plan 19-01 rich FlashQuery ToolCard rendering in ChatThread
provides:
  - T-E-006 mocked Electron ToolCard observability evidence
  - T-M-003 manual call_model observability procedure and blocker record
  - REQ-017 UAT traceability for T-U-019, T-E-006, and T-M-003
affects: [phase-20-references, phase-21-degradation, flashquery-observability]
tech-stack:
  added: []
  patterns:
    - E2E harness can discover rendered agent store keys before dispatching mocked Pi events
    - Mocked FlashQuery diagnostics evidence exercises real AgentPanel, agentStore, and ToolCard DOM
key-files:
  created:
    - .planning/phases/19-pi-toolcard-observability-rendering/19-UAT.md
  modified:
    - e2e/flashquery-pi-diagnostics.spec.ts
    - src/renderer/lib/e2eHarness.ts
    - .planning/phases/19-pi-toolcard-observability-rendering/19-02-SUMMARY.md
key-decisions:
  - "T-E-006 mounts a real Agent panel and dispatches events to the rendered active agent key, preserving the existing ToolCard path."
  - "T-M-003 remains blocked until live Pi provider credentials, a live FlashQuery runtime, and document-reference fixtures are confirmed."
patterns-established:
  - "Use window.__cateE2E.agentPanelIds() only as a read-only key-discovery helper; continue dispatching through handleAgentEvent."
requirements-completed: [REQ-017]
duration: 35min
completed: 2026-06-04
---

# Phase 19 Plan 02: ToolCard Observability Evidence Summary

**Mocked Electron evidence now proves FlashQuery diagnostics render through existing Pi ToolCards, with manual live call_model coverage honestly blocked.**

## Performance

- **Duration:** 35 min
- **Started:** 2026-06-04T16:46:00Z
- **Completed:** 2026-06-04T17:21:30Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Extended `T-E-006` from store-only preservation checks to DOM assertions against a mounted Agent panel and real ToolCard UI.
- Verified collapsed and expanded `call_model`, nested messages payload disclosure, `call_macro` trace rendering, generic FlashQuery ToolCard fallback, and no new message type.
- Created Phase 19 UAT evidence mapping `REQ-017` to `T-U-019`, `T-E-006`, and blocked `T-M-003` live-integration coverage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend T-E-006 mocked ToolCard UI coverage** - `a82dfef` (test)
2. **Task 2: Record T-M-003 manual call_model observability evidence** - `92b1e1e` (docs)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `e2e/flashquery-pi-diagnostics.spec.ts` - Mounts a real Agent panel, dispatches mocked FlashQuery Pi events, and asserts ToolCard DOM rendering plus stored tool-message preservation.
- `src/renderer/lib/e2eHarness.ts` - Adds read-only `agentPanelIds()` helper so E2E can dispatch to the active rendered agent key.
- `.planning/phases/19-pi-toolcard-observability-rendering/19-UAT.md` - Records automated evidence and blocked `T-M-003` manual prerequisites.
- `.planning/phases/19-pi-toolcard-observability-rendering/19-02-SUMMARY.md` - Plan execution summary.

## Decisions Made

- Used the existing E2E harness and real `handleAgentEvent` path rather than a custom DOM shortcut.
- Added only a read-only harness helper after proving the mounted Agent panel renders an internal active chat key rather than the dock panel id.
- Marked `T-M-003` blocked instead of passed because live provider credentials, live FlashQuery runtime, and document reference fixtures were not confirmed in this environment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added rendered agent key discovery to E2E harness**
- **Found during:** Task 1 (Extend T-E-006 mocked ToolCard UI coverage)
- **Issue:** The E2E could dispatch mocked events to a store key, but the mounted Agent panel renders messages under its generated active chat key, so DOM assertions could not observe the injected messages deterministically.
- **Fix:** Added read-only `window.__cateE2E.agentPanelIds()` and updated the spec to select the active `agent-${panelId}-...` key before dispatch.
- **Files modified:** `src/renderer/lib/e2eHarness.ts`, `e2e/flashquery-pi-diagnostics.spec.ts`
- **Verification:** `npm run build`, then `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` passed.
- **Committed in:** `a82dfef`

---

**Total deviations:** 1 auto-fixed (1 blocking issue).
**Impact on plan:** The helper was required to keep the E2E on the real AgentPanel and ToolCard path. No user-facing behavior changed.

## Issues Encountered

- The first E2E run after the harness edit launched a stale built Electron bundle and reported `window.__cateE2E.agentPanelIds is not a function`. Running `npm run build` refreshed `dist/`, after which the focused E2E passed.
- Several initial DOM assertions were tightened from broad text matches to exact/role-based locators because required diagnostics intentionally repeat values across summary, refs, tool-loop, and trace sections.

## User Setup Required

None for automated coverage.

For `T-M-003`, manual live verification still requires:

- Confirmed native Pi provider credentials usable by Cate.
- Confirmed live FlashQuery runtime configured for the workspace.
- Confirmed document-reference fixture path in the live FlashQuery vault.

## Verification

- `npm run build` - passed; refreshed the Electron E2E bundle after the harness helper change.
- `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` - passed; Playwright Electron reported 1 passed test.
- `npm test -- src/agent/renderer/ChatThread.test.tsx` - passed; Vitest reported 1 file passed and 6 tests passed.
- `npm run typecheck` - passed; `tsc --noEmit` exited 0.
- `test -f .planning/phases/19-pi-toolcard-observability-rendering/19-UAT.md && rg -n "REQ-017|T-U-019|T-E-006|T-M-003" .planning/phases/19-pi-toolcard-observability-rendering/19-UAT.md` - passed; all traceability IDs found.

## Known Stubs

None. Stub scan found only a normal Playwright nullable app handle (`let app: ElectronApplication | null = null`), not a UI or data stub.

## Threat Flags

None. The only new test surface is an E2E-only read-only agent key discovery helper; mocked diagnostics include a secret-like sentinel and assert it is not visible in rendered ToolCard content.

## Next Phase Readiness

Phase 19 has automated evidence for `REQ-017` through component and Electron ToolCard paths. Product-level live `call_model` confirmation remains explicitly blocked in UAT until the required provider/runtime/document-reference prerequisites are available.

## Self-Check: PASSED

- Found `e2e/flashquery-pi-diagnostics.spec.ts`
- Found `src/renderer/lib/e2eHarness.ts`
- Found `.planning/phases/19-pi-toolcard-observability-rendering/19-UAT.md`
- Found `.planning/phases/19-pi-toolcard-observability-rendering/19-02-SUMMARY.md`
- Found task commit `a82dfef`
- Found task commit `92b1e1e`

---
*Phase: 19-pi-toolcard-observability-rendering*
*Completed: 2026-06-04*
