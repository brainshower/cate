import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installE2EHarnessIfEnabled } from './e2eHarnessGate'

vi.mock('../stores/appStore', () => ({
  useAppStore: { getState: vi.fn(() => ({})) },
}))

vi.mock('../stores/canvasStore', () => ({
  getOrCreateCanvasStoreForPanel: vi.fn(() => null),
}))

vi.mock('../stores/dockStore', () => ({
  useDockStore: { getState: vi.fn(() => ({ getPanelLocation: vi.fn(() => null) })) },
}))

vi.mock('../drag/store', () => ({
  useDragStore: { getState: vi.fn(() => ({ isDragging: false, source: null, target: null })) },
}))

vi.mock('../stores/uiStore', () => ({
  useUIStore: { getState: vi.fn(() => ({ setShowFlashQueryConnectionDialog: vi.fn() })) },
}))

vi.mock('./editorSaveRegistry', () => ({
  saveEditor: vi.fn(async () => 'saved'),
}))

vi.mock('./session', () => ({
  saveSession: vi.fn(async () => {}),
}))

vi.mock('../../shared/flashqueryUri', () => ({
  buildVaultUri: vi.fn((workspaceId: string, vaultPath: string) => `flashquery://${workspaceId}${vaultPath}`),
}))

vi.mock('./terminalRegistry', () => ({
  terminalRegistry: { getEntry: vi.fn(() => null) },
}))

vi.mock('../../agent/renderer/agentStore', () => ({
  handleAgentEvent: vi.fn(),
  useAgentStore: { getState: vi.fn(() => ({ panels: {} })) },
}))

function cateE2EGlobal() {
  return window.__cateE2E
}

function loadRealHarness() {
  return import('./e2eHarness')
}

describe('real E2E harness global gate', () => {
  beforeEach(() => {
    delete window.__cateE2E
  })

  it('T-U-007 keeps window.__cateE2E undefined when isE2E is false', async () => {
    installE2EHarnessIfEnabled({ isE2E: false }, loadRealHarness)
    await Promise.resolve()

    expect(cateE2EGlobal()).toBeUndefined()
  })

  it('T-U-007 installs the real window.__cateE2E harness when isE2E is true', async () => {
    const harnessModule = loadRealHarness()
    installE2EHarnessIfEnabled({ isE2E: true }, () => harnessModule)

    await harnessModule
    await vi.waitFor(() => expect(cateE2EGlobal()).toBeDefined())

    expect(cateE2EGlobal()?.chooseNextContextMenuAction).toEqual(expect.any(Function))
    expect(cateE2EGlobal()?.ensureWorkspaceRoot).toEqual(expect.any(Function))
  })
})
