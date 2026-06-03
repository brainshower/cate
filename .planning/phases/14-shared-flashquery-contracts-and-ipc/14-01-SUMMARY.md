---
phase: 14-shared-flashquery-contracts-and-ipc
plan: 14.1
subsystem: shared-contracts
tags: [flashquery, ipc, preload, uri, types]
requires: []
provides:
  - Shared FlashQuery document part, write payload, search, and vault-index types
  - FlashQuery body/frontmatter URI parsing and building
  - Renderer preload and Electron API signatures for widened FlashQuery contracts
affects: [phase-15, phase-16, phase-20]
tech-stack:
  added: []
  patterns: [typed-preload-ipc-contracts, shared-uri-part-parsing]
key-files:
  created: []
  modified:
    - src/shared/types.ts
    - src/shared/types.test.ts
    - src/shared/flashqueryUri.ts
    - src/shared/flashqueryUri.test.ts
    - src/main/flashquery/uri.test.ts
    - src/shared/ipc-channels.ts
    - src/shared/ipc-channels.test.ts
    - src/preload/index.ts
    - src/shared/electron-api.d.ts
key-decisions:
  - "Default document URI/read part remains body for legacy editor compatibility."
  - "Frontmatter is represented with explicit ?part=frontmatter URI semantics rather than path text."
patterns-established:
  - "FlashQuery renderer contracts are added first in shared types, then mirrored through preload and Electron API typings."
requirements-completed: [REQ-004]
duration: 12min
completed: 2026-06-03
---

# Phase 14 Plan 14.1: Shared Renderer Contract Types And Preload Surface Summary

**Widened FlashQuery shared contracts, URI document-part parsing, and typed preload methods for document body/frontmatter, search, and vault-index access**

## Performance

- **Duration:** 12 min
- **Started:** 2026-06-03T18:22:09Z
- **Completed:** 2026-06-03T18:28:48Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Added shared FlashQuery types for document parts, get options, frontmatter, object write payloads, search params/results, vault-index entries, and managed frontmatter fields.
- Updated URI helpers to parse `?part=body` and `?part=frontmatter` without treating query text as `vaultPath`.
- Added `flashquery:search` and `flashquery:list-vault-index` channels and mirrored the widened contracts through preload and `ElectronAPI`.

## Task Commits

1. **Task 1: Add shared FlashQuery contract types** - `d31bbc3` (feat)
2. **Task 2: Add body/frontmatter URI part parsing** - `d31bbc3` (feat)
3. **Task 3: Widen channel constants, preload, and Electron API typings** - `d31bbc3` (feat)

**Plan metadata:** pending docs commit

## Files Created/Modified

- `src/shared/types.ts` - Shared FlashQuery document/search/write/index contracts and managed frontmatter constants.
- `src/shared/flashqueryUri.ts` - Body/frontmatter URI part parsing and building.
- `src/shared/ipc-channels.ts` - New search and vault-index IPC constants.
- `src/preload/index.ts` - Widened get/write invocation and new search/index methods.
- `src/shared/electron-api.d.ts` - Typed renderer API declarations.
- Focused shared tests updated for T-U-001, T-U-002, and T-U-004.

## Decisions Made

- Kept `FlashQueryDocumentBody.body` required and defaulted URI/read part semantics to `body` to preserve Milestone 1 body editor compatibility.
- Emitted no URI query for default body when building URIs; `frontmatter` gets explicit `?part=frontmatter`.

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact on plan:** No scope change.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Verification

- `npm test -- src/shared/types.test.ts src/shared/flashqueryUri.test.ts src/main/flashquery/uri.test.ts src/shared/ipc-channels.test.ts` - passed
- `npm run typecheck` - passed

## Next Phase Readiness

Manager and IPC implementation can depend on the widened shared contracts without adding renderer UI or Pi surfaces.

---
*Phase: 14-shared-flashquery-contracts-and-ipc*
*Completed: 2026-06-03*
