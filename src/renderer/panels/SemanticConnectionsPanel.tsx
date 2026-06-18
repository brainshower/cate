import { ArrowSquareOut, SlidersHorizontal } from '@phosphor-icons/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SemanticConnectionsPanelProps } from './types'
import {
  arrangeForDisplay,
  getAllRels,
  scEdgeLabel,
  type SemanticConnection,
  type SemanticConnectionSortMode,
  type SemanticConnectionsProvider,
  type SemanticConnectionsResult,
} from '../lib/semanticConnections'
import { createFlashQuerySemanticConnectionsProvider } from '../lib/semanticConnectionsProvider'
import { buildVaultUri, parseVaultUri } from '../../shared/flashqueryUri'
import {
  getActiveEditorSnapshot,
  getEditorSnapshotForPath,
  getEditorSnapshotForPanel,
  subscribeActiveEditor,
  type ActiveEditorSnapshot,
} from '../lib/activeEditorRegistry'
import { setPendingReveal } from '../lib/editorReveal'
import { openFileAsPanel } from '../lib/fileRouting'
import { parseDocumentHeadings } from '../lib/parseDocumentHeadings'
import { usePreviewSelectionStore } from '../stores/previewSelectionStore'
import { useSemanticConnectionsChromeStore } from '../stores/semanticConnectionsChromeStore'

const emptyResult: SemanticConnectionsResult = {
  mode: 'embeddings-only',
  overall: [],
  byChunkId: {},
  chunkOrder: [],
  chunkMap: {},
  diagnostics: [],
}

const flashQueryProvider = createFlashQuerySemanticConnectionsProvider()

const defaultProvider: SemanticConnectionsProvider = {
  async loadDocumentConnections(input) {
    const e2eProvider = typeof window !== 'undefined'
      ? window.__cateE2E?.semanticConnectionsProvider?.()
      : undefined
    if (e2eProvider) return e2eProvider.loadDocumentConnections(input)
    return flashQueryProvider.loadDocumentConnections(input)
  },
}

type LoadIssue = 'flashquery-unavailable' | 'no-vault' | 'adapter-error' | 'malformed' | null

function markdownFromSnapshot(snapshot: ActiveEditorSnapshot): string {
  const model = snapshot.model
  if (!model) return ''
  const lines: string[] = []
  for (let index = 1; index <= model.getLineCount(); index++) {
    lines.push(model.getLineContent(index))
  }
  return lines.join('\n')
}

function contentHash(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return String(hash)
}

function cacheKey(workspaceId: string, editorPanelId: string, documentPath: string, hash: string): string {
  return [workspaceId, editorPanelId, documentPath, hash].join('\u001f')
}

function documentCacheKey(workspaceId: string, editorPanelId: string, documentPath: string): string {
  return [workspaceId, editorPanelId, documentPath].join('\u001f')
}

function isMarkdownPath(path: string | undefined): boolean {
  return !path || /\.mdx?$/i.test(path)
}

function isSemanticConnectionsResult(value: unknown): value is SemanticConnectionsResult {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SemanticConnectionsResult>
  return (candidate.mode === 'embeddings-only' || candidate.mode === 'mixed' || candidate.mode === 'typed')
    && Array.isArray(candidate.overall)
    && candidate.overall.every(isSemanticConnection)
    && Boolean(candidate.byChunkId)
    && typeof candidate.byChunkId === 'object'
    && Object.values(candidate.byChunkId).every((connections) => Array.isArray(connections) && connections.every(isSemanticConnection))
    && Array.isArray(candidate.chunkOrder)
    && candidate.chunkOrder.every((chunkId) => typeof chunkId === 'string')
    && Boolean(candidate.chunkMap)
    && typeof candidate.chunkMap === 'object'
    && Array.isArray(candidate.diagnostics)
    && candidate.diagnostics.every((diagnostic) => typeof diagnostic === 'string')
}

function isSemanticConnection(value: unknown): value is SemanticConnection {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SemanticConnection>
  const target = candidate.target as Partial<SemanticConnection['target']> | undefined
  return typeof candidate.id === 'string'
    && typeof candidate.score === 'number'
    && Number.isFinite(candidate.score)
    && Boolean(target)
    && typeof target?.title === 'string'
    && typeof target.path === 'string'
    && typeof target.chunkId === 'string'
    && typeof target.snippet === 'string'
}

function issueFromError(error: unknown): Exclude<LoadIssue, null> {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as { code?: unknown }).code) : ''
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
  if (code === 'NO_VAULT_CONNECTED' || message.includes('no vault')) return 'no-vault'
  if (code === 'FLASHQUERY_UNAVAILABLE' || message.includes('unavailable') || message.includes('service down')) {
    return 'flashquery-unavailable'
  }
  return 'adapter-error'
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? 'connection' : 'connections'}`
}

function plainTextFromMarkdown(markdown: string): string {
  return markdown
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/^```[^\n]*\n?|\n?```$/g, ' '))
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/<((?:https?|mailto):[^>]+)>/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function resultConnections(result: SemanticConnectionsResult, activeChunkId: string | null): readonly SemanticConnection[] {
  if (activeChunkId) return result.byChunkId[activeChunkId] ?? []
  return result.overall
}

function displayLimit(topN: number, connectionCount: number): number {
  if (connectionCount === 0) return 0
  if (topN === Infinity) return connectionCount
  return Math.min(connectionCount, Math.max(1, topN))
}

function normalizeTopN(value: string, connectionCount: number): number {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric >= connectionCount) return Infinity
  return Math.min(connectionCount, Math.max(1, numeric))
}

function hasOpenMetadata(connection: SemanticConnection): boolean {
  return Boolean(connection.target.path?.trim() && connection.target.heading?.trim() && connection.target.chunkId?.trim())
}

function revealHeadingInSourceEditor(snapshot: ActiveEditorSnapshot, heading: string): boolean {
  const editor = snapshot.editor
  const model = snapshot.model
  if (!editor || !model) return false
  const target = parseDocumentHeadings(model, 6).find((entry) => entry.text === heading)
  if (!target) return false
  editor.revealLineInCenter(target.line)
  editor.setPosition({ lineNumber: target.line, column: 1 })
  editor.focus()
  return true
}

function isAbsoluteLocalPath(path: string): boolean {
  return path.startsWith('/') || /^[A-Za-z]:[\\/]/.test(path)
}

function hasUriScheme(path: string): boolean {
  return /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(path)
}

function editorPathForTarget(workspaceId: string, sourceDocumentPath: string | undefined, targetPath: string): string {
  if (parseVaultUri(targetPath) || hasUriScheme(targetPath) || isAbsoluteLocalPath(targetPath)) return targetPath
  const sourceVaultUri = sourceDocumentPath ? parseVaultUri(sourceDocumentPath) : null
  return buildVaultUri(sourceVaultUri?.workspaceId ?? workspaceId, targetPath)
}

function StateMessage({
  title,
  detail,
  action,
}: {
  title: string
  detail: string
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-4 text-sm text-secondary">
      <div className="max-w-[28rem] space-y-3">
        <p className="text-sm font-medium text-primary">{title}</p>
        <p className="leading-relaxed">{detail}</p>
        {action && (
          <button
            type="button"
            className="rounded border border-subtle px-2.5 py-1 text-xs text-primary hover:bg-hover"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}

function ScorePie({ score }: { score: number }) {
  const label = `Cosine similarity ${Math.round(score * 100)}%`
  const degrees = Math.max(0, Math.min(1, score)) * 360
  return (
    <div
      aria-label={label}
      title={label}
      className="h-11 w-11 shrink-0 rounded-full border border-teal-400/30"
      style={{ background: `conic-gradient(rgb(45 212 191) ${degrees}deg, rgba(148, 163, 184, 0.18) 0deg)` }}
    >
      <div className="m-[9px] h-[24px] w-[24px] rounded-full bg-surface" />
    </div>
  )
}

function ConnectionCard({
  connection,
  onOpen,
}: {
  connection: SemanticConnection
  onOpen: (connection: SemanticConnection) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const typedLabel = connection.rel ? scEdgeLabel(connection.rel, connection.dir) : null
  const heading = connection.target.heading
  const expandLabel = `${expanded ? 'Collapse' : 'Expand'} ${connection.target.title}${heading ? ` ${heading}` : ''}`
  const openLabel = `Open ${connection.target.title}${heading ? ` ${heading}` : ''}`
  const openEnabled = hasOpenMetadata(connection)
  const rawDisplayText = expanded && connection.target.body ? connection.target.body : connection.target.snippet
  const displayText = plainTextFromMarkdown(rawDisplayText) || rawDisplayText

  return (
    <article
      data-testid={`semantic-connection-card-${connection.id}`}
      className="group w-full rounded-md border border-subtle bg-surface px-3 py-3 shadow-sm"
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          aria-expanded={expanded}
          aria-label={expandLabel}
          onClick={() => connection.target.body && setExpanded((value) => !value)}
          onKeyDown={(event) => {
            if (!connection.target.body || (event.key !== 'Enter' && event.key !== ' ')) return
            event.preventDefault()
            setExpanded((value) => !value)
          }}
          disabled={!connection.target.body}
        >
          <span className="block truncate text-sm font-medium text-primary">{connection.target.title}</span>
          {heading && <span className="mt-0.5 block truncate text-[13.5px] font-medium text-primary opacity-90">{heading}</span>}
        </button>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            className="grid h-7 w-7 place-items-center rounded text-secondary opacity-0 transition-opacity hover:bg-hover hover:text-primary focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"
            aria-label={openLabel}
            title={openLabel}
            disabled={!openEnabled}
            onClick={(event) => {
              event.stopPropagation()
              if (openEnabled) onOpen(connection)
            }}
          >
            <ArrowSquareOut size={16} weight="bold" />
          </button>
          <ScorePie score={connection.score} />
        </div>
      </div>
      {typedLabel && (
        <div className="mt-2 inline-flex rounded border border-teal-400/25 bg-teal-400/10 px-2 py-0.5 text-[11px] font-medium text-teal-100">
          {typedLabel}
        </div>
      )}
      <p className="mt-3 text-sm leading-relaxed text-secondary">
        {displayText}
      </p>
    </article>
  )
}

export default function SemanticConnectionsPanel({
  panelId,
  workspaceId,
  sourceEditorPanelId,
  sourceFilePath,
  provider = defaultProvider,
  createEditorForOpen,
}: SemanticConnectionsPanelProps) {
  const [snapshot, setSnapshot] = useState<ActiveEditorSnapshot>(() =>
    sourceEditorPanelId ? getEditorSnapshotForPanel(workspaceId, sourceEditorPanelId) : getActiveEditorSnapshot(workspaceId),
  )
  const selectionScopeId = snapshot.panelId ?? sourceEditorPanelId ?? null
  const activeChunkId = usePreviewSelectionStore((state) => state.getScope(selectionScopeId).activeChunkId)
  const [result, setResult] = useState<SemanticConnectionsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadIssue, setLoadIssue] = useState<LoadIssue>(null)
  const [loadKey, setLoadKey] = useState(0)
  const [configOpen, setConfigOpen] = useState(false)
  const [sortMode, setSortMode] = useState<SemanticConnectionSortMode>('similarity')
  const [activeRelFilters, setActiveRelFilters] = useState<ReadonlySet<string>>(() => new Set())
  const [topN, setTopN] = useState<number>(Infinity)
  const requestRef = useRef(0)
  const resultCacheRef = useRef(new Map<string, SemanticConnectionsResult>())
  const latestResultRef = useRef(new Map<string, { hash: string; result: SemanticConnectionsResult }>())

  const markdown = useMemo(() => markdownFromSnapshot(snapshot), [snapshot])
  const markdownHash = useMemo(() => contentHash(markdown), [markdown])
  const documentPath = sourceFilePath ?? snapshot.filePath ?? (snapshot.panelId ? `${snapshot.panelId}.md` : undefined)
  const precondition =
    !snapshot.panelId ? 'no-editor'
      : !isMarkdownPath(documentPath) ? 'unsupported'
        : !snapshot.markdownPreview ? 'source'
          : null

  useEffect(() => {
    const refresh = () => {
      setSnapshot(sourceEditorPanelId
        ? getEditorSnapshotForPanel(workspaceId, sourceEditorPanelId)
        : getActiveEditorSnapshot(workspaceId))
    }
    refresh()
    return subscribeActiveEditor(workspaceId, refresh)
  }, [sourceEditorPanelId, workspaceId])

  const openRegisteredPreview = useCallback((targetSnapshot: ActiveEditorSnapshot, heading: string, chunkId: string): boolean => {
    if (!targetSnapshot.panelId || !targetSnapshot.markdownPreview || !targetSnapshot.scrollPreviewToHeading) return false
    targetSnapshot.scrollPreviewToHeading(heading)
    usePreviewSelectionStore.getState().selectSection(chunkId, targetSnapshot.panelId)
    targetSnapshot.editor?.focus()
    return true
  }, [])

  const handleOpenConnection = useCallback((connection: SemanticConnection) => {
    if (!hasOpenMetadata(connection)) return
    const { target } = connection
    const heading = target.heading!
    const chunkId = target.chunkId
    const path = target.path
    const editorPath = editorPathForTarget(workspaceId, documentPath, path)
    const sameDocument = target.inDocument || path === documentPath || editorPath === documentPath

    if (sameDocument) {
      snapshot.scrollPreviewToHeading?.(heading)
      usePreviewSelectionStore.getState().selectSection(chunkId, selectionScopeId)
      return
    }

    const registered = getEditorSnapshotForPath(workspaceId, editorPath)
    if (registered.panelId) {
      if (!openRegisteredPreview(registered, heading, chunkId) && !revealHeadingInSourceEditor(registered, heading)) {
        registered.editor?.focus()
      }
      return
    }

    const sourcePanelId = snapshot.panelId ?? sourceEditorPanelId
    if (createEditorForOpen) {
      const targetPanelId = createEditorForOpen(workspaceId, editorPath, { sourceEditorPanelId: sourcePanelId ?? undefined })
      setPendingReveal(targetPanelId, { headingText: heading })
      return
    }

    const targetPanelId = openFileAsPanel(workspaceId, editorPath, undefined, { target: 'dock', zone: 'center' })
    setPendingReveal(targetPanelId, { headingText: heading })
  }, [createEditorForOpen, documentPath, openRegisteredPreview, selectionScopeId, snapshot, sourceEditorPanelId, workspaceId])

  useEffect(() => {
    if (precondition || !snapshot.panelId || !documentPath) return
    const key = cacheKey(workspaceId, snapshot.panelId, documentPath, markdownHash)
    const docKey = documentCacheKey(workspaceId, snapshot.panelId, documentPath)
    const cached = loadKey === 0 ? resultCacheRef.current.get(key) : undefined
    if (cached) {
      setResult(cached)
      setLoading(false)
      setLoadIssue(null)
      return
    }

    const latest = latestResultRef.current.get(docKey)
    if (latest && latest.hash !== markdownHash) {
      setResult({ ...latest.result, stale: true })
    }

    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setLoading(true)
    setLoadIssue(null)
    provider.loadDocumentConnections({
      workspaceId,
      editorPanelId: snapshot.panelId,
      documentPath,
      markdown,
      contentHash: markdownHash,
      scopeChunkId: activeChunkId,
    }).then((nextResult) => {
      if (requestRef.current !== requestId) return
      if (!isSemanticConnectionsResult(nextResult)) {
        setResult(null)
        setLoadIssue('malformed')
        return
      }
      resultCacheRef.current.set(key, nextResult)
      latestResultRef.current.set(docKey, { hash: markdownHash, result: nextResult })
      setResult(nextResult)
      setLoadIssue(null)
    }).catch((error) => {
      if (requestRef.current !== requestId) return
      setResult(null)
      setLoadIssue(issueFromError(error))
    }).finally(() => {
      if (requestRef.current === requestId) setLoading(false)
    })
  }, [activeChunkId, documentPath, loadKey, markdown, markdownHash, precondition, provider, snapshot.panelId, workspaceId])

  const allRels = useMemo(() => getAllRels(result ?? emptyResult), [result])
  const hasTypedControls = allRels.length > 0
  const scopedConnections = useMemo(() => resultConnections(result ?? emptyResult, activeChunkId), [activeChunkId, result])
  const connectedChunkIds = useMemo(() => (
    Object.entries((result ?? emptyResult).byChunkId)
      .filter(([, connections]) => connections.length > 0)
      .map(([chunkId]) => chunkId)
  ), [result])
  const filteredConnections = useMemo(() => {
    if (!hasTypedControls || activeRelFilters.size === 0) return scopedConnections
    return scopedConnections.filter((connection) => connection.rel && activeRelFilters.has(connection.rel))
  }, [activeRelFilters, hasTypedControls, scopedConnections])
  const sortedConnections = useMemo(() => (
    arrangeForDisplay(filteredConnections, hasTypedControls ? sortMode : 'similarity')
  ), [filteredConnections, hasTypedControls, sortMode])
  const limit = displayLimit(topN, sortedConnections.length)
  const visibleConnections = sortedConnections.slice(0, limit)
  const hiddenCount = Math.max(0, sortedConnections.length - visibleConnections.length)
  const configActive = topN !== Infinity || activeRelFilters.size > 0
  const sliderValue = topN === Infinity ? String(Math.max(1, sortedConnections.length)) : String(displayLimit(topN, sortedConnections.length))
  const scopedCountLabel = countLabel(scopedConnections.length)

  useEffect(() => {
    if (topN !== Infinity && sortedConnections.length > 0 && topN >= sortedConnections.length) setTopN(Infinity)
  }, [sortedConnections.length, topN])

  useEffect(() => {
    setActiveRelFilters((current) => {
      const allowed = new Set<string>(allRels)
      const next = new Set([...current].filter((rel) => allowed.has(rel)))
      return next.size === current.size ? current : next
    })
  }, [allRels])

  useEffect(() => {
    usePreviewSelectionStore.getState().setConnectedChunkIds(connectedChunkIds, selectionScopeId)
    return () => {
      usePreviewSelectionStore.getState().setConnectedChunkIds([], selectionScopeId)
    }
  }, [connectedChunkIds, selectionScopeId])

  const toggleConfig = useCallback(() => setConfigOpen((value) => !value), [])

  useEffect(() => {
    useSemanticConnectionsChromeStore.getState().setPanelChrome(panelId, {
      connectionCount: scopedConnections.length,
      configOpen,
      configActive,
      toggleConfig,
    })
    return () => {
      useSemanticConnectionsChromeStore.getState().clearPanelChrome(panelId)
    }
  }, [configActive, configOpen, panelId, scopedConnections.length, toggleConfig])

  const toggleRelFilter = useCallback((rel: string) => {
    setActiveRelFilters((current) => {
      const next = new Set(current)
      if (next.has(rel)) next.delete(rel)
      else next.add(rel)
      return next
    })
  }, [])

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-surface-2 text-primary"
      data-panel-id={panelId}
      data-testid="semantic-connections-panel"
      data-semantic-diagnostics-count={result?.diagnostics.length ? String(result.diagnostics.length) : undefined}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          usePreviewSelectionStore.getState().clearSelection(selectionScopeId)
        }
      }}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-subtle px-3">
        <span className="text-[11px] font-medium uppercase tracking-normal text-muted">Scope</span>
        <button
          type="button"
          className={`rounded border px-2 py-1 text-xs font-medium ${activeChunkId ? 'border-subtle text-secondary hover:text-primary' : 'border-teal-400/50 bg-teal-400/10 text-teal-100'}`}
          aria-pressed={!activeChunkId}
          aria-label="Show whole document semantic connections"
          onClick={() => usePreviewSelectionStore.getState().clearSelection(selectionScopeId)}
        >
          Whole Document
        </button>
        <button
          type="button"
          className={`rounded border px-2 py-1 text-xs font-medium ${activeChunkId ? 'border-teal-400/50 bg-teal-400/10 text-teal-100' : 'border-subtle text-secondary'}`}
          aria-pressed={Boolean(activeChunkId)}
          aria-label="Show selected section semantic connections"
          disabled={!activeChunkId}
        >
          Selection
        </button>
        <button
          type="button"
          className="relative ml-auto flex h-[22px] w-[22px] items-center justify-center rounded text-secondary hover:bg-hover hover:text-primary"
          aria-label="Configure semantic connections"
          aria-expanded={configOpen}
          title="Configure semantic connections"
          onClick={toggleConfig}
        >
          <SlidersHorizontal size={14} />
          {configActive && (
            <span
              data-testid="semantic-config-indicator"
              className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-teal-300"
            />
          )}
        </button>
        <span className="font-mono text-sm font-semibold text-teal-200" aria-label={`Connection count: ${scopedCountLabel}`}>
          {scopedConnections.length}
        </span>
      </div>

      {precondition === 'no-editor' && (
        <StateMessage title="Open a document" detail="Open a document to see connections." />
      )}
      {precondition === 'unsupported' && (
        <StateMessage title="Connections are not available for this file type" detail="Switch to a Markdown preview to inspect semantic connections." />
      )}
      {precondition === 'source' && (
        <StateMessage title="Switch to Preview" detail="Switch to Preview to see connections." />
      )}

      {!precondition && (
        <>
          {configOpen && (
            <div className="shrink-0 border-b border-subtle px-3 py-3">
              <div className="space-y-3 rounded-md border border-subtle bg-surface px-3 py-3">
                <div>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <label htmlFor={`${panelId}-top-n`} className="font-medium text-primary">Top N connections</label>
                    <span className="text-muted">{topN === Infinity ? 'Max' : sliderValue}</span>
                  </div>
                  <input
                    id={`${panelId}-top-n`}
                    aria-label="Top N connections"
                    type="range"
                    min={sortedConnections.length > 0 ? 1 : 0}
                    max={Math.max(1, sortedConnections.length)}
                    value={sliderValue}
                    disabled={sortedConnections.length === 0}
                    onChange={(event) => setTopN(normalizeTopN(event.currentTarget.value, sortedConnections.length))}
                    className="w-full"
                  />
                </div>
                {hasTypedControls && (
                  <>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary">Sort by nature</p>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className={`rounded border px-2 py-1 text-xs ${sortMode === 'similarity' ? 'border-teal-400/50 text-teal-100' : 'border-subtle text-secondary'}`}
                          onClick={() => setSortMode('similarity')}
                        >
                          Similarity
                        </button>
                        <button
                          type="button"
                          className={`rounded border px-2 py-1 text-xs ${sortMode === 'nature' ? 'border-teal-400/50 text-teal-100' : 'border-subtle text-secondary'}`}
                          onClick={() => setSortMode('nature')}
                        >
                          Nature
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-primary">Nature filters</p>
                      <div className="flex flex-wrap gap-1">
                        {allRels.map((rel) => (
                          <button
                            key={rel}
                            type="button"
                            aria-pressed={activeRelFilters.has(rel)}
                            className={`rounded border px-2 py-0.5 text-[11px] ${activeRelFilters.has(rel) ? 'border-teal-400/50 text-teal-100' : 'border-subtle text-secondary'}`}
                            onClick={() => toggleRelFilter(rel)}
                          >
                            {scEdgeLabel(rel)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {loading && !result && (
            <StateMessage title="Loading connections" detail="Finding semantic neighbors for the active Markdown preview." />
          )}

          {!loading && loadIssue === 'flashquery-unavailable' && (
            <StateMessage
              title="Unable to reach FlashQuery"
              detail="FlashQuery is unavailable. Check the workspace connection and retry."
              action={{ label: 'Retry connections', onClick: () => setLoadKey((value) => value + 1) }}
            />
          )}

          {!loading && loadIssue === 'no-vault' && (
            <StateMessage
              title="No vault connected to this workspace"
              detail="Connect a FlashQuery vault to this workspace to inspect semantic connections."
              action={{ label: 'Reload connections', onClick: () => setLoadKey((value) => value + 1) }}
            />
          )}

          {!loading && (loadIssue === 'adapter-error' || loadIssue === 'malformed') && (
            <StateMessage
              title="Unable to load semantic connections"
              detail="The connection data could not be loaded. Retry after the adapter recovers."
              action={{ label: 'Retry connections', onClick: () => setLoadKey((value) => value + 1) }}
            />
          )}

          {!loading && !loadIssue && sortedConnections.length === 0 && (
            <StateMessage
              title={activeChunkId ? 'No connections exist for this section' : 'No connections exist for this document'}
              detail="No matching semantic connections are available yet."
              action={{ label: 'Reload connections', onClick: () => setLoadKey((value) => value + 1) }}
            />
          )}

          {!loadIssue && sortedConnections.length > 0 && (
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3 py-3">
              <div className="flex shrink-0 items-center justify-between text-xs text-muted">
                <span>
                  {topN === Infinity
                    ? `Showing all ${countLabel(sortedConnections.length)}`
                    : `Showing ${visibleConnections.length} of ${countLabel(sortedConnections.length)}`}
                </span>
                {loading && <span>Refreshing...</span>}
              </div>
              {result?.stale && (
                <p className="shrink-0 rounded border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-xs text-amber-100">
                  Based on last indexed version
                </p>
              )}
              {hiddenCount > 0 && (
                <p className="shrink-0 text-xs text-muted">
                  {hiddenCount} additional {hiddenCount === 1 ? 'connection' : 'connections'} hidden by {activeRelFilters.size > 0 ? 'filters or Top-N' : 'Top-N'}
                </p>
              )}
              <div className="flex min-h-0 flex-col gap-3">
                {visibleConnections.map((connection) => (
                  <ConnectionCard key={connection.id} connection={connection} onOpen={handleOpenConnection} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
