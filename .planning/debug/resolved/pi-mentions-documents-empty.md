---
status: resolved
trigger: "Cate / Pi does not find documents when typing @; @Id for Ideas.md shows No matching documents."
created: "2026-06-06T16:51:09Z"
updated: "2026-06-06T16:54:20Z"
---

# Debug Session: Pi Mentions Documents Empty

## Symptoms

- expected_behavior: Typing `@` in the Pi agent composer should show available FlashQuery vault documents; typing `@Id` should suggest `Ideas.md`.
- actual_behavior: The mention popup shows `No matching documents` for both bare `@` and `@Id`.
- error_messages: No error shown in UI. Screenshot shows empty suggestion popup above the focused composer.
- timeline: Reported 2026-06-06. Unknown whether this ever worked in the local app session.
- reproduction: Open Cate agent panel connected to FlashQuery/Pi, type `@`, then type `Id`.

## Current Focus

- hypothesis: The renderer mention filter works when `vaultIndex` is populated, but the agent panel is not loading or refreshing the workspace vault index before suggestions open.
- test: Trace `vaultIndex` lifecycle from AgentPanel to `flashqueryListVaultIndex`, then reproduce with focused unit/E2E coverage.
- expecting: A missing/incorrect refresh trigger.
- next_action: verified fix with focused tests and typecheck
- reasoning_checkpoint:
- tdd_checkpoint:

## Evidence

- timestamp: "2026-06-06T16:51:09Z"
  observation: Screenshot shows mention popup active with draft `@Id` and text `No matching documents`.
- timestamp: "2026-06-06T16:51:09Z"
  observation: `AgentChatInput` filters `(vaultIndex ?? [])` by `entry.filename.toLowerCase().includes(filter)`, so `Ideas.md` should match `Id` if present.
- timestamp: "2026-06-06T16:51:09Z"
  observation: Existing E2E `flashquery-pi-mentions.spec.ts` manually calls `refreshAgentVaultIndex`; this may hide a missing runtime refresh trigger.
- timestamp: "2026-06-06T16:53:00Z"
  observation: `AgentPanel` only refreshed `vaultIndex` when `flashQueryStatus === 'live'`. On mount it initializes `flashQueryStatus` to `null` and only updates from future `onFlashQueryStatus` broadcasts.
- timestamp: "2026-06-06T16:53:00Z"
  observation: If a workspace was already connected before the agent panel mounted, no fresh live broadcast is guaranteed, so the active agent's `vaultIndex` remains empty and the popup renders `No matching documents`.
- timestamp: "2026-06-06T16:53:41Z"
  observation: Focused tests passed: `npm test -- --run src/agent/renderer/AgentPanel.flashquery.test.tsx src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/renderer/agentStore.test.ts`.
- timestamp: "2026-06-06T16:54:00Z"
  observation: Typecheck passed: `npm run typecheck`.

## Eliminated

- hypothesis: The UI text filter cannot match uppercase/lowercase `Id`.
  reason: Existing code lowercases both filter and filename, and tests cover case-insensitive matching.

## Resolution

- root_cause: `AgentPanel` gated vault-index refresh on receiving a future `live` status event. Already-configured/already-connected workspaces can mount an agent panel after the live event has passed, leaving `flashQueryStatus` null and `vaultIndex` empty.
- fix: Refresh the active agent's vault index whenever the workspace has a FlashQuery connection and is not explicitly disconnected. Keep clearing the cache when no connection exists or a disconnected status arrives.
- verification: Focused Vitest suite and TypeScript typecheck passed.
- files_changed: `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/AgentPanel.flashquery.test.tsx`
