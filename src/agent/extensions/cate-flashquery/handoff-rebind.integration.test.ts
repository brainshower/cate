import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fsp from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createCateFlashQueryLifecycle } from './lifecycle'
import { registerFlashQueryHandoffRefresher } from '../../main/flashQueryHandoffBridge'
import { writeFlashQueryExtensionHandoff } from '../../main/installFlashQueryExtension'
import { createWorkspace, removeWorkspace, updateWorkspace } from '../../../main/workspaceManager'
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import type { FlashQueryRegistryRecord } from './registry'

const mocks = vi.hoisted(() => ({
  getWorkspaceToken: vi.fn(async (_workspaceId: string) => 'initial-token'),
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => process.cwd(),
    getPath: () => os.tmpdir(),
    isPackaged: false,
  },
  ipcMain: { handle: vi.fn() },
}))

vi.mock('../../../main/flashquery/credentials', () => ({
  getWorkspaceToken: mocks.getWorkspaceToken,
  setWorkspaceToken: vi.fn(async () => {}),
}))

vi.mock('../../../main/ipc/pathValidation', () => ({
  addAllowedRoot: vi.fn(),
  removeAllowedRoot: vi.fn(),
}))

describe('FlashQuery handoff producer to watcher rebind', () => {
  const workspaceIds: string[] = []
  let tmpRoot: string
  let unregisterRefresher: (() => void) | undefined

  beforeEach(async () => {
    vi.resetModules()
    mocks.getWorkspaceToken.mockReset()
    mocks.getWorkspaceToken.mockResolvedValue('initial-token')
    tmpRoot = await fsp.mkdtemp(path.join(os.tmpdir(), 'cate-fq-handoff-rebind-'))
  })

  afterEach(async () => {
    unregisterRefresher?.()
    unregisterRefresher = undefined
    for (const workspaceId of workspaceIds.splice(0)) await removeWorkspace(workspaceId)
    await fsp.rm(tmpRoot, { recursive: true, force: true })
  })

  it('T-U-015 rewrites handoff on updateWorkspace and the real fs watcher rebinds the live extension', async () => {
    const workspaceId = 'workspace-rebind'
    workspaceIds.push(workspaceId)
    await expect(createWorkspace('Rebind', tmpRoot, workspaceId, {
      transport: 'http',
      url: 'http://127.0.0.1:3100',
      auth: { type: 'bearer', token: 'initial-token' },
    })).resolves.toMatchObject({ ok: true })
    await writeFlashQueryExtensionHandoff(tmpRoot, workspaceId)

    unregisterRefresher = registerFlashQueryHandoffRefresher(async (changedWorkspaceId) => {
      if (changedWorkspaceId === workspaceId) await writeFlashQueryExtensionHandoff(tmpRoot, workspaceId)
    })

    const pi = mockPi()
    const clients = [
      mockClient('ws-initial', [tool('initial_tool')]),
      mockClient('ws-updated', [tool('updated_tool')]),
    ]
    const lifecycle = createCateFlashQueryLifecycle(pi.api, {
      openClient: async (handoff: FlashQueryHandoff) => {
        if (!handoff.endpointUrl) return null
        return clients.shift() ?? mockClient('extra', [])
      },
    })

    await lifecycle.rebind(tmpRoot)
    lifecycle.watchHandoff(tmpRoot)
    expect(pi.registerTool.mock.calls.map(([registered]) => registered.name)).toEqual(['initial_tool'])

    mocks.getWorkspaceToken.mockResolvedValue('updated-token')
    await expect(updateWorkspace(workspaceId, {
      flashqueryConnection: {
        transport: 'http',
        url: 'http://127.0.0.1:3200',
        auth: { type: 'bearer', token: 'updated-token' },
      },
    })).resolves.toMatchObject({ ok: true })

    await vi.waitFor(() => {
      expect(pi.registerTool.mock.calls.map(([registered]) => registered.name)).toContain('updated_tool')
    }, { timeout: 5_000 })
    expect(lifecycle.currentGeneration()).toMatchObject({
      id: 2,
      handoff: {
        workspaceId,
        endpointUrl: 'http://127.0.0.1:3200',
        authMode: 'bearer',
        bearerToken: 'updated-token',
      },
    })

    await expect(updateWorkspace(workspaceId, { flashqueryConnection: undefined }))
      .resolves.toMatchObject({ ok: true })
    await vi.waitFor(() => {
      expect(lifecycle.currentGeneration()).toBeNull()
    }, { timeout: 5_000 })

    await lifecycle.shutdown()
  })
})

function mockPi() {
  const registerTool = vi.fn()
  const api = {
    on: vi.fn(),
    registerTool,
  } as unknown as ExtensionAPI
  return { api, registerTool }
}

function mockClient(workspaceId: string, records: FlashQueryRegistryRecord[]): FlashQueryExtensionClient {
  return {
    listRegistryTools: vi.fn(async () => records),
    listModels: vi.fn(async () => [{ id: `${workspaceId}-model` }]),
    listPurposes: vi.fn(async () => [{ id: `${workspaceId}-purpose` }]),
    callTool: vi.fn(async () => ({ content: [{ type: 'text', text: `${workspaceId} ok` }] })),
    close: vi.fn(async () => {}),
  }
}

function tool(name: string): FlashQueryRegistryRecord {
  return {
    name,
    inputSchema: { type: 'object', properties: {} },
  }
}
