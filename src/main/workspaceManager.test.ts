import { beforeEach, describe, expect, it, vi } from 'vitest'

const clearStorageData = vi.fn()
const fromPartition = vi.fn()

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  session: {
    fromPartition,
  },
}))

vi.mock('./logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}))

vi.mock('./windowRegistry', () => ({
  broadcastToAll: vi.fn(),
  windowFromEvent: vi.fn(),
}))

vi.mock('./ipc/pathValidation', () => ({
  addAllowedRoot: vi.fn(),
  removeAllowedRoot: vi.fn(),
}))

const browserStateStoreMock = vi.hoisted(() => ({
  clearWorkspaceBrowserState: vi.fn(async () => undefined),
  listBrowserHistory: vi.fn(async (workspaceId: string) => browserStateStoreMock.history.get(workspaceId) ?? []),
  listBrowserBookmarks: vi.fn(async (workspaceId: string) => browserStateStoreMock.bookmarks.get(workspaceId) ?? []),
  history: new Map<string, unknown[]>(),
  bookmarks: new Map<string, unknown[]>(),
}))

vi.mock('./browserStateStore', () => browserStateStoreMock)

vi.mock('./workspaceRoots', () => ({
  resolveTrustedWorkspaceRoot: vi.fn(async (rootPath: string) => rootPath),
}))

const credentialsMock = vi.hoisted(() => ({
  tokens: new Map<string, string>(),
}))

vi.mock('./flashquery/credentials', () => ({
  getWorkspaceToken: vi.fn(async (workspaceId: string) => credentialsMock.tokens.get(workspaceId) ?? null),
  setWorkspaceToken: vi.fn(async (workspaceId: string, token: string | null) => {
    if (token === null) {
      credentialsMock.tokens.delete(workspaceId)
      return
    }
    credentialsMock.tokens.set(workspaceId, token)
  }),
}))

describe('workspaceManager FlashQuery metadata', () => {
  beforeEach(async () => {
    const { listWorkspaces, removeWorkspace } = await import('./workspaceManager')
    fromPartition.mockReturnValue({ clearStorageData })
    clearStorageData.mockResolvedValue(undefined)
    for (const workspace of listWorkspaces()) await removeWorkspace(workspace.id)
    credentialsMock.tokens.clear()
    browserStateStoreMock.clearWorkspaceBrowserState.mockClear()
    browserStateStoreMock.history.clear()
    browserStateStoreMock.bookmarks.clear()
    fromPartition.mockClear()
    clearStorageData.mockClear()
  })

  it('creates workspace metadata with an absent FlashQuery connection by default', async () => {
    const { createWorkspace } = await import('./workspaceManager')

    const result = await createWorkspace('Cate', '/tmp/cate', 'workspace-a')

    expect(result).toEqual({
      ok: true,
      workspace: expect.objectContaining({
        id: 'workspace-a',
        flashqueryConnection: undefined,
      }),
    })
  })

  it('stores inbound bearer tokens only in the credential helper and strips renderer-facing metadata', async () => {
    const { createWorkspace, updateWorkspace, listWorkspaces } = await import('./workspaceManager')
    const { getWorkspaceToken } = await import('./flashquery/credentials')
    await createWorkspace('Cate', '/tmp/cate', 'workspace-b')

    const connection = {
      transport: 'http' as const,
      url: 'http://127.0.0.1:3210/mcp',
      auth: { type: 'bearer' as const, token: 'test-token' },
    }
    const result = await updateWorkspace('workspace-b', { flashqueryConnection: connection })

    expect(result).toEqual({
      ok: true,
      workspace: expect.objectContaining({
        flashqueryConnection: {
          transport: 'http',
          url: 'http://127.0.0.1:3210',
        },
      }),
    })
    expect(listWorkspaces().find((workspace) => workspace.id === 'workspace-b')?.flashqueryConnection).toEqual({
      transport: 'http',
      url: 'http://127.0.0.1:3210',
    })
    await expect(getWorkspaceToken('workspace-b')).resolves.toBe('test-token')
  })

  it('sanitizes malformed FlashQuery connection metadata as absent', async () => {
    const { createWorkspace, updateWorkspace } = await import('./workspaceManager')
    await createWorkspace('Cate', '/tmp/cate', 'workspace-c')

    const result = await updateWorkspace('workspace-c', {
      flashqueryConnection: { transport: 'stdio', url: 'bad' } as never,
    })

    expect(result).toEqual({
      ok: true,
      workspace: expect.objectContaining({ flashqueryConnection: undefined }),
    })
  })

  it('T-I-001 removes only the target workspace browser partition and state', async () => {
    const { createWorkspace, removeWorkspace } = await import('./workspaceManager')
    const { listBrowserHistory, listBrowserBookmarks } = await import('./browserStateStore')
    await createWorkspace('Target', '/tmp/target', 'workspace-a')
    await createWorkspace('Other', '/tmp/other', 'workspace-b')
    browserStateStoreMock.history.set('workspace-a', [{ url: 'https://example.test/a' }])
    browserStateStoreMock.bookmarks.set('workspace-a', [{ url: 'https://example.test/a' }])
    browserStateStoreMock.history.set('workspace-b', [{ url: 'https://example.test/b' }])
    browserStateStoreMock.bookmarks.set('workspace-b', [{ url: 'https://example.test/b' }])

    await expect(removeWorkspace('workspace-a')).resolves.toBe(true)

    expect(fromPartition).toHaveBeenCalledTimes(1)
    expect(fromPartition).toHaveBeenCalledWith('persist:browser-ws-workspace-a')
    expect(clearStorageData).toHaveBeenCalledTimes(1)
    expect(browserStateStoreMock.clearWorkspaceBrowserState).toHaveBeenCalledWith('workspace-a')
    expect(await listBrowserHistory('workspace-b')).toEqual([{ url: 'https://example.test/b' }])
    expect(await listBrowserBookmarks('workspace-b')).toEqual([{ url: 'https://example.test/b' }])
  })

  it('workspace removal cleanup does not touch FlashQuery credentials', async () => {
    const { createWorkspace, removeWorkspace } = await import('./workspaceManager')
    const { getWorkspaceToken } = await import('./flashquery/credentials')
    await createWorkspace('Target', '/tmp/target', 'workspace-a', {
      transport: 'http',
      url: 'http://127.0.0.1:3210/mcp',
      auth: { type: 'bearer', token: 'target-token' },
    })

    await removeWorkspace('workspace-a')

    await expect(getWorkspaceToken('workspace-a')).resolves.toBe('target-token')
  })
})
