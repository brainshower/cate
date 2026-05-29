---
phase: 7
slug: cross-cutting-regression
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-05-29
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 and Playwright 1.60.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/Chip.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` |
| **Full suite command** | `npm run typecheck && npm test && npm run test:e2e` |
| **Estimated runtime** | Full suite runtime depends on Electron E2E; focused E2E specs should be run after each E2E task |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest or Playwright spec touched by that task.
- **After every plan wave:** Run `npm run test:e2e -- e2e/flashquery-*.spec.ts` plus existing regression specs when they exist.
- **Before `$gsd-verify-work`:** `npm run typecheck && npm test && npm run test:e2e` must be green under Node 20/22.
- **Max feedback latency:** Keep task-level feedback to the smallest relevant spec; do not wait until the phase gate to run Playwright.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | REQ-043 | T-07-AUTH / — | Existing regression tests are not weakened or removed | e2e | `npm run test:e2e -- e2e/smoke.spec.ts e2e/drag-detach.spec.ts e2e/drag-move.spec.ts e2e/drag-canvas-into-canvas.spec.ts e2e/drag-split.spec.ts` | yes | pending |
| 07-02-01 | 02 | 2 | REQ-044 | T-07-AUTH / — | E2E state reuse does not expose production-only userData overrides | e2e | `npm run test:e2e -- e2e/flashquery-persistence.spec.ts` | no, Wave 0 | pending |
| 07-02-02 | 02 | 2 | REQ-044 | T-07-AUTH / — | `/mcp/info` probe omits bearer auth and lazy probe is observable after restart; stub list/read/write behavior is smoke-tested | unit/e2e | `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts && npm run test:e2e -- e2e/flashquery-persistence.spec.ts e2e/fixtures/flashquery-server.test.ts` | partial | pending |
| 07-02-03 | 02 | 2 | REQ-043, REQ-044 | T-07-STUB / — | Stub resets documents and request counters between tests | e2e | `npm run test:e2e -- e2e/flashquery-happy-path.spec.ts e2e/flashquery-disconnect.spec.ts e2e/flashquery-vault-browse.spec.ts` | no, Wave 0 | pending |
| 07-03-01 | 03 | 3 | REQ-045 | T-07-TOKEN / — | UI code continues to avoid forbidden stock neutral color classes | unit/manual | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/Chip.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` | yes | pending |
| 07-03-02 | 03 | 3 | REQ-045 | T-07-MANUAL / — | Manual evidence is durable and traceable to T-M-001..007 | manual | Review `.planning/phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` | no, Wave 0 | pending |
| 07-03-03 | 03 | 3 | REQ-043, REQ-044, REQ-045 | T-07-FINAL / — | Final verification covers typecheck, unit, E2E, and manual evidence after focused task-level checks provide fast feedback | full | `npm run typecheck && npm test && npm run test:e2e` | yes | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [ ] `e2e/fixtures/flashquery-server.ts` — local FlashQuery HTTP MCP stub for T-E-006..011.
- [ ] E2E restart-state support, likely `launchApp({ userDataDir })` plus a `CATE_E2E_USER_DATA_DIR` main-process hook.
- [ ] `e2e/flashquery-persistence.spec.ts` — T-E-006/T-E-007.
- [ ] `e2e/flashquery-happy-path.spec.ts` — T-E-008/T-E-009.
- [ ] `e2e/flashquery-disconnect.spec.ts` — T-E-010.
- [ ] `e2e/flashquery-vault-browse.spec.ts` — T-E-011.
- [ ] `.planning/phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` — T-M-001..007 durable evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| T-M-001 design-token code review | REQ-045 | Code/token review is required by the test plan | Confirm vault panel, chip, dialog, and vault badge use Cate semantic token classes and no forbidden neutral stock colors. |
| T-M-002 vault panel populated visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare the running populated vault panel against `Designs/FQ Vault Panel/FlashQuery Vault Panel — Populated.pdf`. |
| T-M-003 vault panel state visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare no-connection, connecting, disconnected, and empty-vault states against `Designs/FQ Vault Panel States/`. |
| T-M-004 connection chip visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare connecting/live/disconnected chip states against `Designs/FQ Connection status/`. |
| T-M-005 settings dialog visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare connection settings dialog passed and failed states against `Designs/Connection settings dialog/`. |
| T-M-006 workspace context menu positioning | REQ-045 | Native OS menu visual cannot be reliably snapshot-tested | Verify the FlashQuery Connection entry appears in the UI Spec position. |
| T-M-007 editor vault badge visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare editor with vault doc loaded against `Designs/Editor panel/`, excluding the known `rev 42` drift. |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency minimized by focused Vitest/Playwright commands
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
