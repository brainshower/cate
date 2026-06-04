---
phase: 21-cross-surface-hardening-and-regression
plan: 04
status: complete-with-blockers
completed: 2026-06-04
requirements: [REQ-020]
---

# 21-04 Summary: Final Verification and Closeout

## Completed

- Created `21-VERIFICATION.md` with final command evidence, REQ-020 release-readiness matrix, roadmap success criteria coverage, and explicit manual blockers.
- Updated `ROADMAP.md` and `STATE.md` to reflect the true closeout state: automated verification passed, but Phase 21 remains `Needs Review` pending owner decision on `T-M-001` through `T-M-004`.
- Refreshed Phase 21 visual evidence screenshots through the final full E2E/preflight runs.

## Verification

| Command | Result |
| --- | --- |
| `npm test -- src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts` | passed: 4 files, 38 tests |
| `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx` | passed: 3 files, 72 tests |
| `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | passed: 6 tests |
| `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts` | passed: 5 tests |
| `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts e2e/flashquery-pi-diagnostics.spec.ts e2e/flashquery-pi-macro-trace.spec.ts` | passed: 3 tests |
| `npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts` | passed: 1 test |
| `npm run typecheck` | passed |
| `npm test` | passed: 81 files, 752 tests, 3 skipped |
| `npm run test:e2e` | passed: 48 tests, 2 skipped |
| `npm run preflight` | passed: build, typecheck, unit, and E2E |

## Remaining Blockers

- `T-M-001`: real FlashQuery HTTP MCP endpoint plus configured native Pi provider.
- `T-M-002`: live host-model `call_macro`, progress, `needs_user_input`, and disconnected macro behavior.
- `T-M-003`: live host-model `call_model` with refs/diagnostics.
- `T-M-004`: human-observed native macOS pasted clipboard values.

## Handoff

Phase 21 implementation and automated validation are complete. The remaining decision is release-readiness: resolve the manual blockers, accept them as known follow-up, or open a follow-up phase/issue.
