---
phase: 01-foundation
plan: 03
subsystem: flashquery-foundation
tags: [flashquery, uri, client-manager, lifecycle]

requires:
  - phase: 01-foundation
    provides: Optional FlashQuery workspace metadata
provides:
  - Canonical `flashquery://<workspaceId>/<vault-path>` URI builder/parser
  - No-network FlashQueryClientManager lifecycle/subscription skeleton
affects: [flashquery, vault-uri, client-manager]

tech-stack:
  added: []
  patterns: [pure-uri-helper, workspace-scoped-manager-state]

key-files:
  created:
    - src/main/flashquery/uri.ts
    - src/main/flashquery/uri.test.ts
    - src/main/flashquery/clientManager.ts
    - src/main/flashquery/clientManager.test.ts
  modified: []

key-decisions:
  - "Export the URI API as `buildVaultUri` and `parseVaultUri`, matching the Phase 1 plan contract."
  - "Keep path separators literal while percent-encoding workspace IDs and individual path segments."
  - "Keep FlashQueryClientManager inert: no fetch, MCP SDK, IPC, retries, or credential reads in Phase 1."

patterns-established:
  - "Vault URI parsing returns null for non-FlashQuery or malformed inputs instead of throwing."
  - "Manager subscribers are scoped by workspace ID and event type, with unsubscribe and dispose cleanup."

requirements-completed: [REQ-003, REQ-013]

duration: 10min
completed: 2026-05-29
---

# Phase 01: FlashQuery URI And Manager Skeleton Summary

**Pure FlashQuery vault URI helpers and an inert workspace-scoped client manager skeleton are ready for later connection work.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-29T00:27:00Z
- **Completed:** 2026-05-29T00:37:03Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Added `buildVaultUri` and `parseVaultUri` for the v1 `flashquery://<workspaceId>/<vault-path>` contract.
- Covered empty paths, nested paths, spaces, `#`, `?`, `%`, Latin-1, CJK, leading/trailing slashes, non-FlashQuery inputs, and malformed escapes.
- Added `FlashQueryClientManager` with workspace-scoped subscriber state, safe immediate unsubscribe, and idempotent dispose.
- Verified the manager constructor performs no eager network work.

## Files Created/Modified

- `src/main/flashquery/uri.ts` - Adds pure FlashQuery vault URI build/parse helpers.
- `src/main/flashquery/uri.test.ts` - Covers URI encoding, decoding, separators, empty paths, and malformed inputs.
- `src/main/flashquery/clientManager.ts` - Adds workspace-scoped manager state and subscription/dispose skeleton.
- `src/main/flashquery/clientManager.test.ts` - Covers no-network construction, subscribe/unsubscribe, and dispose behavior.

## Verification

- `npx vitest run src/shared/types.test.ts src/main/workspaceManager.test.ts src/main/flashquery/credentials.test.ts src/main/flashquery/uri.test.ts src/main/flashquery/clientManager.test.ts` passed.
- `npm run typecheck` passed.
- `rg -n "fetch\\(|/mcp/info|ipcMain|@modelcontextprotocol|retry|setTimeout" src/main/flashquery/clientManager.ts || true` returned no Phase 2/3 behavior.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Future phases can extend the client manager with actual connection health and vault events while preserving the public subscribe/dispose shape and URI contract.

---
*Phase: 01-foundation*
*Completed: 2026-05-29*
