import { BrowserWindow, ipcMain, session } from 'electron'
import {
  BROWSER_BOOKMARKS_ADD,
  BROWSER_BOOKMARKS_CHANGED,
  BROWSER_BOOKMARKS_CLEAR,
  BROWSER_BOOKMARKS_GET,
  BROWSER_BOOKMARKS_REMOVE,
  BROWSER_CLEAR_DATA,
  BROWSER_HISTORY_CHANGED,
  BROWSER_HISTORY_CLEAR,
  BROWSER_HISTORY_GET,
  BROWSER_HISTORY_RECORD,
  BROWSER_HISTORY_REMOVE,
} from '../../shared/ipc-channels'
import type { BrowserBookmark, BrowserClearDataResult, BrowserHistoryEntry } from '../../shared/types'
import {
  addBrowserBookmark,
  clearBrowserBookmarks,
  clearBrowserHistory,
  clearWorkspaceBrowserState,
  listBrowserBookmarks,
  listBrowserHistory,
  recordBrowserVisit,
  removeBrowserBookmark,
  removeBrowserHistoryEntry,
} from '../browserStateStore'
import log from '../logger'

const BROWSER_STORAGE_TYPES = [
  'cookies',
  'filesystem',
  'indexdb',
  'localstorage',
  'shadercache',
  'websql',
  'serviceworkers',
  'cachestorage',
] as const

let handlersRegistered = false

function browserPartitionForWorkspace(workspaceId: string): string {
  const normalized = workspaceId.trim()
  if (!normalized) throw new Error('Browser workspaceId is required')
  return `persist:browser-ws-${normalized}`
}

function broadcast(channel: string, workspaceId: string): void {
  const payload = { workspaceId }
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed?.()) continue
    win.webContents.send(channel, payload)
  }
}

function successClearResult(workspaceId: string, partition: string): BrowserClearDataResult {
  return {
    ok: true,
    workspaceId,
    partition,
    cleared: {
      electronStorage: true,
      history: true,
      bookmarks: true,
    },
  }
}

function failureClearResult(
  workspaceId: string,
  partition: string,
  error: unknown,
  cleared: BrowserClearDataResult['cleared'],
): BrowserClearDataResult {
  const message = error instanceof Error ? error.message : String(error)
  return {
    ok: false,
    workspaceId,
    partition,
    error: message || 'Failed to clear browser data',
    cleared,
  }
}

export function registerBrowserHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(BROWSER_HISTORY_GET, async (_event, workspaceId: string): Promise<BrowserHistoryEntry[]> => {
    return listBrowserHistory(workspaceId)
  })

  ipcMain.handle(
    BROWSER_HISTORY_RECORD,
    async (_event, workspaceId: string, url: string, title = ''): Promise<BrowserHistoryEntry | null> => {
      const result = await recordBrowserVisit(workspaceId, url, title)
      if (result) {
        broadcast(BROWSER_HISTORY_CHANGED, workspaceId)
      }
      return result
    },
  )

  ipcMain.handle(BROWSER_HISTORY_REMOVE, async (_event, workspaceId: string, url: string): Promise<void> => {
    await removeBrowserHistoryEntry(workspaceId, url)
    broadcast(BROWSER_HISTORY_CHANGED, workspaceId)
  })

  ipcMain.handle(BROWSER_HISTORY_CLEAR, async (_event, workspaceId: string): Promise<void> => {
    await clearBrowserHistory(workspaceId)
    broadcast(BROWSER_HISTORY_CHANGED, workspaceId)
  })

  ipcMain.handle(BROWSER_BOOKMARKS_GET, async (_event, workspaceId: string): Promise<BrowserBookmark[]> => {
    return listBrowserBookmarks(workspaceId)
  })

  ipcMain.handle(
    BROWSER_BOOKMARKS_ADD,
    async (_event, workspaceId: string, url: string, title = ''): Promise<BrowserBookmark | null> => {
      const result = await addBrowserBookmark(workspaceId, url, title)
      if (result) {
        broadcast(BROWSER_BOOKMARKS_CHANGED, workspaceId)
      }
      return result
    },
  )

  ipcMain.handle(BROWSER_BOOKMARKS_REMOVE, async (_event, workspaceId: string, url: string): Promise<void> => {
    await removeBrowserBookmark(workspaceId, url)
    broadcast(BROWSER_BOOKMARKS_CHANGED, workspaceId)
  })

  ipcMain.handle(BROWSER_BOOKMARKS_CLEAR, async (_event, workspaceId: string): Promise<void> => {
    await clearBrowserBookmarks(workspaceId)
    broadcast(BROWSER_BOOKMARKS_CHANGED, workspaceId)
  })

  ipcMain.handle(BROWSER_CLEAR_DATA, async (_event, workspaceId: string): Promise<BrowserClearDataResult> => {
    const partition = browserPartitionForWorkspace(workspaceId)
    const cleared = {
      electronStorage: false,
      history: false,
      bookmarks: false,
    }

    try {
      await session.fromPartition(partition).clearStorageData({
        storages: [...BROWSER_STORAGE_TYPES],
      })
      cleared.electronStorage = true

      await clearWorkspaceBrowserState(workspaceId)
      cleared.history = true
      cleared.bookmarks = true

      broadcast(BROWSER_HISTORY_CHANGED, workspaceId)
      broadcast(BROWSER_BOOKMARKS_CHANGED, workspaceId)
      return successClearResult(workspaceId, partition)
    } catch (error) {
      log.warn('[browser:clear-data] Failed to clear browser data: %O', error)
      return failureClearResult(workspaceId, partition, error, cleared)
    }
  })
}
