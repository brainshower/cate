import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsClockwise, CaretRight, CircleNotch, FileText, Folder, FolderOpen, Plug, WarningCircle } from '@phosphor-icons/react'

import { Chip, type ConnectionStatus } from '../components/Chip'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'
import { buildVaultUri } from '../../shared/flashqueryUri'
import type { FlashQueryConnectionStatus, FlashQueryVaultEntry } from '../../shared/types'
import type { PanelProps } from './types'

interface PanelStatus {
  kind: FlashQueryConnectionStatus
  error?: string
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function statusToChip(status: PanelStatus | null): ConnectionStatus {
  if (!status) return { kind: 'connecting' }
  switch (status.kind) {
    case 'connecting':
      return { kind: 'connecting' }
    case 'live':
      return { kind: 'live' }
    case 'disconnected':
      return { kind: 'disconnected', error: status.error }
    default:
      return { kind: 'unknown' }
  }
}

function openConnectionSettings() {
  useUIStore.getState().setShowFlashQueryConnectionDialog(true)
}

function withoutPath(paths: Set<string>, vaultPath: string): Set<string> {
  return new Set([...paths].filter((path) => path !== vaultPath))
}

function collectAvailablePaths(
  entries: FlashQueryVaultEntry[],
  childrenByPath: Record<string, FlashQueryVaultEntry[]>,
): { paths: Set<string>; folderPaths: Set<string> } {
  const paths = new Set<string>()
  const folderPaths = new Set<string>()
  const visit = (entryList: FlashQueryVaultEntry[]) => {
    for (const entry of entryList) {
      paths.add(entry.vaultPath)
      if (entry.type === 'folder') {
        folderPaths.add(entry.vaultPath)
        visit(childrenByPath[entry.vaultPath] ?? [])
      }
    }
  }
  visit(entries)
  return { paths, folderPaths }
}

function SkeletonTree() {
  return (
    <div data-testid="vault-skeleton-tree" className="flex flex-col gap-2 px-3 py-2">
      {[0, 1, 2, 3].map((index) => (
        <div key={index} className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-sm bg-surface-5" />
          <div
            className="h-3 rounded bg-surface-5"
            style={{ width: `${72 - index * 8}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center text-xs">
      <Folder data-testid="vault-state-empty-icon" size={28} className="text-muted" />
      <div className="text-primary">This vault has no documents yet.</div>
      <div className="max-w-72 text-muted">Create a document in FlashQuery to see it here.</div>
    </div>
  )
}

interface VaultTreeProps {
  entries: FlashQueryVaultEntry[]
  childrenByPath: Record<string, FlashQueryVaultEntry[]>
  expandedPaths: Set<string>
  loadingPaths: Set<string>
  selectedPaths: Set<string>
  onRowClick: (entry: FlashQueryVaultEntry, event: React.MouseEvent) => void
  onRowDoubleClick: (entry: FlashQueryVaultEntry, event: React.MouseEvent) => void
  onRowContextMenu: (entry: FlashQueryVaultEntry, event: React.MouseEvent) => void
}

interface VisibleVaultRow {
  entry: FlashQueryVaultEntry
  depth: number
}

function flattenVisibleRows(
  entries: FlashQueryVaultEntry[],
  expandedPaths: Set<string>,
  childrenByPath: Record<string, FlashQueryVaultEntry[]>,
  depth = 0,
): VisibleVaultRow[] {
  const rows: VisibleVaultRow[] = []
  for (const entry of entries) {
    rows.push({ entry, depth })
    if (entry.type === 'folder' && expandedPaths.has(entry.vaultPath)) {
      rows.push(...flattenVisibleRows(childrenByPath[entry.vaultPath] ?? [], expandedPaths, childrenByPath, depth + 1))
    }
  }
  return rows
}

function VaultTree({
  entries,
  childrenByPath,
  expandedPaths,
  loadingPaths,
  selectedPaths,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
}: VaultTreeProps) {
  const visibleRows = useMemo(
    () => flattenVisibleRows(entries, expandedPaths, childrenByPath),
    [childrenByPath, entries, expandedPaths],
  )

  return (
    <div className="flex-1 overflow-auto px-1 py-1 text-xs" role="tree" aria-label="FlashQuery vault">
      {visibleRows.map(({ entry, depth }) => {
        const isFolder = entry.type === 'folder'
        const isExpanded = expandedPaths.has(entry.vaultPath)
        const isLoading = loadingPaths.has(entry.vaultPath)
        const Icon = isFolder ? (isExpanded ? FolderOpen : Folder) : FileText
        const label = entry.name
        const isSelected = selectedPaths.has(entry.vaultPath)
        return (
          <div
            key={entry.vaultPath}
            role="treeitem"
            aria-selected={isSelected}
            aria-expanded={isFolder ? isExpanded : undefined}
            className={`flex h-7 items-center gap-1.5 rounded px-2 text-secondary hover:bg-hover hover:text-primary ${isSelected ? 'bg-surface-5 text-primary' : ''}`}
            style={{ paddingLeft: 8 + depth * 16 }}
            onClick={(event) => onRowClick(entry, event)}
            onDoubleClick={(event) => onRowDoubleClick(entry, event)}
            onContextMenu={(event) => onRowContextMenu(entry, event)}
          >
            {isFolder ? (
              <CaretRight
                data-testid={`vault-row-chevron-${entry.vaultPath}`}
                size={11}
                className="shrink-0 text-muted transition-transform"
                style={{ transform: isExpanded ? 'rotate(90deg)' : undefined }}
              />
            ) : (
              <span className="w-3 shrink-0" />
            )}
            <Icon data-testid={`vault-row-icon-${entry.vaultPath}`} size={14} weight={isFolder ? 'fill' : 'regular'} className={`shrink-0 ${isFolder ? 'text-teal-400' : 'text-muted'}`} />
            <span className="min-w-0 truncate">{label}</span>
            {isLoading && (
              <CircleNotch
                data-testid={`vault-loading-${entry.vaultPath}`}
                aria-label={`Loading ${label}`}
                size={12}
                className="ml-auto shrink-0 text-teal-400"
                style={{ animation: 'spin 0.9s linear infinite' }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function FlashQueryVaultPanel({ workspaceId }: PanelProps) {
  const connection = useAppStore((state) =>
    state.workspaces.find((workspace) => workspace.id === workspaceId)?.flashqueryConnection)
  const [status, setStatus] = useState<PanelStatus | null>(connection ? { kind: 'connecting' } : null)
  const [rootEntries, setRootEntries] = useState<FlashQueryVaultEntry[]>([])
  const [childrenByPath, setChildrenByPath] = useState<Record<string, FlashQueryVaultEntry[]>>({})
  const [loadedFolderPaths, setLoadedFolderPaths] = useState<Set<string>>(new Set())
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set())
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [rootLoading, setRootLoading] = useState(false)
  const [rootLoaded, setRootLoaded] = useState(false)
  const lastSelectedPathRef = useRef<string | null>(null)
  const listRequestRef = useRef(0)
  const rootLoadingRef = useRef(false)
  const childrenByPathRef = useRef<Record<string, FlashQueryVaultEntry[]>>({})
  const folderRequestRef = useRef<Record<string, number>>({})
  const e2eInjectedStatusRef = useRef(false)

  const host = useMemo(() => connection ? hostFromUrl(connection.url) : '', [connection])
  const chipState = statusToChip(status)

  const retry = useCallback(() => {
    if (!workspaceId) return
    void window.electronAPI.flashqueryRetry(workspaceId)
  }, [workspaceId])

  const loadRoot = useCallback(async () => {
    if (rootLoadingRef.current) return
    rootLoadingRef.current = true
    const requestId = ++listRequestRef.current
    setRootLoading(true)
    try {
      const entries = await window.electronAPI.flashqueryListVault(workspaceId)
      if (requestId !== listRequestRef.current) return
      setRootEntries(entries)
      const available = collectAvailablePaths(entries, childrenByPathRef.current)
      setExpandedPaths((prev) => new Set([...prev].filter((path) => available.folderPaths.has(path))))
      setSelectedPaths((prev) => new Set([...prev].filter((path) => available.paths.has(path))))
      setChildrenByPath((prev) => Object.fromEntries(
        Object.entries(prev).filter(([path]) => available.folderPaths.has(path)),
      ))
      setLoadedFolderPaths((prev) => new Set([...prev].filter((path) => available.folderPaths.has(path))))
      if (lastSelectedPathRef.current && !available.paths.has(lastSelectedPathRef.current)) {
        lastSelectedPathRef.current = null
      }
      setRootLoaded(true)
    } finally {
      if (requestId === listRequestRef.current) {
        rootLoadingRef.current = false
        setRootLoading(false)
      }
    }
  }, [workspaceId])

  useEffect(() => {
    childrenByPathRef.current = childrenByPath
  }, [childrenByPath])

  const visibleRows = useMemo(
    () => flattenVisibleRows(rootEntries, expandedPaths, childrenByPath),
    [childrenByPath, expandedPaths, rootEntries],
  )

  const loadFolder = useCallback(async (vaultPath: string) => {
    if (loadedFolderPaths.has(vaultPath)) return
    const requestId = (folderRequestRef.current[vaultPath] ?? 0) + 1
    folderRequestRef.current[vaultPath] = requestId
    setLoadingPaths((prev) => new Set(prev).add(vaultPath))
    try {
      const entries = await window.electronAPI.flashqueryListVault(workspaceId, vaultPath)
      if (folderRequestRef.current[vaultPath] !== requestId) return
      setChildrenByPath((prev) => ({ ...prev, [vaultPath]: entries }))
      setLoadedFolderPaths((prev) => new Set(prev).add(vaultPath))
    } finally {
      if (folderRequestRef.current[vaultPath] === requestId) {
        setLoadingPaths((prev) => withoutPath(prev, vaultPath))
      }
    }
  }, [loadedFolderPaths, workspaceId])

  const selectPath = useCallback((vaultPath: string, meta: { shift?: boolean; cmd?: boolean }) => {
    setSelectedPaths((prev) => {
      if (meta.cmd) {
        const next = new Set(prev)
        if (next.has(vaultPath)) return withoutPath(next, vaultPath)
        else next.add(vaultPath)
        lastSelectedPathRef.current = vaultPath
        return next
      }
      if (meta.shift && lastSelectedPathRef.current) {
        const paths = visibleRows.map((row) => row.entry.vaultPath)
        const startIndex = paths.indexOf(lastSelectedPathRef.current)
        const endIndex = paths.indexOf(vaultPath)
        if (startIndex !== -1 && endIndex !== -1) {
          const [lo, hi] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex]
          const next = new Set(prev)
          for (let index = lo; index <= hi; index++) next.add(paths[index])
          return next
        }
      }
      lastSelectedPathRef.current = vaultPath
      return new Set([vaultPath])
    })
  }, [visibleRows])

  const openDocument = useCallback((entry: FlashQueryVaultEntry, mode: 'dock' | 'canvas') => {
    if (entry.type !== 'document') return
    const placement = mode === 'dock'
      ? { target: 'dock' as const, zone: 'center' as const }
      : { target: 'canvas' as const }
    const panelId = useAppStore.getState().createEditor(
      workspaceId,
      buildVaultUri(workspaceId, entry.vaultPath),
      undefined,
      placement,
    )
    useAppStore.getState().updatePanelTitle(workspaceId, panelId, entry.name)
  }, [workspaceId])

  const handleRowClick = useCallback((entry: FlashQueryVaultEntry, event: React.MouseEvent) => {
    const meta = { shift: event.shiftKey, cmd: event.metaKey || event.ctrlKey }
    selectPath(entry.vaultPath, meta)
    if (entry.type === 'folder' && !meta.shift && !meta.cmd) {
      const willExpand = !expandedPaths.has(entry.vaultPath)
      setExpandedPaths((prev) => {
        const next = new Set(prev)
        if (willExpand) next.add(entry.vaultPath)
        else return withoutPath(next, entry.vaultPath)
        return next
      })
      if (willExpand) void loadFolder(entry.vaultPath)
    }
  }, [expandedPaths, loadFolder, selectPath])

  const handleRowDoubleClick = useCallback((entry: FlashQueryVaultEntry, event: React.MouseEvent) => {
    if (entry.type !== 'document') return
    event.preventDefault()
    event.stopPropagation()
    openDocument(entry, 'dock')
  }, [openDocument])

  const handleRowContextMenu = useCallback(async (entry: FlashQueryVaultEntry, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (entry.type !== 'document') return
    selectPath(entry.vaultPath, { cmd: false, shift: false })
    const action = await window.electronAPI.showContextMenu([
      { id: 'open', label: 'Open' },
      { id: 'open-on-canvas', label: 'Open on Canvas' },
    ])
    if (action === 'open') openDocument(entry, 'dock')
    if (action === 'open-on-canvas') openDocument(entry, 'canvas')
  }, [openDocument, selectPath])

  useEffect(() => {
    if (!connection) {
      setStatus(null)
      setRootEntries([])
      setChildrenByPath({})
      setLoadedFolderPaths(new Set())
      setExpandedPaths(new Set())
      setSelectedPaths(new Set())
      setRootLoaded(false)
      return
    }
    setStatus({ kind: 'connecting' })
    setRootEntries([])
    setChildrenByPath({})
    setLoadedFolderPaths(new Set())
    setExpandedPaths(new Set())
    setSelectedPaths(new Set())
    setRootLoaded(false)
  }, [connection])

  useEffect(() => {
    return window.electronAPI.onFlashQueryStatus((payload) => {
      if (payload.workspaceId !== workspaceId) return
      e2eInjectedStatusRef.current = false
      setStatus({ kind: payload.status, error: payload.error })
    })
  }, [workspaceId])

  useEffect(() => {
    if (!window.electronAPI.isE2E) return

    const handleE2EStatus = (event: Event) => {
      const payload = (event as CustomEvent<{
        workspaceId: string
        status: FlashQueryConnectionStatus
        error?: string
      }>).detail
      if (payload.workspaceId !== workspaceId) return
      e2eInjectedStatusRef.current = true
      setStatus({ kind: payload.status, error: payload.error })
    }
    window.addEventListener('cate:e2e-flashquery-status', handleE2EStatus)
    return () => window.removeEventListener('cate:e2e-flashquery-status', handleE2EStatus)
  }, [workspaceId])

  useEffect(() => {
    if (!connection || status?.kind !== 'live') return
    void loadRoot()
  }, [connection, loadRoot, status?.kind])

  useEffect(() => {
    if (!connection || status?.kind !== 'connecting') return
    if (e2eInjectedStatusRef.current) return
    void window.electronAPI.flashqueryRetry(workspaceId)
  }, [connection, status?.kind, workspaceId])

  let body: React.ReactNode
  if (!connection) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center text-xs">
        <Plug data-testid="vault-state-no-connection-icon" size={28} className="text-muted" />
        <div className="text-primary">No FlashQuery connection configured for this workspace.</div>
        <div className="max-w-80 text-muted">Right-click the workspace name in the sidebar and pick 'FlashQuery connection…' to set one up.</div>
        <button
          type="button"
          className="rounded bg-surface-5 px-3 py-1.5 text-secondary transition-colors hover:bg-hover hover:text-primary"
          onClick={openConnectionSettings}
        >
          Open workspace settings
        </button>
      </div>
    )
  } else if (status?.kind === 'disconnected') {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center text-xs">
        <WarningCircle data-testid="vault-state-disconnected-icon" size={28} className="text-muted" />
        <div className="text-primary">Can't reach FlashQuery.</div>
        <div className="max-w-80 text-muted">{status.error ?? `Unable to connect to ${host}.`}</div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded bg-surface-5 px-3 py-1.5 text-secondary transition-colors hover:bg-hover hover:text-primary"
            onClick={retry}
          >
            Retry
          </button>
          <button
            type="button"
            className="rounded bg-surface-5 px-3 py-1.5 text-secondary transition-colors hover:bg-hover hover:text-primary"
            onClick={openConnectionSettings}
          >
            Edit connection
          </button>
        </div>
      </div>
    )
  } else if (status?.kind === 'live') {
    if (rootLoading && !rootLoaded) {
      body = <SkeletonTree />
    } else if (rootLoaded && rootEntries.length === 0) {
      body = <EmptyState />
    } else {
      body = (
        <VaultTree
          entries={rootEntries}
          childrenByPath={childrenByPath}
          expandedPaths={expandedPaths}
          loadingPaths={loadingPaths}
          selectedPaths={selectedPaths}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowDoubleClick}
          onRowContextMenu={handleRowContextMenu}
        />
      )
    }
  } else {
    body = (
      <>
        <SkeletonTree />
        <div className="mt-auto border-t border-subtle px-3 py-2 text-xs text-muted">
          probing {host}
        </div>
      </>
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-4">
      <div data-testid="vault-panel-header" className="flex h-8 shrink-0 items-center gap-2 border-b border-subtle px-3">
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          {host && <span data-testid="vault-panel-header-host" className="min-w-0 truncate text-xs text-muted">· {host}</span>}
        </div>
        {connection && (
          <Chip state={chipState} onRetry={retry} />
        )}
        <button
          type="button"
          aria-label="Refresh vault"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-primary"
          onClick={loadRoot}
          disabled={rootLoading}
        >
          <ArrowsClockwise
            size={14}
            className={rootLoading ? 'text-teal-400' : undefined}
            style={{ animation: rootLoading ? 'spin 0.9s linear infinite' : undefined }}
          />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {body}
      </div>
    </div>
  )
}
