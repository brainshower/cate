import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsClockwise, CaretRight, CircleNotch, FileText, Folder, FolderOpen, Plug, WarningCircle } from '@phosphor-icons/react'

import { Chip, type ConnectionStatus } from '../components/Chip'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'
import { refreshVaultIndexForWorkspace } from '../../agent/renderer/agentStore'
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

function joinVaultPath(parentPath: string, name: string): string {
  const trimmedParent = parentPath.replace(/^\/+|\/+$/g, '')
  const trimmedName = name.replace(/^\/+|\/+$/g, '')
  return trimmedParent ? `${trimmedParent}/${trimmedName}` : trimmedName
}

function parentVaultPath(vaultPath: string): string {
  const parts = vaultPath.split('/').filter(Boolean)
  parts.pop()
  return parts.join('/')
}

function basename(vaultPath: string): string {
  return vaultPath.split('/').filter(Boolean).at(-1) ?? vaultPath
}

function ensureMarkdownFilename(name: string): string {
  return /\.md$/i.test(name) ? name : `${name}.md`
}

function titleFromDocumentName(name: string): string {
  return name.replace(/\.md$/i, '')
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
  createDraft: CreateDraft | null
  renameDraft: RenameDraft | null
  onRowClick: (entry: FlashQueryVaultEntry, event: React.MouseEvent) => void
  onRowDoubleClick: (entry: FlashQueryVaultEntry, event: React.MouseEvent) => void
  onRowContextMenu: (entry: FlashQueryVaultEntry, event: React.MouseEvent) => void
  onBackgroundContextMenu: (event: React.MouseEvent) => void
  onCommitCreate: (name: string) => void
  onCancelCreate: () => void
  onCommitRename: (entry: FlashQueryVaultEntry, name: string) => void
  onCancelRename: () => void
}

interface VisibleVaultRow {
  entry: FlashQueryVaultEntry
  depth: number
}

interface CreateDraft {
  type: 'file' | 'folder'
  parentPath: string
}

interface RenameDraft {
  vaultPath: string
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
  createDraft,
  renameDraft,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  onBackgroundContextMenu,
  onCommitCreate,
  onCancelCreate,
  onCommitRename,
  onCancelRename,
}: VaultTreeProps) {
  const visibleRows = useMemo(
    () => flattenVisibleRows(entries, expandedPaths, childrenByPath),
    [childrenByPath, entries, expandedPaths],
  )

  const renderCreateRow = (depth: number) => {
    if (!createDraft) return null
    const Icon = createDraft.type === 'folder' ? Folder : FileText
    return (
      <div
        data-testid="vault-create-row"
        className="flex h-7 items-center gap-1.5 rounded px-2 text-secondary"
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <span className="w-3 shrink-0" />
        <Icon
          size={14}
          weight={createDraft.type === 'folder' ? 'fill' : 'regular'}
          className={`shrink-0 ${createDraft.type === 'folder' ? 'text-teal-400' : 'text-muted'}`}
        />
        <input
          autoFocus
          className="min-w-0 flex-1 rounded border border-blue-500/50 bg-surface-5 px-1 text-xs text-primary outline-none"
          placeholder={createDraft.type === 'folder' ? 'folder name' : 'file name'}
          onBlur={(event) => onCommitCreate(event.currentTarget.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onCommitCreate(event.currentTarget.value)
            if (event.key === 'Escape') onCancelCreate()
            event.stopPropagation()
          }}
        />
      </div>
    )
  }

  return (
    <div
      className="flex-1 overflow-auto px-1 py-1 text-xs"
      role="tree"
      aria-label="FlashQuery vault"
      onContextMenu={onBackgroundContextMenu}
    >
      {createDraft?.parentPath === '' && renderCreateRow(0)}
      {visibleRows.map(({ entry, depth }) => {
        const isFolder = entry.type === 'folder'
        const isExpanded = expandedPaths.has(entry.vaultPath)
        const isLoading = loadingPaths.has(entry.vaultPath)
        const Icon = isFolder ? (isExpanded ? FolderOpen : Folder) : FileText
        const label = entry.name
        const isSelected = selectedPaths.has(entry.vaultPath)
        const isRenaming = renameDraft?.vaultPath === entry.vaultPath
        return (
          <React.Fragment key={entry.vaultPath}>
          <div
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
            {isRenaming ? (
              <input
                autoFocus
                className="min-w-0 flex-1 rounded border border-blue-500/50 bg-surface-5 px-1 text-xs text-primary outline-none"
                defaultValue={basename(entry.vaultPath)}
                onFocus={(event) => {
                  const value = event.currentTarget.value
                  const dotIndex = value.lastIndexOf('.')
                  event.currentTarget.setSelectionRange(0, dotIndex > 0 && entry.type === 'document' ? dotIndex : value.length)
                }}
                onBlur={(event) => onCommitRename(entry, event.currentTarget.value)}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') onCommitRename(entry, event.currentTarget.value)
                  if (event.key === 'Escape') onCancelRename()
                  event.stopPropagation()
                }}
              />
            ) : (
              <span className="min-w-0 truncate">{label}</span>
            )}
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
          {createDraft?.parentPath === entry.vaultPath && isFolder && isExpanded && renderCreateRow(depth + 1)}
          </React.Fragment>
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
  const [createDraft, setCreateDraft] = useState<CreateDraft | null>(null)
  const [renameDraft, setRenameDraft] = useState<RenameDraft | null>(null)
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
      refreshVaultIndexForWorkspace(workspaceId)
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

  const reloadFolder = useCallback(async (vaultPath: string) => {
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
  }, [workspaceId])

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

  const openDocumentLegacy = useCallback((entry: FlashQueryVaultEntry, mode: 'dock' | 'canvas') => {
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
    openDocumentLegacy(entry, 'dock')
  }, [openDocumentLegacy])

  const refreshAfterVaultMutation = useCallback(async (parentPath: string) => {
    await loadRoot()
    if (parentPath) {
      setExpandedPaths((prev) => new Set(prev).add(parentPath))
      await reloadFolder(parentPath)
    }
  }, [loadRoot, reloadFolder])

  const showMutationError = useCallback((operation: string, error: string) => {
    window.alert?.(`${operation} failed: ${error}`)
  }, [])

  const startCreate = useCallback((type: 'file' | 'folder', parentPath: string) => {
    setRenameDraft(null)
    setCreateDraft({ type, parentPath })
    if (parentPath) {
      setExpandedPaths((prev) => new Set(prev).add(parentPath))
      void loadFolder(parentPath)
    }
  }, [loadFolder])

  const commitCreate = useCallback(async (name: string) => {
    const draft = createDraft
    setCreateDraft(null)
    const trimmed = name.trim()
    if (!draft || !trimmed) return

    if (draft.type === 'folder') {
      const vaultPath = joinVaultPath(draft.parentPath, trimmed)
      const result = await window.electronAPI.flashqueryManageDirectory(workspaceId, 'create', [vaultPath])
      if (!result.success) {
        showMutationError('Create folder', result.error)
        return
      }
      await refreshAfterVaultMutation(draft.parentPath)
      return
    }

    const filename = ensureMarkdownFilename(trimmed)
    const vaultPath = joinVaultPath(draft.parentPath, filename)
    const result = await window.electronAPI.flashqueryCreateDocument(
      workspaceId,
      vaultPath,
      titleFromDocumentName(filename),
    )
    if (!result.success) {
      showMutationError('Create file', result.error)
      return
    }
    await refreshAfterVaultMutation(draft.parentPath)
  }, [createDraft, refreshAfterVaultMutation, showMutationError, workspaceId])

  const startRename = useCallback((entry: FlashQueryVaultEntry) => {
    setCreateDraft(null)
    setRenameDraft({ vaultPath: entry.vaultPath })
  }, [])

  const commitRename = useCallback(async (entry: FlashQueryVaultEntry, name: string) => {
    setRenameDraft(null)
    const trimmed = name.trim()
    if (!trimmed || trimmed === basename(entry.vaultPath)) return

    const parentPath = parentVaultPath(entry.vaultPath)
    const destination = joinVaultPath(parentPath, entry.type === 'document' ? ensureMarkdownFilename(trimmed) : trimmed)
    const result = entry.type === 'document'
      ? await window.electronAPI.flashqueryMoveDocument(workspaceId, entry.vaultPath, destination)
      : await window.electronAPI.flashqueryManageDirectory(workspaceId, 'rename', [entry.vaultPath], [destination])
    if (!result.success) {
      showMutationError('Rename', result.error)
      return
    }
    await refreshAfterVaultMutation(parentPath)
  }, [refreshAfterVaultMutation, showMutationError, workspaceId])

  const deleteEntry = useCallback(async (entry: FlashQueryVaultEntry) => {
    const confirmed = window.confirm(`Delete "${entry.name}"?${entry.type === 'folder' ? ' FlashQuery will only remove empty folders.' : ''}`)
    if (!confirmed) return
    const parentPath = parentVaultPath(entry.vaultPath)
    const result = entry.type === 'document'
      ? await window.electronAPI.flashqueryRemoveDocument(workspaceId, entry.vaultPath)
      : await window.electronAPI.flashqueryManageDirectory(workspaceId, 'remove', [entry.vaultPath])
    if (!result.success) {
      showMutationError('Delete', result.error)
      return
    }
    await refreshAfterVaultMutation(parentPath)
  }, [refreshAfterVaultMutation, showMutationError, workspaceId])

  const handleBackgroundContextMenu = useCallback(async (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const action = await window.electronAPI.showContextMenu([
      { id: 'new-file', label: 'New File…' },
      { id: 'new-folder', label: 'New Folder…' },
    ])
    if (action === 'new-file') startCreate('file', '')
    if (action === 'new-folder') startCreate('folder', '')
  }, [startCreate])

  const handleRowContextMenu = useCallback(async (entry: FlashQueryVaultEntry, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    selectPath(entry.vaultPath, { cmd: false, shift: false })
    const action = await window.electronAPI.showContextMenu(entry.type === 'document'
      ? [
          { id: 'open', label: 'Open' },
          { id: 'open-frontmatter', label: 'Open frontmatter' },
          { id: 'open-on-canvas', label: 'Open on Canvas' },
          { type: 'separator' },
          { id: 'copy-path', label: 'Copy vault path' },
          { id: 'copy-reference', label: 'Copy as reference' },
          { type: 'separator' },
          { id: 'rename', label: 'Rename…', accelerator: 'Return' },
          { id: 'delete', label: 'Delete', accelerator: 'Cmd+Backspace' },
        ]
      : [
          { id: 'new-file', label: 'New File…' },
          { id: 'new-folder', label: 'New Folder…' },
          { type: 'separator' },
          { id: 'rename', label: 'Rename…', accelerator: 'Return' },
          { id: 'delete', label: 'Delete', accelerator: 'Cmd+Backspace' },
        ])
    if (action === 'open') openDocumentLegacy(entry, 'dock')
    if (action === 'open-frontmatter') useAppStore.getState().openFlashQueryFrontmatterForPath(workspaceId, entry.vaultPath)
    if (action === 'open-on-canvas') openDocumentLegacy(entry, 'canvas')
    if (action === 'copy-path') await navigator.clipboard.writeText(entry.vaultPath)
    if (action === 'copy-reference') await navigator.clipboard.writeText(`{{ref:${entry.vaultPath}}}`)
    if (action === 'new-file') startCreate('file', entry.vaultPath)
    if (action === 'new-folder') startCreate('folder', entry.vaultPath)
    if (action === 'rename') startRename(entry)
    if (action === 'delete') await deleteEntry(entry)
  }, [deleteEntry, openDocumentLegacy, selectPath, startCreate, startRename, workspaceId])

  useEffect(() => {
    if (!connection) {
      setStatus(null)
      setRootEntries([])
      setChildrenByPath({})
      setLoadedFolderPaths(new Set())
      setExpandedPaths(new Set())
      setSelectedPaths(new Set())
      setCreateDraft(null)
      setRenameDraft(null)
      setRootLoaded(false)
      return
    }
    setStatus({ kind: 'connecting' })
    setRootEntries([])
    setChildrenByPath({})
    setLoadedFolderPaths(new Set())
    setExpandedPaths(new Set())
    setSelectedPaths(new Set())
    setCreateDraft(null)
    setRenameDraft(null)
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
    } else if (rootLoaded && rootEntries.length === 0 && !createDraft) {
      body = <EmptyState />
    } else {
      body = (
        <VaultTree
          entries={rootEntries}
          childrenByPath={childrenByPath}
          expandedPaths={expandedPaths}
          loadingPaths={loadingPaths}
          selectedPaths={selectedPaths}
          createDraft={createDraft}
          renameDraft={renameDraft}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowDoubleClick}
          onRowContextMenu={handleRowContextMenu}
          onBackgroundContextMenu={handleBackgroundContextMenu}
          onCommitCreate={commitCreate}
          onCancelCreate={() => setCreateDraft(null)}
          onCommitRename={commitRename}
          onCancelRename={() => setRenameDraft(null)}
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
      <div
        className="flex min-h-0 flex-1 flex-col"
        onContextMenu={status?.kind === 'live' ? handleBackgroundContextMenu : undefined}
      >
        {body}
      </div>
    </div>
  )
}
