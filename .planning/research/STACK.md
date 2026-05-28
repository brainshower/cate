# Stack Research

**Domain:** Workspace-scoped FlashQuery connectivity inside an existing Electron desktop IDE
**Researched:** 2026-05-28
**Confidence:** HIGH for Cate/FlashQuery integration shape; MEDIUM for future MCP package split

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Electron main process | 41.2.0 | Own FlashQuery connectivity, token handling, health checks, MCP calls, and file-opening decisions | Cate already uses a hardened main/preload/renderer split. FlashQuery calls are privileged network/auth operations and belong in main, not renderer. |
| React | 18.3.1 | Workspace connection settings, status indicators, search/save panels, agent-context UI | Matches Cate's renderer stack and avoids adding another UI runtime. |
| TypeScript | 5.9.3 in Cate lockfile | Shared contracts across main, preload, renderer, and agent integration | Cate and FlashQuery are both strict TypeScript projects; the integration should be typed end to end. |
| `@modelcontextprotocol/sdk` | `^1.29.0` | MCP client for `Client`, `StreamableHTTPClientTransport`, `StdioClientTransport`, `listTools`, and `callTool` | FlashQuery currently uses this package and exposes streamable-http plus stdio. Using the same SDK family avoids hand-rolled JSON-RPC/SSE session handling. |
| Electron IPC + preload bridge | Existing | Renderer-to-main FlashQuery API boundary | Cate already centralizes privileged operations through `src/preload/index.ts`, `src/shared/ipc-channels.ts`, and `src/shared/electron-api.d.ts`. |
| Zustand | 5.0.12 | Renderer state for connection status, search results, save flows, and workspace UI affordances | Fits Cate's existing store model; use it for UI state only, not secrets or authoritative connection state. |
| `electron-store` + `safeStorage` | `electron-store` 10.1.0, Electron built-in `safeStorage` | Persist non-secret workspace connection metadata and encrypt tokens/secrets in Electron userData | Cate already uses `electron-store`; `safeStorage` avoids adding a native keychain dependency for MVP while keeping plaintext secrets out of project files. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | `^4.4.3` | Runtime validation for FlashQuery IPC payloads, saved connection configs, and MCP result envelopes | Add now. Cate's current preload API is broad; FlashQuery introduces authenticated network calls and should validate external inputs at boundaries. |
| Native `fetch` / `AbortController` | Node 20+/Electron runtime | `/health`, `/mcp/info`, `/token`, timeout probes, and lightweight diagnostics | Use for REST-like FlashQuery endpoints; use MCP SDK only for actual tool discovery and tool calls. |
| Existing `electron-log` wrapper | 5.4.3 | Main-process diagnostics for connection failures, auth failures, tool errors, and status transitions | Use Cate's `src/main/logger.ts`; redact tokens and user content. |
| Existing `@phosphor-icons/react` | 2.1.10 | FlashQuery panel/status/settings icons | Cate already uses Phosphor in panel registry and sidebar UI. |
| Existing Vitest/jsdom | Vitest 3.2.4, jsdom 29.1.1 | Unit tests for config validation, token storage, client service, and renderer state | Keep fast tests focused around pure helpers and mocked IPC/client calls. |
| Existing Playwright Electron E2E | 1.60.0 | Smoke coverage for configure -> status -> search/open workflow | Use once UI exists; do not require a real Supabase instance in the default E2E path. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `npm run typecheck` | Verify shared contracts and preload API drift | Must pass after adding FlashQuery types to `src/shared/types.ts` and `src/shared/electron-api.d.ts`. |
| `npm test` | Unit/jsdom test suite | Add tests beside touched modules, matching Cate's existing `*.test.ts` pattern. |
| `npm run test:e2e` | Electron integration smoke | Add a mocked/local FlashQuery fixture first; do not make CI depend on a developer's real FlashQuery instance. |
| FlashQuery `npm run dev` or `node dist/index.js start --config ./flashquery.yml` | Manual integration target | Cate should connect to the HTTP MCP endpoint, normally `http://localhost:3100/mcp`, rather than starting FlashQuery in-process. |

## Installation

```bash
# Core FlashQuery integration dependency
npm install @modelcontextprotocol/sdk zod

# No new UI, database, HTTP, or state libraries are recommended.
```

Do not install Supabase, pg, Obsidian/vault parsers, Express, or a web backend in Cate for this milestone. Those stay owned by FlashQuery.

## Recommended Integration Approach

Use a narrow main-process service layer:

1. `src/main/flashquery/client.ts`
   - Own one MCP client session per unique workspace connection.
   - Use `StreamableHTTPClientTransport` for the default path.
   - Wrap `listTools()` and `callTool()` behind FlashQuery-specific methods such as `search`, `getDocument`, `writeMemory`, and `writeDocument`.
   - Parse FlashQuery's `content[0].text` JSON responses and normalize errors into Cate-friendly result objects.

2. `src/main/flashquery/configStore.ts`
   - Persist workspace-scoped connection metadata keyed by Cate workspace id.
   - Store URL, instance id, display name, and selected capabilities as non-secret metadata.
   - Encrypt bearer token or raw `MCP_AUTH_SECRET` with `safeStorage` before writing through `electron-store`.
   - Never write secrets to `.cate/workspace.json`, project files, session snapshots, logs, or renderer state.

3. `src/main/flashquery/ipc.ts`
   - Register focused IPC handlers for connection CRUD, health check, tool discovery, search, open result, save memory, save document, and context preview.
   - Validate all inputs with Zod.
   - Return serializable `{ ok: true, data } | { ok: false, error }` shapes instead of throwing across IPC.

4. `src/shared/flashquery.ts`
   - Define shared serializable types: `FlashQueryConnectionConfig`, `FlashQueryStatus`, `FlashQuerySearchResult`, `FlashQuerySaveMemoryInput`, `FlashQueryDocumentRef`, `FlashQueryAgentContextMode`.
   - Keep these types free of Electron, React, MCP SDK, Node, or storage imports.

5. `src/renderer/stores/flashQueryStore.ts`
   - Hold renderer-only UI state: selected workspace status, loading flags, search query/results, selected result, last save outcome.
   - Fetch state through `window.electronAPI.flashQuery*` methods.
   - Do not store tokens or raw MCP responses.

6. Renderer UI files
   - Add a FlashQuery settings section under the existing settings/workspace surfaces rather than a standalone app.
   - Add a panel only when search/results need a durable canvas surface. If adding one, update `src/shared/types.ts`, `src/shared/panels.ts`, and `src/renderer/panels/registry.ts`.

7. Agent integration
   - Start with explicit context insertion into existing Pi prompts or follow-up flows from `src/agent/renderer/AgentPanel.tsx`.
   - Keep FlashQuery retrieval auditable: show which memories/documents will be included before sending.
   - Do not replace `src/agent/main/agentManager.ts` or the Pi RPC runtime in this milestone.

## Specific Cate Files Likely to Change

| File | Expected Change |
|------|-----------------|
| `package.json` / `package-lock.json` | Add `@modelcontextprotocol/sdk` and `zod`. |
| `src/shared/ipc-channels.ts` | Add `FLASHQUERY_*` channel constants. |
| `src/shared/electron-api.d.ts` | Add typed `window.electronAPI.flashQuery...` methods. |
| `src/preload/index.ts` | Expose the minimal FlashQuery API over `contextBridge`. |
| `src/main/index.ts` | Register FlashQuery IPC in deferred handlers, not the cold-start critical path. |
| `src/main/flashquery/client.ts` | New MCP client/session wrapper. |
| `src/main/flashquery/configStore.ts` | New workspace-scoped metadata and encrypted secret persistence. |
| `src/main/flashquery/ipc.ts` | New IPC handler registration. |
| `src/main/flashquery/resultParser.ts` | New helper for MCP text-content JSON parsing and error normalization. |
| `src/shared/flashquery.ts` | New shared contract module. |
| `src/shared/types.ts` | Add optional workspace/UI fields only if they must be session-serialized; add `flashquery` panel type only if a panel is built. |
| `src/shared/panels.ts` | Add FlashQuery panel metadata only if using a dedicated panel. |
| `src/renderer/panels/registry.ts` | Register a lazy FlashQuery panel only if needed for search/results. |
| `src/renderer/stores/flashQueryStore.ts` | New renderer UI store. |
| `src/renderer/settings/*.tsx` | Add workspace connection controls in the existing settings style. |
| `src/agent/renderer/AgentPanel.tsx` / `src/agent/renderer/agentStore.ts` | Add explicit context attach/preview affordances, not automatic hidden retrieval. |
| `src/main/**/*.test.ts` / `src/renderer/**/*.test.tsx` | Add focused validation, config, parser, service, and UI-state tests. |
| `e2e/*.spec.ts` | Add one mocked/local FlashQuery happy-path smoke once UI exists. |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| MCP SDK client in main process | Hand-rolled JSON-RPC over HTTP/SSE | Only for a temporary spike. The SDK already handles MCP session semantics and tool calls. |
| Streamable HTTP first | Stdio-spawn FlashQuery from Cate | Use stdio later only for a "Cate manages the FlashQuery process" mode. It increases lifecycle, config, env, and log complexity. |
| `safeStorage` + `electron-store` | `keytar` | Use `keytar` later if product requirements demand OS keychain visibility/control. It adds native packaging risk that is not needed for MVP. |
| FlashQuery-specific integration | General MCP host inside Cate | Use a general MCP host in a separate milestone. It changes product scope, security model, approvals, and UI complexity. |
| Explicit agent context attachment | Automatic hidden retrieval on every prompt | Use automatic retrieval only after audit UI, prompt budgeting, and relevance controls are proven. |
| Existing React/Zustand UI | New web backend or embedded web app | Never needed here; Cate is already the desktop IDE shell. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Direct Supabase/Postgres access from Cate | Duplicates FlashQuery storage rules, schema verification, embedding flow, locks, plugin semantics, and auth surface | Call FlashQuery MCP tools. |
| Renderer-side MCP or token handling | Leaks secrets into isolated renderer/UI state and bypasses Cate's security architecture | Main-process service plus typed preload IPC. |
| Project-file secret storage | `.cate` project state can be shareable/VCS-friendly; secrets would leak across repos or teams | `electron-store` under userData with `safeStorage` encryption. |
| A bundled FlashQuery runtime in Cate MVP | Process supervision, setup, migrations, vault scanning, Docker/Supabase management, and upgrades are already FlashQuery-owned | Connect to an existing FlashQuery HTTP endpoint first. |
| `mcp-remote` inside Cate | It is useful for clients without native HTTP MCP support, but Cate can use the TypeScript SDK directly | `@modelcontextprotocol/sdk` client transports. |
| New database/cache layer in Cate | Adds state reconciliation risk and offline consistency problems | Keep only connection metadata and UI/session state in Cate. |
| Silent agent memory injection | Users need predictable, auditable context and prompt control | Preview selected memories/documents before attaching to Pi prompts. |

## Stack Patterns by Variant

**If FlashQuery is already running over HTTP:**
- Use `StreamableHTTPClientTransport(new URL(connection.mcpUrl))`.
- Probe `/health` for liveness, `/mcp/info` for safe instance metadata, and `/token` when exchanging a raw secret for a bearer token.
- Send `Authorization: Bearer <token>` for `/mcp` requests.

**If the user wants local-only without a persistent HTTP service later:**
- Add a stdio variant behind the same `FlashQueryClient` interface.
- Use `StdioClientTransport` with `node /absolute/path/to/flashquery/dist/index.js start --config /absolute/path/to/flashquery.yml --transport stdio`.
- Treat this as a later phase because Cate would then own process lifecycle, stderr capture, env resolution, and startup errors.

**If the workspace has no FlashQuery configured:**
- Store no default global connection silently.
- Surface an unconfigured status and offer setup/connect actions scoped to the current Cate workspace.

**If multiple Cate workspaces are open:**
- Keep separate connection metadata and connection status per workspace id.
- Reuse a transport only when endpoint and auth identity match; do not assume one global FlashQuery instance.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| Cate Node engine `>=20 <23` | FlashQuery Node engine `>=20` | Safe overlap is Node 20 or 22. Keep Cate's existing engine range. |
| Cate Electron 41.2.0 | Native `fetch`, `AbortController`, `safeStorage` | Enough runtime support for HTTP probes and encrypted local strings without new libraries. |
| `@modelcontextprotocol/sdk@^1.29.0` | FlashQuery 3.2.0 server using `@modelcontextprotocol/sdk@^1.29.0` | Aligns with FlashQuery's current server implementation and import paths. |
| MCP SDK `Client` | FlashQuery streamable-http `/mcp` | Use SDK transport for MCP calls; use plain `fetch` for `/health`, `/mcp/info`, and `/token`. |
| Zod 4.x | Cate TypeScript strict mode | Use for runtime boundaries only; do not make renderer forms depend on server-only schemas. |

## Sources

- Cate `.planning/PROJECT.md` - project scope, brownfield constraints, workspace-scoped requirement. Confidence: HIGH.
- Cate `.planning/codebase/STACK.md` - current Electron 41, React 18, Zustand, Vitest, Playwright, package versions. Confidence: HIGH.
- Cate `.planning/codebase/ARCHITECTURE.md` - main/preload/renderer architecture, panel registry, workspace state, agent subsystem. Confidence: HIGH.
- Cate `.planning/codebase/INTEGRATIONS.md` - existing integrations and absence of database layer. Confidence: HIGH.
- Cate `package.json` - actual dependency and engine constraints. Confidence: HIGH.
- FlashQuery `README.md` - streamable-http default, setup, deployment, MCP URL. Confidence: HIGH.
- FlashQuery `docs/ARCHITECTURE.md` - server components, data ownership, transport support, storage boundaries. Confidence: HIGH.
- FlashQuery `docs/FlashQuery MCP Tool Guide.md` - tool response conventions and data tool semantics. Confidence: HIGH.
- FlashQuery `docs/SECURITY-TOKENS.md` - bearer token, `/token`, raw-secret compatibility, auth guidance. Confidence: HIGH.
- FlashQuery `src/mcp/server.ts` - `/mcp/info`, `/token`, `/health`, auth middleware, streamable-http session behavior. Confidence: HIGH.
- Context7 `/modelcontextprotocol/typescript-sdk` - MCP client, `StreamableHTTPClientTransport`, `StdioClientTransport`, `listTools`, `callTool`. Confidence: HIGH for SDK capabilities; MEDIUM for package split naming because FlashQuery currently uses the `@modelcontextprotocol/sdk` package.

---
*Stack research for: Cate FlashQuery Integration*
*Researched: 2026-05-28*
