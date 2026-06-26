import { create } from 'zustand'
import type { BrowserBookmark, BrowserHistoryEntry } from '../../shared/types'

interface BrowserWorkspaceState {
  history: BrowserHistoryEntry[]
  bookmarks: BrowserBookmark[]
  loaded: boolean
}

interface BrowserStoreState {
  byWorkspace: Record<string, BrowserWorkspaceState>
  historyForWorkspace: (workspaceId: string) => BrowserHistoryEntry[]
  bookmarksForWorkspace: (workspaceId: string) => BrowserBookmark[]
  isBookmarked: (workspaceId: string, url: string) => boolean
  refreshWorkspace: (workspaceId: string) => Promise<void>
  refreshHistory: (workspaceId: string) => Promise<void>
  refreshBookmarks: (workspaceId: string) => Promise<void>
  recordVisit: (workspaceId: string, url: string, title?: string) => Promise<BrowserHistoryEntry | null>
  addBookmark: (workspaceId: string, url: string, title?: string) => Promise<BrowserBookmark | null>
  removeBookmark: (workspaceId: string, url: string) => Promise<void>
}

const EMPTY_HISTORY: BrowserHistoryEntry[] = []
const EMPTY_BOOKMARKS: BrowserBookmark[] = []

function emptyWorkspace(): BrowserWorkspaceState {
  return {
    history: [],
    bookmarks: [],
    loaded: false,
  }
}

function normalizeUrlForMatch(url: string): string {
  return url.trim()
}

function hasWorkspaceId(workspaceId: string): boolean {
  return workspaceId.trim().length > 0
}

function setWorkspace(
  byWorkspace: Record<string, BrowserWorkspaceState>,
  workspaceId: string,
  patch: Partial<BrowserWorkspaceState>,
): Record<string, BrowserWorkspaceState> {
  return {
    ...byWorkspace,
    [workspaceId]: {
      ...(byWorkspace[workspaceId] ?? emptyWorkspace()),
      ...patch,
    },
  }
}

export const useBrowserStore = create<BrowserStoreState>((set, get) => ({
  byWorkspace: {},

  historyForWorkspace: (workspaceId) => get().byWorkspace[workspaceId]?.history ?? EMPTY_HISTORY,

  bookmarksForWorkspace: (workspaceId) => get().byWorkspace[workspaceId]?.bookmarks ?? EMPTY_BOOKMARKS,

  isBookmarked: (workspaceId, url) => {
    const normalized = normalizeUrlForMatch(url)
    if (!normalized) return false
    return get().bookmarksForWorkspace(workspaceId).some((bookmark) => normalizeUrlForMatch(bookmark.url) === normalized)
  },

  refreshWorkspace: async (workspaceId) => {
    await Promise.all([
      get().refreshHistory(workspaceId),
      get().refreshBookmarks(workspaceId),
    ])
  },

  refreshHistory: async (workspaceId) => {
    if (!hasWorkspaceId(workspaceId)) return
    const history = await window.electronAPI.browserHistoryGet(workspaceId)
    set((state) => ({
      byWorkspace: setWorkspace(state.byWorkspace, workspaceId, {
        history,
        loaded: true,
      }),
    }))
  },

  refreshBookmarks: async (workspaceId) => {
    if (!hasWorkspaceId(workspaceId)) return
    const bookmarks = await window.electronAPI.browserBookmarksGet(workspaceId)
    set((state) => ({
      byWorkspace: setWorkspace(state.byWorkspace, workspaceId, {
        bookmarks,
        loaded: true,
      }),
    }))
  },

  recordVisit: async (workspaceId, url, title) => {
    if (!hasWorkspaceId(workspaceId)) return null
    const entry = await window.electronAPI.browserHistoryRecord(workspaceId, url, title)
    if (entry) {
      set((state) => {
        const current = state.byWorkspace[workspaceId]?.history ?? []
        const next = [entry, ...current.filter((item) => item.url !== entry.url)]
        return {
          byWorkspace: setWorkspace(state.byWorkspace, workspaceId, {
            history: next,
            loaded: true,
          }),
        }
      })
    }
    return entry
  },

  addBookmark: async (workspaceId, url, title) => {
    if (!hasWorkspaceId(workspaceId)) return null
    const bookmark = await window.electronAPI.browserBookmarksAdd(workspaceId, url, title)
    if (bookmark) {
      set((state) => {
        const current = state.byWorkspace[workspaceId]?.bookmarks ?? []
        const next = [bookmark, ...current.filter((item) => item.url !== bookmark.url)]
        return {
          byWorkspace: setWorkspace(state.byWorkspace, workspaceId, {
            bookmarks: next,
            loaded: true,
          }),
        }
      })
    }
    return bookmark
  },

  removeBookmark: async (workspaceId, url) => {
    if (!hasWorkspaceId(workspaceId)) return
    await window.electronAPI.browserBookmarksRemove(workspaceId, url)
    set((state) => {
      const current = state.byWorkspace[workspaceId]?.bookmarks ?? []
      return {
        byWorkspace: setWorkspace(state.byWorkspace, workspaceId, {
          bookmarks: current.filter((item) => item.url !== url),
          loaded: true,
        }),
      }
    })
  },
}))

let browserStoreSubscriptionsInitialized = false

export function initializeBrowserStoreSubscriptions(): void {
  if (browserStoreSubscriptionsInitialized) return
  if (typeof window === 'undefined' || !window.electronAPI) return

  window.electronAPI.onBrowserHistoryChanged((payload) => {
    void useBrowserStore.getState().refreshHistory(payload.workspaceId)
  })
  window.electronAPI.onBrowserBookmarksChanged((payload) => {
    void useBrowserStore.getState().refreshBookmarks(payload.workspaceId)
  })
  browserStoreSubscriptionsInitialized = true
}
