# Phase 1: Foundation - Context

**Gathered:** 2026-05-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 establishes the data, credential, URI, and manager skeleton for FlashQuery connections. After this phase, Cate can persist a per-workspace FlashQuery HTTP connection config, store/retrieve a workspace bearer token through a main-process abstraction, construct/parse `flashquery://` vault URIs, and instantiate/dispose/subscribe to a `FlashQueryClientManager` skeleton.

This phase does not talk to FlashQuery yet. No HTTP probe, MCP transport, vault listing, document read/write, IPC surface, renderer UI, editor integration, or status chip behavior should be implemented in Phase 1.

</domain>

<decisions>
## Implementation Decisions

### Source Authority
- **D-01:** Downstream agents MUST treat the external product requirements and test plan as the first source of truth for Phase 1. If `.planning/REQUIREMENTS.md` or `.planning/ROADMAP.md` appears ambiguous, agents must re-read the external docs before asking the user.
- **D-02:** No additional user discussion is needed before planning Phase 1. The requirements doc already locks the WHAT, file targets, helper names, acceptance criteria, out-of-scope boundaries, and tests.
- **D-03:** Planning prompts, research prompts, and implementation prompts for this phase should explicitly include the canonical product-doc paths listed below.

### Scope Boundaries
- **D-04:** Implement only REQ-001, REQ-002, REQ-003 skeleton behavior, and REQ-013 in Phase 1.
- **D-05:** Defer network behavior to Phase 2 and IPC/renderer behavior to later phases. The manager skeleton may define extension points, but it must not create real MCP clients, probe `/mcp/info`, perform retry/backoff, register IPC handlers, or fetch vault content yet.
- **D-06:** Keep FlashQuery runtime ownership outside Cate. Phase 1 stores Cate-side connection metadata and token access only; it must not run FlashQuery, configure Supabase, scan vaults, or reach into FlashQuery storage.

### Workspace Connection Model
- **D-07:** Add `FlashQueryConnection` to `src/shared/types.ts` as a discriminated union over `transport`; the v1 variant is `{ transport: 'http'; url: string; auth?: { type: 'bearer'; token: string } }`.
- **D-08:** Add `flashqueryConnection?: FlashQueryConnection` to `WorkspaceInfo` as an optional additive field. Workspaces without this field remain valid and should not initialize FlashQuery state.
- **D-09:** Workspace persistence/restore behavior must tolerate absent and malformed `flashqueryConnection` data. Malformed stored connection data should be treated as no connection, per REQ-001 and T-U-004.

### Credential Storage
- **D-10:** Create `src/main/flashquery/credentials.ts` with exactly `getWorkspaceToken(workspaceId: string): Promise<string | null>` and `setWorkspaceToken(workspaceId: string, token: string | null): Promise<void>`.
- **D-11:** Back the v1 token abstraction with `electron-store`, but keep all token I/O behind `credentials.ts` so OS keychain storage can replace it later without touching call sites.
- **D-12:** Token write failures must reject the returned promise. Do not swallow persistence failures in `credentials.ts`.
- **D-13:** Do not expose raw bearer tokens to renderer state, logs, planning artifacts, or test snapshots.

### URI Helpers
- **D-14:** Create `src/main/flashquery/uri.ts` with `buildVaultUri(workspaceId: string, vaultPath: string): string` and `parseVaultUri(uri: string): { workspaceId: string; vaultPath: string } | null`.
- **D-15:** `flashquery://<workspaceId>/<vault-path>` is the v1 canonical URI form. Do not include a vault-name component or `?vault=` query in v1.
- **D-16:** Preserve `/` as a folder separator while percent-encoding each path segment and the workspace ID. Non-FlashQuery inputs return `null`, not thrown errors.
- **D-17:** Unit tests must cover the round-trip invariant for spaces, `#`, `?`, `%`, non-ASCII, CJK characters, leading/trailing slashes, and empty vault paths.

### Manager Skeleton
- **D-18:** Create `src/main/flashquery/clientManager.ts` with a `FlashQueryClientManager` class or equivalent module that owns per-workspace state and exposes `subscribe(workspaceId, eventType, handler)` returning an unsubscribe function plus `dispose(workspaceId)`.
- **D-19:** The Phase 1 manager must construct without eager connections. It should prepare lifecycle/subscription scaffolding only.
- **D-20:** `dispose(workspaceId)` must release the workspace's manager state. Subscribe followed by immediate unsubscribe must be safe and covered by tests.

### the agent's Discretion
- Planner/researcher may choose the exact internal shape of `FlashQueryClientManager` state as long as the public behavior and future Phase 2 extension points remain clean.
- Planner/researcher may choose whether `uri.ts` lives under `src/main/flashquery/` with shared-safe dependencies only or whether a later phase extracts it to `src/shared/`; for Phase 1 it must be importable by tests and not depend on Electron/Node-only APIs.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specs
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — Primary requirements source. Read Spec §6.1.1, §6.1.2, §6.1.3, §6.3.1, §6.3.2, and §8.3 for Phase 1.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — Primary test source. Read Test Plan §4.1 and §8.1 for T-U-001 through T-U-020.

### Local Planning Artifacts
- `.planning/PROJECT.md` — Milestone goal, project constraints, planning preference, and brownfield integration context.
- `.planning/REQUIREMENTS.md` — Local milestone requirement summary and traceability table.
- `.planning/ROADMAP.md` — Phase 1 boundary and plan breakdown.
- `.planning/STATE.md` — Current milestone/session state.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Electron layering, shared contracts, workspace metadata sync, panel registry, and IPC boundary patterns.
- `.planning/codebase/INTEGRATIONS.md` — Existing external integrations and current use of `electron-store`.
- `.planning/codebase/CONCERNS.md` — Main-process concentration, preload surface risk, settings validation concern, and filesystem/security-sensitive boundaries.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/shared/types.ts` — Defines `WorkspaceInfo`; add `FlashQueryConnection` and optional `flashqueryConnection` here as an additive shared contract.
- `src/main/workspaceManager.ts` — Main-process source of truth for workspace metadata. `createWorkspace`, `updateWorkspace`, `removeWorkspace`, and `listWorkspaces` are the persistence/sync integration points for REQ-001 and later REQ-003 disposal hooks.
- `src/renderer/stores/appStore.ts` — Renderer applies `WorkspaceInfo` through `applyWorkspaceInfo`, queues workspace sync through `workspaceSyncQueue`, and merges cross-window workspace info. Any added workspace field that renderer needs later must be preserved here.
- `src/main/store.ts` — Existing `electron-store` pattern uses ESM dynamic import. Credentials should either reuse this style or introduce a focused FlashQuery store wrapper without coupling token logic to settings handlers.
- Existing Vitest colocated test style — Main/shared tests live beside source files, e.g. `src/main/ipc/git.test.ts`, `src/main/ipc/terminal.test.ts`, `src/main/ipc/pathValidation.test.ts`, and `src/main/analytics.test.ts`.

### Established Patterns
- Renderer code must not import Electron or Node APIs directly. Privileged state and future network work belong in main-process modules.
- Shared serializable contracts live in `src/shared/`; avoid importing `src/main/`, `src/preload/`, `src/renderer/`, or `src/agent/` from shared code.
- Main-process modules should be focused under `src/main/ipc/` or a domain folder instead of adding more unrelated logic to `src/main/index.ts`.
- IPC handlers often return safe fallback values or structured failures for recoverable errors; Phase 1 does not add IPC but should prepare types/helpers that later handlers can use safely.
- Tests mock Electron dependencies with `vi.mock('electron', ...)` where needed.

### Integration Points
- Workspace metadata sync: `src/main/workspaceManager.ts` broadcasts `WORKSPACE_CHANGED`; renderer `setupWorkspaceSync` merges incoming `WorkspaceInfo[]`.
- Workspace mutation shape: `updateWorkspace(id, changes: Partial<Omit<WorkspaceInfo, 'id'>>)` will accept the additive optional connection field once `WorkspaceInfo` is extended.
- Credential storage: use a single FlashQuery-specific module so later IPC and manager code never reads/writes tokens directly.
- Manager lifecycle: later phases should hook workspace removal and connection changes to `FlashQueryClientManager.dispose(workspaceId)`. Phase 1 should make that disposal cheap and testable.

</code_context>

<specifics>
## Specific Ideas

- User specifically directed that downstream agents should refer first to the external requirements and test-plan docs before asking implementation questions.
- The product docs already specify Phase 1 file names: `src/main/flashquery/credentials.ts`, `src/main/flashquery/uri.ts`, `src/main/flashquery/clientManager.ts`, and `src/shared/types.ts`.
- The Test Plan already specifies Phase 1 test IDs and target files: `src/shared/types.test.ts` or `src/main/workspaceManager.test.ts`, `src/main/flashquery/credentials.test.ts`, `src/main/flashquery/clientManager.test.ts`, and `src/main/flashquery/uri.test.ts`.

</specifics>

<deferred>
## Deferred Ideas

- HTTP probe, connection status transitions, retry/backoff, and status events beyond the subscription skeleton belong to Phase 2.
- `flashquery:*` IPC channels, preload methods, and renderer-facing APIs belong to Phase 3.
- Vault panel, connection dialog, editor routing, chip/badge UI, E2E harness, and visual checks belong to later phases as defined in `.planning/ROADMAP.md`.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-28*
