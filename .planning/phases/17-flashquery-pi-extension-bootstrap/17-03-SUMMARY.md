---
phase: 17-flashquery-pi-extension-bootstrap
plan: 17.3
subsystem: agent
tags: [pi, flashquery, lifecycle, e2e, vitest]
requires:
  - phase: 17.1
    provides: "Bundled cate-flashquery extension installation and workspace-scoped handoff"
  - phase: 17.2
    provides: "Eligible FlashQuery registry discovery, schema translation, and Pi tool registration"
provides:
  - "Workspace-generation FlashQuery client lifecycle with metadata refresh"
  - "Stale-tool reconciliation without Pi provider APIs or runtime monkey-patching"
  - "Old/new in-flight call ownership guarantees across workspace rebind"
  - "T-E-005 startup fixture evidence and T-M-001 real-integration blocker evidence"
affects: [phase-17, phase-18, phase-20, phase-21, pi-agent, flashquery-tools]
tech-stack:
  added: []
  patterns:
    - "Generation-scoped extension lifecycle wrapper owns FlashQuery client and registered tool state"
    - "Pi registerTool map refresh is used for changed/current tools; stale tools reject through wrappers when no unregisterTool API exists"
key-files:
  created:
    - src/agent/extensions/cate-flashquery/lifecycle.ts
    - src/agent/extensions/cate-flashquery/lifecycle.test.ts
    - e2e/flashquery-pi-extension.spec.ts
    - .planning/phases/17-flashquery-pi-extension-bootstrap/17-UAT.md
  modified:
    - src/agent/extensions/cate-flashquery/client.ts
    - src/agent/extensions/cate-flashquery/index.ts
    - src/agent/extensions/cate-flashquery/index.test.ts
    - src/agent/main/installFlashQueryExtension.ts
    - src/agent/main/agentManager.ts
    - e2e/fixtures/flashquery-server.ts
key-decisions:
  - "Use generation-scoped wrappers instead of unsupported Pi unregisterTool APIs; stale calls return a current-workspace unavailable error."
  - "Re-register changed/current tools because Pi 0.75 stores extension tools in a name-keyed map and refreshes the tool registry."
  - "Record T-E-005 Pi tool-list introspection as an E2E harness limitation while proving install and registry fetch in E2E plus tool behavior in unit tests."
patterns-established:
  - "FlashQuery lifecycle metadata fetches registry, models, and purposes together under a last-generation-wins guard."
  - "Retired FlashQuery clients defer close until active old-workspace calls settle, with a timeout fallback."
requirements-completed: [REQ-013, REQ-014]
duration: 64min
completed: 2026-06-04
---

# Phase 17 Plan 17.3: Workspace Lifecycle, Stale Tools, And Evidence Summary

**Workspace-safe FlashQuery Pi lifecycle with stale-tool rejection, refreshed metadata, startup E2E evidence, and documented real-integration blockers**

## Performance

- **Duration:** 64 min
- **Started:** 2026-06-04T13:13:00Z
- **Completed:** 2026-06-04T14:17:33Z
- **Tasks:** 4
- **Files modified:** 10

## Accomplishments

- Added `lifecycle.ts` to own FlashQuery workspace generations, handoff reads, client opens, registry/model/purpose metadata refresh, and shutdown cleanup.
- Preserved old in-flight tool calls on their captured old workspace client while all later calls use the newest workspace generation.
- Implemented stale-tool reconciliation without `unregisterProvider`, unsupported Pi APIs, or Pi internals monkey-patching.
- Added T-E-005 Electron evidence proving the bundled extension installs runtime helper files and fetches the fixture registry at Agent startup.
- Created `17-UAT.md` with T-M-001 real-integration blockers and substitute automated evidence.

## Task Commits

1. **Task 1: Implement workspace rebind and metadata refresh lifecycle** - `f0e572e` (feat)
2. **Task 2: Reconcile stale and changed tools after workspace switch** - `b372234` (test)
3. **Task 3: Add startup E2E fixture evidence for extension install and eligible tools** - `fff1d7c` (feat)
4. **Task 4: Record real-integration T-M-001 manual evidence** - `d32a5dd` (docs)

## Files Created/Modified

- `src/agent/extensions/cate-flashquery/lifecycle.ts` - Generation-safe lifecycle, metadata refresh, stale-tool wrapper behavior, and deferred old-client close.
- `src/agent/extensions/cate-flashquery/lifecycle.test.ts` - T-U-015 coverage for rebind, late response safety, old/new call ownership, stale rejection, changed schema refresh, and new tools.
- `src/agent/extensions/cate-flashquery/client.ts` - Adds model/purpose metadata discovery helpers through FlashQuery MCP tools.
- `src/agent/extensions/cate-flashquery/index.ts` - Delegates lifecycle hooks to the new lifecycle helper.
- `src/agent/extensions/cate-flashquery/index.test.ts` - Updates shutdown/stale behavior expectations and client mocks.
- `src/agent/main/installFlashQueryExtension.ts` - Installs all runtime extension helper modules and excludes tests.
- `src/agent/main/agentManager.ts` - Adds Cate repo `node_modules` to Pi subprocess `NODE_PATH` so workspace-installed bundled extensions resolve app dependencies.
- `e2e/fixtures/flashquery-server.ts` - Adds seeded registry fixture tools.
- `e2e/flashquery-pi-extension.spec.ts` - Adds T-E-005 startup install and registry-fetch E2E.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-UAT.md` - Records T-E-005 evidence and T-M-001 blockers/substitute checks.

## Decisions Made

- Used Pi's supported name-keyed `registerTool` refresh behavior for changed/current tools because no public `unregisterTool` API exists in Pi 0.75.
- Kept stale tools user-safe with generation-scoped execution wrappers that return `not available in the current FlashQuery workspace` after rebind.
- Treated direct Pi advertised-tool introspection as unavailable in the current E2E harness; the plan records install plus registry fetch in E2E and tool availability semantics in unit tests.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Installed all runtime extension helper modules**
- **Found during:** Task 3
- **Issue:** The installer copied only `index.ts` and `package.json`, but the extension imports `client.ts`, `registry.ts`, `schema.ts`, and `lifecycle.ts`; a workspace-installed extension could not load correctly.
- **Fix:** Updated `installFlashQueryExtension` to copy runtime `.ts` files and exclude `.test.ts` files.
- **Files modified:** `src/agent/main/installFlashQueryExtension.ts`
- **Verification:** `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts` passed.
- **Committed in:** `fff1d7c`

**2. [Rule 3 - Blocking] Rebuilt and fixed bundled extension dependency resolution for E2E startup**
- **Found during:** Task 3
- **Issue:** The E2E app launches `dist/main/index.js`; after rebuilding, the extension installed but did not fetch registry metadata until workspace-installed extension dependencies could resolve from Cate's `node_modules`.
- **Fix:** Added Cate app/repo `node_modules` paths to the Pi subprocess `NODE_PATH`.
- **Files modified:** `src/agent/main/agentManager.ts`
- **Verification:** `npm run build` then `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts` passed; final plan verification passed.
- **Committed in:** `fff1d7c`

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 blocking)
**Impact on plan:** Both fixes were required for the installed bundled extension to run in the E2E/workspace subprocess environment. No user-facing scope was added.

## Issues Encountered

- Initial E2E attempts failed before rebuild because Playwright launched stale `dist/main/index.js`; `npm run build` refreshed the app bundle.
- The current E2E harness does not expose Pi's internal advertised tool list, so `17-UAT.md` records the limitation. The E2E still proves extension install plus registry fetch, and unit tests prove eligible/new/changed/stale tool behavior.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: subprocess-module-resolution | `src/agent/main/agentManager.ts` | Pi subprocess environment now includes Cate app/repo `node_modules` in `NODE_PATH` so bundled workspace extensions can resolve app dependencies. |

## Verification

- `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` - passed, 3 tests before Task 2 expansion.
- `npm test -- src/agent/extensions/cate-flashquery/index.test.ts src/agent/extensions/cate-flashquery/lifecycle.test.ts` - passed, 8 tests.
- `npm run build` - passed, required before E2E because Playwright launches `dist/main/index.js`.
- `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts` - passed, 1 test.
- `npm run typecheck` - passed.
- Final plan verification command chain passed: focused unit tests, T-E-005 E2E, and typecheck.

## User Setup Required

Real T-M-001 verification still needs a live FlashQuery HTTP MCP endpoint and a configured native Pi provider. `17-UAT.md` lists the exact remaining manual checks.

## Next Phase Readiness

Phase 18 can build on the generation-safe lifecycle and current-workspace tool wrappers to implement enriched `call_model`, `call_macro`, progress, and diagnostics behavior. Phase 21 should revisit live T-M-001 once provider credentials and a real FlashQuery endpoint are available.

## Self-Check: PASSED

- Key files exist on disk.
- Task commits exist in git history: `f0e572e`, `b372234`, `fff1d7c`, `d32a5dd`.

---
*Phase: 17-flashquery-pi-extension-bootstrap*
*Completed: 2026-06-04*
