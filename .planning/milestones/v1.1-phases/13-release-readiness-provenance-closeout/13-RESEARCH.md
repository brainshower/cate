# Phase 13 Research: Release Readiness + Provenance Closeout

**Date:** 2026-06-01
**Status:** Complete

## Research Question

What does Phase 13 need to know to plan a final release-readiness and provenance closeout pass for the Cate `v1.1.0` upstream sync?

## Mandatory Source Documents

Every downstream implementation, QA, and review agent must read these first:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## Findings

### Product Scope

The upstream-sync product docs define Phase 6-style release readiness around full matrix verification, product acceptance, process gates, conflict-review notes, `.planning/` tracking, runbook delivery, and upstream provenance. In the live Cate roadmap, the actual merge and mainline handoff were completed in Phases 8 and 9, while Phases 10-12 audited shared contracts, renderer behavior, upstream value, and visual evidence. Phase 13 should therefore be a final evidence reconciliation and closeout pass, not another merge or feature phase.

### Requirements To Carry Forward

- REQ-021: `.planning/` must remain tracked and broad `.claude/` ignore rules must not disturb GSD files.
- REQ-023: `docs/UPSTREAM-SYNC.md` must remain tracked and include the sync runbook, protected-surface inventory, and append-only sync ledger.
- REQ-024: full verification matrix must pass.
- REQ-025: cumulative regression exit gate must preserve previously green behavior.
- REQ-026: upstream provenance must remain queryable via real merge ancestry, merge-base, behind-count 0, merge commit metadata, and ledger entry.
- T-A-010 also matters as the product acceptance checklist for user-visible FlashQuery behavior.

### Evidence Already Available

- Phase 9 verified post-handoff provenance gates and planning closeout.
- Phase 10 verified shared contract/security/session invariants.
- Phase 11 verified renderer behavior, E2E harness, sidebar, dock tab, command palette, and editor save behavior.
- Phase 12 verified upstream value, removed-file decisions, light/dark visual evidence, and final command matrix.
- Commit `a8b21fe` closed the latest Phase 12 upstream-value evidence gaps by strengthening `e2e/flashquery-visual-evidence.spec.ts`, adding deterministic status-chip state captures through `FlashQueryVaultPanel`, and updating Phase 12 verification to include REQ-003/T-M-005 and the static/headless smoke distinction for T-M-001, T-M-002, T-M-003, and T-M-005.
- Commit `2d7a5cd` gates that deterministic status-chip event listener behind `window.electronAPI.isE2E`, which matters for Phase 13 acceptance wording: the helper is visual-evidence-only and should not be described as a production renderer surface.
- Commit `6f74e44` corrects the T-M-003 file-exclusion evidence citation so Phase 13 references main-side `getSettingSync('fileExclusions')` and filesystem explorer/search/watch integration rather than an Electron API bridge path.

Phase 13 should cite this history as supporting evidence, but should write current Phase 13 evidence first.

### Risks

- A final closeout can overclaim readiness by citing stale Phase 8 evidence instead of current Phase 12/13 artifacts.
- Product acceptance can be implied by automated E2E while manual-only checklist items are never recorded.
- Phase 13 can accidentally overstate Phase 12 static/headless smoke rows as manually observed UI smoke unless the acceptance notes preserve the verdict wording.
- Full Phase 13 E2E can refresh the Phase 12 visual evidence screenshots because the visual evidence spec writes to the Phase 12 evidence directory; this should be recorded, not treated as unrelated dirty output.
- Phase 13 can accidentally understate the Phase 12 security posture if it mentions the visual status event without the `isE2E` gate from `2d7a5cd`.
- Phase 13 can perpetuate stale file-exclusion wording if it cites pre-`6f74e44` evidence text instead of the corrected T-M-003 row.
- Provenance gates can drift after documentation updates if not re-run on the current tree.
- Updating `.planning/ROADMAP.md` and `.planning/STATE.md` before evidence passes can make the milestone look closed while gaps remain.

## Validation Architecture

Phase 13 validation should combine artifact inspection and command evidence:

- Acceptance evidence: T-A-010 checklist with explicit pass/fail/not-required rows and links to E2E/final logs.
- Provenance evidence: T-A-012 through T-A-015 command outputs and artifact checks recorded under `evidence/provenance/`.
- Final command matrix: build, typecheck, unit, and E2E logs under `evidence/final/`, each with command, timestamp, output, and `exit_code`.
- Closeout docs: `13-UAT.md` and `13-VERIFICATION.md` must map every scoped REQ and test ID to evidence before ROADMAP/STATE claim completion.

## Planning Recommendation

Create three plans:

1. Product acceptance smoke and evidence reconciliation.
2. Provenance, runbook, conflict-review, and tracking gates.
3. Final cumulative command matrix, UAT/verification docs, and planning closeout.

## RESEARCH COMPLETE
