# Phase 10 Research: Shared Contracts Audit

**Status:** Complete
**Date:** 2026-06-01

## Mandatory First Reads

Every downstream implementation, QA, and review agent for Phase 10 must read these before deciding scope, code changes, or verification:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

The requirements document is the behavioral source of truth. The test plan is the verification source of truth.

## Current State

The live Cate roadmap completed the upstream sync as Phase 8 and the mainline handoff as Phase 9. The product gap analysis originally defined Phase 10 as "Shared Contracts." To avoid replaying completed merge work, Phase 10 should audit and harden the final post-handoff `main` branch against the shared-contract subset of the upstream-sync specification.

Relevant completed evidence:

- `.planning/phases/08-upstream-sync-v1-1-0/08-03-PLAN.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-03-SUMMARY.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md`
- `.planning/phases/09-upstream-sync-mainline-handoff/09-VERIFICATION.md`

Post-Phase-9 gap fixes added canonical E2E IDs to FlashQuery Playwright test titles and a crosswalk to Phase 9 verification. Phase 10 should rely on those canonical titles when validating `T-E-004` persistence evidence.

## Surfaces To Inspect

- `src/shared/ipc-channels.ts`
- `src/shared/electron-api.d.ts`
- `src/preload/index.ts`
- `src/main/ipc/flashquery.ts`
- `src/shared/types.ts`
- `src/renderer/lib/session.ts`
- `src/main/projectWorkspaceStore.ts`
- `src/main/flashquery/credentials.ts`
- `src/renderer/panels/EditorPanel.tsx`
- `src/renderer/lib/e2eHarness.ts`
- `e2e/fixtures/electron-app.ts`
- `e2e/flashquery-persistence.spec.ts`
- Existing tests covering FlashQuery IPC, credentials, session, shared URI/type helpers, EditorPanel save behavior, and persistence E2E.

## Requirements And Tests

| Requirement | Proof |
|-------------|-------|
| REQ-005 | T-U-004, T-E-004, static check for raw token persistence/renderer return paths |
| REQ-006 | T-U-005, focused inspection of `/mcp/info` and private MCP request headers |
| REQ-008 | T-U-001, T-U-002, T-U-003, T-A-004 |
| REQ-009 | T-U-008, T-U-009, T-E-004 |
| REQ-010 | T-U-007, static check for `CATE_E2E` gating |
| REQ-019 | T-A-012 conflict-review evidence |
| REQ-024 | Build, typecheck, unit, E2E gates |
| REQ-025 | Cumulative gate evidence with no regression from Phase 8/9 |

## Recommended Plan Slices

1. Contract inventory and proof audit: verify exact IPC names, typed renderer APIs, preload bridge shape, and existing test coverage.
2. Security/session assertion hardening: close any missing tests for token persistence, public/private auth behavior, session fixtures, body-only writes, and E2E gating.
3. Evidence and closeout: rerun the cumulative gate, inspect conflict-review evidence, write verification/UAT artifacts, and leave no ambiguity about skipped checks.

## Verification Gates

- `npm run typecheck`
- Focused Vitest files for `ipc-channels`, `flashquery`, credentials, shared types, session, and EditorPanel as applicable.
- `npm test`
- `npm run test:e2e` or a focused persistence E2E run if a full E2E run is too costly and the plan explicitly justifies that choice.
- Static checks for broad `.claude/` ignore drift are not Phase 10 core scope, but may be carried forward if cumulative evidence references T-A-013.

## RESEARCH COMPLETE
