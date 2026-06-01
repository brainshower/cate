# Phase 12: Upstream Value + Visual Evidence Audit - Research

**Date:** 2026-06-01
**Status:** Complete

## Research Question

What does an implementation agent need to know to plan Phase 12 well?

## Mandatory Inputs Read First

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Gaps.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-05-PLAN.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md`
- `.planning/phases/11-renderer-behavior-audit/11-VERIFICATION.md`
- `.planning/phases/11-renderer-behavior-audit/11-UAT.md`
- `.planning/phases/11-renderer-behavior-audit/evidence/renderer/NOTES.md`
- `.planning/phases/11-renderer-behavior-audit/evidence/final/NOTES.md`

## Findings

### Phase Boundary

Phase 12 is not a merge phase. It is a post-handoff audit/remediation pass over the upstream-value and visual-evidence requirements that were initially handled in Phase 8 Plan 8.5 and then re-exercised by the full Phase 11 E2E run. The live `Gaps.md` file explicitly names Phase 12 as the review point for "theming, upstream feature smoke, removed-file decisions, and light/dark visual evidence."

### Visual Evidence

The authoritative test-plan IDs are:

- T-A-005 Vault badge contrast in light and dark.
- T-A-006 Sidebar vault view in light and dark.
- T-A-007 Connection dialog in light and dark.
- T-A-008 Status chip live/connecting/disconnected in light and dark.
- T-A-009 Editor tabs with vault badge in light and dark.

Historical evidence exists in `.planning/phases/08-upstream-sync-v1-1-0/evidence/visual/`, and Phase 11's full E2E log includes `e2e/flashquery-visual-evidence.spec.ts`. Phase 12 should still refresh or re-audit the screenshots because the phase charter is evidence integrity on the final post-handoff tree.

Phase 11 gap fixes in `9ea8768` are relevant to this visual pass. `Sidebar.tsx` now exports `VIEW_META` and `SidebarViewContent`; `FlashQueryVaultPanel.test.tsx` directly proves the sidebar mount path; `DockTabBar.test.tsx` directly proves `VaultBadge` and widened vault-editor tab chrome; and `WorkspaceTab.test.tsx` directly proves `flashqueryVault` panel focus. Phase 12 should use these as current baseline evidence when reviewing T-A-005, T-A-006, T-A-008, and T-A-009, while still refreshing screenshots for REQ-022.

### Upstream Value Capture

REQ-018 requires the final tree to retain upstream packaging/build fixes, terminal/performance changes, file-exclusion config, workspace reload-from-disk, and editor fixes. The right Phase 12 move is an evidence audit plus focused smoke, not broad code churn. If smoke reveals a gap, the implementation agent should make the smallest source/test change that restores the product requirement.

Phase 11 verification now deliberately carries the upstream editor-fix coexistence half of REQ-013 into Phase 12. The Phase 12 T-M-002 smoke must explicitly cover the upstream markdown-preview reset and terminal-path-open editor fixes (`063b61d` and `0822786`) while confirming FlashQuery vault documents still edit/save.

### Removed-File Decisions

REQ-020 names two upstream removals:

- `src/main/templates/skillTemplate.ts`
- `src/renderer/canvas/BulkActionChip.tsx`

Phase 8 recorded a retention rationale for `skillTemplate.ts` and accepted removal of `BulkActionChip.tsx`. Phase 12 should re-check live imports with `rg "skillTemplate|BulkActionChip" src` and record the current rationale in Phase 12 evidence. A build/typecheck pass is required to prove no dangling imports.

### Verification Strategy

The phase needs three layers:

1. Visual audit/remediation: run the visual evidence E2E spec, capture current screenshots/logs, and write review notes.
2. Upstream smoke/removal audit: run build/typecheck and focused manual/scripted checks for terminal/editor/file-git/removed-file behavior.
3. Closeout: run the cumulative command matrix appropriate to the phase, write UAT/VERIFICATION, and only then update planning state.

## Recommended Plan Shape

- Plan 12.1: Theme token and visual evidence audit.
- Plan 12.2: Upstream feature smoke, REQ-013/T-M-002 carry-forward, and removed-file decision audit.
- Plan 12.3: Evidence, cumulative gate, and closeout.

## Risks

- **Evidence over-claim:** Citing old Phase 8 screenshots without confirming current post-handoff state would undercut REQ-022.
- **Conditional smoke ambiguity:** T-A-011 is conditional; it should be explicitly marked not required if no packaging/Electron config changes occur during Phase 12.
- **Manual smoke fuzziness:** T-M-001..T-M-004 need concrete notes and commands where possible, not vague "looks good" statements.
- **Scope creep:** Phase 12 must not become a redesign or another upstream merge.

## Open Questions

None block planning. If implementation discovers that current code conflicts with the product requirements or test plan, the downstream agent should stop and ask before weakening a requirement.

## RESEARCH COMPLETE
