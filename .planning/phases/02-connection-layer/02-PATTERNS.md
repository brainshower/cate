# Phase 02: Connection Layer - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 6
**Analogs found:** 6 / 6

## File Classification

| New/Modified/Read File | Role | Data Flow | Closest Analog | Match Quality |
|------------------------|------|-----------|----------------|---------------|
| `src/main/flashquery/clientManager.ts` | service | request-response + event-driven + timer lifecycle | `src/main/flashquery/clientManager.ts` | exact |
| `src/main/flashquery/clientManager.test.ts` | test | request-response + event-driven + timer lifecycle | `src/main/flashquery/clientManager.test.ts` | exact |
| `src/shared/types.ts` | model | transform/validation | `src/shared/types.ts` | exact |
| `src/main/flashquery/credentials.ts` | utility | CRUD | `src/main/flashquery/credentials.ts` | boundary-reference |
| `src/main/flashquery/uri.ts` | utility | transform | `src/main/flashquery/uri.ts` | role-match |
| `src/main/flashquery/uri.test.ts` / `credentials.test.ts` | test | transform + mocked dependency | Phase 1 FlashQuery tests | role-match |

## Pattern Assignments

### `src/main/flashquery/clientManager.ts` (service, request-response/event-driven)

**Analog:** `src/main/flashquery/clientManager.ts`

**Current imports pattern:** no imports yet. Phase 2 should add type-only imports from shared contracts if needed, matching local relative/shared alias style.

**Event contract pattern** (lines 1-9):
```typescript
export type FlashQueryClientEventType = 'status' | 'vault-changed'

export interface FlashQueryClientEvent {
  workspaceId: string
  type: FlashQueryClientEventType
  payload?: unknown
}

export type FlashQueryClientEventHandler = (event: FlashQueryClientEvent) => void
```

**Workspace-scoped state pattern** (lines 11-17):
```typescript
interface WorkspaceClientState {
  subscribers: Map<FlashQueryClientEventType, Set<FlashQueryClientEventHandler>>
}

export class FlashQueryClientManager {
  private readonly workspaceStates = new Map<string, WorkspaceClientState>()
```

**Subscription pattern** (lines 18-34):
```typescript
subscribe(
  workspaceId: string,
  type: FlashQueryClientEventType,
  handler: FlashQueryClientEventHandler,
): () => void {
  const state = this.getOrCreateWorkspaceState(workspaceId)
  let subscribers = state.subscribers.get(type)
  if (!subscribers) {
    subscribers = new Set()
    state.subscribers.set(type, subscribers)
  }
  subscribers.add(handler)

  return () => {
    subscribers?.delete(handler)
  }
}
```

**Dispose/get-or-create pattern** (lines 36-47):
```typescript
dispose(workspaceId: string): void {
  this.workspaceStates.delete(workspaceId)
}

private getOrCreateWorkspaceState(workspaceId: string): WorkspaceClientState {
  let state = this.workspaceStates.get(workspaceId)
  if (!state) {
    state = { subscribers: new Map() }
    this.workspaceStates.set(workspaceId, state)
  }
  return state
}
```

**Apply in Phase 2:** extend `WorkspaceClientState` in place with `connection`, `status`, `retryDelayMs`, `retryTimer`, and an attempt/disposal token. Add a private `emitStatus(workspaceId, payload)` that reads `state.subscribers.get('status')` and invokes handlers with `{ workspaceId, type: 'status', payload }`. Keep constructor inert.

**HTTP fetch pattern:** `src/main/auto-updater.ts` lines 135-144 show native `fetch` with explicit options and error handling:
```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 15000)
const res = await fetch(API_LATEST_URL, {
  signal: controller.signal,
  headers: { 'User-Agent': `Cate/${app.getVersion()}`, Accept: 'application/vnd.github.v3+json' },
})
clearTimeout(timeout)

if (!res.ok) throw new Error(`GitHub API responded with ${res.status}`)
const data = (await res.json()) as GitHubRelease
```

For `/mcp/info`, copy only the explicit `fetch(url, options)` and `res.ok` style. Do not copy auth headers or app-version headers. The Phase 2 probe must call `GET <base>/mcp/info` and omit `Authorization`.

**Timer cleanup pattern:** `src/main/ipc/pathValidation.ts` lines 70-78 and 85-99:
```typescript
function clearScopedWriteAllowance(windowId: number, safePath: string): void {
  const allowances = scopedWriteAllowances.get(windowId)
  const timer = allowances?.get(safePath)
  if (timer) clearTimeout(timer)
  allowances?.delete(safePath)
  if (allowances && allowances.size === 0) {
    scopedWriteAllowances.delete(windowId)
  }
}

const timer = setTimeout(() => {
  clearScopedWriteAllowance(windowId, safePath)
}, ttlMs)
```

Use this pattern for retry timer ownership: clear before replacing, clear on manual retry, clear on success, and clear all workspace-owned timers in `dispose(workspaceId)`.

---

### `src/main/flashquery/clientManager.test.ts` (test, request-response/event-driven/timer lifecycle)

**Analog:** `src/main/flashquery/clientManager.test.ts`

**Imports pattern** (lines 1-2):
```typescript
import { describe, expect, it, vi } from 'vitest'
import { FlashQueryClientManager } from './clientManager'
```

Add `beforeEach`/`afterEach` when fake timers and fetch restoration become global to the suite.

**Fetch mocking/no-eager-network pattern** (lines 5-14):
```typescript
const originalFetch = globalThis.fetch
const fetchSpy = vi.fn()
Object.defineProperty(globalThis, 'fetch', { value: fetchSpy, configurable: true })

new FlashQueryClientManager()

expect(fetchSpy).not.toHaveBeenCalled()
Object.defineProperty(globalThis, 'fetch', { value: originalFetch, configurable: true })
```

Copy this for T-U-021 through T-U-025, but move restoration to `afterEach` once many tests mock `globalThis.fetch`.

**Subscription assertions pattern** (lines 16-33):
```typescript
const unsubscribeStatus = manager.subscribe('workspace-1', 'status', statusHandler)
const unsubscribeVault = manager.subscribe('workspace-1', 'vault-changed', vaultHandler)

const states = (manager as unknown as { workspaceStates: Map<string, { subscribers: Map<string, Set<unknown>> }> }).workspaceStates
expect(states.get('workspace-1')?.subscribers.get('status')?.size).toBe(1)
expect(states.get('workspace-1')?.subscribers.get('vault-changed')?.size).toBe(1)

unsubscribeStatus()
unsubscribeVault()
```

Prefer public event assertions for new behavior. Keep private-state assertions only for lifecycle internals that are otherwise unobservable, such as timer cleanup if no getter exists.

**Workspace isolation/dispose test pattern** (lines 35-46):
```typescript
manager.subscribe('workspace-1', 'status', vi.fn())
manager.subscribe('workspace-2', 'status', vi.fn())
manager.dispose('workspace-1')
manager.dispose('workspace-1')

const states = (manager as unknown as { workspaceStates: Map<string, unknown> }).workspaceStates
expect(states.has('workspace-1')).toBe(false)
expect(states.has('workspace-2')).toBe(true)
```

Extend this for T-U-032 and late-result suppression: dispose the workspace, resolve the pending fetch, and assert no further status handler calls.

**Fake timer suite pattern:** `src/renderer/hooks/notificationDebouncer.test.ts` lines 8-14:
```typescript
beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})
```

**Fake timer assertions pattern:** `src/renderer/hooks/notificationDebouncer.test.ts` lines 68-80 and 98-108:
```typescript
d.request('t1', 'first')
vi.advanceTimersByTime(2000)
d.request('t1', 'second')
vi.advanceTimersByTime(2999)
expect(onFire).not.toHaveBeenCalled()
vi.advanceTimersByTime(1)
expect(onFire).toHaveBeenCalledTimes(1)

d.dispose()
vi.advanceTimersByTime(10_000)
expect(onFire).not.toHaveBeenCalled()
```

Use this shape for retry backoff tests: advance 1 ms before the retry boundary to assert no extra probe, then advance over the boundary and await the retry promise chain.

---

### `src/shared/types.ts` (model, transform/validation)

**Analog:** `src/shared/types.ts`

**Connection contract** (lines 147-158):
```typescript
export interface FlashQueryBearerAuth {
  type: 'bearer'
  token: string
}

export interface FlashQueryHttpConnection {
  transport: 'http'
  url: string
  auth?: FlashQueryBearerAuth
}

export type FlashQueryConnection = FlashQueryHttpConnection
```

**Validation/sanitization pattern** (lines 160-174):
```typescript
export function isFlashQueryConnection(value: unknown): value is FlashQueryConnection {
  if (!value || typeof value !== 'object') return false
  const obj = value as Record<string, unknown>
  if (obj.transport !== 'http' || typeof obj.url !== 'string' || obj.url.length === 0) return false
  if (obj.auth === undefined) return true
  if (!obj.auth || typeof obj.auth !== 'object') return false
  const auth = obj.auth as Record<string, unknown>
  return auth.type === 'bearer' && typeof auth.token === 'string'
}
```

Use `FlashQueryConnection` as the manager input type. Do not require shared type changes unless the manager needs a serializable status type for Phase 3.

---

### `src/main/flashquery/credentials.ts` (utility, CRUD)

**Analog:** `src/main/flashquery/credentials.ts`

**Lazy dependency pattern** (lines 7-16):
```typescript
let storePromise: Promise<FlashQueryCredentialStore> | null = null

async function getStore(): Promise<FlashQueryCredentialStore> {
  if (!storePromise) {
    storePromise = import('electron-store').then(({ default: Store }) => {
      return new Store({ name: 'flashquery' }) as FlashQueryCredentialStore
    })
  }
  return storePromise
}
```

**Workspace key isolation pattern** (lines 18-35):
```typescript
function tokenKey(workspaceId: string): string {
  return `tokens.${workspaceId}`
}

export async function getWorkspaceToken(workspaceId: string): Promise<string | null> {
  const store = await getStore()
  const token = store.get(tokenKey(workspaceId))
  return typeof token === 'string' ? token : null
}
```

Phase 2 should not call this helper for `/mcp/info`. Use it only as a boundary reference: token storage is separate, lazy, workspace-scoped, and not part of public readiness probing.

**Mocked dependency test pattern:** `src/main/flashquery/credentials.test.ts` lines 3-24:
```typescript
const storeMock = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  failWrites: false,
}))

vi.mock('electron-store', () => ({
  default: class MockStore {
    get(key: string, defaultValue?: unknown): unknown {
      return storeMock.values.has(key) ? storeMock.values.get(key) : defaultValue
    }
  },
}))
```

Use direct `globalThis.fetch` replacement for Phase 2 instead of `vi.mock`, because fetch is a global boundary and current `clientManager.test.ts` already establishes that pattern.

---

### `src/main/flashquery/uri.ts` (utility, transform)

**Analog:** `src/main/flashquery/uri.ts`

**Pure helper/error-to-null pattern** (lines 11-17 and 23-35):
```typescript
function decodePath(path: string): string | null {
  try {
    return path.split('/').map((segment) => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
}

export function parseVaultUri(uri: string): FlashQueryUriParts | null {
  const match = /^flashquery:\/\/([^/]+)\/?(.*)$/.exec(uri)
  if (!match) return null

  try {
    const workspaceId = decodeURIComponent(match[1])
    const decodedPath = decodePath(match[2] ?? '')
    if (!workspaceId || decodedPath === null) return null
    return { workspaceId, vaultPath: decodedPath }
  } catch {
    return null
  }
}
```

Copy the private-helper style for `buildInfoUrl` and `parseInfoResponse`: keep deterministic URL/payload parsing private unless tests become materially cleaner with exports. Expected invalid info payloads should become `disconnected` status, not thrown boundary errors.

**Table-driven helper test style:** `src/main/flashquery/uri.test.ts` lines 4-43 use short behavior-focused `it(...)` cases with direct assertions:
```typescript
it('returns null for non-FlashQuery URIs and malformed escapes', () => {
  expect(parseVaultUri('https://workspace-1/path')).toBeNull()
  expect(parseVaultUri('not-a-uri')).toBeNull()
  expect(parseVaultUri('flashquery://workspace-1/%E0%A4%A')).toBeNull()
})
```

Use the same compact style for URL joining, info payload validation, and status payload shape tests.

## Shared Patterns

### Main-Process Boundary

**Source:** `AGENTS.md` and Phase 2 context
**Apply to:** `clientManager.ts`

Keep FlashQuery connection behavior under `src/main/flashquery/`. Do not add renderer, preload, IPC channels, settings UI, or vault operations in Phase 2.

### Inert Construction

**Source:** `src/main/flashquery/clientManager.test.ts` lines 5-14
**Apply to:** manager constructor and tests

Manager construction must not call `fetch`, read credentials, start FlashQuery, or register IPC. Probe only from an explicit public method for a configured workspace.

### Workspace And Event Isolation

**Source:** `src/main/flashquery/clientManager.ts` lines 11-34 and `clientManager.test.ts` lines 35-46
**Apply to:** status events, retries, dispose

State is keyed by workspace ID, and subscribers are keyed by event type inside each workspace. Phase 2 status transitions must notify only `subscribe(workspaceId, 'status', handler)` subscribers for that workspace.

### Timer Ownership

**Source:** `src/renderer/hooks/notificationDebouncer.ts` lines 33-57
**Apply to:** retry backoff, manual retry, dispose
```typescript
const timers = new Map<string, TimerHandle>()

const existing = timers.get(terminalId)
if (existing) clearTimeout(existing)
const handle = setTimeout(() => {
  timers.delete(terminalId)
  onFire(payload)
}, delayMs)
timers.set(terminalId, handle)

for (const handle of timers.values()) clearTimeout(handle)
timers.clear()
```

For the manager, store the timer on the workspace state instead of a separate module-level map.

### Test Runtime

**Source:** `vitest.config.ts` lines 16-24
**Apply to:** all Phase 2 tests
```typescript
test: {
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  restoreMocks: true,
  environmentMatchGlobs: [
    ['**/*.test.tsx', 'jsdom'],
    ['**/*.test.ts', 'node'],
  ],
}
```

`clientManager.test.ts` runs in Node. Use Vitest globals from imports, `globalThis.fetch`, and fake timers restored in `afterEach`.

### Probe Auth Boundary

**Source:** `src/shared/types.ts` lines 147-158 and `src/main/flashquery/credentials.ts` lines 22-35
**Apply to:** `/mcp/info` tests

Even when `FlashQueryConnection.auth` has `{ type: 'bearer', token }`, the `/mcp/info` probe must send no `Authorization` header. Credential helpers are for later authenticated MCP calls, not the public readiness endpoint.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | - | - | Existing Phase 1 manager/test and timer helpers cover all Phase 2 file roles. |

## Metadata

**Analog search scope:** `src/main/flashquery`, `src/shared/types.ts`, `src/main/ipc/pathValidation.ts`, `src/renderer/hooks/notificationDebouncer.ts`, `src/main/auto-updater.ts`, `vitest.config.ts`
**Files scanned:** 12 targeted files plus `rg` searches for fetch, fake timers, subscribe/unsubscribe, and dispose patterns
**Pattern extraction date:** 2026-05-29
