---
phase: 11
slug: renderer-behavior-audit
status: passed
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-01
updated: 2026-06-01
---

# Phase 11 - Validation Strategy

> Nyquist validation plan for the renderer-behavior audit. Downstream agents must read the upstream-sync requirements and test plan before executing any task.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.60.0 |
| **Config files** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/renderer/stores/appStore.test.ts src/renderer/panels/EditorPanel.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx src/renderer/lib/e2eHarnessGate.test.ts` |
| **Full phase gate** | `npm run build && npm run typecheck && npm test && npm run test:e2e` |

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Ref | Automated Command | Status |
|---------|------|-------------|----------|-------------------|--------|
| 11.1.1 | 11.1 | REQ-003, REQ-012 | T-U-010 | `npm test -- src/renderer/stores/appStore.test.ts src/renderer/panels/registry.test.ts && npm run typecheck` | passed |
| 11.1.2 | 11.1 | REQ-011, REQ-014, REQ-015 | T-U-011, T-U-012, T-U-015, T-U-017 | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/VaultBadge.test.tsx src/renderer/sidebar/WorkspaceTab.test.tsx && npm run test:e2e -- e2e/flashquery-happy-path.spec.ts` | passed |
| 11.1.3 | 11.1 | REQ-007, REQ-013, REQ-016 | T-U-006, T-U-013, T-U-014, T-U-016 | `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx src/shared/flashqueryUri.test.ts src/main/flashquery/uri.test.ts` | passed |
| 11.2.1 | 11.2 | REQ-017 | T-E-005 | `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | passed |
| 11.2.2 | 11.2 | REQ-011, REQ-013, REQ-016, REQ-017 | T-E-001..T-E-004 | `npm run test:e2e -- e2e/flashquery-happy-path.spec.ts e2e/flashquery-vault-browse.spec.ts e2e/flashquery-disconnect.spec.ts e2e/flashquery-persistence.spec.ts` | passed |
| 11.2.3 | 11.2 | REQ-017, REQ-019 | T-U-007, T-A-012, T-E-001..T-E-005 | `npm test -- src/renderer/lib/e2eHarnessGate.test.ts src/renderer/lib/e2eHarness.test.tsx && rg -n "T-E-001|T-E-002|T-E-003|T-E-004|T-E-005|installE2EHarnessIfEnabled|CATE_E2E|createFlashQueryVault|retryFlashQuery" e2e src/renderer/App.tsx src/renderer/lib/e2eHarnessGate.ts src/renderer/lib/e2eHarness.ts .planning/phases/08-upstream-sync-v1-1-0/evidence/renderer .planning/phases/10-shared-contracts-audit/evidence/final/NOTES.md` | passed |
| 11.3.1 | 11.3 | REQ-019, REQ-025 | T-A-012, T-A-002 | `rg -n "appStore.ts|EditorPanel.tsx|Sidebar.tsx|DockTabBar.tsx|CommandPalette.tsx|e2e/fixtures/electron-app.ts|T-A-012" .planning/phases/08-upstream-sync-v1-1-0 .planning/phases/11-renderer-behavior-audit` | passed |
| 11.3.2 | 11.3 | REQ-024, REQ-025 | T-A-002 | `npm run build && npm run typecheck && npm test && npm run test:e2e` | passed |
| 11.3.3 | 11.3 | REQ-003, REQ-007, REQ-011..REQ-017, REQ-019, REQ-024, REQ-025 | all in scope | `rg -n "REQ-003|REQ-007|REQ-011|REQ-017|T-U-010|T-U-017|T-E-001|T-E-005|T-A-012" .planning/phases/11-renderer-behavior-audit` | passed |

## Wave 0 Requirements

Existing infrastructure covers all Phase 11 requirements. No Wave 0 scaffolding is required unless the audit finds a missing test file for a required renderer surface.

## Validation Sign-Off

- [x] Every task has automated or artifact-audit verification.
- [x] Every in-scope requirement maps to at least one test or evidence gate.
- [x] Downstream agents are instructed to read the upstream-sync requirements and test plan first.
- [x] No watch-mode commands are specified.
- [x] `nyquist_compliant: true` set in frontmatter.
