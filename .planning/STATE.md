---
gsd_state_version: 1.0
milestone: v1.3
milestone_name: Document Outline
status: planning
stopped_at: v1.3 milestone started; ready to plan Phase 22
last_updated: "2026-06-14T17:40:02Z"
last_activity: 2026-06-14
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-14 after v1.3 Document Outline planning)

**Core value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.
**Current focus:** v1.3 Document Outline

## Current Position

Phase: Not started (Phase 22 next)
Plan: —
Status: Defining implementation plan
Last activity: 2026-06-14 — Milestone v1.3 Document Outline started

## Session Continuity

Last session: 2026-06-14T17:40:02Z
Stopped At: v1.3 milestone started; ready to plan Phase 22
Resume File: None

## Next Up

Plan Phase 22 with `$gsd-plan-phase 22`.

Phase 22 should implement the Outline panel foundation and source-mode navigation with bundled tests:

- T-U-001 through T-U-014
- T-I-001 through T-I-022
- T-I-031 through T-I-035
- T-A-001 through T-A-004, T-A-006, T-A-007
- T-M-001 through T-M-004 as visual/manual checks where practical

Phase 23 follows with Markdown preview heading IDs, scroll routing, blue-flash behavior, and bundled preview tests.

## Decisions

Full decision log lives in `.planning/PROJECT.md` "Key Decisions" table.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-14 | v1.3 uses the Document Outline requirements and test plan as mandatory source-of-truth docs. | Keeps panel registration, parser, source navigation, preview routing, exclusions, and coverage aligned to the product devspec. |
| 2026-06-14 | v1.3 continues phase numbering from v1.2, starting at Phase 22. | Preserves sequential project roadmap history across shipped milestones. |
| 2026-06-14 | v1.3 executes in two implementation phases. | The owner requested two phases; Phase 22 bundles foundation/source-mode behavior with tests, and Phase 23 bundles preview routing/final hardening with tests. |
| 2026-06-14 | Document Chat and Graph Explorer unified selection behavior remain out of scope. | Those are separate future devspecs; this milestone implements the standalone Outline and blue-flash preview behavior. |

## Deferred Items

Items acknowledged for this milestone:

| Category | Item | Status |
|----------|------|--------|
| future_feature | Document Chat | Deferred to a separate devspec and milestone. |
| future_feature | Graph Explorer unified selection model integration | Deferred to the Graph Explorer devspec; do not implement `preview-section-select` dispatch in v1.3. |
| enhancement | Persistent Outline depth preference | Deferred unless it emerges as necessary during implementation. |

## Performance Metrics

No v1.3 phases have been executed yet.

## Operator Next Steps

- Start Phase 22 planning with `$gsd-plan-phase 22`.
