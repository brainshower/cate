# Phase 1: Foundation - Research

**Researched:** 2026-05-28
**Domain:** Electron main-process connection metadata, credential persistence, URI helpers, and manager skeleton
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Source Authority
- **D-01:** Downstream agents MUST treat the external product requirements and test plan as the first source of truth for Phase 1. If `.planning/REQUIREMENTS.md` or `.planning/ROADMAP.md` appears ambiguous, agents must re-read the external docs before asking the user.
- **D-02:** No additional user discussion is needed before planning Phase 1. The requirements doc already locks the WHAT, file targets, helper names, acceptance criteria, out-of-scope boundaries, and tests.
- **D-03:** Planning prompts, research prompts, and implementation prompts for this phase should explicitly include the canonical product-doc paths listed below.

#### Scope Boundaries
- **D-04:** Implement only REQ-001, REQ-002, REQ-003 skeleton behavior, and REQ-013 in Phase 1.
- **D-05:** Defer network behavior to Phase 2 and IPC/renderer behavior to later phases. The manager skeleton may define extension points, but it must not create real MCP clients, probe `/mcp/info`, perform retry/backoff, register IPC handlers, or fetch vault content yet.
- **D-06:** Keep FlashQuery runtime ownership outside Cate. Phase 1 stores Cate-side connection metadata and token access only; it must not run FlashQuery, configure Supabase, scan vaults, or reach into FlashQuery storage.

#### Workspace Connection Model
- **D-07:** Add `FlashQueryConnection` to `src/shared/types.ts` as a discriminated union over `transport`; the v1 variant is `{ transport: 'http'; url: string; auth?: { type: 'bearer'; token: string } }`.
- **D-08:** Add `flashqueryConnection?: FlashQueryConnection` to `WorkspaceInfo` as an optional additive field. Workspaces without this field remain valid and should not initialize FlashQuery state.
- **D-09:** Workspace persistence/restore behavior must tolerate absent and malformed `flashqueryConnection` data. Malformed stored connection data should be treated as no connection, per REQ-001 and T-U-004.

#### Credential Storage
- **D-10:** Create `src/main/flashquery/credentials.ts` with exactly `getWorkspaceToken(workspaceId: string): Promise<string | null>` and `setWorkspaceToken(workspaceId: string, token: string | null): Promise<void>`.
- **D-11:** Back the v1 token abstraction with `electron-store`, but keep all token I/O behind `credentials.ts` so OS keychain storage can replace it later without touching call sites.
- **D-12:** Token write failures must reject the returned promise. Do not swallow persistence failures in `credentials.ts`.
- **D-13:** Do not expose raw bearer tokens to renderer state, logs, planning artifacts, or test snapshots.

#### URI Helpers
- **D-14:** Create `src/main/flashquery/uri.ts` with `buildVaultUri(workspaceId: string, vaultPath: string): string` and `parseVaultUri(uri: string): { workspaceId: string; vaultPath: string } | null`.
- **D-15:** `flashquery://<workspaceId>/<vault-path>` is the v1 canonical URI form. Do not include a vault-name component or `?vault=` query in v1.
- **D-16:** Preserve `/` as a folder separator while percent-encoding each path segment and the workspace ID. Non-FlashQuery inputs return `null`, not thrown errors.
- **D-17:** Unit tests must cover the round-trip invariant for spaces, `#`, `?`, `%`, non-ASCII, CJK characters, leading/trailing slashes, and empty vault paths.

#### Manager Skeleton
- **D-18:** Create `src/main/flashquery/clientManager.ts` with a `FlashQueryClientManager` class or equivalent module that owns per-workspace state and exposes `subscribe(workspaceId, eventType, handler)` returning an unsubscribe function plus `dispose(workspaceId)`.
- **D-19:** The Phase 1 manager must construct without eager connections. It should prepare lifecycle/subscription scaffolding only.
- **D-20:** `dispose(workspaceId)` must release the workspace's manager state. Subscribe followed by immediate unsubscribe must be safe and covered by tests.

### the agent's Discretion
- Planner/researcher may choose the exact internal shape of `FlashQueryClientManager` state as long as the public behavior and future Phase 2 extension points remain clean.
- Planner/researcher may choose whether `uri.ts` lives under `src/main/flashquery/` with shared-safe dependencies only or whether a later phase extracts it to `src/shared/`; for Phase 1 it must be importable by tests and not depend on Electron/Node-only APIs.

### Deferred Ideas (OUT OF SCOPE)
- HTTP probe, connection status transitions, retry/backoff, and status events beyond the subscription skeleton belong to Phase 2.
- `flashquery:*` IPC channels, preload methods, and renderer-facing APIs belong to Phase 3.
- Vault panel, connection dialog, editor routing, chip/badge UI, E2E harness, and visual checks belong to later phases as defined in `.planning/ROADMAP.md`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-001 | Add optional per-workspace `flashqueryConnection` metadata and preserve absent/malformed cases. [CITED: external Requirements §6.1.1] | Extend `WorkspaceInfo`, `WorkspaceState`, `SessionSnapshot`, and `ProjectWorkspaceFile` only where persistence actually flows; validate/migrate malformed project-local JSON to absent connection. [VERIFIED: codebase grep] |
| REQ-002 | Add main-process token helpers backed by `electron-store`. [CITED: external Requirements §6.1.2] | Use a dedicated `src/main/flashquery/credentials.ts` store wrapper; `electron-store` supports ESM default import plus `get`, `set`, `delete`, and `clear`. [CITED: Context7 /sindresorhus/electron-store] |
| REQ-003 | Add `FlashQueryClientManager` lifecycle skeleton. [CITED: external Requirements §6.1.3] | Implement construction, workspace-scoped state maps, `dispose`, and subscription registration without network/probe/client creation. [CITED: 01-CONTEXT.md D-18..D-20] |
| REQ-013 | Add vault URI build/parse helpers with round-trip invariant. [CITED: external Requirements §6.3.2] | Implement pure string/URL helpers with segment-level percent encoding and no Electron/Node dependencies so tests and later renderer code can import safely. [CITED: 01-CONTEXT.md D-14..D-17] |
</phase_requirements>

## Summary

Phase 1 should be planned as three narrow, testable foundation slices: workspace connection schema/persistence, token credentials abstraction, and pure URI plus manager skeleton modules. [CITED: external Requirements §8.3] The phase must not implement HTTP probing, MCP transport, retry/backoff, IPC handlers, renderer UI, vault listing, document read/write, or editor behavior. [CITED: 01-CONTEXT.md D-05]

The main architectural risk is that `WorkspaceInfo` is not the only persistence shape in Cate: main-process workspace metadata, renderer `WorkspaceState`, renderer `SessionSnapshot`, project-local `.cate/workspace.json`, and cross-window merge all need additive preservation of the new optional field where applicable. [VERIFIED: codebase grep] The second risk is credential leakage: Phase 1 stores bearer tokens through `credentials.ts` only, and planner tasks should explicitly avoid putting raw tokens into renderer stores, workspace JSON fixtures, logs, or snapshots. [CITED: 01-CONTEXT.md D-13]

**Primary recommendation:** Plan Phase 1 as: 1. workspace type/persistence hardening, 2. `credentials.ts` with isolated `electron-store` tests, 3. `uri.ts` plus `FlashQueryClientManager` skeleton tests. [CITED: .planning/ROADMAP.md Phase 1 Plans]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Workspace connection metadata | Shared contracts + Main process | Renderer store/session restore | `WorkspaceInfo` is shared, `workspaceManager.ts` owns main metadata, and renderer session code serializes/restores project-local workspace state. [VERIFIED: codebase grep] |
| Bearer-token storage | Main process | — | Privileged persistence belongs in main; renderer must not receive raw token values in Phase 1. [CITED: 01-CONTEXT.md D-10..D-13] |
| Vault URI build/parse | Shared-safe pure helper | Renderer later | File target is `src/main/flashquery/uri.ts`, but it must avoid Electron/Node dependencies for future renderer import/extraction. [CITED: 01-CONTEXT.md D-14 and discretion] |
| Manager lifecycle skeleton | Main process | Future IPC | `FlashQueryClientManager` will own future clients per workspace, but Phase 1 only creates state/subscription/dispose scaffolding. [CITED: external Requirements §6.1.3] |

## Project Constraints (from AGENTS.md)

- Use the existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; do not add a separate backend or UI framework. [CITED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work must go through typed preload APIs and main-process validation. [CITED: AGENTS.md]
- FlashQuery data remains in the configured FlashQuery instance/vault; Cate stores only connection metadata, preferences, and UI/session state. [CITED: AGENTS.md]
- Connection behavior must be workspace-aware so different Cate projects can use different FlashQuery instances or vaults. [CITED: AGENTS.md]
- Preserve existing Cate agent, terminal, editor, browser, Git, workspace, and layout behavior. [CITED: AGENTS.md]
- Use TypeScript strict mode, single quotes, no semicolons, 2-space indentation, named exports for utilities/stores/handlers, and colocated `.test.ts` / `.test.tsx` tests. [CITED: AGENTS.md]
- Use `npm install`, `npm run typecheck`, `npm test`, and `npm run test:e2e` from the Cate repo root. [CITED: AGENTS.md]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | Installed 5.9.3; npm latest 6.0.3. [VERIFIED: npm registry] | Shared contracts and main-process modules. [VERIFIED: codebase grep] | Existing Cate source is strict TypeScript and Phase 1 changes are type-contract changes. [CITED: AGENTS.md] |
| electron-store | Installed 10.1.0; npm latest 11.0.2. [VERIFIED: npm registry] | Main-process JSON persistence for tokens. [VERIFIED: codebase grep] | Existing Cate settings use `electron-store`; official docs show ESM import and `get`/`set`/`delete` APIs. [CITED: Context7 /sindresorhus/electron-store] |
| Vitest | Installed 3.2.4; npm latest 4.1.7. [VERIFIED: npm registry] | Phase 1 unit tests T-U-001..020. [CITED: external Test Plan §4.1] | Existing Cate config runs colocated `src/**/*.test.ts` in node and `.test.tsx` in jsdom. [VERIFIED: codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Electron | Installed 41.2.0; npm latest 42.3.0. [VERIFIED: npm registry] | Main-process boundary and `app.getPath('userData')` context for persistence. [VERIFIED: codebase grep] | Only if credentials tests need to mock Electron app paths; Phase 1 should otherwise keep helpers narrow. [VERIFIED: codebase grep] |
| Node URL / encodeURIComponent | Runtime Node 24.7.0 available; project engine is `>=20 <23`. [VERIFIED: command output + package.json] | URI parsing/encoding. [ASSUMED] | Use for pure helper implementation; preserve segment separators by encoding each path segment rather than whole path. [CITED: external Requirements §6.3.2] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `electron-store` credential abstraction | OS keychain | Explicitly deferred; keychain migration should be one-file later through `credentials.ts`. [CITED: external Requirements §3.2 and §6.1.2] |
| `src/main/flashquery/uri.ts` | `src/shared/flashqueryUri.ts` | Context allows either later extraction, but Phase 1 product docs specify `src/main/flashquery/uri.ts`; keep the module dependency-free to avoid future churn. [CITED: 01-CONTEXT.md discretion] |
| Runtime schema library for `FlashQueryConnection` | Zod or custom validator | No new package is needed; Phase 1 can use small local type guards for malformed project JSON. [VERIFIED: package.json + codebase grep] |

**Installation:** No new package installation is recommended for Phase 1. [VERIFIED: package.json]

**Version verification commands run:**

```bash
npm list --depth=0 electron-store vitest typescript electron react zustand --json
npm view electron-store version time.modified repository.url scripts.postinstall
npm view vitest version time.modified repository.url scripts.postinstall
npm view typescript version time.modified repository.url scripts.postinstall
```

## Package Legitimacy Audit

No external packages should be installed in Phase 1. [VERIFIED: package.json] Existing dependencies were verified through `npm list` and `npm view`; because no install is planned, the slopcheck install gate is not applicable. [VERIFIED: npm registry]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| electron-store | npm | Existing dependency, installed 10.1.0. [VERIFIED: npm registry] | Not checked. [ASSUMED] | github.com/sindresorhus/electron-store. [VERIFIED: npm registry] | Not run; no install planned. | Approved as existing dependency. |
| vitest | npm | Existing dev dependency, installed 3.2.4. [VERIFIED: npm registry] | Not checked. [ASSUMED] | github.com/vitest-dev/vitest. [VERIFIED: npm registry] | Not run; no install planned. | Approved as existing dependency. |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: package audit]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: package audit]

## Architecture Patterns

### System Architecture Diagram

```text
External product docs + 01-CONTEXT
        |
        v
Shared contract: src/shared/types.ts
        |                  \
        |                   \--> Renderer workspace/session restore preserves optional metadata
        v
Main workspaceManager.ts persists WorkspaceInfo and broadcasts WORKSPACE_CHANGED
        |
        +--> src/main/flashquery/credentials.ts
        |       \--> electron-store key namespace per workspace
        |
        +--> src/main/flashquery/clientManager.ts
        |       \--> lazy future client state, dispose, subscribe/unsubscribe only
        |
        +--> src/main/flashquery/uri.ts
                \--> build/parse flashquery://workspace/path, pure helper
```

### Recommended Project Structure

```text
src/
├── shared/
│   └── types.ts                    # +FlashQueryConnection and additive workspace fields
└── main/
    └── flashquery/
        ├── credentials.ts          # token get/set/clear abstraction over electron-store
        ├── credentials.test.ts     # T-U-005..009
        ├── uri.ts                  # buildVaultUri / parseVaultUri
        ├── uri.test.ts             # T-U-013..020
        ├── clientManager.ts        # no-network lifecycle/subscription skeleton
        └── clientManager.test.ts   # T-U-010..012
```

### Pattern 1: Additive Shared Contract

**What:** Add `FlashQueryConnection` as a discriminated union and attach `flashqueryConnection?: FlashQueryConnection` to all workspace persistence shapes that need to retain it. [CITED: external Requirements §6.1.1]

**When to use:** Use for `WorkspaceInfo`; mirror into `WorkspaceState`, `SessionSnapshot`, and `ProjectWorkspaceFile` only where the code serializes/deserializes workspace metadata. [VERIFIED: codebase grep]

**Planning note:** `applyWorkspaceInfo` currently copies only `id`, `name`, `color`, and `rootPath`; plan an explicit preservation/copy update or cross-window broadcasts will drop the new field. [VERIFIED: codebase grep]

### Pattern 2: Focused `electron-store` Wrapper

**What:** Keep token store construction and key naming private to `credentials.ts`; export only `getWorkspaceToken` and `setWorkspaceToken`. [CITED: 01-CONTEXT.md D-10..D-13]

**When to use:** Use in Phase 1 tests and later manager/IPC code; do not wire settings handlers or renderer state to raw token persistence. [CITED: external Requirements §6.1.2]

**Example:**

```ts
// Source: Context7 /sindresorhus/electron-store, adapted to Cate style.
import Store from 'electron-store'

const store = new Store<{ tokens?: Record<string, string> }>({ name: 'flashquery' })

store.set(`tokens.${workspaceId}`, token)
const token = store.get(`tokens.${workspaceId}`, null)
store.delete(`tokens.${workspaceId}`)
```

### Pattern 3: Manager Skeleton With Event Map

**What:** Use a module-private `Map<string, WorkspaceFlashQueryState>` and nested subscriber sets keyed by event type. [CITED: external Requirements §6.1.3]

**When to use:** Phase 1 should cover construction, `dispose(workspaceId)`, and subscribe/unsubscribe behavior only. [CITED: external Test Plan §4.1.3]

**Future extension point:** The state value should leave room for `{ client, status, retryTimer, serverInfo }` in Phase 2 without changing the public class shape. [CITED: external Requirements §6.1.4..§6.1.6]

### Pattern 4: URI Segment Encoding

**What:** `buildVaultUri` percent-encodes `workspaceId` and each `vaultPath` segment individually, then joins segments with literal `/`. [CITED: external Requirements §6.3.2]

**When to use:** Always use helpers for future vault editor file paths; do not hand-concatenate vault URIs in UI code. [CITED: external Requirements §6.3.2]

**Example:**

```ts
// Source: external Requirements §6.3.2.
const encodedPath = vaultPath.split('/').map(encodeURIComponent).join('/')
return `flashquery://${encodeURIComponent(workspaceId)}/${encodedPath}`
```

### Anti-Patterns to Avoid

- **Eager FlashQuery connection in constructor:** Violates Phase 1 and T-U-010. [CITED: 01-CONTEXT.md D-19]
- **Token on `WorkspaceInfo`:** Connection metadata may include `auth` in the type, but raw token persistence must go through `credentials.ts`; avoid writing tokens to project-local `.cate/workspace.json`. [CITED: 01-CONTEXT.md D-13]
- **Encoding the whole vault path:** `encodeURIComponent('foo/bar.md')` encodes `/` and violates T-U-018. [CITED: external Test Plan §4.1.4]
- **Adding `flashquery:*` IPC now:** IPC belongs to Phase 3. [CITED: 01-CONTEXT.md Deferred Ideas]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON settings/token storage | Custom JSON file writer | `electron-store` behind `credentials.ts` | Existing app already uses `electron-store`, and official docs cover `get`/`set`/`delete`. [CITED: Context7 /sindresorhus/electron-store] |
| Test mock framework | Custom stubs outside Vitest | `vi.mock`, dynamic imports, fake timers where needed | Existing Cate tests use colocated Vitest; Vitest docs support module mocking and fake timers. [CITED: Context7 /vitest-dev/vitest/v3_2_4] |
| Vault URI parser | Regex-only parser with partial decoding | `URL` plus explicit scheme validation and segment decoding | Non-URI inputs must return `null`, and path edge cases need predictable round-trip coverage. [CITED: external Test Plan §4.1.4] |
| Manager event bus | Global singleton event emitter with unscoped listeners | Workspace-keyed subscriber sets in `FlashQueryClientManager` | Later status/vault events must not leak across workspaces. [CITED: external Requirements §6.1.6] |

**Key insight:** Phase 1 is mostly preservation work; the planner should guard against losing new optional metadata through existing workspace/session serializers before adding any future network behavior. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Updating `WorkspaceInfo` But Not Persistence Shapes

**What goes wrong:** `flashqueryConnection` typechecks on main metadata but disappears after session save/restore or cross-window sync. [VERIFIED: codebase grep]
**Why it happens:** Cate has multiple workspace shapes: `WorkspaceInfo`, `WorkspaceState`, `SessionSnapshot`, and `ProjectWorkspaceFile`. [VERIFIED: codebase grep]
**How to avoid:** Plan a single schema task that updates type definitions, builders, loaders, and merge logic together. [VERIFIED: codebase grep]
**Warning signs:** T-U-002 passes by constructing an object only, not by exercising actual save/load helpers. [CITED: external Test Plan §4.1.1]

### Pitfall 2: Treating Malformed Connection JSON As Fatal

**What goes wrong:** A corrupted `.cate/workspace.json` can prevent workspace restore. [CITED: external Requirements §6.1.1]
**Why it happens:** Existing `loadProjectState` validates only version and canvas shape before returning project data. [VERIFIED: codebase grep]
**How to avoid:** Add a narrow `isFlashQueryConnection` sanitizer that returns `undefined` on invalid connection data. [CITED: 01-CONTEXT.md D-09]
**Warning signs:** T-U-004 expects graceful absence, not an exception. [CITED: external Test Plan §4.1.1]

### Pitfall 3: Credential Tests Importing Before Mocks

**What goes wrong:** `electron-store` or `electron` is loaded before the in-memory test double is installed. [VERIFIED: codebase grep]
**Why it happens:** Existing tests use top-level `vi.mock` before dynamic import for import-time dependencies. [VERIFIED: codebase grep]
**How to avoid:** Put `vi.mock('electron-store', ...)` before `await import('./credentials')`; reset in-memory store in `beforeEach`. [CITED: Context7 /vitest-dev/vitest/v3_2_4]
**Warning signs:** Tests pass only when run alone or leak token state between T-U-005..009. [ASSUMED]

### Pitfall 4: URI Helper Depends On Main-Only APIs

**What goes wrong:** Later renderer/editor phases cannot import the helper without bundling Electron/Node main-process dependencies. [CITED: 01-CONTEXT.md discretion]
**Why it happens:** Placing `uri.ts` under `src/main/flashquery/` can invite accidental imports from main modules. [ASSUMED]
**How to avoid:** Keep `uri.ts` pure and dependency-free; do not import logger, electron, fs, or client manager. [CITED: 01-CONTEXT.md discretion]
**Warning signs:** `uri.test.ts` requires `vi.mock('electron')`. [ASSUMED]

### Pitfall 5: Building Phase 2 Early

**What goes wrong:** Manager tests start covering probe/status/retry behavior before the foundation contract is stable. [CITED: 01-CONTEXT.md D-05]
**Why it happens:** REQ-003 full text mentions future lazy client construction for list/get/write calls. [CITED: external Requirements §6.1.3]
**How to avoid:** In Phase 1, implement only skeleton portions named by T-U-010..012; leave probe/retry/status to T-U-021..039. [CITED: external Test Plan §4.1.3 and §4.2]
**Warning signs:** `fetch`, `StreamableHTTPClientTransport`, or `/mcp/info` appears in Phase 1 code. [CITED: 01-CONTEXT.md D-05]

## Code Examples

### Workspace Type Shape

```ts
// Source: external Requirements §6.1.1.
export type FlashQueryConnection =
  | {
      transport: 'http'
      url: string
      auth?: { type: 'bearer'; token: string }
    }

export interface WorkspaceInfo {
  id: string
  name: string
  color: string
  rootPath: string
  flashqueryConnection?: FlashQueryConnection
}
```

### Vitest Import-Time Mock Pattern

```ts
// Source: Cate src/main/analytics.test.ts + Context7 /vitest-dev/vitest/v3_2_4.
import { beforeEach, describe, expect, test, vi } from 'vitest'

const backing = new Map<string, unknown>()

vi.mock('electron-store', () => ({
  default: class MockStore {
    get(key: string, fallback?: unknown) { return backing.get(key) ?? fallback }
    set(key: string, value: unknown) { backing.set(key, value) }
    delete(key: string) { backing.delete(key) }
  },
}))

const { getWorkspaceToken, setWorkspaceToken } = await import('./credentials')
```

### Manager Subscription Skeleton

```ts
// Source: external Requirements §6.1.3 and Test Plan §4.1.3.
type FlashQueryEventType = 'status' | 'vault-changed'
type FlashQueryEventHandler = (event: unknown) => void

export class FlashQueryClientManager {
  private readonly subscribers = new Map<string, Map<FlashQueryEventType, Set<FlashQueryEventHandler>>>()

  subscribe(workspaceId: string, eventType: FlashQueryEventType, handler: FlashQueryEventHandler): () => void {
    const workspaceSubscribers = this.subscribers.get(workspaceId) ?? new Map()
    const handlers = workspaceSubscribers.get(eventType) ?? new Set()
    handlers.add(handler)
    workspaceSubscribers.set(eventType, handlers)
    this.subscribers.set(workspaceId, workspaceSubscribers)
    return () => handlers.delete(handler)
  }

  dispose(workspaceId: string): void {
    this.subscribers.delete(workspaceId)
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cate workspace metadata stores only local workspace identity and root path. [VERIFIED: codebase grep] | Add optional FlashQuery connection metadata to workspace contracts. [CITED: external Requirements §6.1.1] | Phase 1. [CITED: .planning/ROADMAP.md] | Enables later connection UI and manager construction without forcing every workspace to connect. [CITED: external Requirements §8.3] |
| Raw secret fields could be embedded directly in connection objects. [ASSUMED] | Token I/O is centralized in `credentials.ts`; raw token exposure is forbidden. [CITED: 01-CONTEXT.md D-10..D-13] | Phase 1. [CITED: .planning/ROADMAP.md] | Allows later keychain replacement and limits renderer/log exposure. [CITED: external Requirements §6.1.2] |
| URI helpers do not exist. [VERIFIED: codebase grep] | Use `flashquery://<workspaceId>/<vault-path>` helper round-trips. [CITED: external Requirements §6.3.1..§6.3.2] | Phase 1. [CITED: .planning/ROADMAP.md] | Later vault panel/editor code can share one canonical identifier. [CITED: external Requirements §6.3] |

**Deprecated/outdated:**
- Storing bearer tokens in renderer state or project-local `.cate/workspace.json` is not allowed for this phase. [CITED: 01-CONTEXT.md D-13]
- Implementing `/mcp/info` probe or retry behavior in Phase 1 is out of scope. [CITED: 01-CONTEXT.md D-05]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Node `URL` plus segment-level `encodeURIComponent` is sufficient for `flashquery://` helper implementation. | Standard Stack, Don't Hand-Roll | URI helper may need a custom parser for edge cases. |
| A2 | Credential tests may leak state if backing mocks are not reset. | Common Pitfalls | Flaky tests or false positives. |
| A3 | `uri.ts` location under `src/main/flashquery/` may invite accidental main-only imports. | Common Pitfalls | Later renderer import/extraction becomes harder. |
| A4 | Direct secret embedding in connection objects is a realistic accidental implementation path. | State of the Art | Token leakage into project files or renderer snapshots. |

## Open Questions

1. **Should `auth.token` ever be persisted inside `flashqueryConnection`?**
   - What we know: REQ-001 includes `auth?: { type: 'bearer'; token: string }`, while D-13 forbids exposing raw bearer tokens to renderer state, logs, planning artifacts, or test snapshots. [CITED: external Requirements §6.1.1 + 01-CONTEXT.md D-13]
   - What's unclear: Whether persisted `WorkspaceInfo.flashqueryConnection` should omit `auth.token` and use token helpers for storage, or only sanitized test fixtures should omit it. [ASSUMED]
   - Recommendation: Plan human-visible persistence as metadata-only (`transport`, `url`, maybe `auth.type`) and store token only through `credentials.ts`; add a checkpoint if implementation thinks raw token must be serialized. [CITED: 01-CONTEXT.md D-10..D-13]

2. **Should `ProjectWorkspaceFile.version` remain `1` after adding optional metadata?**
   - What we know: Current project-local workspace file version is `1` and validation only checks `version === 1`. [VERIFIED: codebase grep]
   - What's unclear: Product docs do not require a file-format version bump for additive optional connection metadata. [CITED: external Requirements §6.1.1]
   - Recommendation: Keep version `1` if adding optional metadata is backward-compatible; sanitize missing/malformed fields on load. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Typecheck/tests | ✓ | 24.7.0 in shell; project supports `>=20 <23`. [VERIFIED: command output + package.json] | Use Node 20 or 22 for project-conformant runs. |
| npm | Package scripts | ✓ | 11.5.1. [VERIFIED: command output] | — |
| Vitest | T-U-001..020 | ✓ | 3.2.4 installed. [VERIFIED: npm list] | — |
| TypeScript | `npm run typecheck` | ✓ | 5.9.3 installed. [VERIFIED: npm list] | — |
| FlashQuery server | Phase 1 | Not required. [CITED: 01-CONTEXT.md D-05] | Defer to Phase 2+. |

**Missing dependencies with no fallback:** none for Phase 1. [VERIFIED: environment audit]

**Missing dependencies with fallback:** shell Node version is outside Cate `>=20 <23`; planner should run under project Node 20/22 if engine-sensitive failures appear. [VERIFIED: command output + package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Bearer token handling is isolated in main-process `credentials.ts`; renderer receives no raw token in Phase 1. [CITED: 01-CONTEXT.md D-10..D-13] |
| V3 Session Management | no | No login/session flow is implemented in Phase 1. [CITED: 01-CONTEXT.md D-05] |
| V4 Access Control | yes | Renderer cannot access Node/Electron APIs directly; future privileged operations stay in main/preload boundary. [CITED: AGENTS.md] |
| V5 Input Validation | yes | Sanitize malformed `flashqueryConnection` data to absent connection. [CITED: external Requirements §6.1.1] |
| V6 Cryptography | no | No crypto is implemented in Phase 1. [CITED: 01-CONTEXT.md D-05] |

### Known Threat Patterns for Electron Credential Metadata

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token disclosure through renderer state/project files/logs | Information Disclosure | Centralize token I/O in `credentials.ts`, avoid raw token snapshots, and test with redaction-safe fixtures. [CITED: 01-CONTEXT.md D-13] |
| Workspace metadata poisoning via malformed `.cate/workspace.json` | Tampering | Validate/sanitize `flashqueryConnection` on load; treat invalid data as absent. [CITED: external Requirements §6.1.1] |
| Cross-workspace event leakage | Information Disclosure | Keep manager subscriber maps keyed by workspace ID and event type. [CITED: external Requirements §6.1.6] |

## Sources

### Primary (HIGH confidence)
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/phases/01-foundation/01-CONTEXT.md` - locked Phase 1 decisions and constraints.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` - REQ-001, REQ-002, REQ-003, REQ-013, Phase 1 boundary.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` - T-U-001 through T-U-020.
- Context7 `/sindresorhus/electron-store` - ESM import and `get`/`set`/`delete` APIs.
- Context7 `/vitest-dev/vitest/v3_2_4` - module mocking and fake timers.

### Secondary (MEDIUM confidence)
- Cate source grep/read: `src/shared/types.ts`, `src/main/workspaceManager.ts`, `src/main/store.ts`, `src/main/projectWorkspaceStore.ts`, `src/renderer/lib/session.ts`, `src/renderer/stores/appStore.ts`, `vitest.config.ts`.
- npm registry checks for installed/current versions of `electron-store`, `vitest`, `typescript`, `electron`, `react`, and `zustand`.

### Tertiary (LOW confidence)
- Assumptions A1..A4 in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - package versions and docs were verified via `npm list`, `npm view`, and Context7.
- Architecture: HIGH - code paths were verified against current Cate source files.
- Pitfalls: MEDIUM - persistence and scope pitfalls are source-backed; some test-flake details are inferred.

**Research date:** 2026-05-28
**Valid until:** 2026-06-27 for Phase 1 planning; re-check package APIs if implementation adds or upgrades dependencies.
