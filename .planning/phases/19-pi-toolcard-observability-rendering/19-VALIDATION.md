---
phase: 19
slug: pi-toolcard-observability-rendering
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
validated: 2026-06-04T17:45:47Z
---

# Phase 19 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest component tests + Playwright Electron E2E |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/agent/renderer/ChatThread.test.tsx` |
| **Full suite command** | `npm test -- src/agent/renderer/ChatThread.test.tsx && npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts && npm run typecheck` |
| **Estimated runtime** | ~180 seconds |

---

## Sampling Rate

- **After every task commit:** Run the most focused command for files changed by that task.
- **After every plan wave:** Run `npm test -- src/agent/renderer/ChatThread.test.tsx && npm run typecheck`.
- **Before `$gsd-verify-work`:** Run `npm test -- src/agent/renderer/ChatThread.test.tsx && npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts && npm run typecheck`, unless local Electron/E2E state blocks the E2E run; record any skipped portion in UAT/summary.
- **Max feedback latency:** 180 seconds for the targeted automated set.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 0 | REQ-017 / T-U-019 | - | No credential-bearing diagnostics are rendered; renderer consumes sanitized Phase 18 details only | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | ✅ | ✅ green |
| 19-01-02 | 01 | 1 | REQ-017 / T-U-019 | - | `call_model` summary/details omit unavailable values and avoid fabricated progress | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | ✅ | ✅ green |
| 19-02-01 | 02 | 2 | REQ-017 / T-E-006 | - | Mocked E2E verifies existing ToolCard path, collapsed/expanded diagnostics, generic fallback, and no new message type | e2e | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | ✅ | ✅ green |
| 19-02-M | 02 | 2 | REQ-017 / T-M-003 | - | Accepted deterministic substitute records `call_model` refs, diagnostics, messages payload, tokens, latency, and server-side tool-loop evidence | e2e/UAT | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` plus `19-UAT.md` | ✅ | ✅ accepted |

*Status: ⬜ pending / ✅ green / ❌ red / ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing Vitest infrastructure covers renderer component tests.
- [x] Existing Playwright Electron E2E infrastructure covers mocked Pi diagnostics events.
- [x] `src/agent/renderer/ChatThread.test.tsx` - focused `T-U-019` coverage exists and passed in the 2026-06-04 validation audit.

---

## Accepted Simulated Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live host-model `call_model` diagnostics with document references | REQ-017 / T-M-003 | Owner accepted deterministic substitute evidence for milestone closeout on 2026-06-06 | Optional live follow-up may invoke `call_model` through a configured Pi provider against real FlashQuery with document refs; milestone closeout uses `e2e/flashquery-pi-diagnostics.spec.ts`. |

**Manual status:** accepted simulated. `19-UAT.md` records owner acceptance of deterministic substitute evidence for T-M-003. Live provider/runtime evidence remains optional follow-up.

---

## Post-Execution Audit Evidence

**Audited:** 2026-06-04T17:45:47Z

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| T-U-019 component behavior | `npm test -- src/agent/renderer/ChatThread.test.tsx` | Vitest reported 1 file passed, 6 tests passed. | ✅ green |
| T-E-006 mocked Electron behavior | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | Playwright Electron reported 1 passed test. | ✅ green |
| TypeScript validation | `npm run typecheck` | `tsc --noEmit` exited 0. | ✅ green |
| T-M-003 simulated/manual behavior | `19-UAT.md` accepted substitute record | Owner accepted deterministic substitute evidence on 2026-06-06. | ✅ accepted |

---

## Validation Sign-Off

- [x] All automated tasks have passing behavioral verification.
- [x] `T-M-003` has accepted deterministic substitute evidence; live verification is optional follow-up.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers missing test-file references.
- [x] No watch-mode flags.
- [x] Feedback latency target < 180s for focused automated set.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved - automated validation green; `T-M-003` deterministic substitute accepted for milestone closeout.
