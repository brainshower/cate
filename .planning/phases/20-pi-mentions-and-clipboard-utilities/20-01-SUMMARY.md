---
phase: 20-pi-mentions-and-clipboard-utilities
plan: 01
subsystem: agent-renderer
tags: [flashquery, pi-chat, vault-index, renderer-cache, zustand]
requires:
  - phase: 17-flashquery-pi-extension-bootstrap
    provides: FlashQuery Pi extension lifecycle and workspace-scoped tool handoff
  - phase: 18-call-model-call-macro-and-diagnostics-data
    provides: FlashQuery diagnostics details on Pi tool events
provides:
  - Workspace-scoped Pi vault-index cache in agent renderer state
  - Last-fetch-wins refresh and clear actions for `flashquery:list-vault-index`
  - Cache refresh triggers for connection lifecycle, vault refresh, editor writes, and successful mutating FlashQuery document tools
affects: [20-02-pi-mentions, 20-04-e2e-evidence]
tech-stack:
  added: []
  patterns: [zustand async request sequencing, preload-only FlashQuery renderer access, workspace-scoped cache refresh helper]
key-files:
  created: []
  modified:
    - src/agent/renderer/agentStore.ts
    - src/agent/renderer/agentStore.test.ts
    - src/agent/renderer/AgentPanel.tsx
    - src/agent/renderer/AgentChatInput.tsx
    - src/renderer/panels/FlashQueryVaultPanel.tsx
    - src/renderer/panels/FlashQueryVaultPanel.test.tsx
    - src/renderer/panels/EditorPanel.tsx
    - src/renderer/panels/EditorPanel.test.tsx
key-decisions:
  - "Vault-index refresh orchestration lives in `agentStore.ts` so every renderer trigger shares one request-sequencing implementation."
  - "Renderer surfaces refresh existing agent caches through a workspace helper instead of learning active chat internals."
patterns-established:
  - "Use `vaultIndexRequestId` and `vaultIndexWorkspaceId` together to discard late async responses."
  - "Call only `window.electronAPI.flashqueryListVaultIndex(workspaceId)` from renderer cache code."
requirements-completed: [REQ-018]
duration: 12min
completed: 2026-06-04
---

# Phase 20 Plan 01: Vault-Index Cache Lifecycle Summary

**Workspace-scoped Pi vault-index cache with last-fetch-wins refresh semantics and lifecycle-triggered invalidation**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-04T19:11:00Z
- **Completed:** 2026-06-04T19:23:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added `vaultIndex`, loading, workspace id, and request sequencing metadata to each agent panel slice.
- Implemented `refreshVaultIndex`, `clearVaultIndex`, and workspace-wide refresh helper without storing tokens, auth headers, MCP clients, or handoff secrets in renderer state.
- Wired cache refresh/clear triggers from AgentPanel connection status, manual vault tree refresh, successful FlashQuery editor writes, and successful mutating FlashQuery document tool events.
- Added focused T-U-006 coverage for refresh replacement, stale response handling, clear/switch behavior, tool mutation refresh, vault tree refresh, and editor write refresh.

## Task Commits

1. **Task 1: Add vault-index cache state and race tests** - `6ceae67` (`feat(20-01): add vault index cache state`)
2. **Task 2: Wire cache refresh lifecycle triggers** - `316dad7` (`feat(20-01): wire vault index refresh lifecycle`)

## Files Created/Modified

- `src/agent/renderer/agentStore.ts` - Owns vault-index cache state/actions, mutation refresh classification, and workspace refresh helper.
- `src/agent/renderer/agentStore.test.ts` - Adds cache lifecycle and mutating-tool refresh coverage.
- `src/agent/renderer/AgentPanel.tsx` - Refreshes/clears active chat cache on FlashQuery connection lifecycle and passes cache props to ChatInput.
- `src/agent/renderer/AgentChatInput.tsx` - Accepts vault-index cache props for the upcoming mention UI.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` - Refreshes agent caches after successful root vault refresh.
- `src/renderer/panels/FlashQueryVaultPanel.test.tsx` - Verifies vault refresh repopulates an agent cache.
- `src/renderer/panels/EditorPanel.tsx` - Refreshes agent caches after successful `flashqueryWriteDocument`.
- `src/renderer/panels/EditorPanel.test.tsx` - Verifies editor writes repopulate an agent cache.

## Decisions Made

- Keep cache logic centralized in the agent store so Plan 20-02 can consume read-only cache props without duplicating async race handling.
- Use whole-response replacement only; no incremental document patching or push-driven invalidation was introduced.
- Refresh all existing agent cache slices for a workspace after external renderer triggers, constrained by each slice's current workspace metadata when present.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Verification

- `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/agent/renderer/agentStore.test.ts`
- `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/agent/renderer/agentStore.test.ts src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx`
- `npm run typecheck`

All commands passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 20-02 can now add Pi chat `@` mention autocomplete against `vaultIndex` and `vaultIndexLoading` props supplied by `AgentPanel`.

---
*Phase: 20-pi-mentions-and-clipboard-utilities*
*Completed: 2026-06-04*
