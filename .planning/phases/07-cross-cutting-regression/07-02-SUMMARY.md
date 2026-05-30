---
phase: 07-cross-cutting-regression
plan: 02
subsystem: testing
tags: [flashquery, mcp, electron, playwright, persistence]
requires:
  - phase: 07-cross-cutting-regression
    provides: "Plan 07-01 corrected public no-auth /mcp/info probing and captured the Electron launch blocker"
provides:
  - "Strict deterministic FlashQuery HTTP MCP E2E stub with counters, mutable documents, availability toggles, and reset helpers"
  - "Restart-capable Electron E2E launch support with guarded CATE_E2E_USER_DATA_DIR"
  - "T-E-006 through T-E-011 Playwright coverage for persistence, lazy reconnect, happy path, retry, browsing, and Open on Canvas"
  - "Electron E2E launch blocker fixed by removing ELECTRON_RUN_AS_NODE from Playwright child env"
  - "Existing smoke/drag E2E baseline repaired and passing after launch support changes"
affects: [07-cross-cutting-regression, flashquery-e2e, flashquery-client-manager, session-persistence]
tech-stack:
  added: []
  patterns:
    - "E2E FlashQuery fixtures speak MCP Streamable HTTP through the installed SDK server transport"
    - "Project-local workspace persistence preserves workspaceId so workspace-scoped credentials remain addressable after restart"
key-files:
  created:
    - e2e/fixtures/flashquery-server.ts
    - e2e/fixtures/flashquery-server.spec.ts
    - e2e/flashquery-persistence.spec.ts
    - e2e/flashquery-happy-path.spec.ts
    - e2e/flashquery-disconnect.spec.ts
    - e2e/flashquery-vault-browse.spec.ts
    - .planning/phases/07-cross-cutting-regression/07-02-SUMMARY.md
  modified:
    - playwright.config.ts
    - e2e/fixtures/electron-app.ts
    - src/main/index.ts
    - src/main/flashquery/clientManager.ts
    - src/main/ipc/flashquery.ts
    - src/renderer/lib/e2eHarness.ts
    - src/renderer/lib/session.ts
    - src/renderer/panels/FlashQueryVaultPanel.tsx
    - src/renderer/stores/appStore.ts
    - src/shared/types.ts
key-decisions:
  - "Use the installed MCP SDK server transport in the stub rather than hand-rolling JSON-RPC, so E2E POST /mcp behavior matches Cate's production client."
  - "Preserve workspaceId in project-local workspace files to keep workspace-scoped FlashQuery tokens available after restart."
  - "Trigger lazy reconnect from the vault panel by retrying persisted connections only when the panel mounts with connecting status."
patterns-established:
  - "FlashQuery E2E specs start a local stub per test and assert both visible UI and stub counters/document state."
  - "E2E harness helpers may use preload IPC for deterministic setup/inspection when native menus or Monaco internals would be brittle."
requirements-completed: [REQ-043, REQ-044]
duration: 30min
completed: 2026-05-30
---

# Phase 7 Plan 2: FlashQuery E2E Harness Summary

**Deterministic FlashQuery MCP stub plus restart, lazy reconnect, workflow, retry, browse, and Open on Canvas E2E coverage**

## Performance

- **Duration:** 30 min
- **Started:** 2026-05-30T01:07:04Z
- **Completed:** 2026-05-30T01:37:24Z
- **Tasks:** 3 completed
- **Files modified:** 16 source/test/planning files

## Accomplishments

- Added a strict local FlashQuery stub that rejects bearer auth on `GET /mcp/info`, requires bearer auth on `POST /mcp`, supports `list_vault`, `get_document`, and update-only `write_document`, and exposes reset/count helpers.
- Added reusable E2E `userData` launch support and fixed the inherited Electron launch blocker by stripping `ELECTRON_RUN_AS_NODE` from Playwright-launched Electron.
- Proved REQ-044 restart behavior: persisted connection metadata/token survive restart, and no post-restart `/mcp/info` happens until vault use.
- Added T-E-008 through T-E-011 specs for happy path, saved document state, Open on Canvas, disconnect/retry, empty vault, refresh, and multi-level browsing.
- Stabilized the existing smoke/drag E2E baseline after Electron launch was restored, updating brittle drag assertions to current drag-store behavior and visible drop coordinates.

## Task Commits

Each task was committed atomically:

1. **Task 1 RED: failing FlashQuery stub fixture spec** - `61b0743` (test)
2. **Task 1 GREEN: strict FlashQuery MCP E2E stub** - `5718bd3` (feat)
3. **Task 2 RED: failing restart persistence E2E spec** - `b10755a` (test)
4. **Task 2 GREEN: restart-capable launch and lazy reconnect support** - `f2c55b3` (feat)
5. **Task 3 RED: failing workflow/retry/browse E2E specs** - `530845a` (test)
6. **Task 3 GREEN: workflow E2E harness helpers** - `4cefc30` (feat)
7. **Baseline repair: existing smoke/drag E2E stabilization** - `915f1ee` (test)
8. **Post-wave fix: preserve retry IPC void return contract** - `f6075db` (fix)

## Files Created/Modified

- `e2e/fixtures/flashquery-server.ts` - MCP Streamable HTTP stub with counters, availability toggles, nested vault state, empty-vault seeding, and mutable document bodies.
- `e2e/fixtures/flashquery-server.spec.ts` - Direct fixture coverage for info auth strictness, nested listing, empty vault, read, update write, reset, and counters.
- `e2e/flashquery-persistence.spec.ts` - T-E-006/T-E-007 restart persistence and lazy info-probe coverage.
- `e2e/flashquery-happy-path.spec.ts` - T-E-008/T-E-009 workflow, saved body, vault badge, and Open on Canvas coverage.
- `e2e/flashquery-disconnect.spec.ts` - T-E-010 disconnect and retry coverage.
- `e2e/flashquery-vault-browse.spec.ts` - T-E-011 empty vault, refresh, and multi-level browsing coverage.
- `e2e/fixtures/electron-app.ts` - Backward-compatible `launchApp(options)` with reusable `userDataDir` and sanitized Electron env.
- `src/main/index.ts` - Guarded `CATE_E2E_USER_DATA_DIR` support and E2E feedback-prompt suppression.
- `src/main/flashquery/clientManager.ts` / `src/main/ipc/flashquery.ts` - Retry now hydrates from persisted workspace config and rebroadcasts status for restored connections.
- `src/renderer/lib/session.ts`, `src/renderer/stores/appStore.ts`, `src/shared/types.ts` - Project-local persistence now preserves `workspaceId` and avoids clearing restored tokens.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` - Persisted connecting connections trigger lazy retry/probe on panel mount.
- `src/renderer/lib/e2eHarness.ts` - Deterministic helpers for workspace setup, vault panels, vault writes, retry, and panel placement inspection.
- `playwright.config.ts` - Includes nested fixture specs in Playwright discovery.
- `e2e/drag-move.spec.ts`, `e2e/drag-split.spec.ts` - Existing baseline assertions stabilized after the launch blocker was removed.
- `src/main/ipc/flashquery.ts` - Manual retry still broadcasts fresh status while preserving the preload/API `Promise<void>` contract.

## Verification

- PASS: `npx -p node@22 npm run build`
- PASS: `npx -p node@22 npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts e2e/flashquery-persistence.spec.ts e2e/flashquery-happy-path.spec.ts e2e/flashquery-disconnect.spec.ts e2e/flashquery-vault-browse.spec.ts`
  - 6 passed.
- PASS: `npx -p node@22 npm run test:e2e -- e2e/smoke.spec.ts e2e/drag-detach.spec.ts e2e/drag-move.spec.ts e2e/drag-canvas-into-canvas.spec.ts e2e/drag-split.spec.ts`
  - Electron now boots; the prior `--remote-debugging-port=0` blocker is resolved.
  - 16 passed, 2 skipped.
- PASS: `npx -p node@22 npm run test:e2e -- e2e/drag-move.spec.ts:101 e2e/drag-split.spec.ts:78`
  - 2 passed after updating the stale drag-source assertion and visible target drop coordinates.
- PASS: `npx -p node@22 npm test -- src/main/ipc/flashquery.test.ts`
  - 21 passed after preserving the manual retry return contract.

## Acceptance Criteria

- PASS: `flashquery-server.ts` imports only Node built-ins and installed dependencies.
- PASS: `/mcp/info` rejects requests with `Authorization` and exposes that failure in the fixture spec.
- PASS: MCP tool responses return text content containing JSON payloads compatible with `extractTextContent`.
- PASS: `write_document` succeeds only for `mode: 'update'` and mutates in-memory document state.
- PASS: Fixture spec directly covers list/read/write, nested folder listing, empty vault, reset helpers, and counters.
- PASS: `CATE_E2E_USER_DATA_DIR` is read only inside `CATE_E2E === '1'`.
- PASS: Existing `launchApp()` calls remain valid; options are additive.
- PASS: Persistence spec uses the shared stub and asserts persisted metadata plus zero post-restart `/mcp/info` before vault use.
- PASS: Workflow specs cover T-E-008 through T-E-011 without adding create-document, frontmatter, conflict, OAuth, stdio, or live-notification behavior.

## Decisions Made

- Use SDK-backed MCP server transport in the stub to avoid protocol drift from `StreamableHTTPClientTransport`.
- Keep E2E-only userData override and feedback suppression under `CATE_E2E` so production startup behavior is unchanged.
- Persist `workspaceId` in project-local workspace state because token storage is workspace-scoped and REQ-044 requires token availability after restart.
- Use harness helpers for native-menu/Monaco-sensitive checks while still driving connection setup, vault rows, retry, refresh, and visible states through Playwright locators.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Playwright fixture discovery for nested fixture specs**
- **Found during:** Task 1
- **Issue:** Playwright ignored specs under `e2e/fixtures/` until `testMatch` was explicit.
- **Fix:** Added `testMatch: '**/*.spec.ts'` in `playwright.config.ts`.
- **Files modified:** `playwright.config.ts`
- **Verification:** Fixture spec was discovered and passed.
- **Committed in:** `61b0743`

**2. [Rule 3 - Blocking] Fixed Electron E2E launch environment**
- **Found during:** Task 2
- **Issue:** The shell exported `ELECTRON_RUN_AS_NODE=1`, so Playwright-launched Electron rejected Chromium args with `bad option: --remote-debugging-port=0`.
- **Fix:** `launchApp` now sets `ELECTRON_RUN_AS_NODE: undefined` for the child environment.
- **Files modified:** `e2e/fixtures/electron-app.ts`
- **Verification:** FlashQuery specs and smoke/drag specs boot Electron.
- **Committed in:** `f2c55b3`

**3. [Rule 2 - Missing Critical] Preserved workspace-scoped token access after restart**
- **Found during:** Task 2
- **Issue:** Restored project workspaces generated new IDs and then cleared token storage by syncing sanitized connection metadata.
- **Fix:** Persisted `workspaceId` in project-local workspace state and preserved existing tokens on restored workspace creation.
- **Files modified:** `src/shared/types.ts`, `src/renderer/lib/session.ts`, `src/renderer/stores/appStore.ts`
- **Verification:** Persistence spec proves restored metadata and authenticated MCP POST after restart.
- **Committed in:** `f2c55b3`

**4. [Rule 2 - Missing Critical] Added lazy reconnect trigger for restored vault panels**
- **Found during:** Task 2
- **Issue:** A restored vault panel could remain indefinitely `connecting` because no manager state existed yet.
- **Fix:** Vault panel triggers retry/probe on mount for persisted connecting connections; manager retry hydrates persisted config and IPC rebroadcasts status.
- **Files modified:** `src/renderer/panels/FlashQueryVaultPanel.tsx`, `src/main/flashquery/clientManager.ts`, `src/main/ipc/flashquery.ts`
- **Verification:** Persistence, happy path, retry, and browse E2E specs pass.
- **Committed in:** `f2c55b3`

**5. [Rule 3 - Blocking] Suppressed first-install feedback modal in E2E mode**
- **Found during:** Task 2
- **Issue:** The post-update feedback modal intercepted clicks in fresh E2E userData runs.
- **Fix:** Skipped `checkAndReportUpdate` when `CATE_E2E=1`.
- **Files modified:** `src/main/index.ts`
- **Verification:** Dialog save and subsequent E2E workflows can click reliably.
- **Committed in:** `f2c55b3`

---

**Total deviations:** 5 auto-fixed (3 blocking, 2 missing critical)
**Impact on plan:** All fixes were required to make the planned E2E coverage deterministic and to satisfy REQ-044. No new product surface was added.

## Issues Encountered

- Existing smoke/drag baseline initially booted after the launch fix but exposed stale/fragile drag assertions:
  - `e2e/drag-move.spec.ts:101` expected the removed `data-drag-source` attribute instead of the current drag-store source contract.
  - `e2e/drag-split.spec.ts` used geometric center points that could land outside the viewport after canvas placement/pan settled.
- Both issues were fixed in `915f1ee`; the full existing smoke/drag baseline now passes with its two pre-existing skips.
- Post-wave unit gate exposed that manual retry was leaking the manager status payload through an IPC API typed as `Promise<void>`; fixed in `f6075db` while preserving the status broadcast.

## Known Stubs

None. The FlashQuery server is intentionally a deterministic E2E stub fixture, not product code.

## Threat Flags

None.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 7 Plan 3 can use the new FlashQuery E2E suite and the existing smoke/drag E2E baseline as passing regression gates when completing final milestone verification.

## Self-Check: PASSED

- Summary file exists at `.planning/phases/07-cross-cutting-regression/07-02-SUMMARY.md`.
- Task commits exist: `61b0743`, `5718bd3`, `b10755a`, `f2c55b3`, `530845a`, `4cefc30`.
- Baseline repair commit exists: `915f1ee`.
- Post-wave retry contract fix exists: `f6075db`.
- Key created files exist: `e2e/fixtures/flashquery-server.ts`, `e2e/fixtures/flashquery-server.spec.ts`, `e2e/flashquery-persistence.spec.ts`, `e2e/flashquery-happy-path.spec.ts`, `e2e/flashquery-disconnect.spec.ts`, `e2e/flashquery-vault-browse.spec.ts`.
- Focused FlashQuery E2E verification passed under Node 22.
- Existing smoke/drag baseline passes under Node 22 with 16 passed and 2 skipped.

---
*Phase: 07-cross-cutting-regression*
*Completed: 2026-05-30*
