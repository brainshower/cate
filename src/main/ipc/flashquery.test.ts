import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_STATUS,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'
import type { FlashQueryConnection, WorkspaceInfo } from '../../shared/types'

const mocks = vi.hoisted(() => ({
  handle: vi.fn(),
  updateWorkspace: vi.fn(),
  broadcastWorkspaceChange: vi.fn(),
  broadcastToAll: vi.fn(),
  managerInstances: [] as Array<{
    connect: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
    listVault: ReturnType<typeof vi.fn>
    getDocument: ReturnType<typeof vi.fn>
    writeDocument: ReturnType<typeof vi.fn>
    subscribe: ReturnType<typeof vi.fn>
    subscriptions: Array<{ workspaceId: string; type: string; handler: (payload: unknown) => void }>
  }>,
}))

vi.mock('electron', () => ({
  ipcMain: { handle: mocks.handle },
}))

vi.mock('../workspaceManager', () => ({
  updateWorkspace: mocks.updateWorkspace,
  broadcastWorkspaceChange: mocks.broadcastWorkspaceChange,
}))

vi.mock('../windowRegistry', () => ({
  broadcastToAll: mocks.broadcastToAll,
}))

vi.mock('../flashquery/clientManager', () => {
  class MockFlashQueryClientManager {
    connect = vi.fn().mockResolvedValue({ workspaceId: 'workspace-1', status: 'live' })
    dispose = vi.fn()
    listVault = vi.fn()
    getDocument = vi.fn()
    writeDocument = vi.fn()
    subscriptions: Array<{ workspaceId: string; type: string; handler: (payload: unknown) => void }> = []
    subscribe = vi.fn((workspaceId: string, type: string, handler: (payload: unknown) => void) => {
      this.subscriptions.push({ workspaceId, type, handler })
      return vi.fn()
    })

    constructor() {
      mocks.managerInstances.push(this)
    }
  }

  return { FlashQueryClientManager: MockFlashQueryClientManager }
})

describe('FlashQuery IPC handlers', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.handle.mockClear()
    mocks.updateWorkspace.mockReset()
    mocks.broadcastWorkspaceChange.mockReset()
    mocks.broadcastToAll.mockReset()
    mocks.managerInstances.length = 0
  })

  function workspace(overrides: Partial<WorkspaceInfo> = {}): WorkspaceInfo {
    return {
      id: 'workspace-1',
      name: 'Workspace',
      color: '#00aaff',
      rootPath: '/tmp/workspace',
      ...overrides,
    }
  }

  async function registeredSetConnectionHandler() {
    const { registerHandlers } = await import('./flashquery')
    registerHandlers()
    const call = mocks.handle.mock.calls.find(([channel]) => channel === FLASHQUERY_SET_CONNECTION)
    expect(call).toBeTruthy()
    return call?.[1] as (_event: unknown, workspaceId: string, connection: FlashQueryConnection | null) => Promise<unknown>
  }

  async function registeredHandler<T extends (...args: never[]) => unknown>(channelName: string): Promise<T> {
    const { registerHandlers } = await import('./flashquery')
    registerHandlers()
    const call = mocks.handle.mock.calls.find(([channel]) => channel === channelName)
    expect(call).toBeTruthy()
    return call?.[1] as T
  }

  it('T-U-040 registers renderer-to-main FlashQuery invoke channels exactly once', async () => {
    const { registerHandlers } = await import('./flashquery')

    registerHandlers()

    expect(mocks.handle).toHaveBeenCalledTimes(4)
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).toEqual([
      FLASHQUERY_SET_CONNECTION,
      FLASHQUERY_LIST_VAULT,
      FLASHQUERY_GET_DOCUMENT,
      FLASHQUERY_WRITE_DOCUMENT,
    ])
    expect(mocks.handle.mock.calls.map(([, handler]) => handler)).toEqual([
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    ])
    expect(mocks.handle.mock.calls.map(([channel]) => channel)).not.toContain(FLASHQUERY_STATUS)
  })

  it('keeps FlashQuery handler registration idempotent', async () => {
    const { registerHandlers } = await import('./flashquery')

    registerHandlers()
    registerHandlers()

    expect(mocks.handle).toHaveBeenCalledTimes(4)
  })

  it('declares the exact Phase 3 FlashQuery channel strings', () => {
    expect(FLASHQUERY_SET_CONNECTION).toBe('flashquery:setConnection')
    expect(FLASHQUERY_LIST_VAULT).toBe('flashquery:listVault')
    expect(FLASHQUERY_GET_DOCUMENT).toBe('flashquery:getDocument')
    expect(FLASHQUERY_WRITE_DOCUMENT).toBe('flashquery:writeDocument')
    expect(FLASHQUERY_STATUS).toBe('flashquery:status')
  })

  it('T-U-041 persists a valid connection through workspace manager and starts a fresh manager probe', async () => {
    const connection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local',
      auth: { type: 'bearer', token: 'secret-token' },
    }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'https://flashquery.local' } }),
    })
    const handler = await registeredSetConnectionHandler()

    const result = await handler({}, 'workspace-1', connection)

    expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', { flashqueryConnection: connection })
    expect(mocks.broadcastWorkspaceChange).toHaveBeenCalledTimes(1)
    expect(mocks.managerInstances[0].dispose).toHaveBeenCalledWith('workspace-1')
    expect(mocks.managerInstances[0].connect).toHaveBeenCalledWith('workspace-1', connection)
    expect(JSON.stringify(result)).not.toContain('secret-token')
    expect(JSON.stringify(mocks.broadcastWorkspaceChange.mock.calls)).not.toContain('secret-token')
  })

  it('T-U-042 clears a connection through workspace manager, disposes manager state, and broadcasts no-connection status', async () => {
    mocks.updateWorkspace.mockResolvedValue({ ok: true, workspace: workspace() })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', null)

    expect(mocks.updateWorkspace).toHaveBeenCalledWith('workspace-1', { flashqueryConnection: undefined })
    expect(mocks.managerInstances[0].dispose).toHaveBeenCalledWith('workspace-1')
    expect(mocks.managerInstances[0].connect).not.toHaveBeenCalled()
    expect(mocks.broadcastWorkspaceChange).toHaveBeenCalledTimes(1)
    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'disconnected',
      error: 'No FlashQuery connection is configured for this workspace',
    })
  })

  it('T-U-043 disposes prior manager state before replacing a connection', async () => {
    const connection: FlashQueryConnection = { transport: 'http', url: 'http://127.0.0.1:3100' }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'http://127.0.0.1:3100' } }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', connection)

    expect(mocks.managerInstances[0].dispose.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.managerInstances[0].connect.mock.invocationCallOrder[0])
  })

  it('T-U-044 rejects an unparseable FlashQuery URL descriptively', async () => {
    const handler = await registeredSetConnectionHandler()

    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'http://[bad' }))
      .rejects.toThrow(/valid FlashQuery URL/i)
    expect(mocks.updateWorkspace).not.toHaveBeenCalled()
  })

  it('T-U-045 rejects non-http FlashQuery URLs descriptively', async () => {
    const handler = await registeredSetConnectionHandler()

    await expect(handler({}, 'workspace-1', { transport: 'http', url: 'ftp://flashquery.local' }))
      .rejects.toThrow(/http or https/i)
    expect(mocks.updateWorkspace).not.toHaveBeenCalled()
  })

  it('T-I-012 and T-I-013 broadcasts direct manager status payloads with safe error handling', async () => {
    const connection: FlashQueryConnection = { transport: 'http', url: 'https://flashquery.local' }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'https://flashquery.local' } }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', connection)
    const subscription = mocks.managerInstances[0].subscriptions[0]

    expect(subscription).toMatchObject({ workspaceId: 'workspace-1', type: 'status' })

    subscription.handler({ workspaceId: 'workspace-1', status: 'connecting', error: 'stale error' })
    subscription.handler({ workspaceId: 'workspace-1', status: 'live', version: '1.2.3', error: 'stale error' })
    subscription.handler({ workspaceId: 'workspace-1', status: 'disconnected', error: 'Connection refused' })

    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'connecting',
    })
    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'live',
      version: '1.2.3',
    })
    expect(mocks.broadcastToAll).toHaveBeenCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'disconnected',
      error: 'Connection refused',
    })
  })

  it('T-I-014 uses broadcastToAll as the status fanout primitive without duplicate workspace subscriptions', async () => {
    const connection: FlashQueryConnection = { transport: 'http', url: 'https://flashquery.local' }
    mocks.updateWorkspace.mockResolvedValue({
      ok: true,
      workspace: workspace({ flashqueryConnection: { transport: 'http', url: 'https://flashquery.local' } }),
    })
    const handler = await registeredSetConnectionHandler()

    await handler({}, 'workspace-1', connection)
    await handler({}, 'workspace-1', connection)

    expect(mocks.managerInstances[0].subscribe).toHaveBeenCalledTimes(2)
    mocks.managerInstances[0].subscriptions[1].handler({ workspaceId: 'workspace-1', status: 'live' })

    expect(mocks.broadcastToAll).toHaveBeenLastCalledWith(FLASHQUERY_STATUS, {
      workspaceId: 'workspace-1',
      status: 'live',
    })
  })

  it('T-I-001 through T-I-004 maps listVault IPC to manager root/folder calls and returns normalized entries', async () => {
    const rootEntries = [
      { name: 'Projects', type: 'folder', vaultPath: 'Projects' },
      { name: 'Plan.md', type: 'document', vaultPath: 'Plan.md', title: 'Plan' },
    ]
    const folderEntries = [{ name: 'Alpha.md', type: 'document', vaultPath: 'Projects/Alpha.md', title: 'Alpha' }]
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath?: string) => Promise<unknown[]>>(FLASHQUERY_LIST_VAULT)
    mocks.managerInstances[0].listVault
      .mockResolvedValueOnce(rootEntries)
      .mockResolvedValueOnce(folderEntries)
      .mockResolvedValueOnce([])

    await expect(handler({}, 'workspace-1')).resolves.toEqual(rootEntries)
    await expect(handler({}, 'workspace-1', 'Projects')).resolves.toEqual(folderEntries)
    await expect(handler({}, 'workspace-1', 'Disconnected')).resolves.toEqual([])

    expect(mocks.managerInstances[0].listVault).toHaveBeenNthCalledWith(1, 'workspace-1', undefined)
    expect(mocks.managerInstances[0].listVault).toHaveBeenNthCalledWith(2, 'workspace-1', 'Projects')
    expect(rootEntries[0]).toMatchObject({ name: expect.any(String), type: 'folder', vaultPath: expect.any(String) })
    expect(rootEntries[1]).toMatchObject({ name: expect.any(String), type: 'document', vaultPath: expect.any(String) })
  })

  it('T-I-006 through T-I-008 maps getDocument IPC results and does not retain version tokens', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string) => Promise<unknown>>(FLASHQUERY_GET_DOCUMENT)
    mocks.managerInstances[0].getDocument
      .mockResolvedValueOnce({ body: 'first', version_token: 'v1', modified: '2026-05-01T00:00:00Z' })
      .mockResolvedValueOnce({ body: 'second', version_token: 'v2', modified: '2026-05-02T00:00:00Z' })
      .mockRejectedValueOnce(new Error('Document not found: Missing.md'))

    await expect(handler({}, 'workspace-1', 'Plan.md')).resolves.toEqual({
      body: 'first',
      version_token: 'v1',
      modified: '2026-05-01T00:00:00Z',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md')).resolves.toEqual({
      body: 'second',
      version_token: 'v2',
      modified: '2026-05-02T00:00:00Z',
    })
    await expect(handler({}, 'workspace-1', 'Missing.md')).rejects.toThrow('Document not found: Missing.md')
    expect(mocks.managerInstances[0].getDocument).toHaveBeenCalledWith('workspace-1', 'Plan.md')
  })

  it('T-I-009 through T-I-011 maps writeDocument IPC success and failure results without throwing', async () => {
    const handler = await registeredHandler<(_event: unknown, workspaceId: string, vaultPath: string, content: string) => Promise<unknown>>(FLASHQUERY_WRITE_DOCUMENT)
    mocks.managerInstances[0].writeDocument
      .mockResolvedValueOnce({ success: true, modified: '2026-05-03T00:00:00Z' })
      .mockResolvedValueOnce({ success: false, error: 'transport failed' })
      .mockRejectedValueOnce(new Error('bad path'))

    await expect(handler({}, 'workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: true,
      modified: '2026-05-03T00:00:00Z',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: false,
      error: 'transport failed',
    })
    await expect(handler({}, 'workspace-1', 'Plan.md', 'body')).resolves.toEqual({
      success: false,
      error: 'bad path',
    })
    expect(mocks.managerInstances[0].writeDocument).toHaveBeenCalledWith('workspace-1', 'Plan.md', 'body')
  })
})
