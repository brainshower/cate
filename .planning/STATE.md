---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: FlashQuery Milestone 2
status: needs-review
stopped_at: Automated T-M-004 native clipboard evidence added; Phase 21 still needs owner review for T-M-001 through T-M-003
last_updated: "2026-06-05T00:14:45Z"
last_activity: 2026-06-04
progress:
  total_phases: 8
  completed_phases: 7
  total_plans: 25
  completed_plans: 25
  percent: 100
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-03 after v1.2 FlashQuery Milestone 2 planning)

**Core value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.
**Current focus:** Phase 21 - cross-surface connection degradation closeout and owner review

## Current Position

Phase: 21 (cross-surface-hardening-and-regression)
Plan: 4 of 4
Status: Needs Review - automated verification passed; manual/live checks T-M-001 through T-M-003 remain blocked; T-M-004 native clipboard coverage automated
Last activity: 2026-06-04

## Session Continuity

Last session: 2026-06-05T00:14:45Z
Stopped At: Automated T-M-004 native clipboard evidence added; Phase 21 still needs owner review for T-M-001 through T-M-003
Resume File: None

## Next Up

Owner review of Phase 21 release-readiness: either record live/manual evidence for T-M-001 through T-M-003, accept the blockers as known manual follow-up, or open a follow-up phase/issue.

Phase 21 has 4/4 plans complete. Final focused suites, `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run preflight` passed on 2026-06-04. `T-M-004` native clipboard coverage passed on 2026-06-04 via `e2e/flashquery-native-clipboard.spec.ts`. `21-VERIFICATION.md` records the full REQ-020 matrix and keeps the remaining blocked manual/live checks visible.

## Decisions

Full decision log lives in `.planning/PROJECT.md` "Key Decisions" table (updated after each phase transition and milestone). v1.0 phase-level decisions are also preserved verbatim in `.planning/milestones/v1.0-phases/*/SUMMARY.md` `key-decisions:` frontmatter. STATE.md begins fresh with the next active milestone.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-01 | Phase 8 uses the upstream sync requirements/test plan as mandatory source-of-truth docs. | Keeps migration planning aligned to the product spec and ensures implementation agents do not answer scope questions from memory. |
| 2026-06-01 | Phase 8 is a migration phase, not a new FlashQuery feature phase. | Prevents scope creep while merging upstream `v1.1.0`. |
| 2026-06-01 | Upstream `v1.1.0` was merged as a real two-parent merge commit. | Preserves future sync provenance and advances the fork's upstream merge base to `5b6549d`. |
| 2026-06-01 | Phase 9 downstream agents must read the upstream-sync requirements and test plan before handoff work. | Prevents mainline handoff from drifting away from the product-defined process/provenance and verification gates. |
| 2026-06-01 | Mainline handoff used fast-forward only from `sync/upstream-v1.1.0`. | Preserves the real upstream merge commit and avoids rewriting, squashing, or cherry-picking the sync history. |
| 2026-06-01 | Phase 10 is scoped as a post-handoff shared-contract audit/remediation phase. | The product gap analysis originally named Phase 10 as Shared Contracts, but the live roadmap completed the merge in Phase 8 and handoff in Phase 9; this preserves the intent without replaying completed merge work. |
| 2026-06-01 | Phase 10 completion requires fresh final command evidence. | The audit closes only after build, typecheck, full unit tests, and focused FlashQuery persistence E2E all exit 0 with archived logs. |
| 2026-06-01 | Phase 11 is scoped as a post-handoff renderer-behavior audit/remediation phase. | The product gap analysis originally named Phase 11 as Renderer Behavior, but the live roadmap completed the merge in Phase 8 and handoff in Phase 9; this preserves the intent without replaying completed merge work. |
| 2026-06-01 | Phase 11 downstream agents must read the upstream-sync requirements and test plan before renderer audit work. | Prevents renderer/evidence decisions from drifting away from the product-defined requirements and canonical test IDs. |
| 2026-06-01 | Phase 11 closed only after final command evidence passed. | Build, typecheck, unit tests, and full E2E all exited 0 before ROADMAP/STATE were marked complete. |
| 2026-06-01 | Phase 12 is scoped as a post-handoff upstream-value and visual-evidence audit/remediation phase. | The product gap analysis originally identified this as Phase 12, but the live roadmap completed the merge in Phase 8 and handoff in Phase 9; this preserves the intent without replaying completed merge work. |
| 2026-06-01 | Phase 12 downstream agents must read the upstream-sync requirements and test plan before theming, visual evidence, smoke, or removed-file audit work. | Prevents evidence decisions from drifting away from REQ-004, REQ-018, REQ-020, REQ-022, REQ-024, REQ-025, and their canonical test IDs. |
| 2026-06-01 | Phase 12 closed only after final evidence passed. | Visual evidence, upstream-smoke evidence, removed-file decisions, build, typecheck, unit tests, and full E2E all passed or had an explicit not-required rationale before ROADMAP/STATE were marked complete. |
| 2026-06-01 | Phase 13 is scoped as final release-readiness and provenance closeout, not release publication. | Product acceptance, process/provenance, runbook, tracking, and final command evidence should be proven before handoff to a separate release workflow. |
| 2026-06-01 | Phase 13 downstream agents must read the upstream-sync requirements and test plan before acceptance, provenance, verification, or closeout decisions. | Prevents final closeout from drifting away from REQ-021, REQ-023, REQ-024, REQ-025, REQ-026, T-A-010, T-A-012..T-A-015, and T-E-001..T-E-005. |
| 2026-06-03 | v1.2 uses the Milestone 2 requirements and test plan as mandatory source-of-truth docs. | Keeps refresh, frontmatter, vault search, Pi extension, reference, clipboard, and degradation work aligned to the product spec and coverage matrix. |
| 2026-06-03 | v1.2 continues phase numbering from v1.1, starting at Phase 14. | Preserves the project roadmap's sequential phase history across shipped milestones. |
| 2026-06-04 | Phase 21 is left in Needs Review after automated verification passed. | At closeout, live/manual checks T-M-001 through T-M-004 required real FlashQuery/Pi/provider/native clipboard evidence or owner acceptance before release-readiness could be complete. |
| 2026-06-04 | T-M-004 native clipboard verification is automated. | `e2e/flashquery-native-clipboard.spec.ts` drives vault tree, search row, and editor title copy actions and reads Electron's native clipboard, removing the native clipboard item from the manual blocker list. |

- [Phase 17]: Plan 17.1 writes FlashQuery Pi handoff to workspace-scoped .cate/pi-agent/flashquery-handoff.json. — Bearer tokens are sourced only from main-process getWorkspaceToken(workspaceId), preserving the renderer and Pi auth.json token boundary.
- [Phase 17]: Plan 17.2 uses MCP listTools metadata as the FlashQuery registry source for hostEligible/current Pi tool registration.
- [Phase 17]: Plan 17.2 translates unknown or malformed FlashQuery schemas to permissive TypeBox object schemas so registration remains safe.
- [Phase 17]: Plan 17.3 uses generation-scoped FlashQuery Pi tool wrappers instead of unsupported unregisterTool APIs. — Stale tools return a current-workspace unavailable error after rebind.
- [Phase 17]: Plan 17.3 records Pi advertised-tool-list introspection as unavailable in the E2E harness. — Install plus registry fetch are covered in E2E, and tool availability semantics are covered in unit tests.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-30:

| Category | Item | Status |
|----------|------|--------|
| uat_gap | phase-05-uat-tool-false-positive | acknowledged — Phase 5 UAT is status: passed with 5/5 tests, 0 pending scenarios, 0 issues, 0 gaps. The `gsd-sdk query audit-open` heuristic flagged the file but inspection shows it is fully complete. No remediation needed; flagging the tool behavior for future improvement. |
| uat_gap | v1.1-uat-tool-false-positive | acknowledged — The v1.1 closeout audit saw `gsd-sdk query audit-open` flag Phases 08-13, but every flagged UAT file had `open_scenario_count: 0`; inspection confirmed passed UAT artifacts with no pending scenarios. No remediation needed; recorded in `milestones/v1.1-MILESTONE-AUDIT.md`. |

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|-------|------|----------|-------|-------|
| 02 | 02 | 4min | 2 | 3 |
| 02 | 03 | 5min | 2 | 3 |
| Phase 03 P01 | 12 min | 4 tasks | 7 files |
| Phase 03 P02 | 14 min | 4 tasks | 3 files |
| Phase 03 P03 | 18 min | 4 tasks | 6 files |
| Phase 04 P01 | 12min | 2 tasks | 4 files |
| Phase 04 P03 | 6min | 3 tasks | 11 files |
| Phase 04 P04 | 15min | 3 tasks | 2 files |
| Phase 04 P02 | 5min | 3 tasks | 7 files |
| Phase 05 P01 | 5min | 3 tasks | 4 files |
| Phase 05 P02 | 11min | 3 tasks | 9 files |
| Phase 05 P03 | 10min | 2 tasks | 3 files |
| Phase 05 review fixes | 48min | 4 review cycles | 8 files |
| Phase 06 | 60min | 8 tasks | 12 source/test files |
| Phase 07 P01 | 14min | 2 tasks | 5 files |
| Phase 07 P02 | 30min | 3 tasks | 16 files |
| Phase 07 P03 | 10min | 4 tasks | 5 files |
| Phase 08 | 90min | 25 tasks | upstream merge + evidence |
| Phase 10 P10.1 | 12 min | 3 tasks | 3 files |
| Phase 10 P10.2 | 8 min | 3 tasks | 2 files |
| Phase 10 P10.3 | 9 min | 3 tasks | 8 files |
| Phase 12 P12.3 | 8 min | 3 tasks | 10 files |
| Phase 13 P13.1 | 12 min | 2 tasks | 1 files |
| Phase 17 P17.1 | 8min | 3 tasks | 6 files |
| Phase 17 P17.2 | 9min | 4 tasks | 7 files |
| Phase 17 P17.3 | 64min | 4 tasks | 10 files |
| Phase 18 P01 | 10 min | 2 tasks | 7 files |
| Phase 18 P02 | 8 min | 2 tasks | 5 files |
| Phase 18 P03 | 14 min | 3 tasks | 7 files |
| Phase 20 P01 | 12min | 2 tasks | 8 files |
| Phase 20 P02 | 9min | 2 tasks | 2 files |
| Phase 20 P03 | 14min | 2 tasks | 5 files |
| Phase 20 P04 | 42min | 3 tasks | 7 files |
| Phase 21 P01 | 18min | 2 tasks | 7 files |
| Phase 21 P02 | 24min | 3 tasks | 4 files |
| Phase 21 P03 | 20min | 3 tasks | 10 files |
| Phase 21 P04 | 21min | 4 tasks | verification docs + planning state |

## Operator Next Steps

- Review `.planning/phases/21-cross-surface-hardening-and-regression/21-VERIFICATION.md` and decide whether to accept blocked manual/live checks T-M-001 through T-M-003 as follow-up.
- Decide whether to attempt deterministic or env-gated automation for the remaining live macro/model/provider checks.
