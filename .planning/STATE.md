---
gsd_state_version: 1.0
milestone: v1.5
milestone_name: Browser Uplift
status: executing
stopped_at: Completed 26-05-PLAN.md
last_updated: "2026-06-26T18:49:05.170Z"
last_activity: 2026-06-26 -- Completed 26-05 renderer browser store and bookmarks bar
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 10
  completed_plans: 5
  percent: 50
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-26 for v1.5 Browser Uplift)

**Core value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.
**Current focus:** Phase 26 Browser Uplift execution

## Current Position

Phase: 26-browser-uplift
Plan: 06 next
Status: Executing
Last activity: 2026-06-26 -- Completed 26-05 renderer browser store and bookmarks bar

## Session Continuity

Last session: 2026-06-26T18:49:05.150Z
Stopped At: Completed 26-05-PLAN.md
Resume File: None

## Next Up

Phase 26 Browser Uplift execution is underway.

Phase 26 bundles the supplied Browser Uplift source implementation phases into one GSD phase:

- Browser Foundation
- Browser State and Affordances
- Workspace Safety and Controls
- System Verification

Tests must be implemented alongside each feature slice:

- `T-U-001` through `T-U-031`
- `T-I-001` through `T-I-006`
- `T-E-001` through `T-E-021`
- `T-M-001`

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
| 2026-06-26 | v1.5 uses the Browser Uplift requirements and test plan as mandatory source-of-truth docs. | The product docs define upstream browser uplift scope, FlashQuery boundaries, and full REQ/test traceability. |
| 2026-06-26 | v1.5 executes in one GSD phase, Phase 26. | Owner requested one phase if possible; the source spec's four implementation phases are preserved as sub-slices inside one cohesive browser uplift phase. |
| 2026-06-26 | Browser state is workspace-scoped and separate from FlashQuery state. | The shared `workspaceId` is a scoping convenience, not a shared storage or security boundary. |
| 2026-06-26 | BrowserPanel load-error overlay is driven only by `pageLoadErrorFrom(event)`. | Keeps REQ-004 semantics testable and prevents subresource failures from hiding a successfully loaded page. |
| 2026-06-26 | portalRegistry production code was preserved during 26-02. | The plan required bridge preservation coverage, not a wholesale upstream replacement. |
| 2026-06-26 | Capture IPC lives in `src/main/ipc/capture.ts` and is registered once from the critical startup handler set. | Keeps REQ-010 capture behavior modular while preserving startup availability. |
| 2026-06-26 | Capture preload/API/channel names remained unchanged during 26-03. | The plan required `capturePage()`, `webviewScreenshot()`, and `nativeFileDrag()` compatibility. |
| 2026-06-26 | No upstream proxy, extraction, vault write, `cate_browser`, or FlashQuery code was added in 26-03. | Preserves Browser Uplift scope boundaries and FlashQuery isolation. |
| 2026-06-26 | Plan 26-05 keeps BookmarksBar presentational while BrowserPanel supplies workspace-scoped bookmarks. | Prevents a global active-workspace bookmark model and keeps REQ-003/REQ-007 panel scoping explicit. |

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
| 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish | 04 | 19m 34s | 3 | 9 |
| 26-browser-uplift | 01 | 20min | 2 | 14 |
| 26-browser-uplift | 02 | 30min | 2 | 7 |
| 26-browser-uplift | 03 | 10min | 2 | 4 |
| 26-browser-uplift | 04 | 12min | 2 | 10 |
| 26-browser-uplift | 05 | 15min | 2 | 7 |

## Operator Next Steps

- Run `$gsd-discuss-phase 26` to clarify implementation approach, or `$gsd-plan-phase 26` to plan directly.
