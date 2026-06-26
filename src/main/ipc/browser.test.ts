import { beforeEach, describe, expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  BROWSER_BOOKMARKS_ADD,
  BROWSER_BOOKMARKS_CLEAR,
  BROWSER_BOOKMARKS_CHANGED,
  BROWSER_BOOKMARKS_GET,
  BROWSER_BOOKMARKS_REMOVE,
  BROWSER_CLEAR_DATA,
  BROWSER_HISTORY_CHANGED,
  BROWSER_HISTORY_CLEAR,
  BROWSER_HISTORY_GET,
  BROWSER_HISTORY_RECORD,
  BROWSER_HISTORY_REMOVE,
} from '../../shared/ipc-channels'

const BROWSER_IPC_SOURCE = readFileSync(new URL('./browser.ts', import.meta.url), 'utf8')

const handlers = new Map<string, (...args: unknown[]) => unknown>()
const send = vi.fn()
const sessionFromPartition = vi.fn()
const clearStorageData = vi.fn()
const recordBrowserVisit = vi.fn()
const listBrowserHistory = vi.fn()
const removeBrowserHistoryEntry = vi.fn()
const addBrowserBookmark = vi.fn()
const listBrowserBookmarks = vi.fn()
const removeBrowserBookmark = vi.fn()
const clearWorkspaceBrowserState = vi.fn()
const flashqueryCredentialsProbe = vi.fn()
const flashqueryClientProbe = vi.fn()
const flashqueryIpcProbe = vi.fn()

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [{ webContents: { send } }],
  },
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
      handlers.set(channel, fn)
    },
  },
  session: {
    fromPartition: sessionFromPartition,
  },
}))

vi.mock('../browserStateStore', () => ({
  recordBrowserVisit,
  listBrowserHistory,
  removeBrowserHistoryEntry,
  addBrowserBookmark,
  listBrowserBookmarks,
  removeBrowserBookmark,
  clearWorkspaceBrowserState,
}))

vi.mock('../flashquery/credentials', () => ({
  browserTestCredentialProbe: flashqueryCredentialsProbe,
}))

vi.mock('../flashquery/clientManager', () => ({
  browserTestClientProbe: flashqueryClientProbe,
}))

vi.mock('./flashquery', () => ({
  browserTestIpcProbe: flashqueryIpcProbe,
}))

const { registerBrowserHandlers } = await import('./browser')

describe('registerBrowserHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearStorageData.mockResolvedValue(undefined)
    sessionFromPartition.mockReturnValue({ clearStorageData })
    recordBrowserVisit.mockResolvedValue({ url: 'https://example.test', title: 'Example', lastVisited: 1000, visitCount: 1 })
    addBrowserBookmark.mockResolvedValue({ url: 'https://example.test', title: 'Example', addedAt: 1000 })
    listBrowserHistory.mockResolvedValue([{ url: 'https://example.test', title: 'Example', lastVisited: 1000, visitCount: 1 }])
    listBrowserBookmarks.mockResolvedValue([{ url: 'https://example.test', title: 'Example', addedAt: 1000 }])
  })

  test('registers browser handlers once', () => {
    registerBrowserHandlers()
    registerBrowserHandlers()

    expect([...handlers.keys()].sort()).toEqual([
      BROWSER_BOOKMARKS_ADD,
      BROWSER_BOOKMARKS_CLEAR,
      BROWSER_BOOKMARKS_GET,
      BROWSER_BOOKMARKS_REMOVE,
      BROWSER_CLEAR_DATA,
      BROWSER_HISTORY_CLEAR,
      BROWSER_HISTORY_GET,
      BROWSER_HISTORY_RECORD,
      BROWSER_HISTORY_REMOVE,
    ].sort())
  })

  test('records history and broadcasts workspace-scoped invalidation', async () => {
    registerBrowserHandlers()

    await handlers.get(BROWSER_HISTORY_RECORD)!({}, 'workspace-a', 'https://example.test', 'Example')

    expect(recordBrowserVisit).toHaveBeenCalledWith('workspace-a', 'https://example.test', 'Example')
    expect(send).toHaveBeenCalledWith(BROWSER_HISTORY_CHANGED, { workspaceId: 'workspace-a' })
  })

  test('adds and removes bookmarks with workspace-scoped broadcasts', async () => {
    registerBrowserHandlers()

    await handlers.get(BROWSER_BOOKMARKS_ADD)!({}, 'workspace-a', 'https://example.test', 'Example')
    await handlers.get(BROWSER_BOOKMARKS_REMOVE)!({}, 'workspace-a', 'https://example.test')

    expect(addBrowserBookmark).toHaveBeenCalledWith('workspace-a', 'https://example.test', 'Example')
    expect(removeBrowserBookmark).toHaveBeenCalledWith('workspace-a', 'https://example.test')
    expect(send).toHaveBeenCalledWith(BROWSER_BOOKMARKS_CHANGED, { workspaceId: 'workspace-a' })
    expect(send).toHaveBeenCalledTimes(2)
  })

  test('T-I-002 BROWSER_CLEAR_DATA clears target partition and returns success details', async () => {
    registerBrowserHandlers()

    const result = await handlers.get(BROWSER_CLEAR_DATA)!({}, 'workspace-a')

    expect(sessionFromPartition).toHaveBeenCalledWith('persist:browser-ws-workspace-a')
    expect(clearStorageData).toHaveBeenCalledWith({
      storages: ['cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage'],
    })
    expect(clearWorkspaceBrowserState).toHaveBeenCalledWith('workspace-a')
    expect(result).toEqual({
      ok: true,
      workspaceId: 'workspace-a',
      partition: 'persist:browser-ws-workspace-a',
      cleared: {
        electronStorage: true,
        history: true,
        bookmarks: true,
      },
    })
    expect(send).toHaveBeenCalledWith(BROWSER_HISTORY_CHANGED, { workspaceId: 'workspace-a' })
    expect(send).toHaveBeenCalledWith(BROWSER_BOOKMARKS_CHANGED, { workspaceId: 'workspace-a' })
  })

  test('BROWSER_CLEAR_DATA returns explicit failure details', async () => {
    clearStorageData.mockRejectedValueOnce(new Error('clear failed'))
    registerBrowserHandlers()

    const result = await handlers.get(BROWSER_CLEAR_DATA)!({}, 'workspace-a')

    expect(result).toEqual({
      ok: false,
      workspaceId: 'workspace-a',
      partition: 'persist:browser-ws-workspace-a',
      error: 'clear failed',
      cleared: {
        electronStorage: false,
        history: false,
        bookmarks: false,
      },
    })
  })

  test('T-I-003/T-U-028 browser operations do not call FlashQuery modules', async () => {
    registerBrowserHandlers()

    await handlers.get(BROWSER_HISTORY_GET)!({}, 'workspace-a')
    await handlers.get(BROWSER_HISTORY_RECORD)!({}, 'workspace-a', 'https://example.test', 'Example')
    await handlers.get(BROWSER_BOOKMARKS_GET)!({}, 'workspace-a')
    await handlers.get(BROWSER_BOOKMARKS_ADD)!({}, 'workspace-a', 'https://example.test', 'Example')
    await handlers.get(BROWSER_CLEAR_DATA)!({}, 'workspace-a')

    expect(flashqueryCredentialsProbe).not.toHaveBeenCalled()
    expect(flashqueryClientProbe).not.toHaveBeenCalled()
    expect(flashqueryIpcProbe).not.toHaveBeenCalled()
  })

  test('T-U-028 browser IPC source does not import FlashQuery credential or client modules', () => {
    expect(BROWSER_IPC_SOURCE).not.toMatch(/from ['"]\.\.\/flashquery\/credentials['"]/)
    expect(BROWSER_IPC_SOURCE).not.toMatch(/from ['"]\.\.\/flashquery\/clientManager['"]/)
    expect(BROWSER_IPC_SOURCE).not.toMatch(/from ['"]\.\/flashquery['"]/)
    expect(BROWSER_IPC_SOURCE).not.toMatch(/flashquery/i)
  })
})
