export interface DisposableLike {
  dispose: () => void
}

export interface ActiveEditorModelLike {
  getLineCount: () => number
  getLineContent: (lineNumber: number) => string
  isDisposed?: () => boolean
  onDidChangeLanguage?: (listener: () => void) => DisposableLike
}

export interface ActiveEditorLike {
  getModel: () => ActiveEditorModelLike | null
  getPosition?: () => { lineNumber: number } | null
  isDisposed?: () => boolean
  onDidChangeCursorPosition: (listener: (event: { position: { lineNumber: number } }) => void) => DisposableLike
  onDidChangeModelContent: (listener: () => void) => DisposableLike
  revealLineInCenter: (lineNumber: number) => void
  setPosition: (position: { lineNumber: number; column: number }) => void
  focus: () => void
}

export interface ActiveEditorEntry {
  workspaceId: string
  panelId: string
  editor: ActiveEditorLike
  model: ActiveEditorModelLike | null
  markdownPreview: boolean
  scrollPreviewToHeading?: (headingText: string, occurrenceIndex?: number) => void
}

export interface ActiveEditorSnapshot {
  panelId: string | null
  editor: ActiveEditorLike | null
  model: ActiveEditorModelLike | null
  markdownPreview: boolean
  scrollPreviewToHeading?: (headingText: string, occurrenceIndex?: number) => void
}

const entries = new Map<string, Map<string, ActiveEditorEntry>>()
const activePanelIds = new Map<string, string>()
const listeners = new Map<string, Set<() => void>>()

function workspaceEntries(workspaceId: string): Map<string, ActiveEditorEntry> {
  let workspace = entries.get(workspaceId)
  if (!workspace) {
    workspace = new Map()
    entries.set(workspaceId, workspace)
  }
  return workspace
}

function notify(workspaceId: string): void {
  for (const listener of listeners.get(workspaceId) ?? []) listener()
}

function safeModel(editor: ActiveEditorLike): ActiveEditorModelLike | null {
  if (editor.isDisposed?.()) return null
  const model = editor.getModel()
  if (model?.isDisposed?.()) return null
  return model
}

export function registerActiveEditor(workspaceId: string, panelId: string, editor: ActiveEditorLike): void {
  workspaceEntries(workspaceId).set(panelId, {
    workspaceId,
    panelId,
    editor,
    model: safeModel(editor),
    markdownPreview: false,
  })
  activePanelIds.set(workspaceId, panelId)
  notify(workspaceId)
}

export function updateActiveEditorModel(workspaceId: string, panelId: string): void {
  const entry = entries.get(workspaceId)?.get(panelId)
  if (!entry) return
  entry.model = safeModel(entry.editor)
  notify(workspaceId)
}

export function updateActiveEditorPreview(
  workspaceId: string,
  panelId: string,
  preview: {
    markdownPreview: boolean
    scrollPreviewToHeading?: (headingText: string, occurrenceIndex?: number) => void
  },
): void {
  const entry = entries.get(workspaceId)?.get(panelId)
  if (!entry) return
  entry.markdownPreview = preview.markdownPreview
  entry.scrollPreviewToHeading = preview.scrollPreviewToHeading
  notify(workspaceId)
}

export function unregisterActiveEditor(workspaceId: string, panelId: string): void {
  const workspace = entries.get(workspaceId)
  if (!workspace) return
  workspace.delete(panelId)
  if (activePanelIds.get(workspaceId) === panelId) {
    const fallback = [...workspace.keys()].at(-1)
    if (fallback) activePanelIds.set(workspaceId, fallback)
    else activePanelIds.delete(workspaceId)
  }
  if (workspace.size === 0) entries.delete(workspaceId)
  notify(workspaceId)
}

export function getActiveEditorSnapshot(workspaceId: string): ActiveEditorSnapshot {
  const panelId = activePanelIds.get(workspaceId) ?? null
  const entry = panelId ? entries.get(workspaceId)?.get(panelId) : null
  if (!entry || entry.editor.isDisposed?.()) {
    return { panelId: null, editor: null, model: null, markdownPreview: false }
  }
  const model = safeModel(entry.editor)
  entry.model = model
  return {
    panelId,
    editor: entry.editor,
    model,
    markdownPreview: entry.markdownPreview,
    scrollPreviewToHeading: entry.scrollPreviewToHeading,
  }
}

export function subscribeActiveEditor(workspaceId: string, listener: () => void): () => void {
  let workspaceListeners = listeners.get(workspaceId)
  if (!workspaceListeners) {
    workspaceListeners = new Set()
    listeners.set(workspaceId, workspaceListeners)
  }
  workspaceListeners.add(listener)
  return () => {
    workspaceListeners?.delete(listener)
    if (workspaceListeners?.size === 0) listeners.delete(workspaceId)
  }
}

export function clearActiveEditorRegistryForTests(): void {
  entries.clear()
  activePanelIds.clear()
  listeners.clear()
}
