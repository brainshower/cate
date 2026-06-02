# Phase 9: Upstream Sync Mainline Handoff - Research

**Researched:** 2026-06-01
**Status:** Ready for planning

## Research Complete

The required research lives in the upstream-sync product requirements, paired test plan, and the completed Phase 8 evidence. Phase 9 should not reinterpret the migration scope; it should preserve the verified branch, run fresh handoff gates, and close planning state.

## Required Reading For Downstream Agents

Every executor, verifier, code reviewer, and QA agent MUST read:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## Current Repo Findings

- The active branch is `sync/upstream-v1.1.0`.
- Phase 8 verification passed and records merge commit `318214f` (`Merge upstream v1.1.0 (tag, 5b6549d) into fork`).
- The latest branch tip includes gap-closure commits after the original verification docs:
  - `918e3d7 test(08): close upstream sync gap coverage`.
  - `184a7ca test(08): add generated premerge workspace fixture`.
- Those commits add explicit coverage for `T-U-002`, `T-U-008`, `T-U-017`, missing conflict-review notes, and a generated pre-merge workspace/session fixture.
- `docs/UPSTREAM-SYNC.md` exists and records the sync ledger, protected surfaces, verification matrix, and process gates.

## Handoff Risks

- A careless mainline merge could rewrite or obscure the real upstream merge commit required by REQ-026.
- Main could advance between planning and execution; if so, a fast-forward handoff might not be possible and the agent must stop rather than inventing a merge strategy.
- Post-handoff verification can be accidentally weakened by relying only on old Phase 8 logs. Phase 9 needs fresh evidence or an explicit documented reason for any reused evidence.
- A mainline handoff can accidentally omit the gap-closure commits if it fast-forwards to the original Phase 8 verification commit rather than the current sync branch tip. Phase 9 must record the branch tip and include the gap-closure commits in the preflight.
- Planning closure can overclaim if ROADMAP, STATE, and VERIFICATION are marked complete before post-handoff gates pass.

## Validation Architecture

Use the paired test plan as the validation architecture:

- Cumulative regression: `T-A-002`.
- Build/typecheck: `T-A-003`, `T-A-004`.
- E2E/product smoke: `T-E-001..T-E-005`, `T-A-010`.
- Process/provenance: `T-A-012..T-A-015`.
- Full matrix confirmation: `REQ-024`.
- Mainline provenance and sync ledger: `REQ-026`.
- Gap-closure coverage: `T-U-002`, `T-U-008`, `T-U-017`, `T-M-004`, and `T-A-012`.

## Planning Implications

- Use one plan for the handoff because the migration conflicts are already resolved in Phase 8.
- Make the first task a source-doc and evidence preflight so downstream agents cannot skip the product docs.
- Make the handoff task explicitly prefer fast-forward and stop on divergence.
- Make preflight record the Phase 8 gap-closure commits and evidence so executors do not hand off an older sync branch state.
- Make verification and planning closeout separate tasks so closure cannot happen before evidence exists.

## Open Questions

None currently block planning. If execution discovers main has diverged from the sync branch, stop and ask the user before resolving conflicts or changing the handoff strategy.

---

## RESEARCH COMPLETE
