---
phase: 01-foundation
plan: 02
subsystem: credentials
tags: [flashquery, electron-store, tokens, main-process]

requires: []
provides:
  - Main-process FlashQuery token storage helper
  - Unit tests for get/set/delete/error credential behavior
affects: [flashquery, credentials, main-process]

tech-stack:
  added: []
  patterns: [main-process-secret-boundary, lazy-electron-store-import]

key-files:
  created:
    - src/main/flashquery/credentials.ts
    - src/main/flashquery/credentials.test.ts
  modified: []

key-decisions:
  - "Use a FlashQuery-named electron-store namespace behind a small helper module."
  - "Return null for missing tokens and let set/delete failures reject naturally."
  - "Do not expose raw token APIs to renderer or preload in this foundation plan."

patterns-established:
  - "Future FlashQuery code should call credentials.ts instead of directly reading token storage."

requirements-completed: [REQ-002]

duration: 8min
completed: 2026-05-29
---

# Phase 01: FlashQuery Credential Boundary Summary

**Main-process FlashQuery bearer-token I/O is isolated behind `getWorkspaceToken` and `setWorkspaceToken`.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-05-29T00:25:00Z
- **Completed:** 2026-05-29T00:37:03Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/main/flashquery/credentials.ts` with the exact async token helper signatures.
- Used a lazy dynamic import of `electron-store`, matching the app’s ESM-safe main-process pattern.
- Added mocked unit tests for missing tokens, token round trip, clearing tokens with `null`, workspace isolation, and write failure rejection.

## Files Created/Modified

- `src/main/flashquery/credentials.ts` - Adds main-process token get/set/clear helpers.
- `src/main/flashquery/credentials.test.ts` - Covers missing, round-trip, clear, isolation, and failure behavior with a mocked store.

## Verification

- `npx vitest run src/shared/types.test.ts src/main/workspaceManager.test.ts src/main/flashquery/credentials.test.ts src/main/flashquery/uri.test.ts src/main/flashquery/clientManager.test.ts` passed.
- `npm run typecheck` passed.
- `rg -n "flashquery.*token|token.*flashquery" src/renderer src/preload || true` returned no renderer/preload token exposure.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Connection IPC and manager code can depend on the helper without duplicating credential storage or leaking raw tokens across renderer boundaries.

---
*Phase: 01-foundation*
*Completed: 2026-05-29*
