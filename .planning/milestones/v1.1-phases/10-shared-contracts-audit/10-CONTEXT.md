# Phase 10: Shared Contracts Audit - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Product upstream-sync requirements/test plan plus Cate `.planning/` state

<domain>
## Phase Boundary

Phase 10 audits the post-handoff `main` branch against the shared-contract subset of the upstream-sync specification. The v1.1 upstream merge and mainline handoff are already complete in Phases 8 and 9. This phase therefore verifies and hardens the final mainline tree rather than starting another merge or replaying conflict resolution.

The scope comes from the upstream-sync gap analysis definition of "Phase 10: Shared Contracts": IPC channels, shared types, preload APIs, session schema, token boundaries, public/private MCP auth behavior, E2E-only bridge gating, conflict-review evidence, and cumulative regression gates.

</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Docs

- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` before making behavior or scope decisions.
- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` before making verification or pass/fail decisions.
- If product docs and local planning artifacts disagree, the requirements document controls behavior and the test plan controls verification IDs and acceptance.

### Phase Shape

- Phase 10 is a post-handoff audit/remediation phase, not a second upstream merge.
- The plan should prefer proof, focused tests, and evidence updates over broad rewrites.
- Code changes are allowed only when the audit finds a real contract, security, session, preload, or test coverage gap.

### Requirements In Scope

- REQ-005 bearer token never leaves the main process.
- REQ-006 public `/mcp/info` probe remains unauthenticated and private calls remain bearer-authenticated.
- REQ-008 FlashQuery IPC channel namespace remains exact and collision-free.
- REQ-009 pre-merge session/workspace files continue to load with sanitized FlashQuery metadata.
- REQ-010 E2E-only bridges stay guarded by `CATE_E2E`.
- REQ-019 central conflict files carry explicit review notes.
- REQ-024 full verification matrix passes.
- REQ-025 cumulative regression gates do not regress earlier green tests.

### Tests In Scope

- T-U-001 through T-U-009.
- T-E-004.
- T-A-002, T-A-004, and T-A-012.

### Phase 9 Gap-Fix Context

- A post-Phase-9 gap fix added canonical E2E IDs directly to the FlashQuery Playwright test titles and recorded an E2E ID crosswalk in `.planning/phases/09-upstream-sync-mainline-handoff/09-VERIFICATION.md`.
- Phase 10 agents should use the canonical upstream-sync IDs, not infer from older v1.0-only scenario IDs. In particular, `e2e/flashquery-persistence.spec.ts` now carries `T-E-004 persistence / T-E-006 plus T-E-007 persists connection across restart without eager info probe`.

### Out Of Scope

- Pulling unreleased upstream `main` commits.
- Starting another `v1.1.0` merge.
- New FlashQuery product features.
- Changing FlashQuery MCP server contracts.
- Release/version bump/package publishing work.
- Renderer UI redesign outside shared-contract evidence needs.

</decisions>

<references>
## Local Planning References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-03-PLAN.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-03-SUMMARY.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md`
- `.planning/phases/09-upstream-sync-mainline-handoff/09-VERIFICATION.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Gaps.md`

</references>
