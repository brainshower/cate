---
phase: 21-cross-surface-hardening-and-regression
plan: 01
status: complete
completed_at: 2026-06-04T21:16:50Z
requirements:
  - REQ-020
coverage:
  - T-U-015
  - T-U-021
key-files:
  modified:
    - src/agent/renderer/agentStore.test.ts
    - src/agent/renderer/AgentChatInput.atMention.test.tsx
    - src/renderer/panels/EditorPanel.test.tsx
    - src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx
    - src/renderer/panels/FlashQueryVaultPanel.test.tsx
---

# Plan 21-01 Summary

## Objective

Added focused Phase 21 `REQ-020` traceability and regression assertions across the deterministic unit/component surfaces that own cross-surface degradation behavior.

## What Changed

- Extended `agentStore` vault-index lifecycle tests with explicit `T-U-021`/`REQ-020` assertions for last-fetch-wins, clear-blocks-late-response, workspace-switch cache clearing, and concrete old/new workspace paths (`Old/Only.md`, `New/Plan.md`).
- Strengthened Pi `@` mention autocomplete loading coverage so `Loading vault...` is shown without stale old-workspace results while a vault-index refresh is in flight.
- Tagged and tightened editor/frontmatter/search/vault clipboard-adjacent component tests for `REQ-020`, including editor text preservation, dirty-state preservation, disconnected search UI replacement, and exact path/reference clipboard strings.
- Preserved existing Pi extension lifecycle coverage for `T-U-015`; no provider registration or unsupported unregister API expectation was added.

## Verification

| Command | Status | Result |
| --- | --- | --- |
| `npm test -- src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts` | passed | 4 files, 38 tests passed |
| `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx` | passed | 3 files, 72 tests passed |

## Deviations from Plan

The plan listed `src/agent/renderer/AgentPanel.test.tsx`, but no such test file exists in the current repo. The required disconnect/reconnect/cache behavior is owned by `agentStore` and `AgentChatInput`, so coverage was added there instead of creating a broad AgentPanel harness.

**Total deviations:** 1 documented, no behavior scope change.

## Self-Check: PASSED

The focused `T-U-015` and `T-U-021` unit/component coverage is green, includes concrete stale-workspace assertions, and does not expose credentials or add unsupported FlashQuery provider behavior.
