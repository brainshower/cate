import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { BrowserBookmark, BrowserHistoryEntry } from '../shared/types'

let userDataDir = ''

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected app path: ${name}`)
      return userDataDir
    },
  },
}))

const {
  addBrowserBookmark,
  clearWorkspaceBrowserState,
  listBrowserBookmarks,
  listBrowserHistory,
  recordBrowserVisit,
  removeBrowserBookmark,
} = await import('./browserStateStore')

describe('browserStateStore', () => {
  beforeEach(async () => {
    userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cate-browser-state-'))
  })

  afterEach(async () => {
    await fs.rm(userDataDir, { recursive: true, force: true })
  })

  test('T-U-005 records visits under supplied workspaceId with count/title updates', async () => {
    await recordBrowserVisit('workspace-a', 'https://example.test/page', 'First title', 1000)
    await recordBrowserVisit('workspace-a', 'https://example.test/page', 'Updated title', 2000)
    await recordBrowserVisit('workspace-b', 'https://example.test/page', 'Other workspace', 3000)

    const historyA: BrowserHistoryEntry[] = await listBrowserHistory('workspace-a')
    const historyB: BrowserHistoryEntry[] = await listBrowserHistory('workspace-b')

    expect(historyA).toEqual([
      {
        url: 'https://example.test/page',
        title: 'Updated title',
        lastVisited: 2000,
        visitCount: 2,
      },
    ])
    expect(historyB).toEqual([
      {
        url: 'https://example.test/page',
        title: 'Other workspace',
        lastVisited: 3000,
        visitCount: 1,
      },
    ])
  })

  test('T-U-006 ignores about and non-recordable URLs', async () => {
    await recordBrowserVisit('workspace-a', 'about:blank', 'Blank')
    await recordBrowserVisit('workspace-a', 'chrome://settings', 'Settings')
    await recordBrowserVisit('workspace-a', 'file:///tmp/local.html', 'Local')
    await addBrowserBookmark('workspace-a', 'about:blank', 'Blank')
    await addBrowserBookmark('workspace-a', 'chrome://settings', 'Settings')

    expect(await listBrowserHistory('workspace-a')).toEqual([])
    expect(await listBrowserBookmarks('workspace-a')).toEqual([])
  })

  test('T-U-007 bookmark add/remove operates within supplied workspace only', async () => {
    await addBrowserBookmark('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await addBrowserBookmark('workspace-b', 'https://example.test/a', 'Example B', 2000)

    await removeBrowserBookmark('workspace-a', 'https://example.test/a')

    expect(await listBrowserBookmarks('workspace-a')).toEqual([])
    expect(await listBrowserBookmarks('workspace-b')).toEqual<BrowserBookmark[]>([
      {
        url: 'https://example.test/a',
        title: 'Example B',
        addedAt: 2000,
      },
    ])
  })

  test('T-U-003 workspace cleanup removes only target workspace history/bookmarks', async () => {
    await recordBrowserVisit('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await addBrowserBookmark('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await recordBrowserVisit('workspace-b', 'https://example.test/b', 'Example B', 2000)
    await addBrowserBookmark('workspace-b', 'https://example.test/b', 'Example B', 2000)

    await clearWorkspaceBrowserState('workspace-a')

    expect(await listBrowserHistory('workspace-a')).toEqual([])
    expect(await listBrowserBookmarks('workspace-a')).toEqual([])
  })

  test('T-U-004 workspace cleanup leaves other workspace history/bookmarks intact', async () => {
    await recordBrowserVisit('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await addBrowserBookmark('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await recordBrowserVisit('workspace-b', 'https://example.test/b', 'Example B', 2000)
    await addBrowserBookmark('workspace-b', 'https://example.test/b', 'Example B', 2000)

    await clearWorkspaceBrowserState('workspace-a')

    expect(await listBrowserHistory('workspace-b')).toEqual<BrowserHistoryEntry[]>([
      {
        url: 'https://example.test/b',
        title: 'Example B',
        lastVisited: 2000,
        visitCount: 1,
      },
    ])
    expect(await listBrowserBookmarks('workspace-b')).toEqual<BrowserBookmark[]>([
      {
        url: 'https://example.test/b',
        title: 'Example B',
        addedAt: 2000,
      },
    ])
  })

  test('T-U-022 clear-data removes only target workspace history/bookmarks', async () => {
    await recordBrowserVisit('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await addBrowserBookmark('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await recordBrowserVisit('workspace-b', 'https://example.test/b', 'Example B', 2000)
    await addBrowserBookmark('workspace-b', 'https://example.test/b', 'Example B', 2000)

    await clearWorkspaceBrowserState('workspace-a')

    expect(await listBrowserHistory('workspace-a')).toEqual([])
    expect(await listBrowserBookmarks('workspace-a')).toEqual([])
  })

  test('T-U-023 clear-data leaves other workspace browser state intact', async () => {
    await recordBrowserVisit('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await addBrowserBookmark('workspace-a', 'https://example.test/a', 'Example A', 1000)
    await recordBrowserVisit('workspace-b', 'https://example.test/b', 'Example B', 2000)
    await addBrowserBookmark('workspace-b', 'https://example.test/b', 'Example B', 2000)

    await clearWorkspaceBrowserState('workspace-a')

    expect(await listBrowserHistory('workspace-b')).toEqual([
      {
        url: 'https://example.test/b',
        title: 'Example B',
        lastVisited: 2000,
        visitCount: 1,
      },
    ])
    expect(await listBrowserBookmarks('workspace-b')).toEqual([
      {
        url: 'https://example.test/b',
        title: 'Example B',
        addedAt: 2000,
      },
    ])
  })
})
