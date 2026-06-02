# Phase 8: Upstream Sync to `v1.1.0` - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Product requirements and paired test plan

<domain>
## Phase Boundary

Phase 8 performs the controlled migration of the FlashQuery Cate fork onto upstream stable tag `v1.1.0`. This is a migration phase, not a new-product-feature phase. The work must preserve FlashQuery v1 behavior and security guarantees while adopting upstream architecture/fixes, then prove the merged tree with the full verification matrix.

</domain>

<decisions>
## Implementation Decisions

### Locked Source Documents

- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` before resolving conflicts, changing contracts, or signing off a plan.
- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` before adding tests, running verification, or recording acceptance evidence.
- If those product docs and local planning summaries disagree, the product docs win unless the agent records a blocker and asks the user.

### Merge Strategy

- Merge upstream `v1.1.0` stable tag only.
- Use a real two-parent merge commit; do not rebase, squash, or rewrite upstream history.
- Do not use a worktree for the migration branch; follow the product doc's branch constraint.
- Do not create, rename, or switch branches during planning. Branch operations belong to execution Plan 8.1.
- Execution should follow the product doc's canonical command sequence: `git fetch upstream --tags`, `git checkout main`, baseline commands, `git checkout -b sync/upstream-v1.1.0`, then one `git merge --no-ff v1.1.0` that remains in progress while Plans 8.2-8.5 resolve conflicts in staged order.
- There is no per-plan upstream pull, checkout, cherry-pick, rebase, or squash. Plans 8.2-8.5 resolve files from the single merge working tree and `git add` resolved files as they go; Plan 8.6 finalizes the merge commit after all conflicts and gates are green.

### Security Invariants

- The bearer token never returns from main to renderer, logs, persisted workspace files, or session snapshots.
- Public probe remains unauthenticated at `GET /mcp/info`; private MCP operations remain bearer-authenticated.
- Vault writes stay body-only and update-only.
- E2E bridges stay gated behind `CATE_E2E`.

### Verification Discipline

- Capture baseline output before merging.
- Apply cumulative exit gates after each migration slice.
- Preserve or strengthen tests for FlashQuery IPC, token safety, session compatibility, renderer flows, E2E harness behavior, visual evidence, and process gates.
- Any central conflict file listed in REQ-019 needs a review note before the phase can close.

### the agent's Discretion

- Exact branch name, artifact folder names, and screenshot filenames are agent discretion, as long as they are easy to find, committed when appropriate, and referenced from `docs/UPSTREAM-SYNC.md` or phase evidence.
- Exact test-file placement is agent discretion, but every new assertion must trace to the Test Plan IDs.
- Theme-token mapping for FlashQuery surfaces is agent discretion where the upstream token model does not provide a perfect semantic token; any retained hard-coded value must pass contrast and be noted.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` — authoritative migration requirements, invariants, conflict forecast, sequencing, and acceptance criteria.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` — authoritative test IDs, anchors, evidence requirements, and pass/fail gates.

### Local GSD Context

- `.planning/REQUIREMENTS.md` — active milestone summary and phase traceability.
- `.planning/ROADMAP.md` — active phase scope and plan list.
- `.planning/PROJECT.md` — shipped v1.0 context, protected surfaces, lessons learned, and planning preferences.
- `.planning/milestones/v1.0-REQUIREMENTS.md` — archived FlashQuery v1 requirements that must not regress.
- `.planning/milestones/v1.0-ROADMAP.md` — archived v1 phase structure and prior implementation notes.

### Codebase Reference

- `.planning/codebase/ARCHITECTURE.md` — Electron/React/Zustand architecture map.
- `.planning/codebase/STRUCTURE.md` — file layout and module ownership.
- `.planning/codebase/TESTING.md` — current test commands and harness notes.
- `.planning/codebase/CONCERNS.md` — known risk areas.

</canonical_refs>

<specifics>
## Specific Ideas

- Keep the plan order aligned to product spec Section 8:
  1. Baseline and branch setup.
  2. Build/dependency/packaging migration.
  3. Shared contracts.
  4. Renderer behavior.
  5. Upstream feature compatibility.
  6. Verification and release readiness.
- Store baseline and per-gate logs under an evidence folder that is referenced by the runbook.
- Copy the product doc's canonical command spine into `docs/UPSTREAM-SYNC.md` during Plan 8.6, including the optional `git tag -a synced/upstream-v1.1.0 -m "Synced to upstream v1.1.0 (5b6549d)"`.
- Add or update tests before resolving risky contract migrations where practical, especially session compatibility and token-safety assertions.
- Keep conflict-review notes in a single durable file, preferably `docs/UPSTREAM-SYNC.md` or an evidence file linked from it.

</specifics>

<deferred>
## Deferred Ideas

- Unreleased upstream commits after `v1.1.0`, including the specific commits called out in the product doc, are deferred to a future sync.
- New FlashQuery creation, conflict detection, live notifications, and reload-from-FlashQuery features remain outside this migration unless the merge directly touches their existing placeholders.

</deferred>

---

*Phase: 08-upstream-sync-v1-1-0*
*Context gathered: 2026-06-01 from upstream sync product docs*
