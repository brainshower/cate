// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserBookmark, BrowserHistoryEntry } from '../../shared/types'

const historyA: BrowserHistoryEntry[] = [
  { url: 'https://example.test/a', title: 'Workspace A', lastVisited: 100, visitCount: 1 },
]
const historyB: BrowserHistoryEntry[] = [
  { url: 'https://example.test/b', title: 'Workspace B', lastVisited: 200, visitCount: 2 },
]
const bookmarkA: BrowserBookmark = { url: 'https://example.test/a', title: 'Workspace A', addedAt: 100 }
const bookmarkB: BrowserBookmark = { url: 'https://example.test/b', title: 'Workspace B', addedAt: 200 }

let historyChanged: ((payload: { workspaceId: string }) => void) | null = null
let bookmarksChanged: ((payload: { workspaceId: string }) => void) | null = null

const api = {
  browserHistoryGet: vi.fn(async (workspaceId: string) => workspaceId === 'workspace-a' ? historyA : historyB),
  browserHistoryRecord: vi.fn(async (_workspaceId: string, url: string, title = url) => ({
    url,
    title,
    lastVisited: 300,
    visitCount: 1,
  })),
  browserHistoryRemove: vi.fn(async () => undefined),
  browserHistoryClear: vi.fn(async () => undefined),
  onBrowserHistoryChanged: vi.fn((callback: (payload: { workspaceId: string }) => void) => {
    historyChanged = callback
    return vi.fn()
  }),
  browserBookmarksGet: vi.fn(async (workspaceId: string) => workspaceId === 'workspace-a' ? [bookmarkA] : [bookmarkB]),
  browserBookmarksAdd: vi.fn(async (_workspaceId: string, url: string, title = url) => ({ url, title, addedAt: 300 })),
  browserBookmarksRemove: vi.fn(async () => undefined),
  browserBookmarksClear: vi.fn(async () => undefined),
  onBrowserBookmarksChanged: vi.fn((callback: (payload: { workspaceId: string }) => void) => {
    bookmarksChanged = callback
    return vi.fn()
  }),
}

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  historyChanged = null
  bookmarksChanged = null
  ;(window as any).electronAPI = api
})

describe('browserStore workspace-scoped selectors', () => {
  it('T-U-030 returns history and bookmarks for the queried workspaceId', async () => {
    const { useBrowserStore } = await import('./browserStore')
    const store = useBrowserStore.getState()

    await store.refreshWorkspace('workspace-a')
    await store.refreshWorkspace('workspace-b')

    expect(store.historyForWorkspace('workspace-a')).toEqual(historyA)
    expect(store.historyForWorkspace('workspace-b')).toEqual(historyB)
    expect(store.bookmarksForWorkspace('workspace-a')).toEqual([bookmarkA])
    expect(store.bookmarksForWorkspace('workspace-b')).toEqual([bookmarkB])
    expect(store.isBookmarked('workspace-a', bookmarkA.url)).toBe(true)
    expect(store.isBookmarked('workspace-b', bookmarkA.url)).toBe(false)
  })

  it('T-U-008 refreshes only the workspace named by invalidation events', async () => {
    const { useBrowserStore, initializeBrowserStoreSubscriptions } = await import('./browserStore')
    const store = useBrowserStore.getState()

    await store.refreshWorkspace('workspace-a')
    await store.refreshWorkspace('workspace-b')
    api.browserHistoryGet.mockClear()
    api.browserBookmarksGet.mockClear()

    initializeBrowserStoreSubscriptions()
    expect(historyChanged).not.toBeNull()
    expect(bookmarksChanged).not.toBeNull()

    await historyChanged!({ workspaceId: 'workspace-a' })
    await bookmarksChanged!({ workspaceId: 'workspace-a' })

    expect(api.browserHistoryGet).toHaveBeenCalledTimes(1)
    expect(api.browserHistoryGet).toHaveBeenCalledWith('workspace-a')
    expect(api.browserBookmarksGet).toHaveBeenCalledTimes(1)
    expect(api.browserBookmarksGet).toHaveBeenCalledWith('workspace-a')
    expect(store.bookmarksForWorkspace('workspace-b')).toEqual([bookmarkB])
  })
})

describe('browserStore bookmark actions', () => {
  it('T-U-017 toggles bookmarks with the supplied workspaceId', async () => {
    const { useBrowserStore } = await import('./browserStore')
    const store = useBrowserStore.getState()

    await store.addBookmark('workspace-b', 'https://example.test/new', 'New Page')
    await store.removeBookmark('workspace-a', bookmarkA.url)

    expect(api.browserBookmarksAdd).toHaveBeenCalledWith('workspace-b', 'https://example.test/new', 'New Page')
    expect(api.browserBookmarksRemove).toHaveBeenCalledWith('workspace-a', bookmarkA.url)
  })
})
