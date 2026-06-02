# Phase 11: Renderer Behavior Audit - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Product upstream-sync requirements/test plan, upstream-sync gap analysis, and Cate `.planning/` state

<domain>
## Phase Boundary

Phase 11 audits and hardens the renderer-behavior slice that the upstream-sync gap analysis originally defined as "Phase 11: Renderer Behavior." The actual `v1.1.0` merge shipped in Phase 8, the mainline handoff shipped in Phase 9, and the shared-contract audit shipped in Phase 10. This phase must not start another upstream merge or replay already-closed work.

The goal is to prove the final mainline tree still satisfies the renderer/store/editor/sidebar/dock-tab/command-palette/dialog/E2E-harness requirements from the upstream-sync specification, close any narrow test or evidence gaps, and codify the source-doc-first rule for every downstream implementation, QA, and review agent.

</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Docs

- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` before making behavior, scope, or remediation decisions.
- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` before making verification, test-ID, or pass/fail decisions.
- Downstream agents SHOULD read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Gaps.md` for the Phase 11 historical scope and any already-resolved renderer evidence gaps.
- If product docs and local planning artifacts disagree, the requirements document controls behavior and the test plan controls verification IDs and acceptance.

### Phase Shape

- Phase 11 is a post-handoff renderer behavior audit/remediation phase.
- Code changes are allowed only when the audit finds a real renderer behavior, harness capability, or test coverage gap.
- Prefer proof, focused tests, evidence notes, and closeout artifacts over broad refactors.
- Do not pull unreleased upstream commits, re-run the `v1.1.0` merge, change FlashQuery MCP server contracts, redesign FlashQuery UI, or perform release/version bump work.

### Phase 10 Gap-Fix Context

- Phase 10 gap fixes changed the E2E harness reachability path: `src/renderer/App.tsx` now imports `installE2EHarnessIfEnabled()` from `src/renderer/lib/e2eHarnessGate.ts`, and `src/renderer/lib/e2eHarnessGate.test.ts` plus `src/renderer/lib/e2eHarness.test.tsx` prove `window.__cateE2E` is absent unless `window.electronAPI.isE2E` is true.
- Phase 10 also hardened `e2e/flashquery-persistence.spec.ts` with disk-level `.cate/workspace.json` and `.cate/session.json` assertions that raw bearer tokens and `auth`/`token` keys are not persisted.
- Phase 10 final evidence now includes a full FlashQuery E2E gate at `.planning/phases/10-shared-contracts-audit/evidence/final/test-e2e-full.log`, not only a focused persistence run. Phase 11 should treat that as the latest baseline for E2E/harness expectations.

### Requirements In Scope

- REQ-003 adopt upstream appStore/agent-provider refactor while preserving FlashQuery hooks.
- REQ-007 vault writes remain body-only.
- REQ-011 FlashQuery Vault left-sidebar view remains mounted and discoverable.
- REQ-012 vault panel factory survives the appStore refactor.
- REQ-013 editor vault read/write/save/dirty behavior coexists with upstream editor fixes.
- REQ-014 vault badge and dock tab layout remain usable.
- REQ-015 "New FlashQuery Vault" command palette entry remains discoverable and functional.
- REQ-016 connection dialog probe/test/save remains functional.
- REQ-017 E2E harness FlashQuery capabilities are merged, not overwritten.
- REQ-019 central renderer/harness conflict files carry explicit review notes.
- REQ-024 verification matrix passes.
- REQ-025 cumulative regression gates do not regress earlier green tests.

### Tests In Scope

- T-U-010 through T-U-017.
- T-E-001 through T-E-005.
- T-A-002 and T-A-012.
- Supporting gates: `npm run build`, `npm run typecheck`, focused renderer/unit tests, and `npm run test:e2e` or a justified focused FlashQuery E2E subset.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read the product docs before planning or implementing.**

### Product Source Of Truth

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` - authoritative behavior, invariants, and requirement IDs.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` - authoritative verification layers, test IDs, and pass criteria.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Gaps.md` - historical Phase 11 renderer behavior scope and gap-resolution context.

### Local Planning References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-04-PLAN.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-04-SUMMARY.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md`
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/renderer/CONFLICT-REVIEW.md`
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/renderer/NOTES.md`
- `.planning/phases/09-upstream-sync-mainline-handoff/09-VERIFICATION.md`
- `.planning/phases/10-shared-contracts-audit/10-VERIFICATION.md`
- `.planning/phases/10-shared-contracts-audit/evidence/contracts/NOTES.md`
- `.planning/phases/10-shared-contracts-audit/evidence/final/NOTES.md`

</canonical_refs>

<deferred>
## Deferred Ideas

- Theme visual evidence and upstream feature smoke remain Phase 12-style work unless a renderer audit finds a direct regression.
- Release packaging/version bump work remains out of scope.

</deferred>

---

*Phase: 11-renderer-behavior-audit*
*Context gathered: 2026-06-01 via product-doc and planning-artifact review*
