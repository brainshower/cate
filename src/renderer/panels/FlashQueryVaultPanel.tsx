import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowsClockwise, FileText, Folder, Vault } from '@phosphor-icons/react'

import { Chip, type ConnectionStatus } from '../components/Chip'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'
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
      <div className="text-primary">This vault has no documents yet.</div>
      <div className="max-w-72 text-muted">Create a document in FlashQuery to see it here.</div>
    </div>
  )
}

interface VaultTreeProps {
  entries: FlashQueryVaultEntry[]
}

function VaultTree({ entries }: VaultTreeProps) {
  return (
    <div className="flex-1 overflow-auto px-1 py-1 text-xs" role="tree" aria-label="FlashQuery vault">
      {entries.map((entry) => {
        const isFolder = entry.type === 'folder'
        const Icon = isFolder ? Folder : FileText
        const label = entry.type === 'document' ? entry.title ?? entry.name : entry.name
        return (
          <div
            key={entry.vaultPath}
            role="treeitem"
            className="flex h-7 items-center gap-2 rounded px-2 text-secondary hover:bg-hover hover:text-primary"
          >
            <Icon size={14} weight={isFolder ? 'fill' : 'regular'} className={isFolder ? 'text-teal-400' : 'text-muted'} />
            <span className="min-w-0 truncate">{label}</span>
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
  const [rootLoading, setRootLoading] = useState(false)
  const [rootLoaded, setRootLoaded] = useState(false)
  const listRequestRef = useRef(0)

  const host = useMemo(() => connection ? hostFromUrl(connection.url) : '', [connection])
  const chipState = statusToChip(status)

  const retry = useCallback(() => {
    if (!workspaceId) return
    void window.electronAPI.flashqueryRetry(workspaceId)
  }, [workspaceId])

  const loadRoot = useCallback(async () => {
    const requestId = ++listRequestRef.current
    setRootLoading(true)
    try {
      const entries = await window.electronAPI.flashqueryListVault(workspaceId)
      if (requestId !== listRequestRef.current) return
      setRootEntries(entries)
      setRootLoaded(true)
    } finally {
      if (requestId === listRequestRef.current) setRootLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!connection) {
      setStatus(null)
      setRootEntries([])
      setRootLoaded(false)
      return
    }
    setStatus({ kind: 'connecting' })
    setRootEntries([])
    setRootLoaded(false)
  }, [connection])

  useEffect(() => {
    return window.electronAPI.onFlashQueryStatus((payload) => {
      if (payload.workspaceId !== workspaceId) return
      setStatus({ kind: payload.status, error: payload.error })
    })
  }, [workspaceId])

  useEffect(() => {
    if (!connection || status?.kind !== 'live') return
    void loadRoot()
  }, [connection, loadRoot, status?.kind])

  let body: React.ReactNode
  if (!connection) {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center text-xs">
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
      body = <VaultTree entries={rootEntries} />
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
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-subtle px-3">
        <Vault size={16} weight="duotone" className="shrink-0 text-teal-400" />
        <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
          {host && <span className="min-w-0 truncate text-xs text-muted">· {host}</span>}
          <span className="shrink-0 text-xs font-medium text-primary">FlashQuery Vault</span>
        </div>
        {connection && (
          <Chip state={chipState} onRetry={retry} />
        )}
        <button
          type="button"
          aria-label="Refresh vault"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-primary"
          onClick={loadRoot}
        >
          <ArrowsClockwise size={14} />
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {body}
      </div>
    </div>
  )
}
