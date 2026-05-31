# Phase 6: Editor URI-Awareness + Vault Badge - Pattern Map

**Mapped:** 2026-05-29
**Files analyzed:** 12
**Analogs found:** 11 / 12

## Mandatory Source Guardrail

Implementation agents MUST read these external product docs before changing implementation or tests:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md`
- For badge/UI work, also read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — UI Spec.md`

Every implementation/test plan touching Phase 6 must include those docs in `<read_first>`, especially requirements REQ-027..033, REQ-041, REQ-042 and tests T-I-079..098. If local planning docs or code comments conflict with these docs, re-read the external requirements and test plan first, then inspect current code.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/renderer/panels/EditorPanel.tsx` | component | file-I/O + request-response + transform | `src/renderer/panels/EditorPanel.tsx` | exact-self |
| `src/renderer/panels/EditorPanel.test.tsx` | test | request-response + file-I/O | `src/renderer/panels/FlashQueryVaultPanel.test.tsx` | role-match |
| `src/renderer/components/Chip.tsx` | component | event-driven | `src/renderer/components/Chip.tsx` | exact-self |
| `src/renderer/components/Chip.test.tsx` | test | event-driven | `src/renderer/components/Chip.test.tsx` | exact-self |
| `src/renderer/docking/DockTabBar.tsx` | component | event-driven | `src/renderer/docking/DockTabBar.tsx` | exact-self |
| `src/renderer/docking/DockTabStack.tsx` | component | event-driven | `src/renderer/docking/DockTabStack.tsx` | exact-self |
| `src/renderer/canvas/CanvasNode.tsx` | component | event-driven | `src/renderer/canvas/CanvasNode.tsx` | exact-self |
| `src/renderer/shells/PanelWindowShell.tsx` | shell/component | event-driven + request-response | `src/renderer/shells/PanelWindowShell.tsx` | exact-self |
| `src/renderer/lib/confirmCloseDirty.ts` | utility | request-response | `src/renderer/lib/confirmCloseDirty.ts` | exact-self |
| `src/shared/flashqueryUri.ts` | utility | transform | `src/shared/flashqueryUri.ts` | reference-only |
| `src/shared/electron-api.d.ts` | config/contract | request-response | `src/shared/electron-api.d.ts` | reference-only |
| `src/preload/index.ts` | bridge/config | request-response | `src/preload/index.ts` | reference-only |

## Pattern Assignments

### `src/renderer/panels/EditorPanel.tsx` (component, file-I/O + request-response)

**Analog:** `src/renderer/panels/EditorPanel.tsx`

**Imports pattern** (lines 6-21): keep relative renderer imports and add shared URI helper from `../../shared/flashqueryUri`.

```typescript
import { useEffect, useRef, useCallback, useState } from 'react'
import log from '../lib/logger'
import * as monaco from 'monaco-editor'
import type { EditorPanelProps } from './types'
import { useAppStore } from '../stores/appStore'
```

**Model cache pattern** (lines 124-160): keep `modelCache` keyed by full `filePath`; do not normalize `flashquery://` URIs before cache lookup.

```typescript
const modelCache = new Map<string, monaco.editor.ITextModel>()
const modelRefCount = new Map<string, number>()

function rememberModel(filePath: string, model: monaco.editor.ITextModel): void {
  modelCache.delete(filePath)
  modelCache.set(filePath, model)
}
```

**Save pattern** (lines 381-449): branch inside this callback. Preserve Save-As for no `filePath`; for vault URIs call `flashqueryWriteDocument(workspaceId, vaultPath, content)` and only clear dirty state on success.

```typescript
const save = useCallback(async (): Promise<boolean> => {
  const editor = editorRef.current
  if (!editor || diffMode) return false

  const content = editor.getValue()
  let targetPath = filePathRef.current
  // existing Save-As path...

  try {
    await window.electronAPI.fsWriteFile(targetPath, content)
  } catch (err) {
    log.error('[EditorPanel] Failed to save file:', err)
    return false
  }

  isDirtyRef.current = false
  useAppStore.getState().setPanelDirty(workspaceId, panelId, false)
  useAppStore.getState().updatePanelTitle(workspaceId, panelId, fileName)
  return true
}, [workspaceId, panelId, diffMode, rootPath])
```

**Diff guardrail pattern** (lines 465-534): add vault short-circuit before `createDiffEditor`, `fsReadFile`, relative-path work, `gitDiffStaged`, or `gitDiff`.

```typescript
if (diffMode && filePath && rootPath) {
  const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
    readOnly: true,
    renderSideBySide: true,
  })

  const relativePath = filePath.startsWith(rootPath)
    ? filePath.slice(rootPath.length + 1)
    : filePath

  modifiedContent = await window.electronAPI.fsReadFile(filePath)
  const diff = diffMode === 'staged'
    ? await window.electronAPI.gitDiffStaged(rootPath, relativePath)
    : await window.electronAPI.gitDiff(rootPath, relativePath)
}
```

**Read/model routing pattern** (lines 565-609): preserve local `monaco.Uri.file(filePath)` and `fsReadFile`; vault branch must use `monaco.Uri.parse(filePath)` and `flashqueryGetDocument(...).body`.

```typescript
const fileUri = monaco.Uri.file(filePath)
let cached = modelCache.get(filePath)
const byUri = monaco.editor.getModel(fileUri)

window.electronAPI
  .fsReadFile(filePath)
  .then((content) => {
    const model = monaco.editor.createModel(content, language, fileUri)
    rememberModel(filePath, model)
    retainModel(filePath)
    editor.setModel(model)
  })
  .catch((err) => {
    log.error('[EditorPanel] Failed to read file:', err)
    const model = monaco.editor.createModel('', language)
    editor.setModel(model)
  })
```

**Dirty/unsaved pattern** (lines 631-652): preserve scratch-only `unsavedContent`; vault URIs have `filePathRef.current`, so do not persist unsaved vault body into panel state.

```typescript
if (!isDirtyRef.current) {
  isDirtyRef.current = true
  useAppStore.getState().setPanelDirty(workspaceId, panelId, true)
  if (filePathRef.current) {
    const fileName = filePathRef.current.split('/').pop() ?? 'Untitled'
    useAppStore.getState().updatePanelTitle(workspaceId, panelId, `${fileName} •`)
  }
}

if (!filePathRef.current) {
  useAppStore.getState().setPanelUnsavedContent(workspaceId, panelId, value || undefined)
}
```

**Save registration / close-confirm integration** (lines 684-701): keep registering `save` so `confirmCloseDirtyPanels()` can reuse the existing close-confirm flow for vault editors.

```typescript
const handler = () => {
  if (getActiveEditorPanelId() === panelId) save()
}
window.addEventListener('save-file', handler)
registerEditorSave(panelId, save)
return () => {
  window.removeEventListener('save-file', handler)
  unregisterEditorSave(panelId)
}
```

### `src/renderer/panels/EditorPanel.test.tsx` (test, request-response + file-I/O)

**Analog:** `src/renderer/panels/FlashQueryVaultPanel.test.tsx`

**Imports/mock pattern** (lines 1-17): use React Testing Library, Vitest, a logger mock before importing the component, and app store seeding.

```typescript
import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}))

import FlashQueryVaultPanel from './FlashQueryVaultPanel'
import { useAppStore } from '../stores/appStore'
```

**Electron API mock pattern** (lines 19-43): define a narrow `Pick<Window['electronAPI'], ...>` mock and install it via `Object.defineProperty`.

```typescript
type ElectronApiMock = Pick<
  Window['electronAPI'],
  'flashqueryListVault' | 'flashqueryRetry' | 'onFlashQueryStatus' | 'showContextMenu'
>

const makeElectronApi = (): ElectronApiMock => ({
  flashqueryListVault: vi.fn(() => Promise.resolve([])),
  flashqueryRetry: vi.fn().mockResolvedValue(undefined),
  onFlashQueryStatus: vi.fn((callback) => {
    statusListener = callback
    return () => { statusListener = null }
  }),
  showContextMenu: vi.fn().mockResolvedValue(null),
})
```

**Store seeding pattern** (lines 83-112): seed `selectedWorkspaceId`, `workspaces`, connection metadata, and override store actions with spies where behavior crosses boundaries.

```typescript
useAppStore.setState({
  selectedWorkspaceId: workspaceId,
  workspaces: [{
    id: workspaceId,
    name: 'Workspace',
    color: '#5AD8B8',
    rootPath: '/workspace',
    panels: {},
    canvasNodes: {},
    regions: {},
    zoomLevel: 1,
    viewportOffset: { x: 0, y: 0 },
    focusedNodeId: null,
    flashqueryConnection: connection,
  }],
})
```

**FlashQuery URI assertion pattern** (lines 296-308, 311-329): assert the full `flashquery://` URI is passed through unchanged.

```typescript
expect(createEditorSpy).toHaveBeenCalledWith(
  workspaceId,
  'flashquery://workspace-1/Project.md',
  undefined,
  { target: 'dock', zone: 'center' },
)
```

**No exact analog:** there is no existing `EditorPanel.test.tsx` and no existing Monaco mock test. Create a local Monaco mock that records `Uri.file`, `Uri.parse`, `editor.create`, `editor.createDiffEditor`, `editor.getModel`, and `editor.createModel` calls. Keep tests at component boundary and assert preload calls, model URI identity, dirty store state, visible save error, and diff guardrails.

### `src/renderer/components/Chip.tsx` (component, event-driven)

**Analog:** `src/renderer/components/Chip.tsx`

**Surface style pattern** (lines 21-28): reuse or factor this surface for the vault badge; do not duplicate these values in `EditorPanel.tsx`.

```typescript
const chipStyle: React.CSSProperties = {
  minHeight: 22,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  fontSize: 11,
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
}
```

**Tooltip pattern** (lines 91-123): follow local hover state and tooltip surface classes; vault tooltip should show decoded `vaultPath` and should not be clickable.

```typescript
const [showTooltip, setShowTooltip] = useState(false)
const className = 'relative inline-flex items-center gap-1.5 px-2 whitespace-nowrap select-none'

{isDisconnected && showTooltip && (
  <span
    role="tooltip"
    className="absolute left-1/2 top-full z-50 mt-1 flex flex-col gap-0.5 rounded-md border border-subtle bg-surface-4 px-2 py-1 text-left shadow-2xl"
  >
    {tooltipError && <span className="text-secondary">{tooltipError}</span>}
  </span>
)}
```

**Interactive/non-interactive split** (lines 128-149): disconnected status uses a button; non-clickable states use a `div`. Vault badge v1 should use inert `div` semantics unless focus is intentionally supported.

```typescript
if (isDisconnected) {
  return <button type="button" aria-label={content.label} {...commonProps}>{inner}</button>
}

return <div {...commonProps}>{inner}</div>
```

### `src/renderer/components/Chip.test.tsx` (test, event-driven)

**Analog:** `src/renderer/components/Chip.test.tsx`

**Testing pattern** (lines 11-24, 52-65, 79-96): assert exact labels, icon/test hooks, hover tooltip, and forbidden stock neutral classes.

```typescript
const { container } = render(<Chip state={{ kind: 'live' }} />)
expect(screen.getByText('Live')).toBeTruthy()
expect(container.querySelector('[data-chip-dot]')).toHaveProperty('style.backgroundColor', 'rgb(52, 199, 89)')

fireEvent.mouseEnter(chip)
expect(screen.getByText('Server is offline')).toBeTruthy()
```

### `src/renderer/docking/DockTabBar.tsx` (component, event-driven)

**Analog:** `src/renderer/docking/DockTabBar.tsx`

**Imports/state pattern** (lines 8-15): use store selectors and panel metadata; add `parseVaultUri` and a shared vault badge component here if badge lands in docked tab title chrome.

```typescript
import React from 'react'
import { useShallow } from 'zustand/react/shallow'
import type { PanelState, PanelType, DockTabStack as DockTabStackType } from '../../shared/types'
import { X } from '@phosphor-icons/react'
import { useAppStore } from '../stores/appStore'
```

**Title insertion point** (lines 222-253): insert badge after title text and before waiting/close indicators. Keep title truncation and tab drag behavior intact.

```typescript
<span className="shrink-0">
  <TabIcon type={panelType} size={compact ? 11 : 13} />
</span>
{renameId === panelId ? (
  <input className="truncate flex-1 min-w-0 bg-transparent outline-none" />
) : (
  <span className="truncate flex-1 min-w-0">{getPanelTitle(panelId)}</span>
)}
```

**Drag/no-drag pattern** (lines 208-214, 260-271): tabs use `WebkitAppRegion: 'no-drag'`; close stops propagation. Badge hover/focus must not interfere with tab click/drag.

```typescript
baseStyle={{
  backgroundColor: isActive ? 'var(--node-chrome-active-bg, var(--surface-3))' : 'var(--node-chrome-bg, var(--surface-1))',
  WebkitAppRegion: 'no-drag',
} as React.CSSProperties}
```

### `src/renderer/docking/DockTabStack.tsx` (component, event-driven)

**Analog:** `src/renderer/docking/DockTabStack.tsx`

**Pass-through pattern** (lines 24-53, 233-268): `DockTabStack` already resolves `PanelState` and passes `workspaceId` to `DockTabBar`. Prefer computing badge metadata in `DockTabBar` from `getPanel(panelId)` plus workspace state, avoiding broad prop churn.

```typescript
<DockTabBar
  stack={stack}
  compact={compact}
  workspaceId={effectiveWorkspaceId}
  getPanel={resolvePanel}
  getPanelTitle={getPanelTitle}
  onClosePanel={onClosePanel}
  onTabClick={actions.handleTabClick}
/>
```

### `src/renderer/canvas/CanvasNode.tsx` (component, event-driven)

**Analog:** `src/renderer/canvas/CanvasNode.tsx`

**Canvas title chrome owner pattern** (lines 338-405): canvas node title chrome is the root `DockTabStack` plus `trailingControls`; badge work in `DockTabBar` will naturally apply to canvas-hosted tabs because `CanvasNode` passes `getPanel`, `getPanelTitle`, `compact`, and trailing controls.

```typescript
<DockTabStack
  stack={layoutNode}
  zone="center"
  renderPanel={renderPanel}
  getPanelTitle={getPanelTitle}
  getPanel={getPanel}
  onClosePanel={handleClosePanel}
  compact
  trailingControls={isHeaderHost ? nodeControlButtons : undefined}
/>
```

### `src/renderer/shells/PanelWindowShell.tsx` (shell/component, event-driven + request-response)

**Analog:** `src/renderer/shells/PanelWindowShell.tsx`

**Detached title chrome pattern** (lines 177-207): detached panel windows own a separate title bar. If Phase 6 supports detached editor badge, render the same shared vault badge beside `displayPanel.title` and before the close button.

```typescript
<div
  className="flex items-center h-8 px-2 bg-titlebar-bg border-b border-subtle select-none shrink-0"
  style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
>
  <div className="flex items-center justify-center w-5 h-5 mr-1 rounded hover:bg-hover cursor-grab">
    <PanelTypeIcon type={displayPanel.type} />
  </div>
  <span className="text-xs text-secondary truncate flex-1 min-w-0">{displayPanel.title}</span>
  <button className="w-5 h-5 flex items-center justify-center rounded hover:bg-hover">
    <X size={10} />
  </button>
</div>
```

**Detached Save-As sync pattern** (lines 66-87): preserve existing `editor:panel-saved-as` behavior; vault saves should not dispatch Save-As metadata updates.

```typescript
window.addEventListener('editor:panel-saved-as', handler)
setPanel((prev) => {
  const next = { ...prev, filePath: detail.filePath, title: detail.title, isDirty: false }
  window.electronAPI.panelWindowSyncMeta?.({ panel: next, workspaceId }).catch(() => {})
  return next
})
```

### `src/renderer/lib/confirmCloseDirty.ts` (utility, request-response)

**Analog:** `src/renderer/lib/confirmCloseDirty.ts`

**Close-confirm pattern** (lines 10-45): dirty vault editor panels should flow through this helper unchanged. Tests for close-confirm reuse can register a save handler and assert `confirmUnsavedChanges` is called with the vault panel `filePath`.

```typescript
const dirty = panels.filter(
  (p): p is PanelState => !!p && p.type === 'editor' && !!p.isDirty,
)
if (dirty.length === 0) return true
if (!window.electronAPI?.confirmUnsavedChanges) return true

const choice = await window.electronAPI.confirmUnsavedChanges({
  fileName,
  multiple: dirty.length > 1,
  filePath,
})
if (choice === 'save') {
  for (const p of dirty) {
    let result: Awaited<ReturnType<typeof saveEditor>> = 'no-handler'
    try { result = await saveEditor(p.id) } catch { /* treat as no-handler */ }
    if (result === 'cancelled') return false
  }
}
```

### `src/shared/flashqueryUri.ts` (utility, transform, read-first reference)

**Analog:** `src/shared/flashqueryUri.ts`

**Canonical URI pattern** (lines 19-35): import and use this helper; do not duplicate parsing in renderer components.

```typescript
export function buildVaultUri(workspaceId: string, vaultPath: string): string {
  return `flashquery://${encodeURIComponent(workspaceId)}/${encodePath(vaultPath)}`
}

export function parseVaultUri(uri: string): FlashQueryUriParts | null {
  const match = /^flashquery:\/\/([^/]+)\/?(.*)$/.exec(uri)
  if (!match) return null
  const workspaceId = decodeURIComponent(match[1])
  const decodedPath = decodePath(match[2] ?? '')
  if (!workspaceId || decodedPath === null) return null
  return { workspaceId, vaultPath: decodedPath }
}
```

**Test reference:** `src/shared/flashqueryUri.test.ts` lines 12-27 cover nested paths and reserved-character decoding; line 43-48 covers non-FlashQuery/malformed URI null behavior.

### `src/shared/electron-api.d.ts` and `src/preload/index.ts` (bridge contracts, request-response, read-first references)

**Analog:** `src/shared/electron-api.d.ts`; `src/preload/index.ts`

**Renderer-facing API contract** (`src/shared/electron-api.d.ts` lines 516-524): call only these methods from renderer code for FlashQuery document I/O.

```typescript
flashqueryListVault(workspaceId: string, vaultPath?: string): Promise<FlashQueryVaultEntry[]>
flashqueryGetDocument(workspaceId: string, vaultPath: string): Promise<FlashQueryDocumentBody>
flashqueryWriteDocument(workspaceId: string, vaultPath: string, content: string): Promise<FlashQueryWriteResult>
```

**Preload forwarding pattern** (`src/preload/index.ts` lines 908-917): no new preload methods are needed for Phase 6.

```typescript
flashqueryGetDocument(workspaceId: string, vaultPath: string): Promise<unknown> {
  return ipcRenderer.invoke(FLASHQUERY_GET_DOCUMENT, workspaceId, vaultPath)
},

flashqueryWriteDocument(workspaceId: string, vaultPath: string, content: string): Promise<unknown> {
  return ipcRenderer.invoke(FLASHQUERY_WRITE_DOCUMENT, workspaceId, vaultPath, content)
},
```

### `src/renderer/panels/FlashQueryVaultPanel.tsx` (reference analog for opening vault docs)

**Analog:** `src/renderer/panels/FlashQueryVaultPanel.tsx`

**Open-to-editor pattern** (lines 292-303): vault documents already open as editor panels with `flashquery://` `filePath`; `EditorPanel` should consume this string.

```typescript
useAppStore.getState().createEditor(
  workspaceId,
  buildVaultUri(workspaceId, entry.vaultPath),
  undefined,
  placement,
)
```

**Host parsing pattern** (lines 16-22): badge host can follow this pattern but should show no misleading fallback host if parsing fails.

```typescript
function hostFromUrl(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}
```

## Shared Patterns

### Renderer Boundary
**Source:** `src/shared/electron-api.d.ts` lines 516-524 and `src/preload/index.ts` lines 912-917  
**Apply to:** `EditorPanel.tsx`, tests  
Renderer code must use `window.electronAPI.flashqueryGetDocument` and `window.electronAPI.flashqueryWriteDocument`; no MCP client, Node API, or filesystem IPC for `flashquery://` documents.

### Panel State And Dirty State
**Source:** `src/shared/types.ts` lines 91-102; `src/renderer/stores/appStore.ts` lines 1178-1203  
**Apply to:** `EditorPanel.tsx`, `EditorPanel.test.tsx`, `confirmCloseDirty.ts`

```typescript
export interface PanelState {
  id: string
  type: PanelType
  title: string
  isDirty: boolean
  filePath?: string
  diffMode?: 'staged' | 'working'
  unsavedContent?: string
}

setPanelDirty(workspaceId, panelId, dirty) { ... }
setPanelUnsavedContent(workspaceId, panelId, content) { ... }
```

### Workspace Connection Host
**Source:** `src/shared/types.ts` lines 377-383 and `src/renderer/panels/FlashQueryVaultPanel.tsx` lines 16-22  
**Apply to:** title chrome badge components  
Use `workspace.flashqueryConnection?.url` and `new URL(url).host` for badge host. If unavailable/unparsable, show only `Vault`.

### Existing Title Chrome
**Source:** `DockTabBar.tsx` lines 222-253; `DockTabStack.tsx` lines 233-268; `CanvasNode.tsx` lines 393-405; `PanelWindowShell.tsx` lines 185-207  
**Apply to:** badge placement  
Docked and canvas-hosted tabs share `DockTabBar` through `DockTabStack`. Detached panel windows have separate title chrome in `PanelWindowShell`.

### Save-As And Detached Shell Sync
**Source:** `EditorPanel.tsx` lines 424-447; `PanelWindowShell.tsx` lines 66-87  
**Apply to:** `EditorPanel.tsx`, `PanelWindowShell.tsx`  
Only initial local Save-As should update `filePathRef`, panel file path, clear `unsavedContent`, and dispatch `editor:panel-saved-as`. Vault saves should use the existing panel `filePath` and should not persist unsaved body.

### Test Style
**Source:** `FlashQueryVaultPanel.test.tsx` lines 1-17, 76-112; `Chip.test.tsx` lines 11-24 and 52-65  
**Apply to:** new/expanded renderer tests  
Use Vitest + React Testing Library, `Object.defineProperty(window, 'electronAPI', ...)`, app store seeding via `useAppStore.setState`, and direct DOM/user-event assertions.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/renderer/panels/EditorPanel.test.tsx` | test | Monaco file-I/O + request-response | No existing EditorPanel/Monaco renderer test exists; use `FlashQueryVaultPanel.test.tsx` for renderer/store/electron mocks and build a focused Monaco mock locally. |

## Metadata

**Analog search scope:** `src/renderer/panels`, `src/renderer/components`, `src/renderer/docking`, `src/renderer/canvas`, `src/renderer/shells`, `src/renderer/lib`, `src/renderer/stores`, `src/shared`, `src/preload`  
**Files scanned:** 61  
**Pattern extraction date:** 2026-05-29
