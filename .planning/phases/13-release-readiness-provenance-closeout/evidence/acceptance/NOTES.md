# Phase 13 Acceptance Evidence Notes

**Date:** 2026-06-02
**Plan:** 13.1 Product Acceptance Smoke Reconciliation
**Status:** Passed. Current evidence mapped, including focused T-A-010 E2E coverage for the connection Test button and workspace menu connection action.

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

The requirements document controls behavior and scope. The test plan controls T-A-010, T-E-001, T-E-002, T-E-003, T-E-004, T-E-005, and the evidence standard for acceptance decisions.

## T-A-010 Product Acceptance Checklist

| Checklist step | Verdict | Current evidence | Notes |
| --- | --- | --- | --- |
| connect | pass | `e2e/flashquery-happy-path.spec.ts` T-E-001 opens the FlashQuery connection dialog, fills URL and token, saves, and opens the vault panel; Phase 12 final `evidence/final/test-e2e.log` exited 0. | Automated E2E covers the connection path with the FlashQuery stub server. |
| test connection | pass | `e2e/flashquery-happy-path.spec.ts` now includes `T-A-010 tests FlashQuery connection and opens the dialog from the workspace menu`; the focused Phase 13 E2E run passed. | The test clicks the real `Test connection` button, observes the FlashQuery stub `/mcp/info` probe, and verifies the success message. |
| open vault | pass | `e2e/flashquery-happy-path.spec.ts` T-E-001 creates/opens a FlashQuery vault panel; `e2e/flashquery-vault-browse.spec.ts` T-E-002 opens the sidebar vault view. | Covered by current E2E specs and prior green logs. |
| browse docs | pass | `e2e/flashquery-vault-browse.spec.ts` T-E-002 covers vault entries, folders, refresh, empty vault, and multi-level browsing. | Phase 12 final E2E log is supporting evidence until Phase 13 final matrix refreshes it. |
| edit/save | pass | `e2e/flashquery-happy-path.spec.ts` T-E-001 edits `Welcome.md`, saves through the Cate editor path, verifies the stub document body, closes, reopens, and sees saved content. | This is direct automation for the FlashQuery vault editor save path. |
| disconnect/retry | pass | `e2e/flashquery-disconnect.spec.ts` T-E-003 forces disconnect state, shows the `Disconnected` chip, and recovers through retry. | Status-chip visuals are separately covered by T-A-008 focused captures. |
| restart | pass | `e2e/flashquery-persistence.spec.ts` T-E-004 restarts the app, restores the workspace connection without writing the token, opens the vault panel, and sees `Welcome`. | Covers persistence across restart and no eager info probe. |
| command palette "New FlashQuery Vault" | pass | `e2e/flashquery-happy-path.spec.ts` T-E-001 uses the command palette text `New FlashQuery Vault` before opening the vault workflow. | Also supported by Phase 11 REQ-015 verification. |
| workspace menu connection action | pass | `e2e/flashquery-happy-path.spec.ts` now includes `T-A-010 tests FlashQuery connection and opens the dialog from the workspace menu`; the focused Phase 13 E2E run passed. | The test right-clicks the workspace row, selects the native `FlashQuery Connection...` menu action via the E2E context-menu bridge, and verifies the dialog opens for the selected workspace. |

## Canonical E2E Traceability

| Canonical ID | Spec | T-A-010 rows supported | Verdict |
| --- | --- | --- | --- |
| T-E-001 | `e2e/flashquery-happy-path.spec.ts` | connect, open vault, edit/save, command palette "New FlashQuery Vault" | pass |
| T-E-002 | `e2e/flashquery-vault-browse.spec.ts` | open vault, browse docs | pass |
| T-E-003 | `e2e/flashquery-disconnect.spec.ts` | disconnect/retry | pass |
| T-E-004 | `e2e/flashquery-persistence.spec.ts` | restart | pass |
| T-E-005 | `e2e/fixtures/flashquery-server.spec.ts` | acceptance-supporting stub server lifecycle for connect, browse docs, edit/save, disconnect/retry, and restart specs | pass |

The former manual-only acceptance notes for the Test button and workspace menu connection action are now backed by focused E2E coverage in `e2e/flashquery-happy-path.spec.ts`.

## T-A-008 Visual Evidence Note

T-A-008 status-chip acceptance is backed by the current Phase 12 focused captures:

- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/flashquery-status-chip-live-dark.png`
- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/flashquery-status-chip-live-light.png`
- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/flashquery-status-chip-connecting-dark.png`
- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/flashquery-status-chip-connecting-light.png`
- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/flashquery-status-chip-disconnected-dark.png`
- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/flashquery-status-chip-disconnected-light.png`

The deterministic visual-status listener is E2E-only: commit `2d7a5cd` gates it behind `window.electronAPI.isE2E`, and `src/renderer/panels/FlashQueryVaultPanel.tsx` returns before registering `cate:e2e-flashquery-status` outside E2E.

## Phase 12 Gap-Fix Baseline

Commit `a8b21fe` closed the Phase 12 upstream-value evidence gaps by strengthening `e2e/flashquery-visual-evidence.spec.ts`, adding focused status-chip screenshots for T-A-008 in live, connecting, and disconnected states across light/dark themes, and updating Phase 12 verification coverage.

Commit `2d7a5cd` keeps the deterministic status-chip visual helper gated behind `window.electronAPI.isE2E`; it is not a production renderer event API.

Commit `6f74e44` corrected the T-M-003 file-exclusion evidence citation: file exclusions are read main-side through `getSettingSync('fileExclusions')` and honored by filesystem explorer/search/watch paths.

REQ-003 and T-M-005 are accepted through static/headless smoke evidence. T-M-001, T-M-002, T-M-003, and T-M-005 remain labeled as static/headless smoke evidence; Phase 13 does not relabel those rows as observed manual UI smoke.

## Focused Phase 13 Acceptance Run

Command: `npm run test:e2e -- e2e/flashquery-happy-path.spec.ts e2e/flashquery-visual-evidence.spec.ts`

Result: passed, 4 tests passed.

This run includes the new `T-A-010 tests FlashQuery connection and opens the dialog from the workspace menu` test, plus the existing FlashQuery command-palette, editor save/open-on-canvas, and visual-evidence tests.

## Current Acceptance Gaps

No release-readiness blocker is recorded from Plan 13.1. All T-A-010 rows now have observed automated or focused E2E evidence.
