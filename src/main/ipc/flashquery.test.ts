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

vi.mock('../flashquery/clientManager', () => ({
  FlashQueryClientManager: vi.fn().mockImplementation(() => {
    const instance = {
      connect: vi.fn().mockResolvedValue({ workspaceId: 'workspace-1', status: 'live' }),
      dispose: vi.fn(),
      subscribe: vi.fn((workspaceId: string, type: string, handler: (payload: unknown) => void) => {
        instance.subscriptions.push({ workspaceId, type, handler })
        return vi.fn()
      }),
      subscriptions: [] as Array<{ workspaceId: string; type: string; handler: (payload: unknown) => void }>,
    }
    mocks.managerInstances.push(instance)
    return instance
  }),
}))

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
})
