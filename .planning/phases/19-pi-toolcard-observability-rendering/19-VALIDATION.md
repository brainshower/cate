---
phase: 19
slug: pi-toolcard-observability-rendering
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
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
| 19-01-01 | 01 | 0 | REQ-017 / T-U-019 | - | No credential-bearing diagnostics are rendered; renderer consumes sanitized Phase 18 details only | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | ❌ W0 | ⬜ pending |
| 19-01-02 | 01 | 1 | REQ-017 / T-U-019 | - | `call_model` summary/details omit unavailable values and avoid fabricated progress | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | ❌ W0 | ⬜ pending |
| 19-02-01 | 02 | 2 | REQ-017 / T-E-006 / T-M-003 | - | Mocked E2E verifies existing ToolCard path and no new message type; manual evidence records live `call_model` limits | e2e/manual | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending / ✅ green / ❌ red / ⚠️ flaky*

---

## Wave 0 Requirements

- [x] Existing Vitest infrastructure covers renderer component tests.
- [x] Existing Playwright Electron E2E infrastructure covers mocked Pi diagnostics events.
- [ ] `src/agent/renderer/ChatThread.test.tsx` - add focused `T-U-019` coverage before or with ToolCard rendering changes.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live host-model `call_model` diagnostics with document references | REQ-017 / T-M-003 | Host-model tool choice, provider credentials, live FlashQuery runtime, and exact live envelope keys are not fully deterministic in mocked automated tests | Invoke `call_model` through a configured Pi provider against real FlashQuery with document refs; verify purpose/model resolution, injected refs, messages payload, cost/tokens/latency, and server-side FlashQuery tool-loop diagnostics; record unavailable credentials/runtime as a manual blocker. |

---

## Validation Sign-Off

- [x] All tasks have automated verification or explicit manual evidence.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers missing test-file references.
- [x] No watch-mode flags.
- [x] Feedback latency target < 180s for focused automated set.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
