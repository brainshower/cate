import { test, expect } from '@playwright/test'
import { createServer, type Server } from 'node:http'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { closeApp, createBrowserPanel, createWorkspace, evalBrowserPanel, launchApp, waitForBrowserPartition } from './fixtures/electron-app'
import type { ElectronApplication, Page } from 'playwright'

async function startLocalBrowserServer(
  handler: Parameters<typeof createServer>[0] = (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><title>Cate Browser Uplift</title><body>browser uplift local page</body>')
  },
): Promise<{ baseUrl: string; close(): Promise<void> }> {
  const server = createServer(handler)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to bind local browser server')
  return {
    baseUrl: `http://127.0.0.1:${address.port}/`,
    close: () => new Promise<void>((resolve, reject) => {
      ;(server as Server).close((error) => error ? reject(error) : resolve())
    }),
  }
}

async function unusedLocalPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Failed to bind local port')
  const port = address.port
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
  return port
}

test('T-E-001/T-E-021 browser storage persists across browser-panel recreation in the same workspace partition', async () => {
  const server = await startLocalBrowserServer()
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-uplift-user-data-'))
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-uplift-workspace-'))
  const { electronApp: app, mainWindow: page } = await launchApp({ userDataDir })

  try {
    const workspaceId = await page.evaluate((rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
    const panelId = await createBrowserPanel(page, server.baseUrl)

    await expect(await waitForBrowserPartition(page, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await evalBrowserPanel(page, panelId, "document.cookie = 'cateSession=persisted; Max-Age=3600; Path=/'; document.cookie")
    await page.evaluate((id) => window.__cateE2E!.closePanel(id), panelId)

    const recreatedPanelId = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, recreatedPanelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await expect(await evalBrowserPanel(page, recreatedPanelId, "document.cookie.includes('cateSession=persisted')")).toBe(true)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-002 browser storage is isolated between workspace partitions', async () => {
  const server = await startLocalBrowserServer()
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const workspaceA = await createWorkspace(page, 'Browser Workspace A')
    const panelA = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, panelA)).toBe(`persist:browser-ws-${workspaceA}`)
    await evalBrowserPanel(page, panelA, "document.cookie = 'cateSession=workspace-a; Max-Age=3600; Path=/'; document.cookie")

    const workspaceB = await createWorkspace(page, 'Browser Workspace B')
    const panelB = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, panelB)).toBe(`persist:browser-ws-${workspaceB}`)
    await expect(await evalBrowserPanel(page, panelB, "document.cookie.includes('cateSession=workspace-a')")).toBe(false)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-003/T-E-020 detached browser windows reuse the same workspace partition', async () => {
  const server = await startLocalBrowserServer()
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const workspaceId = await page.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    const panelId = await createBrowserPanel(page, server.baseUrl)
    await expect(await waitForBrowserPartition(page, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await evalBrowserPanel(page, panelId, "document.cookie = 'cateSession=detached-shared; Max-Age=3600; Path=/'; document.cookie")

    const before = app.windows().length
    await page.evaluate((id) => window.__cateE2E!.detachPanelToDockWindow(id), panelId)
    await expect.poll(() => app.windows().length).toBeGreaterThan(before)
    const detachedPage = app.windows()[app.windows().length - 1]
    await detachedPage.waitForLoadState('domcontentloaded')

    await expect(await waitForBrowserPartition(detachedPage, panelId)).toBe(`persist:browser-ws-${workspaceId}`)
    await expect(await evalBrowserPanel(detachedPage, panelId, "document.cookie.includes('cateSession=detached-shared')")).toBe(true)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-007 page with failing subresource remains visible without failed-load overlay', async () => {
  const missingPort = await unusedLocalPort()
  const server = await startLocalBrowserServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(`<!doctype html>
      <title>Cate Browser Uplift Subresource</title>
      <body>
        <h1 id="loaded">subresource page loaded</h1>
        <img src="http://127.0.0.1:${missingPort}/missing.png" />
      </body>`)
  })
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const panelId = await createBrowserPanel(page, server.baseUrl)

    await expect.poll(async () => {
      return evalBrowserPanel(page, panelId, "document.querySelector('#loaded')?.textContent")
    }).toBe('subresource page loaded')
    await expect(page.getByText('Failed to load page')).toHaveCount(0)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-008 main-frame navigation failure shows failed-load overlay', async () => {
  const missingPort = await unusedLocalPort()
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    await createBrowserPanel(page, `http://127.0.0.1:${missingPort}/missing`, { waitForLoad: false })

    await expect(page.getByText('Failed to load page')).toBeVisible()
  } finally {
    await closeApp(app)
  }
})

test('T-E-016 screenshot button creates a draggable thumbnail from a local page', async () => {
  const server = await startLocalBrowserServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(`<!doctype html>
      <title>Cate Browser Uplift Screenshot</title>
      <body style="background: rgb(18, 52, 86); color: white;">
        <h1 id="loaded">screenshot ready</h1>
      </body>`)
  })
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const panelId = await createBrowserPanel(page, server.baseUrl)
    await expect.poll(async () => {
      return evalBrowserPanel(page, panelId, "document.querySelector('#loaded')?.textContent")
    }).toBe('screenshot ready')

    await page.getByRole('button', { name: 'Screenshot' }).click()

    const thumbnail = page.locator('img[alt="Screenshot"]')
    await expect(thumbnail).toBeVisible()
    await expect(thumbnail).toHaveAttribute('src', /^data:image\/png;base64,/)
    await expect(thumbnail.locator('xpath=ancestor::*[@draggable="true"][1]')).toHaveCount(1)
  } finally {
    await closeApp(app)
    await server.close()
  }
})

test('T-E-005/T-E-006 browser history and bookmarks persist by workspace and stay isolated', async () => {
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-uplift-user-data-'))
  const { electronApp: firstApp, mainWindow: firstPage } = await launchApp({ userDataDir })
  let workspaceA = ''
  let workspaceB = ''

  try {
    workspaceA = await firstPage.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    await firstPage.evaluate(async (workspaceId) => {
      await window.electronAPI.browserHistoryRecord(workspaceId, 'https://example.test/a', 'Workspace A Page')
      await window.electronAPI.browserBookmarksAdd(workspaceId, 'https://example.test/a', 'Workspace A Page')
    }, workspaceA)
    workspaceB = await createWorkspace(firstPage, 'Browser State Workspace B')
  } finally {
    await closeApp(firstApp)
  }

  const { electronApp: secondApp, mainWindow: secondPage } = await launchApp({ userDataDir })
  try {
    const state = await secondPage.evaluate(async ({ workspaceAId, workspaceBId }) => {
      return {
        historyA: await window.electronAPI.browserHistoryGet(workspaceAId),
        bookmarksA: await window.electronAPI.browserBookmarksGet(workspaceAId),
        historyB: await window.electronAPI.browserHistoryGet(workspaceBId),
        bookmarksB: await window.electronAPI.browserBookmarksGet(workspaceBId),
      }
    }, { workspaceAId: workspaceA, workspaceBId: workspaceB })

    expect(state.historyA).toMatchObject([
      {
        url: 'https://example.test/a',
        title: 'Workspace A Page',
        visitCount: 1,
      },
    ])
    expect(state.bookmarksA).toMatchObject([
      {
        url: 'https://example.test/a',
        title: 'Workspace A Page',
      },
    ])
    expect(state.historyB).toEqual([])
    expect(state.bookmarksB).toEqual([])
  } finally {
    await closeApp(secondApp)
  }
})

test('T-E-004 removing a workspace removes its browser state and preserves another workspace', async () => {
  const { electronApp: app, mainWindow: page } = await launchApp()

  try {
    const workspaceA = await page.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    await page.evaluate(async (workspaceId) => {
      await window.electronAPI.browserHistoryRecord(workspaceId, 'https://example.test/remove-a', 'Remove A')
      await window.electronAPI.browserBookmarksAdd(workspaceId, 'https://example.test/remove-a', 'Remove A')
    }, workspaceA)

    const workspaceB = await createWorkspace(page, 'Browser Cleanup Workspace B')
    await page.evaluate(async (workspaceId) => {
      await window.electronAPI.browserHistoryRecord(workspaceId, 'https://example.test/keep-b', 'Keep B')
      await window.electronAPI.browserBookmarksAdd(workspaceId, 'https://example.test/keep-b', 'Keep B')
    }, workspaceB)

    await page.evaluate((workspaceId) => window.__cateE2E!.removeWorkspace(workspaceId), workspaceA)

    await expect.poll(async () => {
      return page.evaluate(async (workspaceId) => ({
        history: await window.electronAPI.browserHistoryGet(workspaceId),
        bookmarks: await window.electronAPI.browserBookmarksGet(workspaceId),
      }), workspaceA)
    }).toEqual({ history: [], bookmarks: [] })

    const workspaceBState = await page.evaluate(async (workspaceId) => ({
      history: await window.electronAPI.browserHistoryGet(workspaceId),
      bookmarks: await window.electronAPI.browserBookmarksGet(workspaceId),
    }), workspaceB)
    expect(workspaceBState.history).toMatchObject([
      {
        url: 'https://example.test/keep-b',
        title: 'Keep B',
      },
    ])
    expect(workspaceBState.bookmarks).toMatchObject([
      {
        url: 'https://example.test/keep-b',
        title: 'Keep B',
      },
    ])
  } finally {
    await closeApp(app)
  }
})

test('T-E-012/T-E-013 bookmark bar persists bookmarks in one workspace and excludes another workspace', async () => {
  const server = await startLocalBrowserServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><title>Bookmark Persisted</title><body>bookmark bar page</body>')
  })
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-bookmark-ui-user-data-'))
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-bookmark-ui-workspace-'))
  const { electronApp: firstApp, mainWindow: firstPage } = await launchApp({ userDataDir })

  try {
    await firstPage.evaluate((rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
    await createBrowserPanel(firstPage, server.baseUrl)
    await expect.poll(async () => firstPage.getByRole('button', { name: 'Add bookmark' }).count()).toBe(1)
    await firstPage.getByRole('button', { name: 'Add bookmark' }).click()
    await expect(firstPage.getByRole('button', { name: 'Bookmark Persisted' })).toBeVisible()
  } finally {
    await closeApp(firstApp)
  }

  const { electronApp: secondApp, mainWindow: secondPage } = await launchApp({ userDataDir })
  try {
    await secondPage.evaluate((rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
    await createBrowserPanel(secondPage, server.baseUrl)
    await expect(secondPage.getByRole('button', { name: 'Bookmark Persisted' })).toBeVisible()

    await createWorkspace(secondPage, 'Bookmark Isolation Workspace')
    await createBrowserPanel(secondPage, server.baseUrl)
    await expect(secondPage.getByRole('button', { name: 'Bookmark Persisted' })).toHaveCount(0)
  } finally {
    await closeApp(secondApp)
    await server.close()
  }
})

test('T-E-014 toggling bookmarks bar visibility persists across restart', async () => {
  const server = await startLocalBrowserServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end('<!doctype html><title>Bookmark Visibility</title><body>bookmark visibility page</body>')
  })
  const userDataDir = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-bookmark-visibility-user-data-'))
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-browser-bookmark-visibility-workspace-'))
  const { electronApp: firstApp, mainWindow: firstPage } = await launchApp({ userDataDir })

  try {
    await firstPage.evaluate((rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
    await firstPage.evaluate(async () => {
      await window.electronAPI.settingsSet('browserShowBookmarksBar', false)
    })
  } finally {
    await closeApp(firstApp)
  }

  const { electronApp: secondApp, mainWindow: secondPage } = await launchApp({ userDataDir })
  try {
    await secondPage.evaluate((rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
    const workspaceId = await secondPage.evaluate(() => window.__cateE2E!.selectedWorkspaceId())
    await secondPage.evaluate(async (id) => {
      await window.electronAPI.browserBookmarksAdd(id, 'https://example.test/hidden', 'Hidden Bookmark')
    }, workspaceId)
    await createBrowserPanel(secondPage, server.baseUrl)

    await expect(secondPage.getByRole('button', { name: 'Hidden Bookmark' })).toHaveCount(0)

    await secondPage.evaluate(async () => {
      await window.electronAPI.settingsSet('browserShowBookmarksBar', true)
    })
  } finally {
    await closeApp(secondApp)
  }

  const { electronApp: thirdApp, mainWindow: thirdPage } = await launchApp({ userDataDir })
  try {
    await thirdPage.evaluate((rootPath) => window.__cateE2E!.ensureWorkspaceRoot(rootPath), workspaceRoot)
    await createBrowserPanel(thirdPage, server.baseUrl)
    await expect(thirdPage.getByRole('button', { name: 'Hidden Bookmark' })).toBeVisible()
  } finally {
    await closeApp(thirdApp)
    await server.close()
  }
})
