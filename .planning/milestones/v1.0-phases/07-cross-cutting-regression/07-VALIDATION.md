---
phase: 7
slug: cross-cutting-regression
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
updated: 2026-05-30
audit_source: post-execution-update
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Original draft created 2026-05-29 during planning. Updated 2026-05-30 during milestone v1.0 audit to reflect post-execution state: all Wave 0 items shipped, all per-task statuses transitioned `pending → green`, and the post-milestone gap-fix work (Gaps 6-11) recorded in the audit trail.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 and Playwright 1.60.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npx -p node@22 npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/Chip.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx src/renderer/components/VaultBadge.test.tsx src/renderer/panels/EditorPanel.test.tsx` |
| **Quick E2E command** | `npx -p node@22 npm run test:e2e -- e2e/flashquery-*.spec.ts e2e/fixtures/flashquery-server.spec.ts` |
| **Full suite command** | `npx -p node@22 npm run typecheck && npx -p node@22 npm test && npx -p node@22 npm run test:e2e` |
| **Estimated runtime** | ~7 s focused Vitest / ~90 s focused E2E group / multi-minute full suite under Electron |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest or Playwright spec touched by that task.
- **After every plan wave:** Run `npm run test:e2e -- e2e/flashquery-*.spec.ts` plus existing regression specs.
- **Before `/gsd:verify-work`:** `npm run typecheck && npm test && npm run test:e2e` must be green under Node 22.
- **Max feedback latency:** Keep task-level feedback to the smallest relevant spec; do not wait until the phase gate to run Playwright.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | REQ-043 | T-07-AUTH / — | Existing regression tests are not weakened or removed; existing smoke + drag suite passes | e2e | `npx -p node@22 npm run test:e2e -- e2e/smoke.spec.ts e2e/drag-detach.spec.ts e2e/drag-move.spec.ts e2e/drag-canvas-into-canvas.spec.ts e2e/drag-split.spec.ts` | ✅ | ✅ green (16 passed / 2 pre-existing skips) |
| 07-02-01 | 02 | 2 | REQ-044 | T-07-STUB / — | Strict FlashQuery stub exists before persistence or workflow specs depend on request counters, list/read/write, empty-vault, nested folders, and availability toggles | e2e | `npx -p node@22 npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | ✅ | ✅ green |
| 07-02-02 | 02 | 2 | REQ-044 | T-07-AUTH / — | E2E state reuse does not expose production-only userData overrides; lazy probe is observable after restart using the Task 1 stub | unit/e2e | `npx -p node@22 npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts && npx -p node@22 npm run test:e2e -- e2e/flashquery-persistence.spec.ts` | ✅ | ✅ green (58 unit tests + persistence spec) |
| 07-02-03 | 02 | 2 | REQ-043, REQ-044 | T-07-STUB / — | Stub resets documents and request counters between tests; happy-path / disconnect / vault-browse specs cover full workflow | e2e | `npx -p node@22 npm run test:e2e -- e2e/flashquery-happy-path.spec.ts e2e/flashquery-disconnect.spec.ts e2e/flashquery-vault-browse.spec.ts` | ✅ | ✅ green |
| 07-03-01 | 03 | 3 | REQ-045 | T-07-TOKEN / — | UI code continues to avoid forbidden stock neutral color classes; vault badge keeps `Vault · <host>` and EditorPanel T-I-094/T-I-096 coverage from Phase 6 gap fixes | unit/manual | `npx -p node@22 npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/Chip.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx src/renderer/components/VaultBadge.test.tsx src/renderer/panels/EditorPanel.test.tsx` | ✅ | ✅ green (5 files, 73 tests) |
| 07-03-02 | 03 | 3 | REQ-045 | T-07-MANUAL / — | Manual evidence is durable and traceable to T-M-001..007 in `07-DESIGN-CHECKS.md` | manual | Review `.planning/phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` | ✅ | ✅ recorded (T-M-001 PASS; T-M-002..007 MANUAL-DEFERRED per Debt-02) |
| 07-03-03 | 03 | 3 | REQ-045 | T-07-MANUAL / — | T-M-001..007 are executed in the running app and recorded with result, evidence, reviewer, date | manual | See `07-03-PLAN.md` Task 3 evidence gate before completion | ✅ | ✅ recorded (T-M-001 PASS; T-M-002..007 MANUAL-DEFERRED per [[debt-02]]) |
| 07-03-04 | 03 | 3 | REQ-043, REQ-044, REQ-045 | T-07-FINAL / — | Final verification covers typecheck, unit, E2E, and completed manual evidence after focused task-level checks | full | `npx -p node@22 npm run typecheck && npx -p node@22 npm test && npx -p node@22 npm run test:e2e` | ✅ | ✅ green per `07-VERIFICATION.md`: typecheck PASS; full unit 51 files 495 passed 3 skipped; full E2E 23 passed 2 skipped |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Last green run:** 2026-05-30 — quick vitest 5 files, 73 tests, 7.15 s. Full final-suite run recorded in `07-VERIFICATION.md:36-39` at original execution time (2026-05-30T03:04:30Z).

---

## Wave 0 Requirements

- [x] `e2e/fixtures/flashquery-server.ts` — local FlashQuery HTTP MCP stub for T-E-006..011 (created in commit `5718bd3`).
- [x] E2E restart-state support: `launchApp({ userDataDir })` at `e2e/fixtures/electron-app.ts:16,29` and `CATE_E2E_USER_DATA_DIR` main-process hook at `src/main/index.ts:1087-1091` (created in commit `f2c55b3`).
- [x] `e2e/flashquery-persistence.spec.ts` — T-E-006/T-E-007 (created in commit `b10755a`/`f2c55b3`).
- [x] `e2e/flashquery-happy-path.spec.ts` — T-E-008/T-E-009 (created in commit `530845a`/`4cefc30`).
- [x] `e2e/flashquery-disconnect.spec.ts` — T-E-010 (created in commit `530845a`/`4cefc30`).
- [x] `e2e/flashquery-vault-browse.spec.ts` — T-E-011 (created in commit `530845a`/`4cefc30`).
- [x] `.planning/phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` — T-M-001..007 durable evidence (created in commit `eaa688a`/`6297980`).

All Wave 0 items SHIPPED. `wave_0_complete: true`.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions | Last Result |
|----------|-------------|------------|-------------------|-------------|
| T-M-001 design-token code review | REQ-045 | Code/token review is required by the test plan | Confirm vault panel, chip, dialog, and vault badge use Cate semantic token classes and no forbidden neutral stock colors; fill `07-DESIGN-CHECKS.md` with result, evidence, reviewer, and date | **PASS** (2026-05-30, Codex executor; evidence in `07-DESIGN-CHECKS.md`) |
| T-M-002 vault panel populated visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare running populated vault panel against `Designs/FQ Vault Panel/FlashQuery Vault Panel — Populated.pdf`; fill `07-DESIGN-CHECKS.md` | **MANUAL-DEFERRED** per [[debt-02]] — behavior/token evidence exists, no screenshot/PDF comparison captured |
| T-M-003 vault panel state visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare 4 panel states against `Designs/FQ Vault Panel States/` | **MANUAL-DEFERRED** per [[debt-02]] |
| T-M-004 connection chip visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare connecting/live/disconnected chip states against `Designs/FQ Connection status/` | **MANUAL-DEFERRED** per [[debt-02]] |
| T-M-005 settings dialog visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare dialog passed and failed states against `Designs/Connection settings dialog/` | **MANUAL-DEFERRED** per [[debt-02]] |
| T-M-006 workspace context menu positioning | REQ-045 | Native OS menu cannot be reliably snapshot-tested | Verify FlashQuery Connection entry appears in UI Spec position | **MANUAL-DEFERRED** per [[debt-02]] (also OS-menu screenshot limitation) |
| T-M-007 editor vault badge visual fidelity | REQ-045 | No visual-regression infrastructure in v1 | Compare editor with vault doc against `Designs/Editor panel/`; exclude `rev 42` drift; expect `Vault · <host>` U+00B7 | **MANUAL-DEFERRED** per [[debt-02]] (de facto exercised in 2026-05-30 testing session which surfaced Gaps 9, 10, 11 — all RESOLVED in commits `a3829fb`, `8221e0b`, `7caa565`) |

**[[debt-02]] reference:** see `Gaps.md` (in flashquery-product) — "Phase 7 T-M-002 Through T-M-007 PDF-Level Visual-Fidelity Evidence" Deferred Debt entry. PDF-level visual-fidelity capture is deferred; behavior and token discipline are independently verified by automated tests.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references — all 7 Wave 0 items shipped
- [x] No watch-mode flags
- [x] Feedback latency minimized by focused Vitest/Playwright commands
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-30 (post-execution update during milestone v1.0 audit; all tasks transitioned `pending → green`, all Wave 0 items shipped, T-M-002..T-M-007 deferred per [[debt-02]])

---

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Gaps found | 0 (automated) — 6 manual T-M items deferred per [[debt-02]] |
| Resolved | 0 |
| Escalated | 0 |

**Notes:** Audit performed during milestone v1.0 close-out. Phase 7 was originally drafted with all Per-Task entries `pending` and `wave_0_complete: false` at planning time. By milestone close, all 7 Wave 0 artifacts shipped, all Per-Task entries went green, and final verification (`07-VERIFICATION.md`) recorded full-suite PASS. Post-milestone session (2026-05-30) discovered Gaps 6-11 via live testing — all RESOLVED on `main` in commits `9f4f3bd`, `6445909`, `9820189`, `a3829fb`, `8221e0b`, `7caa565`, plus a scope-expansion sidebar feature in `71659cd`. No automated remediation gaps remain.

### Post-Milestone Gap Closures (Reference)

The 2026-05-30 milestone close-out testing session uncovered Phase 7 Gaps 6-11 documented in `Gaps.md` (in flashquery-product). All resolved on `main`:

| Gap | Hash | Summary |
|-----|------|---------|
| 6   | `6445909` | Command Palette `New FlashQuery Vault` entry |
| 7   | `9820189` | Test Connection bearer validation (authenticated MCP handshake) |
| 8   | `9f4f3bd` | `pathUtils` `process` guard + URI passthrough |
| 9   | `a3829fb` | Vault editor tab close X stays inside pill |
| 10  | `8221e0b` | Vault editor tab filename remains visible |
| 11  | `7caa565` | Vault editor tab widened to 280 px |
| scope | `71659cd` | FlashQuery Vault as left-sidebar view (additive) |

These are post-milestone; they don't change Phase 7's Nyquist coverage of REQ-043, REQ-044, REQ-045.
