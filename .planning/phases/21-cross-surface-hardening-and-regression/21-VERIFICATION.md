---
phase: 21-cross-surface-hardening-and-regression
status: needs-review
created: 2026-06-04
verified_at: 2026-06-04T23:00:26Z
requirements: [REQ-020]
automated_status: passed
manual_status: blocked
---

# Phase 21 Verification: Cross-Surface Hardening and Regression

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md`
- `.planning/phases/21-cross-surface-hardening-and-regression/21-CONTEXT.md`
- `.planning/phases/21-cross-surface-hardening-and-regression/21-UAT.md`
- Plan summaries `21-01-SUMMARY.md`, `21-02-SUMMARY.md`, and `21-03-SUMMARY.md`

## Final Status

Automated Phase 21 verification passed. `T-M-004` native clipboard evidence is now automated by `e2e/flashquery-native-clipboard.spec.ts`. The phase remains `needs-review` because live/manual checks `T-M-001`, `T-M-002`, and `T-M-003` are blocked pending a real FlashQuery/Pi/provider environment and human/live evidence.

The milestone must not be marked shipped from this file alone. The next release-readiness decision is whether to accept the manual blockers as known follow-up, resolve them in the live environment, or open a follow-up phase.

## Final Command Evidence

| Command | Date | Status | Outcome |
| --- | --- | --- | --- |
| `npm test -- src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts` | 2026-06-04 | passed | 4 files, 38 tests passed. |
| `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx` | 2026-06-04 | passed | 3 files, 72 tests passed. |
| `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | 2026-06-04 | passed | 6 Playwright tests passed. |
| `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts` | 2026-06-04 | passed | 6 Playwright tests passed for `T-E-001`, `T-E-002`, `T-E-003`, `T-E-004`, and distributed `T-E-007` editor/search/mention/status-chip disconnect coverage. |
| `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts e2e/flashquery-pi-diagnostics.spec.ts e2e/flashquery-pi-macro-trace.spec.ts` | 2026-06-04 | passed | 3 Playwright tests passed for `T-E-005`, `T-E-006`, and `T-E-006b`. |
| `npm run test:e2e -- e2e/flashquery-native-clipboard.spec.ts` | 2026-06-04 | passed | 1 Playwright test passed for `T-M-004`, verifying vault tree, search row, and editor title copy actions against Electron's native clipboard. |
| `npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts` | 2026-06-04 | passed | 1 Playwright visual evidence test passed and refreshed Phase 21 screenshots. |
| `npm run typecheck` | 2026-06-04 | passed | `tsc --noEmit` exited 0. |
| `npm test` | 2026-06-04 | passed | 81 files passed; 752 tests passed; 3 skipped. |
| `npm run test:e2e` | 2026-06-04 | passed | 49 Playwright tests passed; 2 skipped. |
| `npm run preflight` | 2026-06-04 | passed | Build, typecheck, unit tests, and full E2E passed; full E2E portion again passed 49 tests with 2 skipped. |

## REQ-020 Release-Readiness Matrix

| Surface / Criterion | Evidence | Status |
| --- | --- | --- |
| Refresh fails visibly when disconnected | `EditorPanel.test.tsx`; `e2e/flashquery-editor-refresh-frontmatter.spec.ts` `T-E-007`; `21-UAT.md` | automated passed |
| Frontmatter save fails visibly when disconnected | `EditorPanel.test.tsx`; `e2e/flashquery-editor-refresh-frontmatter.spec.ts` `T-E-007`; `21-UAT.md` | automated passed |
| Search fails visibly when disconnected | `FlashQueryVaultSearchPanel.test.tsx`; `e2e/flashquery-vault-search.spec.ts`; `T-E-003`; `T-E-007`; `21-UAT.md` | automated passed |
| `@` cache loading clears stale data and fails visibly | `agentStore.test.ts`; `AgentChatInput.atMention.test.tsx`; `e2e/flashquery-pi-mentions.spec.ts`; `T-E-004`; `21-UAT.md` | automated passed |
| Clipboard reference actions preserve literal path/reference behavior | `FlashQueryVaultPanel.test.tsx`; `FlashQueryVaultSearchPanel.test.tsx`; `e2e/flashquery-vault-search.spec.ts`; `e2e/flashquery-native-clipboard.spec.ts`; `T-E-003`; `21-UAT.md` `T-M-004` | automated passed |
| Pi extension tools degrade visibly across disconnect/workspace changes | `lifecycle.test.ts`; `index.test.ts`; `e2e/flashquery-pi-extension.spec.ts`; `T-E-005`; `21-UAT.md` `T-M-001` | automated passed; live manual blocked |
| `call_macro` real-envelope trace regression | `e2e/flashquery-pi-macro-trace.spec.ts`; `T-E-006b`; `21-UAT.md` | automated passed; live `T-M-002` blocked |
| ToolCard diagnostics and `call_model` diagnostic preservation | `ChatThread.test.tsx`; `e2e/flashquery-pi-diagnostics.spec.ts`; `T-E-006`; `21-UAT.md` `T-M-003` | automated passed; live manual blocked |
| Reconnect refreshes connection-scoped caches and re-enables affected controls | `agentStore.test.ts`; `FlashQueryVaultSearchPanel.test.tsx`; `e2e/flashquery-editor-refresh-frontmatter.spec.ts`; `e2e/flashquery-disconnect.spec.ts`; `T-E-007`; `21-UAT.md` | automated passed |
| Workspace switch clears stale workspace data before loading replacement data | `agentStore.test.ts`; extension lifecycle coverage; `21-01-SUMMARY.md` | automated passed |
| Superseded in-flight cache responses do not repopulate stale data | `agentStore.test.ts`; `FlashQueryVaultSearchPanel.test.tsx`; `21-01-SUMMARY.md` | automated passed |
| FlashQuery errors surface inline or as Pi tool/system messages | Editor/search/cache component tests; Pi diagnostics E2E; `T-E-006`; `T-E-007`; `21-UAT.md` | automated passed |
| Fixture coverage for frontmatter, search-backed vault index, disconnect, and write payload assertions | `e2e/fixtures/flashquery-server.spec.ts`; `e2e/fixtures/flashquery-server.ts`; `21-02-SUMMARY.md`; vault-index fixture assertion uses real `search({ list_all: true, entity_types: ['documents'] })`, not a fictional MCP tool | passed |
| Milestone UI polish checked against Milestone 2 UI Spec | `e2e/flashquery-visual-evidence.spec.ts`; Phase 21 visual screenshots; `evidence/visual/NOTES.md`; `21-UAT.md` | automated visual evidence passed; some state-specific visual manual evidence remains limited |
| `npm run typecheck` | Final command evidence above | passed |
| `npm run preflight` | Final command evidence above | passed |
| Manual live FlashQuery/Pi checks | `21-UAT.md` rows `T-M-001` through `T-M-003` | blocked pending human/live environment |

## Roadmap Success Criteria

| Criterion | Status | Evidence |
| --- | --- | --- |
| Disconnected refresh, frontmatter save, search, `@` cache loading, clipboard reference actions, and Pi extension tools fail visibly rather than silently | automated passed; manual blockers for live Pi remain | Component tests, E2E tests, `21-UAT.md` |
| Reconnect refreshes connection-scoped caches and re-enables affected controls | passed | `T-E-007`, search/mention component coverage |
| Workspace switch clears stale workspace data before loading new workspace data and discards superseded in-flight cache responses | passed | Agent store and lifecycle tests |
| FlashQuery errors surface as inline UI errors or Pi tool/system messages appropriate to the surface | passed | Editor/search/cache tests, Pi diagnostics and macro trace E2E |
| E2E fixtures cover frontmatter, search-backed vault index, disconnect, and write payload assertions | passed | `e2e/fixtures/flashquery-server.spec.ts`; fixture intentionally omits unsupported `list_vault_index` MCP tool |
| Milestone UI polish is checked against the Milestone 2 UI Spec where applicable | passed with visual limitations recorded | Visual evidence spec and `evidence/visual/NOTES.md` |
| Final verification runs targeted suites, `npm run typecheck`, and `npm run preflight` where practical, with skipped portions explicitly recorded | passed | Final command evidence above |

## Blocked Manual Checks

| ID | Status | Blocker |
| --- | --- | --- |
| `T-M-001` | blocked | Requires real FlashQuery HTTP MCP endpoint plus configured native Pi provider. |
| `T-M-002` | blocked | Requires live host-model `call_macro`, progress-emitting macro, `needs_user_input`, and disconnected macro behavior verification. |
| `T-M-003` | blocked | Requires live host-model `call_model` with refs/diagnostics against a configured Pi provider and FlashQuery runtime. |
| `T-M-004` | passed | `e2e/flashquery-native-clipboard.spec.ts` verifies vault tree, search row, and editor title copy actions against Electron's native clipboard. |

## Release-Readiness Decision

No human release-readiness approval has been recorded yet. Current recommendation: keep Phase 21 in `Needs Review` until the owner either accepts the remaining manual/live blockers as known follow-up or records live/manual evidence for `T-M-001` through `T-M-003`.
