# Phase 4: Vault Panel + Shared Chip - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 17
**Analogs found:** 17 / 17

## Mandatory Guardrail

Downstream planners and implementers MUST read these two external product docs before asking questions or touching Phase 4 behavior:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md`

If local planning docs, code comments, or existing Cate conventions appear ambiguous, re-read those docs first, then inspect code, then ask the user only if still blocked.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `package.json` | config | dependency-management | `package.json` | exact |
| `package-lock.json` | config | dependency-management | `package-lock.json` | exact |
| `src/shared/types.ts` | model | shared-contract | `src/shared/types.ts` existing panel/FlashQuery types | exact |
| `src/shared/panels.ts` | config | shared-contract | `src/shared/panels.ts` `fileExplorer` definition | exact |
| `src/shared/panels.test.ts` | test | transform/assertion | `src/shared/types.test.ts`, `src/renderer/drag/registry.test.ts` | role-match |
| `src/renderer/panels/registry.ts` | config | factory/registration | `src/renderer/panels/registry.ts` `fileExplorer` entry | exact |
| `src/renderer/panels/registry.test.ts` | test | factory/registration | `src/renderer/drag/registry.test.ts` | role-match |
| `src/renderer/stores/appStore.ts` | store | CRUD/factory | `createFileExplorer` in `src/renderer/stores/appStore.ts` | exact |
| `src/renderer/stores/appStore.test.ts` | test | store mutation | `src/renderer/stores/canvasStore.test.ts` | role-match |
| `src/renderer/stores/uiStore.ts` | store | event-driven UI toggle | `openSettings` slice in `src/renderer/stores/uiStore.ts` | exact |
| `src/shared/ipc-channels.ts` | config | request-response IPC | FlashQuery constants in `src/shared/ipc-channels.ts` | exact |
| `src/shared/electron-api.d.ts` | model | preload API contract | FlashQuery methods in `src/shared/electron-api.d.ts` | exact |
| `src/preload/index.ts` | provider | request-response IPC bridge | FlashQuery preload methods in `src/preload/index.ts` | exact |
| `src/main/ipc/flashquery.ts` | controller | request-response IPC | Existing FlashQuery handlers in `src/main/ipc/flashquery.ts` | exact |
| `src/main/ipc/flashquery.test.ts` | test | IPC handler assertion | Existing tests in `src/main/ipc/flashquery.test.ts` | exact |
| `src/renderer/components/Chip.tsx` | component | event-driven UI | `src/renderer/canvas/BulkActionChip.tsx` | role-match |
| `src/renderer/components/Chip.test.tsx` | test | component interaction | `src/renderer/sidebar/WorkspaceTab.test.tsx` | role-match |
| `src/renderer/panels/FlashQueryVaultPanel.tsx` | component | request-response + lazy tree | `src/renderer/sidebar/FileExplorer.tsx`, `src/renderer/sidebar/FileTreeNode.tsx` | role+flow match |
| `src/renderer/panels/FlashQueryVaultPanel.test.tsx` | test | component interaction + IPC mock | `src/renderer/sidebar/WorkspaceTab.test.tsx`, `src/main/ipc/flashquery.test.ts` | role-match |

## Pattern Assignments

### `src/shared/types.ts` (model, shared-contract)

**Analog:** `src/shared/types.ts`

**Panel type pattern** (lines 25-30):
```typescript
// -----------------------------------------------------------------------------
// Panel types
// -----------------------------------------------------------------------------

export type PanelType = 'terminal' | 'browser' | 'editor' | 'git' | 'fileExplorer' | 'projectList' | 'canvas' | 'agent' | 'document'
```

**FlashQuery shared contract pattern** (lines 160-175):
```typescript
export type FlashQueryConnectionStatus = 'connecting' | 'live' | 'disconnected'

export interface FlashQueryStatusBroadcastPayload {
  workspaceId: string
  status: FlashQueryConnectionStatus
  version?: string
  instanceId?: string
  error?: string
}

export interface FlashQueryVaultEntry {
  name: string
  type: 'folder' | 'document'
  vaultPath: string
  title?: string
}
```

**Size-map update pattern** (lines 944-966): add `flashqueryVault` anywhere `Record<PanelType, Size>` is explicit, including `PANEL_CANVAS_DROP_SIZES`.

### `src/shared/panels.ts` and `src/shared/panels.test.ts` (config/test, shared-contract)

**Analog:** `src/shared/panels.ts`

**Add-panel instructions are already encoded in comments** (lines 9-14):
```typescript
// Renderer-only fields (icon component, lazy component, factory) live in
// `src/renderer/panels/registry.ts`, which extends this with the renderer
// concerns and re-exports the unified definition.
//
// Adding a new panel type means adding one entry here + one entry in
// `registry.ts`. The PanelType union in `./types.ts` keeps everyone honest.
```

**Definition shape** (lines 23-44):
```typescript
export interface SharedPanelDefinition {
  type: PanelType
  label: string
  brandColor: string
  switcherColor: string
  mutedColor: string
  tintClass: string
  defaultSize: Size
  minimumSize: Size
  ghostSvg: string
  canLiveOnCanvas: boolean
}
```

**File-explorer sizing/color analog** (lines 108-119):
```typescript
fileExplorer: {
  type: 'fileExplorer',
  label: 'File Explorer',
  brandColor: '#5AC8FA',
  switcherColor: '#5AC8FA',
  mutedColor: '#4a8aa5',
  tintClass: 'text-cyan-400',
  defaultSize: { width: 300, height: 500 },
  minimumSize: { width: 180, height: 200 },
  ghostSvg: ghost('rgb(90,200,250)', '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
  canLiveOnCanvas: true,
}
```

Use the locked Phase 4 values instead of the file-explorer colors: label `FlashQuery Vault`, brand/switcher `#5AD8B8`, muted `#4a9080`, `tintClass: 'text-teal-400'`, file-explorer-like sizing, `canLiveOnCanvas: true`, vault ghost SVG.

**Test analog:** `src/renderer/drag/registry.test.ts` lines 1-7 and 82-99 show direct Vitest imports and assertion structure.

### `src/renderer/panels/registry.ts` and tests (config, factory/registration)

**Analog:** `src/renderer/panels/registry.ts`

**Imports and lazy component pattern** (lines 15-32, 40-49):
```typescript
import React, { type LazyExoticComponent, type ComponentType } from 'react'
import {
  Terminal,
  Globe,
  FileText,
  GitBranch,
  TreeStructure,
  SquaresFour,
  List,
  FileDoc,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react'
...
const FileExplorerPanel = React.lazy(() => import('./FileExplorerPanel'))
```

Add `Vault` to the Phosphor import and `const FlashQueryVaultPanel = React.lazy(() => import('./FlashQueryVaultPanel'))`.

**Factory entry pattern** (lines 115-121):
```typescript
fileExplorer: {
  ...PANEL_DEFINITIONS.fileExplorer,
  icon: TreeStructure,
  Component: FileExplorerPanel,
  create: ({ workspaceId, canvasPoint, placement }) =>
    useAppStore.getState().createFileExplorer(workspaceId, canvasPoint, placement) || null,
},
```

Copy this shape for `flashqueryVault`, using `Vault`, `FlashQueryVaultPanel`, and `createFlashQueryVault(...) || null`.

### `src/renderer/stores/appStore.ts` and tests (store, CRUD/factory)

**Analog:** `createFileExplorer` in `src/renderer/stores/appStore.ts`

**Action interface pattern** (lines 300-304):
```typescript
createProjectList: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
createCanvas: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
createAgent: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
createDocument: (workspaceId: string, filePath?: string, documentType?: 'pdf' | 'docx' | 'image', position?: Point, placement?: PanelPlacement) => string
```

Add `createFlashQueryVault: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string`.

**Placement helper pattern** (lines 360-385):
```typescript
function placePanel(
  panelId: string,
  panelType: PanelType,
  placement: PanelPlacement | undefined,
  position: Point | undefined,
  isActiveWorkspace: boolean,
): void {
  if (placement?.target === 'none') return
  if (panelType === 'canvas') {
    useDockStore.getState().dockPanel(panelId, 'center')
    return
  }
  if (placement?.target === 'dock') {
    useDockStore.getState().dockPanel(panelId, placement.zone)
    return
  }
  if (isActiveWorkspace) {
    const canvasPosition = placement?.target === 'canvas' ? placement.position ?? position : position
    const ops = getActiveCanvasOps()
    ops?.addNodeAndFocus(panelId, panelType, canvasPosition)
  }
}
```

**Factory pattern to copy** (lines 888-919):
```typescript
createFileExplorer(workspaceId, position?, placement?) {
  const panelId = generateId()
  const panel: PanelState = {
    id: panelId,
    type: 'fileExplorer',
    title: 'File Explorer',
    isDirty: false,
  }
  set((state) => ({
    workspaces: state.workspaces.map((ws) =>
      ws.id === workspaceId
        ? { ...ws, panels: { ...ws.panels, [panelId]: panel } }
        : ws,
    ),
  }))
  try {
    placePanel(panelId, 'fileExplorer', placement, position, workspaceId === get().selectedWorkspaceId)
  } catch (error) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspaceId
          ? { ...ws, panels: Object.fromEntries(
              Object.entries(ws.panels).filter(([id]) => id !== panelId)
            )}
          : ws,
      ),
    }))
    log.error('Failed to place file explorer panel:', error)
    return null as unknown as string
  }
  return panelId
},
```

Use title `FlashQuery Vault`, type `flashqueryVault`, and matching log label.

### `src/renderer/stores/uiStore.ts` (store, event-driven UI toggle)

**Analog:** settings dialog slice in `src/renderer/stores/uiStore.ts`

**State/action shape** (lines 50-58, 72-80):
```typescript
interface UIStoreState {
  showNodeSwitcher: boolean
  showCommandPalette: boolean
  showLayoutsDialog: boolean
  minimapOpen: boolean
  showSettings: boolean
  settingsInitialTab: string | null
  fileExplorerVisible: boolean
}

interface UIStoreActions {
  openSettings: (initialTab?: string) => void
  closeSettings: () => void
}
```

**Action implementation** (lines 133-139):
```typescript
openSettings(initialTab) {
  set({ showSettings: true, settingsInitialTab: initialTab ?? null })
},

closeSettings() {
  set({ showSettings: false, settingsInitialTab: null })
},
```

If Phase 4 needs a placeholder for the future FlashQuery connection dialog, copy this minimal boolean/action pattern only. Do not implement Phase 5 form fields or persistence.

### `src/shared/ipc-channels.ts`, `src/shared/electron-api.d.ts`, `src/preload/index.ts` (IPC contracts)

**Analog:** existing Phase 3 FlashQuery IPC.

**Channel constants** (`src/shared/ipc-channels.ts` lines 124-129):
```typescript
// FlashQuery
export const FLASHQUERY_SET_CONNECTION = 'flashquery:setConnection'
export const FLASHQUERY_LIST_VAULT = 'flashquery:listVault'
export const FLASHQUERY_GET_DOCUMENT = 'flashquery:getDocument'
export const FLASHQUERY_WRITE_DOCUMENT = 'flashquery:writeDocument'
export const FLASHQUERY_STATUS = 'flashquery:status' // main -> renderer
```

If adding manual retry, add a narrow `FLASHQUERY_RETRY = 'flashquery:retry'` beside these.

**Typed renderer API shape** (`src/shared/electron-api.d.ts` lines 516-524):
```typescript
flashquerySetConnection(workspaceId: string, connection: FlashQueryConnection | null): Promise<void>

flashqueryListVault(workspaceId: string, vaultPath?: string): Promise<FlashQueryVaultEntry[]>

flashqueryGetDocument(workspaceId: string, vaultPath: string): Promise<FlashQueryDocumentBody>

flashqueryWriteDocument(workspaceId: string, vaultPath: string, content: string): Promise<FlashQueryWriteResult>

onFlashQueryStatus(callback: (payload: FlashQueryStatusBroadcastPayload) => void): () => void
```

Add `flashqueryRetry(workspaceId: string): Promise<void>` only if implementing the retry surface identified in research.

**Preload bridge shape** (`src/preload/index.ts` lines 898-922):
```typescript
flashquerySetConnection(workspaceId: string, connection: unknown | null): Promise<void> {
  return ipcRenderer.invoke(FLASHQUERY_SET_CONNECTION, workspaceId, connection)
},

flashqueryListVault(workspaceId: string, vaultPath?: string): Promise<unknown[]> {
  return ipcRenderer.invoke(FLASHQUERY_LIST_VAULT, workspaceId, vaultPath)
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

Renderer vault panel must use `window.electronAPI.flashqueryListVault`, `onFlashQueryStatus`, and optional `flashqueryRetry`; it must not import Electron, Node APIs, MCP clients, or filesystem IPC.

### `src/main/ipc/flashquery.ts` and tests (controller, request-response IPC)

**Analog:** existing `src/main/ipc/flashquery.ts`

**Imports and manager singleton** (lines 1-17):
```typescript
import { ipcMain } from 'electron'
import {
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_STATUS,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'
...
const flashQueryClientManager = new FlashQueryClientManager()
const statusUnsubscribers = new Map<string, () => void>()
let handlersRegistered = false
```

**Validation and handler shape** (lines 106-119):
```typescript
function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

async function listVault(workspaceId: string, vaultPath?: string) {
  requireNonEmptyString(workspaceId, 'workspaceId')
  if (vaultPath !== undefined && typeof vaultPath !== 'string') {
    throw new Error('vaultPath must be a string when provided')
  }
  return flashQueryClientManager.listVault(workspaceId, vaultPath)
}
```

**Idempotent registration pattern** (lines 143-159):
```typescript
export function registerHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(FLASHQUERY_SET_CONNECTION, async (_event, workspaceId: string, connection: unknown) => {
    return setConnection(workspaceId, connection)
  })
  ipcMain.handle(FLASHQUERY_LIST_VAULT, async (_event, workspaceId: string, vaultPath?: string) => {
    return listVault(workspaceId, vaultPath)
  })
}
```

**Test mock pattern** (`src/main/ipc/flashquery.test.ts` lines 11-24, 27-59): use `vi.hoisted`, mock Electron `ipcMain.handle`, workspace/window modules, and `FlashQueryClientManager`.

**Handler registration assertions** (`src/main/ipc/flashquery.test.ts` lines 97-116): update expected channel count and list if a retry handler is added.

### `src/renderer/components/Chip.tsx` and `Chip.test.tsx` (component, event-driven UI)

**Analog:** `src/renderer/canvas/BulkActionChip.tsx`

**Local component/button pattern** (lines 21-41):
```typescript
const ChipButton: React.FC<{
  title: string
  onClick: () => void
  children: React.ReactNode
  danger?: boolean
}> = ({ title, onClick, children, danger }) => (
  <button
    title={title}
    onClick={(e) => {
      e.stopPropagation()
      onClick()
    }}
    onMouseDown={(e) => e.stopPropagation()}
    className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
      danger
        ? 'text-muted hover:text-red-400 hover:bg-hover'
        : 'text-secondary hover:text-primary hover:bg-hover'
    }`}
  >
    {children}
  </button>
)
```

**Chip shell style pattern** (lines 70-81):
```typescript
return (
  <div
    data-bulk-action-chip
    style={{ position: 'fixed', left, top, transform: 'translateX(-50%)', zIndex: 100000 }}
    className="flex items-center gap-0.5 px-1 py-1 rounded-md bg-surface-4 border border-subtle shadow-2xl backdrop-blur"
  >
```

For Phase 4, use a 22 px pill, `rounded-[999px]`, 11 px system font, subtle translucent background/border, teal spinner for connecting, green dot for live, red dot/retry affordance for disconnected. Use an exhaustive `switch` over `{ kind: 'connecting' | 'live' | 'disconnected' | 'unknown' }` plus fallback for future variants.

**Component test analog:** `src/renderer/sidebar/WorkspaceTab.test.tsx` lines 8-19 and 25-48 show React + `createRoot` + `act` jsdom tests. If adopting RTL, install `@testing-library/react` and `@testing-library/dom`; otherwise copy this lower-level render harness.

**Forbidden class assertion:** add a source or render assertion that rejects stock neutral Tailwind tokens such as `gray`, `slate`, and `zinc`.

### `src/renderer/panels/FlashQueryVaultPanel.tsx` and tests (component, request-response + lazy tree)

**Analogs:** `src/renderer/panels/FileExplorerPanel.tsx`, `src/renderer/sidebar/FileExplorer.tsx`, `src/renderer/sidebar/FileTreeNode.tsx`, `src/main/flashquery/uri.ts`

**Panel wrapper pattern** (`FileExplorerPanel.tsx` lines 11-20):
```typescript
export default function FileExplorerPanel({ panelId, workspaceId }: PanelProps) {
  const rootPath = useAppStore((s) => {
    const ws = s.workspaces.find((w) => w.id === workspaceId)
    return ws?.rootPath ?? ''
  })

  return (
    <div className="w-full h-full overflow-auto bg-surface-4 flex flex-col">
```

**Load-tree pattern** (`FileExplorer.tsx` lines 102-126):
```typescript
const loadTree = useCallback(async (dirPath: string) => {
  if (!window.electronAPI) return

  setIsLoading(true)
  try {
    const entries = await window.electronAPI.fsReadDir(dirPath)
    setNodes(entries)
  } catch {
    setNodes([])
  } finally {
    setIsLoading(false)
  }
}, [])
```

Adapt this to `window.electronAPI.flashqueryListVault(workspaceId, vaultPath?)`. Do not call `fsReadDir`, `fsWatchStart`, `gitLsFiles`, `fsWriteFile`, `fsMkdir`, `fsRename`, or `fsDelete`.

**Selection semantics** (`FileExplorer.tsx` lines 203-235):
```typescript
const handleSelect = useCallback(
  (path: string, meta: { shift?: boolean; cmd?: boolean }) => {
    setSelectedPaths((prev) => {
      if (meta.cmd) {
        const next = new Set(prev)
        if (next.has(path)) {
          next.delete(path)
        } else {
          next.add(path)
        }
        lastSelectedPath.current = path
        return next
      }
      if (meta.shift && lastSelectedPath.current) {
        const startIdx = visiblePaths.indexOf(lastSelectedPath.current)
        const endIdx = visiblePaths.indexOf(path)
        if (startIdx !== -1 && endIdx !== -1) {
          const [lo, hi] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
          const next = new Set(prev)
          for (let i = lo; i <= hi; i++) {
            next.add(visiblePaths[i])
          }
          return next
        }
      }
      lastSelectedPath.current = path
      return new Set([path])
    })
  },
  [visiblePaths],
)
```

**Row click/double-click pattern** (`FileTreeNode.tsx` lines 183-218):
```typescript
const handleClick = useCallback(async (e: React.MouseEvent) => {
  const meta = { shift: e.shiftKey, cmd: e.metaKey || e.ctrlKey }
  if (node.isDirectory) {
    onSelect(node.path, meta)
    if (!meta.shift && !meta.cmd) {
      const willExpand = !isExpanded
      setIsExpanded(willExpand)
      if (willExpand && children.length === 0 && window.electronAPI) {
        setIsLoading(true)
        try {
          const entries = await window.electronAPI.fsReadDir(node.path)
          setChildren(entries)
        } catch {
          setChildren([])
        } finally {
          setIsLoading(false)
        }
      }
    }
  } else {
    onSelect(node.path, meta)
  }
}, [node, isExpanded, children.length, onSelect])

const handleDoubleClick = useCallback((e: React.MouseEvent) => {
  if (node.isDirectory) return
  e.preventDefault()
  e.stopPropagation()
  const paths = selectedPaths.has(node.path) && selectedPaths.size > 1
    ? [...selectedPaths]
    : [node.path]
  onFileOpen(paths, 'dock')
}, [node, selectedPaths, onFileOpen])
```

Adapt `node.path` to `entry.vaultPath` and directory loading to `flashqueryListVault(workspaceId, entry.vaultPath)`.

**Context-menu open pattern, with Phase 4 restrictions** (`FileTreeNode.tsx` lines 222-268):
```typescript
const handleContextMenu = useCallback(async (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()
  if (!window.electronAPI) return

  const items: import('../../shared/electron-api').NativeContextMenuItem[] = []
  if (!node.isDirectory) {
    items.push({ id: 'open', label: pathsToOpen.length > 1 ? `Open ${pathsToOpen.length} Files` : 'Open' })
    items.push({ id: 'open-on-canvas', label: pathsToOpen.length > 1 ? `Open ${pathsToOpen.length} Files on Canvas` : 'Open on Canvas' })
    items.push({ type: 'separator' })
  }

  const id = await window.electronAPI.showContextMenu(items)
  switch (id) {
    case 'open': onFileOpen(pathsToOpen, 'dock'); break
    case 'open-on-canvas': onFileOpen(pathsToOpen, 'canvas'); break
  }
}, [node, rootPath, selectedPaths, onFileOpen])
```

For vault rows, do not copy the extra file mutation items. Folder right-click must return before calling `showContextMenu`. Document menu must contain exactly:
```typescript
[
  { id: 'open', label: 'Open' },
  { id: 'open-on-canvas', label: 'Open on Canvas' },
]
```

**Open-as-editor placement pattern** (`FileExplorer.tsx` lines 238-253):
```typescript
const handleFileOpen = useCallback(
  (filePaths: string[], mode?: 'dock' | 'canvas') => {
    const resolved = mode ?? 'dock'
    const placement = resolved === 'canvas'
      ? undefined
      : { target: 'dock' as const, zone: 'center' as const }
    for (const filePath of filePaths) {
      openFileAsPanel(selectedWorkspaceId, filePath, undefined, placement)
    }
  },
  [selectedWorkspaceId],
)
```

For vault documents, use `useAppStore.getState().createEditor(workspaceId, buildVaultUri(workspaceId, entry.vaultPath), undefined, placement)`.

**URI helper** (`src/main/flashquery/uri.ts` lines 19-21):
```typescript
export function buildVaultUri(workspaceId: string, vaultPath: string): string {
  return `flashquery://${encodeURIComponent(workspaceId)}/${encodePath(vaultPath)}`
}
```

**Test analogs:**

- `src/renderer/sidebar/WorkspaceTab.test.tsx` lines 25-48: render components into jsdom with `createRoot`/`act`.
- `src/main/ipc/flashquery.test.ts` lines 257-277: mock list-vault results for root and folder calls.
- `src/main/flashquery/uri.test.ts` lines 12-27: assert canonical URI construction for document open behavior.

## Shared Patterns

### Renderer/Main Boundary

**Source:** `src/preload/index.ts` lines 898-922 and `src/shared/electron-api.d.ts` lines 516-524

Apply to: `FlashQueryVaultPanel.tsx`, `Chip.tsx` retry action, tests.

Use only `window.electronAPI.flashquery*` and `window.electronAPI.showContextMenu()` from renderer. Do not import Node, Electron, main-process manager code, MCP clients, or filesystem IPC.

### Native Context Menus

**Source:** `src/renderer/sidebar/FileTreeNode.tsx` lines 236-268

Apply to: document rows only.

Native menu API returns a selected item id:
```typescript
const id = await window.electronAPI.showContextMenu(items)
switch (id) {
  case 'open': onFileOpen(pathsToOpen, 'dock'); break
  case 'open-on-canvas': onFileOpen(pathsToOpen, 'canvas'); break
}
```

### Error Handling

**Source:** `src/main/ipc/flashquery.ts` lines 106-119 and 128-140

Apply to: main IPC additions.

Read/list/get handlers may throw descriptive validation errors. Write-style mutation handlers convert failures to typed result objects. For Phase 4 retry, prefer a simple validated request-response handler that delegates to the manager and preserves status broadcasting.

### Styling Tokens

**Source:** `src/renderer/styles/globals.css` lines 217-243; `FileTreeNode.tsx` lines 451-454

Use semantic classes:
```typescript
className={`h-7 flex items-center gap-1.5 px-2 text-sm text-primary cursor-pointer rounded-sm ${
  isSelected ? 'bg-surface-6 text-primary' : 'hover:bg-hover'
}`}
```

Avoid stock Tailwind neutral classes in new rendered Phase 4 UI: `gray`, `slate`, `zinc`. Add source or snapshot tests for this.

### Test Harness

**Source:** `src/renderer/sidebar/WorkspaceTab.test.tsx` lines 8-19 and 25-48

Use Vitest with jsdom for `.test.tsx`. Existing lower-level pattern:
```typescript
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

If the planner chooses React Testing Library, add `@testing-library/react` and `@testing-library/dom` as dev dependencies in `package.json`/`package-lock.json`.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| None | - | - | Every likely Phase 4 file has a close Cate analog. `src/renderer/components/` is new, but `BulkActionChip.tsx` provides a suitable component primitive style analog. |

## Anti-Patterns To Avoid

- Do not copy file explorer mutation affordances into vault UI: no New File, New Folder, rename, delete, archive, tag, move, copy, paste, reveal, command palette action, or shortcut.
- Do not show a context menu for folder rows.
- Do not parse document bodies for row titles; prefer `FlashQueryVaultEntry.title`.
- Do not persist expansion state globally; keep it panel-local and refresh-preserving only.
- Do not implement Phase 5 settings dialog fields or Phase 6 editor read/save routing.

## Metadata

**Analog search scope:** `src/shared`, `src/renderer`, `src/preload`, `src/main/ipc`, `src/main/flashquery`, `package.json`, `vitest.config.ts`
**Files scanned:** 150+ via `rg --files` and targeted `rg`
**Pattern extraction date:** 2026-05-29
