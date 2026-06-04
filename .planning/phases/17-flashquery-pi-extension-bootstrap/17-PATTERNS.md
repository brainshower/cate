# Phase 17: FlashQuery Pi Extension Bootstrap - Patterns

## Pattern Map

| Role | Files | Existing Pattern To Reuse |
|------|-------|---------------------------|
| Bundled extension installer | `src/agent/main/installPlanMode.ts` | Resolve dev and production extension source dirs, copy `index.ts`/`package.json`, skip existing destination files, cache by workspace agent dir, log warnings without failing agent startup. |
| Agent startup integration | `src/agent/main/agentManager.ts` | Run bundled-extension installers after `prepareAgentDir(opts.cwd)` and before `new RpcClient(...)`. Keep failures non-fatal but logged. |
| Workspace Pi home | `src/agent/main/agentDir.ts` | Use `<cwd>/.cate/pi-agent` as non-VCS, workspace-scoped handoff storage. Do not use global `~/.pi/agent/auth.json` for FlashQuery credentials. |
| Bundled extension source | `src/agent/extensions/cate-plan-mode/index.ts`, `src/agent/extensions/cate-plan-mode/package.json` | Export a default function receiving `ExtensionAPI`; package manifest uses `pi.extensions: ["./index.ts"]`. |
| Dynamic tool registration | `node_modules/@earendil-works/pi-coding-agent/examples/extensions/dynamic-tools.ts` | Register tools during `session_start` or refresh paths with `pi.registerTool({ name, label, description, parameters, execute })`. |
| Provider anti-pattern | `node_modules/@earendil-works/pi-coding-agent/examples/extensions/custom-provider-gitlab-duo/index.ts` | Shows what provider registration looks like; Phase 17 must not call `pi.registerProvider` or add FlashQuery to `ProvidersView`. |
| FlashQuery IPC/security | `src/main/ipc/flashquery.ts`, `src/main/flashquery/clientManager.ts`, `src/shared/types.ts` | Keep renderer away from secrets; normalize workspace connection data; main process owns privileged transport. |
| FlashQuery token storage | `src/main/flashquery/credentials.ts`, `src/main/flashquery/credentials.test.ts` | Bearer tokens are isolated by workspace in main-process electron-store, not persisted into renderer-visible workspace JSON. |

## Data Flow

`AgentManager.create()` prepares `<cwd>/.cate/pi-agent`, installs Cate's bundled Pi extensions, writes or refreshes workspace-scoped FlashQuery handoff material, then starts Pi with `PI_CODING_AGENT_DIR` pointed at that workspace. The handoff combines sanitized workspace connection metadata with bearer tokens loaded through `getWorkspaceToken(workspaceId)`. Pi auto-discovers `cate-flashquery`.

The extension reads Cate-provided workspace FlashQuery connection metadata, opens an MCP client, fetches registry/model/purpose metadata, filters tools by `hostEligible: true` and `status: current`, translates schemas to Pi-compatible parameter schemas, and registers eligible tools with `pi.registerTool`. Tool execution delegates to the current FlashQuery client, preserving old clients for in-flight calls during workspace rebinding.

## Implementation Guidance

- Keep the installer tiny and close to `installPlanModeExtension`; do not fold FlashQuery extension install logic into `AgentManager`.
- Put extension testable logic in pure helpers near `src/agent/extensions/cate-flashquery/`, such as registry filtering, schema translation, and client lifecycle helpers.
- Use exact test IDs in test titles: `T-U-013`, `T-U-014`, `T-U-015`, `T-E-005`.
- Treat `call_model`, `call_macro`, and `search_tools` as ordinary eligible registry tools in Phase 17. Defer rich descriptions/trace/progress behavior to Phase 18.
- Explicitly test that `registerProvider` is not called and that `ProvidersView` receives no FlashQuery entry.
- Before implementing stale-tool removal, inspect the installed Pi version for a supported unregister/reload API. The plan must not depend on `unregisterProvider` or private monkey patches to remove tools.
