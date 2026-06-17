---
gsd_state_version: 1.0
milestone: v1.4
milestone_name: Semantic Connections Inspector
status: in_progress
stopped_at: Completed 25-02-PLAN.md
last_updated: "2026-06-17T03:08:43Z"
last_activity: 2026-06-17 — Completed Plan 25-02 semantic provider boundary
progress:
  total_phases: 2
  completed_phases: 0
  total_plans: 4
  completed_plans: 4
  percent: 100
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-16 for v1.4 Semantic Connections Inspector)

**Core value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.
**Current focus:** Executing v1.4 Semantic Connections Inspector

## Current Position

Phase: 25 — Inspector UI, Adapter Boundary, Outline Sync, E2E, and Acceptance Polish
Plan: 02 of 04 completed in current phase wave
Status: Phase 25 in progress; adapter boundary complete, ready for Outline/open behavior
Last activity: 2026-06-17 — Completed Plan 25-02 semantic provider boundary

## Session Continuity

Last session: 2026-06-17T03:08:43Z
Stopped At: Completed 25-02-PLAN.md
Resume File: None

## Next Up

Continue Phase 25 with Plan 25-03: Outline sync and card open/deep-link behavior.

Phase 24 bundles the first three source implementation phases from the Semantic Connections Inspector requirements:

- Types, utilities, and panel registration
- Dock minimum size enforcement
- Preview chunk wrapping and shared selection store

Tests must be implemented alongside each feature slice:

- `T-U-001` through `T-U-010`
- `T-U-013`, `T-U-014`
- `T-I-001` through `T-I-008`
- `T-I-027` through `T-I-035`
- `T-E-004`

## Decisions

Full decision log lives in `.planning/PROJECT.md` "Key Decisions" table.

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-14 | v1.3 uses the Document Outline requirements and test plan as mandatory source-of-truth docs. | Keeps panel registration, parser, source navigation, preview routing, exclusions, and coverage aligned to the product devspec. |
| 2026-06-14 | v1.3 continues phase numbering from v1.2, starting at Phase 22. | Preserves sequential project roadmap history across shipped milestones. |
| 2026-06-14 | v1.3 executes in two implementation phases. | The owner requested two phases; Phase 22 bundles foundation/source-mode behavior with tests, and Phase 23 bundles preview routing/final hardening with tests. |
| 2026-06-14 | Document Chat and Graph Explorer unified selection behavior remain out of scope. | Those are separate future devspecs; this milestone implements the standalone Outline and blue-flash preview behavior. |
| 2026-06-15 | Preview duplicate occurrence indexes are computed from full-depth source heading order, not visible Outline depth. | Preview heading IDs are assigned across all rendered headings, so hidden deeper duplicates must still count for correct preview routing. |
| 2026-06-16 | v1.4 uses the Semantic Connections Inspector requirements and test plan as mandatory source-of-truth docs. | The product docs define the embeddings-only launch constraint, Cate/FlashQuery boundary, and direct REQ/test traceability. |
| 2026-06-16 | v1.4 continues phase numbering from v1.3, starting at Phase 24. | Preserves sequential project roadmap history across shipped milestones. |
| 2026-06-16 | v1.4 executes in two GSD phases that group source phases 1-3 and 4-7. | The owner requested exactly this grouping while preserving the seven source implementation phases as sub-slices. |
| 2026-06-16 | Tests from the supplied plan must land with the feature slices they verify. | Prevents a risky final test catch-up and keeps each feature set verified before moving on. |
| 2026-06-16 | Dock minimum math lives in a pure helper module beside DockSplitContainer. | Keeps recursive dock math testable without renderer store side effects while preserving component-level resize wiring. |
| 2026-06-16 | The 10% dock ratio floor remains secondary to panel-specific pixel minimums. | Satisfies REQ-035 while preserving the existing ratio-floor safety behavior. |
| 2026-06-16 | Plan 24-04 uses a dedicated renderer-local Zustand store for preview hover/pin selection instead of CustomEvent preview bridges. | Gives Preview, Outline, and the SC shell one shared selection surface for Phase 25. |
| 2026-06-16 | Plan 24-04 keeps Outline matching slug-based for the foundation; full two-pass DOM fallback remains Phase 25 scope. | Satisfies initial Outline awareness without pulling the final matching algorithm into the foundation phase. |
| 2026-06-17 | Plan 25-02 keeps the real FlashQuery server-side connection query API out of Cate. | Cate now defines and consumes a renderer-local provider boundary while leaving backend query implementation to a later FlashQuery phase. |
| 2026-06-17 | Plan 25-02 maps FlashQuery UUID chunks through heading path and source-line metadata, not preview ID equality. | FlashQuery chunk UUIDs and Cate preview chunk IDs are separate namespaces. |
| 2026-06-17 | Plan 25-02 exposes mapping diagnostics as developer-facing data attributes and result diagnostics. | Partial mapping failures should not become user-facing adapter errors when mapped data can still render. |

## Deferred Items

Items acknowledged for this milestone:

| Category | Item | Status |
|----------|------|--------|
| future_feature | Document Chat | Deferred to a separate devspec and milestone. |
| future_feature | Graph Explorer unified selection model integration | Superseded by v1.4 Semantic Connections Inspector shared selection work. |
| enhancement | Persistent Outline depth preference | Deferred unless it emerges as necessary during implementation. |
| future_feature | FlashQuery server-side connection query API | Deferred outside this Cate milestone; v1.4 defines and consumes the Cate-side adapter boundary only. |
| future_feature | Typed graph edge store and relationship classification | Deferred beyond embeddings-only launch. |
| future_feature | Spatial Graph Explorer Map view | Deferred beyond Inspector launch. |

Items acknowledged and deferred at milestone close on 2026-06-16:

| Category | Item | Status |
|----------|------|--------|
| debug | flashquery-vault-disconnected | investigating |
| debug | flashquery-vault-mutation-refresh | fixing |
| debug | monaco-context-menu-offset | fixing |
| debug | outline-heading-target-highlight | verifying |
| debug | outline-sidebar-right-toolbar-overlap | verifying |
| debug | settings-width-pi-font-size | unknown |
| uat | phase-17/17-UAT.md | unknown; 0 open scenarios |
| uat | phase-19/19-HUMAN-UAT.md | accepted-simulated; 0 open scenarios |
| uat | phase-19/19-UAT.md | unknown; 0 open scenarios |
| uat | phase-20/20-UAT.md | passed; 0 open scenarios |
| uat | phase-21/21-UAT.md | accepted-simulated; 0 open scenarios |

## Performance Metrics

| Phase | Plan | Duration | Tasks | Files |
|---|---:|---:|---:|---:|
| 24-sc-inspector-foundation-docking-preview-chunks-and-selection | 02 | 10min | 2 | 3 |
| 24-sc-inspector-foundation-docking-preview-chunks-and-selection | 04 | 18min | 3 | 10 |
| 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish | 02 | 6min | 2 | 4 |

## Operator Next Steps

- Continue with Phase 25 Plan 25-03 after the completed 25-01 and 25-02 summaries.
