---
phase: 17-flashquery-pi-extension-bootstrap
verified: 2026-06-04T14:42:44Z
status: passed
score: 10/10 must-haves verified
overrides_applied: 0
---

# Phase 17: FlashQuery Pi Extension Bootstrap Verification Report

**Phase Goal:** Install a bundled Cate FlashQuery Pi extension and register eligible FlashQuery tools with workspace-aware lifecycle handling.
**Verified:** 2026-06-04T14:42:44Z
**Status:** passed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bundled `src/agent/extensions/cate-flashquery/` exists and follows Pi extension patterns. | VERIFIED | `package.json` is private, named `cate-flashquery`, and declares `pi.extensions: ["./index.ts"]`; `index.ts` imports `ExtensionAPI` and registers lifecycle hooks only. |
| 2 | Installer mirrors bundled extension install patterns and is called by `AgentManager.create()` without disrupting existing installers. | VERIFIED | `installFlashQueryExtension.ts` resolves dev/prod sources, installs a managed bundle, retries failed installs, and caches successful workspace installs; `AgentManager.create()` calls prepare, subagent, plan-mode, FlashQuery install, handoff, then `RpcClient`. |
| 3 | FlashQuery credentials are workspace-scoped and not written to Pi global/shared provider `auth.json`. | VERIFIED | Handoff writes only `<cwd>/.cate/pi-agent/flashquery-handoff.json`; token is read from `getWorkspaceToken(workspaceId)` after sanitized workspace URL lookup; tests prove no fabricated token and no `auth.json` token write. |
| 4 | Tool registration includes only `hostEligible: true` and `status: current` tools. | VERIFIED | `registry.ts` requires current status plus top-level or metadata `hostEligible === true`; unit tests cover current, deprecated, unavailable, removed, hidden, and missing-hostEligible records. |
| 5 | Eligible tools include `call_model`, `call_macro`, `search_tools`, FlashQuery-native tools, and brokered MCP tools. | VERIFIED | `registry.test.ts` and `index.test.ts` register all listed categories, including `source: "brokered_mcp"` with original `toolId` preserved. |
| 6 | Registered tools delegate execution through the current FlashQuery MCP client. | VERIFIED | `client.ts` uses MCP HTTP `listTools` and `callTool`; `index.test.ts` proves Pi tool execution calls the mocked FlashQuery client with the original registry tool identifier and supplied params. |
| 7 | Workspace switch reconnects the FlashQuery client, refreshes registry/model/purpose metadata, unregisters or removes stale tools, and protects in-flight old calls. | VERIFIED | `lifecycle.ts` uses generation IDs, metadata fetches, stale wrapper invalidation, and deferred old-client close; `lifecycle.test.ts` covers reconnect, late old response safety, model/purpose refresh, stale rejection, changed/new tools, failed rebind invalidation, and old/new call ownership. |
| 8 | FlashQuery is absent from ProvidersView and is not registered as a Pi provider. | VERIFIED | `index.ts` has no `registerProvider`; static check verifies no `provider/id: "flashquery"` row in `ProvidersView.tsx`; tests assert provider APIs are not called. |
| 9 | Targeted coverage includes T-U-013, T-U-014, T-U-015, T-E-005, and T-M-001 evidence. | VERIFIED | Focused unit command passed 27 tests across installer, AgentManager, registry, schema, index, and lifecycle. Orchestrator evidence records full `npm test`, `npm run test:e2e`, `npm run typecheck`, and `npm run build` all passed. T-E-005 E2E file exists and records `tools/list`; T-M-001 is explicitly blocked with substitute evidence in `17-UAT.md` as allowed by Plan 17.3. |
| 10 | Downstream implementation plans required the Milestone 2 requirements and test plan before source/test work. | VERIFIED | The external requirement and test-plan files exist; all 17.1, 17.2, and 17.3 tasks include them in `<read_first>`. This verifies the auditable planning contract; actual agent reading cannot be proven beyond plan and summary artifacts. |

**Score:** 10/10 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/agent/main/installFlashQueryExtension.ts` | Installer and workspace handoff | VERIFIED | SDK artifact check passed; substantive source resolution, bundle copy, version marker, handoff, chmod, and warning paths present. |
| `src/agent/main/agentManager.ts` | Startup integration | VERIFIED | Imports and awaits FlashQuery install/handoff before `RpcClient`; existing subagent/plan-mode installs remain. |
| `src/agent/extensions/cate-flashquery/package.json` | Pi extension manifest | VERIFIED | Name/private/pi extension manifest present. |
| `src/agent/extensions/cate-flashquery/index.ts` | Pi extension entry point | VERIFIED | Hooks session start/shutdown into lifecycle; no provider registration. |
| `src/agent/extensions/cate-flashquery/registry.ts` | Eligibility, metadata, naming | VERIFIED | Filters current host-eligible tools and preserves native/brokered metadata. |
| `src/agent/extensions/cate-flashquery/schema.ts` | MCP schema to TypeBox | VERIFIED | Supports required/optional primitives, arrays, enums, nullable, descriptions, and safe object fallback. |
| `src/agent/extensions/cate-flashquery/client.ts` | FlashQuery MCP adapter | VERIFIED | Reads handoff, opens Streamable HTTP MCP client, lists tools/models/purposes, dispatches tool calls, closes client. |
| `src/agent/extensions/cate-flashquery/lifecycle.ts` | Workspace lifecycle and stale-tool behavior | VERIFIED | Generation-safe rebind, stale invalidation, old in-flight ownership, and retired-client cleanup implemented. |
| `e2e/fixtures/flashquery-server.ts` | Registry-capable E2E fixture | VERIFIED | Seeds registry tools, enforces bearer auth, records MCP JSON-RPC methods. |
| `e2e/flashquery-pi-extension.spec.ts` | T-E-005 startup fixture | VERIFIED | Verifies installed runtime extension files and observed MCP `tools/list` request. |
| `.planning/phases/17-flashquery-pi-extension-bootstrap/17-UAT.md` | T-M-001 evidence/blockers | VERIFIED | Records live integration blockers, substitute checks, skipped manual checks, and remaining manual verification. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `installFlashQueryExtension.ts` | REQ-013 | Installer + handoff | WIRED | Installer source and tests implement bundled extension initialization with workspace credentials. |
| `agentManager.ts` | `installFlashQueryExtension.ts` | Import/await in `create()` | WIRED | Startup ordering verified by source and `agentManager.test.ts`. |
| `registry.ts` | REQ-014 | `hostEligible` and current filter | WIRED | Source contains filter and tests cover eligible/ineligible records. |
| `index.ts` | `client.ts`/`lifecycle.ts` | Session hooks and lifecycle factory | WIRED | `session_start` calls `lifecycle.rebind`; lifecycle opens client and publishes tools. |
| `lifecycle.ts` | `registry.ts`/`schema.ts` | Candidate normalization and TypeBox parameters | WIRED | `publishTools` maps candidates to `pi.registerTool` with translated parameters. |
| `e2e/flashquery-pi-extension.spec.ts` | T-E-005 fixture server | Startup install and `tools/list` | WIRED | Spec seeds eligible/ineligible registry tools and asserts installed files plus fixture MCP request. |

Note: `gsd-sdk verify.key-links` failed several literal phrase checks (`idempotently`, `does not register a provider`, `workspace switch reconnects`, `eligible fixture tools become Pi tools`) because the implementation uses equivalent test titles/assertions rather than those exact strings. Manual key-link review above verifies the actual wiring and behavior.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `installFlashQueryExtension.ts` | handoff `endpointUrl`/`bearerToken` | `listWorkspaces()` plus `getWorkspaceToken(workspaceId)` | Yes | FLOWING |
| `client.ts` | registry records | MCP `client.listTools()` | Yes | FLOWING |
| `client.ts` | model/purpose metadata | MCP `callTool(list_models/list_purposes)` | Yes | FLOWING |
| `lifecycle.ts` | `generation.candidates` | `registryRecordsToToolCandidates(records)` | Yes | FLOWING |
| `lifecycle.ts` | registered Pi tool execution | Captured generation client `callTool(toolId, params)` | Yes | FLOWING |
| `e2e/flashquery-pi-extension.spec.ts` | fixture registry | `server.seedRegistryTools()` and MCP `tools/list` | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Focused Phase 17 unit coverage | `npm test -- src/agent/main/installFlashQueryExtension.test.ts src/agent/main/agentManager.test.ts src/agent/extensions/cate-flashquery/registry.test.ts src/agent/extensions/cate-flashquery/schema.test.ts src/agent/extensions/cate-flashquery/index.test.ts src/agent/extensions/cate-flashquery/lifecycle.test.ts` | 6 files, 27 tests passed | PASS |
| Provider absence | Static Node check over `index.ts` and `ProvidersView.tsx` | `provider absence verified` | PASS |
| Debt marker blocker scan | Static Node check over touched source/E2E files | `no blocker debt markers` | PASS |
| Full automated gates | Orchestrator-provided fresh evidence | `npm test` 75 files/705 passed/3 skipped; `npm run test:e2e` 44 passed/2 skipped; typecheck passed; build passed | PASS |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| Conventional probes | `find scripts -path '*/tests/probe-*.sh' -type f` | No probes found | SKIPPED |
| Phase-declared probes | grep phase plans/summaries for `probe-*.sh` | None declared | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| REQ-013 | 17.1, 17.2, 17.3 | Cate installs and initializes bundled `cate-flashquery` Pi extension with workspace-scoped FlashQuery credentials. | SATISFIED | Installer, manifest, AgentManager startup, handoff writer, client reader, T-U-013 tests, and T-E-005 install evidence. |
| REQ-014 | 17.2, 17.3 | User can access eligible current FlashQuery MCP tools as Pi tools, including native and brokered tools, while FlashQuery is not a provider. | SATISFIED | Registry/schema/index/lifecycle implementation and tests verify eligibility, brokered MCP inclusion, dispatch, stale behavior, and provider absence. |

No orphaned Phase 17 requirements were found in `.planning/REQUIREMENTS.md`; REQ-013 and REQ-014 are the only Phase 17 entries.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No unreferenced `TBD`, `FIXME`, or `XXX` markers in touched Phase 17 source/E2E files. Non-blocking `placeholder` attributes in `ProvidersView.tsx` are normal UI input placeholders. |

### Human Verification Required

None for phase closure. Plan 17.3 and `17-VALIDATION.md` explicitly allow T-M-001 to be recorded as blocked with rationale and substitute automated evidence when live FlashQuery/Pi provider credentials are unavailable. `17-UAT.md` does that with concrete remaining manual checks, so this does not force `human_needed` for Phase 17.

### Gaps Summary

No blocking gaps found. The only live-real-integration limitation is documented T-M-001 coverage, which the phase plan allowed to close with explicit blockers and substitute evidence. Later Phase 21 covers cross-surface hardening and broader live workspace-switch regression, but no Phase 17 must-have is deferred.

---

_Verified: 2026-06-04T14:42:44Z_
_Verifier: the agent (gsd-verifier)_
