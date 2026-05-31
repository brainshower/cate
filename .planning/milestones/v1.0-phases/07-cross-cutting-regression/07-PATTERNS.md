# Phase 7: Cross-Cutting + Regression - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 12 likely new/modified files
**Analogs found:** 11 / 12

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `e2e/fixtures/electron-app.ts` | test fixture | process launch / request-response | `e2e/fixtures/electron-app.ts` | exact |
| `e2e/fixtures/flashquery-server.ts` | test fixture | request-response / event-driven control | `e2e/fixtures/electron-app.ts` + `src/main/flashquery/clientManager.ts` | partial |
| `src/main/index.ts` | config / bootstrap | process launch / file-I/O | `src/main/index.ts` | exact |
| `src/main/flashquery/clientManager.ts` | service | request-response / lazy client | `src/main/flashquery/clientManager.ts` | exact |
| `src/main/flashquery/clientManager.test.ts` | test | request-response / lazy client | `src/main/flashquery/clientManager.test.ts` | exact |
| `src/main/ipc/flashquery.ts` | controller / IPC | request-response | `src/main/ipc/flashquery.ts` | exact |
| `src/main/ipc/flashquery.test.ts` | test | request-response | `src/main/ipc/flashquery.test.ts` | exact |
| `e2e/flashquery-persistence.spec.ts` | e2e test | restart / request-response | `e2e/smoke.spec.ts`, `e2e/drag-move.spec.ts` | role-match |
| `e2e/flashquery-happy-path.spec.ts` | e2e test | request-response / CRUD update | `e2e/smoke.spec.ts`, `src/main/ipc/flashquery.test.ts` | role-match |
| `e2e/flashquery-disconnect.spec.ts` | e2e test | request-response / retry event | `e2e/drag-move.spec.ts`, `src/main/flashquery/clientManager.test.ts` | role-match |
| `e2e/flashquery-vault-browse.spec.ts` | e2e test | request-response / tree navigation | `src/renderer/panels/FlashQueryVaultPanel.test.tsx` | role-match |
| `.planning/phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` | manual artifact | batch checklist | `.planning/phases/05-settings-dialog-workspace-menu-entry/05-UAT.md` | exact |

## Pattern Assignments

### `e2e/fixtures/electron-app.ts` (test fixture, process launch)

**Analog:** `e2e/fixtures/electron-app.ts`

**Imports and result shape** (lines 7-15):
```ts
import { _electron as electron, type ElectronApplication, type Page } from 'playwright'
import path from 'node:path'

export interface LaunchResult {
  electronApp: ElectronApplication
  mainWindow: Page
}
```

**Launch pattern to extend with options** (lines 17-30):
```ts
export async function launchApp(): Promise<LaunchResult> {
  const electronApp = await electron.launch({
    args: ['.'],
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      CATE_E2E: '1',
      NODE_ENV: 'production',
    },
  })
  const mainWindow = await electronApp.firstWindow()
  await mainWindow.waitForLoadState('domcontentloaded')
  await mainWindow.waitForFunction(() => window.__cateE2E?.ready === true, { timeout: 15_000 })
  return { electronApp, mainWindow }
}
```

**Cleanup pattern** (lines 33-39):
```ts
export async function closeApp(electronApp: ElectronApplication): Promise<void> {
  try {
    await electronApp.close()
  } catch {
    /* best-effort */
  }
}
```

Planner note: add an options object such as `launchApp({ userDataDir, env })` while preserving the current default. Pass `CATE_E2E_USER_DATA_DIR` only when supplied so normal E2E isolation remains unchanged.

---

### `e2e/fixtures/flashquery-server.ts` (test fixture, request-response)

**Analog:** no exact local HTTP server fixture exists. Copy style from `e2e/fixtures/electron-app.ts` and protocol behavior from `src/main/flashquery/clientManager.ts`.

**Tool calls the stub must satisfy** (`src/main/flashquery/clientManager.ts` lines 122-145, 148-197):
```ts
const payload = await this.callJsonTool(client, 'list_vault', {
  path: vaultPath && vaultPath.length > 0 ? vaultPath : '/',
  include: ['tracking'],
})

const payload = await this.callJsonTool(client, 'get_document', {
  identifiers: vaultPath,
  include: ['body'],
})

const payload = await this.callJsonTool(client, 'write_document', {
  mode: 'update',
  identifier: vaultPath,
  content,
})
```

**MCP response parsing shape** (`src/main/flashquery/clientManager.ts` lines 438-457, 460-468):
```ts
const result = await client.callTool({ name, arguments: args })
const text = this.extractTextContent(resultObject)
if (!text) return {}
const parsed = JSON.parse(text)
```

Stub should return MCP tool results as `{ content: [{ type: 'text', text: JSON.stringify(payload) }] }`. Track counters separately for `GET /mcp/info` and `POST /mcp`, expose `resetCounts()`, `setAvailable(boolean)`, document mutation helpers, and `close()`.

---

### `src/main/index.ts` (bootstrap, process launch / file-I/O)

**Analog:** `src/main/index.ts`

**Current E2E userData isolation** (lines 1082-1089):
```ts
if (process.env.CATE_E2E === '1') {
  const fs = require('fs') as typeof import('fs')
  const os = require('os') as typeof import('os')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cate-e2e-'))
  app.setPath('userData', tmp)
}
```

Planner note: extend this block only for E2E, for example prefer `process.env.CATE_E2E_USER_DATA_DIR` when present, otherwise keep `mkdtempSync`. Do not expose a production userData override.

---

### `src/main/flashquery/clientManager.ts` (service, lazy request-response)

**Analog:** `src/main/flashquery/clientManager.ts`

**No eager network work at construction** (`clientManager.test.ts` lines 93-100):
```ts
it('constructs without eager network work', () => {
  const fetchSpy = installFetchMock()

  new FlashQueryClientManager()

  expect(fetchSpy).not.toHaveBeenCalled()
})
```

**Lazy MCP client creation from persisted workspace connection** (lines 392-428):
```ts
const connection = state.connection ?? this.getConfiguredConnection(workspaceId)
if (!connection) return null

const creation = (async (): Promise<FlashQueryMcpToolClient | null> => {
  state.connection = connection
  const attemptId = state.attemptId
  const token = await getWorkspaceToken(workspaceId)
  // ...
  const client = await this.createMcpClient(workspaceId, connection, token)
  state.mcpClient = client
  return client
})()
```

**Probe implementation to review** (lines 217-227):
```ts
const token = connection.auth?.type === 'bearer' ? connection.auth.token.trim() : ''
const headers: Record<string, string> = { Accept: 'application/json' }
if (token) {
  headers.Authorization = `Bearer ${token}`
}

const response = await globalThis.fetch(this.buildInfoUrl(connection.url), {
  method: 'GET',
  headers,
  signal: abortController.signal,
})
```

Conflict: product/test-plan text expects `/mcp/info` probes to omit bearer auth, but current implementation sends it when `connection.auth.token` is present. Phase 7 should either fix this and update tests, or explicitly document why the E2E stub is permissive.

**Retry and error state pattern** (lines 306-337):
```ts
const payload: FlashQueryStatusPayload = { workspaceId, status: 'disconnected', error }
this.emitStatus(workspaceId, state, payload)
this.scheduleRetry(workspaceId, state, connection)
```

---

### `src/main/flashquery/clientManager.test.ts` (test, request-response)

**Analog:** `src/main/flashquery/clientManager.test.ts`

**Mock structure** (lines 1-39):
```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlashQueryClientManager } from './clientManager'

const sdkMock = vi.hoisted(() => ({
  clientConnect: vi.fn(),
  clientCallTool: vi.fn(),
  Client: vi.fn(),
  StreamableHTTPClientTransport: vi.fn(),
}))
```

**Fetch helper pattern** (lines 41-60, 85-91):
```ts
function installFetchMock() {
  const fetchMock = vi.fn()
  Object.defineProperty(globalThis, 'fetch', { value: fetchMock, configurable: true })
  return fetchMock
}

afterEach(() => {
  Object.defineProperty(globalThis, 'fetch', { value: originalFetch, configurable: true })
  vi.clearAllMocks()
  vi.useRealTimers()
})
```

**Auth behavior tests needing reconciliation** (lines 144-184):
```ts
it('probes GET /mcp/info without Authorization and normalizes trailing slashes', async () => {
  // no-token case asserts headers: { Accept: 'application/json' }
})

it('sends bearer Authorization during the connection info probe', async () => {
  // conflicts with Phase 7 product docs if bearer must be omitted on /mcp/info
})
```

**MCP transport bearer pattern should remain** (lines 967-988):
```ts
await expect(manager.listVault('workspace-1')).resolves.toEqual([])

expect(getWorkspaceToken).toHaveBeenCalledWith('workspace-1')
expect(url.toString()).toBe('http://127.0.0.1:3100/mcp')
expect(options.requestInit?.headers?.get('Authorization')).toBe('Bearer stored-token')
```

---

### `src/main/ipc/flashquery.ts` (controller / IPC, request-response)

**Analog:** `src/main/ipc/flashquery.ts`

**Imports and singleton boundary** (lines 1-18):
```ts
import { ipcMain } from 'electron'
import { FLASHQUERY_GET_DOCUMENT, FLASHQUERY_LIST_VAULT, FLASHQUERY_PROBE } from '../../shared/ipc-channels'
import { FlashQueryClientManager } from '../flashquery/clientManager'

const flashQueryClientManager = new FlashQueryClientManager()
```

**Dialog probe behavior to review** (lines 145-187):
```ts
const token = nextConnection.auth?.type === 'bearer' ? nextConnection.auth.token.trim() : ''
const headers: Record<string, string> = { Accept: 'application/json' }
if (token) {
  headers.Authorization = `Bearer ${token}`
}

const response = await globalThis.fetch(buildInfoUrl(nextConnection.url), {
  method: 'GET',
  headers,
  signal: abortController.signal,
})
```

**IPC registration pattern** (lines 238-260):
```ts
export function registerHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(FLASHQUERY_SET_CONNECTION, async (_event, workspaceId: string, connection: unknown) => {
    return setConnection(workspaceId, connection)
  })
  ipcMain.handle(FLASHQUERY_PROBE, async (_event, workspaceId: string, connection: unknown) => {
    return probeConnection(workspaceId, connection)
  })
}
```

---

### `src/main/ipc/flashquery.test.ts` (test, request-response)

**Analog:** `src/main/ipc/flashquery.test.ts`

**IPC mock and dynamic import pattern** (lines 1-70, 96-110):
```ts
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  updateWorkspace: vi.fn(),
  broadcastWorkspaceChange: vi.fn(),
  broadcastToAll: vi.fn(),
  fetch: vi.fn(),
}))

async function registeredHandler<T extends (...args: never[]) => unknown>(channelName: string): Promise<T> {
  const { registerHandlers } = await import('./flashquery')
  registerHandlers()
  const call = mocks.handle.mock.calls.find(([channel]) => channel === channelName)
  expect(call).toBeTruthy()
  return call?.[1] as T
}
```

**Current probe auth test to reconcile** (lines 307-340):
```ts
await expect(handler({}, 'workspace-1', {
  transport: 'http',
  url: 'https://flashquery.local/',
  auth: { type: 'bearer', token: 'current-token' },
})).resolves.toEqual({ ok: true, version: '1.2.3', instanceId: 'instance-abcdef' })

expect(mocks.fetch).toHaveBeenCalledWith('https://flashquery.local/mcp/info', {
  method: 'GET',
  headers: {
    Accept: 'application/json',
    Authorization: 'Bearer current-token',
  },
  signal: expect.any(AbortSignal),
})
```

**Safe failure pattern** (lines 366-389):
```ts
await expect(handler({}, 'workspace-1', { transport: 'http', url: 'ftp://flashquery.local' }))
  .resolves.toEqual({ ok: false, error: 'FlashQuery connection URL must use http or https' })

mocks.fetch.mockRejectedValueOnce(new Error('network failed for secret-token\nwith stack details'))
await expect(handler({}, 'workspace-1', {
  transport: 'http',
  url: 'https://flashquery.local',
  auth: { type: 'bearer', token: 'secret-token' },
})).resolves.toEqual({ ok: false, error: 'network failed for [redacted]' })
```

---

### `e2e/flashquery-persistence.spec.ts` (e2e test, restart / lazy request-response)

**Analog:** `e2e/smoke.spec.ts` and `e2e/fixtures/electron-app.ts`

**Spec lifecycle pattern** (`e2e/smoke.spec.ts` lines 1-15):
```ts
import { test, expect } from '@playwright/test'
import { launchApp, closeApp } from './fixtures/electron-app'
import type { ElectronApplication, Page } from 'playwright'

let app: ElectronApplication
let page: Page

test.beforeEach(async () => {
  ;({ electronApp: app, mainWindow: page } = await launchApp())
})
test.afterEach(async () => closeApp(app))
```

**Harness assertion style** (`e2e/smoke.spec.ts` lines 18-35):
```ts
const panelId = await page.evaluate(() => window.__cateE2E!.activeCanvasPanelId())
expect(panelId).toBeTruthy()
await page.waitForSelector(`[data-node-id="${nodeId}"]`, { timeout: 5000 })
```

Planner note: for restart, do not use `beforeEach` auto-launch twice unless the shared `userDataDir` is explicit. Close first app, reset stub request counters, launch second app with same `userDataDir`, assert `/mcp/info` count remains zero until vault panel use.

---

### `e2e/flashquery-happy-path.spec.ts` (e2e test, CRUD update)

**Analog:** `e2e/smoke.spec.ts`, plus IPC manager tool expectations.

**Visible-first E2E pattern** (`e2e/smoke.spec.ts` lines 25-35):
```ts
const nodeId = await page.evaluate(() =>
  window.__cateE2E!.createTerminal({ x: 200, y: 150 }),
)
expect(nodeId).toBeTruthy()
await page.waitForSelector(`[data-node-id="${nodeId}"]`, { timeout: 5000 })
```

**Write contract to verify through stub state** (`clientManager.test.ts` lines 923-947):
```ts
expect(callTool).toHaveBeenCalledWith({
  name: 'write_document',
  arguments: { mode: 'update', identifier: 'Plan.md', content: 'body' },
})
expect(args).not.toHaveProperty('frontmatter')
expect(args).not.toHaveProperty('expected_version')
```

Planner note: drive dialog, vault panel row, editor body, save, reopen, and "Open on Canvas" via Playwright locators. Use stub document state only to verify persistence after save/reopen.

---

### `e2e/flashquery-disconnect.spec.ts` (e2e test, retry event)

**Analog:** retry/status behavior in `src/main/flashquery/clientManager.ts` and drag specs' deterministic wait style.

**Retry status source** (`clientManager.ts` lines 306-337):
```ts
const payload: FlashQueryStatusPayload = { workspaceId, status: 'disconnected', error }
this.emitStatus(workspaceId, state, payload)
this.scheduleRetry(workspaceId, state, connection)
```

**Manual retry IPC mapping** (`src/main/ipc/flashquery.test.ts` lines 495-503):
```ts
await expect(handler({}, 'workspace-1')).resolves.toBeUndefined()

expect(mocks.managerInstances[0].retry).toHaveBeenCalledTimes(1)
expect(mocks.managerInstances[0].retry).toHaveBeenCalledWith('workspace-1')
expect(mocks.managerInstances[0].connect).not.toHaveBeenCalled()
```

**Deterministic UI wait style** (`e2e/drag-move.spec.ts` lines 101-115):
```ts
await page.mouse.move(grab!.x, grab!.y)
await page.mouse.down()
await page.mouse.move(grab!.x + 100, grab!.y + 80, { steps: 10 })
await page.waitForTimeout(250)
const attr = await page.getAttribute(`[data-node-id="${nodeId}"]`, 'data-drag-source')
expect(attr).toBe('true')
```

Planner note: prefer visible disconnected chip/panel assertions plus stub `setAvailable(false/true)` and request counts over internal status-store reads.

---

### `e2e/flashquery-vault-browse.spec.ts` (e2e test, tree navigation)

**Analog:** `src/renderer/panels/FlashQueryVaultPanel.test.tsx`

**Renderer tree/refresh behavior to mirror in E2E** (lines 440-465):
```ts
fireEvent.click(screen.getByRole('treeitem', { name: /Notes/ }))
fireEvent.click(await screen.findByRole('treeitem', { name: /Daily.md/ }))
expect(screen.getByRole('treeitem', { name: /Daily.md/ }).getAttribute('aria-selected')).toBe('true')

fireEvent.click(screen.getByLabelText('Refresh vault'))

expect(await screen.findByRole('treeitem', { name: /A title/ })).toHaveProperty('ariaSelected', 'true')
```

**No accidental editor mutation on refresh** (lines 467-497):
```ts
fireEvent.click(screen.getByLabelText('Refresh vault'))
await waitFor(() => expect(api.flashqueryListVault).toHaveBeenCalledTimes(2))

const panels = useAppStore.getState().workspaces.find((workspace) => workspace.id === workspaceId)?.panels
expect(Object.keys(panels ?? {})).toEqual(['editor_existing'])
expect(createEditorSpy).not.toHaveBeenCalled()
```

Planner note: convert these component-level expectations into user-visible Playwright checks: expanded folders, selected rows, empty vault state, refresh preserving valid expansion, and nested document open.

---

### Renderer design-token tests (component tests, token constraints)

**Analogs:** `FlashQueryVaultPanel.test.tsx`, `Chip.test.tsx`, `FlashQueryConnectionDialog.test.tsx`, `VaultBadge.test.tsx`

**Vault panel forbidden neutral check** (`FlashQueryVaultPanel.test.tsx` lines 499-504):
```ts
const rendered = render(<FlashQueryVaultPanel panelId="panel-1" workspaceId={workspaceId} />).container.innerHTML
const forbiddenStockNeutralPattern = /\b(?:gray|slate|zinc)\b/

expect(rendered).not.toMatch(forbiddenStockNeutralPattern)
```

**Chip semantic-token check** (`Chip.test.tsx` lines 79-96):
```ts
const sourceClasses = [
  'text-primary',
  'text-secondary',
  'text-muted',
  'bg-hover',
].join(' ')

const forbiddenStockNeutralPattern = /\b(?:gray|slate|zinc)\b/
expect(`${rendered}\n${sourceClasses}`).not.toMatch(forbiddenStockNeutralPattern)
```

**Dialog neutral class check** (`FlashQueryConnectionDialog.test.tsx` lines 503-509):
```ts
expect(container.innerHTML).not.toMatch(/\b(?:text|bg|border)-(?:zinc|gray|slate)-/)
```

**Semantic utility source** (`src/renderer/styles/globals.css` lines 213-240):
```css
.text-primary { color: var(--text-primary); }
.text-secondary { color: var(--text-secondary); }
.text-muted { color: var(--text-muted); }
.bg-hover { background-color: var(--surface-hover); }
.hover\:bg-hover:hover { background-color: var(--surface-hover); }
```

---

### `.planning/phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` (manual artifact, batch checklist)

**Analog:** `.planning/phases/05-settings-dialog-workspace-menu-entry/05-UAT.md`

**Frontmatter and summary format** (lines 1-24):
```md
---
status: passed
phase: 05-settings-dialog-workspace-menu-entry
source:
  - .planning/phases/05-settings-dialog-workspace-menu-entry/05-01-SUMMARY.md
started: 2026-05-29T20:26:44Z
updated: 2026-05-29T20:26:44Z
mode: automated-contract-uat
---

# Phase 05 UAT

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
```

**Per-check format** (lines 27-65):
```md
### 1. Open FlashQuery Connection From Workspace Menu

expected: |
  Right-clicking a workspace shows a native menu with `FlashQuery Connection...`

result: passed
evidence: `src/renderer/sidebar/WorkspaceTab.test.tsx`
```

Planner note: create rows for T-M-001 through T-M-007 with `expected`, `result`, `evidence`, and `notes`. Use `status: partial` until manual visual review is complete, matching the Phase 04 human UAT pattern.

## Shared Patterns

### E2E Launch and Cleanup
**Source:** `e2e/fixtures/electron-app.ts`
**Apply to:** all new `e2e/flashquery-*.spec.ts`
```ts
test.beforeEach(async () => {
  ;({ electronApp: app, mainWindow: page } = await launchApp())
})
test.afterEach(async () => closeApp(app))
```

### Lazy FlashQuery Client Creation
**Source:** `src/main/flashquery/clientManager.ts`
**Apply to:** persistence/lazy-probe test assertions
```ts
const connection = state.connection ?? this.getConfiguredConnection(workspaceId)
if (!connection) return null
const token = await getWorkspaceToken(workspaceId)
const client = await this.createMcpClient(workspaceId, connection, token)
```

### Safe Error Handling and Token Redaction
**Source:** `src/main/flashquery/clientManager.ts`, `src/main/ipc/flashquery.ts`
**Apply to:** manager tests, IPC tests, disconnect E2E
```ts
if (token) {
  message = message.split(token).join('[redacted]')
}
return message || 'FlashQuery request failed'
```

### IPC Handler Registration
**Source:** `src/main/ipc/flashquery.ts`
**Apply to:** IPC regression tests
```ts
if (handlersRegistered) return
handlersRegistered = true
ipcMain.handle(FLASHQUERY_LIST_VAULT, async (_event, workspaceId: string, vaultPath?: string) => {
  return listVault(workspaceId, vaultPath)
})
```

### Design Token Enforcement
**Source:** renderer component tests and `src/renderer/styles/globals.css`
**Apply to:** T-M-001 code review and any extended token tests
```ts
expect(container.innerHTML).not.toMatch(/\b(?:text|bg|border)-(?:zinc|gray|slate)-/)
```

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `e2e/fixtures/flashquery-server.ts` | test fixture | request-response | Cate has no existing local HTTP test server fixture. Use Node `http` or MCP SDK server transport, but copy naming, cleanup, and typed helper style from `e2e/fixtures/electron-app.ts`. |

## Metadata

**Analog search scope:** `e2e/`, `src/main/`, `src/renderer/`, `.planning/phases/`
**Files scanned:** focused scan of 14 cited files plus prior UAT artifacts
**Pattern extraction date:** 2026-05-29
