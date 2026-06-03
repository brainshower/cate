---
phase: 15
slug: editor-refresh-and-frontmatter-panels
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
updated: 2026-06-03
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest, Playwright/Electron |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/shared/flashqueryUri.test.ts src/renderer/stores/appStore.test.ts src/renderer/docking/DockTabBar.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/lib/flashqueryFrontmatter.test.ts src/renderer/dialogs/FlashQueryRefreshConfirmDialog.test.tsx src/renderer/panels/EditorPanel.test.tsx` |
| **Full suite command** | `npm run build && npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts && npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts && npm run test:e2e -- e2e/flashquery-happy-path.spec.ts && npm run typecheck` |
| **Estimated runtime** | ~2-4 minutes |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest command for files changed by that task.
- **After every plan wave:** Run the plan verification command from the PLAN.md file plus `npm run typecheck`.
- **Before `$gsd-verify-work`:** Targeted Vitest, Playwright/Electron, build, and typecheck must be green.
- **Max feedback latency:** Under 5 minutes for the targeted Phase 15 suite.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 15.1.1 | 15.1 | 1 | REQ-005, REQ-006 | URI/model collision | Frontmatter panel uses a distinct `?part=frontmatter` URI and does not duplicate existing panels. | unit | `npm test -- src/renderer/stores/appStore.test.ts` | yes | green |
| 15.1.2 | 15.1 | 1 | REQ-005 | Non-body tab regression | `Open frontmatter` appears only for FlashQuery body editor tabs. | component | `npm test -- src/renderer/docking/DockTabBar.test.tsx` | yes | green |
| 15.1.3 | 15.1 | 1 | REQ-005 | Vault open regression | Vault tree context menu opens frontmatter while double-click continues opening body. | component | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx` | yes | green |
| 15.2.1 | 15.2 | 2 | REQ-007 | Invalid YAML write | Non-object YAML is rejected and managed fields are filtered before writeback. | unit | `npm test -- src/renderer/lib/flashqueryFrontmatter.test.ts` | yes | green |
| 15.2.2 | 15.2 | 2 | REQ-006, REQ-007 | Body/frontmatter state bleed | Body and frontmatter load/save paths use independent include arrays, payloads, models, and dirty state. | component | `npm test -- src/renderer/panels/EditorPanel.test.tsx` | yes | green |
| 15.2.3 | 15.2 | 2 | REQ-001, REQ-002, REQ-003 | Refresh data loss | Dirty and failed refresh paths preserve user content unless explicitly saved or discarded. | component | `npm test -- src/renderer/dialogs/FlashQueryRefreshConfirmDialog.test.tsx src/renderer/panels/EditorPanel.test.tsx` | yes | green |
| 15.3.1 | 15.3 | 3 | REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007 | Fixture false positive | Fixture records get/write args and preserves body/frontmatter independence. | e2e fixture | `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | yes | green |
| 15.3.2 | 15.3 | 3 | REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007 | User workflow regression | Electron tests prove refresh and frontmatter workflows through the UI. | e2e | `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts` | yes | green |
| 15.3.3 | 15.3 | 3 | REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007 | Traceability gap | Required test IDs are present and targeted suites/typecheck pass. | traceability | `rg -n "T-U-001|T-U-007|T-U-008|T-U-009|T-E-001|T-E-002" src e2e && npm run typecheck` | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

---

## Manual-Only Verifications

All Phase 15 behaviors have automated verification through Vitest component tests and Playwright/Electron user-flow tests.

---

## Validation Audit 2026-06-03

| Metric | Count |
|--------|-------|
| Requirements audited | 6 |
| Covered by automated tests | 6 |
| Partial gaps | 0 |
| Missing gaps | 0 |
| Manual-only | 0 |

## Validation Sign-Off

- [x] All tasks have automated verify commands or existing infrastructure.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency < 5 minutes for the targeted suite.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-03
