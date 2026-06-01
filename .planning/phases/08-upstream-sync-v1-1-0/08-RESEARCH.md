# Phase 8: Upstream Sync to `v1.1.0` - Research

**Researched:** 2026-06-01
**Status:** Ready for planning

## Research Complete

The product requirements and test plan already contain the migration research, conflict forecast, protected-surface inventory, and verification matrix. This phase should not re-open product questions unless implementation discovers a contradiction not covered by those documents.

## Required Reading For Downstream Agents

Every executor, verifier, code reviewer, and QA agent MUST read:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## Key Findings

### Migration Shape

- The fork is materially ahead of and behind upstream; this is a planned migration rather than a trivial merge.
- Conflict risk concentrates in the runtime surfaces that FlashQuery extends: `appStore`, preload, shared contracts, session, editor, sidebar, dock tabs, `main/index.ts`, and E2E fixtures.
- The product spec recommends contracts-inward sequencing: baseline, build/deps, shared contracts, renderer shell, upstream feature compatibility, then full evidence/readiness.

### Security And Contract Risks

- The highest-risk invariant is the bearer-token boundary. Raw token data must not cross from main to renderer or persist to workspace/session files.
- Public-vs-private HTTP behavior must remain split: unauthenticated `/mcp/info`, bearer-authenticated `/mcp`.
- Vault writes must remain body-only and update-only.
- FlashQuery IPC channel strings are a compatibility contract and need explicit collision checks.

### Verification Strategy

- Baseline capture is mandatory before merge.
- Cumulative exit gates are mandatory after each migration slice.
- Unit/component tests cover IPC constants, token safety, write payloads, session compatibility, and renderer flows.
- E2E tests must preserve FlashQuery happy path, vault browse, disconnect/retry, persistence, and stub-server lifecycle.
- Visual evidence must cover vault badge, sidebar vault view, connection dialog, status chip, and editor tabs in light and dark themes.
- Process gates must verify conflict-review notes, `.planning/` tracking, future-sync runbook, and upstream merge provenance.

## Validation Architecture

Use the paired test plan as the validation architecture:

- Baseline/process gates: `T-A-001`, `T-A-002`, `T-A-012` through `T-A-015`.
- Build/type gates: `T-A-003`, `T-A-004`.
- Unit/component gates: `T-U-001` through `T-U-017`.
- E2E gates: `T-E-001` through `T-E-005`.
- Visual gates: `T-A-005` through `T-A-009`.
- Manual smoke/product gates: `T-M-001` through `T-M-005`, `T-A-010`, and conditional `T-A-011`.

## Planning Implications

- Split the phase into six plans matching the product migration phases.
- Make Plan 8.1 responsible for baseline, branch, upstream ref verification, and captured pre-merge artifacts.
- Make Plan 8.1 also responsible for starting the one in-progress merge with `git merge --no-ff v1.1.0` after baseline and branch creation.
- Make Plan 8.2 responsible for package/build/packaging conflict resolution from that single in-progress merge, not a separate pull or merge.
- Make Plan 8.3 responsible for shared contracts and security/session tests.
- Make Plan 8.4 responsible for renderer behavior and E2E harness preservation.
- Make Plan 8.5 responsible for upstream feature compatibility, theming, visuals, and removed-file decisions.
- Make Plan 8.6 responsible for final matrix, process evidence, runbook, provenance, `.planning/` tracking, and closure.

## Canonical Merge Command Spine

The requirements doc spells out the command sequence that execution should preserve:

```bash
git fetch upstream --tags
git checkout main
# run baseline commands here
git checkout -b sync/upstream-v1.1.0
git merge --no-ff v1.1.0
# resolve conflicts across Plans 8.2-8.5, git add files as resolved
git commit
git tag -a synced/upstream-v1.1.0 -m "Synced to upstream v1.1.0 (5b6549d)"
```

The tag command is optional per REQ-026. The merge command is not optional: the migration must be a true tag merge, not a rebase, squash, or cherry-pick sequence.

## Open Questions

None currently block planning. If implementation discovers a contradiction between upstream code and the product docs, stop and ask the user before weakening a FlashQuery invariant.

---

## RESEARCH COMPLETE
