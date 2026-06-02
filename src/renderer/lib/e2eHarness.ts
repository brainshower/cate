// E2E test harness — exposes a tiny inspect/seed API on window.__cateE2E
// when the app is launched with CATE_E2E=1.
//
// Why a harness: drag tests need deterministic seed (1-2 nodes at known
// positions, known zoom) and assertions against canvas-space state. Driving
// the UI for setup is brittle; reaching into stores is reliable.

import { useAppStore, type PanelPlacement } from '../stores/appStore'
import { getOrCreateCanvasStoreForPanel } from '../stores/canvasStore'
import { useDockStore } from '../stores/dockStore'
import { useDragStore } from '../drag/store'
import { useUIStore } from '../stores/uiStore'
import { saveEditor } from './editorSaveRegistry'
import { buildVaultUri } from '../../shared/flashqueryUri'
import type { FlashQueryConnection, Point } from '../../shared/types'
import type { NativeContextMenuItem } from '../../shared/electron-api'
import * as monaco from 'monaco-editor'
import { terminalRegistry } from './terminalRegistry'

declare global {
  interface Window {
    __cateE2E?: {
      ready: true
      activeCanvasPanelId(): string | null
      selectedWorkspaceId(): string
      ensureWorkspaceRoot(rootPath: string): Promise<string>
      openFlashQueryConnectionDialog(workspaceId?: string): void
      workspaceFlashQueryConnection(workspaceId: string): FlashQueryConnection | undefined
      createFlashQueryVault(point: Point, placement?: PanelPlacement): string
      createAgent(point: Point, placement?: PanelPlacement): string
      openFileEditor(workspaceId: string, filePath: string): string
      editorPanelIdsForFilePath(filePath: string): string[]
      openVaultDocument(vaultPath: string, mode: 'dock' | 'canvas'): string
      editorPanelIdsForPath(vaultPath: string): string[]
      openSettings(initialTab?: string): void
      closeSettings(): void
      openSidebarView(view: 'workspaces' | 'explorer' | 'flashqueryVault' | 'git' | 'parallelWork'): void
      closePanel(panelId: string): void
      editorText(panelId: string): string | null
      setEditorText(panelId: string, content: string): void
      saveEditorPanel(panelId: string): Promise<string>
      writeVaultDocument(vaultPath: string, content: string): Promise<void>
      retryFlashQuery(workspaceId?: string): Promise<void>
      chooseNextContextMenuAction(action: string | null): void
      lastContextMenuItems(): NativeContextMenuItem[]
      panelLocation(panelId: string): string | null
      createTerminal(point: Point): string
      createCanvasPanel(point: Point): string
      nodes(): { id: string; panelId: string; origin: Point; size: { width: number; height: number } }[]
      zoom(): number
      setZoom(z: number): void
      resetViewport(): void
      /** Resolve the PTY id backing a terminal node (null until the PTY spawns). */
      terminalPtyId(nodeId: string): string | null
      /** Write raw data to a terminal node's PTY (e.g. a flooding command). */
      writeTerminal(nodeId: string, data: string): boolean
      terminalLog(nodeId: string): Promise<string | null>
      dragSnapshot(): {
        isDragging: boolean
        sourceKind: string | null
        sourceNodeId: string | null
        targetKind: string | null
      }
    }
  }
}

export function installE2EHarness(): void {
  if (window.__cateE2E) return

  // The Canvas component stamps data-canvas-panel-id on its root — use the
  // DOM as the source of truth for which canvas is currently mounted/active.
  const activeCanvasPanelId = (): string | null => {
    const el = document.querySelector('[data-canvas-panel-id]')
    return el?.getAttribute('data-canvas-panel-id') ?? null
  }

  const activeCanvasStore = () => {
    const pid = activeCanvasPanelId()
    return pid ? getOrCreateCanvasStoreForPanel(pid) : null
  }

  const createTerminal = (point: Point): string => {
    const wsId = useAppStore.getState().selectedWorkspaceId
    const panelId = useAppStore.getState().createTerminal(wsId, undefined, point)
    const cs = activeCanvasStore()
    if (!cs) return panelId
    for (const n of Object.values(cs.getState().nodes)) {
      if (n.panelId === panelId) return n.id
    }
    return panelId
  }

  const selectedWorkspaceId = (): string => useAppStore.getState().selectedWorkspaceId

  const ensureWorkspaceRoot = async (rootPath: string): Promise<string> => {
    const app = useAppStore.getState()
    let workspaceId = app.selectedWorkspaceId
    if (!workspaceId) {
      workspaceId = app.addWorkspace('E2E Workspace')
    }
    const ok = await useAppStore.getState().setWorkspaceRootPath(workspaceId, rootPath)
    if (!ok) {
      throw new Error(`Failed to set E2E workspace root: ${rootPath}`)
    }
    return workspaceId
  }

  const openFlashQueryConnectionDialog = (workspaceId?: string): void => {
    useUIStore.getState().setShowFlashQueryConnectionDialog(true, workspaceId ?? selectedWorkspaceId())
  }

  const workspaceFlashQueryConnection = (workspaceId: string): FlashQueryConnection | undefined => {
    return useAppStore.getState().workspaces.find((workspace) => workspace.id === workspaceId)?.flashqueryConnection
  }

  const createFlashQueryVault = (point: Point, placement?: PanelPlacement): string => {
    return useAppStore.getState().createFlashQueryVault(selectedWorkspaceId(), point, placement)
  }

  const createAgent = (point: Point, placement?: PanelPlacement): string => {
    const panelId = useAppStore.getState().createAgent(selectedWorkspaceId(), point, placement)
    const cs = activeCanvasStore()
    if (!cs) return panelId
    for (const n of Object.values(cs.getState().nodes)) {
      if (n.panelId === panelId) return n.id
    }
    return panelId
  }

  const panelFilePath = (panelId: string): string => {
    const panel = useAppStore.getState().workspaces
      .find((workspace) => workspace.id === selectedWorkspaceId())
      ?.panels[panelId]
    if (panel?.type !== 'editor' || !panel.filePath) {
      throw new Error(`No editor file path found for panel ${panelId}`)
    }
    return panel.filePath
  }

  const editorModel = (panelId: string): monaco.editor.ITextModel | null => {
    const uri = monaco.Uri.parse(panelFilePath(panelId))
    const model = monaco.editor.getModel(uri)
    return model && !model.isDisposed() ? model : null
  }

  const openVaultDocument = (vaultPath: string, mode: 'dock' | 'canvas'): string => {
    const workspaceId = selectedWorkspaceId()
    return useAppStore.getState().createEditor(
      workspaceId,
      buildVaultUri(workspaceId, vaultPath),
      undefined,
      mode === 'dock' ? { target: 'dock', zone: 'center' } : { target: 'canvas' },
    )
  }

  const openFileEditor = (workspaceId: string, filePath: string): string => {
    return useAppStore.getState().createEditor(
      workspaceId,
      filePath,
      undefined,
      { target: 'dock', zone: 'center' },
    )
  }

  const editorPanelIdsForFilePath = (filePath: string): string[] => {
    const workspace = useAppStore.getState().workspaces.find((ws) => ws.id === selectedWorkspaceId())
    if (!workspace) return []
    return Object.values(workspace.panels)
      .filter((panel) => panel.type === 'editor' && panel.filePath === filePath)
      .map((panel) => panel.id)
  }

  const editorPanelIdsForPath = (vaultPath: string): string[] => {
    const workspaceId = selectedWorkspaceId()
    const uri = buildVaultUri(workspaceId, vaultPath)
    const workspace = useAppStore.getState().workspaces.find((ws) => ws.id === workspaceId)
    if (!workspace) return []
    return Object.values(workspace.panels)
      .filter((panel) => panel.type === 'editor' && panel.filePath === uri)
      .map((panel) => panel.id)
  }

  const closePanel = (panelId: string): void => {
    useAppStore.getState().closePanel(selectedWorkspaceId(), panelId)
  }

  const openSettings = (initialTab?: string): void => {
    useUIStore.getState().openSettings(initialTab)
  }

  const closeSettings = (): void => {
    useUIStore.getState().closeSettings()
  }

  const openSidebarView = (view: 'workspaces' | 'explorer' | 'flashqueryVault' | 'git' | 'parallelWork'): void => {
    const ui = useUIStore.getState()
    if (ui.sidebarLayout.left.includes(view)) {
      ui.setActiveLeftSidebarView(view)
    } else {
      ui.setActiveRightSidebarView(view)
    }
  }

  const editorText = (panelId: string): string | null => editorModel(panelId)?.getValue() ?? null

  const setEditorText = (panelId: string, content: string): void => {
    const model = editorModel(panelId)
    if (!model) throw new Error(`No Monaco model found for panel ${panelId}`)
    model.setValue(content)
  }

  const saveEditorPanel = async (panelId: string): Promise<string> => {
    return saveEditor(panelId)
  }

  const writeVaultDocument = async (vaultPath: string, content: string): Promise<void> => {
    const result = await window.electronAPI.flashqueryWriteDocument(selectedWorkspaceId(), vaultPath, content)
    if (!result.success) {
      throw new Error(result.error)
    }
  }

  const retryFlashQuery = async (workspaceId?: string): Promise<void> => {
    await window.electronAPI.flashqueryRetry(workspaceId ?? selectedWorkspaceId())
  }

  const panelLocation = (panelId: string): string | null => {
    return useDockStore.getState().getPanelLocation(panelId)?.type ?? (
      nodes().some((node) => node.panelId === panelId) ? 'canvas' : null
    )
  }

  const createCanvasPanel = (point: Point): string => {
    const wsId = useAppStore.getState().selectedWorkspaceId
    useAppStore.getState().createCanvas(wsId, point)
    const cs = activeCanvasStore()
    if (!cs) return ''
    const nodes = Object.values(cs.getState().nodes)
    return nodes.length ? nodes[nodes.length - 1].id : ''
  }

  const nodes = () => {
    const cs = activeCanvasStore()
    if (!cs) return []
    return Object.values(cs.getState().nodes).map((n) => ({
      id: n.id,
      panelId: n.panelId,
      origin: { x: n.origin.x, y: n.origin.y },
      size: { width: n.size.width, height: n.size.height },
    }))
  }

  const zoom = () => activeCanvasStore()?.getState().zoomLevel ?? 1

  const setZoom = (z: number) => {
    activeCanvasStore()?.getState().setZoom(z)
  }

  const resetViewport = () => {
    activeCanvasStore()?.setState({ viewportOffset: { x: 0, y: 0 } })
  }

  const chooseNextContextMenuAction = (action: string | null): void => {
    window.electronAPI.e2eChooseNextContextMenuAction?.(action)
  }

  const lastContextMenuItems = (): NativeContextMenuItem[] => {
    return window.electronAPI.e2eLastContextMenuItems?.() ?? []
  }

  const terminalPtyId = (nodeId: string): string | null => {
    const cs = activeCanvasStore()
    if (!cs) return null
    const node = cs.getState().nodes[nodeId]
    const panelId = node?.panelId ?? nodeId
    return terminalRegistry.getEntry(panelId)?.ptyId || null
  }

  const writeTerminal = (nodeId: string, data: string): boolean => {
    const ptyId = terminalPtyId(nodeId)
    if (!ptyId) return false
    void window.electronAPI?.terminalWrite(ptyId, data)
    return true
  }

  const terminalLog = async (nodeId: string): Promise<string | null> => {
    const ptyId = terminalPtyId(nodeId)
    if (!ptyId) return null
    return window.electronAPI?.terminalLogRead(ptyId) ?? null
  }

  const dragSnapshot = () => {
    const s = useDragStore.getState()
    return {
      isDragging: s.isDragging,
      sourceKind: s.source?.origin.kind ?? null,
      sourceNodeId:
        s.source?.origin.kind === 'canvas-node' ? s.source.origin.nodeId : null,
      targetKind: s.target?.kind ?? null,
    }
  }

  window.__cateE2E = {
    ready: true,
    activeCanvasPanelId,
    selectedWorkspaceId,
    ensureWorkspaceRoot,
    openFlashQueryConnectionDialog,
    workspaceFlashQueryConnection,
    createFlashQueryVault,
    createAgent,
    openFileEditor,
    editorPanelIdsForFilePath,
    openVaultDocument,
    editorPanelIdsForPath,
    openSettings,
    closeSettings,
    openSidebarView,
    closePanel,
    editorText,
    setEditorText,
    saveEditorPanel,
    writeVaultDocument,
    retryFlashQuery,
    chooseNextContextMenuAction,
    lastContextMenuItems,
    panelLocation,
    createTerminal,
    createCanvasPanel,
    nodes,
    zoom,
    setZoom,
    resetViewport,
    terminalPtyId,
    writeTerminal,
    terminalLog,
    dragSnapshot,
  }
}
