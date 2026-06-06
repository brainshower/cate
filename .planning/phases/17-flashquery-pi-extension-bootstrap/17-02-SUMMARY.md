---
phase: 17-flashquery-pi-extension-bootstrap
plan: 17.2
subsystem: agent
tags: [pi, flashquery, mcp, registry, typebox, vitest]
requires:
  - phase: 17.1
    provides: "Bundled cate-flashquery extension installation and workspace-scoped FlashQuery handoff"
provides:
  - "FlashQuery registry normalization and host-eligible current-status filtering"
  - "Pi-safe TypeBox schema translation for FlashQuery MCP tool schemas"
  - "session_start registration of eligible native and brokered FlashQuery tools"
  - "FlashQuery tool execution dispatch through the current workspace MCP client"
  - "Tests proving FlashQuery is not registered or rendered as a Pi provider"
affects: [phase-17, phase-18, pi-agent, flashquery-tools]
tech-stack:
  added: []
  patterns:
    - "Extension-local pure helpers for registry filtering and schema translation"
    - "Mockable cate-flashquery extension factory for Pi lifecycle tests"
key-files:
  created:
    - src/agent/extensions/cate-flashquery/registry.ts
    - src/agent/extensions/cate-flashquery/registry.test.ts
    - src/agent/extensions/cate-flashquery/schema.ts
    - src/agent/extensions/cate-flashquery/schema.test.ts
    - src/agent/extensions/cate-flashquery/client.ts
    - src/agent/extensions/cate-flashquery/index.test.ts
  modified:
    - src/agent/extensions/cate-flashquery/index.ts
key-decisions:
  - "Use MCP listTools metadata as the extension registry source, preserving FlashQuery-specific hostEligible/status/source fields when present."
  - "Keep malformed or unknown FlashQuery schemas registration-safe with a permissive object TypeBox fallback."
  - "Register FlashQuery as Pi tools only; no provider API calls and no ProvidersView entry."
patterns-established:
  - "registryRecordsToToolCandidates centralizes plain host-filtered record handling, enriched hostEligible/current-status filtering, and deterministic Pi tool naming."
  - "flashQuerySchemaToTypeBox translates MCP JSON schemas without throwing during registration."
  - "createCateFlashQueryExtension accepts injectable handoff/client dependencies for deterministic Pi extension tests."
requirements-completed: [REQ-014]
duration: 9min
completed: 2026-06-04
---

# Phase 17 Plan 17.2: Registry Discovery And Eligible Tool Registration Summary

**Host-eligible current FlashQuery MCP tools register as Pi TypeBox tools and dispatch through the workspace FlashQuery client without provider registration**

## Performance

- **Duration:** 9 min
- **Started:** 2026-06-04T13:51:22Z
- **Completed:** 2026-06-04T13:59:40Z
- **Tasks:** 4
- **Files modified:** 7

## Accomplishments

- Added `registry.ts` to preserve real host-filtered `tools/list` records, filter enriched FlashQuery records to `hostEligible: true` and current statuses (`final` / `transitional`, with legacy `current` compatibility), preserve native/brokered metadata, and normalize deterministic Pi-safe tool names.
- Added `schema.ts` to translate FlashQuery/MCP object schemas into Pi-compatible TypeBox schemas with required, optional, enum, nullable, array, numeric, boolean, and permissive fallback behavior.
- Added `client.ts` and wired `index.ts` so `session_start` reads the 17.1 handoff, opens the current workspace MCP client, lists registry tools, registers eligible candidates, and dispatches executions by original FlashQuery tool ID.
- Added focused T-U-014 tests covering eligible `call_model`, `call_macro`, `search_tools`, native tools, brokered MCP tools, ineligible filtering, schema translation, dispatch, disconnected results, and provider absence.

## Task Commits

1. **Task 1: Build registry normalization and eligibility filtering** - `0f40311` (feat)
2. **Task 2: Translate registry schemas to Pi parameter schemas** - `bbf64eb` (feat)
3. **Task 3: Register eligible FlashQuery tools and dispatch through current client** - `16c61c9` (feat)
4. **Task 4: Assert FlashQuery is absent from provider surfaces** - `8869863` (test)

## Files Created/Modified

- `src/agent/extensions/cate-flashquery/registry.ts` - Registry record type, eligibility filtering, Pi-safe naming, collision handling, and candidate stale comparison helper.
- `src/agent/extensions/cate-flashquery/registry.test.ts` - T-U-014 registry coverage for current eligible tools, brokered MCP inclusion, ineligible filtering, and stable collisions.
- `src/agent/extensions/cate-flashquery/schema.ts` - FlashQuery/MCP JSON schema to TypeBox translation with safe fallback behavior.
- `src/agent/extensions/cate-flashquery/schema.test.ts` - T-U-014 schema coverage for required/optional fields, primitives, arrays, enums, nullable fields, descriptions, and malformed fallback.
- `src/agent/extensions/cate-flashquery/client.ts` - Workspace handoff reader and MCP client adapter for listing tools and dispatching calls.
- `src/agent/extensions/cate-flashquery/index.ts` - Pi extension lifecycle wiring for eligible tool registration, dispatch, disconnected errors, and client cleanup.
- `src/agent/extensions/cate-flashquery/index.test.ts` - T-U-014 extension coverage for registration, filtering, original tool ID dispatch, disconnected behavior, and no-provider guarantees.

## Decisions Made

- Used `listTools()` metadata as the registry source for Phase 17.2. This keeps the extension aligned with the host-visible MCP surface while preserving FlashQuery-specific `metadata`/`_meta` fields for eligibility.
- Deferred stale tool unregister/rebind mechanics to Plan 17.3 because Pi 0.75 public extension typings still do not expose `unregisterTool`.
- Treated `call_model`, `call_macro`, and `search_tools` as ordinary eligible tools in this plan; Phase 18 owns enriched descriptions, traces, macro progress, and diagnostics rendering.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Issues Encountered

- Initial `registry.ts` and `registry.test.ts` patch landed in the adjacent FlashQuery repo because the edit tool default root was still `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery`. The misplaced files were removed immediately and the same patch was reapplied using absolute Cate repo paths before any Cate task commit.

## Verification

- `npm test -- src/agent/extensions/cate-flashquery/registry.test.ts` - passed, 4 tests.
- `npm test -- src/agent/extensions/cate-flashquery/schema.test.ts` - passed, 3 tests.
- `npm test -- src/agent/extensions/cate-flashquery/index.test.ts` - passed, 4 tests.
- `npm test -- src/agent/extensions/cate-flashquery/registry.test.ts src/agent/extensions/cate-flashquery/schema.test.ts src/agent/extensions/cate-flashquery/index.test.ts` - passed, 11 tests.
- `npm run typecheck` - passed.
- `! rg -n "registerProvider" src/agent/extensions/cate-flashquery/index.ts` - passed.
- `! rg -n "provider\\s*[:=]\\s*['\\\"]flashquery['\\\"]|id\\s*[:=]\\s*['\\\"]flashquery['\\\"]" src/agent/renderer/ProvidersView.tsx` - passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 17.3 can build on the registered tool wrappers and client handoff to implement workspace rebind/stale-tool lifecycle behavior and gather T-E-005/T-M-001 evidence. The provider boundary remains preserved: FlashQuery is exposed through Pi tools only.

## Self-Check: PASSED

- Key files exist on disk.
- Task commits exist in git history: `0f40311`, `bbf64eb`, `16c61c9`, `8869863`.

---
*Phase: 17-flashquery-pi-extension-bootstrap*
*Completed: 2026-06-04*
