---
phase: 19
slug: pi-toolcard-observability-rendering
status: partial
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
| 19-02-M | 02 | 2 | REQ-017 / T-M-003 | - | Manual evidence records live `call_model` expectations and exact unavailable prerequisites | manual | See `19-UAT.md` manual procedure | ✅ | ⬜ blocked/manual |

*Status: ⬜ pending / ✅ green / ❌ red / ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing Vitest infrastructure covers renderer component tests.
- [x] Existing Playwright Electron E2E infrastructure covers mocked Pi diagnostics events.
- [x] `src/agent/renderer/ChatThread.test.tsx` - focused `T-U-019` coverage exists and passed in the 2026-06-04 validation audit.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live host-model `call_model` diagnostics with document references | REQ-017 / T-M-003 | Host-model tool choice, provider credentials, live FlashQuery runtime, and exact live envelope keys are not fully deterministic in mocked automated tests | Invoke `call_model` through a configured Pi provider against real FlashQuery with document refs; verify purpose/model resolution, injected refs, messages payload, cost/tokens/latency, and server-side FlashQuery tool-loop diagnostics; record unavailable credentials/runtime as a manual blocker. |

**Manual status:** blocked/pending. `19-UAT.md` records that live `call_model` observability was not executed because this environment lacks confirmed native Pi provider credentials, a confirmed live FlashQuery runtime, and a confirmed document-reference fixture path. Do not mark `T-M-003` passed until that live run is completed.

---

## Post-Execution Audit Evidence

**Audited:** 2026-06-04T17:45:47Z

| Check | Command | Result | Status |
|-------|---------|--------|--------|
| T-U-019 component behavior | `npm test -- src/agent/renderer/ChatThread.test.tsx` | Vitest reported 1 file passed, 6 tests passed. | ✅ green |
| T-E-006 mocked Electron behavior | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | Playwright Electron reported 1 passed test. | ✅ green |
| TypeScript validation | `npm run typecheck` | `tsc --noEmit` exited 0. | ✅ green |
| T-M-003 live/manual behavior | `19-UAT.md` manual procedure | Blocked/pending due unavailable live provider/runtime/document-reference prerequisites. | ⬜ blocked/manual |

---

## Validation Sign-Off

- [x] All automated tasks have passing behavioral verification.
- [x] Manual-only `T-M-003` has explicit procedure and blocker evidence; live verification remains pending.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers missing test-file references.
- [x] No watch-mode flags.
- [x] Feedback latency target < 180s for focused automated set.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** partial - automated validation green; `T-M-003` live manual check blocked/pending.
