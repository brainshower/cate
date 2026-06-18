// =============================================================================
// EditorPanel — Monaco Editor wrapper for CanvasIDE editor panels.
// Supports both regular editing and git diff viewing modes.
// =============================================================================

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { useRenderCount } from '../lib/perf/perfClient'
import log from '../lib/logger'
import * as monaco from 'monaco-editor'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { EditorPanelProps } from './types'
import { useAppStore } from '../stores/appStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useCanvasStoreApi } from '../stores/CanvasStoreContext'
import {
  registerActiveEditor,
  unregisterActiveEditor,
  updateActiveEditorModel,
  updateActiveEditorPreview,
} from '../lib/activeEditorRegistry'
import { createHeadingIdTracker, parseDocumentHeadings, slugifyHeading } from '../lib/parseDocumentHeadings'
import { refreshVaultIndexForWorkspace } from '../../agent/renderer/agentStore'
import {
  registerEditorSave,
  unregisterEditorSave,
  markEditorActive,
  clearEditorActive,
  getActiveEditorPanelId,
} from '../lib/editorSaveRegistry'
import { getActiveTheme, subscribeTheme } from '../lib/themeManager'
import type { FlashQueryConnectionStatus, Theme } from '../../shared/types'
import { takePendingReveal } from '../lib/editorReveal'
import { parseVaultUri } from '../../shared/flashqueryUri'
import { preloadSemanticConnections } from '../lib/semanticConnectionsPreload'
import {
  frontmatterToYaml,
  parseFrontmatterYaml,
  stripManagedFrontmatterFields,
} from '../lib/flashqueryFrontmatter'
import { FlashQueryRefreshConfirmDialog } from '../dialogs/FlashQueryRefreshConfirmDialog'
import {
  FLASHQUERY_EDITOR_TITLE_ACTION_EVENT,
  type FlashQueryEditorTitleActionDetail,
} from '../components/FlashQueryEditorTitleActions'
import { usePreviewSelectionStore } from '../stores/previewSelectionStore'

// -----------------------------------------------------------------------------
// Monaco worker setup for Electron (Vite bundler)
// -----------------------------------------------------------------------------

let monacoWorkersShuttingDown = false

if (typeof window !== 'undefined') {
  window.addEventListener(
    'beforeunload',
    () => {
      monacoWorkersShuttingDown = true
    },
    { once: true },
  )
}

interface PendingPreviewScroll {
  headingText: string
  occurrenceIndex: number
}

function headingOccurrenceIndex(headings: readonly { text: string }[], targetIndex: number): number {
  const target = headings[targetIndex]
  if (!target) return 0
  let occurrence = 0
  for (let index = 0; index < targetIndex; index++) {
    if (headings[index].text === target.text) occurrence++
  }
  return occurrence
}

function headingForSourceLine(model: { getLineCount: () => number; getLineContent: (lineNumber: number) => string } | null, lineNumber: number): PendingPreviewScroll | null {
  if (!model || lineNumber < 1) return null
  const headings = parseDocumentHeadings(model, 6)
  let targetIndex = -1
  for (let index = 0; index < headings.length; index++) {
    if (headings[index].line > lineNumber) break
    targetIndex = index
  }
  if (targetIndex < 0) return null
  return {
    headingText: headings[targetIndex].text,
    occurrenceIndex: headingOccurrenceIndex(headings, targetIndex),
  }
}

function headingLineForPreviewChunk(model: { getLineCount: () => number; getLineContent: (lineNumber: number) => string } | null, chunkId: string | null): number | null {
  if (!model || !chunkId) return null
  const nextChunkId = createHeadingIdTracker()
  for (const heading of parseDocumentHeadings(model, 6)) {
    if (nextChunkId(heading.text) === chunkId) return heading.line
  }
  return null
}

function createMonacoWorker(url: URL, label: string): Worker {
  return new Worker(url, {
    type: 'module',
    name: `monaco-${label || 'worker'}`,
  })
}

function createBundledMonacoWorker(label: string): Worker {
  const normalizedLabel = label.toLowerCase()

  if (monacoWorkersShuttingDown) {
    return new Worker(new URL('../workers/noop.worker.ts', import.meta.url), {
      type: 'module',
      name: `monaco-${normalizedLabel || 'noop'}`,
    })
  }

  if (normalizedLabel === 'json' || normalizedLabel === 'jsonc') {
    return createMonacoWorker(
      new URL('monaco-editor/esm/vs/language/json/json.worker.js', import.meta.url),
      normalizedLabel,
    )
  }

  if (normalizedLabel === 'css' || normalizedLabel === 'scss' || normalizedLabel === 'less') {
    return createMonacoWorker(
      new URL('monaco-editor/esm/vs/language/css/css.worker.js', import.meta.url),
      normalizedLabel,
    )
  }

  if (normalizedLabel === 'html' || normalizedLabel === 'handlebars' || normalizedLabel === 'razor') {
    return createMonacoWorker(
      new URL('monaco-editor/esm/vs/language/html/html.worker.js', import.meta.url),
      normalizedLabel,
    )
  }

  if (
    normalizedLabel === 'typescript'
    || normalizedLabel === 'javascript'
    || normalizedLabel === 'typescriptreact'
    || normalizedLabel === 'javascriptreact'
  ) {
    return createMonacoWorker(
      new URL('monaco-editor/esm/vs/language/typescript/ts.worker.js', import.meta.url),
      normalizedLabel,
    )
  }

  return new Worker(new URL('../workers/editorService.worker.ts', import.meta.url), {
    type: 'module',
    name: `monaco-${normalizedLabel || 'worker'}`,
  })
}

const monacoGlobal = globalThis as typeof globalThis & {
  MonacoEnvironment?: Record<string, unknown> & {
    getWorker?: (moduleId: string, label: string) => Worker
  }
}

// MonacoEnvironment.getWorker is assigned once at module load. Monaco caches
// workers by label internally (one tsserver worker, one json worker, etc.) and
// reuses them across all editor instances — no per-panel worker spawn.
monacoGlobal.MonacoEnvironment = {
  ...(monacoGlobal.MonacoEnvironment ?? {}),
  getWorker: function (_: string, label: string) {
    try {
      return createBundledMonacoWorker(label)
    } catch (err) {
      log.error('[EditorPanel] Failed to create Monaco worker for label %s:', label, err)
      throw err
    }
  },
}

// LRU cap on Monaco model cache so long sessions don't accumulate models for
// every file the user has ever opened. Oldest entries are disposed on eviction.
const MODEL_CACHE_LIMIT = 20

// -----------------------------------------------------------------------------
// Module-level model cache keyed by file path
// -----------------------------------------------------------------------------

const modelCache = new Map<string, monaco.editor.ITextModel>()
// Counts how many mounted EditorPanel instances are actively using a cached model.
const modelRefCount = new Map<string, number>()

function rememberModel(filePath: string, model: monaco.editor.ITextModel): void {
  // Map preserves insertion order — re-insert to mark as most recent.
  modelCache.delete(filePath)
  modelCache.set(filePath, model)
  while (modelCache.size > MODEL_CACHE_LIMIT) {
    const oldestKey = modelCache.keys().next().value
    if (oldestKey === undefined) break
    // Don't evict a model that is still in use by a mounted editor.
    if ((modelRefCount.get(oldestKey) ?? 0) > 0) break
    const oldest = modelCache.get(oldestKey)
    modelCache.delete(oldestKey)
    if (oldest && !oldest.isDisposed()) {
      try { oldest.dispose() } catch { /* noop */ }
    }
  }
}

function retainModel(filePath: string): void {
  modelRefCount.set(filePath, (modelRefCount.get(filePath) ?? 0) + 1)
}

function releaseModel(filePath: string): void {
  const count = (modelRefCount.get(filePath) ?? 0) - 1
  if (count <= 0) {
    // Drop the refcount entry but DO NOT dispose the model. Keeping it warm in
    // the LRU cache makes the next open of the same file instant (no re-read,
    // no re-tokenization). The LRU eviction path in rememberModel() will
    // dispose the model later if it falls out of the cache.
    modelRefCount.delete(filePath)
  } else {
    modelRefCount.set(filePath, count)
  }
}

// -----------------------------------------------------------------------------
// Monaco theme — a single 'cate-active' theme built from the active unified
// Theme's `editor` block (base + syntax token rules + chrome colors).
// (Re)defining the same name and calling setTheme() re-themes every open editor.
// -----------------------------------------------------------------------------

const CATE_MONACO_THEME = 'cate-active'

function applyMonacoTheme(theme: Theme): void {
  monaco.editor.defineTheme(CATE_MONACO_THEME, {
    base: theme.editor.base,
    inherit: true,
    rules: theme.editor.tokens.map((t) => ({
      token: t.token,
      ...(t.foreground ? { foreground: t.foreground } : {}),
      ...(t.background ? { background: t.background } : {}),
      ...(t.fontStyle ? { fontStyle: t.fontStyle } : {}),
    })),
    colors: theme.editor.colors ?? {},
  })
}

// -----------------------------------------------------------------------------
// Language detection from file extension
// -----------------------------------------------------------------------------

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  if (!ext) return 'plaintext'

  const languages = monaco.languages.getLanguages()
  for (const lang of languages) {
    if (lang.extensions?.some((e) => e === `.${ext}` || e === ext)) {
      return lang.id
    }
  }

  const fallbackMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescriptreact',
    js: 'javascript',
    jsx: 'javascriptreact',
    json: 'json',
    md: 'markdown',
    py: 'python',
    rs: 'rust',
    go: 'go',
    rb: 'ruby',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    sh: 'shell',
    bash: 'shell',
    zsh: 'shell',
    css: 'css',
    scss: 'scss',
    less: 'less',
    html: 'html',
    htm: 'html',
    xml: 'xml',
    svg: 'xml',
    swift: 'swift',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    java: 'java',
    kt: 'kotlin',
    sql: 'sql',
    graphql: 'graphql',
    dockerfile: 'dockerfile',
    makefile: 'makefile',
  }

  return fallbackMap[ext] ?? 'plaintext'
}

function basenameForEditorTitle(filePath: string): string {
  const vaultUri = parseVaultUri(filePath)
  const sourcePath = vaultUri?.vaultPath ?? filePath
  return sourcePath.split(/[\\/]/).pop() || 'Untitled'
}

function cleanCurrentPanelTitle(workspaceId: string, panelId: string): string | null {
  const workspace = useAppStore.getState().workspaces.find((item) => item.id === workspaceId)
  const title = workspace?.panels[panelId]?.title
  if (!title) return null
  return title.endsWith(' \u2022') ? title.slice(0, -2) : title
}

function titleForExistingEditor(workspaceId: string, panelId: string, filePath: string): string {
  const fallback = basenameForEditorTitle(filePath)
  const currentTitle = cleanCurrentPanelTitle(workspaceId, panelId)
  if (!currentTitle || currentTitle === fallback || currentTitle === encodeURIComponent(fallback)) {
    return fallback
  }
  return currentTitle
}

// -----------------------------------------------------------------------------
// Helper: reconstruct original content from current content + unified diff
// -----------------------------------------------------------------------------

function reconstructOriginalFromDiff(currentContent: string, diff: string): string {
  if (!diff) return currentContent

  const currentLines = currentContent.split('\n')
  const diffLines = diff.split('\n')
  const originalLines: string[] = []

  let currentIdx = 0
  let i = 0

  // Skip diff headers (diff --git, index, ---, +++)
  while (i < diffLines.length && !diffLines[i].startsWith('@@')) {
    i++
  }

  while (i < diffLines.length) {
    const line = diffLines[i]

    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
      if (match) {
        const newStart = parseInt(match[3], 10) - 1

        // Copy unchanged lines before this hunk
        while (currentIdx < newStart && currentIdx < currentLines.length) {
          originalLines.push(currentLines[currentIdx])
          currentIdx++
        }
      }
      i++
      continue
    }

    if (line.startsWith('-')) {
      // Line exists in original but was removed
      originalLines.push(line.slice(1))
      i++
    } else if (line.startsWith('+')) {
      // Line was added in modified — skip in original
      currentIdx++
      i++
    } else {
      // Context line
      originalLines.push(currentLines[currentIdx] ?? line.slice(1))
      currentIdx++
      i++
    }
  }

  // Copy remaining unchanged lines
  while (currentIdx < currentLines.length) {
    originalLines.push(currentLines[currentIdx])
    currentIdx++
  }

  return originalLines.join('\n')
}

// -----------------------------------------------------------------------------
// EditorPanel component
// -----------------------------------------------------------------------------

export default function EditorPanel({
  panelId,
  workspaceId,
  nodeId,
  filePath,
}: EditorPanelProps) {
  useRenderCount('EditorPanel')
  const containerRef = useRef<HTMLDivElement>(null)
  const previewBodyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const diffEditorRef = useRef<monaco.editor.IStandaloneDiffEditor | null>(null)
  const outlineHighlightDecorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | null>(null)
  const outlineHighlightTimerRef = useRef<number | null>(null)
  const outlineHighlightApplyTimerRef = useRef<number | null>(null)
  const pendingPreviewScrollRef = useRef<PendingPreviewScroll | null>(null)
  const refocusPreviewScrollRef = useRef<PendingPreviewScroll | null>(null)
  const refocusPreviewScrollRafRef = useRef<number | null>(null)
  const markdownPreviewActiveRef = useRef(false)
  const isDirtyRef = useRef(false)
  const filePathRef = useRef(filePath)

  // Only overwrite the ref from the prop when the prop is itself defined.
  // In detached/dock windows the shell keeps its own local `panels` state
  // and doesn't observe the global appStore update we issue after a
  // Save-As, so the `filePath` prop stays undefined for the lifetime of
  // this mount. Without this guard, every re-render would wipe out the
  // path we just learned and the next Cmd+S would re-open Save-As.
  if (filePath !== undefined) filePathRef.current = filePath

  const [markdownContent, setMarkdownContent] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false)
  const [flashQueryStatus, setFlashQueryStatus] = useState<FlashQueryConnectionStatus | null>(null)

  const workspaces = useAppStore((s) => s.workspaces)
  const ws = workspaces.find((w) => w.id === workspaceId)
  const diffMode = ws?.panels[panelId]?.diffMode
  const activeVaultUri = filePath ? parseVaultUri(filePath) : null
  // Preview mode is kept per-panel in the store rather than as local state: a
  // single EditorPanel mount is reused across dock tabs (renderPanelComponent
  // creates the element without a key), so local state would leak the toggle
  // from one markdown file to the next. Keying it by panelId also keeps each
  // tab's choice independent across canvas switches.
  const markdownPreview = !!ws?.panels[panelId]?.markdownPreview
  const associatedOutlinePanelId = Object.values(ws?.panels ?? {}).find((panel) =>
    panel.type === 'outline' && panel.sourceEditorPanelId === panelId
  )?.id
  const associatedGraphPanelId = Object.values(ws?.panels ?? {}).find((panel) =>
    panel.type === 'semantic-connections' && panel.sourceEditorPanelId === panelId
  )?.id
  const setMarkdownPreview = useCallback(
    (next: boolean) =>
      useAppStore.getState().setPanelMarkdownPreview(workspaceId, panelId, next),
    [workspaceId, panelId],
  )
  const scrollPreviewToHeading = useCallback((headingText: string, occurrenceIndex = 0) => {
    const previewBody = previewBodyRef.current
    if (!previewBody) return
    const baseId = slugifyHeading(headingText)
    const targetId = occurrenceIndex > 0 ? `${baseId}-${occurrenceIndex}` : baseId
    const headings = [...previewBody.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')]
    const heading = headings.find((element) => element.id === targetId)
      ?? headings.find((element) => element.id === baseId || element.id.startsWith(`${baseId}-`))
    if (!heading) return

    heading.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    const chunkId = heading.closest<HTMLElement>('[data-chunk-id]')?.dataset.chunkId
    if (chunkId) usePreviewSelectionStore.getState().selectSection(chunkId, panelId)
  }, [panelId])
  const resolvePreviewChunkIdForHeading = useCallback((headingText: string, occurrenceIndex = 0): string | null => {
    const previewBody = previewBodyRef.current
    if (!previewBody) return null
    const headings = [...previewBody.querySelectorAll<HTMLHeadingElement>('h1, h2, h3, h4, h5, h6')]
      .filter((heading) => heading.textContent?.trim() === headingText)
    const heading = headings[occurrenceIndex] ?? null
    return heading?.closest<HTMLElement>('[data-chunk-id]')?.dataset.chunkId ?? null
  }, [])
  const revealSourceHeadingForChunk = useCallback((chunkId: string | null): boolean => {
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!editor || !model || model.isDisposed()) return false
    const line = headingLineForPreviewChunk(model, chunkId)
    if (!line) return false
    editor.revealLineInCenter(line)
    editor.setPosition({ lineNumber: line, column: 1 })
    editor.focus()
    return true
  }, [])
  const toggleMarkdownPreview = useCallback(() => {
    if (!markdownPreview) {
      const editor = editorRef.current
      const model = editor?.getModel()
      const lineNumber = editor?.getPosition?.()?.lineNumber ?? 1
      pendingPreviewScrollRef.current = model && !model.isDisposed() && lineNumber > 1
        ? headingForSourceLine(model, lineNumber)
        : null
      setMarkdownPreview(true)
      return
    }

    const scope = usePreviewSelectionStore.getState().getScope(panelId)
    const selectedChunkId = scope.pinnedChunkId ?? scope.activeChunkId
    setMarkdownPreview(false)
    revealSourceHeadingForChunk(selectedChunkId)
  }, [markdownPreview, panelId, revealSourceHeadingForChunk, setMarkdownPreview])
  const highlightSourceLine = useCallback((lineNumber: number) => {
    const editor = editorRef.current
    const model = editor?.getModel()
    if (!editor || !model || model.isDisposed()) return
    const lineCount = model.getLineCount()
    if (lineNumber < 1 || lineNumber > lineCount) return

    if (outlineHighlightApplyTimerRef.current) window.clearTimeout(outlineHighlightApplyTimerRef.current)
    if (outlineHighlightTimerRef.current) window.clearTimeout(outlineHighlightTimerRef.current)
    outlineHighlightDecorationsRef.current?.clear()
    outlineHighlightApplyTimerRef.current = window.setTimeout(() => {
      if (!outlineHighlightDecorationsRef.current) {
        outlineHighlightDecorationsRef.current = editor.createDecorationsCollection()
      }
      outlineHighlightDecorationsRef.current.set([{
        range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
        options: {
          isWholeLine: true,
          className: 'cate-outline-target-line',
        },
      }])
      outlineHighlightApplyTimerRef.current = null
      outlineHighlightTimerRef.current = window.setTimeout(() => {
        outlineHighlightDecorationsRef.current?.clear()
        outlineHighlightTimerRef.current = null
      }, 2200)
    }, 0)
  }, [])
  useEffect(() => {
    return () => {
      if (outlineHighlightApplyTimerRef.current) window.clearTimeout(outlineHighlightApplyTimerRef.current)
      if (outlineHighlightTimerRef.current) window.clearTimeout(outlineHighlightTimerRef.current)
      outlineHighlightDecorationsRef.current?.clear()
      outlineHighlightDecorationsRef.current = null
    }
  }, [])
  const rootPath = ws?.rootPath
  const flashQueryConnection = ws?.flashqueryConnection
  const isFlashQueryFrontmatter = activeVaultUri?.part === 'frontmatter'
  const isMarkdown = !!filePath && /\.mdx?$/i.test(filePath) && !isFlashQueryFrontmatter
  markdownPreviewActiveRef.current = markdownPreview && isMarkdown
  const canvasApi = useCanvasStoreApi()
  const warmSemanticConnections = useCallback((targetPath: string, markdown: string, options: { invalidate?: boolean } = {}) => {
    if (!flashQueryConnection || flashQueryStatus === 'disconnected') return
    const targetVaultUri = parseVaultUri(targetPath)
    if (targetVaultUri?.part === 'frontmatter' || !/\.mdx?$/i.test(targetPath)) return
    const pending = preloadSemanticConnections({
      workspaceId,
      editorPanelId: panelId,
      documentPath: targetPath,
      markdown,
      invalidate: options.invalidate,
    })
    if (pending) {
      void pending.catch((error) => {
        log.debug('[EditorPanel] Semantic connections preload skipped/failed:', error)
      })
    }
  }, [flashQueryConnection, flashQueryStatus, panelId, workspaceId])
  const toggleOutline = useCallback(() => {
    if (associatedOutlinePanelId) {
      useAppStore.getState().closePanel(workspaceId, associatedOutlinePanelId)
      return
    }
    useAppStore.getState().createOutline(
      workspaceId,
      undefined,
      nodeId ? { target: 'none' } : { target: 'dock', zone: 'right' },
      panelId,
      nodeId || undefined,
    )
  }, [associatedOutlinePanelId, workspaceId, panelId, nodeId])
  const toggleGraph = useCallback(() => {
    if (associatedGraphPanelId) {
      useAppStore.getState().closePanel(workspaceId, associatedGraphPanelId)
      return
    }
    if (isMarkdown && !markdownPreview) {
      useAppStore.getState().setPanelMarkdownPreview(workspaceId, panelId, true)
    }
    useAppStore.getState().createSemanticConnections(
      workspaceId,
      undefined,
      nodeId ? { target: 'none' } : { target: 'dock', zone: 'right' },
      panelId,
      nodeId,
    )
  }, [associatedGraphPanelId, isMarkdown, markdownPreview, workspaceId, panelId, nodeId])

  useEffect(() => {
    setFlashQueryStatus(null)
    if (!flashQueryConnection) return
    return window.electronAPI.onFlashQueryStatus((payload) => {
      if (payload.workspaceId !== workspaceId) return
      setFlashQueryStatus(payload.status)
    })
  }, [flashQueryConnection, workspaceId])

  const markClean = useCallback((targetPath: string) => {
    setSaveError(null)
    isDirtyRef.current = false
    useAppStore.getState().setPanelDirty(workspaceId, panelId, false)
    useAppStore.getState().updatePanelTitle(
      workspaceId,
      panelId,
      titleForExistingEditor(workspaceId, panelId, targetPath),
    )
  }, [workspaceId, panelId])

  // ---------------------------------------------------------------------------
  // Save handler (regular editor only)
  // ---------------------------------------------------------------------------

  const save = useCallback(async (): Promise<boolean> => {
    const editor = editorRef.current
    const activePath = filePathRef.current
    const activeVaultUri = activePath ? parseVaultUri(activePath) : null
    if (!editor || (diffMode && !activeVaultUri)) return false

    const content = editor.getValue()

    // Untitled buffer (no filePath): prompt the user for a destination via the
    // native Save-As dialog. Once a path is chosen, persist it on the panel
    // state so future saves (Cmd+S, close-confirm) write to the same file.
    let targetPath = filePathRef.current
    let isInitialSave = false
    if (!targetPath) {
      const currentPanel = useAppStore
        .getState()
        .workspaces.find((w) => w.id === workspaceId)?.panels[panelId]
      const cleanTitle = currentPanel?.title?.replace(/\s•\s*$/, '').trim()
      const defaultName = cleanTitle && cleanTitle !== 'Untitled' ? cleanTitle : 'Untitled.txt'
      // Pick the separator that matches the workspace root so the prefilled
      // path looks native on the user's platform (Electron's Save dialog
      // accepts either on Windows but mixed slashes look sloppy).
      const sep = rootPath?.includes('\\') ? '\\' : '/'
      const defaultPath = rootPath ? `${rootPath}${sep}${defaultName}` : defaultName
      const chosen = await window.electronAPI.saveFileDialog({ defaultName, defaultPath })
      if (!chosen) return false
      targetPath = chosen
      isInitialSave = true
    }

    const vaultUri = parseVaultUri(targetPath)
    if (vaultUri) {
      try {
        let payload: string | { frontmatter: Record<string, unknown> }
        if (vaultUri.part === 'frontmatter') {
          const parsed = parseFrontmatterYaml(content)
          if (!parsed.ok) {
            setSaveError(`Invalid frontmatter YAML: ${parsed.error}`)
            return false
          }
          const stripped = stripManagedFrontmatterFields(parsed.value)
          if (Object.keys(stripped.frontmatter).length === 0) {
            markClean(targetPath)
            return true
          }
          payload = { frontmatter: stripped.frontmatter }
        } else {
          payload = content
        }
        const result = await window.electronAPI.flashqueryWriteDocument(
          vaultUri.workspaceId,
          vaultUri.vaultPath,
          payload,
        )
        if (!result.success) {
          const message = result.error || 'Failed to save vault document'
          setSaveError(message)
          log.error('[EditorPanel] Failed to save vault document:', message)
          return false
        }
        refreshVaultIndexForWorkspace(vaultUri.workspaceId)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save vault document'
        setSaveError(message)
        log.error('[EditorPanel] Failed to save vault document:', err)
        return false
      }
    } else {
      try {
        await window.electronAPI.fsWriteFile(targetPath, content)
      } catch (err) {
        log.error('[EditorPanel] Failed to save file:', err)
        return false
      }
    }

    markClean(targetPath)

    const fileName = isInitialSave
      ? basenameForEditorTitle(targetPath)
      : titleForExistingEditor(workspaceId, panelId, targetPath)
    useAppStore.getState().updatePanelTitle(workspaceId, panelId, fileName)

    if (isInitialSave) {
      // Persist the new filePath in the global appStore (the source of
      // truth for the main window's panels). In detached/dock windows the
      // shell maintains its own local panels state instead, so we ALSO
      // update filePathRef directly: that makes the next Cmd+S in this
      // exact mount write to the chosen file instead of reopening Save-As,
      // regardless of whether the prop ever updates.
      filePathRef.current = targetPath
      useAppStore.getState().updatePanelFilePath(workspaceId, panelId, targetPath)
      // Clear the unsaved-content cache so the remount-from-disk path is
      // the single source of truth for the editor model when the prop
      // does flip (main window).
      useAppStore.getState().setPanelUnsavedContent(workspaceId, panelId, undefined)
      // Notify the surrounding shell (DockWindowShell / PanelWindowShell)
      // so its local `panels` state — which feeds session sync and close
      // prompts in detached windows — picks up the new filePath, title,
      // and clean dirty flag. The main window ignores this event because
      // it reads from appStore directly.
      window.dispatchEvent(
        new CustomEvent('editor:panel-saved-as', {
          detail: { panelId, filePath: targetPath, title: fileName },
        }),
      )
    }
    return true
  }, [workspaceId, panelId, diffMode, rootPath, markClean])

  const refreshBodyFromVault = useCallback(async (options: { saveFirst?: boolean; discardDirty?: boolean } = {}) => {
    const editor = editorRef.current
    const targetPath = filePathRef.current
    const vaultUri = targetPath ? parseVaultUri(targetPath) : null
    if (!editor || !targetPath || vaultUri?.part !== 'body') return false
    if (refreshing) return false

    if (isDirtyRef.current && !options.saveFirst && !options.discardDirty) {
      setShowRefreshConfirm(true)
      return false
    }

    if (options.saveFirst) {
      const saved = await save()
      if (!saved) return false
    }

    if (!flashQueryConnection || flashQueryStatus === 'disconnected') {
      setRefreshError('FlashQuery is disconnected.')
      setShowRefreshConfirm(false)
      return false
    }

    setRefreshing(true)
    setRefreshError(null)
    try {
      const model = editor.getModel()
      const saveViewState = (editor as unknown as { saveViewState?: () => unknown }).saveViewState
      const restoreViewState = (editor as unknown as { restoreViewState?: (state: unknown) => void }).restoreViewState
      const viewState = saveViewState?.call(editor)
      const result = await window.electronAPI.flashqueryGetDocument(vaultUri.workspaceId, vaultUri.vaultPath, {
        include: ['body'],
      })
      model?.setValue(result.body)
      warmSemanticConnections(targetPath, result.body, { invalidate: true })
      if (viewState) restoreViewState?.call(editor, viewState)
      markClean(targetPath)
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh vault document'
      setRefreshError(/not\s*found/i.test(message) ? 'Document not found in FlashQuery vault.' : message)
      log.error('[EditorPanel] Failed to refresh vault document:', error)
      return false
    } finally {
      setRefreshing(false)
      setShowRefreshConfirm(false)
    }
  }, [flashQueryConnection, flashQueryStatus, markClean, refreshing, save])

  const copyVaultPathOrReference = useCallback(async () => {
    if (!activeVaultUri) return
    const action = await window.electronAPI.showContextMenu([
      { id: 'copy-path', label: 'Copy vault path' },
      { id: 'copy-reference', label: 'Copy as reference' },
    ])
    if (action === 'copy-path') await navigator.clipboard.writeText(activeVaultUri.vaultPath)
    if (action === 'copy-reference') await navigator.clipboard.writeText(`{{ref:${activeVaultUri.vaultPath}}}`)
  }, [activeVaultUri])

  useEffect(() => {
    const handleTitleAction = (event: Event) => {
      const detail = (event as CustomEvent<FlashQueryEditorTitleActionDetail>).detail
      if (detail?.panelId !== panelId) return
      if (detail.action === 'copy-reference') {
        void copyVaultPathOrReference()
        return
      }
      if (detail.action === 'refresh-from-vault') {
        void refreshBodyFromVault()
      }
    }

    window.addEventListener(FLASHQUERY_EDITOR_TITLE_ACTION_EVENT, handleTitleAction)
    return () => window.removeEventListener(FLASHQUERY_EDITOR_TITLE_ACTION_EVENT, handleTitleAction)
  }, [copyVaultPathOrReference, panelId, refreshBodyFromVault])

  // ---------------------------------------------------------------------------
  // Mount: create regular editor OR diff editor
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!containerRef.current) return

    applyMonacoTheme(getActiveTheme())
    monaco.editor.setTheme(CATE_MONACO_THEME)
    const fontSize = useSettingsStore.getState().editorFontSize
    const vaultUri = filePath ? parseVaultUri(filePath) : null

    // =======================================================================
    // DIFF MODE — Monaco diff editor
    // =======================================================================
    if (diffMode && vaultUri) {
      log.warn('[EditorPanel] Git diff mode is not supported for FlashQuery vault documents:', filePath)
    }

    if (diffMode && filePath && rootPath && !vaultUri) {
      const diffEditor = monaco.editor.createDiffEditor(containerRef.current, {
        theme: CATE_MONACO_THEME,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: fontSize || 12,
        automaticLayout: false,
        readOnly: true,
        renderSideBySide: true,
        useInlineViewWhenSpaceIsLimited: false,
        scrollBeyondLastLine: false,
        fixedOverflowWidgets: true,
        minimap: { enabled: false },
        padding: { top: 8, bottom: 8 },
      })

      diffEditorRef.current = diffEditor

      const layoutObserver = new ResizeObserver(() => {
        diffEditor.layout()
      })
      layoutObserver.observe(containerRef.current)

      const language = detectLanguage(filePath)
      const relativePath = filePath.startsWith(rootPath)
        ? filePath.slice(rootPath.length + 1)
        : filePath

      let cancelled = false

      const loadDiff = async () => {
        let modifiedContent = ''
        try {
          modifiedContent = await window.electronAPI.fsReadFile(filePath)
        } catch { /* empty */ }

        let originalContent = ''
        try {
          const diff = diffMode === 'staged'
            ? await window.electronAPI.gitDiffStaged(rootPath, relativePath)
            : await window.electronAPI.gitDiff(rootPath, relativePath)
          originalContent = reconstructOriginalFromDiff(modifiedContent, diff)
        } catch {
          originalContent = modifiedContent
        }

        if (cancelled) return

        const originalModel = monaco.editor.createModel(originalContent, language)
        const modifiedModel = monaco.editor.createModel(modifiedContent, language)

        diffEditor.setModel({
          original: originalModel,
          modified: modifiedModel,
        })
      }

      loadDiff()

      return () => {
        cancelled = true
        layoutObserver.disconnect()
        const model = diffEditor.getModel()
        // Dispose the diff editor BEFORE its models — Monaco's DiffEditorWidget
        // still references them during teardown and throws "TextModel got disposed
        // before DiffEditorWidget model got reset" otherwise.
        diffEditor.dispose()
        model?.original?.dispose()
        model?.modified?.dispose()
        diffEditorRef.current = null
      }
    }

    // =======================================================================
    // REGULAR EDITOR
    // =======================================================================
    const editor = monaco.editor.create(containerRef.current, {
      theme: CATE_MONACO_THEME,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: fontSize || 12,
      minimap: { enabled: false },
      automaticLayout: false,
      scrollBeyondLastLine: false,
      fixedOverflowWidgets: true,
      scrollbar: { useShadows: false },
      overviewRulerBorder: false,
      padding: { top: 8, bottom: 8 },
      lineNumbers: 'on',
      renderWhitespace: 'none',
      wordWrap: 'on',
    })

    const layoutObserver = new ResizeObserver(() => {
      editor.layout()
    })
    layoutObserver.observe(containerRef.current)

    editorRef.current = editor
    registerActiveEditor(workspaceId, panelId, editor)

    // Jump to a line/column or Markdown heading requested by another panel
    // (one-shot). Runs after the model is set so the reveal targets real content.
    const applyPendingReveal = () => {
      const reveal = takePendingReveal(panelId)
      if (!reveal) return
      try {
        const model = editor.getModel()
        const headings = reveal.headingText && model && !model.isDisposed()
          ? parseDocumentHeadings(model, 6)
          : []
        const headingIndex = reveal.headingText
          ? headings.findIndex((heading) => heading.text === reveal.headingText)
          : -1
        if (headingIndex >= 0 && markdownPreviewActiveRef.current) {
          pendingPreviewScrollRef.current = {
            headingText: headings[headingIndex].text,
            occurrenceIndex: headingOccurrenceIndex(headings, headingIndex),
          }
          return
        }
        const headingLine = headingIndex >= 0 ? headings[headingIndex].line : undefined
        const line = headingLine ?? reveal.line
        if (!line) return
        editor.revealLineInCenter(line)
        editor.setPosition({ lineNumber: line, column: reveal.column ?? 1 })
        editor.focus()
      } catch { /* ignore reveal failures (e.g. line beyond EOF) */ }
    }

    let cancelled = false
    let createdModel: monaco.editor.ITextModel | null = null
    let modelRetained = false

    if (filePath) {
      // Reuse a warm model if our LRU has it, otherwise fall back to
      // monaco.editor.getModel(uri) in case Monaco itself still owns one
      // (e.g. across HMR boundaries). Models survive panel unmount in the
      // cache so reopening the same file is instant.
      const modelUri = vaultUri ? monaco.Uri.parse(filePath) : monaco.Uri.file(filePath)
      let cached = modelCache.get(filePath)
      if (!cached || cached.isDisposed()) {
        const byUri = monaco.editor.getModel(modelUri)
        if (byUri && !byUri.isDisposed()) {
          cached = byUri
          rememberModel(filePath, byUri)
        }
      }
      if (cached && !cached.isDisposed()) {
        retainModel(filePath)
        modelRetained = true
        editor.setModel(cached)
        if (markdownPreviewActiveRef.current) setMarkdownContent(cached.getValue())
        warmSemanticConnections(filePath, cached.getValue())
        updateActiveEditorModel(workspaceId, panelId)
        applyPendingReveal()
      } else {
        const language = vaultUri?.part === 'frontmatter' ? 'yaml' : detectLanguage(filePath)
        const readContent = vaultUri
          ? window.electronAPI
            .flashqueryGetDocument(vaultUri.workspaceId, vaultUri.vaultPath, {
              include: [vaultUri.part],
            })
            .then((result) => vaultUri.part === 'frontmatter'
              ? frontmatterToYaml(result.frontmatter)
              : result.body)
          : window.electronAPI.fsReadFile(filePath)

        readContent
          .then((content) => {
            if (cancelled) return
            // Pass the file URI so Monaco indexes the model by it; this
            // enables monaco.editor.getModel(uri) reuse on later opens.
            const model = monaco.editor.createModel(content, language, modelUri)
            createdModel = model
            rememberModel(filePath, model)
            retainModel(filePath)
            modelRetained = true
            editor.setModel(model)
            if (markdownPreviewActiveRef.current) setMarkdownContent(model.getValue())
            warmSemanticConnections(filePath, model.getValue())
            updateActiveEditorModel(workspaceId, panelId)
            applyPendingReveal()
          })
          .catch((err) => {
            if (cancelled) return
            log.error('[EditorPanel] Failed to read file:', err)
            // No URI here — we don't want a malformed/empty placeholder to
            // squat on the file URI and be reused as the real model later.
            const model = monaco.editor.createModel('', language)
            createdModel = model
            rememberModel(filePath, model)
            retainModel(filePath)
            modelRetained = true
            editor.setModel(model)
            updateActiveEditorModel(workspaceId, panelId)
          })
      }
    } else {
      const restored = useAppStore.getState().workspaces
        .find((w) => w.id === workspaceId)?.panels[panelId]?.unsavedContent ?? ''
      const model = monaco.editor.createModel(restored, 'plaintext')
      createdModel = model
      editor.setModel(model)
      updateActiveEditorModel(workspaceId, panelId)
      if (restored) {
        isDirtyRef.current = true
        useAppStore.getState().setPanelDirty(workspaceId, panelId, true)
      }
    }

    // Track which editor most recently held text focus so the window-level
    // Cmd+S handler can route to the correct panel even after focus moves
    // off the textarea (e.g. clicking the markdown preview toggle).
    const focusDisposable = editor.onDidFocusEditorText(() => {
      markEditorActive(panelId)
      registerActiveEditor(workspaceId, panelId, editor)
    })

    let unsavedSaveTimer: ReturnType<typeof setTimeout> | null = null
    const changeDisposable = editor.onDidChangeModelContent(() => {
      if (!isDirtyRef.current) {
        isDirtyRef.current = true
        useAppStore.getState().setPanelDirty(workspaceId, panelId, true)

        if (filePathRef.current) {
          const fileName = titleForExistingEditor(workspaceId, panelId, filePathRef.current)
          useAppStore
            .getState()
            .updatePanelTitle(workspaceId, panelId, `${fileName} \u2022`)
        }
      }

      // Persist scratch-editor content to the store (debounced) so it
      // survives canvas/workspace switches and app restarts.
      if (!filePathRef.current) {
        if (unsavedSaveTimer) clearTimeout(unsavedSaveTimer)
        unsavedSaveTimer = setTimeout(() => {
          const value = editor.getModel()?.getValue() ?? ''
          useAppStore.getState().setPanelUnsavedContent(workspaceId, panelId, value || undefined)
        }, 300)
      }

      if (markdownPreviewActiveRef.current) {
        setMarkdownContent(editor.getModel()?.getValue() ?? '')
      }
    })

    return () => {
      cancelled = true
      layoutObserver.disconnect()
      changeDisposable.dispose()
      focusDisposable.dispose()
      clearEditorActive(panelId)
      unregisterActiveEditor(workspaceId, panelId)
      if (unsavedSaveTimer) {
        clearTimeout(unsavedSaveTimer)
        unsavedSaveTimer = null
      }
      if (!filePath) {
        const value = editor.getModel()?.getValue() ?? ''
        useAppStore.getState().setPanelUnsavedContent(workspaceId, panelId, value || undefined)
      }
      if (filePath && modelRetained) {
        releaseModel(filePath)
      } else if (!filePath && createdModel && !createdModel.isDisposed()) {
        createdModel.dispose()
      }
      editor.dispose()
      editorRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, workspaceId, diffMode])

  // ---------------------------------------------------------------------------
  // Listen for save-file custom event
  // ---------------------------------------------------------------------------

  useEffect(() => {
    // Cmd+S / Ctrl+S broadcasts a window-wide `save-file` event. Without a
    // gate every mounted EditorPanel would react — and for an untitled
    // buffer that would open a Save-As picker for each scratch editor on
    // the canvas. We route the event to whichever editor most recently held
    // Monaco text focus (tracked in editorSaveRegistry). This survives the
    // user clicking off the textarea onto e.g. the markdown preview toggle,
    // which would defeat a raw `hasTextFocus()` check.
    const handler = () => {
      if (getActiveEditorPanelId() === panelId) save()
    }
    window.addEventListener('save-file', handler)
    registerEditorSave(panelId, save)
    return () => {
      window.removeEventListener('save-file', handler)
      unregisterEditorSave(panelId)
    }
  }, [save, panelId])

  // ---------------------------------------------------------------------------
  // Watch settings changes: editor font size
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsub = useSettingsStore.subscribe((state, prevState) => {
      if (state.editorFontSize !== prevState.editorFontSize) {
        if (editorRef.current) {
          editorRef.current.updateOptions({ fontSize: state.editorFontSize })
        }
        if (diffEditorRef.current) {
          diffEditorRef.current.updateOptions({ fontSize: state.editorFontSize })
        }
      }
    })
    return unsub
  }, [])

  // ---------------------------------------------------------------------------
  // Sync markdown content when preview is toggled on
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (markdownPreview && isMarkdown) {
      const model = editorRef.current?.getModel()
      if (model && !model.isDisposed()) {
        setMarkdownContent(model.getValue())
      } else if (filePath && !parseVaultUri(filePath)) {
        window.electronAPI.fsReadFile(filePath).then(setMarkdownContent).catch(() => {})
      }
    } else {
      // Re-layout Monaco after unhiding — dimensions may have changed while hidden
      editorRef.current?.layout()
      diffEditorRef.current?.layout()
    }
  }, [markdownPreview, isMarkdown, filePath])

  useEffect(() => {
    if (!markdownPreview || !isMarkdown || !markdownContent) return
    const pending = pendingPreviewScrollRef.current
    if (!pending) return
    pendingPreviewScrollRef.current = null
    refocusPreviewScrollRef.current = pending
    scrollPreviewToHeading(pending.headingText, pending.occurrenceIndex)
  }, [isMarkdown, markdownContent, markdownPreview, scrollPreviewToHeading])

  useEffect(() => {
    const unsubscribe = canvasApi.subscribe((state, previous) => {
      if (!nodeId || state.focusEpoch === previous.focusEpoch || state.focusedNodeId !== nodeId) return
      const pending = refocusPreviewScrollRef.current
      if (!pending || !markdownPreviewActiveRef.current) return
      refocusPreviewScrollRef.current = null

      if (refocusPreviewScrollRafRef.current !== null) {
        window.cancelAnimationFrame(refocusPreviewScrollRafRef.current)
        refocusPreviewScrollRafRef.current = null
      }

      refocusPreviewScrollRafRef.current = window.requestAnimationFrame(() => {
        refocusPreviewScrollRafRef.current = window.requestAnimationFrame(() => {
          refocusPreviewScrollRafRef.current = null
          scrollPreviewToHeading(pending.headingText, pending.occurrenceIndex)
        })
      })
    })
    return () => {
      unsubscribe()
      if (refocusPreviewScrollRafRef.current !== null) {
        window.cancelAnimationFrame(refocusPreviewScrollRafRef.current)
        refocusPreviewScrollRafRef.current = null
      }
    }
  }, [canvasApi, nodeId, scrollPreviewToHeading])

  useEffect(() => {
    updateActiveEditorPreview(workspaceId, panelId, {
      markdownPreview: markdownPreview && isMarkdown,
      filePath,
      scrollPreviewToHeading,
      resolvePreviewChunkIdForHeading,
      highlightSourceLine,
    })
  }, [workspaceId, panelId, markdownPreview, isMarkdown, scrollPreviewToHeading, resolvePreviewChunkIdForHeading, highlightSourceLine])

  // ---------------------------------------------------------------------------
  // Watch app theme changes and update Monaco theme
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const unsub = subscribeTheme((t) => {
      applyMonacoTheme(t)
      monaco.editor.setTheme(CATE_MONACO_THEME)
    })
    return unsub
  }, [])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="w-full h-full relative">
      {!diffMode && (
        <div className="absolute top-2 right-5 z-10 flex items-center gap-1">
          <button
            onClick={toggleOutline}
            aria-label="Toggle document outline"
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              associatedOutlinePanelId
                ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                : 'bg-neutral-200/80 dark:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
            }`}
            title="Toggle document outline"
          >
            Outline
          </button>
          <button
            onClick={toggleGraph}
            aria-label="Toggle document graph"
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              associatedGraphPanelId
                ? 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30'
                : 'bg-neutral-200/80 dark:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
            }`}
            title="Toggle document graph"
          >
            Graph
          </button>
          {isMarkdown && (
            <button
              onClick={toggleMarkdownPreview}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                markdownPreview
                  ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                  : 'bg-neutral-200/80 dark:bg-neutral-700/80 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
              }`}
              title={markdownPreview ? 'Show source' : 'Preview markdown'}
            >
              {markdownPreview ? 'Source' : 'Preview'}
            </button>
          )}
        </div>
      )}
      {markdownPreview && isMarkdown && (
        <MarkdownPreview content={markdownContent} previewBodyRef={previewBodyRef} selectionScopeId={panelId} />
      )}
      <FlashQueryRefreshConfirmDialog
        open={showRefreshConfirm}
        fileName={filePathRef.current ? basenameForEditorTitle(filePathRef.current) : 'Untitled'}
        onCancel={() => setShowRefreshConfirm(false)}
        onDiscardAndRefresh={() => { void refreshBodyFromVault({ discardDirty: true }) }}
        onSaveAndRefresh={() => { void refreshBodyFromVault({ saveFirst: true }) }}
      />
      {saveError && (
        <div
          role="alert"
          className="absolute left-3 right-3 bottom-3 z-10 rounded-md border border-red-500/40 bg-red-950/80 px-3 py-2 text-xs text-red-100 shadow-2xl"
        >
          Save failed: {saveError}
        </div>
      )}
      {refreshError && (
        <div
          role="alert"
          className="absolute left-3 right-3 bottom-3 z-10 rounded-md border border-red-500/40 bg-red-950/80 px-3 py-2 text-xs text-red-100 shadow-2xl"
        >
          Refresh failed: {refreshError}
        </div>
      )}
      <div ref={containerRef} className={`w-full h-full ${markdownPreview && isMarkdown ? 'hidden' : ''}`} />
    </div>
  )
}

// -----------------------------------------------------------------------------
// Markdown preview renderer
// -----------------------------------------------------------------------------

function textFromReactNode(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textFromReactNode).join('')
  if (isValidElement<{ alt?: string; children?: ReactNode }>(node)) {
    if (typeof node.props.alt === 'string') return node.props.alt
    return textFromReactNode(node.props.children)
  }
  return ''
}

interface MarkdownPreviewChunk {
  content: string
  chunkId: string | null
}

function chunkWrapperFromEventTarget(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>('[data-chunk-id]') : null
}

function splitMarkdownPreviewChunks(content: string): MarkdownPreviewChunk[] {
  const lines = content.split('\n')
  const model = {
    getLineCount: () => lines.length,
    getLineContent: (lineNumber: number) => lines[lineNumber - 1] ?? '',
  }
  const nextChunkId = createHeadingIdTracker()
  const headingStarts = parseDocumentHeadings(model, 6).map((heading) => ({
    index: heading.line - 1,
    chunkId: nextChunkId(heading.text),
  }))

  if (headingStarts.length === 0) return [{ content, chunkId: null }]

  const chunks: MarkdownPreviewChunk[] = []
  const firstHeading = headingStarts[0]
  if (firstHeading.index > 0) {
    chunks.push({
      content: lines.slice(0, firstHeading.index).join('\n'),
      chunkId: null,
    })
  }

  for (let index = 0; index < headingStarts.length; index++) {
    const start = headingStarts[index]
    const end = headingStarts[index + 1]?.index ?? lines.length
    chunks.push({
      content: lines.slice(start.index, end).join('\n'),
      chunkId: start.chunkId,
    })
  }

  return chunks.filter((chunk) => chunk.content.length > 0)
}

function MarkdownPreview({
  content,
  previewBodyRef,
  selectionScopeId,
}: {
  content: string
  previewBodyRef: Ref<HTMLDivElement>
  selectionScopeId: string
}) {
  const previewFontSize = useSettingsStore((s) => s.previewFontSize)
  const activeChunkId = usePreviewSelectionStore((s) => s.getScope(selectionScopeId).activeChunkId)
  const pinnedChunkId = usePreviewSelectionStore((s) => s.getScope(selectionScopeId).pinnedChunkId)
  const cautionChunkIds = usePreviewSelectionStore((s) => s.getScope(selectionScopeId).cautionChunkIds)
  const connectedChunkIds = usePreviewSelectionStore((s) => s.getScope(selectionScopeId).connectedChunkIds)
  const pointerDownRef = useRef<{ chunkId: string | null, x: number, y: number } | null>(null)
  const cautionChunks = useMemo(() => new Set(cautionChunkIds), [cautionChunkIds])
  const connectedChunks = useMemo(() => new Set(connectedChunkIds), [connectedChunkIds])
  const baseSize = Number.isFinite(previewFontSize) ? Math.min(Math.max(Math.round(previewFontSize), 8), 40) : 14
  const sizes = {
    body: baseSize,
    h1: Math.round(baseSize * 1.65),
    h2: Math.round(baseSize * 1.35),
    h3: Math.round(baseSize * 1.15),
    h4: Math.round(baseSize * 1.05),
    h5: Math.round(baseSize),
    h6: Math.max(8, Math.round(baseSize * 0.92)),
    code: Math.max(8, Math.round(baseSize * 0.92)),
  }
  const previewChunks = useMemo(() => splitMarkdownPreviewChunks(content), [content])
  useEffect(() => {
    // Escape clears the pinned/active preview selection (REQ-007, REQ-037).
    // A window listener is required because preview chunks are non-focusable
    // divs, so after a click-pin focus stays on document.body — a listener
    // scoped to the preview element would miss that common case. To avoid
    // clearing a pinned scope from an unrelated Escape elsewhere in the app,
    // skip Escape that is owned by another editing surface (terminal, Monaco
    // editor, or a text field) that is not the preview or the SC inspector.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const active = document.activeElement as HTMLElement | null
      const ownedElsewhere =
        !!active &&
        active !== document.body &&
        !active.closest('[data-testid="markdown-preview-body"]') &&
        !active.closest('[data-testid="semantic-connections-panel"]') &&
        !!active.closest('.xterm, .monaco-editor, input, textarea, select, [contenteditable="true"]')
      if (ownedElsewhere) return
      usePreviewSelectionStore.getState().clearSelection(selectionScopeId)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      usePreviewSelectionStore.getState().clearSelection(selectionScopeId)
    }
  }, [selectionScopeId])

  const handleMouseOver = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const chunk = chunkWrapperFromEventTarget(event.target)
    const chunkId = chunk?.dataset.chunkId ?? null
    if (chunkId) usePreviewSelectionStore.getState().setHoveredChunkId(chunkId, selectionScopeId)
  }, [selectionScopeId])

  const handleMouseOut = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const chunk = chunkWrapperFromEventTarget(event.target)
    if (!chunk) return
    const related = chunkWrapperFromEventTarget(event.relatedTarget)
    if (related === chunk) return
    usePreviewSelectionStore.getState().setHoveredChunkId(null, selectionScopeId)
  }, [selectionScopeId])

  const handleMouseDown = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const chunk = chunkWrapperFromEventTarget(event.target)
    pointerDownRef.current = {
      chunkId: chunk?.dataset.chunkId ?? null,
      x: event.clientX,
      y: event.clientY,
    }
  }, [])

  const handleClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const chunk = chunkWrapperFromEventTarget(event.target)
    if (!chunk) {
      usePreviewSelectionStore.getState().clearSelection(selectionScopeId)
      return
    }
    if (event.target instanceof Element && event.target.closest('a')) return

    const started = pointerDownRef.current
    pointerDownRef.current = null
    const chunkId = chunk.dataset.chunkId
    if (!chunkId || (started && started.chunkId !== chunkId)) return
    const moved = started ? Math.abs(event.clientX - started.x) + Math.abs(event.clientY - started.y) : 0
    const selectedText = window.getSelection?.()?.toString() ?? ''
    if (moved > 4 || selectedText.length > 0) return

    usePreviewSelectionStore.getState().selectSection(chunkId, selectionScopeId)
  }, [selectionScopeId])

  const markdownComponentsForChunk = (chunkId: string | null) => {
    const headingProps = (children: ReactNode) => ({
      id: chunkId ?? slugifyHeading(textFromReactNode(Children.toArray(children))),
    })
    return {
    p: ({ children }: { children?: ReactNode }) => <p className="leading-relaxed my-2">{children}</p>,
    h1: ({ children }: { children?: ReactNode }) => <h1 {...headingProps(children)} className="font-bold text-primary mt-6 mb-2 pb-1 border-b border-neutral-300 dark:border-neutral-700" style={{ fontSize: sizes.h1 }}>{children}</h1>,
    h2: ({ children }: { children?: ReactNode }) => <h2 {...headingProps(children)} className="font-semibold text-primary mt-5 mb-2 pb-1 border-b border-neutral-300 dark:border-neutral-700" style={{ fontSize: sizes.h2 }}>{children}</h2>,
    h3: ({ children }: { children?: ReactNode }) => <h3 {...headingProps(children)} className="font-semibold text-primary mt-4 mb-1" style={{ fontSize: sizes.h3 }}>{children}</h3>,
    h4: ({ children }: { children?: ReactNode }) => <h4 {...headingProps(children)} className="font-semibold text-primary mt-3 mb-1" style={{ fontSize: sizes.h4 }}>{children}</h4>,
    h5: ({ children }: { children?: ReactNode }) => <h5 {...headingProps(children)} className="font-semibold text-primary mt-3 mb-1" style={{ fontSize: sizes.h5 }}>{children}</h5>,
    h6: ({ children }: { children?: ReactNode }) => <h6 {...headingProps(children)} className="font-medium text-primary/90 mt-2 mb-1" style={{ fontSize: sizes.h6 }}>{children}</h6>,
    ul: ({ children }: { children?: ReactNode }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
    ol: ({ children }: { children?: ReactNode }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
    li: ({ children }: { children?: ReactNode }) => <li className="leading-relaxed">{children}</li>,
    a: ({ href, children }: { href?: string, children?: ReactNode }) => (
      <a href={href} target="_blank" rel="noreferrer"
         className="text-blue-500 dark:text-blue-400 underline decoration-blue-500/30 hover:decoration-blue-500">
        {children}
      </a>
    ),
    blockquote: ({ children }: { children?: ReactNode }) => (
      <blockquote className="border-l-3 border-neutral-400 dark:border-neutral-600 pl-3 text-primary/80 italic my-2">
        {children}
      </blockquote>
    ),
    hr: () => <hr className="border-neutral-300 dark:border-neutral-700 my-4" />,
    strong: ({ children }: { children?: ReactNode }) => <strong className="font-semibold text-primary">{children}</strong>,
    em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
    code: ({ className, children, ...props }: { className?: string, children?: ReactNode }) => {
      const isBlock = /language-/.test(className ?? '')
      if (isBlock) {
        return (
          <code className={`${className ?? ''} font-mono leading-snug`} style={{ fontSize: sizes.code }} {...props}>
            {children}
          </code>
        )
      }
      return (
        <code className="font-mono px-1 py-[1px] rounded bg-neutral-200 dark:bg-neutral-800 text-pink-600 dark:text-pink-400" style={{ fontSize: sizes.code }} {...props}>
          {children}
        </code>
      )
    },
    pre: ({ children }: { children?: ReactNode }) => (
      <pre className="rounded-md bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 px-4 py-3 overflow-x-auto leading-snug my-3" style={{ fontSize: sizes.code }}>
        {children}
      </pre>
    ),
    table: ({ children }: { children?: ReactNode }) => (
      <div className="overflow-x-auto my-3">
        <table className="min-w-full border border-neutral-200 dark:border-neutral-700 rounded-md" style={{ fontSize: sizes.code }}>{children}</table>
      </div>
    ),
    th: ({ children }: { children?: ReactNode }) => (
      <th className="text-left px-3 py-1.5 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 font-medium">{children}</th>
    ),
    td: ({ children }: { children?: ReactNode }) => (
      <td className="px-3 py-1.5 border-b border-neutral-100 dark:border-neutral-800 align-top">{children}</td>
    ),
    img: ({ src, alt }: { src?: string, alt?: string }) => (
      <img src={src} alt={alt ?? ''} className="max-w-full rounded-md my-2" />
    ),
    }
  }

  return (
    <div className="absolute inset-0 overflow-auto px-6 py-4">
      <div
        ref={previewBodyRef}
        data-testid="markdown-preview-body"
        tabIndex={-1}
        className="max-w-3xl mx-auto prose-markdown space-y-3 text-primary leading-relaxed"
        style={{ fontSize: sizes.body }}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {previewChunks.map((chunk, index) => {
          const markdown = (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponentsForChunk(chunk.chunkId)}>
              {chunk.content}
            </ReactMarkdown>
          )
          if (!chunk.chunkId) return <div key={`preview-chunk-${index}`} className="space-y-3">{markdown}</div>
          const isActive = activeChunkId === chunk.chunkId
          const isPinned = pinnedChunkId === chunk.chunkId
          const isCaution = cautionChunks.has(chunk.chunkId)
          const hasConnections = connectedChunks.has(chunk.chunkId)
          const chunkClasses = [
            'cate-preview-chunk space-y-3 rounded border-l-2 border-transparent px-3 py-1 transition-colors',
            isActive ? 'cate-preview-chunk-active' : '',
            isActive && !isCaution ? 'border-teal-400 bg-teal-500/10' : '',
            isPinned ? 'cate-preview-chunk-pinned' : '',
            isPinned && !isCaution ? 'ring-1 ring-teal-400/50' : '',
            isCaution ? 'cate-preview-chunk-caution border-orange-400 bg-orange-500/10 ring-1 ring-orange-400/60' : '',
          ].filter(Boolean).join(' ')
          return (
            <div
              key={chunk.chunkId}
              data-chunk-id={chunk.chunkId}
              data-caution={cautionChunks.has(chunk.chunkId) ? 'true' : undefined}
              data-connected={hasConnections ? 'true' : undefined}
              className={chunkClasses}
              style={hasConnections && !isActive && !isCaution ? { borderLeftColor: '#2dd4bf4d', borderLeftWidth: 1 } : undefined}
            >
              {markdown}
            </div>
          )
        })}
      </div>
    </div>
  )
}
