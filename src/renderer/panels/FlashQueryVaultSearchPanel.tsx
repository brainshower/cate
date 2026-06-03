import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CircleNotch, MagnifyingGlass, WarningCircle, X } from '@phosphor-icons/react'

import { Chip, type ConnectionStatus } from '../components/Chip'
import { useAppStore } from '../stores/appStore'
import { setPendingFlashQuerySearchReveal } from '../lib/flashquerySearchReveal'
import { buildVaultUri } from '../../shared/flashqueryUri'
import type {
  FlashQueryConnectionStatus,
  FlashQueryDocumentSearchResult,
  FlashQueryMemorySearchResult,
  FlashQuerySearchEntityType,
  FlashQuerySearchMode,
  FlashQuerySearchParams,
  FlashQuerySearchResponse,
} from '../../shared/types'
import type { PanelProps } from './types'

type SearchRow =
  | { kind: 'document'; key: string; result: FlashQueryDocumentSearchResult }
  | { kind: 'memory'; key: string; result: FlashQueryMemorySearchResult }

interface PanelStatus {
  kind: FlashQueryConnectionStatus
  error?: string
}

interface CurrentResults {
  documents: FlashQueryDocumentSearchResult[]
  memories: FlashQueryMemorySearchResult[]
  total_documents: number
  total_memories: number
  query: string
  listAll: boolean
}

const SEMANTIC_EMPTY_TOOLTIP = 'Type a query to search semantically.'
const DEFAULT_LIMIT = 50

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

function statusToChip(status: PanelStatus | null): ConnectionStatus {
  if (!status) return { kind: 'connecting' }
  if (status.kind === 'disconnected') return { kind: 'disconnected', error: status.error }
  return { kind: status.kind }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedText({ text, query, disabled }: { text: string; query: string; disabled: boolean }) {
  if (disabled || !query.trim()) return <>{text}</>
  const regex = new RegExp(`(${escapeRegExp(query.trim())})`, 'ig')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === query.trim().toLowerCase()
          ? <mark key={`${part}-${index}`} className="rounded bg-teal-400/20 px-0.5 text-primary">{part}</mark>
          : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>
      )}
    </>
  )
}

function trimResponse(response: FlashQuerySearchResponse): CurrentResults {
  return {
    documents: response.documents ?? [],
    memories: response.memories ?? [],
    total_documents: response.total_documents ?? 0,
    total_memories: response.total_memories ?? 0,
    query: '',
    listAll: false,
  }
}

export default function FlashQueryVaultSearchPanel({ workspaceId }: PanelProps) {
  const connection = useAppStore((state) =>
    state.workspaces.find((workspace) => workspace.id === workspaceId)?.flashqueryConnection)
  const [status, setStatus] = useState<PanelStatus | null>(connection ? { kind: 'connecting' } : null)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<FlashQuerySearchMode>('mixed')
  const [activeEntities, setActiveEntities] = useState<Set<FlashQuerySearchEntityType>>(
    () => new Set(['documents', 'memories']),
  )
  const [limit, setLimit] = useState(DEFAULT_LIMIT)
  const [results, setResults] = useState<CurrentResults | null>(null)
  const [searched, setSearched] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [highlightedKey, setHighlightedKey] = useState<string | null>(null)
  const [expandedMemoryIds, setExpandedMemoryIds] = useState<Set<string>>(() => new Set())
  const latestRequestRef = useRef(0)
  const e2eInjectedStatusRef = useRef(false)

  const host = useMemo(() => connection ? hostFromUrl(connection.url) : '', [connection])
  const chipState = statusToChip(status)
  const entities = useMemo(() => [...activeEntities], [activeEntities])
  const semanticEmpty = mode === 'semantic' && query.trim().length === 0
  const searchDisabled = !connection || status?.kind === 'disconnected' || searching || semanticEmpty || entities.length === 0

  const retry = useCallback(() => {
    if (!workspaceId) return
    void window.electronAPI.flashqueryRetry(workspaceId)
  }, [workspaceId])

  const openDocument = useCallback((result: FlashQueryDocumentSearchResult, target: 'dock' | 'canvas') => {
    const placement = target === 'dock'
      ? { target: 'dock' as const, zone: 'center' as const }
      : { target: 'canvas' as const }
    const panelId = useAppStore.getState().createEditor(
      workspaceId,
      buildVaultUri(workspaceId, result.fullPath),
      undefined,
      placement,
    )
    useAppStore.getState().updatePanelTitle(workspaceId, panelId, result.filename || result.title || result.fullPath)
  }, [workspaceId])

  const revealDocument = useCallback((result: FlashQueryDocumentSearchResult) => {
    setPendingFlashQuerySearchReveal(workspaceId, result.fullPath)
    const workspace = useAppStore.getState().workspaces.find((candidate) => candidate.id === workspaceId)
    const hasVaultPanel = Object.values(workspace?.panels ?? {}).some((panel) => panel.type === 'flashqueryVault')
    if (!hasVaultPanel) {
      useAppStore.getState().createFlashQueryVault(workspaceId, undefined, { target: 'dock', zone: 'left' })
    }
  }, [workspaceId])

  const copyDocumentValue = useCallback(async (value: string) => {
    await navigator.clipboard.writeText(value)
  }, [])

  const toggleMemoryInspector = useCallback((result: FlashQueryMemorySearchResult) => {
    setExpandedMemoryIds((prev) => {
      const next = new Set(prev)
      if (next.has(result.id)) next.delete(result.id)
      else next.add(result.id)
      return next
    })
  }, [])

  const clearResultsForDisconnect = useCallback((message?: string) => {
    latestRequestRef.current += 1
    setSearching(false)
    setResults(null)
    setError(message ?? 'FlashQuery is disconnected.')
  }, [])

  const dispatchSearch = useCallback(async (nextLimit = DEFAULT_LIMIT) => {
    if (searchDisabled && !(mode !== 'semantic' && query.trim().length === 0 && entities.length > 0)) return
    if (searching || !connection || status?.kind === 'disconnected' || entities.length === 0) return
    if (semanticEmpty) return

    const requestId = latestRequestRef.current + 1
    latestRequestRef.current = requestId
    const trimmedQuery = query.trim()
    const params: FlashQuerySearchParams = {
      query: trimmedQuery,
      mode,
      entity_types: entities,
      limit: nextLimit,
    }
    setSearching(true)
    setSearched(true)
    setError(null)
    try {
      const response = await window.electronAPI.flashquerySearch(workspaceId, params)
      if (requestId !== latestRequestRef.current) return
      if (response.error) {
        setResults(null)
        setError(response.error)
        return
      }
      setLimit(nextLimit)
      setSelectedKey(null)
      setHighlightedKey(null)
      setExpandedMemoryIds(new Set())
      setResults({
        ...trimResponse(response),
        query: trimmedQuery,
        listAll: trimmedQuery.length === 0 && mode !== 'semantic',
      })
    } catch (err) {
      if (requestId !== latestRequestRef.current) return
      setResults(null)
      setError(err instanceof Error ? err.message : 'Search failed.')
    } finally {
      if (requestId === latestRequestRef.current) setSearching(false)
    }
  }, [connection, entities, mode, query, searchDisabled, searching, semanticEmpty, status?.kind, workspaceId])

  const showMore = useCallback(() => {
    void dispatchSearch(limit + DEFAULT_LIMIT)
  }, [dispatchSearch, limit])

  const toggleEntity = useCallback((entity: FlashQuerySearchEntityType) => {
    setActiveEntities((prev) => {
      const next = new Set(prev)
      if (next.has(entity)) next.delete(entity)
      else next.add(entity)
      return next
    })
  }, [])

  const clearSearch = useCallback(() => {
    setQuery('')
    setResults(null)
    setSearched(false)
    setError(null)
    setLimit(DEFAULT_LIMIT)
  }, [])

  useEffect(() => {
    if (!connection) {
      setStatus(null)
      clearResultsForDisconnect('No FlashQuery connection configured.')
      return
    }
    setStatus({ kind: 'connecting' })
    setResults(null)
    setSearched(false)
    setError(null)
  }, [clearResultsForDisconnect, connection])

  useEffect(() => {
    return window.electronAPI.onFlashQueryStatus((payload) => {
      if (payload.workspaceId !== workspaceId) return
      e2eInjectedStatusRef.current = false
      setStatus({ kind: payload.status, error: payload.error })
      if (payload.status === 'disconnected') clearResultsForDisconnect(payload.error)
    })
  }, [clearResultsForDisconnect, workspaceId])

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
      if (payload.status === 'disconnected') clearResultsForDisconnect(payload.error)
    }
    window.addEventListener('cate:e2e-flashquery-status', handleE2EStatus)
    return () => window.removeEventListener('cate:e2e-flashquery-status', handleE2EStatus)
  }, [clearResultsForDisconnect, workspaceId])

  useEffect(() => {
    if (!connection || status?.kind !== 'connecting') return
    if (e2eInjectedStatusRef.current) return
    void window.electronAPI.flashqueryRetry(workspaceId)
  }, [connection, status?.kind, workspaceId])

  const rows = useMemo<SearchRow[]>(() => {
    if (!results) return []
    return [
      ...results.documents.map((result) => ({ kind: 'document' as const, key: `document:${result.fullPath}`, result })),
      ...results.memories.map((result) => ({ kind: 'memory' as const, key: `memory:${result.id}`, result })),
    ]
  }, [results])

  const rowIndex = useMemo(() => {
    if (!highlightedKey) return -1
    return rows.findIndex((row) => row.key === highlightedKey)
  }, [highlightedKey, rows])

  const selectRow = useCallback((row: SearchRow) => {
    setSelectedKey(row.key)
    setHighlightedKey(row.key)
  }, [])

  const activateRow = useCallback((row: SearchRow, target: 'dock' | 'canvas') => {
    selectRow(row)
    if (row.kind === 'document') openDocument(row.result, target)
    else toggleMemoryInspector(row.result)
  }, [openDocument, selectRow, toggleMemoryInspector])

  const handleResultsKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (rows.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      const nextIndex = rowIndex < 0
        ? (delta > 0 ? 0 : rows.length - 1)
        : Math.max(0, Math.min(rows.length - 1, rowIndex + delta))
      setHighlightedKey(rows[nextIndex].key)
      setSelectedKey(rows[nextIndex].key)
    }
    if (event.key === 'Enter' && highlightedKey) {
      event.preventDefault()
      const row = rows.find((candidate) => candidate.key === highlightedKey)
      if (row) activateRow(row, event.metaKey || event.ctrlKey ? 'canvas' : 'dock')
    }
  }, [activateRow, highlightedKey, rowIndex, rows])

  const renderDocumentRow = (result: FlashQueryDocumentSearchResult) => {
    const title = result.title || result.filename
    const row: SearchRow = { kind: 'document', key: `document:${result.fullPath}`, result }
    const selected = selectedKey === row.key
    return (
      <div
        key={result.fullPath}
        data-testid={`vault-search-document-${result.fullPath}`}
        role="listitem"
        aria-selected={selected}
        className={`rounded border px-2.5 py-2 text-xs ${selected ? 'border-teal-400 bg-surface-5' : 'border-subtle bg-surface-3'}`}
        onClick={() => selectRow(row)}
        onDoubleClick={() => activateRow(row, 'dock')}
        onContextMenu={async (event) => {
          event.preventDefault()
          selectRow(row)
          const action = await window.electronAPI.showContextMenu([
            { id: 'open', label: 'Open' },
            { id: 'open-on-canvas', label: 'Open on Canvas' },
            { id: 'reveal', label: 'Reveal in Vault Tree' },
            { id: 'copy-path', label: 'Copy vault path' },
            { id: 'copy-reference', label: 'Copy as reference' },
          ])
          if (action === 'open') openDocument(result, 'dock')
          if (action === 'open-on-canvas') openDocument(result, 'canvas')
          if (action === 'reveal') revealDocument(result)
          if (action === 'copy-path') await copyDocumentValue(result.fullPath)
          if (action === 'copy-reference') await copyDocumentValue(`{{ref:${result.fullPath}}}`)
        }}
      >
        <div className="font-medium text-primary">
          <HighlightedText text={title} query={results?.query ?? ''} disabled={!!results?.listAll} />
        </div>
        <div className="mt-0.5 text-muted">
          <HighlightedText text={result.fullPath} query={results?.query ?? ''} disabled={!!results?.listAll} />
        </div>
        {result.snippet && (
          <div className="mt-1 line-clamp-2 text-secondary">
            <HighlightedText text={result.snippet} query={results?.query ?? ''} disabled={!!results?.listAll} />
          </div>
        )}
      </div>
    )
  }

  const renderMemoryRow = (result: FlashQueryMemorySearchResult) => {
    const row: SearchRow = { kind: 'memory', key: `memory:${result.id}`, result }
    const selected = selectedKey === row.key
    const expanded = expandedMemoryIds.has(result.id)
    const bodyText = result.text || result.snippet || ''
    return (
      <div
        key={result.id}
        data-testid={`vault-search-memory-${result.id}`}
        role="listitem"
        aria-selected={selected}
        aria-expanded={expanded}
        className={`rounded border px-2.5 py-2 text-xs ${selected ? 'border-teal-400 bg-surface-5' : 'border-subtle bg-surface-3'}`}
        onClick={() => selectRow(row)}
        onDoubleClick={() => toggleMemoryInspector(result)}
        onContextMenu={(event) => event.preventDefault()}
      >
        <div className="font-medium text-primary">
          <HighlightedText text={result.title || 'Memory'} query={results?.query ?? ''} disabled={!!results?.listAll} />
        </div>
        <div className="mt-1 line-clamp-3 text-secondary">
          <HighlightedText text={bodyText} query={results?.query ?? ''} disabled={!!results?.listAll} />
        </div>
        {expanded && (
          <div className="mt-2 rounded bg-surface-2 px-2 py-2 text-secondary">
            {result.title && <div className="mb-1 font-medium text-primary">{result.title}</div>}
            <div>{bodyText}</div>
          </div>
        )}
      </div>
    )
  }

  const renderGroup = (
    entity: FlashQuerySearchEntityType,
    label: string,
    total: number,
    children: React.ReactNode,
  ) => {
    if (!activeEntities.has(entity)) return null
    const hasRows = entity === 'documents'
      ? (results?.documents.length ?? 0) > 0
      : (results?.memories.length ?? 0) > 0
    return (
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-normal text-muted">{label}</h3>
          <span className="text-[11px] text-muted">{total}</span>
        </div>
        {hasRows ? <div role="list" className="flex flex-col gap-1.5">{children}</div> : <div className="rounded bg-surface-3 px-3 py-4 text-center text-xs text-muted">No results.</div>}
        {hasRows && total > (entity === 'documents' ? results!.documents.length : results!.memories.length) && (
          <button
            type="button"
            className="self-start rounded bg-surface-5 px-2.5 py-1 text-xs text-secondary transition-colors hover:bg-hover hover:text-primary"
            onClick={showMore}
          >
            Show more
          </button>
        )}
      </section>
    )
  }

  let body: React.ReactNode
  if (!connection) {
    body = (
      <div className="flex flex-1 items-center justify-center px-5 text-center text-xs text-muted">
        No FlashQuery connection configured.
      </div>
    )
  } else if (status?.kind === 'disconnected') {
    body = (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center text-xs">
        <WarningCircle data-testid="vault-search-disconnected-icon" size={28} className="text-muted" />
        <div className="text-primary">Can't reach FlashQuery.</div>
        <div className="max-w-80 text-muted">{status.error ?? `Unable to connect to ${host}.`}</div>
      </div>
    )
  } else if (activeEntities.size === 0) {
    body = <div className="px-3 py-6 text-center text-xs text-muted">Enable Documents or Memories to see results.</div>
  } else if (error) {
    body = <div className="px-3 py-6 text-center text-xs text-red-400">{error}</div>
  } else if (!searched) {
    body = <div className="px-3 py-6 text-center text-xs text-muted">Type a query and press Search.</div>
  } else if (results) {
    body = (
      <div
        className="flex flex-col gap-4 p-3"
        tabIndex={0}
        role="listbox"
        aria-label="Vault search results"
        onKeyDown={handleResultsKeyDown}
      >
        {renderGroup('documents', 'Vault', results.total_documents, results.documents.map(renderDocumentRow))}
        {renderGroup('memories', 'Memories', results.total_memories, results.memories.map(renderMemoryRow))}
      </div>
    )
  } else {
    body = <div className="px-3 py-6 text-center text-xs text-muted">No results.</div>
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-surface-4">
      <div data-testid="vault-search-panel-header" className="flex h-8 shrink-0 items-center gap-2 border-b border-subtle px-3">
        <MagnifyingGlass size={15} className="shrink-0 text-teal-400" />
        <div className="min-w-0 flex-1 truncate text-xs font-medium text-primary">Vault Search</div>
        {host && <span className="min-w-0 truncate text-xs text-muted">· {host}</span>}
        {connection && <Chip state={chipState} onRetry={retry} />}
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-b border-subtle p-3">
        <div className="flex items-center gap-2">
          <input
            aria-label="Search the vault"
            className="min-w-0 flex-1 rounded border border-subtle bg-surface-2 px-2.5 py-1.5 text-xs text-primary outline-none placeholder:text-muted focus:border-teal-400"
            placeholder="Search the vault..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void dispatchSearch(DEFAULT_LIMIT)
              if (event.key === 'Escape') clearSearch()
            }}
          />
          <button
            type="button"
            aria-label="Clear search"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-primary"
            onClick={clearSearch}
          >
            <X size={13} />
          </button>
          <button
            type="button"
            title={semanticEmpty ? SEMANTIC_EMPTY_TOOLTIP : undefined}
            className="flex h-7 min-w-16 items-center justify-center gap-1.5 rounded bg-teal-500 px-3 text-xs font-medium text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
            disabled={searchDisabled}
            onClick={() => void dispatchSearch(DEFAULT_LIMIT)}
          >
            {searching && <CircleNotch aria-label="Searching" size={12} style={{ animation: 'spin 0.9s linear infinite' }} />}
            Search
          </button>
        </div>
        {semanticEmpty && <div role="tooltip" className="text-[11px] text-muted">{SEMANTIC_EMPTY_TOOLTIP}</div>}
        <div className="flex flex-wrap items-center gap-2">
          {(['filesystem', 'mixed', 'semantic'] as FlashQuerySearchMode[]).map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={mode === candidate}
              className={`rounded px-2 py-1 text-xs capitalize transition-colors ${mode === candidate ? 'bg-surface-5 text-primary' : 'text-muted hover:bg-hover hover:text-primary'}`}
              onClick={() => setMode(candidate)}
            >
              {candidate}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-border" />
          {(['documents', 'memories'] as FlashQuerySearchEntityType[]).map((entity) => (
            <button
              key={entity}
              type="button"
              aria-pressed={activeEntities.has(entity)}
              className={`rounded px-2 py-1 text-xs capitalize transition-colors ${activeEntities.has(entity) ? 'bg-surface-5 text-primary' : 'text-muted hover:bg-hover hover:text-primary'}`}
              onClick={() => toggleEntity(entity)}
            >
              {entity}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {body}
      </div>
    </div>
  )
}
