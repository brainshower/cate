# Phase 11 Research: Renderer Behavior Audit

**Status:** Complete
**Date:** 2026-06-01

## Mandatory First Reads

Every downstream implementation, QA, and review agent for Phase 11 must read these before deciding scope, code changes, or verification:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

The requirements document is the behavioral source of truth. The test plan is the verification source of truth. `Gaps.md` is supporting historical context, especially for the original "Phase 11: Renderer Behavior" section.

## Current State

The live Cate roadmap completed the upstream sync as Phase 8, mainline handoff as Phase 9, and shared-contract audit as Phase 10. The product gap analysis originally defined Phase 11 as "Renderer Behavior." To avoid replaying completed merge work, this active Phase 11 should audit and harden the final post-handoff `main` branch against the renderer-behavior subset of the upstream-sync specification.

Relevant completed evidence:

- `.planning/phases/08-upstream-sync-v1-1-0/08-04-PLAN.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-04-SUMMARY.md`
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/renderer/CONFLICT-REVIEW.md`
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/renderer/NOTES.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md`
- `.planning/phases/09-upstream-sync-mainline-handoff/09-VERIFICATION.md`
- `.planning/phases/10-shared-contracts-audit/10-VERIFICATION.md`

Phase 8 gap fixes already added command-palette E2E coverage for `T-U-017` and Phase 10 re-checked shared contracts. Phase 11 should rely on canonical upstream-sync IDs and current evidence, not older v1.0-only scenario IDs.

Phase 10 gap-fix commits `7709de4` and `0c88362` affect Phase 11's harness audit inputs:

- `src/renderer/App.tsx` now delegates E2E harness installation to `src/renderer/lib/e2eHarnessGate.ts`.
- `src/renderer/lib/e2eHarnessGate.test.ts` proves the branch decision around `window.electronAPI.isE2E`.
- `src/renderer/lib/e2eHarness.test.tsx` proves the real harness installs `window.__cateE2E` only when that gate allows it.
- `e2e/flashquery-persistence.spec.ts` includes disk-level no-token assertions for `.cate/workspace.json` and `.cate/session.json`.
- `.planning/phases/10-shared-contracts-audit/evidence/final/test-e2e-full.log` is the newest full FlashQuery E2E baseline.

## Surfaces To Inspect

- `src/renderer/stores/appStore.ts`
- `src/renderer/App.tsx`
- `src/renderer/panels/EditorPanel.tsx`
- `src/renderer/sidebar/Sidebar.tsx`
- `src/renderer/sidebar/WorkspaceTab.tsx`
- `src/renderer/docking/DockTabBar.tsx`
- `src/renderer/ui/CommandPalette.tsx`
- `src/renderer/panels/FlashQueryVaultPanel.tsx`
- `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`
- `src/renderer/components/VaultBadge.tsx`
- `src/renderer/App.tsx`
- `src/renderer/lib/e2eHarnessGate.ts`
- `src/renderer/lib/e2eHarnessGate.test.ts`
- `src/shared/flashqueryUri.ts`
- `src/main/flashquery/uri.ts`
- `src/renderer/lib/e2eHarness.ts`
- `src/renderer/lib/e2eHarness.test.tsx`
- `e2e/fixtures/electron-app.ts`
- `e2e/fixtures/flashquery-server.ts`
- `e2e/fixtures/flashquery-server.spec.ts`
- `e2e/flashquery-happy-path.spec.ts`
- `e2e/flashquery-vault-browse.spec.ts`
- `e2e/flashquery-disconnect.spec.ts`
- `e2e/flashquery-persistence.spec.ts`

## Requirements And Tests

| Requirement | Proof |
|-------------|-------|
| REQ-003 | T-U-010, T-M-005 supporting context, appStore/provider inspection |
| REQ-007 | T-U-006 supporting body-only write checks, T-U-013 editor save path |
| REQ-011 | T-U-011, T-U-015, T-E-002 |
| REQ-012 | T-U-010 |
| REQ-013 | T-U-013, T-U-016, T-E-001 |
| REQ-014 | T-U-012, T-E-001, visual evidence if touched |
| REQ-015 | T-U-017 or E2E fallback in T-E-001 |
| REQ-016 | T-U-014, T-E-003 |
| REQ-017 | T-E-001 through T-E-005 |
| REQ-019 | T-A-012 renderer/harness conflict-review evidence |
| REQ-024 | Build, typecheck, unit, and E2E gates |
| REQ-025 | Cumulative gate evidence with no regression from Phases 8-10 |

## Recommended Plan Slices

1. Renderer surface proof audit: appStore, panel factory, sidebar, workspace tab, dock tabs, badge, command palette, dialog, editor save path, and renderer component/unit evidence.
2. E2E harness and workflow audit: restart-capable fixture, FlashQuery stub server, renderer harness helpers, and FlashQuery Playwright flows.
3. Evidence and closeout: final cumulative gate, T-A-012 renderer conflict-review addendum if needed, UAT/verification artifacts, and roadmap/state updates only after evidence passes.

## Verification Gates

- `npm run typecheck`
- Focused Vitest files for renderer surfaces as applicable.
- `npm test`
- `npm run test:e2e` or focused FlashQuery E2E commands if the plan records an explicit rationale.
- Static checks for `createFlashQueryVault`, `flashqueryVault`, `New FlashQuery Vault`, `flashqueryWriteDocument`, `installE2EHarnessIfEnabled`, `CATE_E2E`, and T-A-012 renderer conflict-review coverage.

## RESEARCH COMPLETE
