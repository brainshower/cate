import { beforeEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => ({
  exposedApi: undefined as Record<string, unknown> | undefined,
  exposeInMainWorld: vi.fn((name: string, api: Record<string, unknown>) => {
    if (name === 'electronAPI') {
      electronMocks.exposedApi = api
    }
  }),
  invoke: vi.fn().mockResolvedValue(null),
  on: vi.fn(),
  removeListener: vi.fn(),
  send: vi.fn(),
  sendSync: vi.fn(() => false),
  getPathForFile: vi.fn(() => '/tmp/file.txt'),
}))

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: electronMocks.exposeInMainWorld,
  },
  ipcRenderer: {
    invoke: electronMocks.invoke,
    on: electronMocks.on,
    removeListener: electronMocks.removeListener,
    send: electronMocks.send,
    sendSync: electronMocks.sendSync,
  },
  webUtils: {
    getPathForFile: electronMocks.getPathForFile,
  },
}))

async function loadPreload(cateE2E?: string) {
  vi.resetModules()
  electronMocks.exposedApi = undefined
  electronMocks.exposeInMainWorld.mockClear()
  electronMocks.invoke.mockClear()
  if (cateE2E === undefined) {
    delete process.env.CATE_E2E
  } else {
    process.env.CATE_E2E = cateE2E
  }

  await import('./index')

  expect(electronMocks.exposedApi).toBeDefined()
  return electronMocks.exposedApi!
}

describe('preload E2E bridge gating', () => {
  beforeEach(() => {
    delete process.env.CATE_E2E
  })

  it('T-U-007 does not expose E2E-only helpers in normal launches', async () => {
    const api = await loadPreload()

    expect(api.isE2E).toBe(false)
    expect(api.e2eChooseNextContextMenuAction).toBeUndefined()
    expect(api.e2eLastContextMenuItems).toBeUndefined()

    await (api.showContextMenu as (items: unknown[]) => Promise<unknown>)([{ label: 'Open' }])
    expect(electronMocks.invoke).toHaveBeenCalledWith('menu:showContext', [{ label: 'Open' }])
  })

  it('T-U-007 exposes and uses E2E-only context-menu helpers only under CATE_E2E', async () => {
    const api = await loadPreload('1')

    expect(api.isE2E).toBe(true)
    expect(api.e2eChooseNextContextMenuAction).toEqual(expect.any(Function))
    expect(api.e2eLastContextMenuItems).toEqual(expect.any(Function))

    const chooseNextContextMenuAction = api.e2eChooseNextContextMenuAction as (action: string) => void
    chooseNextContextMenuAction('open-on-canvas')
    const result = await (api.showContextMenu as (items: unknown[]) => Promise<unknown>)([{ label: 'Open on Canvas' }])

    expect(result).toBe('open-on-canvas')
    expect(api.e2eLastContextMenuItems).toEqual(expect.any(Function))
    expect((api.e2eLastContextMenuItems as () => unknown[])()).toEqual([{ label: 'Open on Canvas' }])
    expect(electronMocks.invoke).not.toHaveBeenCalledWith('menu:showContext', expect.anything())
  })

  it('T-I-005 and T-I-009 exposes a typed FlashQuery query_graph bridge only through flashqueryQueryGraph', async () => {
    const api = await loadPreload()

    expect(api.flashqueryQueryGraph).toEqual(expect.any(Function))
    expect(api.flashqueryCallTool).toBeUndefined()

    await (api.flashqueryQueryGraph as (workspaceId: string, params: unknown) => Promise<unknown>)('workspace-1', {
      action: 'node',
      chunk_id: 'chunk-1',
      direction: 'both',
      limit: 25,
    })

    expect(electronMocks.invoke).toHaveBeenCalledWith('flashquery:queryGraph', 'workspace-1', {
      action: 'node',
      chunk_id: 'chunk-1',
      direction: 'both',
      limit: 25,
    })
  })
})
