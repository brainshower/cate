# Phase 17: FlashQuery Pi Extension Bootstrap - Research

## Research Summary

Phase 17 should extend Cate's existing bundled Pi extension pattern rather than inventing a separate agent integration path. The strongest implementation anchor is `installPlanModeExtension`: it resolves dev and packaged extension source directories, copies raw `.ts` and `package.json` files into `<cwd>/.cate/pi-agent/extensions/<name>`, skips existing user-modified extension files, logs safely, and is called by `AgentManager.create()` after `prepareAgentDir()`.

Pi extension code can register tools dynamically through `pi.registerTool(...)` and can use lifecycle events such as `session_start`, `session_shutdown`, and tool execution callbacks. The public type surface in `node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts` exposes `registerTool` and provider registration/unregistration APIs, but it does not expose an obvious `unregisterTool`. That matters because REQ-014 requires stale FlashQuery tools to disappear on workspace switch. Implementation agents must verify the runtime before choosing a stale-tool strategy.

## Key Findings

### Bundled Extension Installation

- `src/agent/main/installPlanMode.ts` is the installer template. It copies `index.ts` and `package.json` from `src/agent/extensions/cate-plan-mode` in dev or `process.resourcesPath/cate-extensions/cate-plan-mode` in production.
- `src/agent/main/agentManager.ts` calls `prepareAgentDir(opts.cwd)`, `installSubagentExtension(opts.cwd)`, and `installPlanModeExtension(opts.cwd)` before spawning Pi.
- `src/agent/main/agentDir.ts` scopes Pi config to `<cwd>/.cate/pi-agent` through `PI_CODING_AGENT_DIR`. The workspace directory has a `.gitignore` containing `*`, which is the correct location for workspace-scoped, non-VCS FlashQuery handoff metadata.

### Pi Extension Surface

- `src/agent/extensions/cate-plan-mode/index.ts` imports `ExtensionAPI` and registers commands, hooks, and tools.
- Pi examples show dynamic tool registration with `pi.registerTool` during `session_start`.
- `ToolDefinition.execute(toolCallId, params, signal, onUpdate, ctx)` returns an `AgentToolResult` with `content` and optional `details`.
- The public extension typings expose `registerProvider` and `unregisterProvider`; FlashQuery must not use either for Phase 17.
- No public `unregisterTool` appeared in the inspected type surface. Stale-tool removal requires either a supported runtime/session rebinding path, a proved non-public-but-supported API, or a wrapper strategy that stops advertising/executing stale tools after registry refresh.

### FlashQuery Existing State

- Workspace FlashQuery connection metadata already exists on shared workspace/session types and renderer/main IPC surfaces from earlier phases.
- Renderer code must not see bearer tokens. Existing FlashQuery privileged work goes through main/preload IPC and `FlashQueryClientManager`.
- Phase 17 can introduce main-owned handoff material for Pi extension startup, but should keep secrets in the workspace-scoped Pi agent dir and outside project-local persisted workspace JSON. Current bearer-token storage is `src/main/flashquery/credentials.ts`; workspace JSON should be treated as URL/config metadata, not the token source.

## Validation Architecture

Validation should prove three independent surfaces:

1. Installer behavior: extension files are copied idempotently in dev/prod path layouts, and `AgentManager.create()` still installs subagent and plan-mode extensions.
2. Extension registry behavior: mocked FlashQuery registry data preserves plain host-filtered `tools/list` records, produces Pi tools for enriched records only when `hostEligible: true` and status is `final`, `transitional`, or legacy `current`, includes native and brokered MCP tools, translates schemas, and never calls `registerProvider`.
3. Workspace lifecycle behavior: a workspace rebind reconnects the MCP client, refreshes metadata, prevents stale tools from being offered/executed after refresh, registers changed tools, and lets an old in-flight call finish on the old client.

## Recommended Plan Shape

- Plan 17.1: installer and workspace-scoped credential handoff.
- Plan 17.2: extension registry discovery, schema translation, eligible tool registration, no-provider guard.
- Plan 17.3: workspace rebind/stale-tool lifecycle plus E2E/manual evidence.

## Risks

- **Stale tool removal API ambiguity:** Pi's public types do not show `unregisterTool`. The executor must verify the current runtime. If removal is unsupported, use a session/runtime rebind or stable wrapper approach that meets the user-visible requirement without monkey-patching provider APIs.
- **Credential leakage:** The easiest handoff is an env var, but tests must prove bearer tokens do not land in Pi global `auth.json`, renderer state, or VCS-friendly project files.
- **Scope creep into Phase 18:** Registering `call_model` and `call_macro` shells is Phase 17; their detailed descriptions, trace IDs, progress handling, and diagnostics are Phase 18.

## Research Complete

Phase 17 can be planned without further product questions. Implementation agents should treat the two milestone documents as mandatory source-of-truth inputs.
