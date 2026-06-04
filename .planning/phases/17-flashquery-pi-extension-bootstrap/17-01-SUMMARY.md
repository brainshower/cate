---
phase: 17-flashquery-pi-extension-bootstrap
plan: 17.1
subsystem: agent
tags: [pi, flashquery, extension, credentials, vitest]
requires:
  - phase: 14-shared-flashquery-contracts-and-ipc
    provides: "Sanitized workspace FlashQuery connection metadata and main-process token storage"
provides:
  - "Bundled cate-flashquery Pi extension scaffold"
  - "Idempotent FlashQuery extension installer with dev/prod source resolution"
  - "Workspace-scoped FlashQuery handoff under .cate/pi-agent"
affects: [phase-17, phase-18, pi-agent, flashquery-tools]
tech-stack:
  added: []
  patterns:
    - "Bundled Pi extension installer mirrors installPlanModeExtension"
    - "FlashQuery bearer tokens are read from main-process credential storage for workspace handoff"
key-files:
  created:
    - src/agent/extensions/cate-flashquery/index.ts
    - src/agent/extensions/cate-flashquery/package.json
    - src/agent/main/installFlashQueryExtension.ts
    - src/agent/main/installFlashQueryExtension.test.ts
    - src/agent/main/agentManager.test.ts
  modified:
    - src/agent/main/agentManager.ts
key-decisions:
  - "Keep FlashQuery out of Pi provider registration; the bundled extension starts as lifecycle-only scaffold."
  - "Write FlashQuery handoff to workspace-scoped .cate/pi-agent/flashquery-handoff.json instead of Pi auth.json."
  - "Resolve bearer tokens only through getWorkspaceToken(workspaceId), never renderer-visible workspace metadata."
patterns-established:
  - "FlashQuery extension installation uses dev src first, packaged cate-extensions second, and skip-if-exists copy semantics."
  - "AgentManager startup order remains prepareAgentDir -> subagent -> plan-mode -> flashquery -> RpcClient."
requirements-completed: [REQ-013]
duration: 8min
completed: 2026-06-04
---

# Phase 17 Plan 17.1: Bundled Extension Install And Workspace Handoff Summary

**Bundled cate-flashquery Pi extension installation with workspace-scoped FlashQuery handoff and token-boundary tests**

## Performance

- **Duration:** 8 min
- **Started:** 2026-06-04T13:38:11Z
- **Completed:** 2026-06-04T13:45:31Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added `src/agent/extensions/cate-flashquery/` with a private Pi package manifest and lifecycle hook scaffold.
- Added `installFlashQueryExtension(cwd)` with idempotent dev/prod source resolution, skip-existing behavior, and non-throwing warnings.
- Added `writeFlashQueryExtensionHandoff(cwd, workspaceId)` to write sanitized endpoint metadata plus optional main-process bearer token under `.cate/pi-agent/`.
- Wired `AgentManager.create()` to install cate-flashquery and write handoff before constructing `RpcClient`, preserving existing subagent and plan-mode installs.
- Added focused T-U-013 coverage for installer behavior, AgentManager startup integration, token source, no token fabrication, and no FlashQuery token write to `auth.json`.

## Task Commits

1. **Task 1: Add cate-flashquery bundled extension skeleton** - `89166ac` (feat)
2. **Task 2: Implement idempotent FlashQuery extension installer** - `21377c0` (feat)
3. **Task 3: Install FlashQuery extension during AgentManager startup and add workspace handoff** - `697d908` (feat)

## Files Created/Modified

- `src/agent/extensions/cate-flashquery/index.ts` - Initial Pi extension entry point with `session_start` and `session_shutdown` lifecycle hooks.
- `src/agent/extensions/cate-flashquery/package.json` - Private Pi extension manifest named `cate-flashquery`.
- `src/agent/main/installFlashQueryExtension.ts` - Installer and workspace handoff writer.
- `src/agent/main/installFlashQueryExtension.test.ts` - Installer and credential-boundary coverage.
- `src/agent/main/agentManager.ts` - Startup integration for install and handoff before Pi RPC spawn.
- `src/agent/main/agentManager.test.ts` - AgentManager startup ordering and handoff invocation test.

## Decisions Made

- Kept the extension lifecycle-only in this plan; tool registry discovery, schema translation, and stale-tool handling remain in later Phase 17 plans.
- Used a workspace-scoped handoff file at `.cate/pi-agent/flashquery-handoff.json`; `.cate/pi-agent` is already gitignored by `prepareAgentDir`.
- Kept FlashQuery bearer lookup in main process via `getWorkspaceToken(workspaceId)` and did not write token material to Pi `auth.json`.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

- `src/agent/extensions/cate-flashquery/index.ts` has intentionally empty `session_start` and `session_shutdown` hook bodies. Plan 17.2 wires registry discovery/tool registration and Plan 17.3 wires lifecycle rebinding/disposal.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: credential-handoff | `src/agent/main/installFlashQueryExtension.ts` | New workspace-scoped handoff file can include a bearer token when one exists for the workspace; tests verify it is sourced from main credentials and not written to Pi `auth.json`. |

## Issues Encountered

- Initial patch application targeted the adjacent FlashQuery repo path instead of Cate. The misplaced uncommitted files were removed immediately, then the same files were added under the Cate repo and verified before any commit.

## Verification

- `npm test -- src/agent/main/installFlashQueryExtension.test.ts src/agent/main/agentManager.test.ts` - passed, 10 tests.
- `npm run typecheck` - passed.
- `rg -n "registerProvider|call_model|call_macro" src/agent/extensions/cate-flashquery src/agent/main/installFlashQueryExtension.ts src/agent/main/agentManager.ts` - no matches.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 17.2 can build on the installed `cate-flashquery` extension and consume `.cate/pi-agent/flashquery-handoff.json` for workspace endpoint/token data. The provider boundary is preserved: FlashQuery has not been registered as a Pi provider or ProvidersView entry.

## Self-Check: PASSED

- Key files exist on disk.
- Task commits exist in git history: `89166ac`, `21377c0`, `697d908`.

---
*Phase: 17-flashquery-pi-extension-bootstrap*
*Completed: 2026-06-04*
