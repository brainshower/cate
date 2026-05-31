# Phase 02: Connection Layer - Research

**Researched:** 2026-05-29 [VERIFIED: gsd-sdk init.phase-op]
**Domain:** Electron main-process FlashQuery HTTP readiness probing, connection state, retry timers, and manager subscriptions [VERIFIED: .planning/ROADMAP.md]
**Confidence:** HIGH [VERIFIED: external product docs, Cate Phase 1 code, FlashQuery server source]

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 2. These docs are the primary source for REQ-004, REQ-005, REQ-006, REQ-011 manager-side behavior, and T-U-021 through T-U-039. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- If `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, or Phase 2 context appears ambiguous, agents must re-read the external requirements and test-plan docs before asking the user. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- No additional user discussion is needed before planning Phase 2. The product docs lock the behavior states, retry bounds, status payload expectations, and tests. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Implement only REQ-004, REQ-005, REQ-006, and manager-side REQ-011 in Phase 2. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Keep Phase 2 inside `src/main/flashquery/clientManager.ts` and its focused tests unless a small local type/helper adjustment is required. Do not add `flashquery:*` IPC channels or preload methods in this phase. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Preserve lazy behavior: Cate startup and manager construction must not eagerly probe FlashQuery. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Keep FlashQuery runtime ownership outside Cate. Cate probes the configured HTTP MCP endpoint and must not start FlashQuery, configure Supabase, inspect the vault directly, or duplicate FlashQuery storage behavior. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- The first probe for a configured workspace must issue `GET <flashqueryConnection.url>/mcp/info` and omit `Authorization`. [VERIFIED: external Requirements.md §6.1.4]
- A successful `200 OK` JSON response must extract at least `version` and `instance_id` and transition status to `live`. [VERIFIED: external Requirements.md §6.1.4]
- Non-200 responses, malformed info payloads, and network-level failures must transition to `disconnected` with useful error text. [VERIFIED: external Requirements.md §6.1.4]
- Model exactly these v1 production states: `connecting`, `live`, and `disconnected`. [VERIFIED: external Requirements.md §6.1.5]
- Failed probes schedule exponential backoff starting at 2 seconds, doubling on repeated failures, and capping at 60 seconds. [VERIFIED: external Requirements.md §6.1.5]
- Manual retry while disconnected must clear a pending backoff timer, immediately probe, and transition to `connecting`. [VERIFIED: external Requirements.md §6.1.5]
- `dispose(workspaceId)` must cancel retry timers, release per-workspace state, and prevent disposed workspaces from receiving late retry/status events. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Preserve `subscribe(workspaceId, 'status', handler)` and make status transitions observable through it. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Status subscribers must be isolated by workspace ID and event type. [VERIFIED: external Requirements.md §6.1.6]
- `disconnected` status payloads include `error`; `connecting` and `live` payloads omit `error`. [VERIFIED: external Requirements.md §6.2.5 and Test Plan §4.2.4]
- Phase 2 must cover T-U-021 through T-U-039 in `src/main/flashquery/clientManager.test.ts`. [VERIFIED: external Test Plan §4.2]

### the agent's Discretion
- The planner may choose exact public method names for initiating a probe/manual retry as long as the manager remains clean for Phase 3 IPC handlers to call. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- The planner may choose internal state shape for metadata, retry timers, and subscribers as long as observable requirements are satisfied. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- The planner may decide whether to normalize trailing slashes inside the manager or through a helper, provided `GET /mcp/info` is deterministic and tested. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
- `flashquery:setConnection`, `flashquery:listVault`, `flashquery:getDocument`, `flashquery:writeDocument`, preload APIs, and renderer-window `flashquery:status` broadcast wiring belong to Phase 3. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Vault panel, status chip UI, settings dialog, workspace context-menu entry, editor URI routing, E2E harness, and visual/design checks belong to later roadmap phases. [VERIFIED: .planning/ROADMAP.md]
- Live vault-change notifications, SSE subscription, conflict detection, OAuth, refresh-token rotation, keychain migration, stdio transport, and vault document creation remain outside this phase. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-004 | Probe `GET /mcp/info`, extract version and instance ID, capture failures. [VERIFIED: .planning/REQUIREMENTS.md] | FlashQuery source confirms `/mcp/info` returns `version` and `instance_id` and is registered before auth middleware. [VERIFIED: FlashQuery `src/mcp/server.ts:57` and `:728`] |
| REQ-005 | Reconnection state machine and retry. [VERIFIED: .planning/REQUIREMENTS.md] | Use manager-owned per-workspace state with `connecting` → `live` or `disconnected`, retry delays 2s/4s/.../60s, manual retry clearing timers. [VERIFIED: external Requirements.md §6.1.5] |
| REQ-006 | Generic workspace-scoped subscribe interface. [VERIFIED: .planning/REQUIREMENTS.md] | Extend the existing Phase 1 subscription map rather than adding IPC or renderer events. [VERIFIED: `src/main/flashquery/clientManager.ts:1`] |
| REQ-011 | Manager-side status event production. [VERIFIED: .planning/REQUIREMENTS.md] | Emit internal `status` events with `{ status, error?, version?, instanceId? }`; Phase 3 maps those to `flashquery:status` IPC. [VERIFIED: external Requirements.md §6.2.5; .planning/ROADMAP.md Phase 3] |
</phase_requirements>

## Summary

Phase 2 should extend the Phase 1 `FlashQueryClientManager` skeleton into a deterministic, unit-tested connection layer for configured workspaces. The implementation should stay in the Electron main-process FlashQuery module and should not add renderer, preload, IPC channel, vault, or UI behavior. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]

The core implementation surface is a small public manager API for Phase 3 to call, plus private helpers for building the info URL, validating the info payload, emitting status events, and scheduling/clearing retry timers. The manager constructor must remain inert; network activity should begin only when a configured workspace is explicitly activated/probed. [VERIFIED: `src/main/flashquery/clientManager.test.ts:5`; .planning/phases/02-connection-layer/02-CONTEXT.md]

**Primary recommendation:** implement Phase 2 as three focused changes aligned to roadmap 2.1/2.2/2.3: probe transport first, state machine/retry second, subscription payload behavior third, with all T-U-021..039 covered in `src/main/flashquery/clientManager.test.ts`. [VERIFIED: .planning/ROADMAP.md and external Test Plan §4.2]

## Scope Summary And Non-Goals

**In scope**
- Add manager-side connection status types for `connecting`, `live`, and `disconnected`. [VERIFIED: external Requirements.md §6.1.5]
- Add a method to start/probe a configured `FlashQueryConnection` for a workspace. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Probe `GET /mcp/info` using `globalThis.fetch`, no `Authorization` header. [VERIFIED: external Requirements.md §6.1.4]
- Parse successful info payloads for `version` and `instance_id`. [VERIFIED: FlashQuery `src/mcp/server.ts:57`]
- Map non-200, JSON/payload validation, and fetch rejection failures to `disconnected` with useful `error`. [VERIFIED: external Requirements.md §6.1.4]
- Implement retry backoff, manual retry, timer cleanup, and late-result suppression after dispose. [VERIFIED: external Requirements.md §6.1.5]
- Emit status events through the existing subscribe contract and isolate subscribers by workspace/event type. [VERIFIED: external Requirements.md §6.1.6]

**Non-goals**
- Do not add `src/shared/ipc-channels.ts` entries for FlashQuery. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Do not edit `src/preload/index.ts` or `src/shared/electron-api.d.ts` for FlashQuery Phase 2 behavior. [VERIFIED: .planning/ROADMAP.md Phase 3]
- Do not implement vault list/read/write, MCP SDK POST calls, SSE, UI chip, settings dialog, editor routing, or renderer broadcasts. [VERIFIED: .planning/ROADMAP.md Phases 3-6]
- Do not start or manage the FlashQuery process from Cate. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]

## Project Constraints (from AGENTS.md)

- Use the existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; avoid adding a separate backend or UI framework. [VERIFIED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work belongs behind main/preload boundaries. [VERIFIED: AGENTS.md]
- FlashQuery data remains in the configured FlashQuery instance and vault; Cate stores only connection metadata, preferences, and UI/session state. [VERIFIED: AGENTS.md]
- Connection and context behavior should be workspace-aware. [VERIFIED: AGENTS.md]
- Prefer FlashQuery host-visible MCP/HTTP integration; leave stdio for later only if needed. [VERIFIED: AGENTS.md]
- Do not break existing Cate agent, terminal, editor, browser, Git, workspace, or layout behavior. [VERIFIED: AGENTS.md]
- Unit tests should cover config, IPC validation, pure helpers, and renderer state where relevant; Phase 2 is main-process unit-test focused. [VERIFIED: AGENTS.md and .planning/ROADMAP.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| `/mcp/info` readiness probe | Electron Main Process | FlashQuery HTTP server | Main owns network/privileged integration; FlashQuery exposes the readiness endpoint. [VERIFIED: .planning/codebase/ARCHITECTURE.md; FlashQuery `src/mcp/server.ts:728`] |
| Workspace-scoped connection state | Electron Main Process | Shared serializable types | Main already owns workspace metadata authority and future IPC handlers will consume manager state. [VERIFIED: .planning/codebase/ARCHITECTURE.md] |
| Retry timers and manual retry | Electron Main Process | Vitest fake-timer tests | Timer lifecycle belongs with manager state so dispose can cancel it deterministically. [VERIFIED: external Requirements.md §6.1.5] |
| Status subscription events | Electron Main Process | Phase 3 IPC broadcast | Phase 2 emits manager events; Phase 3 broadcasts them to renderer windows. [VERIFIED: external Requirements.md §6.1.6 and .planning/ROADMAP.md] |
| UI status chip and retry click | Renderer | Phase 3 IPC | Renderer chip is explicitly later work; Phase 2 only prepares the manager method the click will call. [VERIFIED: .planning/ROADMAP.md Phases 4-5] |

## Standard Stack

### Core

| Library/API | Version | Purpose | Why Standard |
|-------------|---------|---------|--------------|
| TypeScript | 5.9.3 installed / `^5.6.0` declared | Strict main-process implementation. | Existing Cate source is TypeScript strict mode. [VERIFIED: AGENTS.md; package.json] |
| Electron main process | 41.2.0 installed / `^41.2.0` declared | Own privileged FlashQuery manager behavior. | Cate architecture assigns OS/network integration to main process. [VERIFIED: .planning/codebase/ARCHITECTURE.md; package.json] |
| Node built-in `fetch` | Node runtime global | Probe `GET /mcp/info` without adding a dependency. | Existing test plan says mock `global.fetch`; no new HTTP package is required. [VERIFIED: external Test Plan §4.2; `src/main/flashquery/clientManager.test.ts:6`] |
| Vitest | 3.2.4 | Unit tests, `vi` mocks, fake timers. | Existing config includes `src/**/*.test.ts` in node environment; Vitest docs support fake timers. [VERIFIED: `vitest.config.ts`; Context7 `/vitest-dev/vitest/v3_2_4`] |

### Supporting

| Library/API | Version | Purpose | When to Use |
|-------------|---------|---------|-------------|
| `FlashQueryConnection` | local shared type | Input shape for configured workspace connection. | Accept manager probe inputs from Phase 1 workspace metadata. [VERIFIED: `src/shared/types.ts:152`] |
| `getWorkspaceToken` | local helper | Later authenticated calls. | Do not use it for `/mcp/info`; only consider if adding a future-call placeholder, with tests proving no probe auth. [VERIFIED: `src/main/flashquery/credentials.ts`; external Requirements.md §6.1.4] |
| `setTimeout`/`clearTimeout` | Node globals | Retry scheduling and cleanup. | Needed for exponential backoff and disposal cleanup. [VERIFIED: external Requirements.md §6.1.5] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `fetch` probe | MCP SDK `StreamableHTTPClientTransport` | Product tests require the readiness probe and `Authorization` assertions at `fetch`; MCP SDK POST transport belongs later with vault calls. [VERIFIED: external Test Plan §4.2; .planning/ROADMAP.md Phase 3] |
| Single manager map | Separate state machine package | New package is unnecessary for three states and local timer behavior. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md] |

**Installation:** no new packages. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]

## Files Likely To Modify Or Read

| Path | Action | Notes |
|------|--------|-------|
| `src/main/flashquery/clientManager.ts` | Modify | Primary implementation file; currently only has event type, event shape, subscriber map, and `dispose`. [VERIFIED: `src/main/flashquery/clientManager.ts:1`] |
| `src/main/flashquery/clientManager.test.ts` | Modify | Primary test file; currently proves no eager network work, subscription registration, workspace scoping, and dispose map deletion. [VERIFIED: `src/main/flashquery/clientManager.test.ts:5`] |
| `src/shared/types.ts` | Read, avoid modifying unless necessary | Provides `FlashQueryConnection` with `transport: 'http'`, `url`, and optional bearer auth. [VERIFIED: `src/shared/types.ts:152`] |
| `src/main/flashquery/credentials.ts` | Read only | Token helper exists, but `/mcp/info` must not send bearer auth. [VERIFIED: external Requirements.md §6.1.4] |
| External Requirements.md | Mandatory read-first | Read §6.1.4, §6.1.5, §6.1.6, §6.2.5, §8.3, §11 before planning or implementation. [VERIFIED: user objective; .planning/phases/02-connection-layer/02-CONTEXT.md] |
| External Test Plan.md | Mandatory read-first | Read §4.2, §5.1, §5.2, §8.1 for T-U-021..039. [VERIFIED: user objective; external Test Plan §4.2] |

## Existing Patterns From Phase 1 And Cate Tests

- Phase 1 established an inert `FlashQueryClientManager`; constructor network activity is explicitly tested against `globalThis.fetch`. [VERIFIED: `src/main/flashquery/clientManager.test.ts:5`]
- Phase 1 established workspace-scoped subscriber state keyed by workspace ID and event type. [VERIFIED: `src/main/flashquery/clientManager.ts:11`]
- Existing tests use `vi.fn()` and direct module construction for main-process pure manager behavior. [VERIFIED: `src/main/flashquery/clientManager.test.ts:1`]
- Cate’s Vitest config runs `.test.ts` files in the node environment and restores mocks between tests. [VERIFIED: `vitest.config.ts`]
- Cate test guidance recommends `vi.useFakeTimers()` for timing behavior and cleanup with real timers after each test. [VERIFIED: .planning/codebase/TESTING.md; Context7 `/vitest-dev/vitest/v3_2_4`]
- Existing code style uses single quotes, no semicolons, 2-space indentation, named exports, and colocated `.test.ts` files. [VERIFIED: AGENTS.md]

## Recommended Plan Breakdown

### 2.1 Probe Transport

Implement public manager entry points such as `connect(workspaceId, connection)` and `retry(workspaceId)` or equivalent names. The entry point should normalize the configured base URL, construct `<base>/mcp/info`, emit `connecting`, then call `fetch` with a GET request and no `Authorization` header. [VERIFIED: external Requirements.md §6.1.4; .planning/phases/02-connection-layer/02-CONTEXT.md]

Recommended helper shape: `buildInfoUrl(url: string): string`, `parseInfoResponse(value: unknown): { version: string; instanceId: string } | null`, and `errorMessageFromFailure(error: unknown): string`. These can stay private unless tests become cleaner with exported pure helpers. [ASSUMED]

Test first: T-U-021 through T-U-025. Use configurable `Response` objects or simple fetch return mocks with `ok`, `status`, `statusText`, and `json`. Assert the exact URL, method, and absence of `Authorization`. [VERIFIED: external Test Plan §4.2.1]

### 2.2 State Machine And Retry

Add per-workspace fields for `connection`, `status`, `metadata`, `error`, `retryDelayMs`, `retryTimer`, and an attempt/disposal token to ignore stale async completions after dispose or a newer probe. [ASSUMED]

On failure, emit `disconnected` with error and schedule the current delay. After scheduling, advance the next delay by doubling and capping at `60_000`. On success, clear timers, store metadata, emit `live`, and reset delay to `2_000`. Manual retry should clear the timer and immediately call the same probe path. [VERIFIED: external Requirements.md §6.1.5]

Test next: T-U-026 through T-U-032. Use `vi.useFakeTimers()`, `vi.advanceTimersByTime` or async timer advancement where probe promises must settle, and always restore real timers in `afterEach`. [VERIFIED: external Test Plan §4.2.2; Context7 `/vitest-dev/vitest/v3_2_4`]

### 2.3 Subscription Events

Finalize event payloads and emission behavior. Keep `status` events as the only emitted Phase 2 event; allow registration for future event types without crashing. Consider widening `FlashQueryClientEventType` to include `'tools-changed' | (string & {})` because the external spec names those future event types. [VERIFIED: external Requirements.md §6.1.6]

Test last: T-U-033 through T-U-039. Assert subscriber invocation order enough to prove `connecting` before `live` or `disconnected`; assert unsubscribe suppression; assert cross-workspace and event-type isolation; assert error is present only for disconnected. [VERIFIED: external Test Plan §4.2.3 and §4.2.4]

## Concrete Test Obligations T-U-021..039

| Test ID | Required Behavior | Planning Note |
|---------|-------------------|---------------|
| T-U-021 | First-time connect issues `GET /mcp/info` against `<url>/mcp/info` with no `Authorization`. [VERIFIED: external Test Plan §4.2.1] | Assert URL joining for both trailing and non-trailing slash. [ASSUMED] |
| T-U-022 | `200 OK` with `{ version, instance_id, auth_schemes: ['bearer'] }` transitions to `live`. [VERIFIED: external Test Plan §4.2.1] | Verify metadata is exposed through status or a getter for Phase 3. [ASSUMED] |
| T-U-023 | Bearer token is not sent on the probe. [VERIFIED: external Test Plan §4.2.1] | Full POST/MCP auth is later; in Phase 2, assert token-bearing `FlashQueryConnection` still sends no probe auth. [VERIFIED: external Requirements.md §6.1.4] |
| T-U-024 | Non-200 probe transitions to `disconnected` with error text. [VERIFIED: external Test Plan §4.2.1] | Include status code/status text in error. [ASSUMED] |
| T-U-025 | Fetch rejection transitions to `disconnected` with rejection reason. [VERIFIED: external Test Plan §4.2.1] | Convert unknown thrown values safely. [ASSUMED] |
| T-U-026 | Initial state for configured workspace is `connecting`. [VERIFIED: external Test Plan §4.2.2] | First emitted event after connect/probe should be `connecting`. [VERIFIED: external Requirements.md §6.1.5] |
| T-U-027 | Success ends in `live` and status event carries `live`. [VERIFIED: external Test Plan §4.2.2] | Assert no stale error on live payload. [VERIFIED: external Test Plan §4.2.4] |
| T-U-028 | Failure ends in `disconnected` and event carries `error`. [VERIFIED: external Test Plan §4.2.2] | Assert one failure schedules retry. [VERIFIED: external Requirements.md §6.1.5] |
| T-U-029 | Retry backoff starts at 2s, then 4s, doubling to max 60s. [VERIFIED: external Test Plan §4.2.2] | Prefer checking scheduled timer behavior via fake timers over private fields. [VERIFIED: .planning/codebase/TESTING.md] |
| T-U-030 | Manual retry while disconnected immediately probes and clears backoff. [VERIFIED: external Test Plan §4.2.2] | Assert pending timer does not cause an extra probe later. [ASSUMED] |
| T-U-031 | Success after failure resets backoff to initial value. [VERIFIED: external Test Plan §4.2.2] | After success, force another failure and assert next retry is 2s. [ASSUMED] |
| T-U-032 | `dispose(workspaceId)` cancels retry timer. [VERIFIED: external Test Plan §4.2.2] | Also assert late fetch resolution after dispose emits nothing. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md] |
| T-U-033 | `subscribe(ws, 'status', handler)` invokes handler on every status change. [VERIFIED: external Test Plan §4.2.3] | Capture event array and assert status sequence. [ASSUMED] |
| T-U-034 | Unsubscribe stops invocations. [VERIFIED: external Test Plan §4.2.3] | Preserve Phase 1 immediate unsubscribe behavior. [VERIFIED: `src/main/flashquery/clientManager.test.ts:28`] |
| T-U-035 | Multiple same-workspace subscribers all receive events. [VERIFIED: external Test Plan §4.2.3] | Use two handlers, same workspace/type. [VERIFIED: external Test Plan §4.2.3] |
| T-U-036 | Different workspace subscribers do not receive each other’s events. [VERIFIED: external Test Plan §4.2.3] | Use independent configured connections. [ASSUMED] |
| T-U-037 | Future event type subscribers do not crash and receive no v1 events. [VERIFIED: external Test Plan §4.2.3] | Widen event type beyond current `'status' | 'vault-changed'`. [VERIFIED: external Requirements.md §6.1.6] |
| T-U-038 | `disconnected` status includes `error`. [VERIFIED: external Test Plan §4.2.4] | Error must be on payload, not only internal state. [VERIFIED: external Requirements.md §6.2.5] |
| T-U-039 | `live` and `connecting` statuses omit `error`. [VERIFIED: external Test Plan §4.2.4] | Clear stale errors before emitting non-disconnected states. [VERIFIED: external Requirements.md §6.2.5] |

## Architecture Patterns

### System Architecture Diagram

```text
Phase 3 caller / future UI action
        |
        v
FlashQueryClientManager.connect(workspaceId, FlashQueryConnection)
        |
        v
Emit status: connecting ---------------> status subscribers for same workspace
        |
        v
GET <connection.url>/mcp/info using fetch, no Authorization
        |
        +--> 200 + valid JSON(version, instance_id)
        |         |
        |         v
        |   Store metadata, clear retry timer, reset delay, emit live
        |
        +--> non-200 / invalid JSON / network error
                  |
                  v
            Store error, emit disconnected(error), schedule retry
                  |
                  v
            Retry timer fires -> same probe path
```

### Recommended Project Structure

```text
src/main/flashquery/
├── clientManager.ts       # Phase 2 implementation: probe, status, retry, subscriptions
├── clientManager.test.ts  # T-U-021..039 with mocked fetch and fake timers
├── credentials.ts         # Existing token helper; do not use for /mcp/info auth
└── uri.ts                 # Existing vault URI helper; not part of Phase 2 connection logic
```

### Pattern 1: Main-Process Manager Owns Runtime State

**What:** Keep connection state, retry timers, and subscribers in `FlashQueryClientManager` per workspace. [VERIFIED: `src/main/flashquery/clientManager.ts:15`]

**When to use:** All Phase 2 connection lifecycle behavior. [VERIFIED: .planning/ROADMAP.md]

**Example:**
```typescript
// Source: Phase 1 manager shape in src/main/flashquery/clientManager.ts
interface WorkspaceClientState {
  subscribers: Map<FlashQueryClientEventType, Set<FlashQueryClientEventHandler>>
}
```

### Pattern 2: Timer Cleanup At Ownership Boundary

**What:** Store retry timer handles in workspace state and clear them during success, manual retry, and dispose. [VERIFIED: external Requirements.md §6.1.5]

**When to use:** Any failed probe or disposed workspace. [VERIFIED: external Test Plan §4.2.2]

**Example:**
```typescript
// Source: recommended local pattern derived from Phase 2 requirements
if (state.retryTimer) {
  clearTimeout(state.retryTimer)
  state.retryTimer = undefined
}
```

### Anti-Patterns to Avoid

- **Adding IPC early:** Phase 3 owns `flashquery:*` IPC and preload work; adding it in Phase 2 mixes manager state with renderer contracts. [VERIFIED: .planning/ROADMAP.md]
- **Sending bearer auth to `/mcp/info`:** FlashQuery registers `/mcp/info` before auth middleware and the product spec forbids probe auth. [VERIFIED: FlashQuery `src/mcp/server.ts:723`; external Requirements.md §6.1.4]
- **Eager probe on constructor:** Phase 1 explicitly tests no eager network work and Phase 2 must preserve lazy behavior. [VERIFIED: `src/main/flashquery/clientManager.test.ts:5`; .planning/phases/02-connection-layer/02-CONTEXT.md]
- **Leaking stale errors:** `connecting` and `live` payloads must omit `error`, so do not reuse one mutable payload object across states. [VERIFIED: external Test Plan §4.2.4]
- **Leaving timers after dispose:** Disposed workspaces must not receive late retry/status events. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP readiness probe | Custom socket/client transport | `globalThis.fetch` | Test plan is written around mocked fetch and request-header assertions. [VERIFIED: external Test Plan §4.2] |
| Timer control in tests | Real sleeps | Vitest fake timers | Vitest provides fake timers and timer advancement; real sleeps would make retry tests slow/flaky. [VERIFIED: Context7 `/vitest-dev/vitest/v3_2_4`] |
| Auth storage | New token persistence | Existing `credentials.ts` helper | Phase 1 created token helpers; probe itself must not send tokens. [VERIFIED: `src/main/flashquery/credentials.ts`; external Requirements.md §6.1.4] |
| UI retry state | Renderer-side retry loop | Manager manual retry method | Retry lifecycle belongs with connection state and timers. [VERIFIED: external Requirements.md §6.1.5] |

**Key insight:** Phase 2 is a manager contract phase, not an MCP-vault phase; keeping all behavior unit-testable in one main-process manager prevents later IPC/UI phases from reimplementing connection state. [VERIFIED: .planning/ROADMAP.md]

## Common Pitfalls

### Pitfall 1: URL Joining Breaks `/mcp/info`

**What goes wrong:** A base URL with a trailing slash produces `//mcp/info`, or a base URL with a path loses/duplicates path segments. [ASSUMED]
**Why it happens:** Manual string concatenation ignores URL normalization. [ASSUMED]
**How to avoid:** Use a small deterministic helper and tests for `http://host:3100` and `http://host:3100/`. [ASSUMED]
**Warning signs:** T-U-021 only tests one URL shape. [ASSUMED]

### Pitfall 2: Async Probe Completes After Dispose

**What goes wrong:** A slow fetch resolves after `dispose(workspaceId)` and emits `live` or schedules retry for a deleted workspace. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
**Why it happens:** The promise continuation still closes over old state. [ASSUMED]
**How to avoid:** Use an attempt token/generation number or re-check the current state object before emitting. [ASSUMED]
**Warning signs:** Dispose tests only check private map deletion, not late event suppression. [VERIFIED: `src/main/flashquery/clientManager.test.ts:35`]

### Pitfall 3: Manual Retry Does Not Cancel Existing Backoff

**What goes wrong:** Manual retry probes immediately, then the old timer fires and probes again. [VERIFIED: external Test Plan §4.2.2]
**Why it happens:** Code starts a new probe without clearing `retryTimer`. [ASSUMED]
**How to avoid:** Centralize timer clearing before any manual retry or successful probe. [ASSUMED]
**Warning signs:** Fetch call count increases unexpectedly after advancing fake timers. [ASSUMED]

### Pitfall 4: Event Type Must Stay Wide

**What goes wrong:** A later edit narrows `FlashQueryClientEventType` back to only `'status' | 'vault-changed'`, losing the Phase 1 gap fix that already added `'tools-changed' | (string & {})`. [VERIFIED: `src/main/flashquery/clientManager.ts:1`; external Requirements.md §6.1.6]
**Why it happens:** Phase 2 work touches the same manager type while adding status payloads and emit helpers. [VERIFIED: Phase 2 plans]
**How to avoid:** Preserve the current widened `FlashQueryClientEventType` name and union while continuing to emit only `status` in Phase 2. [VERIFIED: external Test Plan §4.2.3]
**Warning signs:** T-U-037 no longer compiles for `'tools-changed'` or future event strings. [VERIFIED: external Test Plan §4.2.3]

## Code Examples

### Mocking The Probe

```typescript
// Source: Vitest docs via Context7 /vitest-dev/vitest/v3_2_4 and Cate clientManager.test.ts
const fetchMock = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ version: '1.2.3', instance_id: 'fq-local', auth_schemes: ['bearer'] }),
})
Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true })
```

### Fake Timer Retry Test Shape

```typescript
// Source: Vitest docs via Context7 /vitest-dev/vitest/v3_2_4
vi.useFakeTimers()
try {
  // trigger failed probe
  await vi.advanceTimersByTimeAsync(2_000)
  expect(fetchMock).toHaveBeenCalledTimes(2)
} finally {
  vi.useRealTimers()
}
```

### Status Payload Shape

```typescript
// Source: external Requirements.md §6.2.5, manager-side version for Phase 2
type FlashQueryStatusPayload =
  | { status: 'connecting' }
  | { status: 'live'; version: string; instanceId: string }
  | { status: 'disconnected'; error: string }
```

## State Of The Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FlashQuery manager skeleton only | Manager probes `/mcp/info`, models status, retries, and emits events | Phase 2 target | Planner should create implementation tasks around manager state, not IPC/UI. [VERIFIED: .planning/ROADMAP.md] |
| Stdio-first assumption | HTTP MCP readiness surface first | Product v1 planning | Cate should integrate with a separately running FlashQuery HTTP endpoint. [VERIFIED: .planning/REQUIREMENTS.md] |
| Renderer broadcast in same slice | Manager-side event production now, IPC broadcast in Phase 3 | Roadmap phase split | Do not add `flashquery:status` channel in Phase 2. [VERIFIED: .planning/ROADMAP.md] |

**Deprecated/outdated:**
- Treating `/mcp/info` as authenticated is outdated for this integration; FlashQuery source registers the route before auth middleware. [VERIFIED: FlashQuery `src/mcp/server.ts:723`]
- Implementing stdio transport in this phase is out of scope for v1. [VERIFIED: .planning/REQUIREMENTS.md Out Of Scope]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Private helper names such as `buildInfoUrl` and `parseInfoResponse` are recommended but not mandated. | Recommended Plan Breakdown | Low; planner can choose equivalent names. |
| A2 | Workspace state should include connection, status, metadata, error, retry delay, timer, and an attempt token. | Recommended Plan Breakdown | Medium; missing attempt token could allow late events after dispose. |
| A3 | URL joining should test trailing and non-trailing slash variants. | Concrete Test Obligations / Pitfalls | Low; improves T-U-021 robustness. |
| A4 | Non-200 errors should include status code/status text. | Concrete Test Obligations | Low; product requires useful error text but not exact wording. |
| A5 | Retry tests should prefer public behavior over private fields. | Concrete Test Obligations | Low; keeps tests resilient to internal state shape. |

## Open Questions (RESOLVED)

1. **Should `live` status payload expose metadata as `{ version, instanceId }` or only status?**
   - What we know: product requires extracting `version` and `instance_id`; Phase 3 dialog/status surfaces will need metadata. [VERIFIED: external Requirements.md §6.1.4]
   - RESOLVED: Phase 2 manager-side `live` status payloads should expose `{ version, instanceId }`. This satisfies REQ-004's extraction requirement and gives Phase 3 IPC/dialog code a stable manager source. Phase 3 may choose whether to include or omit these metadata fields in renderer broadcasts if its renderer contract remains narrower.

2. **Should malformed successful JSON schedule retry?**
   - What we know: malformed/invalid info payloads must transition to `disconnected` with useful error text. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
   - RESOLVED: Treat invalid JSON or a malformed `/mcp/info` payload as a failed probe for REQ-005. The manager should emit `disconnected` with safe error text and schedule retry using the same exponential-backoff path as non-200 and network-level failures.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Runtime, `fetch`, tests | ⚠ | v24.7.0 in current shell; package requires `>=20 <23` | Use Node 20 or 22 for implementation verification. [VERIFIED: `node --version`; package.json] |
| npm | Scripts and Vitest invocation | ✓ | 11.5.1 | None needed. [VERIFIED: `npm --version`] |
| Vitest | T-U-021..039 | ✓ | 3.2.4 | None needed. [VERIFIED: `npx vitest --version`] |
| TypeScript typecheck script | Verification | ✓ | `npm run typecheck` exists | None needed. [VERIFIED: package.json] |
| FlashQuery server | Real integration | Not required for Phase 2 unit tests | — | Mock `globalThis.fetch`. [VERIFIED: external Test Plan §4.2] |

**Missing dependencies with no fallback:**
- None for Phase 2 unit-test implementation. [VERIFIED: external Test Plan §4.2]

**Missing dependencies with fallback:**
- Current shell Node v24 is outside Cate’s supported range; use Node 20/22 before final verification. [VERIFIED: `node --version`; package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Do not send bearer auth on public `/mcp/info`; save authenticated POST behavior for later phases. [VERIFIED: external Requirements.md §6.1.4] |
| V3 Session Management | no | Phase 2 does not open MCP sessions or SSE streams. [VERIFIED: .planning/ROADMAP.md] |
| V4 Access Control | no | Phase 2 has no renderer IPC or filesystem/vault access. [VERIFIED: .planning/ROADMAP.md] |
| V5 Input Validation | yes | Validate `/mcp/info` JSON shape before accepting `live`. [VERIFIED: external Requirements.md §6.1.4] |
| V6 Cryptography | no | Phase 2 does not create, validate, or store tokens. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md] |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Secret leakage in probe headers | Information Disclosure | Assert no `Authorization` on `/mcp/info`. [VERIFIED: external Test Plan T-U-021/T-U-023] |
| Renderer privilege expansion | Elevation of Privilege | Do not add preload or IPC in Phase 2. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md] |
| Stale async status after dispose | Tampering / Reliability | Suppress late probe completions and clear timers on dispose. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md] |

## Validation Architecture

Nyquist validation architecture is omitted because `.planning/config.json` sets `workflow.nyquist_validation` to `false`. [VERIFIED: .planning/config.json]

Required focused verification remains:
- `npx vitest run src/main/flashquery/clientManager.test.ts` [VERIFIED: external Test Plan §4.2]
- `npm run typecheck` using a supported Node 20/22 runtime [VERIFIED: package.json]

## Canonical References

### Mandatory Read-First References
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — primary product requirements; read §6.1.4, §6.1.5, §6.1.6, §6.2.5, §8.3, §11 before planning or implementation. [VERIFIED: user objective]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — primary test obligations; read §4.2, §5.1, §5.2, §8.1 for T-U-021..039. [VERIFIED: user objective]

### Local Planning References
- `.planning/phases/02-connection-layer/02-CONTEXT.md` — locked Phase 2 decisions and boundaries. [VERIFIED: local file read]
- `.planning/REQUIREMENTS.md` — milestone requirement map and Phase 2 REQ traceability. [VERIFIED: local file read]
- `.planning/ROADMAP.md` — phase goal, success criteria, and 2.1/2.2/2.3 plan labels. [VERIFIED: local file read]
- `.planning/STATE.md` — confirms Phase 1 complete and Phase 2 next. [VERIFIED: local file read]
- `.planning/phases/01-foundation/01-01-SUMMARY.md` — workspace metadata completed. [VERIFIED: local file read]
- `.planning/phases/01-foundation/01-02-SUMMARY.md` — credential helper completed. [VERIFIED: local file read]
- `.planning/phases/01-foundation/01-03-SUMMARY.md` — URI helpers and inert manager skeleton completed. [VERIFIED: local file read]
- `.planning/codebase/ARCHITECTURE.md` — Electron layer boundaries. [VERIFIED: local file read]
- `.planning/codebase/TESTING.md` — Vitest/fake timer testing patterns. [VERIFIED: local file read]
- `.planning/codebase/CONCERNS.md` — preload/main-process risk areas. [VERIFIED: local file read]

### Code References
- `src/main/flashquery/clientManager.ts` — primary implementation target. [VERIFIED: local file read]
- `src/main/flashquery/clientManager.test.ts` — required unit test target. [VERIFIED: local file read]
- `src/shared/types.ts` — `FlashQueryConnection` source. [VERIFIED: local file read]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/src/mcp/server.ts` — authoritative `/mcp/info` behavior. [VERIFIED: FlashQuery source read]

## Sources

### Primary (HIGH confidence)
- External Cate FlashQuery Integration Requirements.md — §6.1.4, §6.1.5, §6.1.6, §6.2.5, §8.3, §11. [VERIFIED: local file read]
- External Cate FlashQuery Integration Test Plan.md — §4.2, §5.1, §5.2, §8.1. [VERIFIED: local file read]
- Cate Phase 2 CONTEXT.md — locked decisions and scope. [VERIFIED: local file read]
- Cate source files `src/main/flashquery/clientManager.ts`, `clientManager.test.ts`, `src/shared/types.ts`. [VERIFIED: local file read]
- FlashQuery `src/mcp/server.ts` — `/mcp/info` route and response shape. [VERIFIED: local file read]
- Context7 `/vitest-dev/vitest/v3_2_4` — fake timer APIs. [VERIFIED: Context7]

### Secondary (MEDIUM confidence)
- `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/TESTING.md`, `.planning/codebase/CONCERNS.md` — codebase map generated 2026-05-28. [VERIFIED: local file read]

### Tertiary (LOW confidence)
- Assumptions in the Assumptions Log; none should be locked without planner/user review. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing versions and scripts verified from `package.json`, Vitest config, and local commands. [VERIFIED: package.json; vitest.config.ts]
- Architecture: HIGH — phase boundary and main-process ownership are explicit in CONTEXT, ROADMAP, and codebase architecture. [VERIFIED: .planning/phases/02-connection-layer/02-CONTEXT.md]
- Pitfalls: MEDIUM — key pitfalls are verified by tests/requirements; some implementation details are inferred and marked `[ASSUMED]`. [VERIFIED: external Test Plan §4.2]

**Research date:** 2026-05-29 [VERIFIED: current_date]
**Valid until:** 2026-06-28 for Cate local implementation patterns; re-check FlashQuery `/mcp/info` source if FlashQuery server changes before implementation. [ASSUMED]
