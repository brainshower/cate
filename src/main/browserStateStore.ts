import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import log from './logger'
import type { BrowserBookmark, BrowserHistoryEntry } from '../shared/types'

interface WorkspaceBrowserState {
  history: BrowserHistoryEntry[]
  bookmarks: BrowserBookmark[]
}

interface BrowserStateFile {
  version: 1
  workspaces: Record<string, WorkspaceBrowserState>
}

const MAX_HISTORY_ENTRIES_PER_WORKSPACE = 500
const STATE_FILE_NAME = 'browser-state.json'

function emptyState(): BrowserStateFile {
  return { version: 1, workspaces: {} }
}

function browserStatePath(): string {
  return path.join(app.getPath('userData'), STATE_FILE_NAME)
}

function normalizeWorkspaceId(workspaceId: string): string {
  const normalized = workspaceId.trim()
  if (!normalized) throw new Error('Browser state workspaceId is required')
  return normalized
}

function isRecordableBrowserUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:'
}

function normalizeTitle(title: string, url: string): string {
  const trimmed = title.trim()
  return trimmed || url
}

function normalizeWorkspaceState(value: unknown): WorkspaceBrowserState {
  if (!value || typeof value !== 'object') {
    return { history: [], bookmarks: [] }
  }
  const record = value as Record<string, unknown>
  return {
    history: Array.isArray(record.history)
      ? record.history.filter(isBrowserHistoryEntry)
      : [],
    bookmarks: Array.isArray(record.bookmarks)
      ? record.bookmarks.filter(isBrowserBookmark)
      : [],
  }
}

function isBrowserHistoryEntry(value: unknown): value is BrowserHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.url === 'string'
    && typeof record.title === 'string'
    && typeof record.lastVisited === 'number'
    && typeof record.visitCount === 'number'
}

function isBrowserBookmark(value: unknown): value is BrowserBookmark {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.url === 'string'
    && typeof record.title === 'string'
    && typeof record.addedAt === 'number'
}

async function readState(): Promise<BrowserStateFile> {
  try {
    const raw = await fs.readFile(browserStatePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<BrowserStateFile>
    const workspaces: Record<string, WorkspaceBrowserState> = {}
    if (parsed.workspaces && typeof parsed.workspaces === 'object') {
      for (const [workspaceId, state] of Object.entries(parsed.workspaces)) {
        workspaces[workspaceId] = normalizeWorkspaceState(state)
      }
    }
    return { version: 1, workspaces }
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
      log.warn('[browserStateStore] Failed to read browser state: %O', error)
    }
    return emptyState()
  }
}

async function writeState(state: BrowserStateFile): Promise<void> {
  const filePath = browserStatePath()
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmpPath = `${filePath}.tmp`
  await fs.writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8')
  await fs.rename(tmpPath, filePath)
}

function workspaceState(state: BrowserStateFile, workspaceId: string): WorkspaceBrowserState {
  state.workspaces[workspaceId] ??= { history: [], bookmarks: [] }
  return state.workspaces[workspaceId]
}

export function isRecordableBrowserStateUrl(url: string): boolean {
  return isRecordableBrowserUrl(url)
}

export async function recordBrowserVisit(
  workspaceId: string,
  url: string,
  title = '',
  visitedAt = Date.now(),
): Promise<BrowserHistoryEntry | null> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  if (!isRecordableBrowserUrl(url)) return null

  const state = await readState()
  const current = workspaceState(state, normalizedWorkspaceId)
  const existing = current.history.find((entry) => entry.url === url)

  if (existing) {
    existing.title = normalizeTitle(title, url)
    existing.lastVisited = visitedAt
    existing.visitCount += 1
  } else {
    current.history.push({
      url,
      title: normalizeTitle(title, url),
      lastVisited: visitedAt,
      visitCount: 1,
    })
  }

  current.history.sort((a, b) => b.lastVisited - a.lastVisited)
  current.history = current.history.slice(0, MAX_HISTORY_ENTRIES_PER_WORKSPACE)
  await writeState(state)
  return current.history.find((entry) => entry.url === url) ?? null
}

export async function listBrowserHistory(workspaceId: string): Promise<BrowserHistoryEntry[]> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  const state = await readState()
  return [...(state.workspaces[normalizedWorkspaceId]?.history ?? [])]
}

export async function removeBrowserHistoryEntry(workspaceId: string, url: string): Promise<void> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  const state = await readState()
  const current = workspaceState(state, normalizedWorkspaceId)
  current.history = current.history.filter((entry) => entry.url !== url)
  await writeState(state)
}

export async function clearBrowserHistory(workspaceId: string): Promise<void> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  const state = await readState()
  const current = workspaceState(state, normalizedWorkspaceId)
  current.history = []
  await writeState(state)
}

export async function addBrowserBookmark(
  workspaceId: string,
  url: string,
  title = '',
  addedAt = Date.now(),
): Promise<BrowserBookmark | null> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  if (!isRecordableBrowserUrl(url)) return null

  const state = await readState()
  const current = workspaceState(state, normalizedWorkspaceId)
  const bookmark: BrowserBookmark = {
    url,
    title: normalizeTitle(title, url),
    addedAt,
  }
  const index = current.bookmarks.findIndex((entry) => entry.url === url)
  if (index >= 0) {
    current.bookmarks[index] = bookmark
  } else {
    current.bookmarks.push(bookmark)
  }
  current.bookmarks.sort((a, b) => a.addedAt - b.addedAt)
  await writeState(state)
  return bookmark
}

export async function listBrowserBookmarks(workspaceId: string): Promise<BrowserBookmark[]> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  const state = await readState()
  return [...(state.workspaces[normalizedWorkspaceId]?.bookmarks ?? [])]
}

export async function removeBrowserBookmark(workspaceId: string, url: string): Promise<void> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  const state = await readState()
  const current = workspaceState(state, normalizedWorkspaceId)
  current.bookmarks = current.bookmarks.filter((entry) => entry.url !== url)
  await writeState(state)
}

export async function clearBrowserBookmarks(workspaceId: string): Promise<void> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  const state = await readState()
  const current = workspaceState(state, normalizedWorkspaceId)
  current.bookmarks = []
  await writeState(state)
}

export async function clearWorkspaceBrowserState(workspaceId: string): Promise<void> {
  const normalizedWorkspaceId = normalizeWorkspaceId(workspaceId)
  const state = await readState()
  delete state.workspaces[normalizedWorkspaceId]
  await writeState(state)
}
