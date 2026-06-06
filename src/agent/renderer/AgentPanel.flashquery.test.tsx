// @vitest-environment jsdom
import React from 'react'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import AgentPanel from './AgentPanel'
import { useAppStore } from '../../renderer/stores/appStore'
import { useAgentStore } from './agentStore'
import type { WorkspaceState } from '../../shared/types'

vi.mock('../../renderer/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('./AgentSidebar', () => ({
  AgentSidebar: () => <div data-testid="agent-sidebar" />,
}))

vi.mock('./ChatThread', () => ({
  ChatThread: () => <div data-testid="chat-thread" />,
}))

vi.mock('./AgentSettingsView', () => ({
  SettingsView: () => <div data-testid="agent-settings" />,
}))

vi.mock('./ModelPicker', () => ({
  ModelPicker: () => <div data-testid="model-picker" />,
}))

vi.mock('./AgentPanelChrome', () => ({
  ExtensionDialog: () => null,
  ExtensionStatusBar: () => null,
  ExtensionWidget: () => null,
  QueueBadges: () => null,
  ImageAttachButton: () => <button type="button" title="Attach image" />,
  ImageChips: () => null,
  ThinkingLevelPicker: () => <button type="button" title="Thinking level" />,
  readFileAsImage: vi.fn(),
}))

function workspace(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    id: 'ws-a',
    name: 'Workspace A',
    color: '',
    rootPath: '/tmp/cate-workspace',
    panels: {
      'agent-panel': {
        id: 'agent-panel',
        type: 'agent',
        title: 'Agent',
        isDirty: false,
      },
    },
    canvasNodes: {},
    regions: {},
    zoomLevel: 1,
    viewportOffset: { x: 0, y: 0 },
    focusedNodeId: null,
    ...overrides,
  }
}

describe('AgentPanel FlashQuery vault index lifecycle', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    useAgentStore.setState({ panels: {} })
    useAppStore.setState({
      selectedWorkspaceId: 'ws-a',
      workspaces: [
        workspace({
          flashqueryConnection: { transport: 'http', url: 'http://127.0.0.1:3100' },
        }),
      ],
    })
    window.electronAPI = {
      authStatus: vi.fn(() => Promise.resolve([])),
      onFlashQueryStatus: vi.fn(() => vi.fn()),
      onAgentEvent: vi.fn(() => vi.fn()),
      onAgentToolRequest: vi.fn(() => vi.fn()),
      agentListSessions: vi.fn(() => Promise.resolve([])),
      agentCreate: vi.fn(() => Promise.resolve({ ok: true })),
      agentGetCommands: vi.fn(() => Promise.resolve([])),
      agentGetAvailableModels: vi.fn(() => Promise.resolve([])),
      agentGetSessionStats: vi.fn(() => Promise.resolve(null)),
      agentGetState: vi.fn(() => Promise.resolve(null)),
      agentGetForkMessages: vi.fn(() => Promise.resolve([])),
      agentDispose: vi.fn(() => Promise.resolve()),
      flashqueryListVaultIndex: vi.fn(() => Promise.resolve([
        { filename: 'Ideas.md', fullPath: 'Ideas.md' },
      ])),
    } as never
  })

  afterEach(() => {
    cleanup()
  })

  it('refreshes mentions for an already-configured FlashQuery workspace without waiting for a live status event', async () => {
    render(<AgentPanel panelId="agent-panel" workspaceId="ws-a" />)

    await waitFor(() => {
      expect(window.electronAPI.flashqueryListVaultIndex).toHaveBeenCalledWith('ws-a')
    })
    expect(window.electronAPI.onFlashQueryStatus).toHaveBeenCalled()
  })
})
