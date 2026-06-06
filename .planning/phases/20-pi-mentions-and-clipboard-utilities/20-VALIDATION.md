---
phase: 20
slug: pi-mentions-and-clipboard-utilities
status: complete-with-live-macro-blocker
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
updated: 2026-06-06T13:29:59Z
---

# Phase 20 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 and Playwright 1.60.0 |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/renderer/agentStore.test.ts src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` |
| **Full suite command** | `npm run typecheck && npm test && npm run test:e2e` |
| **Native clipboard command** | `npm run test:e2e -- e2e/flashquery-native-clipboard.spec.ts` |
| **Macro/model companion command** | `npm run test:e2e -- e2e/flashquery-pi-macro-trace.spec.ts e2e/flashquery-pi-diagnostics.spec.ts` |
| **Estimated runtime** | Focused tests ~60-180 seconds; E2E depends on Electron build freshness |

**Environment caveat:** local research found Node `v24.7.0`, while Cate requires `>=20 <23`. Executors should switch to Node 20 or 22 before relying on npm validation results.

---

## Sampling Rate

- **After every task commit:** Run the focused test command for the edited surface.
- **After every plan wave:** Run `npm run typecheck` plus all changed test files.
- **Before `$gsd-verify-work`:** Run focused Phase 20 E2E plus typecheck. Run the full suite if supported Node is active and local runtime allows it.
- **Max feedback latency:** 180 seconds for focused unit/component feedback.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 20-01-01 | 01 | 1 | REQ-018 | cross-workspace-cache | Cache clears/replaces per workspace and discards stale fetches | unit | `npm test -- src/agent/renderer/agentStore.test.ts` | yes, additions needed | pending |
| 20-01-02 | 01 | 1 | REQ-018 | token-boundary | Renderer fetches through preload IPC only | unit | `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/agent/renderer/agentStore.test.ts` | yes | pending |
| 20-02-01 | 02 | 2 | REQ-018 | ui-integrity | `@` mention inserts literal refs and adds no chips/footer UI | component | `npm test -- src/agent/renderer/AgentChatInput.atMention.test.tsx` | no, Wave 0 | pending |
| 20-02-02 | 02 | 2 | REQ-018 | stale-workspace-ui | E2E proves workspace-switch replacement and disconnect clearing | E2E | `npm run test:e2e -- e2e/flashquery-pi-mentions.spec.ts` | no, Wave 0 | pending |
| 20-03-01 | 03 | 1 | REQ-019 | clipboard-integrity | Vault tree and editor title copy only forward-slash paths and whole-document refs | component | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` | yes, additions needed | pending |
| 20-03-02 | 03 | 2 | REQ-019 | clipboard-integrity | Search row copy behavior remains intact | component/E2E | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx && npm run test:e2e -- e2e/flashquery-vault-search.spec.ts` | yes | pending |
| 20-04-01 | 04 | 3 | REQ-019 | native-clipboard | Vault tree, search row, and editor title actions write exact whole-document path/reference values to Electron's native clipboard | E2E | `npm run test:e2e -- e2e/flashquery-native-clipboard.spec.ts` | yes | green |

---

## Wave 0 Requirements

- [ ] `src/agent/renderer/AgentChatInput.atMention.test.tsx` - T-U-020 coverage for active `@` segment behavior, loading/matches/no literal behavior, filename filtering, sorting, keyboard handling, literal insertion, slash non-conflict, and no chips/footer UI.
- [ ] `src/agent/renderer/agentStore.test.ts` additions - renderer-side T-U-006 cache lifecycle, whole-response replacement, disconnect clearing, workspace switch clearing, and last-fetch-wins.
- [ ] `src/renderer/panels/FlashQueryVaultPanel.test.tsx` additions - T-U-012 vault tree `Copy vault path` and `Copy as reference`.
- [ ] `src/renderer/panels/EditorPanel.test.tsx` additions - T-U-012 editor title Clipboard action visibility and copy menu.
- [ ] `e2e/flashquery-pi-mentions.spec.ts` or equivalent - T-E-004 Pi chat mention insertion, workspace-switch cache replacement, disconnect cache clearing, and no extra footer UI.
- [x] `e2e/flashquery-native-clipboard.spec.ts` - T-M-004 native clipboard coverage for vault tree, search row, and editor title actions.
- [x] `.planning/phases/20-pi-mentions-and-clipboard-utilities/20-UAT.md` - T-M-004 automated native clipboard evidence.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live host-model macro progress, completed trace, `needs_user_input`, and disconnected macro behavior | REQ-016 / T-M-002 | Partially automated on 2026-06-06: deterministic E2E now preserves a real-shaped `needs_user_input` envelope and exact disconnected `call_macro` error rendering. The remaining live portion requires a real FlashQuery runtime, configured native Pi provider, host-model tool selection, and progress-emitting macro. | Run the live macro scenario from `20-UAT.md`; keep the live/provider remainder blocked until human/live evidence is recorded. |

## Validation Audit 2026-06-04

| Metric | Count |
|--------|-------|
| Native clipboard blockers automated | 1 |
| Live/manual blockers remaining | 1 |
| New E2E files added | 1 |

| Command | Result |
|---------|--------|
| `npm run test:e2e -- e2e/flashquery-native-clipboard.spec.ts` | passed: 1 Playwright Electron test |
| `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` | passed: 3 files, 72 tests |
| `npm run typecheck` | passed |

---

## Validation Re-Audit 2026-06-06

| Metric | Count |
|--------|-------|
| Partially automated blockers advanced | 1 |
| Live/provider blockers remaining | 1 |
| E2E files extended | 2 |

| Command | Result |
|---------|--------|
| `npm run test:e2e -- e2e/flashquery-pi-macro-trace.spec.ts e2e/flashquery-pi-diagnostics.spec.ts` | passed: 3 Playwright Electron tests |
| `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/renderer/ChatThread.test.tsx src/agent/renderer/agentStore.test.ts && npm run typecheck` | passed: 3 Vitest files, 33 tests; typecheck passed |

---

## Validation Sign-Off

- [x] All tasks have automated verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all missing references
- [x] No watch-mode flags
- [x] Feedback latency target documented
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved for `REQ-019` automated native clipboard coverage on 2026-06-04; deterministic `T-M-002` companion coverage approved on 2026-06-06; live macro/provider evidence remains blocked pending human/live evidence.
