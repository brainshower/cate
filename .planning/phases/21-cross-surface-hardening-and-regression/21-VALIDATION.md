---
phase: 21
slug: cross-surface-hardening-and-regression
status: complete-with-manual-blockers
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
updated: 2026-06-04T23:42:20Z
requirements: [REQ-020]
---

# Phase 21 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4, Playwright Electron |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts && npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx` |
| **Full suite command** | `npm run build && npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts && npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts && npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts e2e/flashquery-pi-diagnostics.spec.ts e2e/flashquery-pi-macro-trace.spec.ts && npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts && npm run typecheck` |
| **Final preflight command** | `npm run preflight` |
| **Estimated runtime** | Focused Vitest: under 30 seconds; focused Electron E2E: several minutes; full preflight: several minutes |

---

## Sampling Rate

- **After every task commit:** Run the task-specific focused Vitest or Playwright command from the owning plan.
- **After every plan wave:** Run the wave command plus `npm run typecheck`.
- **Before `$gsd-verify-work`:** Run focused Phase 21 suites, full unit tests, full E2E where practical, `npm run typecheck`, and `npm run preflight`.
- **Max feedback latency:** Keep focused unit/component feedback under 3 minutes; E2E and preflight may run longer.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 21-01-01 | 01 | 1 | REQ-020 / T-U-021 | T-21-01-I | Vault-index cache clears stale workspace data and late responses cannot repopulate old entries. | unit/component | `npm test -- src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx` | yes | green |
| 21-01-02 | 01 | 1 | REQ-020 / T-U-021 | T-21-03-T | Editor, frontmatter, search, and clipboard-adjacent failure states preserve visible errors and avoid stale current results. | component | `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx` | yes | green |
| 21-01-03 | 01 | 1 | REQ-020 / T-U-015 / T-U-021 | T-21-02-S | Pi extension lifecycle uses generation-safe rebinds, stale tool rejection, and no provider registration. | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts` | yes | green |
| 21-02-01 | 02 | 2 | REQ-020 / fixture coverage | T-21-03-T | Fixture covers frontmatter, search-backed vault index, disconnect/reconnect, registry tools, and write payload assertions. | e2e fixture | `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | yes | green |
| 21-02-02 | 02 | 2 | REQ-020 / T-E-001 / T-E-002 / T-E-003 / T-E-004 / T-E-007 | T-21-01-I / T-21-03-T | Real Electron paths prove refresh, frontmatter, search, mention cache, disconnect, reconnect, stale-cache, and copy-reference behavior. | e2e | `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts` | yes | green |
| 21-02-03 | 02 | 2 | REQ-020 / T-E-005 / T-E-006 / T-E-006b | T-21-02-S / T-21-04-I | Pi extension install, ToolCard diagnostics, and real call_macro envelope traces render through app-level paths without new chat message types. | e2e | `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts e2e/flashquery-pi-diagnostics.spec.ts e2e/flashquery-pi-macro-trace.spec.ts` | yes | green |
| 21-03-01 | 03 | 3 | REQ-020 / UI polish | T-21-03-T | Visual evidence captures FlashQuery surfaces and status-chip states while documenting screenshot limitations. | e2e visual | `npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts` | yes | green |
| 21-03-02 | 03 | 3 | REQ-020 / T-M-001 / T-M-002 / T-M-003 / T-M-004 | T-21-10-R | Manual checks are either passed with concrete evidence or blocked with exact prerequisites; no ambiguous skipped state. | manual/UAT | `test -f .planning/phases/21-cross-surface-hardening-and-regression/21-UAT.md && rg -n "T-M-001|T-M-002|T-M-003|T-M-004|blocked|passed" .planning/phases/21-cross-surface-hardening-and-regression/21-UAT.md` | yes | blocked/manual |
| 21-04-01 | 04 | 4 | REQ-020 / final verification | T-21-03-T | Final typecheck, unit, E2E, and preflight evidence is recorded with skipped/manual blockers explicit. | closeout | `npm run typecheck && npm test && npm run test:e2e && npm run preflight` | yes | green |

*Status: pending · green · red · flaky · blocked/manual*

---

## Wave 0 Requirements

Existing infrastructure covers all automated Phase 21 requirements.

- `src/agent/renderer/agentStore.test.ts` covers `T-U-021` vault-index clear, loading, last-fetch-wins, reconnect, and workspace-switch behavior.
- `src/agent/renderer/AgentChatInput.atMention.test.tsx` covers no-stale-match loading behavior during cache refresh.
- `src/agent/extensions/cate-flashquery/lifecycle.test.ts` and `index.test.ts` cover `T-U-015` and Phase 21 lifecycle hardening.
- `src/renderer/panels/EditorPanel.test.tsx`, `FlashQueryVaultSearchPanel.test.tsx`, and `FlashQueryVaultPanel.test.tsx` cover editor, frontmatter, search, and clipboard-adjacent `REQ-020` regressions.
- `e2e/flashquery-editor-refresh-frontmatter.spec.ts`, `flashquery-vault-search.spec.ts`, `flashquery-pi-mentions.spec.ts`, `flashquery-disconnect.spec.ts`, `flashquery-pi-extension.spec.ts`, `flashquery-pi-diagnostics.spec.ts`, `flashquery-pi-macro-trace.spec.ts`, and `flashquery-visual-evidence.spec.ts` cover the Electron and visual evidence surface.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Live FlashQuery/Pi tool registration and workspace-switch stale tool behavior | REQ-013, REQ-014, REQ-020 / T-M-001 | Requires real FlashQuery HTTP MCP endpoint and configured native Pi provider credentials. | Start Cate with real FlashQuery and a native Pi provider; verify native and brokered eligible tools register, stale tools disappear or reject after workspace switch, and FlashQuery is absent from ProvidersView. |
| Live host-model `call_macro` progress and interaction behavior | REQ-016, REQ-020 / T-M-002 | Requires a real host-model run, progress-emitting macro, `needs_user_input`, and disconnected macro scenario. | Invoke `call_macro` through the host model; verify spinner/latest progress, final trace, `needs_user_input`, and disconnected behavior. |
| Live host-model `call_model` references and diagnostics | REQ-015, REQ-017, REQ-020 / T-M-003 | Requires configured Pi provider, live FlashQuery runtime, document-reference fixture, and real host-model tool choice. | Invoke `call_model` with `{{ref:<fullPath>}}`; verify purpose/model resolution, injected refs, messages payload, cost/tokens/latency, and server-side FlashQuery tool-loop diagnostics. |
| Native macOS pasted clipboard values | REQ-019, REQ-020 / T-M-004 | Native clipboard and OS menu behavior require human-observed paste results. | Copy vault paths/references from vault tree, search row, and editor title actions; paste into plain text and verify exact `Docs/Plan.md` and `{{ref:Docs/Plan.md}}` values with no anchors or Markdown links. |

Manual checks above are blocked in `21-UAT.md` and `21-VERIFICATION.md` with exact prerequisites. They do not represent missing automated Nyquist coverage, but they do block release-readiness until resolved or accepted by the owner.

---

## Validation Audit 2026-06-04

| Metric | Count |
|--------|-------|
| Gaps found | 4 manual/live evidence blockers |
| Resolved | 0 manual/live blockers in this validation pass |
| Escalated | 4 manual-only blockers retained in UAT |
| Automated requirements audited | 1 requirement, 12 automated test IDs/check groups |
| Automated missing coverage | 0 |

### Commands Re-run During Validation

| Command | Result |
|---------|--------|
| `npm test -- src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts` | passed: 4 files, 38 tests |
| `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx` | passed: 3 files, 72 tests |
| `npm run typecheck` | passed |

Previously recorded final closeout evidence in `21-VERIFICATION.md` also includes passing focused E2E, visual E2E, full unit, full E2E, and `npm run preflight`.

---

## Validation Sign-Off

- [x] All tasks have automated verify commands or explicit manual-only blockers.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing automated references.
- [x] No watch-mode flags.
- [x] Focused feedback latency target documented and met for local validation commands.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved for automated Nyquist coverage on 2026-06-04; release-readiness remains blocked pending owner decision or manual/live evidence for `T-M-001` through `T-M-004`.

