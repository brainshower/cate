# Phase 17: FlashQuery Pi Extension Bootstrap - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning
**Source:** Product source docs supplied by project owner

<domain>
## Phase Boundary

Phase 17 installs and bootstraps Cate's bundled FlashQuery Pi extension for REQ-013 and REQ-014. It owns bundled extension source, installer integration, workspace-scoped FlashQuery credential handoff, MCP client lifecycle, registry discovery, schema translation, Pi tool registration, stale tool reconciliation, and proof that FlashQuery is not treated as a Pi provider.

This phase does not implement `call_model`/`call_macro` behavior, Pi ToolCard rendering, `@` mention autocomplete, or clipboard utilities. It may register `call_model`, `call_macro`, `search_tools`, native FlashQuery tools, and brokered MCP tools as eligible tool shells, but Phase 18 owns their rich invocation behavior and diagnostics.
</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Documents
- D-01 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` before touching Phase 17 source.
- D-02 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` before touching Phase 17 tests.
- D-03 [locked]: The product documents above are the primary source for REQ-013, REQ-014, T-U-013, T-U-014, T-U-015, T-E-005, and T-M-001.

### Scope and Boundaries
- D-04 [locked]: Add bundled extension source under `src/agent/extensions/cate-flashquery/`.
- D-05 [locked]: Add `src/agent/main/installFlashQueryExtension.ts` mirroring `installPlanModeExtension` dev/prod source resolution, skip-if-exists behavior, and idempotent per-workspace install cache.
- D-06 [locked]: `AgentManager.create()` installs the FlashQuery extension alongside subagent and plan-mode extensions without disrupting existing extension installs.
- D-07 [locked]: Cate main owns installation and credential handoff. The extension owns MCP client connection, registry discovery, schema translation, registration, workspace rebinding, invocation dispatch, and FlashQuery progress subscriptions.
- D-08 [locked]: FlashQuery credentials are Cate-provided and workspace-scoped. Workspace metadata stores the normalized FlashQuery URL; bearer tokens live in main-process `src/main/flashquery/credentials.ts` via electron-store. Do not write FlashQuery credentials into Pi global `auth.json`.
- D-09 [locked]: FlashQuery must not be registered as a Pi provider and must not appear in `ProvidersView`.

### Tool Eligibility and Registration
- D-10 [locked]: Register plain host-filtered FlashQuery `tools/list` records without eligibility metadata. When eligibility metadata is present, register only records with `hostEligible: true` and `status: final`, `status: transitional`, or legacy `status: current`.
- D-11 [locked]: Eligible tools explicitly include FlashQuery-native tools, brokered MCP tools, `call_model`, `call_macro`, and `search_tools`.
- D-12 [locked]: Unavailable, deprecated, non-current, or non-host-eligible tools must not be registered.
- D-13 [locked]: Tool schemas must be translated to Pi `TypeBox` parameter schemas or another Pi-supported equivalent before `pi.registerTool`.
- D-14 [locked]: Registered Pi tool execution delegates to the current workspace's FlashQuery MCP client and returns standard Pi tool results with text content and structured details where available.

### Workspace Lifecycle
- D-15 [locked]: Workspace switch reconnects the FlashQuery MCP client to the new workspace endpoint and refreshes registry/model/purpose metadata.
- D-16 [locked]: Tool definitions that disappear or become ineligible on workspace switch must become unavailable to subsequent calls. In-flight calls from the old workspace may complete against the old client.
- D-17 [locked]: Because Pi 0.75 public extension typings expose `registerTool` and `unregisterProvider` but no obvious `unregisterTool`, implementation agents MUST verify the current Pi runtime before choosing stale-tool removal mechanics. If no supported unregister-tool API exists, satisfy D-16 by using a supported runtime/session rebinding strategy or stable wrappers that stop advertising stale tools after refresh; do not use provider APIs as a tool-removal hack.

### Testing
- D-18 [locked]: T-U-013 covers installer idempotency in dev/prod layouts and proves `AgentManager.create()` invokes the installer without disrupting existing extension installs.
- D-19 [locked]: T-U-014 covers registry filtering, schema translation, brokered MCP inclusion, deprecated/unavailable skipping, and no provider registration.
- D-20 [locked]: T-U-015 covers workspace reconnect, metadata refresh, stale-tool reconciliation, changed-tool registration, and old in-flight calls completing.
- D-21 [locked]: T-E-005 covers startup installation and eligible fixture tools becoming Pi tools where feasible with mocked agent/FlashQuery fixtures.
- D-22 [locked]: T-M-001 is required real-integration evidence for native and brokered tool registration, stale-tool removal after workspace switch, and absence from ProvidersView.

### The Agent's Discretion
- The exact FlashQuery MCP client package/helper is discretionary; agents should prefer an existing FlashQuery transport/helper if present and otherwise add a small extension-local client that is easy to mock.
- The exact credential handoff mechanism is discretionary if it remains workspace-scoped, avoids renderer exposure, avoids Pi global `auth.json`, and is covered by tests.
- The exact E2E fixture strategy is discretionary if T-E-005 is feasible without live FlashQuery credentials and skipped portions are recorded when not feasible.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Sources
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Source of truth for REQ-013 and REQ-014.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Source of truth for T-U-013, T-U-014, T-U-015, T-E-005, and T-M-001.

### Cate Planning Sources
- `.planning/REQUIREMENTS.md` - Cate v1.2 requirement index and traceability.
- `.planning/ROADMAP.md` - Phase 17 goal, success criteria, and mapped requirement IDs.
- `.planning/STATE.md` - Current milestone state and decision history.
- `.planning/phases/14-shared-flashquery-contracts-and-ipc/14-CONTEXT.md` - Workspace-scoped FlashQuery credential/security constraints.
- `.planning/phases/14-shared-flashquery-contracts-and-ipc/14-01-SUMMARY.md` - Shared FlashQuery connection type and IPC closeout.
- `.planning/phases/16-vault-search-panel/16-CONTEXT.md` - Prior milestone-source-doc downstream-agent instruction pattern.

### Current Code Sources
- `src/agent/main/installPlanMode.ts` - Bundled extension installer pattern to mirror.
- `src/agent/main/agentManager.ts` - Pi RPC lifecycle and bundled extension installation call site.
- `src/agent/main/agentDir.ts` - Workspace-scoped Pi agent directory and auth mirroring pattern.
- `src/main/flashquery/credentials.ts` - Main-process workspace token store; Phase 17 handoff must read bearer tokens from here instead of from renderer-visible workspace JSON.
- `src/main/flashquery/credentials.test.ts` - Current token isolation and delete behavior tests.
- `src/agent/extensions/cate-plan-mode/index.ts` - Current Cate bundled Pi extension pattern.
- `src/agent/extensions/cate-plan-mode/package.json` - Pi extension package manifest pattern.
- `node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts` - Current Pi extension API surface, including `registerTool`, lifecycle events, and provider APIs.
- `node_modules/@earendil-works/pi-coding-agent/examples/extensions/dynamic-tools.ts` - Dynamic `registerTool` example.
- `node_modules/@earendil-works/pi-coding-agent/examples/extensions/custom-provider-gitlab-duo/index.ts` - Provider-registration example to avoid for FlashQuery.
- `src/main/ipc/flashquery.ts` and `src/main/flashquery/clientManager.ts` - Existing FlashQuery connection/transport behavior and safe renderer boundary.
- `src/agent/renderer/ProvidersView.tsx` - Surface that must not gain a FlashQuery provider entry.
</canonical_refs>

<specifics>
## Specific Ideas

- Add `src/agent/extensions/cate-flashquery/index.ts`, `src/agent/extensions/cate-flashquery/package.json`, and focused extension-local helpers for registry normalization, schema translation, connection lifecycle, and tool execution.
- Add `src/agent/main/installFlashQueryExtension.ts` and `src/agent/main/installFlashQueryExtension.test.ts`.
- Update `AgentManager.create()` to call `installFlashQueryExtension(opts.cwd)` after `installPlanModeExtension(opts.cwd)` or adjacent to other bundled extension installs.
- Pass FlashQuery workspace connection metadata to the Pi extension through a workspace-scoped file or environment variable under `<cwd>/.cate/pi-agent/`, not through global Pi auth. If a file is used, write it with a restrictive `.gitignore`-protected location. The URL comes from sanitized workspace metadata; the bearer token, when present, comes from `getWorkspaceToken(workspaceId)`. Never include bearer tokens in project-local VCS-friendly `.cate/workspace.json`.
- In extension tests, mock a registry containing `call_model`, `call_macro`, `search_tools`, a native document tool, a brokered MCP tool, a deprecated tool, an unavailable tool, and a non-host-eligible tool.
- In workspace-switch tests, use a slow old-workspace call and assert it resolves through the old client while subsequent calls use the new client/registry.
</specifics>

<deferred>
## Deferred Ideas

- `call_model` purpose/model description enrichment and trace behavior are Phase 18.
- `call_macro` progress, confirmation, and trace behavior are Phase 18.
- FlashQuery ToolCard rendering is Phase 19.
- Pi `@` mentions and vault-index cache are Phase 20.
- Milestone-wide cross-surface hardening is Phase 21.
</deferred>

---

*Phase: 17-flashquery-pi-extension-bootstrap*
*Context gathered: 2026-06-04*
