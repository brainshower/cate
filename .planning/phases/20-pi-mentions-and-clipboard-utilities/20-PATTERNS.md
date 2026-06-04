# Phase 20: Pi `@` Mentions and Clipboard Utilities - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 14
**Analogs found:** 14 / 14

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/agent/renderer/AgentChatInput.tsx` | component | event-driven | `src/agent/renderer/AgentChatInput.tsx` slash popup | exact |
| `src/agent/renderer/agentStore.ts` | store | request-response | `src/agent/renderer/agentStore.ts` typed panel actions | exact |
| `src/agent/renderer/AgentPanel.tsx` | component | event-driven | `src/agent/renderer/AgentPanel.tsx` session lifecycle wiring | exact |
| `src/renderer/panels/FlashQueryVaultPanel.tsx` | component | request-response | `src/renderer/panels/FlashQueryVaultPanel.tsx` refresh/tree context menu | exact |
| `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` | component | request-response | `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` document row menu/copy | exact |
| `src/renderer/panels/EditorPanel.tsx` | component | file-I/O | `src/renderer/panels/EditorPanel.tsx` FlashQuery title actions | exact |
| `src/shared/flashqueryUri.ts` | utility | transform | `src/shared/flashqueryUri.ts` parse/build helpers | exact |
| `src/shared/types.ts` / `src/shared/electron-api.d.ts` / `src/preload/index.ts` | config | request-response | existing `FlashQueryVaultIndexEntry` + preload API | exact |
| `src/main/ipc/flashquery.ts` | controller | request-response | existing `FLASHQUERY_LIST_VAULT_INDEX` handler | exact |
| `src/main/flashquery/clientManager.ts` | service | request-response | existing `listVaultIndex()` | exact |
| `src/agent/renderer/AgentChatInput.atMention.test.tsx` or equivalent | test | event-driven | `FlashQueryVaultSearchPanel.test.tsx` component interaction tests | role-match |
| `src/agent/renderer/agentStore.test.ts` | test | event-driven | `src/agent/renderer/agentStore.test.ts` mocked event dispatch | exact |
| `src/renderer/panels/*FlashQuery*.test.tsx` / `EditorPanel.test.tsx` | test | request-response | vault/search/editor component tests | exact |
| `e2e/fixtures/flashquery-server.ts`, `src/renderer/lib/e2eHarness.ts`, `e2e/flashquery-vault-search.spec.ts` or new Pi mention E2E | test | request-response | existing FlashQuery fixture and harness | exact |

## Pattern Assignments

### `src/agent/renderer/AgentChatInput.tsx` (component, event-driven)

**Analog:** `src/agent/renderer/AgentChatInput.tsx`

**Imports and portal pattern** (lines 8-16, 28-46):
```typescript
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Stop, PaperPlaneRight, ClipboardText, Spinner, ArrowsClockwise } from '@phosphor-icons/react'

function useNodePortalTarget(ref: React.RefObject<Element | null>) {
  const getTarget = useCallback(() => ref.current?.closest('[data-node-id]') as HTMLElement | null, [ref])
  const toLocal = useCallback((viewport: { top: number; left: number }) => {
    const target = getTarget()
    if (!target) return viewport
    const tr = target.getBoundingClientRect()
    return { top: viewport.top - tr.top, left: viewport.left - tr.left }
  }, [getTarget])
  return { getTarget, toLocal }
}
```

**Slash command detection and keyboard pattern** (lines 104-126, 191-213):
```typescript
const slashMatch = useMemo(() => {
  if (!draft.startsWith('/')) return null
  if (draft.includes(' ') || draft.includes('\n')) return null
  return draft.slice(1).toLowerCase()
}, [draft])

const filteredCommands = useMemo(() => {
  if (slashMatch == null) return []
  return commands.filter((c) => c.name.toLowerCase().startsWith(slashMatch))
}, [slashMatch, commands])

if (popupOpen) {
  if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filteredCommands.length - 1)); return }
  if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return }
  if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); acceptCommand(filteredCommands[selectedIdx]); return }
  if (e.key === 'Escape') { e.preventDefault(); onChange(''); return }
}
```

**Popover row rendering pattern** (lines 530-566):
```typescript
function SlashPopup({ commands, selectedIdx, onPick, onHover }: { commands: AgentSlashCommand[]; selectedIdx: number; onPick: (cmd: AgentSlashCommand) => void; onHover: (idx: number) => void }) {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1.5 max-h-[240px] overflow-y-auto rounded-xl border border-white/10 bg-surface-4/98 backdrop-blur-xl shadow-[0_12px_32px_rgba(0,0,0,0.45)] z-20">
      {commands.map((cmd, i) => (
        <button key={`${cmd.source}-${cmd.name}`} onMouseEnter={() => onHover(i)} onMouseDown={(e) => { e.preventDefault(); onPick(cmd) }} className={`w-full text-left px-3 py-2 flex items-start gap-2 ${i === selectedIdx ? 'bg-white/10' : 'hover:bg-white/5'}`}>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] text-primary font-mono truncate">/{cmd.name}</div>
            {cmd.description && <div className="text-[11px] text-muted truncate">{cmd.description}</div>}
          </div>
        </button>
      ))}
    </div>
  )
}
```

**Apply to `@` mentions:** add typed props for `vaultIndex` and `vaultIndexLoading`; derive active `@<filter>` near `textarea.selectionStart`; filter by `filename.toLowerCase().includes(filter)`, sort by `fullPath`, show `Loading vault...`, and accept by replacing only the active segment with `{{ref:${fullPath}}}`. Keep footer unchanged: current footer buttons live at lines 232-288.

---

### `src/agent/renderer/agentStore.ts` (store, request-response)

**Analog:** `src/agent/renderer/agentStore.ts`

**Typed state/actions pattern** (lines 194-259):
```typescript
export interface PanelAgentState {
  messages: AgentMessage[]
  running: boolean
  model: AgentModelRef | null
  pendingApprovals: AgentToolApprovalRequest[]
  stats: AgentSessionStats | null
  extensionStatuses: ExtensionStatusEntry[]
  extensionWidgets: ExtensionWidgetEntry[]
  uiRequests: AgentExtensionUIRequest[]
}

interface AgentStoreActions {
  init: (panelId: string) => void
  dispose: (panelId: string) => void
  setStats: (panelId: string, stats: AgentSessionStats | null) => void
  setExtensionStatus: (panelId: string, key: string, text?: string) => void
}
```

**Immutable update helper** (lines 293-303):
```typescript
function withPanel(state: AgentStoreState, panelId: string, mutate: (p: PanelAgentState) => PanelAgentState): AgentStoreState {
  const current = state.panels[panelId]
  if (!current) return state
  const next = mutate(current)
  if (next === current) return state
  return { panels: { ...state.panels, [panelId]: next } }
}
```

**Whole-array replacement pattern** (lines 543-570):
```typescript
setQueues(panelId, steering, followUp) {
  set((state) =>
    withPanel(state, panelId, (p) => ({
      ...p,
      steeringQueue: steering.slice(),
      followUpQueue: followUp.slice(),
    })),
  )
}

setExtensionStatus(panelId, key, text) {
  set((state) =>
    withPanel(state, panelId, (p) => {
      const filtered = p.extensionStatuses.filter((s) => s.key !== key)
      if (!text) return { ...p, extensionStatuses: filtered }
      return { ...p, extensionStatuses: [...filtered, { key, text }] }
    }),
  )
}
```

**Apply to vault index:** extend `PanelAgentState` with `vaultIndex: FlashQueryVaultIndexEntry[]`, `vaultIndexLoading: boolean`, `vaultIndexWorkspaceId?: string`, and request sequence metadata. Add actions such as `refreshVaultIndex(panelId, workspaceId)`, `clearVaultIndex(panelId)`, and optionally `setVaultIndexLoading`. Use whole-response replacement and request-id checks; do not patch individual documents.

---

### `src/agent/renderer/AgentPanel.tsx` (component, event-driven)

**Analog:** `src/agent/renderer/AgentPanel.tsx`

**Store slice selector and active chat wiring** (lines 116-134):
```typescript
const slice = useAgentStore((s) =>
  activeAgentKey ? s.panels[activeAgentKey] : undefined,
)
const running = slice?.running ?? false
const messages = slice?.messages ?? []
const stats = slice?.stats ?? null
const extensionStatuses = slice?.extensionStatuses ?? []
```

**Generation/cancellation pattern for stale async work** (lines 297-345):
```typescript
useEffect(() => {
  let cancelled = false
  const myGen = ++openGenRef.current
  void (async () => {
    const list = await window.electronAPI.agentListSessions(cwd)
    if (cancelled || myGen !== openGenRef.current) return
    const key = newAgentKey()
    useAgentStore.getState().init(key)
    if (cancelled || myGen !== openGenRef.current) return
    setOpenChats([{ agentKey: key, sessionFile: resume?.path ?? null }])
    setActiveAgentKey(key)
    await createAgent(key, initialModel, resume?.path)
  })()
  return () => { cancelled = true /* plus cleanup */ }
}, [panelId])
```

**ChatInput prop pass-through pattern** (lines 968-991):
```typescript
<ChatInput
  draft={draft}
  onChange={setDraft}
  onSubmit={handleSend}
  onStop={handleInterrupt}
  disabled={!!selectedModel && !selectedProviderConnected}
  running={running}
  textareaRef={textareaRef}
  commands={commands}
  images={draftImages}
  stats={stats}
  compactionActive={compaction.active}
  planModeActive={planModeActive}
  onTogglePlanMode={handleTogglePlanMode}
/>
```

**Apply to vault index:** select `slice?.vaultIndex` and `slice?.vaultIndexLoading`, pass both to `ChatInput`, and wire lifecycle refresh/clear to active agent/workspace connection status. Refresh on workspace connect/reconnect and after successful document mutations; clear on disconnect and workspace change.

---

### `src/renderer/panels/FlashQueryVaultPanel.tsx` (component, request-response)

**Analog:** `src/renderer/panels/FlashQueryVaultPanel.tsx`

**Request-id guarded refresh pattern** (lines 214-240):
```typescript
const loadRoot = useCallback(async () => {
  if (rootLoadingRef.current) return
  rootLoadingRef.current = true
  const requestId = ++listRequestRef.current
  setRootLoading(true)
  try {
    const entries = await window.electronAPI.flashqueryListVault(workspaceId)
    if (requestId !== listRequestRef.current) return
    setRootEntries(entries)
    setRootLoaded(true)
  } finally {
    if (requestId === listRequestRef.current) {
      rootLoadingRef.current = false
      setRootLoading(false)
    }
  }
}, [workspaceId])
```

**Document context menu pattern** (lines 329-342):
```typescript
const handleRowContextMenu = useCallback(async (entry: FlashQueryVaultEntry, event: React.MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
  if (entry.type !== 'document') return
  selectPath(entry.vaultPath, { cmd: false, shift: false })
  const action = await window.electronAPI.showContextMenu([
    { id: 'open', label: 'Open' },
    { id: 'open-frontmatter', label: 'Open frontmatter' },
    { id: 'open-on-canvas', label: 'Open on Canvas' },
  ])
  if (action === 'open') openDocumentLegacy(entry, 'dock')
  if (action === 'open-frontmatter') useAppStore.getState().openFlashQueryFrontmatterForPath(workspaceId, entry.vaultPath)
  if (action === 'open-on-canvas') openDocumentLegacy(entry, 'canvas')
}, [openDocumentLegacy, selectPath, workspaceId])
```

**Apply to clipboard:** append `{ id: 'copy-path', label: 'Copy vault path' }` and `{ id: 'copy-reference', label: 'Copy as reference' }`; handle with `navigator.clipboard.writeText(entry.vaultPath)` and ``navigator.clipboard.writeText(`{{ref:${entry.vaultPath}}}`)``. After successful header refresh (`loadRoot`), trigger `useAgentStore.getState().refreshVaultIndex(...)` or an injected cache refresh hook.

---

### `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` (component, request-response)

**Analog:** `src/renderer/panels/FlashQueryVaultSearchPanel.tsx`

**Last-request-wins search pattern** (lines 168-210):
```typescript
const requestId = latestRequestRef.current + 1
latestRequestRef.current = requestId
setSearching(true)
try {
  const response = await window.electronAPI.flashquerySearch(workspaceId, params)
  if (requestId !== latestRequestRef.current) return
  setResults({ ...trimResponse(response), query: trimmedQuery, listAll: trimmedQuery.length === 0 && mode !== 'semantic' })
} catch (err) {
  if (requestId !== latestRequestRef.current) return
  setResults(null)
  setError(err instanceof Error ? err.message : 'Search failed.')
} finally {
  if (requestId === latestRequestRef.current) setSearching(false)
}
```

**Existing copy action pattern** (lines 138-140, 334-349):
```typescript
const copyDocumentValue = useCallback(async (value: string) => {
  await navigator.clipboard.writeText(value)
}, [])

const action = await window.electronAPI.showContextMenu([
  { id: 'open', label: 'Open' },
  { id: 'open-on-canvas', label: 'Open on Canvas' },
  { id: 'reveal', label: 'Reveal in Vault Tree' },
  { id: 'copy-path', label: 'Copy vault path' },
  { id: 'copy-reference', label: 'Copy as reference' },
])
if (action === 'copy-path') await copyDocumentValue(result.fullPath)
if (action === 'copy-reference') await copyDocumentValue(`{{ref:${result.fullPath}}}`)
```

**Memory row non-menu pattern** (lines 366-382):
```typescript
<div
  key={result.id}
  data-testid={`vault-search-memory-${result.id}`}
  onDoubleClick={() => toggleMemoryInspector(result)}
  onContextMenu={(event) => event.preventDefault()}
>
```

**Apply:** preserve document row copy behavior exactly; do not add context menus to memory rows.

---

### `src/renderer/panels/EditorPanel.tsx` (component, file-I/O)

**Analog:** `src/renderer/panels/EditorPanel.tsx`

**FlashQuery URI/path detection** (lines 249-253, 368-384):
```typescript
function basenameForEditorTitle(filePath: string): string {
  const vaultUri = parseVaultUri(filePath)
  const sourcePath = vaultUri?.vaultPath ?? filePath
  return sourcePath.split(/[\\/]/).pop() || 'Untitled'
}

const activeVaultUri = filePath ? parseVaultUri(filePath) : null
const isFlashQueryBody = activeVaultUri?.part === 'body'
const isFlashQueryFrontmatter = activeVaultUri?.part === 'frontmatter'
```

**Existing FlashQuery title action row** (lines 915-935):
```typescript
{isFlashQueryBody && !diffMode && (
  <div className="absolute top-2 right-5 z-10 flex items-center gap-1">
    <button onClick={() => useAppStore.getState().openFlashQueryFrontmatterEditor(workspaceId, panelId)} title="Show metadata editor" aria-label="Show metadata editor">
      Frontmatter
    </button>
    <button onClick={() => { void refreshBodyFromVault() }} disabled={refreshing} title="Refresh from vault" aria-label="Refresh from vault">
      {refreshing ? 'Refreshing...' : 'Refresh from vault'}
    </button>
  </div>
)}
```

**Apply to editor clipboard:** import `Clipboard` from `@phosphor-icons/react`, show an icon button only when `activeVaultUri` exists for a `flashquery:` editor, and use `activeVaultUri.vaultPath` for both menu actions. Keep it in the same absolute title action row; use `window.electronAPI.showContextMenu` for choices and `navigator.clipboard.writeText` for the final copy.

---

### IPC and Vault-Index Contracts (controller/service/config, request-response)

**Analogs:** `src/shared/types.ts`, `src/shared/electron-api.d.ts`, `src/preload/index.ts`, `src/main/ipc/flashquery.ts`, `src/main/flashquery/clientManager.ts`

**Shared return shape** (`src/shared/types.ts` lines 247-250):
```typescript
export interface FlashQueryVaultIndexEntry {
  filename: string
  fullPath: string
}
```

**Preload/typing bridge** (`src/shared/electron-api.d.ts` lines 592-608; `src/preload/index.ts` lines 1039-1041):
```typescript
flashqueryListVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]>
onFlashQueryStatus(callback: (payload: FlashQueryStatusBroadcastPayload) => void): () => void

flashqueryListVaultIndex(workspaceId: string): Promise<unknown[]> {
  return ipcRenderer.invoke(FLASHQUERY_LIST_VAULT_INDEX, workspaceId)
}
```

**IPC handler** (`src/main/ipc/flashquery.ts` lines 385-420):
```typescript
async function listVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]> {
  requireNonEmptyString(workspaceId, 'workspaceId')
  return flashQueryClientManager.listVaultIndex(workspaceId)
}

ipcMain.handle(FLASHQUERY_LIST_VAULT_INDEX, async (_event, workspaceId: string) => {
  return listVaultIndex(workspaceId)
})
```

**Client manager vault-index fetch** (`src/main/flashquery/clientManager.ts` lines 245-268, 686-716):
```typescript
async listVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]> {
  const state = this.workspaceStates.get(workspaceId)
  if (state?.status?.status === 'disconnected') return []
  try {
    const client = await this.requireMcpClient(workspaceId)
    const payload = await this.callJsonTool(client, 'search', {
      query: '',
      mode: 'filesystem',
      entity_types: ['documents'],
      limit: 1_000,
      include_archived: true,
      list_all: true,
    })
    const entries = Array.isArray(payload.results)
      ? payload.results.filter((entry) => this.searchEntityType(entry) === 'document')
      : Array.isArray(payload.documents) ? payload.documents : []
    return entries.flatMap((entry) => this.normalizeVaultIndexEntry(entry))
  } catch {
    return []
  }
}

private normalizeVaultIndexEntry(entry: unknown): FlashQueryVaultIndexEntry[] {
  const path = this.normalizePath(this.firstString(entry.fullPath, entry.vaultPath, entry.path, entry.identifier, entry.filename))
  if (!path) return []
  return [{ filename: this.filenameFromPath(path), fullPath: path }]
}
```

**Apply:** do not add a new IPC channel. Renderer cache should call `window.electronAPI.flashqueryListVaultIndex(workspaceId)`.

---

### Tests (unit/component/E2E)

**Analog:** `src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx`

**Renderer component test setup** (lines 19-66, 105-123):
```typescript
type ElectronApiMock = Pick<Window['electronAPI'], 'flashquerySearch' | 'flashqueryRetry' | 'onFlashQueryStatus' | 'showContextMenu' | 'isE2E'>
let statusListener: ((payload: FlashQueryStatusBroadcastPayload) => void) | null = null

function setElectronApi(api: ElectronApiMock) {
  Object.defineProperty(window, 'electronAPI', { configurable: true, value: api })
}

beforeEach(() => {
  statusListener = null
  setElectronApi(makeElectronApi())
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  })
  seedWorkspace({ transport: 'http', url: 'https://flashquery.local:8787/mcp' })
})
```

**Native menu clipboard assertion** (`FlashQueryVaultSearchPanel.test.tsx` lines 350-369):
```typescript
vi.mocked(api.showContextMenu).mockResolvedValueOnce('copy-reference')
fireEvent.contextMenu(await screen.findByText('Docs/Plan.md'))

await waitFor(() => expect(api.showContextMenu).toHaveBeenCalledWith([
  { id: 'open', label: 'Open' },
  { id: 'open-on-canvas', label: 'Open on Canvas' },
  { id: 'reveal', label: 'Reveal in Vault Tree' },
  { id: 'copy-path', label: 'Copy vault path' },
  { id: 'copy-reference', label: 'Copy as reference' },
]))
await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{{ref:Docs/Plan.md}}'))
```

**Vault tree context menu assertions** (`FlashQueryVaultPanel.test.tsx` lines 362-398):
```typescript
fireEvent.contextMenu(screen.getByRole('treeitem', { name: /Project.md/ }))
expect(api.showContextMenu).toHaveBeenCalledWith([
  { id: 'open', label: 'Open' },
  { id: 'open-frontmatter', label: 'Open frontmatter' },
  { id: 'open-on-canvas', label: 'Open on Canvas' },
])
```

**Agent store event test pattern** (`agentStore.test.ts` lines 14-30, 40-75):
```typescript
let dispatchAgentEvent: (envelope: AgentEventEnvelope) => void
window.electronAPI = {
  onAgentEvent: vi.fn((callback) => {
    dispatchAgentEvent = callback
    return vi.fn()
  }),
  onAgentToolRequest: vi.fn(() => vi.fn()),
} as never

const { useAgentStore } = await import('./agentStore')
dispatchAgentEvent({ panelId, event: { type: 'tool_execution_start', toolCallId: 'tool-1', toolName: 'call_model', args: {} } })
expect(useAgentStore.getState().panels[panelId].messages[0]).toMatchObject({ type: 'tool' })
```

**IPC/client T-U-006 coverage** (`flashquery.test.ts` lines 648-660; `clientManager.test.ts` lines 1133-1152):
```typescript
await expect(handler({}, 'workspace-1')).resolves.toEqual([
  { filename: 'Plan.md', fullPath: 'Docs/Plan.md' },
])
await expect(handler({}, '')).rejects.toThrow('workspaceId must be a non-empty string')

await expect(manager.listVaultIndex('workspace-1')).resolves.toEqual([
  { filename: 'Plan.md', fullPath: 'Docs/Plan.md' },
  { filename: 'Today.md', fullPath: 'Notes/Today.md' },
])
await expect(manager.listVaultIndex('workspace-1')).resolves.toEqual([])
```

**E2E fixture and harness pattern** (`e2e/fixtures/flashquery-server.ts` lines 426-438; `src/renderer/lib/e2eHarness.ts` lines 287-293, 327-337):
```typescript
seedDocuments: (nextDocuments) => {
  documents.clear()
  for (const [vaultPath, body] of Object.entries(nextDocuments)) {
    documents.set(normalizeVaultPath(vaultPath), typeof body === 'string' ? { body } : { ...body })
  }
}

const chooseNextContextMenuAction = (action: string | null): void => {
  window.electronAPI.e2eChooseNextContextMenuAction?.(action)
}

const dispatchAgentEvent = (panelId: string, event: { type: string; [key: string]: unknown }): void => {
  handleAgentEvent(panelId, event)
}
```

**E2E clipboard workflow** (`e2e/flashquery-vault-search.spec.ts` lines 80-85):
```typescript
await page.evaluate(() => window.__cateE2E!.chooseNextContextMenuAction('copy-reference'))
await planRow.click({ button: 'right' })
await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe('{{ref:Docs/Plan.md}}')
```

## Shared Patterns

### Workspace-Scoped Renderer IPC
**Source:** `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` lines 245-277 and `src/renderer/panels/FlashQueryVaultPanel.tsx` lines 364-398  
**Apply to:** Agent vault-index cache lifecycle
```typescript
return window.electronAPI.onFlashQueryStatus((payload) => {
  if (payload.workspaceId !== workspaceId) return
  setStatus({ kind: payload.status, error: payload.error })
  if (payload.status === 'disconnected') clearResultsForDisconnect(payload.error)
  else clearDisconnectErrorForRecovery()
})
```

### Last-Fetch-Wins
**Source:** `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` lines 168-210 and `src/renderer/panels/FlashQueryVaultPanel.tsx` lines 214-240  
**Apply to:** `agentStore.refreshVaultIndex`
```typescript
const requestId = latestRequestRef.current + 1
latestRequestRef.current = requestId
const response = await window.electronAPI.flashquerySearch(workspaceId, params)
if (requestId !== latestRequestRef.current) return
```

### Native Menu + Renderer Clipboard
**Source:** `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` lines 334-349  
**Apply to:** vault tree, search result rows, editor title action
```typescript
const action = await window.electronAPI.showContextMenu([
  { id: 'copy-path', label: 'Copy vault path' },
  { id: 'copy-reference', label: 'Copy as reference' },
])
if (action === 'copy-path') await navigator.clipboard.writeText(fullPath)
if (action === 'copy-reference') await navigator.clipboard.writeText(`{{ref:${fullPath}}}`)
```

### FlashQuery URI Path Extraction
**Source:** `src/shared/flashqueryUri.ts` lines 22-53  
**Apply to:** editor title Clipboard menu and tests
```typescript
export function parseVaultUri(uri: string): FlashQueryUriParts | null {
  const match = /^flashquery:\/\/([^/]+)\/?(.*)$/.exec(uri)
  if (!match) return null
  const queryStart = rawPathAndQuery.indexOf('?')
  const rawPath = queryStart >= 0 ? rawPathAndQuery.slice(0, queryStart) : rawPathAndQuery
  const decodedPath = decodePath(rawPath)
  return { workspaceId, vaultPath: decodedPath, part }
}
```

### E2E Fixture Data
**Source:** `e2e/fixtures/flashquery-server.ts` lines 114-140 and 267-299  
**Apply to:** T-E-004 vault-index/autocomplete fixture
```typescript
function searchResults(documents, titleOverrides, query, listAll) {
  return Array.from(documents.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .filter(([path, document]) => listAll || path.toLowerCase().includes(query) || document.body.toLowerCase().includes(query))
    .map(([path, document]) => ({ entity_type: 'document', identifier: path, path, content_preview: firstContentLine }))
}
```

## No Analog Found

All planned Phase 20 files have close local analogs. No planner fallback to research-only patterns is needed.

## Metadata

**Analog search scope:** `src/agent/renderer`, `src/renderer/panels`, `src/shared`, `src/preload`, `src/main/ipc`, `src/main/flashquery`, `src/renderer/lib`, `e2e`  
**Files scanned:** 70+ via `rg --files`, with 14 key files read/excerpted  
**Pattern extraction date:** 2026-06-04

## PATTERN MAPPING COMPLETE

**Phase:** 20 - Pi `@` Mentions and Clipboard Utilities  
**Files classified:** 14  
**Analogs found:** 14 / 14

### Coverage
- Files with exact analog: 13
- Files with role-match analog: 1
- Files with no analog: 0

### Key Patterns Identified
- Pi composer popovers use `AgentChatInput` local transient state, keyboard handling, and existing canvas-node portal positioning.
- FlashQuery renderer requests use typed preload APIs, workspace status listeners, request-id stale response guards, and safe empty/disconnected fallbacks.
- Copy utilities use native context menu selection through `window.electronAPI.showContextMenu` and renderer clipboard writes via `navigator.clipboard.writeText`.
- Tests mock `window.electronAPI`, seed Zustand stores directly, assert exact menu arrays, and use the FlashQuery E2E stub plus `window.__cateE2E` helpers for deterministic workflows.

### File Created
`.planning/phases/20-pi-mentions-and-clipboard-utilities/20-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Planner can now reference analog patterns in PLAN.md files.
