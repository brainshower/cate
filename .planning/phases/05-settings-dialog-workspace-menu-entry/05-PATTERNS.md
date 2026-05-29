# Phase 05: Settings Dialog + Workspace Menu Entry - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 12
**Analogs found:** 12 / 12

## Mandatory Source Guardrail

Downstream planners and implementers MUST read these two external product docs first, before asking questions, planning implementation, editing code, or changing Phase 5 behavior:

1. `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md`
2. `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md`

Use Requirements Spec `§6.7` as the source of truth for REQ-034 through REQ-039. Use Test Plan `§4.5` as the source of truth for T-U-055 and T-I-050 through T-I-078. If local plans or code seem ambiguous, re-read those two docs first.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/renderer/dialogs/FlashQueryConnectionDialog.tsx` | component | request-response | `src/renderer/dialogs/SavedLayoutsDialog.tsx` | exact |
| `src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` | test | request-response | `src/renderer/panels/FlashQueryVaultPanel.test.tsx` | role-match |
| `src/renderer/App.tsx` | component | event-driven | `src/renderer/App.tsx` modal overlay section | exact |
| `src/renderer/stores/uiStore.ts` | store | event-driven | existing `showLayoutsDialog` and `showFlashQueryConnectionDialog` slice | exact |
| `src/renderer/stores/uiStore.test.ts` | test | event-driven | existing FlashQuery dialog store tests | exact |
| `src/renderer/sidebar/WorkspaceTab.tsx` | component | event-driven | existing native workspace context-menu handler | exact |
| `src/renderer/sidebar/WorkspaceTab.test.tsx` | test | event-driven | existing jsdom `createRoot` render harness | role-match |
| `src/shared/ipc-channels.ts` | config | request-response | existing FlashQuery channel constants | exact |
| `src/shared/electron-api.d.ts` | config | request-response | existing FlashQuery API declarations | exact |
| `src/preload/index.ts` | middleware | request-response | existing FlashQuery preload wrappers | exact |
| `src/main/ipc/flashquery.ts` | controller | request-response | existing FlashQuery IPC handlers | exact |
| `src/main/ipc/flashquery.test.ts` | test | request-response | existing FlashQuery IPC handler tests | exact |

## Pattern Assignments

### `src/renderer/dialogs/FlashQueryConnectionDialog.tsx` (component, request-response)

**Analog:** `src/renderer/dialogs/SavedLayoutsDialog.tsx`

**Imports pattern** (lines 6-18):
```tsx
import React, { useCallback, useEffect, useState } from 'react'
import { FloppyDisk, Trash, FolderOpen, SquaresFour } from '@phosphor-icons/react'
import { useUIStore } from '../stores/uiStore'
import {
  useAppStore,
} from '../stores/appStore'
import log from '../lib/logger'
```

Copy the local relative import style. Use Phosphor icons from `@phosphor-icons/react`, `useUIStore` for visibility, `useAppStore` for selected workspace, and renderer logger for failed IPC calls.

**Open/reset pattern** (lines 40-49):
```tsx
useEffect(() => {
  if (show) {
    refresh()
    setSaveName('')
    setSelected(null)
    setError(null)
  }
}, [show, refresh])

const close = useCallback(() => setShow(false), [setShow])
```

Adapt this for ephemeral dialog state: when `showFlashQueryConnectionDialog` flips true, re-read selected workspace connection and token, clear test result/save error/remove confirmation, and discard prior unsaved edits.

**Escape and click-outside pattern** (lines 154-173):
```tsx
useEffect(() => {
  if (!show) return
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
  }
  document.addEventListener('keydown', handler, { capture: true })
  return () => document.removeEventListener('keydown', handler, { capture: true })
}, [show, close])

if (!show) return null

return (
  <div className="fixed inset-0 z-50 flex items-start justify-center pt-40 bg-black/40" onClick={close}>
    <div onClick={(e) => e.stopPropagation()}>
```

Use the same close semantics for Cancel, X, Escape, and overlay click. Phase 5 requires `role="dialog"`, `aria-modal="true"`, title/subtitle, and `X` close button in the new component.

**Error/action pattern** (lines 74-89, 197-200):
```tsx
const handleSave = useCallback(async () => {
  const name = saveName.trim()
  if (!name) { setError('Name is required'); return }
  setBusy(true); setError(null)
  try {
    await window.electronAPI.layoutSave(name, buildSnapshot())
  } catch (err) {
    log.error('[SavedLayoutsDialog] save failed', err)
    setError('Save failed')
  } finally {
    setBusy(false)
  }
}, [saveName, buildSnapshot, refresh])
```

For Phase 5, replace layout save with `window.electronAPI.flashquerySetConnection(...)`, keep the dialog open on failure, and ensure Test connection uses a probe API rather than `flashquerySetConnection`.

### `src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` (test, request-response)

**Analog:** `src/renderer/panels/FlashQueryVaultPanel.test.tsx`

**Testing-library setup pattern** (lines 1-17):
```tsx
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))
```

Use this for dialog integration tests T-I-050..074 and T-U-104. Prefer `@testing-library/react` over manual DOM assertions for the dialog.

**Mock `window.electronAPI` pattern** (lines 19-43, 76-80):
```tsx
type ElectronApiMock = Pick<
  Window['electronAPI'],
  'flashqueryListVault' | 'flashqueryRetry' | 'onFlashQueryStatus' | 'showContextMenu'
>

function setElectronApi(api: ElectronApiMock) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api,
  })
}
```

Adapt the pick to include `flashquerySetConnection`, the new probe method, and token/detail-read method if added. Tests should assert Test connection does not call `flashquerySetConnection`.

**Store seeding pattern** (lines 83-100, 106-113):
```tsx
function seedWorkspace(connection?: { transport: 'http'; url: string }) {
  useAppStore.setState({
    selectedWorkspaceId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name: 'Workspace',
      color: '#5AD8B8',
      rootPath: '/workspace',
      flashqueryConnection: connection,
    }],
  })
}

beforeEach(() => {
  setElectronApi(makeElectronApi())
  seedWorkspace({ transport: 'http', url: 'https://flashquery.local:8787/mcp' })
  useUIStore.setState({ showFlashQueryConnectionDialog: false })
})
```

Use `useAppStore.setState` and `useUIStore.setState` directly for setup. Keep token values out of snapshots.

### `src/renderer/App.tsx` (component, event-driven)

**Analog:** current modal overlay section in `src/renderer/App.tsx`

**Mounting pattern** (lines 487-494):
```tsx
{/* Modal overlays */}
{showNodeSwitcher && <NodeSwitcher />}
{showCommandPalette && <CommandPalette />}
{showSettings && (
  <SettingsWindow isOpen={showSettings} onClose={closeSettings} initialTab={settingsInitialTab ?? undefined} />
)}
<SavedLayoutsDialog />
<PostUpdateFeedbackDialog />
```

Import and mount `<FlashQueryConnectionDialog />` beside `<SavedLayoutsDialog />`. The dialog component itself should return `null` when closed, matching `SavedLayoutsDialog`.

### `src/renderer/stores/uiStore.ts` (store, event-driven)

**Analog:** existing UI-store dialog slice

**State/actions pattern** (lines 50-77):
```ts
interface UIStoreState {
  showNodeSwitcher: boolean
  showCommandPalette: boolean
  showLayoutsDialog: boolean
  showFlashQueryConnectionDialog: boolean
}

interface UIStoreActions {
  setShowNodeSwitcher: (show: boolean) => void
  setShowCommandPalette: (show: boolean) => void
  setShowLayoutsDialog: (show: boolean) => void
  setShowFlashQueryConnectionDialog: (show: boolean) => void
}
```

**Initializer/setter pattern** (lines 98-129):
```ts
export const useUIStore = create<UIStore>((set, get) => ({
  showLayoutsDialog: false,
  showFlashQueryConnectionDialog: false,

  setShowLayoutsDialog(show) {
    set({ showLayoutsDialog: show })
  },

  setShowFlashQueryConnectionDialog(show) {
    set({ showFlashQueryConnectionDialog: show })
  },
}))
```

This state already exists. Planner should verify rather than duplicate it.

### `src/renderer/stores/uiStore.test.ts` (test, event-driven)

**Analog:** existing FlashQuery dialog store test

**Store test pattern** (lines 4-19):
```ts
describe('useUIStore FlashQuery connection dialog state', () => {
  beforeEach(() => {
    useUIStore.getState().setShowFlashQueryConnectionDialog(false)
  })

  it('opens and closes the FlashQuery connection dialog state', () => {
    useUIStore.getState().setShowFlashQueryConnectionDialog(true)
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
  })
})
```

T-U-055 is already covered by this pattern. Extend only if implementation changes the slice.

### `src/renderer/sidebar/WorkspaceTab.tsx` (component, event-driven)

**Analog:** existing native context-menu construction and switch

**Imports pattern** (lines 1-17):
```tsx
import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import type { NativeContextMenuItem } from '../../shared/electron-api'
import { useAppStore } from '../stores/appStore'
```

Add `useUIStore` from `../stores/uiStore` for the switch action.

**Native menu pattern** (lines 275-309):
```tsx
const handleContextMenu = useCallback(async (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (!window.electronAPI) return
  setIsContextActive(true)
  const items: NativeContextMenuItem[] = [
    { id: 'select', label: 'Select Workspace', enabled: !isSelected },
    { id: 'rename', label: 'Rename Workspace' },
    { label: 'Change Color', submenu: colorSubmenu },
    { type: 'separator' },
    { id: 'select-folder', label: 'Select Project Folder' },
    { id: 'copy-cwd', label: 'Copy Working Directory' },
    { type: 'separator' },
    { id: 'duplicate', label: 'Duplicate Workspace' },
  ]
  const id = await window.electronAPI.showContextMenu(items)
```

Insert `{ id: 'flashquery-connection', label: 'FlashQuery Connection...' }` after `copy-cwd`, surrounded by separators, keeping native `showContextMenu`.

**Dispatch switch pattern** (lines 317-343):
```tsx
switch (id) {
  case 'select': app.selectWorkspace(workspace.id); break
  case 'rename':
    setRenameValue(workspace.name || workspace.rootPath.split('/').pop() || 'Workspace')
    setIsRenaming(true)
    break
  case 'copy-cwd': {
    // copy cwd
    break
  }
  case 'duplicate': app.duplicateWorkspace(workspace.id); break
}
```

Add `case 'flashquery-connection': useUIStore.getState().setShowFlashQueryConnectionDialog(true); break`. It must not select, duplicate, close, or mutate the workspace.

### `src/renderer/sidebar/WorkspaceTab.test.tsx` (test, event-driven)

**Analog:** existing jsdom component harness

**Manual render harness pattern** (lines 8-34):
```tsx
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => { root.unmount() })
  host.remove()
})
```

For T-I-075..078, either extend this harness to render `WorkspaceTab` or switch to Testing Library if simpler. Mock `window.electronAPI.showContextMenu` and assert the passed `NativeContextMenuItem[]` order and selected id behavior.

### `src/shared/ipc-channels.ts` (config, request-response)

**Analog:** existing FlashQuery constants

**Channel pattern** (lines 124-130):
```ts
// FlashQuery
export const FLASHQUERY_SET_CONNECTION = 'flashquery:setConnection'
export const FLASHQUERY_LIST_VAULT = 'flashquery:listVault'
export const FLASHQUERY_GET_DOCUMENT = 'flashquery:getDocument'
export const FLASHQUERY_WRITE_DOCUMENT = 'flashquery:writeDocument'
export const FLASHQUERY_RETRY = 'flashquery:retry'
export const FLASHQUERY_STATUS = 'flashquery:status' // main -> renderer
```

If Phase 5 adds a dry-run probe and token/detail read, add constants in this block, e.g. `FLASHQUERY_PROBE = 'flashquery:probe'` and `FLASHQUERY_GET_CONNECTION_DETAILS` or `FLASHQUERY_GET_TOKEN`. Keep names uppercase and strings `flashquery:*`.

### `src/shared/electron-api.d.ts` (config, request-response)

**Analog:** existing FlashQuery API declarations

**Import and API pattern** (lines 1-5, 512-526):
```ts
import type { FlashQueryConnection, FlashQueryStatusBroadcastPayload } from './types'

// ---------------------------------------------------------------------------
// FlashQuery
// ---------------------------------------------------------------------------

flashquerySetConnection(workspaceId: string, connection: FlashQueryConnection | null): Promise<void>
flashqueryListVault(workspaceId: string, vaultPath?: string): Promise<FlashQueryVaultEntry[]>
flashqueryRetry(workspaceId: string): Promise<void>
onFlashQueryStatus(callback: (payload: FlashQueryStatusBroadcastPayload) => void): () => void
```

Add typed preload declarations for probe/token read next to these. Prefer shared serializable result types in `src/shared/types.ts` if used by main, preload, and renderer tests.

### `src/preload/index.ts` (middleware, request-response)

**Analog:** existing FlashQuery preload wrappers

**Import constants pattern** (lines 181-186):
```ts
FLASHQUERY_GET_DOCUMENT,
FLASHQUERY_LIST_VAULT,
FLASHQUERY_RETRY,
FLASHQUERY_SET_CONNECTION,
FLASHQUERY_STATUS,
FLASHQUERY_WRITE_DOCUMENT,
```

**Wrapper pattern** (lines 895-927):
```ts
// ---------------------------------------------------------------------------
// FlashQuery
// ---------------------------------------------------------------------------

flashquerySetConnection(workspaceId: string, connection: unknown | null): Promise<void> {
  return ipcRenderer.invoke(FLASHQUERY_SET_CONNECTION, workspaceId, connection)
},

flashqueryRetry(workspaceId: string): Promise<void> {
  return ipcRenderer.invoke(FLASHQUERY_RETRY, workspaceId)
},

onFlashQueryStatus(callback: (payload: unknown) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, payload: unknown): void => {
    callback(payload)
  }
  ipcRenderer.on(FLASHQUERY_STATUS, listener)
  return () => {
    ipcRenderer.removeListener(FLASHQUERY_STATUS, listener)
  }
},
```

Expose narrow methods only. Do not expose raw `ipcRenderer` or any Node API to the renderer.

### `src/main/ipc/flashquery.ts` (controller, request-response)

**Analog:** existing FlashQuery IPC handlers

**Imports and singleton pattern** (lines 1-18):
```ts
import { ipcMain } from 'electron'
import {
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_STATUS,
} from '../../shared/ipc-channels'
import type { FlashQueryConnection, FlashQueryStatusBroadcastPayload } from '../../shared/types'
import { isFlashQueryConnection } from '../../shared/types'
import { FlashQueryClientManager } from '../flashquery/clientManager'

const flashQueryClientManager = new FlashQueryClientManager()
let handlersRegistered = false
```

**URL validation pattern** (lines 44-60):
```ts
function validateConnection(connection: unknown): FlashQueryConnection {
  if (!isFlashQueryConnection(connection)) {
    throw new Error('FlashQuery connection must use HTTP transport with an optional bearer auth token')
  }

  let parsed: URL
  try {
    parsed = new URL(connection.url)
  } catch {
    throw new Error('FlashQuery connection must include a valid FlashQuery URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('FlashQuery connection URL must use http or https')
  }

  return connection
}
```

Use this same validation for the dry-run probe. Probe must not call `updateWorkspace`, `broadcastWorkspaceChange`, or `flashQueryClientManager.connect` unless a manager-level dry-run helper exists.

**Set/clear pattern** (lines 80-104):
```ts
async function setConnection(workspaceId: string, connection: unknown): Promise<WorkspaceMutationResult> {
  const nextConnection = connection === null ? null : validateConnection(connection)
  const result = await updateWorkspace(workspaceId, {
    flashqueryConnection: nextConnection === null ? undefined : nextConnection,
  })

  if (!result.ok) {
    throw new Error(result.error.message)
  }

  broadcastWorkspaceChange()
  resetWorkspaceManagerBridge(workspaceId)

  if (nextConnection === null) {
    broadcastStatus({
      workspaceId,
      status: 'disconnected',
      error: 'No FlashQuery connection is configured for this workspace',
    })
    return result
  }

  subscribeWorkspaceStatus(workspaceId)
  await flashQueryClientManager.connect(workspaceId, nextConnection)
  return result
}
```

Save/remove should keep using this handler. Test connection must be separate and non-persistent.

**Registration pattern** (lines 155-173):
```ts
export function registerHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(FLASHQUERY_SET_CONNECTION, async (_event, workspaceId: string, connection: unknown) => {
    return setConnection(workspaceId, connection)
  })
}
```

Add new handlers inside this idempotent registration block.

### `src/main/ipc/flashquery.test.ts` (test, request-response)

**Analog:** existing IPC handler tests

**Mock setup pattern** (lines 12-62):
```ts
const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  updateWorkspace: vi.fn(),
  broadcastWorkspaceChange: vi.fn(),
  broadcastToAll: vi.fn(),
  managerInstances: [] as Array<{
    connect: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
    listVault: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
  }>,
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
}))
```

Extend the mock manager with probe/token methods only if implementation delegates there. Use `vi.resetModules()` before importing `./flashquery`.

**Registration assertion pattern** (lines 100-121):
```ts
it('T-U-040 registers renderer-to-main FlashQuery invoke channels exactly once', async () => {
  const { registerHandlers } = await import('./flashquery')

  registerHandlers()

  expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual([
    FLASHQUERY_SET_CONNECTION,
    FLASHQUERY_LIST_VAULT,
    FLASHQUERY_GET_DOCUMENT,
    FLASHQUERY_WRITE_DOCUMENT,
    FLASHQUERY_RETRY,
  ])
  expect(mocks.handle.mock.calls.map(([channel]) => channel)).not.toContain(FLASHQUERY_STATUS)
})
```

Update expected channel list if adding probe/token read. Continue asserting main-to-renderer broadcast channels are not registered with `ipcMain.handle`.

**Set connection assertions** (lines 141-160):
```ts
await handler({}, 'workspace-1', connection)

expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', { flashqueryConnection: connection })
expect(mocks.broadcastWorkspaceChange).toHaveBeenCalledTimes(1)
expect(mocks.managerInstances[0].dispose).toHaveBeenCalledWith('workspace-1')
expect(mocks.managerInstances[0].connect).toHaveBeenCalledWith('workspace-1', connection)
expect(JSON.stringify(result)).not.toContain('secret-token')
```

For probe tests, assert the inverse: no `updateWorkspace`, no `broadcastWorkspaceChange`, no persistent connect, and no token leaks in results/log-safe payloads.

## Shared Patterns

### Renderer/Main Boundary

**Source:** `src/preload/index.ts` lines 895-927 and `src/shared/electron-api.d.ts` lines 512-526

All renderer FlashQuery operations must call `window.electronAPI.*`. Do not import Electron, MCP SDK, filesystem, or token storage in renderer components.

### URL Validation

**Source:** `src/main/ipc/flashquery.ts` lines 44-60

Use `new URL(value)` plus `http:` / `https:` protocol checks. Renderer dialog can duplicate the same lightweight check for inline UX, but main IPC remains authoritative.

### Dialog Close Semantics

**Source:** `src/renderer/dialogs/SavedLayoutsDialog.tsx` lines 154-173

Escape listener uses capture mode, overlay click closes, dialog body stops propagation, and `if (!show) return null` prevents hidden DOM.

### Native Context Menu

**Source:** `src/renderer/sidebar/WorkspaceTab.tsx` lines 296-343

Workspace context menus are arrays of `NativeContextMenuItem` passed to `window.electronAPI.showContextMenu(items)`, then dispatched by returned id. No React dropdown for Phase 5.

### jsdom Renderer Tests

**Source:** `src/renderer/panels/FlashQueryVaultPanel.test.tsx` lines 1-113

Use Testing Library for user-facing component behavior, `Object.defineProperty(window, 'electronAPI', ...)` for IPC mocks, and direct Zustand `setState` for workspace/UI setup.

## No Analog Found

None. Every planned Phase 5 file has a close Cate analog. The only behavioral gap is new FlashQuery dry-run probe/token prepopulation IPC; implement it by extending the existing FlashQuery IPC/preload/channel pattern rather than inventing a new structure.

## Metadata

**Analog search scope:** `src/renderer/dialogs`, `src/renderer/sidebar`, `src/renderer/stores`, `src/renderer/panels`, `src/shared`, `src/preload`, `src/main/ipc`
**Files scanned:** 12 primary files plus mandatory product/planning docs
**Pattern extraction date:** 2026-05-29
