---
phase: 20-pi-mentions-and-clipboard-utilities
plan: 04
subsystem: e2e-uat-evidence
tags: [flashquery, pi-chat, at-mentions, clipboard, e2e, uat]
requires:
  - phase: 20-pi-mentions-and-clipboard-utilities
    provides: Plans 20-01 through 20-03 cache, mention, and clipboard implementation
provides:
  - T-E-004 Electron coverage for Pi `@` mention insertion and cache lifecycle
  - Extended T-E-003 Electron coverage for search row copy path/reference preservation
  - Phase 20 UAT traceability for REQ-018 and REQ-019
  - Historical T-M-004 native macOS clipboard checkpoint, later closed by automated native clipboard E2E
  - "Addendum 2026-06-04: T-M-004 native clipboard coverage automated by e2e/flashquery-native-clipboard.spec.ts"
affects: [phase-20-closeout]
tech-stack:
  added: []
patterns: [electron fixture rebinding, e2e agent harness cache accessors, UAT evidence recording]
key-files:
  created:
    - e2e/flashquery-pi-mentions.spec.ts
    - .planning/phases/20-pi-mentions-and-clipboard-utilities/20-UAT.md
  modified:
    - src/agent/renderer/AgentChatInput.tsx
    - src/renderer/lib/e2eHarness.ts
    - e2e/flashquery-vault-search.spec.ts
    - e2e/flashquery-happy-path.spec.ts
    - src/renderer/panels/registry.test.ts
key-decisions:
  - "Docket Agent composers now portal mention dropdowns into their own composer wrapper; canvas composers keep the node portal target."
  - "T-M-004 was initially recorded as blocked because no human macOS pasted clipboard values were captured in the original session."
  - "Addendum 2026-06-04: T-M-004 is now covered by an Electron native clipboard E2E that reads the main-process clipboard."
patterns-established:
  - "E2E can refresh/read/clear agent vault-index state through the existing harness while still driving the real textarea and mention popup."
requirements-completed: [REQ-018, REQ-019]
duration: 42min
completed: 2026-06-04
---

# Phase 20 Plan 04: E2E and UAT Evidence Summary

**Automated Electron evidence for Pi references and clipboard preservation, plus truthful native clipboard UAT traceability**

## Performance

- **Duration:** 42 min
- **Started:** 2026-06-04T19:43:00Z
- **Completed:** 2026-06-04T20:25:00Z
- **Tasks:** 3
- **Files modified:** 7 source/test/UAT files plus regenerated visual E2E evidence

## Accomplishments

- Added T-E-004 Electron coverage for Pi chat `@` mention insertion, filename filtering, full-path sorting, fixture cache replacement, disconnect clearing, reconnect repopulation, and no rich reference UI.
- Fixed docked Agent composers so mention popups have a valid portal target outside canvas nodes.
- Added E2E harness helpers for agent vault-index refresh/read/clear assertions.
- Extended T-E-003 search E2E coverage to assert `Copy vault path`, `Copy as reference`, and memory-row no-menu preservation.
- Wrote `20-UAT.md` mapping REQ-018 and REQ-019 to all targeted Phase 20 test IDs.
- Recorded T-M-004 with exact native macOS manual steps and expected pasted values; this was later superseded by automated native clipboard E2E evidence.
- Updated older happy-path and registry tests to align with the new clipboard menu items and avoid importing live panel side effects in a registry wiring test.

## Task Commits

1. **Task 1: Add T-E-004 Pi mention E2E coverage** - `b1326c2` (`test(20-04): add Pi mention E2E evidence`)
2. **Task 2: Preserve search clipboard E2E and write UAT evidence** - `bf04d54` (`test(20-04): preserve clipboard E2E evidence`)
3. **Regression verification fixes** - `6da98a5` (`test(20-04): align regression checks with clipboard menus`)
4. **Generated full-E2E visual evidence refresh** - `2aeb9a2` (`docs: refresh FlashQuery visual E2E evidence`)

## Files Created/Modified

- `e2e/flashquery-pi-mentions.spec.ts` - T-E-004 Pi mention and cache lifecycle coverage.
- `src/agent/renderer/AgentChatInput.tsx` - Docket composer portal fallback for mention dropdowns.
- `src/renderer/lib/e2eHarness.ts` - Agent vault-index E2E accessors.
- `e2e/flashquery-vault-search.spec.ts` - Search row copy-path/reference and memory-row preservation assertions.
- `e2e/flashquery-happy-path.spec.ts` - Vault tree menu expectation updated for REQ-019 clipboard items.
- `src/renderer/panels/registry.test.ts` - Registry lazy-load test mocks panel modules to avoid live panel side effects.
- `.planning/phases/20-pi-mentions-and-clipboard-utilities/20-UAT.md` - UAT traceability and T-M-004 evidence.

## Deviations from Plan

- The new T-E-004 test exposed that docked Agent composers did not render the mention popup because the portal target lookup only handled canvas nodes. The implementation was corrected in `AgentChatInput.tsx`.
- The full E2E visual evidence spec regenerated Phase 12/13 FlashQuery visual evidence files; those generated artifacts were committed separately.

## Issues Encountered

- Full `npm test` initially timed out in `registry.test.ts` when importing the live FlashQuery vault panel module. The test now mocks lazy panel modules because its contract is registry wiring, not panel behavior.
- Full `npm run test:e2e` initially failed an older happy-path assertion that expected only the three pre-REQ-019 vault tree menu items. The assertion now includes `Copy vault path` and `Copy as reference`.

## Verification

- `npm run build`
- `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx`
- `npm run test:e2e -- e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts`
- `npm run typecheck`
- `npm test`
- `npm run test:e2e`
- `test -f .planning/phases/20-pi-mentions-and-clipboard-utilities/20-UAT.md && rg -n "REQ-018|REQ-019|T-U-006|T-U-011|T-U-012|T-U-020|T-E-003|T-E-004|T-M-004|section-anchor|markdown-link" .planning/phases/20-pi-mentions-and-clipboard-utilities/20-UAT.md`
- `test -f .planning/phases/20-pi-mentions-and-clipboard-utilities/20-UAT.md && rg -n "T-M-004|vault tree|search row|editor title|Copy vault path|Copy as reference|blocked|passed" .planning/phases/20-pi-mentions-and-clipboard-utilities/20-UAT.md`

All automated build, typecheck, unit, focused E2E, full unit, and full E2E commands passed. T-M-004 was later closed by automated native clipboard evidence, recorded below.

### Addendum 2026-06-04

`T-M-004` is no longer blocked. `e2e/flashquery-native-clipboard.spec.ts` was added and `npm run test:e2e -- e2e/flashquery-native-clipboard.spec.ts` passed, verifying vault tree, search row, and editor title copy actions against Electron's native clipboard.

## User Setup Required

T-M-004 is now closed by automated native clipboard evidence in `20-UAT.md`.

## Next Phase Readiness

Phase 20 implementation and automated validation are complete. The former T-M-004 native clipboard item is closed by automated evidence; live macro T-M-002 remains optional follow-up under the accepted deterministic substitute decision.

---
*Phase: 20-pi-mentions-and-clipboard-utilities*
*Completed: 2026-06-04*
