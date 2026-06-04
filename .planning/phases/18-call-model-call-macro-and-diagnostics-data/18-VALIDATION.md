---
phase: 18
slug: call-model-call-macro-and-diagnostics-data
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-04
---

# Phase 18 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4; Playwright 1.60.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts` |
| **Full suite command** | `npm run typecheck && npm test && npm run test:e2e` |
| **Estimated runtime** | Focused unit: ~10-30 seconds; focused E2E/build evidence: several minutes |

Final evidence should run under Node 20 or Node 22. The planning shell reported Node 24.7.0, which is outside Cate's supported `>=20 <23` engine range.

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest command for the changed area.
- **After every plan wave:** Run `npm run typecheck` plus all focused Phase 18 unit tests.
- **Before `$gsd-verify-work`:** Run focused Phase 18 tests, `npm run typecheck`, and practical E2E evidence; record unavailable live manual checks in `18-UAT.md`.
- **Max feedback latency:** Keep focused unit feedback under 60 seconds where possible.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 18-01-01 | 01 | 1 | REQ-015 | T18-token-leak / T18-stale-workspace | `call_model` wrapper keeps workspace credentials out of renderer and current tool details | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | yes, extend | pending |
| 18-01-02 | 01 | 1 | REQ-015 | T18-trace-spoofing / T18-ref-confusion | `trace_id` uses required format and unresolved refs block before model dispatch | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | yes, extend | pending |
| 18-01-03 | 01 | 1 | REQ-015 | T18-fabricated-progress | `call_model` sends `return_messages: true`, preserves diagnostics, and does not emit synthetic live progress | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | yes, extend | pending |
| 18-02-01 | 02 | 1 | REQ-016 | T18-inline-macro-exec | Inline `source` requires confirmation and `source_ref` executes without confirmation | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | yes, extend | pending |
| 18-02-02 | 02 | 1 | REQ-016 | T18-progress-spoofing | Macro defaults `interactive: true`, `progress: 'milestones'`, filters progress by token, and forwards latest real progress only | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | yes, extend | pending |
| 18-02-03 | 02 | 1 | REQ-016 | T18-error-misclassification | `needs_user_input` remains a tool-result envelope and disconnected state returns `FlashQuery is not connected.` | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | yes, extend | pending |
| 18-03-01 | 03 | 2 | REQ-015, REQ-016, REQ-017 | T18-diagnostics-loss | `agentStore` preserves structured FlashQuery details without breaking text extraction or subagent details | unit/component | `npm test -- src/agent/renderer/agentStore.test.ts src/agent/main/sessionFiles.test.ts` | no, Wave 0 likely | pending |
| 18-03-02 | 03 | 2 | REQ-015, REQ-016, REQ-017 | T18-regression | Mocked Pi diagnostics events preserve final and partial details for later Phase 19 ToolCards | e2e | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | no, Wave 0 likely | pending |

---

## Wave 0 Requirements

- [ ] `src/agent/renderer/agentStore.test.ts` - add or extend tests for `T-U-018`.
- [ ] `src/agent/main/sessionFiles.test.ts` - add or extend transcript replay tests if session replay currently drops structured FlashQuery details.
- [ ] `e2e/flashquery-pi-diagnostics.spec.ts` - mocked `T-E-006` evidence for diagnostic event preservation without implementing Phase 19 rendering.
- [ ] `e2e/fixtures/flashquery-server.ts` - add deterministic `call_model`, `call_macro`, progress, diagnostics, and disconnected fixture behavior if E2E uses real agent startup.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real progress-emitting macro path | REQ-016 / T-M-002 | Requires live FlashQuery macro runtime and Pi provider credentials | Execute a real macro that emits progress; verify only latest real progress message is shown live, final trace is preserved, `needs_user_input` is relayed, and disconnected state returns `FlashQuery is not connected.` |
| Host-model `call_model` invocation with refs | REQ-015 / T-M-003 | Host-model tool choice and live model/provider diagnostics are not fully deterministic in unit tests | Invoke `call_model` through Pi with document refs; verify purpose/model resolution, injected refs, messages payload, cost/tokens/latency, and server-side FQ tool loop diagnostics are preserved. |

If credentials or live endpoints are unavailable, record blockers and substitute automated evidence in `18-UAT.md`, following the Phase 17 `17-UAT.md` pattern.

---

## Validation Sign-Off

- [ ] All tasks have automated verify commands or Wave 0 dependencies.
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify.
- [ ] Wave 0 covers all missing references.
- [ ] No watch-mode flags.
- [ ] Feedback latency target documented.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** pending
