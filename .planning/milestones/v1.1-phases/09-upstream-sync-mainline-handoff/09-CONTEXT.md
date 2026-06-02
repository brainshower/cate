# Phase 9: Upstream Sync Mainline Handoff - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Product requirements, paired test plan, completed Phase 8 evidence, and Phase 8 gap-closure commits

<domain>
## Phase Boundary

Phase 9 is a handoff phase after the upstream `v1.1.0` migration has already been resolved and verified on `sync/upstream-v1.1.0`. It does not reopen the migration or add new FlashQuery features. It reviews the Phase 8 evidence chain, moves the verified sync branch into mainline when safe, reruns post-handoff verification, and closes v1.1 planning state only after the product-defined process/provenance gates still hold.

After Phase 8 was first marked complete, gap closure added concrete coverage for `T-U-002`, `T-U-008`, `T-U-017`, and missing conflict-review notes. Phase 9 must treat those fixes as part of the verified sync branch and must not hand off an older state that lacks them.

</domain>

<decisions>
## Implementation Decisions

### Locked Source Documents

- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` before making any handoff, merge, provenance, or documentation decision.
- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` before choosing which verification commands or evidence gates are sufficient.
- If local planning docs and the product docs disagree, the product docs win unless the agent records a blocker and asks the user.

### Handoff Strategy

- Treat `sync/upstream-v1.1.0` as the already-verified migration branch; do not restart the upstream merge.
- Prefer a fast-forward handoff from main to `sync/upstream-v1.1.0` so the existing two-parent upstream merge commit and Phase 8 evidence commit are preserved exactly.
- If main has advanced or a fast-forward handoff is impossible, stop and ask the user before resolving conflicts or creating a new merge strategy.
- Do not rebase, squash, cherry-pick, or rewrite the upstream merge history.

### Verification Discipline

- Fresh post-handoff verification must include build, typecheck, unit/component tests, E2E tests, process/provenance checks, and product acceptance smoke or an explicit evidence-based reason for any skipped manual step.
- Fresh post-handoff verification must include the Phase 8 gap-closure coverage now in the branch: `src/shared/ipc-channels.test.ts`, `src/renderer/lib/session.test.ts`, the premerge workspace/session fixtures, and the command-palette FlashQuery Vault E2E path in `e2e/flashquery-happy-path.spec.ts`.
- The phase must not claim the v1.1 handoff is closed unless `v1.1.0` remains an ancestor, merge-base remains `5b6549d`, behind-count versus `v1.1.0` remains `0`, `.planning/` remains tracked, and `docs/UPSTREAM-SYNC.md` remains tracked with the sync ledger.

### the agent's Discretion

- Exact evidence filenames are agent discretion, but they must live under `.planning/phases/09-upstream-sync-mainline-handoff/evidence/` and be referenced from `09-VERIFICATION.md`.
- The agent may run a fuller verification matrix than the minimum plan requires.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` - authoritative upstream-sync requirements, invariants, merge provenance rules, conflict/process gates, and non-goals.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` - authoritative test IDs, command matrix, process gates, evidence expectations, and pass/fail criteria.

### Local Phase 8 Evidence

- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md` - final Phase 8 pass status and evidence map.
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md` "Gap Closure Addendum" - records post-analysis fixes for `T-U-002`, `T-U-008`, `T-U-017`, `T-M-004`, and missing central conflict-review notes.
- `.planning/phases/08-upstream-sync-v1-1-0/08-VALIDATION.md` - validation gates and required evidence.
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/` - baseline, build, contract, renderer, visual, and final logs.
- `docs/UPSTREAM-SYNC.md` - runbook, protected surface inventory, verification matrix, process gates, and sync ledger.

### Local Planning State

- `.planning/ROADMAP.md` - Phase 9 scope and plan list.
- `.planning/REQUIREMENTS.md` - requirement traceability and Phase 9 handoff addendum.
- `.planning/STATE.md` - current project state and next step.

</canonical_refs>

<specifics>
## Specific Ideas

- Start with a preflight that confirms the branch is clean and Phase 8 evidence exists before any mainline handoff action.
- Include `918e3d7 test(08): close upstream sync gap coverage` and `184a7ca test(08): add generated premerge workspace fixture` in the preflight notes or equivalent evidence, so the handoff cannot accidentally omit the gap fixes.
- Use `git merge --ff-only sync/upstream-v1.1.0` from main during execution if main is still an ancestor of the sync branch.
- Capture post-handoff logs under `.planning/phases/09-upstream-sync-mainline-handoff/evidence/final/`.
- Keep Phase 9 narrow: handoff, smoke, provenance, planning closeout. Do not cut a release, bump version, or add new FlashQuery behavior.

</specifics>

<deferred>
## Deferred Ideas

- Cutting a product release remains outside this upstream-sync handoff unless the user explicitly starts a release workflow.
- Pulling unreleased upstream commits after `v1.1.0` remains deferred to a future upstream sync.
- New FlashQuery features remain deferred to a separate milestone.

</deferred>

---

*Phase: 09-upstream-sync-mainline-handoff*
*Context gathered: 2026-06-01 from upstream sync product docs and Phase 8 evidence*
