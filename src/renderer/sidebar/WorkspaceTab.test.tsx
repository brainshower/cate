// =============================================================================
// E2E rendering tests for terminal panel agent state indicators.
//
// These test what the user actually SEES: the shimmer CSS class
// (cate-notif-pulse) and the await indicator element (cate-await-indicator).
// =============================================================================

import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

// Mock modules that explode under jsdom
vi.mock('../lib/terminalRegistry', () => ({
  terminalRegistry: { entries: () => [], panelIdForPty: () => null },
}))
vi.mock('../lib/logger', () => ({ default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }))
vi.mock('../hooks/useAgentPanelInfo', () => ({
  useAgentInfoByPanel: () => ({}),
}))

import { TerminalPanelRow, WorkspaceTab } from './WorkspaceTab'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'
import { useDockStore } from '../stores/dockStore'
import type { AgentState, WorkspaceState } from '../../shared/types'
import type { ElectronAPI, NativeContextMenuItem } from '../../shared/electron-api'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => { root.unmount() })
  host.remove()
})

function renderRow(agentState: AgentState | undefined) {
  act(() => {
    root.render(
      <TerminalPanelRow
        panel={{ id: 'p1', type: 'terminal', title: 'Terminal 1' }}
        indent={false}
        agentState={agentState}
        hasPorts={false}
        onClick={() => {}}
      />,
    )
  })
  return host
}

function hasShimmer(el: HTMLElement): boolean {
  return el.querySelector('.cate-notif-pulse') !== null
}

function hasAwaitIndicator(el: HTMLElement): boolean {
  return el.querySelector('.cate-await-indicator') !== null
}

describe('TerminalPanelRow rendered indicators', () => {
  it('no agent state → no shimmer, no await', () => {
    const el = renderRow(undefined)
    expect(hasShimmer(el)).toBe(false)
    expect(hasAwaitIndicator(el)).toBe(false)
  })

  it('notRunning → no shimmer, no await', () => {
    const el = renderRow('notRunning')
    expect(hasShimmer(el)).toBe(false)
    expect(hasAwaitIndicator(el)).toBe(false)
  })

  it('running → shimmer visible, no await', () => {
    const el = renderRow('running')
    expect(hasShimmer(el)).toBe(true)
    expect(hasAwaitIndicator(el)).toBe(false)
  })

  it('waitingForInput → await visible, no shimmer', () => {
    const el = renderRow('waitingForInput')
    expect(hasShimmer(el)).toBe(false)
    expect(hasAwaitIndicator(el)).toBe(true)
  })

  it('finished → no shimmer, no await', () => {
    const el = renderRow('finished')
    expect(hasShimmer(el)).toBe(false)
    expect(hasAwaitIndicator(el)).toBe(false)
  })
})

describe('state transitions render correctly', () => {
  it('full lifecycle: each re-render shows the right indicator', () => {
    const sequence: Array<{ state: AgentState | undefined; expectShimmer: boolean; expectAwait: boolean }> = [
      { state: undefined, expectShimmer: false, expectAwait: false },
      { state: 'waitingForInput', expectShimmer: false, expectAwait: true },
      { state: 'running', expectShimmer: true, expectAwait: false },
      { state: 'waitingForInput', expectShimmer: false, expectAwait: true },
      { state: 'running', expectShimmer: true, expectAwait: false },
      { state: 'finished', expectShimmer: false, expectAwait: false },
    ]

    for (const { state, expectShimmer, expectAwait } of sequence) {
      const el = renderRow(state)
      expect(hasShimmer(el)).toBe(expectShimmer)
      expect(hasAwaitIndicator(el)).toBe(expectAwait)
    }
  })
})

type ElectronApiMock = Pick<ElectronAPI, 'showContextMenu' | 'openFolderDialog'>

const workspace: WorkspaceState = {
  id: 'workspace-1',
  name: 'Cate Workspace',
  color: '',
  rootPath: '/Users/matt/project',
  rootPathError: null,
  isRootPathPending: false,
  panels: {},
  canvasNodes: {},
  regions: {},
  zoomLevel: 1,
  viewportOffset: { x: 0, y: 0 },
  focusedNodeId: null,
}

function setElectronApi(api: ElectronApiMock) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api,
  })
}

function makeElectronApi(selectedId: string | null = null): ElectronApiMock {
  return {
    showContextMenu: vi.fn().mockResolvedValue(selectedId),
    openFolderDialog: vi.fn(),
  }
}

function renderWorkspaceTab(api: ElectronApiMock = makeElectronApi()) {
  setElectronApi(api)
  useAppStore.setState({
    selectedWorkspaceId: workspace.id,
    workspaces: [workspace],
  })
  useUIStore.getState().setShowFlashQueryConnectionDialog(false)

  act(() => {
    root.render(
      <WorkspaceTab
        workspace={workspace}
        isSelected={true}
        onClick={() => {}}
        onClose={() => {}}
      />,
    )
  })
}

async function openWorkspaceContextMenu(api: ElectronApiMock, workspaceName = 'Cate Workspace') {
  const row = Array.from(host.querySelectorAll('span'))
    .find((element) => element.textContent === workspaceName)
  expect(row).toBeTruthy()

  await act(async () => {
    row!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
    await Promise.resolve()
  })

  expect(api.showContextMenu).toHaveBeenCalledTimes(1)
  return vi.mocked(api.showContextMenu).mock.calls[0][0] as NativeContextMenuItem[]
}

describe('WorkspaceTab FlashQuery native context menu', () => {
  it('includes FlashQuery Connection in the native workspace menu', async () => {
    const api = makeElectronApi()
    renderWorkspaceTab(api)

    const items = await openWorkspaceContextMenu(api)

    expect(items).toContainEqual({
      id: 'flashquery-connection',
      label: 'FlashQuery Connection…',
    })
    expect(JSON.stringify(items)).not.toContain('FlashQuery Connection...')
  })

  it('places FlashQuery Connection between copy-cwd and duplicate with separators', async () => {
    const api = makeElectronApi()
    renderWorkspaceTab(api)

    const items = await openWorkspaceContextMenu(api)
    const ids = items.map((item) => item.id ?? item.type)

    expect(ids).toEqual([
      'select',
      'rename',
      undefined,
      'separator',
      'select-folder',
      'copy-cwd',
      'separator',
      'flashquery-connection',
      'separator',
      'duplicate',
      'close-panels',
      'separator',
      'remove',
    ])
  })

  it('opens the FlashQuery connection dialog without mutating the selected workspace', async () => {
    const api = makeElectronApi('flashquery-connection')
    const selectWorkspace = vi.fn()
    const duplicateWorkspace = vi.fn()
    const removeWorkspace = vi.fn()
    renderWorkspaceTab(api)
    useAppStore.setState({ selectWorkspace, duplicateWorkspace, removeWorkspace })

    await openWorkspaceContextMenu(api)

    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
    expect(selectWorkspace).not.toHaveBeenCalled()
    expect(duplicateWorkspace).not.toHaveBeenCalled()
    expect(removeWorkspace).not.toHaveBeenCalled()
  })

  it('opens the clicked workspace FlashQuery connection dialog without changing selection', async () => {
    const api = makeElectronApi('flashquery-connection')
    const otherWorkspace: WorkspaceState = {
      ...workspace,
      id: 'workspace-2',
      name: 'Other Workspace',
      rootPath: '/Users/matt/other-project',
    }
    const selectWorkspace = vi.fn().mockResolvedValue(undefined)
    setElectronApi(api)
    useAppStore.setState({
      selectedWorkspaceId: workspace.id,
      workspaces: [workspace, otherWorkspace],
      selectWorkspace,
    })
    useUIStore.getState().setShowFlashQueryConnectionDialog(false)

    act(() => {
      root.render(
        <WorkspaceTab
          workspace={otherWorkspace}
          isSelected={false}
          onClick={() => {}}
          onClose={() => {}}
        />,
      )
    })

    const items = await openWorkspaceContextMenu(api, 'Other Workspace')

    expect(items).toContainEqual({
      id: 'flashquery-connection',
      label: 'FlashQuery Connection…',
    })
    expect(selectWorkspace).not.toHaveBeenCalled()
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
    expect(useUIStore.getState().flashqueryConnectionDialogWorkspaceId).toBe('workspace-2')
    expect(useAppStore.getState().selectedWorkspaceId).toBe('workspace-1')
  })

  it('does not render a custom React context-menu element', async () => {
    const api = makeElectronApi()
    renderWorkspaceTab(api)

    await openWorkspaceContextMenu(api)

    expect(host.querySelector('[role="menu"]')).toBeNull()
    expect(host.querySelector('[data-testid*="context-menu"]')).toBeNull()
    expect(host.querySelector('.context-menu')).toBeNull()
  })
})

describe('WorkspaceTab FlashQuery panel jump', () => {
  it('T-U-015 lists flashqueryVault panels and focuses them through the dock stack', async () => {
    const api = makeElectronApi()
    const selectWorkspace = vi.fn().mockResolvedValue(undefined)
    const stack = { type: 'tabs' as const, id: 'stack-1', panelIds: ['editor-1', 'vault-1'], activeIndex: 0 }
    const workspaceWithVault: WorkspaceState = {
      ...workspace,
      panels: {
        'editor-1': {
          id: 'editor-1',
          type: 'editor',
          title: 'Plan.md',
          isDirty: false,
          filePath: '/Users/matt/project/Plan.md',
        },
        'vault-1': {
          id: 'vault-1',
          type: 'flashqueryVault',
          title: 'FlashQuery Vault',
          isDirty: false,
        },
      },
    }

    setElectronApi(api)
    useAppStore.setState({
      selectedWorkspaceId: workspace.id,
      workspaces: [workspaceWithVault],
      selectWorkspace,
    })
    useDockStore.setState({
      zones: {
        ...useDockStore.getState().zones,
        left: {
          ...useDockStore.getState().zones.left,
          visible: false,
          layout: stack,
        },
      },
      panelLocations: {
        'editor-1': { type: 'dock', zone: 'left', stackId: 'stack-1' },
        'vault-1': { type: 'dock', zone: 'left', stackId: 'stack-1' },
      },
    })

    act(() => {
      root.render(
        <WorkspaceTab
          workspace={workspaceWithVault}
          isSelected={true}
          onClick={() => {}}
          onClose={() => {}}
        />,
      )
    })

    await act(async () => {
      host.querySelector<HTMLButtonElement>('button[title="Expand"]')?.click()
      await Promise.resolve()
    })

    const vaultPanelRow = Array.from(host.querySelectorAll('button'))
      .find((button) => button.textContent === 'FlashQuery Vault')
    expect(vaultPanelRow).toBeTruthy()

    await act(async () => {
      vaultPanelRow!.click()
      await Promise.resolve()
    })

    expect(selectWorkspace).not.toHaveBeenCalled()
    expect(useDockStore.getState().zones.left.visible).toBe(true)
    expect(useDockStore.getState().zones.left.layout).toMatchObject({
      id: 'stack-1',
      activeIndex: 1,
    })
  })
})
