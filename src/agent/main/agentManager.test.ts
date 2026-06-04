import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  calls: [] as string[],
  prepareAgentDir: vi.fn(async () => { mocks.calls.push('prepare') }),
  installSubagentExtension: vi.fn(async () => { mocks.calls.push('subagent') }),
  installPlanModeExtension: vi.fn(async () => { mocks.calls.push('plan-mode') }),
  installFlashQueryExtension: vi.fn(async () => { mocks.calls.push('flashquery-install') }),
  writeFlashQueryExtensionHandoff: vi.fn(async () => { mocks.calls.push('flashquery-handoff') }),
  watchWorkspaceAuth: vi.fn(() => vi.fn()),
  pushSharedToWorkspace: vi.fn(),
  getShellEnv: vi.fn(() => ({ PATH: process.env.PATH ?? '' })),
  createNodeShim: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  send: vi.fn(),
  rpcStart: vi.fn(async () => { mocks.calls.push('rpc-start') }),
  rpcGetState: vi.fn(async () => { mocks.calls.push('rpc-get-state') }),
  rpcOnEvent: vi.fn(() => vi.fn()),
  rpcConstructors: [] as unknown[],
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => '/app',
    getPath: () => '/tmp',
    isPackaged: false,
  },
}))

vi.mock('@earendil-works/pi-coding-agent', () => ({
  RpcClient: vi.fn(function MockRpcClient(this: unknown, options: unknown) {
    mocks.calls.push('rpc-construct')
    mocks.rpcConstructors.push(options)
    return {
      start: mocks.rpcStart,
      getState: mocks.rpcGetState,
      onEvent: mocks.rpcOnEvent,
    }
  }),
}))

vi.mock('../../main/logger', () => ({
  default: {
    info: mocks.info,
    warn: mocks.warn,
  },
}))

vi.mock('../../main/shellEnv', () => ({
  getShellEnv: mocks.getShellEnv,
}))

vi.mock('./nodeShim', () => ({
  createNodeShim: mocks.createNodeShim,
}))

vi.mock('./agentDir', () => ({
  agentDirFor: (cwd: string) => `${cwd}/.cate/pi-agent`,
  prepareAgentDir: mocks.prepareAgentDir,
  watchWorkspaceAuth: mocks.watchWorkspaceAuth,
  pushSharedToWorkspace: mocks.pushSharedToWorkspace,
}))

vi.mock('./installSubagents', () => ({
  installSubagentExtension: mocks.installSubagentExtension,
}))

vi.mock('./installPlanMode', () => ({
  installPlanModeExtension: mocks.installPlanModeExtension,
}))

vi.mock('./installFlashQueryExtension', () => ({
  installFlashQueryExtension: mocks.installFlashQueryExtension,
  writeFlashQueryExtensionHandoff: mocks.writeFlashQueryExtensionHandoff,
}))

describe('AgentManager FlashQuery startup integration', () => {
  beforeEach(() => {
    vi.resetModules()
    mocks.calls.length = 0
    mocks.rpcConstructors.length = 0
    mocks.prepareAgentDir.mockClear()
    mocks.installSubagentExtension.mockClear()
    mocks.installPlanModeExtension.mockClear()
    mocks.installFlashQueryExtension.mockClear()
    mocks.writeFlashQueryExtensionHandoff.mockClear()
    mocks.watchWorkspaceAuth.mockClear()
    mocks.pushSharedToWorkspace.mockClear()
    mocks.getShellEnv.mockClear()
    mocks.createNodeShim.mockClear()
    mocks.info.mockClear()
    mocks.warn.mockClear()
    mocks.send.mockClear()
    mocks.rpcStart.mockClear()
    mocks.rpcGetState.mockClear()
    mocks.rpcOnEvent.mockClear()
  })

  it('T-U-013 installs bundled extensions and writes FlashQuery handoff before starting Pi', async () => {
    const { AgentManager } = await import('./agentManager')
    const authManager = { setOnChange: vi.fn() }
    const manager = new AgentManager(authManager as never)
    const sender = {
      isDestroyed: () => false,
      send: mocks.send,
    }

    await manager.create({
      panelId: 'panel-1',
      workspaceId: 'workspace-1',
      cwd: '/tmp/cate-workspace',
      model: { provider: 'openai', model: 'gpt-4.1' },
    }, sender as never)

    expect(mocks.prepareAgentDir).toHaveBeenCalledWith('/tmp/cate-workspace')
    expect(mocks.installSubagentExtension).toHaveBeenCalledWith('/tmp/cate-workspace')
    expect(mocks.installPlanModeExtension).toHaveBeenCalledWith('/tmp/cate-workspace')
    expect(mocks.installFlashQueryExtension).toHaveBeenCalledWith('/tmp/cate-workspace')
    expect(mocks.writeFlashQueryExtensionHandoff).toHaveBeenCalledWith('/tmp/cate-workspace', 'workspace-1')
    expect(mocks.calls).toEqual([
      'prepare',
      'subagent',
      'plan-mode',
      'flashquery-install',
      'flashquery-handoff',
      'rpc-construct',
      'rpc-start',
      'rpc-get-state',
    ])
    expect(mocks.rpcConstructors[0]).toMatchObject({
      cwd: '/tmp/cate-workspace',
      provider: 'openai',
      model: 'gpt-4.1',
      env: expect.objectContaining({
        PI_CODING_AGENT_DIR: '/tmp/cate-workspace/.cate/pi-agent',
      }),
    })
  })
})
