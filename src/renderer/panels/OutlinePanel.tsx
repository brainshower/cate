import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from '@phosphor-icons/react'
import {
  getActiveEditorSnapshot,
  subscribeActiveEditor,
  type ActiveEditorLike,
  type ActiveEditorModelLike,
  type ActiveEditorSnapshot,
  type DisposableLike,
} from '../lib/activeEditorRegistry'
import { parseDocumentHeadings, type DocumentHeading } from '../lib/parseDocumentHeadings'
import type { PanelProps } from './types'

const DEPTH_OPTIONS = [2, 3, 4, 5, 6] as const
const INDENTS: Record<number, number> = {
  1: 14,
  2: 28,
  3: 42,
  4: 56,
  5: 70,
  6: 84,
}

function isUsableEditor(editor: ActiveEditorLike | null, model: ActiveEditorModelLike | null): editor is ActiveEditorLike {
  if (!editor || !model) return false
  if (editor.isDisposed?.()) return false
  if (model.isDisposed?.()) return false
  return true
}

function nearestHeadingIndex(headings: DocumentHeading[], cursorLine: number): number {
  let active = -1
  for (let index = 0; index < headings.length; index++) {
    if (headings[index].line <= cursorLine) active = index
    else break
  }
  return active
}

function currentCursorLine(editor: ActiveEditorLike): number {
  const lineNumber = editor.getPosition?.()?.lineNumber
  return typeof lineNumber === 'number' && lineNumber > 0 ? lineNumber : 1
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function HighlightedHeadingText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim()
  if (!trimmed) return <>{text}</>
  const parts = text.split(new RegExp(`(${escapeRegExp(trimmed)})`, 'ig'))
  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === trimmed.toLowerCase()
          ? <mark key={`${part}-${index}`} className="rounded bg-yellow-500/50 px-0.5 text-inherit">{part}</mark>
          : <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>,
      )}
    </>
  )
}

export default function OutlinePanel({ panelId, workspaceId }: PanelProps) {
  const [snapshot, setSnapshot] = useState<ActiveEditorSnapshot>(() => getActiveEditorSnapshot(workspaceId))
  const [headings, setHeadings] = useState<DocumentHeading[]>([])
  const [maxDepth, setMaxDepth] = useState(3)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMatchIdx, setSearchMatchIdx] = useState(-1)
  const [cursorLine, setCursorLine] = useState(1)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const refresh = () => setSnapshot(getActiveEditorSnapshot(workspaceId))
    refresh()
    return subscribeActiveEditor(workspaceId, refresh)
  }, [workspaceId])

  const parseCurrentModel = useCallback((model = snapshot.model) => {
    if (!model || model.isDisposed?.()) {
      setHeadings([])
      return
    }
    setHeadings(parseDocumentHeadings(model, maxDepth))
  }, [maxDepth, snapshot.model])

  useEffect(() => {
    const { editor, model } = snapshot
    if (!editor || !model || editor.isDisposed?.() || model.isDisposed?.()) {
      setHeadings([])
      setCursorLine(1)
      return
    }
    const activeModel: ActiveEditorModelLike = model

    const disposables: DisposableLike[] = []
    setCursorLine(currentCursorLine(editor))
    parseCurrentModel(activeModel)

    disposables.push(editor.onDidChangeCursorPosition((event) => {
      setCursorLine(event.position.lineNumber)
    }))
    disposables.push(editor.onDidChangeModelContent(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        parseCurrentModel(editor.getModel())
      }, 300)
    }))
    const languageDisposable = activeModel.onDidChangeLanguage?.(() => parseCurrentModel(editor.getModel()))
    if (languageDisposable) disposables.push(languageDisposable)

    return () => {
      for (const disposable of disposables) disposable.dispose()
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [parseCurrentModel, snapshot])

  const activeHeadingIdx = useMemo(() => nearestHeadingIndex(headings, cursorLine), [headings, cursorLine])
  const trimmedQuery = searchQuery.trim()
  const matchingIndexes = useMemo(() => {
    if (!trimmedQuery) return []
    const lower = trimmedQuery.toLowerCase()
    return headings
      .map((heading, index) => heading.text.toLowerCase().includes(lower) ? index : -1)
      .filter((index) => index >= 0)
  }, [headings, trimmedQuery])

  const navigateToHeading = useCallback((heading: DocumentHeading) => {
    const { editor, markdownPreview, model, scrollPreviewToHeading } = snapshot
    if (markdownPreview) {
      scrollPreviewToHeading?.(heading.text)
      return
    }
    if (!isUsableEditor(editor, model)) return
    editor.revealLineInCenter(heading.line)
    editor.setPosition({ lineNumber: heading.line, column: 1 })
    editor.focus()
  }, [snapshot])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchMatchIdx(-1)
    searchInputRef.current?.focus()
  }, [])

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value)
    setSearchMatchIdx(-1)
  }

  const cycleSearch = () => {
    if (matchingIndexes.length === 0) return
    const next = (searchMatchIdx + 1) % matchingIndexes.length
    const headingIndex = matchingIndexes[next]
    setSearchMatchIdx(next)
    navigateToHeading(headings[headingIndex])
  }

  return (
    <section className="flex h-full min-h-0 flex-col bg-background text-foreground" data-panel-id={panelId}>
      <header className="border-b border-border px-3 py-2">
        <h2 className="text-sm font-semibold">Outline</h2>
      </header>

      <div className="space-y-2 border-b border-border px-3 py-2">
        <label className="sr-only" htmlFor={`${panelId}-depth`}>Outline depth</label>
        <select
          id={`${panelId}-depth`}
          aria-label="Outline depth"
          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
          value={maxDepth}
          onChange={(event) => setMaxDepth(Number(event.target.value))}
        >
          {DEPTH_OPTIONS.map((depth) => (
            <option key={depth} value={depth}>H1-H{depth}</option>
          ))}
        </select>

        <div className="relative">
          <input
            ref={searchInputRef}
            aria-label="Search outline"
            className="w-full rounded border border-border bg-background px-2 py-1 pr-8 text-xs text-foreground placeholder:text-muted-foreground"
            value={searchQuery}
            placeholder="Search headings"
            onChange={handleQueryChange}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                cycleSearch()
              }
            }}
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              aria-label="Clear outline search"
              className="absolute right-1 top-1 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={clearSearch}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-2 py-2">
        {headings.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
            No active editor headings.
          </div>
        ) : (
          <ol className="space-y-1">
            {headings.map((heading, index) => {
              const isActive = index === activeHeadingIdx
              const matchPosition = matchingIndexes.indexOf(index)
              const isMatch = matchPosition >= 0
              const isSearchFocused = isMatch && matchPosition === searchMatchIdx
              const rowClasses = [
                'block w-full truncate rounded-r px-2 py-1 text-left transition-colors hover:bg-muted/60',
                'border-l-2',
                heading.level === 1 ? 'text-sm font-semibold' : 'font-normal',
                heading.level >= 4 ? 'text-xs' : 'text-sm',
                isSearchFocused
                  ? 'border-blue-400 bg-blue-500 text-white'
                  : isMatch
                    ? 'border-transparent bg-yellow-400/20 text-foreground'
                    : isActive
                      ? 'border-blue-400 bg-blue-500/15 text-foreground'
                      : 'border-transparent text-foreground',
              ].join(' ')

              return (
                <li key={`${heading.line}-${heading.level}-${heading.text}`}>
                  <button
                    type="button"
                    className={rowClasses}
                    style={{ paddingLeft: INDENTS[heading.level] }}
                    data-testid="outline-heading-row"
                    data-level={heading.level}
                    data-line={heading.line}
                    onClick={() => navigateToHeading(heading)}
                  >
                    <HighlightedHeadingText text={heading.text} query={trimmedQuery} />
                  </button>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
