// =============================================================================
// App Store — Zustand state for workspaces and panel management.
// Workspace metadata is delegated to the main process (source of truth).
// Canvas/panel state remains local to each renderer window.
// =============================================================================

import { create } from 'zustand'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { shallow } from 'zustand/shallow'
import log from '../lib/logger'
import type {
  WorkspaceState,
  WorkspaceInfo,
  FlashQueryConnection,
  WorkspaceMutationResult,
  PanelState,
  PanelType,
  Point,
  DockZonePosition,
  DockDropTarget,
  DockStateSnapshot,
  WorktreeMeta,
} from '../../shared/types'
import { PANEL_MINIMUM_SIZES, ZOOM_DEFAULT, ALL_ZONES, sanitizeFlashQueryConnection } from '../../shared/types'
import { ACCENT_COLORS } from '../../shared/colors'
import type { CanvasNodeId, CanvasNodeState, CanvasRegion } from '../../shared/types'
import type { StoreApi } from 'zustand'
import type { CanvasStore } from './canvasStore'
import { shouldPreserveExistingCanvas } from './canvasSyncGuard'
import { terminalRegistry } from '../lib/terminalRegistry'
import { useDockStore } from './dockStore'
import { createCanvasOps } from '../lib/canvasBridge'
import { getAllCanvasStores, getOrCreateCanvasStoreForPanel, releaseCanvasStoreForPanel } from './canvasStore'
import { buildVaultUri, parseVaultUri } from '../../shared/flashqueryUri'
import { findNodeDockStore } from '../panels/nodeDockRegistry'

// -----------------------------------------------------------------------------
// Canvas operations callback — injected at init to decouple from canvasStore
// -----------------------------------------------------------------------------

export interface CanvasOperations {
  addNodeAndFocus: (panelId: string, panelType: PanelType, position?: Point) => void
  removeNodeForPanel: (panelId: string) => void
  loadWorkspaceCanvas: (
    nodes: Record<CanvasNodeId, CanvasNodeState>,
    viewportOffset: Point,
    zoomLevel: number,
    focusedNodeId: CanvasNodeId | null,
    regions?: Record<string, CanvasRegion>,
  ) => void
  syncCanvasSnapshot: () => {
    nodes: Record<CanvasNodeId, CanvasNodeState>
    regions: Record<string, CanvasRegion>
    viewportOffset: Point
    zoomLevel: number
    focusedNodeId: CanvasNodeId | null
  }
  clearAllNodes: () => void
  focusPanelNode: (panelId: string) => void
  /** Access the underlying store API (needed by session restore) */
  storeApi: StoreApi<CanvasStore>
}

let canvasOps: CanvasOperations | null = null
export function setCanvasOperations(ops: CanvasOperations) { canvasOps = ops }
export function getCanvasOperations(): CanvasOperations | null { return canvasOps }

// Registry for multi-canvas support — maps canvas panel IDs to their operations
const canvasOpsRegistry = new Map<string, CanvasOperations>()
let activeCanvasPanelId: string | null = null

export function registerCanvasOps(canvasPanelId: string, ops: CanvasOperations) {
  canvasOpsRegistry.set(canvasPanelId, ops)
}
export function getCanvasOpsById(canvasPanelId: string): CanvasOperations | null {
  return canvasOpsRegistry.get(canvasPanelId) ?? null
}
export function ensureCanvasOpsForPanel(canvasPanelId: string): CanvasOperations {
  const existing = canvasOpsRegistry.get(canvasPanelId)
  if (existing) return existing
  const ops = createCanvasOps(getOrCreateCanvasStoreForPanel(canvasPanelId))
  canvasOpsRegistry.set(canvasPanelId, ops)
  return ops
}
export function unregisterCanvasOps(canvasPanelId: string) {
  canvasOpsRegistry.delete(canvasPanelId)
  if (activeCanvasPanelId === canvasPanelId) activeCanvasPanelId = null
}
export function setActiveCanvasPanelId(canvasPanelId: string) {
  activeCanvasPanelId = canvasPanelId
}

/** Returns the CanvasOperations for the currently active canvas, falling back to the primary */
function getActiveCanvasOps(): CanvasOperations | null {
  if (activeCanvasPanelId) {
    const ops = canvasOpsRegistry.get(activeCanvasPanelId)
    if (ops) return ops
  }
  return canvasOps
}
import { deferredSnapshots, restoreDeferredWorkspace } from '../lib/session'

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function generateId(): string {
  return crypto.randomUUID()
}

/** Workspace accent colors — re-exported from the shared accent palette. */
export const WORKSPACE_COLORS = ACCENT_COLORS

function createDefaultWorkspace(
  name?: string,
  rootPath?: string,
  flashqueryConnection?: FlashQueryConnection,
  id?: string,
): WorkspaceState {
  return {
    id: id ?? generateId(),
    name: name ?? 'Workspace',
    color: '',
    rootPath: rootPath ?? '',
    flashqueryConnection: sanitizeFlashQueryConnection(flashqueryConnection),
    rootPathError: null,
    isRootPathPending: false,
    panels: {},
    canvasNodes: {},
    regions: {},
    zoomLevel: ZOOM_DEFAULT,
    viewportOffset: { x: 0, y: 0 },
    focusedNodeId: null,
  }
}

function collectDockPanelIds(
  node: import('../../shared/types').DockLayoutNode | null | undefined,
  out: Set<string>,
): void {
  if (!node) return
  if (node.type === 'tabs') {
    for (const panelId of node.panelIds) out.add(panelId)
    return
  }
  for (const child of node.children) collectDockPanelIds(child, out)
}

export function getWorkspaceCanvasPanelId(workspaceId: string): string | null {
  const state = useAppStore.getState()
  const ws = state.workspaces.find((candidate) => candidate.id === workspaceId)
  if (!ws) return null

  const dockSnapshot = workspaceId === state.selectedWorkspaceId
    ? useDockStore.getState().getSnapshot()
    : ws.dockState

  if (dockSnapshot) {
    const panelIds = new Set<string>()
    collectDockPanelIds(dockSnapshot.zones.center.layout, panelIds)
    for (const panelId of panelIds) {
      if (ws.panels[panelId]?.type === 'canvas') return panelId
    }
    for (const zoneName of ALL_ZONES) {
      collectDockPanelIds(dockSnapshot.zones[zoneName].layout, panelIds)
    }
    for (const panelId of panelIds) {
      if (ws.panels[panelId]?.type === 'canvas') return panelId
    }
  }

  const fallback = Object.values(ws.panels).find((panel) => panel.type === 'canvas')
  return fallback?.id ?? null
}

export function getWorkspaceCanvasStore(workspaceId: string): StoreApi<CanvasStore> | null {
  const panelId = getWorkspaceCanvasPanelId(workspaceId)
  if (panelId) return ensureCanvasOpsForPanel(panelId).storeApi
  return canvasOps?.storeApi ?? null
}

// -----------------------------------------------------------------------------
// Main-process sync helpers (fire-and-forget — local state is optimistic)
// -----------------------------------------------------------------------------

// Serialize workspace mutations so main-process state can't diverge from
// renderer state when multiple updates fire in quick succession (the previous
// fire-and-forget approach allowed them to land out of order).
let workspaceSyncQueue: Promise<unknown> = Promise.resolve()
function enqueueWorkspaceSync<T>(label: string, fn: () => Promise<T>): Promise<T | undefined> {
  let resultPromise: Promise<T | undefined>
  workspaceSyncQueue = workspaceSyncQueue
    .then(fn, fn)
    .catch((err) => log.warn(`[workspace-sync] ${label} failed:`, err))
  resultPromise = workspaceSyncQueue as Promise<T | undefined>
  return resultPromise
}

// Callers that need to invoke main-process IPC depending on a workspace's
// rootPath (e.g. terminal:create with cwd=rootPath) must await this first.
// Otherwise the IPC can race a pending workspace:create / workspace:update and
// fail validation with "outside allowed directories" because the new root
// hasn't been registered in allowedRoots yet.
export function awaitWorkspaceSync(): Promise<void> {
  return workspaceSyncQueue.then(() => undefined, () => undefined)
}

function applyWorkspaceInfo(ws: WorkspaceState, info: WorkspaceInfo): WorkspaceState {
  return {
    ...ws,
    id: info.id,
    name: info.name,
    color: info.color,
    rootPath: info.rootPath,
    flashqueryConnection: sanitizeFlashQueryConnection(info.flashqueryConnection),
    rootPathError: null,
    isRootPathPending: false,
  }
}

function sameFlashQueryConnection(a: unknown, b: unknown): boolean {
  return JSON.stringify(sanitizeFlashQueryConnection(a) ?? null) === JSON.stringify(sanitizeFlashQueryConnection(b) ?? null)
}

function syncCreateToMain(ws: WorkspaceState): Promise<WorkspaceMutationResult | undefined> {
  return enqueueWorkspaceSync('Create', () =>
    window.electronAPI.workspaceCreate({
      name: ws.name,
      rootPath: ws.rootPath,
      id: ws.id,
      flashqueryConnection: ws.flashqueryConnection
        ? { ...ws.flashqueryConnection, preserveExistingToken: true }
        : undefined,
    }),
  )
}

function syncUpdateToMain(id: string, changes: Partial<Omit<WorkspaceInfo, 'id'>>): Promise<WorkspaceMutationResult | undefined> {
  return enqueueWorkspaceSync('Update', () => window.electronAPI.workspaceUpdate(id, changes))
}

function syncRemoveFromMain(id: string): void {
  void enqueueWorkspaceSync('Remove', () => window.electronAPI.workspaceRemove(id))
}

// -----------------------------------------------------------------------------
// Panel placement — specifies where a newly created panel should go
// -----------------------------------------------------------------------------

export type PanelPlacement =
  | { target: 'canvas'; position?: Point }
  | { target: 'dock'; zone: DockZonePosition }
  | { target: 'auto' } // default: canvas
  /** No global routing — caller (e.g. canvas-node mini-dock) will place the
   *  panel itself into a private DockStore. The panel is added to the
   *  workspace.panels record only. */
  | { target: 'none' }

const CANVAS_OUTLINE_SPLIT_RATIOS: [number, number] = [2 / 3, 1 / 3]

// -----------------------------------------------------------------------------
// Worktree colors — fixed palette assigned round-robin to new worktrees.
// Picked to be visually distinct in both light and dark themes.
// -----------------------------------------------------------------------------

export const WORKTREE_COLOR_PALETTE: string[] = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#ef4444', // red
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function pickWorktreeColor(existing: { color: string }[]): string {
  const used = new Set(existing.map((w) => w.color))
  for (const c of WORKTREE_COLOR_PALETTE) if (!used.has(c)) return c
  // Wrap around if more worktrees than palette entries.
  return WORKTREE_COLOR_PALETTE[existing.length % WORKTREE_COLOR_PALETTE.length]
}

/** A fully-reset dock layout: all side zones hidden, an empty visible center.
 *  Used whenever we need to clear a workspace's dock so panels from a previous
 *  workspace can't bleed through (workspace switch, removal, closeAllPanels). */
function createCleanDockSnapshot(): DockStateSnapshot {
  return {
    zones: {
      left: { position: 'left', visible: false, size: 260, layout: null },
      right: { position: 'right', visible: false, size: 260, layout: null },
      bottom: { position: 'bottom', visible: false, size: 240, layout: null },
      center: { position: 'center', visible: true, size: 0, layout: null },
    },
    locations: {},
  }
}

// -----------------------------------------------------------------------------
// Store interface
// -----------------------------------------------------------------------------

interface AppStoreState {
  workspaces: WorkspaceState[]
  selectedWorkspaceId: string
}

interface AppStoreActions {
  // Workspace management
  addWorkspace: (name?: string, rootPath?: string, flashqueryConnection?: FlashQueryConnection, id?: string) => string
  selectWorkspace: (id: string) => Promise<void>
  removeWorkspace: (id: string) => void

  // Panel creation — each adds a PanelState to the workspace AND places it
  createTerminal: (workspaceId: string, initialInput?: string, position?: Point, placement?: PanelPlacement, cwd?: string) => string
  createBrowser: (workspaceId: string, url?: string, position?: Point, placement?: PanelPlacement) => string
  createEditor: (workspaceId: string, filePath?: string, position?: Point, placement?: PanelPlacement) => string
  openFlashQueryFrontmatterEditor: (workspaceId: string, sourcePanelId: string) => string | null
  openFlashQueryFrontmatterForPath: (workspaceId: string, vaultPath: string) => string | null
  createDiffEditor: (workspaceId: string, filePath: string, diffMode: 'staged' | 'working', position?: Point, placement?: PanelPlacement) => string
  createGit: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
  createFileExplorer: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
  createFlashQueryVault: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
  createFlashQueryVaultSearch: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
  createOutline: (workspaceId: string, position?: Point, placement?: PanelPlacement, sourceEditorPanelId?: string, sourceCanvasNodeId?: string) => string
  createSemanticConnections: (workspaceId: string, position?: Point, placement?: PanelPlacement, sourceEditorPanelId?: string, sourceCanvasNodeId?: string) => string
  createProjectList: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
  createCanvas: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
  createAgent: (workspaceId: string, position?: Point, placement?: PanelPlacement) => string
  createDocument: (workspaceId: string, filePath?: string, documentType?: 'pdf' | 'docx' | 'image', position?: Point, placement?: PanelPlacement, inlineDataUrl?: string) => string

  // Ensure the center dock zone contains a canvas panel for the given workspace.
  // Covers session-restore and new-workspace paths where the center layout may
  // exist but reference no canvas-type panel (→ blank center pane bug).
  ensureCenterCanvas: (workspaceId: string) => void

  // Panel management
  closePanel: (workspaceId: string, panelId: string) => void
  focusPanel: (workspaceId: string, panelId: string) => boolean
  focusAssociatedSidebars: (workspaceId: string, sourceEditorPanelId: string) => void
  updatePanelTitle: (workspaceId: string, panelId: string, title: string) => void
  /** Apply a title that came from the running process (xterm OSC 0/1/2). Skips
   *  the update if the user has manually renamed the tab. */
  updatePanelTitleFromAgent: (workspaceId: string, panelId: string, title: string) => void
  /** User-initiated rename. Marks the panel as user-overridden so OSC updates
   *  no longer fight the chosen name. */
  renamePanelByUser: (workspaceId: string, panelId: string, title: string) => void
  updatePanelUrl: (workspaceId: string, panelId: string, url: string) => void
  updatePanelFilePath: (workspaceId: string, panelId: string, filePath: string) => void
  setPanelDirty: (workspaceId: string, panelId: string, dirty: boolean) => void
  setPanelMarkdownPreview: (workspaceId: string, panelId: string, preview: boolean) => void
  setPanelUnsavedContent: (workspaceId: string, panelId: string, content: string | undefined) => void
  addPanel: (workspaceId: string, panel: PanelState) => void

  // Helpers
  getWorkspace: (id: string) => WorkspaceState | undefined
  selectedWorkspace: () => WorkspaceState | undefined

  // Sync canvas state snapshot back into workspace (call before switching)
  syncCanvasToWorkspace: (workspaceId: string) => void

  // Workspace operations
  setWorkspaceRootPath: (wsId: string, rootPath: string) => Promise<boolean>
  setWorkspaceColor: (wsId: string, color: string) => void
  renameWorkspace: (wsId: string, name: string) => void
  duplicateWorkspace: (wsId: string) => string
  closeAllPanels: (wsId: string) => void
  reorderWorkspaces: (fromIndex: number, toIndex: number) => void
  addAdditionalRoot: (wsId: string, rootPath: string) => void
  removeAdditionalRoot: (wsId: string, rootPath: string) => void

  // Parallel Work (git worktrees) — see ParallelWorkTab.tsx
  ensurePrimaryWorktree: (wsId: string) => void
  upsertWorktree: (wsId: string, wt: WorktreeMeta) => void
  removeWorktree: (wsId: string, worktreeId: string) => void
  setWorktreeColor: (wsId: string, worktreeId: string, color: string) => void
  setWorktreeLabel: (wsId: string, worktreeId: string, label: string | undefined) => void
  setPanelWorktreeId: (wsId: string, panelId: string, worktreeId: string | undefined) => void

  // Cross-window sync: merge metadata from main-process broadcast
  mergeWorkspaceInfos: (infos: WorkspaceInfo[]) => void
}

export type AppStore = AppStoreState & AppStoreActions

// -----------------------------------------------------------------------------
// Store
// -----------------------------------------------------------------------------

/** Place a panel based on placement target. Returns true if handled (dock), false if canvas (default). */
function placePanel(
  panelId: string,
  panelType: PanelType,
  placement: PanelPlacement | undefined,
  position: Point | undefined,
  isActiveWorkspace: boolean,
): void {
  // No-op: caller is placing the panel itself into a private DockStore.
  if (placement?.target === 'none') return
  // Canvas panels go to the center dock zone, not onto a canvas as a node
  if (panelType === 'canvas') {
    useDockStore.getState().dockPanel(panelId, 'center')
    return
  }
  if (placement?.target === 'dock') {
    if (placement.zone === 'left' || placement.zone === 'right') {
      const minimum = PANEL_MINIMUM_SIZES[panelType]?.width
      const current = useDockStore.getState().zones[placement.zone].size
      if (minimum && current < minimum) useDockStore.getState().setZoneSize(placement.zone, minimum)
    } else if (placement.zone === 'bottom') {
      const minimum = PANEL_MINIMUM_SIZES[panelType]?.height
      const current = useDockStore.getState().zones.bottom.size
      if (minimum && current < minimum) useDockStore.getState().setZoneSize('bottom', minimum)
    }
    useDockStore.getState().dockPanel(panelId, placement.zone)
    return
  }
  // Default: place on canvas (target === 'canvas' or 'auto' or undefined)
  if (isActiveWorkspace) {
    const canvasPosition = placement?.target === 'canvas' ? placement.position ?? position : position
    const ops = getActiveCanvasOps()
    ops?.addNodeAndFocus(panelId, panelType, canvasPosition)
  }
}

type AppSet = StoreApi<AppStore>['setState']
type AppGet = StoreApi<AppStore>['getState']

/** Add a freshly-built panel to a workspace, then route it to its canvas/dock
 *  location. On placement failure the panel is rolled back out of the workspace
 *  so no orphaned entry lingers. Shared by every create* action. */
function addAndPlacePanel(
  set: AppSet,
  get: AppGet,
  workspaceId: string,
  panel: PanelState,
  placement: PanelPlacement | undefined,
  position: Point | undefined,
): string {
  set((state) => ({
    workspaces: state.workspaces.map((ws) =>
      ws.id === workspaceId
        ? { ...ws, panels: { ...ws.panels, [panel.id]: panel } }
        : ws,
    ),
  }))
  try {
    placePanel(panel.id, panel.type, placement, position, workspaceId === get().selectedWorkspaceId)
  } catch (error) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspaceId
          ? { ...ws, panels: Object.fromEntries(
              Object.entries(ws.panels).filter(([id]) => id !== panel.id)
            )}
          : ws,
      ),
    }))
    log.error(`Failed to place ${panel.type} panel:`, error)
    return null as unknown as string
  }
  return panel.id
}

function frontmatterTitleFor(filePath: string): string {
  const parsed = parseVaultUri(filePath)
  const sourcePath = parsed?.vaultPath ?? filePath
  const fileName = sourcePath.split(/[\\/]/).pop() || 'Untitled'
  return `${fileName} Frontmatter`
}

function activeCanvasNodeOffset(workspaceId: string, sourcePanelId: string): Point | undefined {
  const canvasStore = getWorkspaceCanvasStore(workspaceId)
  const state = canvasStore?.getState()
  const nodeId = state?.nodeForPanel(sourcePanelId)
  const node = nodeId ? state?.nodes[nodeId] : undefined
  if (!node) return undefined
  return {
    x: node.origin.x + node.size.width + 40,
    y: node.origin.y,
  }
}

function findCanvasNodeForPanel(
  workspaceId: string,
  panelId: string,
): { canvasStore: StoreApi<CanvasStore>; nodeId: string; node: CanvasNodeState } | null {
  const canvasStore = getWorkspaceCanvasStore(workspaceId)
  if (typeof canvasStore?.getState !== 'function') return null
  const state = canvasStore?.getState()
  const nodeId = state?.nodeForPanel(panelId)
  const node = nodeId ? state?.nodes[nodeId] : undefined
  return canvasStore && nodeId && node ? { canvasStore, nodeId, node } : null
}

function findCanvasNodeById(
  workspaceId: string,
  nodeId: string | undefined,
): { canvasStore: StoreApi<CanvasStore>; nodeId: string; node: CanvasNodeState } | null {
  if (!nodeId) return null

  const preferredCanvasStore = getWorkspaceCanvasStore(workspaceId)
  const preferredNode = preferredCanvasStore?.getState().nodes[nodeId]
  if (preferredCanvasStore && preferredNode) {
    return { canvasStore: preferredCanvasStore, nodeId, node: preferredNode }
  }

  for (const canvasStore of getAllCanvasStores()) {
    const node = canvasStore.getState().nodes[nodeId]
    if (node) return { canvasStore, nodeId, node }
  }
  return null
}

function replaceStackInLayout(
  node: import('../../shared/types').DockLayoutNode,
  stackId: string,
  replacement: import('../../shared/types').DockLayoutNode,
): import('../../shared/types').DockLayoutNode {
  if (node.type === 'tabs') return node.id === stackId ? replacement : node
  return {
    ...node,
    children: node.children.map((child) => replaceStackInLayout(child, stackId, replacement)),
  }
}

function layoutWithPanelTabbedAfter(
  layout: import('../../shared/types').DockLayoutNode | null | undefined,
  sourcePanelId: string,
  panelId: string,
): import('../../shared/types').DockLayoutNode {
  const fallbackStackId = generateId()
  if (!layout) {
    return {
      type: 'tabs',
      id: fallbackStackId,
      panelIds: [sourcePanelId, panelId],
      activeIndex: 1,
    }
  }

  const sourceStack = findStackContainingPanel(layout, sourcePanelId)
  if (!sourceStack) {
    return {
      type: 'tabs',
      id: fallbackStackId,
      panelIds: [sourcePanelId, panelId],
      activeIndex: 1,
    }
  }

  const sourceIndex = sourceStack.panelIds.indexOf(sourcePanelId)
  const panelIds = sourceStack.panelIds.filter((id) => id !== panelId)
  const insertIndex = sourceIndex >= 0 ? sourceIndex + 1 : panelIds.length
  panelIds.splice(insertIndex, 0, panelId)

  return replaceStackInLayout(layout, sourceStack.id, {
    ...sourceStack,
    panelIds,
    activeIndex: insertIndex,
  })
}

function layoutWithPanelSplitRight(
  layout: import('../../shared/types').DockLayoutNode | null | undefined,
  sourcePanelId: string,
  panelId: string,
): import('../../shared/types').DockLayoutNode {
  const newStack: import('../../shared/types').DockTabStack = {
    type: 'tabs',
    id: generateId(),
    panelIds: [panelId],
    activeIndex: 0,
  }

  if (!layout) {
    return {
      type: 'split',
      id: generateId(),
      direction: 'horizontal',
      children: [{
        type: 'tabs',
        id: generateId(),
        panelIds: [sourcePanelId],
        activeIndex: 0,
      }, newStack],
      ratios: CANVAS_OUTLINE_SPLIT_RATIOS,
    }
  }

  const sourceStack = findStackContainingPanel(layout, sourcePanelId)
  if (!sourceStack) return layoutWithPanelTabbedAfter(layout, sourcePanelId, panelId)

  const existingPanelIds = sourceStack.panelIds.filter((id) => id !== panelId)
  const sourceIndex = existingPanelIds.indexOf(sourcePanelId)
  const sourceOnlyStack: import('../../shared/types').DockTabStack = {
    ...sourceStack,
    panelIds: existingPanelIds,
    activeIndex: sourceIndex >= 0 ? sourceIndex : Math.min(sourceStack.activeIndex, existingPanelIds.length - 1),
  }
  const splitNode: import('../../shared/types').DockSplitNode = {
    type: 'split',
    id: generateId(),
    direction: 'horizontal',
    children: [sourceOnlyStack, newStack],
    ratios: CANVAS_OUTLINE_SPLIT_RATIOS,
  }
  return replaceStackInLayout(layout, sourceStack.id, splitNode)
}

function activatePanelInLayout(
  layout: import('../../shared/types').DockLayoutNode | null | undefined,
  panelId: string,
): import('../../shared/types').DockLayoutNode | null | undefined {
  if (!layout) return layout
  const stack = findStackContainingPanel(layout, panelId)
  const index = stack?.panelIds.indexOf(panelId) ?? -1
  if (!stack || index < 0) return layout
  return replaceStackInLayout(layout, stack.id, { ...stack, activeIndex: index })
}

function placePanelInCanvasNode(
  workspaceId: string,
  sourcePanelId: string,
  panelId: string,
  mode: 'tab' | 'split-right' = 'tab',
  sourceCanvasNodeId?: string,
): boolean {
  const target = findCanvasNodeById(workspaceId, sourceCanvasNodeId)
    ?? findCanvasNodeForPanel(workspaceId, sourcePanelId)
  if (!target) return false

  const liveDockStore = findNodeDockStore(target.nodeId)
  if (liveDockStore) {
    const layout = liveDockStore.getState().zones.center.layout
    const sourceStack = findStackContainingPanel(layout, sourcePanelId)
    const sourceIndex = sourceStack?.panelIds.indexOf(sourcePanelId) ?? -1
    if (sourceStack) {
      const dockTarget: DockDropTarget = mode === 'split-right'
        ? {
            type: 'split',
            stackId: sourceStack.id,
            edge: 'right',
            ratios: CANVAS_OUTLINE_SPLIT_RATIOS,
          }
        : {
            type: 'tab',
            stackId: sourceStack.id,
            index: sourceIndex >= 0 ? sourceIndex + 1 : undefined,
          }
      liveDockStore.getState().dockPanel(panelId, 'center', dockTarget)
    } else {
      liveDockStore.getState().dockPanel(panelId, 'center')
    }
    target.canvasStore.getState().setNodeDockLayout(
      target.nodeId,
      liveDockStore.getState().zones.center.layout,
    )
  } else {
    target.canvasStore.getState().setNodeDockLayout(
      target.nodeId,
      mode === 'split-right'
        ? layoutWithPanelSplitRight(target.node.dockLayout, sourcePanelId, panelId)
        : layoutWithPanelTabbedAfter(target.node.dockLayout, sourcePanelId, panelId),
    )
  }

  target.canvasStore.getState().focusNode(target.nodeId)
  return true
}

function focusExistingPanel(workspaceId: string, panelId: string): boolean {
  const dockLocation = useDockStore.getState().panelLocations[panelId]
  if (dockLocation?.type === 'dock') {
    const snapshot = useDockStore.getState().getSnapshot()
    const layout = snapshot.zones[dockLocation.zone].layout
    const stack = findStackContainingPanel(layout, panelId)
    const index = stack?.panelIds.indexOf(panelId) ?? -1
    if (index >= 0) useDockStore.getState().setActiveTab(stack!.id, index)
    return index >= 0
  }
  const target = findCanvasNodeForPanel(workspaceId, panelId)
  if (target) {
    const liveDockStore = findNodeDockStore(target.nodeId)
    if (liveDockStore) {
      const layout = liveDockStore.getState().zones.center.layout
      const stack = findStackContainingPanel(layout, panelId)
      const index = stack?.panelIds.indexOf(panelId) ?? -1
      if (stack && index >= 0) liveDockStore.getState().setActiveTab(stack.id, index)
    } else {
      const nextLayout = activatePanelInLayout(target.node.dockLayout, panelId)
      if (nextLayout && nextLayout !== target.node.dockLayout) {
        target.canvasStore.getState().setNodeDockLayout(target.nodeId, nextLayout)
      }
    }
    target.canvasStore.getState().focusNode(target.nodeId)
    return true
  }
  if (workspaceId === useAppStore.getState().selectedWorkspaceId) {
    getActiveCanvasOps()?.focusPanelNode(panelId)
  }
  return false
}

function findStackContainingPanel(
  node: import('../../shared/types').DockLayoutNode | null | undefined,
  panelId: string,
): import('../../shared/types').DockTabStack | null {
  if (!node) return null
  if (node.type === 'tabs') return node.panelIds.includes(panelId) ? node : null
  for (const child of node.children) {
    const found = findStackContainingPanel(child, panelId)
    if (found) return found
  }
  return null
}

function activePanelIdInLayout(
  node: import('../../shared/types').DockLayoutNode | null | undefined,
): string | null {
  if (!node) return null
  if (node.type === 'tabs') return node.panelIds[node.activeIndex] ?? null
  for (const child of node.children) {
    const panelId = activePanelIdInLayout(child)
    if (panelId) return panelId
  }
  return null
}

function associatedDerivedPanelIds(ws: WorkspaceState | undefined, sourcePanelId: string): string[] {
  if (!ws) return []
  return Object.values(ws.panels)
    .filter((panel) =>
      (panel.type === 'outline' || panel.type === 'semantic-connections') &&
      panel.sourceEditorPanelId === sourcePanelId
    )
    .map((panel) => panel.id)
}

/** Apply an update to a single panel within a workspace. No-ops if the
 *  workspace or panel is missing, or if `update` returns the same panel
 *  reference (lets callers bail out without mutating). Shared by every
 *  panel-field setter. */
function setPanelField(
  set: AppSet,
  workspaceId: string,
  panelId: string,
  update: (panel: PanelState) => PanelState,
): void {
  set((state) => ({
    workspaces: state.workspaces.map((ws) => {
      if (ws.id !== workspaceId) return ws
      const panel = ws.panels[panelId]
      if (!panel) return ws
      const next = update(panel)
      if (next === panel) return ws
      return { ...ws, panels: { ...ws.panels, [panelId]: next } }
    }),
  }))
}

export const useAppStore = create<AppStore>((set, get) => ({
  // --- State ---
  // Start empty — a default workspace is created during init only if no session is restored.
  workspaces: [],
  selectedWorkspaceId: '',

  // --- Workspace management ---

  addWorkspace(name?, rootPath?, flashqueryConnection?, id?) {
    // Reusing a stable id (session restore) must not be blocked by the cap and
    // must never create a second entry for an id that already exists — both
    // would resurrect the "duplicate workspaces on reload" bug.
    if (id) {
      const existing = get().workspaces.find((w) => w.id === id)
      if (existing) return existing.id
    }
    const existingCount = get().workspaces.length
    if (!id && existingCount >= 10) {
      // Cap at 10 workspaces — no-op, return current selection
      return get().selectedWorkspaceId || get().workspaces[0]?.id || ''
    }
    const ws = createDefaultWorkspace(name, rootPath, flashqueryConnection, id)
    const isFirst = existingCount === 0

    // Note: the new workspace starts with an empty panels map. selectWorkspace
    // will reset the dock and the safety-net createCanvas will mint a fresh
    // canvas panel for the center zone. Copying panels from another workspace
    // here led to orphaned/duplicate canvas panels and the "empty pane" bug.

    set((state) => ({
      workspaces: [...state.workspaces, ws],
      // Auto-select if this is the first workspace
      selectedWorkspaceId: state.workspaces.length === 0 ? ws.id : state.selectedWorkspaceId,
    }))
    // When auto-selected as the first workspace, load its (empty) canvas
    if (isFirst) {
      canvasOps?.loadWorkspaceCanvas(
        ws.canvasNodes,
        ws.viewportOffset,
        ws.zoomLevel,
        ws.focusedNodeId,
        ws.regions,
      )
    }
    // Sync to main process
    void syncCreateToMain(ws).then((result) => {
      if (!result?.ok) {
        log.warn('[workspace-sync] Create rejected:', result?.error?.message)
        return
      }
      set((state) => ({
        workspaces: state.workspaces.map((candidate) => (
          candidate.id === ws.id ? applyWorkspaceInfo(candidate, result.workspace) : candidate
        )),
      }))
    })
    return ws.id
  },

  async selectWorkspace(id) {
    const state = get()
    if (state.selectedWorkspaceId === id) return

    // Snapshot current canvas state back into the outgoing workspace
    get().syncCanvasToWorkspace(state.selectedWorkspaceId)

    // Discard outgoing workspace if it was never initialized (no folder
    // picked, not currently picking one). Keeps stray "Add Workspace" rows
    // from accumulating in the sidebar.
    const outgoing = state.workspaces.find((w) => w.id === state.selectedWorkspaceId)
    const shouldDropOutgoing =
      !!outgoing && !outgoing.rootPath && !outgoing.isRootPathPending && outgoing.id !== id

    // Switch selection
    set({ selectedWorkspaceId: id })

    if (shouldDropOutgoing && outgoing) {
      get().removeWorkspace(outgoing.id)
    }

    // Load the new workspace's canvas state into the canvas store
    const ws = get().workspaces.find((w) => w.id === id)
    if (ws) {
      const canvasPanelId = getWorkspaceCanvasPanelId(id)
      if (canvasPanelId) setActiveCanvasPanelId(canvasPanelId)
      try {
        getWorkspaceCanvasStore(id)?.getState().loadWorkspaceCanvas(
          ws.canvasNodes,
          ws.viewportOffset,
          ws.zoomLevel,
          ws.focusedNodeId,
          ws.regions,
        )
      } catch (error) {
        log.error('Failed to load canvas for workspace:', error)
      }

      // Restore dock state for the incoming workspace.
      // If the workspace has saved dock state, restore it. Otherwise reset
      // the dock to a clean state so panels from the previous workspace
      // don't bleed through. Preserve the center zone (shared canvas panel).
      try {
        if (ws.dockState) {
          useDockStore.getState().restoreSnapshot(ws.dockState)
        } else {
          // Brand new workspace — fully reset dock so leftover splits/panels
          // from the previously selected workspace don't bleed through. The
          // safety net below will create a fresh canvas panel for the center.
          useDockStore.getState().restoreSnapshot(createCleanDockSnapshot())
        }
      } catch (error) {
        log.error('Failed to restore dock state for workspace:', error)
      }

      // Check for deferred restore (lazy workspace loading)
      try {
        if (deferredSnapshots.has(id)) {
          await restoreDeferredWorkspace(id, canvasOps?.storeApi)
        }
      } catch (error) {
        log.error('Failed to restore deferred workspace:', error)
      }

      // Ensure the center dock zone has a canvas panel — covers the case where
      // a brand new workspace was created before any canvas panel existed yet,
      // or where a restored dock layout references no canvas-type panel.
      get().ensureCenterCanvas(id)

      // ensureCenterCanvas may have just minted a brand-new canvas panel (empty
      // or freshly created workspace). Its store can momentarily alias the
      // legacy singleton, which still holds the previous workspace's nodes — so
      // the freshly mounted CanvasPanel briefly renders a stale node before it
      // settles, visible as an empty note blinking in then vanishing. Re-resolve
      // the now-authoritative canvas store and load this workspace's state into
      // it to clear any leftover nodes immediately.
      const finalCanvasPanelId = getWorkspaceCanvasPanelId(id)
      if (finalCanvasPanelId && finalCanvasPanelId !== canvasPanelId) {
        setActiveCanvasPanelId(finalCanvasPanelId)
        const wsFinal = get().workspaces.find((w) => w.id === id)
        if (wsFinal) {
          try {
            getWorkspaceCanvasStore(id)?.getState().loadWorkspaceCanvas(
              wsFinal.canvasNodes,
              wsFinal.viewportOffset,
              wsFinal.zoomLevel,
              wsFinal.focusedNodeId,
              wsFinal.regions,
            )
          } catch (error) {
            log.error('Failed to load canvas for workspace:', error)
          }
        }
      }
    }
  },

  ensureCenterCanvas(workspaceId) {
    const ws = get().workspaces.find((w) => w.id === workspaceId)
    if (!ws) return
    const dockState = useDockStore.getState()

    // Collect panel IDs referenced by any dock zone
    const walk = (
      node: import('../../shared/types').DockLayoutNode,
      out: Set<string>,
    ) => {
      if (node.type === 'tabs') node.panelIds.forEach((id) => out.add(id))
      else node.children.forEach((c) => walk(c, out))
    }
    const allDockPanelIds = new Set<string>()
    for (const zoneName of ALL_ZONES) {
      const zone = dockState.zones[zoneName]
      if (zone.layout) walk(zone.layout, allDockPanelIds)
    }

    // Sweep orphaned canvas panels (in ws.panels but not in any dock zone).
    // These accumulate when session restore or dock resets leave stale
    // canvas entries behind — the sidebar would then show phantom canvases.
    const orphanedCanvasIds = Object.values(ws.panels)
      .filter((p) => p.type === 'canvas' && !allDockPanelIds.has(p.id))
      .map((p) => p.id)

    if (orphanedCanvasIds.length > 0) {
      for (const id of orphanedCanvasIds) {
        try { releaseCanvasStoreForPanel(id) } catch { /* ignore */ }
      }
      set((state) => ({
        workspaces: state.workspaces.map((w) => {
          if (w.id !== workspaceId) return w
          const panels = { ...w.panels }
          for (const id of orphanedCanvasIds) delete panels[id]
          return { ...w, panels }
        }),
      }))
    }

    // Sweep orphaned dock tabs (in some dock zone but not in ws.panels). These
    // appear after a panel state was dropped without the dock layout being
    // updated — e.g. closeAllPanels wiping ws.panels, or a stale snapshot
    // restore — and render as a generic "Panel" tab with the editor icon.
    const orphanedDockIds = Array.from(allDockPanelIds).filter((id) => !ws.panels[id])
    if (orphanedDockIds.length > 0) {
      for (const id of orphanedDockIds) {
        try { useDockStore.getState().undockPanel(id) } catch { /* ignore */ }
      }
    }

    // Check if the center zone now contains a canvas-type panel
    const centerPanelIds: string[] = []
    const center = dockState.zones.center
    if (center.layout) {
      const c = new Set<string>()
      walk(center.layout, c)
      centerPanelIds.push(...c)
    }
    const wsAfter = get().workspaces.find((w) => w.id === workspaceId)
    const hasCanvas = centerPanelIds.some((pid) => wsAfter?.panels[pid]?.type === 'canvas')
    if (!hasCanvas) {
      get().createCanvas(workspaceId)
    }
  },

  removeWorkspace(id) {
    // Clean up deferred snapshot if workspace was never switched to
    deferredSnapshots.delete(id)
    // Dispose terminals before removing workspace state
    get().closeAllPanels(id)

    const wasSelected = get().selectedWorkspaceId === id

    set((state) => {
      const remaining = state.workspaces.filter((w) => w.id !== id)
      if (remaining.length === 0) {
        // Always keep at least one workspace
        const fresh = createDefaultWorkspace()
        void syncCreateToMain(fresh)
        return {
          workspaces: [fresh],
          selectedWorkspaceId: fresh.id,
        }
      }
      const newSelected =
        state.selectedWorkspaceId === id ? remaining[0].id : state.selectedWorkspaceId
      return {
        workspaces: remaining,
        selectedWorkspaceId: newSelected,
      }
    })

    // If the removed workspace was selected, load the new workspace's canvas and dock
    if (wasSelected) {
      const newWs = get().workspaces.find((w) => w.id === get().selectedWorkspaceId)
      if (newWs) {
        canvasOps?.loadWorkspaceCanvas(
          newWs.canvasNodes,
          newWs.viewportOffset,
          newWs.zoomLevel,
          newWs.focusedNodeId,
          newWs.regions,
        )
        if (newWs.dockState) {
          useDockStore.getState().restoreSnapshot(newWs.dockState)
        } else {
          // Fresh workspace (e.g. the auto-created replacement when the last
          // workspace is closed) has no dock state — reset to a clean dock so
          // panel IDs from the removed workspace don't leave an empty pane
          // behind, then mint a fresh canvas panel for the center zone.
          useDockStore.getState().restoreSnapshot(createCleanDockSnapshot())
          get().createCanvas(newWs.id)
        }
      }
    }

    // Sync to main process
    syncRemoveFromMain(id)
  },

  // --- Panel creation ---

  createTerminal(workspaceId, initialInput?, position?, placement?, cwd?) {
    const panelId = generateId()
    // Auto-number terminal titles within the workspace so `cate ask "Terminal 2"`
    // and similar inter-panel calls can address each one unambiguously. Looks
    // for the highest existing "Terminal N" name and picks N+1.
    const ws = get().workspaces.find((w) => w.id === workspaceId)
    let maxN = 0
    if (ws) {
      for (const p of Object.values(ws.panels)) {
        if (p.type !== 'terminal') continue
        const m = /^Terminal\s+(\d+)$/.exec(p.title)
        if (m) {
          const n = parseInt(m[1], 10)
          if (n > maxN) maxN = n
        }
      }
    }
    const panel: PanelState = {
      id: panelId,
      type: 'terminal',
      title: `Terminal ${maxN + 1}`,
      isDirty: false,
      ...(cwd ? { cwd } : {}),
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createBrowser(workspaceId, url?, position?, placement?) {
    const panelId = generateId()
    const panel: PanelState = {
      id: panelId,
      type: 'browser',
      title: url ?? 'Browser',
      isDirty: false,
      url: url ?? 'about:blank',
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createEditor(workspaceId, filePath?, position?, placement?) {
    const panelId = generateId()
    const sourcePath = filePath ? parseVaultUri(filePath)?.vaultPath ?? filePath : undefined
    const fileName = sourcePath ? sourcePath.split(/[\\/]/).pop() ?? 'Untitled' : 'Untitled'
    const panel: PanelState = {
      id: panelId,
      type: 'editor',
      title: fileName,
      isDirty: false,
      filePath,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  openFlashQueryFrontmatterEditor(workspaceId, sourcePanelId) {
    const ws = get().workspaces.find((workspace) => workspace.id === workspaceId)
    const sourcePanel = ws?.panels[sourcePanelId]
    if (!ws || sourcePanel?.type !== 'editor' || !sourcePanel.filePath) return null

    const parsed = parseVaultUri(sourcePanel.filePath)
    if (!parsed || parsed.part !== 'body') return null

    const frontmatterUri = buildVaultUri(parsed.workspaceId, parsed.vaultPath, 'frontmatter')
    const existing = Object.values(ws.panels).find((panel) =>
      panel.type === 'editor' && panel.filePath === frontmatterUri
    )
    if (existing) {
      const sourceCanvasTarget = findCanvasNodeForPanel(workspaceId, sourcePanelId)
      if (sourceCanvasTarget) {
        const existingDockLocation = useDockStore.getState().panelLocations[existing.id]
        if (existingDockLocation?.type === 'dock') {
          useDockStore.getState().undockPanel(existing.id)
        }
        placePanelInCanvasNode(workspaceId, sourcePanelId, existing.id)
        return existing.id
      }

      if (!focusExistingPanel(workspaceId, existing.id)) {
        const sourceLocation = useDockStore.getState().panelLocations[sourcePanelId]
        if (placePanelInCanvasNode(workspaceId, sourcePanelId, existing.id)) {
          // Prefer the visible canvas-node tab strip when the source panel is
          // mounted there, even if the global dock store still has stale panel
          // location metadata from an earlier docked placement.
        } else if (sourceLocation?.type === 'dock') {
          const snapshot = useDockStore.getState().getSnapshot()
          const sourceStack = findStackContainingPanel(snapshot.zones[sourceLocation.zone].layout, sourcePanelId)
          const sourceIndex = sourceStack?.panelIds.indexOf(sourcePanelId) ?? -1
          useDockStore.getState().dockPanel(
            existing.id,
            sourceLocation.zone,
            sourceStack
              ? {
                  type: 'tab',
                  stackId: sourceStack.id,
                  index: sourceIndex >= 0 ? sourceIndex + 1 : undefined,
              }
              : undefined,
          )
        } else {
          const placement = { target: 'canvas' as const, position: activeCanvasNodeOffset(workspaceId, sourcePanelId) }
          placePanel(existing.id, 'editor', placement, placement.position, workspaceId === get().selectedWorkspaceId)
        }
        focusExistingPanel(workspaceId, existing.id)
      }
      return existing.id
    }

    const sourceLocation = useDockStore.getState().panelLocations[sourcePanelId]
    const placement: PanelPlacement | undefined =
      sourceLocation?.type === 'dock'
        ? { target: 'dock', zone: sourceLocation.zone }
        : { target: 'canvas', position: activeCanvasNodeOffset(workspaceId, sourcePanelId) }
    const dockTarget: DockDropTarget | undefined =
      sourceLocation?.type === 'dock'
        ? { type: 'tab', stackId: sourceLocation.stackId, index: undefined }
        : undefined

    const panelId = generateId()
    const panel: PanelState = {
      id: panelId,
      type: 'editor',
      title: frontmatterTitleFor(sourcePanel.filePath),
      isDirty: false,
      filePath: frontmatterUri,
    }

    set((state) => ({
      workspaces: state.workspaces.map((workspace) =>
        workspace.id === workspaceId
          ? { ...workspace, panels: { ...workspace.panels, [panel.id]: panel } }
          : workspace,
      ),
    }))

    try {
      if (placePanelInCanvasNode(workspaceId, sourcePanelId, panelId)) {
        // Inserted into the source canvas node's private tab strip.
      } else if (sourceLocation?.type === 'dock') {
        const snapshot = useDockStore.getState().getSnapshot()
        const sourceStack = findStackContainingPanel(snapshot.zones[sourceLocation.zone].layout, sourcePanelId)
        const sourceIndex = sourceStack?.panelIds.indexOf(sourcePanelId) ?? -1
        useDockStore.getState().dockPanel(panelId, sourceLocation.zone, {
          ...(dockTarget as Extract<DockDropTarget, { type: 'tab' }>),
          index: sourceIndex >= 0 ? sourceIndex + 1 : undefined,
        })
      } else {
        placePanel(panelId, 'editor', placement, placement?.target === 'canvas' ? placement.position : undefined, workspaceId === get().selectedWorkspaceId)
      }
    } catch (error) {
      set((state) => ({
        workspaces: state.workspaces.map((workspace) => {
          if (workspace.id !== workspaceId) return workspace
          const { [panelId]: _removed, ...panels } = workspace.panels
          return { ...workspace, panels }
        }),
      }))
      log.error('Failed to place FlashQuery frontmatter panel:', error)
      return null
    }

    return panelId
  },

  openFlashQueryFrontmatterForPath(workspaceId, vaultPath) {
    const ws = get().workspaces.find((workspace) => workspace.id === workspaceId)
    if (!ws) return null

    const bodyUri = buildVaultUri(workspaceId, vaultPath, 'body')
    const legacyBodyUri = buildVaultUri(workspaceId, vaultPath)
    const bodyPanel = Object.values(ws.panels).find((panel) =>
      panel.type === 'editor'
      && (panel.filePath === bodyUri || panel.filePath === legacyBodyUri)
    )
    if (bodyPanel) return get().openFlashQueryFrontmatterEditor(workspaceId, bodyPanel.id)

    const frontmatterUri = buildVaultUri(workspaceId, vaultPath, 'frontmatter')
    const existing = Object.values(ws.panels).find((panel) =>
      panel.type === 'editor' && panel.filePath === frontmatterUri
    )
    if (existing) {
      focusExistingPanel(workspaceId, existing.id)
      return existing.id
    }

    const panelId = get().createEditor(
      workspaceId,
      frontmatterUri,
      undefined,
      { target: 'dock', zone: 'center' },
    )
    get().updatePanelTitle(workspaceId, panelId, frontmatterTitleFor(frontmatterUri))
    return panelId
  },

  createDocument(workspaceId, filePath?, documentType?, position?, placement?, inlineDataUrl?) {
    const panelId = generateId()
    const fileName = filePath ? filePath.split('/').pop() ?? 'Document' : 'Document'
    const panel: PanelState = {
      id: panelId,
      type: 'document',
      title: fileName,
      isDirty: false,
      filePath,
      documentType,
      inlineDataUrl,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createDiffEditor(workspaceId, filePath, diffMode, position?, placement?) {
    const panelId = generateId()
    const fileName = filePath.split('/').pop() ?? 'Untitled'
    const label = diffMode === 'staged' ? 'Staged' : 'Working'
    const panel: PanelState = {
      id: panelId,
      type: 'editor',
      title: `${fileName} (${label} Diff)`,
      isDirty: false,
      filePath,
      diffMode,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createGit(workspaceId, position?, placement?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'git',
      title: 'Git',
      isDirty: false,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createFileExplorer(workspaceId, position?, placement?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'fileExplorer',
      title: 'File Explorer',
      isDirty: false,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createFlashQueryVault(workspaceId, position?, placement?) {
    const panelId = generateId()
    const panel: PanelState = {
      id: panelId,
      type: 'flashqueryVault',
      title: 'FlashQuery Vault',
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
      placePanel(panelId, 'flashqueryVault', placement, position, workspaceId === get().selectedWorkspaceId)
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
      log.error('Failed to place FlashQuery Vault panel:', error)
      return null as unknown as string
    }
    return panelId
  },

  createFlashQueryVaultSearch(workspaceId, position?, placement?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'flashqueryVaultSearch',
      title: 'Vault Search',
      isDirty: false,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createOutline(workspaceId, position?, placement?, sourceEditorPanelId?, sourceCanvasNodeId?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'outline',
      title: 'Outline',
      isDirty: false,
      ...(sourceEditorPanelId ? { sourceEditorPanelId } : {}),
      ...(sourceCanvasNodeId ? { sourceCanvasNodeId } : {}),
    }
    if (placement?.target === 'none' && sourceEditorPanelId) {
      set((state) => ({
        workspaces: state.workspaces.map((ws) =>
          ws.id === workspaceId
            ? { ...ws, panels: { ...ws.panels, [panel.id]: panel } }
            : ws,
        ),
      }))
      if (!placePanelInCanvasNode(workspaceId, sourceEditorPanelId, panel.id, 'split-right', sourceCanvasNodeId)) {
        set((state) => ({
          workspaces: state.workspaces.map((ws) => {
            if (ws.id !== workspaceId) return ws
            const { [panel.id]: _removed, ...panels } = ws.panels
            return { ...ws, panels }
          }),
        }))
        return null as unknown as string
      }
      return panel.id
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createSemanticConnections(workspaceId, position?, placement?, sourceEditorPanelId?, sourceCanvasNodeId?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'semantic-connections',
      title: 'Connections',
      isDirty: false,
      ...(sourceEditorPanelId ? { sourceEditorPanelId } : {}),
      ...(sourceCanvasNodeId ? { sourceCanvasNodeId } : {}),
    }
    if (placement?.target === 'none' && sourceEditorPanelId) {
      set((state) => ({
        workspaces: state.workspaces.map((ws) =>
          ws.id === workspaceId
            ? { ...ws, panels: { ...ws.panels, [panel.id]: panel } }
            : ws,
        ),
      }))
      if (!placePanelInCanvasNode(workspaceId, sourceEditorPanelId, panel.id, 'split-right', sourceCanvasNodeId)) {
        set((state) => ({
          workspaces: state.workspaces.map((ws) => {
            if (ws.id !== workspaceId) return ws
            const { [panel.id]: _removed, ...panels } = ws.panels
            return { ...ws, panels }
          }),
        }))
        return null as unknown as string
      }
      return panel.id
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createProjectList(workspaceId, position?, placement?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'projectList',
      title: 'Projects',
      isDirty: false,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createCanvas(workspaceId, position?, placement?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'canvas',
      title: 'Canvas',
      isDirty: false,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  createAgent(workspaceId, position?, placement?) {
    const panel: PanelState = {
      id: generateId(),
      type: 'agent',
      title: 'Agent',
      isDirty: false,
    }
    return addAndPlacePanel(set, get, workspaceId, panel, placement, position)
  },

  // --- Panel management ---

  closePanel(workspaceId, panelId) {
    // Dispose terminal before removing the panel
    const ws = get().workspaces.find((w) => w.id === workspaceId)
    const panel = ws?.panels[panelId]
    if (panel?.type === 'editor') {
      for (const derivedPanelId of associatedDerivedPanelIds(ws, panelId)) {
        get().closePanel(workspaceId, derivedPanelId)
      }
    }
    if (panel?.type === 'terminal') {
      terminalRegistry.dispose(panelId)
    }
    if (panel?.type === 'canvas') {
      releaseCanvasStoreForPanel(panelId)
    }

    // Remove from dock/canvas first (less critical — log errors but continue)
    try {
      const dockLocation = useDockStore.getState().panelLocations[panelId]
      if (dockLocation?.type === 'dock') {
        useDockStore.getState().undockPanel(panelId)
      } else if (workspaceId === get().selectedWorkspaceId) {
        // Try all registered canvas stores (panel could be on any canvas)
        let removed = false
        for (const ops of canvasOpsRegistry.values()) {
          const nodeId = ops.storeApi.getState().nodeForPanel(panelId)
          if (nodeId) {
            ops.removeNodeForPanel(panelId)
            removed = true
            break
          }
        }
        if (!removed) canvasOps?.removeNodeForPanel(panelId)
      }
    } catch (error) {
      log.error('Failed to remove panel from dock/canvas during close:', error)
    }

    // Clean up location tracking
    try {
      useDockStore.getState().removePanelLocation(panelId)
    } catch (error) {
      log.error('Failed to clean up panel location tracking:', error)
    }

    // Remove from workspace panels (always do this to ensure cleanup)
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== workspaceId) return ws
        const { [panelId]: _removed, ...remainingPanels } = ws.panels
        return { ...ws, panels: remainingPanels }
      }),
    }))
  },

  focusPanel(workspaceId, panelId) {
    return focusExistingPanel(workspaceId, panelId)
  },

  focusAssociatedSidebars(workspaceId, sourceEditorPanelId) {
    const ws = get().workspaces.find((w) => w.id === workspaceId)
    if (!ws?.panels[sourceEditorPanelId]) return

    const dock = useDockStore.getState()
    const rightLayout = dock.zones.right.layout
    const activeRightPanelId = activePanelIdInLayout(rightLayout)
    const activeRightPanelType = activeRightPanelId ? ws.panels[activeRightPanelId]?.type : undefined
    const derivedPanels = Object.values(ws.panels).filter((panel) => {
      const location = dock.panelLocations[panel.id]
      return (panel.type === 'outline' || panel.type === 'semantic-connections') &&
        panel.sourceEditorPanelId === sourceEditorPanelId &&
        location?.type === 'dock' &&
        location.zone === 'right'
    })
    const target = derivedPanels.find((panel) => panel.type === activeRightPanelType)
      ?? derivedPanels[0]
    if (!target) return

    const stack = findStackContainingPanel(rightLayout, target.id)
    const index = stack?.panelIds.indexOf(target.id) ?? -1
    if (!stack || index < 0) return

    useDockStore.setState((state) => ({
      zones: {
        ...state.zones,
        right: {
          ...state.zones.right,
          visible: true,
        },
      },
    }))
    useDockStore.getState().setActiveTab(stack.id, index)
  },

  updatePanelTitle(workspaceId, panelId, title) {
    setPanelField(set, workspaceId, panelId, (panel) => ({ ...panel, title }))
  },

  updatePanelTitleFromAgent(workspaceId, panelId, title) {
    setPanelField(set, workspaceId, panelId, (panel) => (
      panel.titleUserOverridden || panel.title === title
        ? panel
        : { ...panel, title }
    ))
  },

  renamePanelByUser(workspaceId, panelId, title) {
    setPanelField(set, workspaceId, panelId, (panel) => ({ ...panel, title, titleUserOverridden: true }))
  },

  updatePanelUrl(workspaceId, panelId, url) {
    setPanelField(set, workspaceId, panelId, (panel) => ({ ...panel, url }))
  },

  updatePanelFilePath(workspaceId, panelId, filePath) {
    setPanelField(set, workspaceId, panelId, (panel) => ({ ...panel, filePath }))
  },

  setPanelDirty(workspaceId, panelId, dirty) {
    setPanelField(set, workspaceId, panelId, (panel) => ({ ...panel, isDirty: dirty }))
  },

  setPanelMarkdownPreview(workspaceId, panelId, preview) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== workspaceId) return ws
        const panel = ws.panels[panelId]
        if (!panel) return ws
        return {
          ...ws,
          panels: { ...ws.panels, [panelId]: { ...panel, markdownPreview: preview } },
        }
      }),
    }))
  },

  setPanelUnsavedContent(workspaceId, panelId, content) {
    setPanelField(set, workspaceId, panelId, (panel) => ({ ...panel, unsavedContent: content }))
  },

  addPanel(workspaceId, panel) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === workspaceId
          ? { ...ws, panels: { ...ws.panels, [panel.id]: panel } }
          : ws,
      ),
    }))
  },

  // --- Helpers ---

  getWorkspace(id) {
    return get().workspaces.find((w) => w.id === id)
  },

  selectedWorkspace() {
    return get().workspaces.find((w) => w.id === get().selectedWorkspaceId)
  },

  syncCanvasToWorkspace(workspaceId) {
    const canvasStore = getWorkspaceCanvasStore(workspaceId)
    const canvasState = canvasStore?.getState()
    if (!canvasState) return

    // Also snapshot dock state so it's saved per workspace
    const dockSnapshot = useDockStore.getState().getSnapshot()

    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== workspaceId) return ws
        if (shouldPreserveExistingCanvas(
          Object.keys(canvasState.nodes).length,
          Object.keys(ws.canvasNodes ?? {}).length,
        )) {
          // Keep nodes/regions/viewport intact; only refresh dock state.
          return { ...ws, dockState: dockSnapshot }
        }
        return {
          ...ws,
          canvasNodes: { ...canvasState.nodes },
          regions: { ...canvasState.regions },
          viewportOffset: { ...canvasState.viewportOffset },
          zoomLevel: canvasState.zoomLevel,
          focusedNodeId: canvasState.focusedNodeId,
          dockState: dockSnapshot,
        }
      }),
    }))
  },

  setWorkspaceRootPath(wsId, rootPath) {
    const ws = get().workspaces.find((w) => w.id === wsId)
    if (!ws) return Promise.resolve(false)
    const folderName = rootPath.split('/').filter(Boolean).pop() ?? rootPath
    const desiredName = ws.name === 'Workspace' ? folderName : ws.name
    // Apply optimistically so any panel created synchronously after this call
    // (e.g. WelcomePage spawning a terminal right after picking a folder)
    // sees the new rootPath and uses it as cwd instead of falling back to $HOME.
    set((state) => ({
      workspaces: state.workspaces.map((candidate) => {
        if (candidate.id !== wsId) return candidate
        return {
          ...candidate,
          rootPath,
          name: desiredName,
          isRootPathPending: true,
          rootPathError: null,
        }
      }),
    }))
    return syncUpdateToMain(wsId, { rootPath, name: desiredName }).then((result) => {
      if (!result?.ok) {
        const message = result?.error?.message ?? 'Failed to update workspace root'
        set((state) => ({
          workspaces: state.workspaces.map((candidate) => (
            candidate.id === wsId
              ? { ...candidate, isRootPathPending: false, rootPathError: message }
              : candidate
          )),
        }))
        log.warn('[workspace-sync] Update rejected:', message)
        return false
      }
      set((state) => ({
        workspaces: state.workspaces.map((candidate) => (
          candidate.id === wsId
            ? applyWorkspaceInfo(candidate, result.workspace)
            : candidate
        )),
      }))
      void window.electronAPI.recentProjectsAdd(result.workspace.rootPath)
      return true
    })
  },

  setWorkspaceColor(wsId, color) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === wsId ? { ...ws, color } : ws,
      ),
    }))
    void syncUpdateToMain(wsId, { color })
  },

  renameWorkspace(wsId, name) {
    const trimmed = name.trim()
    if (!trimmed) return
    set((state) => ({
      workspaces: state.workspaces.map((ws) =>
        ws.id === wsId ? { ...ws, name: trimmed } : ws,
      ),
    }))
    void syncUpdateToMain(wsId, { name: trimmed })
  },

  duplicateWorkspace(wsId) {
    const ws = get().workspaces.find((w) => w.id === wsId)
    if (!ws) return wsId
    const copy: WorkspaceState = {
      id: generateId(),
      name: `${ws.name} Copy`,
      color: ws.color,
      rootPath: ws.rootPath,
      panels: {},
      canvasNodes: {},
      regions: {},
      zoomLevel: ZOOM_DEFAULT,
      viewportOffset: { x: 0, y: 0 },
      focusedNodeId: null,
    }
    set((state) => ({ workspaces: [...state.workspaces, copy] }))
    void syncCreateToMain(copy)
    return copy.id
  },

  reorderWorkspaces(fromIndex, toIndex) {
    // `toIndex` is an insertion slot in [0, length]: 0 = before the first row,
    // length = after the last. Dropping at the item's own slot or the one just
    // after it leaves the order unchanged.
    set((state) => {
      if (toIndex === fromIndex || toIndex === fromIndex + 1) return state
      const workspaces = [...state.workspaces]
      const [moved] = workspaces.splice(fromIndex, 1)
      // Removing the dragged item first shifts every later slot down by one, so
      // for downward moves the insertion slot is one less than requested.
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex
      workspaces.splice(insertAt, 0, moved)
      return { workspaces }
    })
  },

  addAdditionalRoot(wsId, rootPath) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== wsId) return ws
        const current = ws.additionalRoots ?? []
        // Don't add duplicates or the primary root itself.
        if (rootPath === ws.rootPath || current.includes(rootPath)) return ws
        return { ...ws, additionalRoots: [...current, rootPath] }
      }),
    }))
  },

  removeAdditionalRoot(wsId, rootPath) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== wsId) return ws
        const current = ws.additionalRoots ?? []
        return { ...ws, additionalRoots: current.filter((p) => p !== rootPath) }
      }),
    }))
  },

  // --- Parallel Work (git worktrees) ---

  ensurePrimaryWorktree(wsId) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== wsId) return ws
        const list = ws.worktrees ?? []
        if (list.some((w) => w.isPrimary)) return ws
        if (!ws.rootPath) return ws
        const primary: WorktreeMeta = {
          id: `wt-primary-${ws.id}`,
          path: ws.rootPath,
          branch: '',
          color: pickWorktreeColor(list),
          isPrimary: true,
        }
        return { ...ws, worktrees: [primary, ...list] }
      }),
    }))
  },

  upsertWorktree(wsId, wt) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== wsId) return ws
        const list = ws.worktrees ?? []
        const idx = list.findIndex((w) => w.id === wt.id)
        const next = idx >= 0
          ? list.map((w) => (w.id === wt.id ? { ...w, ...wt } : w))
          : [...list, wt]
        return { ...ws, worktrees: next }
      }),
    }))
  },

  removeWorktree(wsId, worktreeId) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== wsId) return ws
        const list = (ws.worktrees ?? []).filter((w) => w.id !== worktreeId)
        // Strip the worktreeId from any panel tagged with it.
        const panels = Object.fromEntries(
          Object.entries(ws.panels).map(([id, p]) => [
            id,
            p.worktreeId === worktreeId ? { ...p, worktreeId: undefined } : p,
          ]),
        )
        return { ...ws, worktrees: list, panels }
      }),
    }))
  },

  setWorktreeColor(wsId, worktreeId, color) {
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== wsId) return ws
        const list = (ws.worktrees ?? []).map((w) =>
          w.id === worktreeId ? { ...w, color } : w,
        )
        return { ...ws, worktrees: list }
      }),
    }))
  },

  setWorktreeLabel(wsId, worktreeId, label) {
    const trimmed = label?.trim()
    set((state) => ({
      workspaces: state.workspaces.map((ws) => {
        if (ws.id !== wsId) return ws
        const list = (ws.worktrees ?? []).map((w) =>
          w.id === worktreeId ? { ...w, label: trimmed || undefined } : w,
        )
        return { ...ws, worktrees: list }
      }),
    }))
  },

  setPanelWorktreeId(wsId, panelId, worktreeId) {
    setPanelField(set, wsId, panelId, (panel) => ({ ...panel, worktreeId }))
  },

  closeAllPanels(wsId) {
    const ws = get().workspaces.find((w) => w.id === wsId)
    if (!ws) return

    // Dispose any terminal panels via the registry (handles PTY kill, xterm
    // disposal, listener cleanup, and shell unregister)
    for (const panel of Object.values(ws.panels)) {
      if (panel.type === 'terminal') {
        terminalRegistry.dispose(panel.id)
      }
    }

    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === wsId ? { ...w, panels: {}, canvasNodes: {} } : w,
      ),
    }))

    // Clear the canvas store if this is the active workspace
    if (wsId === get().selectedWorkspaceId) {
      canvasOps?.clearAllNodes()
      // Reset the dock to a clean state so the just-cleared panel IDs don't
      // linger in dock zones as orphan tabs (which render as a generic
      // "Panel" tab with an editor icon).
      useDockStore.getState().restoreSnapshot(createCleanDockSnapshot())
      get().ensureCenterCanvas(wsId)
    }
  },

  // --- Cross-window sync ---

  mergeWorkspaceInfos(infos) {
    set((state) => {
      const existingMap = new Map(state.workspaces.map((ws) => [ws.id, ws]))

      // Update metadata for existing workspaces, add new ones
      const updatedIds = new Set<string>()
      for (const info of infos) {
        updatedIds.add(info.id)
        const existing = existingMap.get(info.id)
        if (existing) {
          // Merge metadata only — don't touch panels/canvas state
          if (
            existing.name !== info.name ||
            existing.color !== info.color ||
            existing.rootPath !== info.rootPath ||
            !sameFlashQueryConnection(existing.flashqueryConnection, info.flashqueryConnection)
          ) {
          existingMap.set(info.id, {
            ...existing,
            name: info.name,
            color: info.color,
            rootPath: info.rootPath,
            flashqueryConnection: sanitizeFlashQueryConnection(info.flashqueryConnection),
            rootPathError: null,
            isRootPathPending: false,
          })
          }
        } else {
          // New workspace from another window — create empty local state
          existingMap.set(info.id, {
            id: info.id,
            name: info.name,
            color: info.color,
            rootPath: info.rootPath,
            flashqueryConnection: sanitizeFlashQueryConnection(info.flashqueryConnection),
            rootPathError: null,
            isRootPathPending: false,
            panels: {},
            canvasNodes: {},
            regions: {},
            zoomLevel: ZOOM_DEFAULT,
            viewportOffset: { x: 0, y: 0 },
            focusedNodeId: null,
          })
        }
      }

      // Remove workspaces that no longer exist in main (deleted from another window)
      // But keep the currently selected workspace to avoid breaking the UI
      const workspaces = Array.from(existingMap.values()).filter(
        (ws) => updatedIds.has(ws.id) || ws.id === state.selectedWorkspaceId,
      )

      return { workspaces }
    })
  },
}))

// -----------------------------------------------------------------------------
// Cross-window workspace sync — subscribe to main-process broadcasts
// -----------------------------------------------------------------------------

let workspaceSyncCleanup: (() => void) | null = null

export function setupWorkspaceSync(): () => void {
  if (workspaceSyncCleanup) return workspaceSyncCleanup

  const unsubscribe = window.electronAPI.onWorkspaceChanged((infos) => {
    useAppStore.getState().mergeWorkspaceInfos(infos)
  })

  workspaceSyncCleanup = () => {
    unsubscribe()
    workspaceSyncCleanup = null
  }

  return workspaceSyncCleanup
}

// -----------------------------------------------------------------------------
// Granular selectors
// -----------------------------------------------------------------------------

/** Returns the selected workspace. Uses shallow equality to avoid re-renders
 *  when unrelated workspaces change. */
export function useSelectedWorkspace(): WorkspaceState | undefined {
  return useStoreWithEqualityFn(
    useAppStore,
    (s) => s.workspaces.find((w) => w.id === s.selectedWorkspaceId),
    shallow,
  )
}

/** Returns just the panels record of the selected workspace. */
export function useWorkspacePanels(): Record<string, PanelState> | undefined {
  return useAppStore(
    (s) => s.workspaces.find((w) => w.id === s.selectedWorkspaceId)?.panels,
  )
}

/**
 * Resolve the id of the workspace that actually OWNS a given panel, i.e. the
 * workspace whose `panels` map contains `panelId`. This is the only reliable
 * source of a panel's workspace identity because PanelState itself carries no
 * workspaceId field.
 *
 * Critical for browser panels: the Electron <webview> partition is derived as
 * `persist:browser-ws-${workspaceId}` and is immutable after the webview
 * attaches. If the render path supplied the GLOBAL active workspace id instead
 * of the panel's owning id, two workspaces' browsers would collapse onto the
 * active workspace's single Electron session — leaking cookies/logins across
 * workspaces (see debug: cate-workspace-session-bleed).
 *
 * Returns `undefined` when no workspace owns the panel (e.g. a transient panel
 * not yet committed to the store, or a detached-window panel); callers should
 * fall back to whatever active id they have.
 */
export function ownerWorkspaceIdForPanel(panelId: string): string | undefined {
  if (!panelId) return undefined
  const { workspaces } = useAppStore.getState()
  for (const ws of workspaces) {
    if (ws.panels[panelId]) return ws.id
  }
  return undefined
}

/** Returns the rootPath for a workspace (defaults to selected). */
export function useWorkspaceRootPath(wsId?: string): string | undefined {
  return useAppStore((s) => {
    const id = wsId ?? s.selectedWorkspaceId
    return s.workspaces.find((w) => w.id === id)?.rootPath
  })
}

/** Returns workspaces array, re-rendering on add/remove/reorder and metadata changes (name, color, rootPath). */
export function useWorkspaceList(): WorkspaceState[] {
  return useStoreWithEqualityFn(
    useAppStore,
    (s) => s.workspaces,
    (a, b) => {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++) {
        if (
          a[i].id !== b[i].id ||
          a[i].name !== b[i].name ||
          a[i].color !== b[i].color ||
          a[i].rootPath !== b[i].rootPath ||
          a[i].rootPathError !== b[i].rootPathError ||
          a[i].isRootPathPending !== b[i].isRootPathPending
        ) return false
      }
      return true
    },
  )
}
