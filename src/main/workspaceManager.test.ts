import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
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
    for (const workspace of listWorkspaces()) removeWorkspace(workspace.id)
    credentialsMock.tokens.clear()
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
          url: 'http://127.0.0.1:3210/mcp',
        },
      }),
    })
    expect(listWorkspaces().find((workspace) => workspace.id === 'workspace-b')?.flashqueryConnection).toEqual({
      transport: 'http',
      url: 'http://127.0.0.1:3210/mcp',
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
})
