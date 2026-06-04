// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { waitFor } from '@testing-library/react'
import type { AgentEventEnvelope } from '../../shared/types'

vi.mock('../../renderer/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('agentStore FlashQuery diagnostics preservation', () => {
  let dispatchAgentEvent: (envelope: AgentEventEnvelope) => void

  beforeEach(() => {
    vi.resetModules()
    dispatchAgentEvent = () => {}
    window.electronAPI = {
      onAgentEvent: vi.fn((callback: (envelope: AgentEventEnvelope) => void) => {
        dispatchAgentEvent = callback
        return vi.fn()
      }),
      onAgentToolRequest: vi.fn(() => vi.fn()),
      flashqueryListVaultIndex: vi.fn(() => Promise.resolve([])),
    } as never
  })

  it('T-U-018 preserves FlashQuery details from live tool updates and final results without changing message type', async () => {
    const { useAgentStore } = await import('./agentStore')
    const panelId = 'panel-flashquery'
    const flashqueryDetails = {
      flashquery: true,
      toolName: 'call_model',
      traceId: 'cate-ws-12345678-conv-abcdefghijklmnop',
      refs: [{ path: 'Path/to/Doc.md', resolved: true }],
      result: { diagnostics: { tokens: 42 } },
    }

    dispatchAgentEvent({
      panelId,
      event: { type: 'tool_execution_start', toolCallId: 'tool-1', toolName: 'call_model', args: { prompt: 'Use refs' } },
    })
    dispatchAgentEvent({
      panelId,
      event: {
        type: 'tool_execution_update',
        toolCallId: 'tool-1',
        partialResult: { content: [{ type: 'text', text: 'Running model' }], details: flashqueryDetails },
      },
    })

    let tool = useAgentStore.getState().panels[panelId].messages[0]
    expect(tool).toMatchObject({
      type: 'tool',
      partialText: 'Running model',
      flashquery: flashqueryDetails,
    })

    dispatchAgentEvent({
      panelId,
      event: {
        type: 'tool_execution_end',
        toolCallId: 'tool-1',
        result: { content: [{ type: 'text', text: 'Done' }], details: { ...flashqueryDetails, result: { cost_usd: 0.01 } } },
      },
    })

    tool = useAgentStore.getState().panels[panelId].messages[0]
    expect(tool).toMatchObject({
      type: 'tool',
      status: 'success',
      result: 'Done',
      flashquery: { flashquery: true, toolName: 'call_model', result: { cost_usd: 0.01 } },
    })
  })

  it('T-U-018 keeps standard text and existing subagent details behavior working', async () => {
    const { useAgentStore } = await import('./agentStore')
    const panelId = 'panel-subagent'
    const subagentDetails = {
      mode: 'single',
      results: [{
        agent: 'worker',
        task: 'check files',
        exitCode: 0,
        messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Worker done' }] }],
        usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, cost: 0 },
      }],
    }

    dispatchAgentEvent({
      panelId,
      event: { type: 'tool_execution_start', toolCallId: 'tool-1', toolName: 'subagent', args: {} },
    })
    dispatchAgentEvent({
      panelId,
      event: {
        type: 'tool_execution_end',
        toolCallId: 'tool-1',
        result: { content: [{ type: 'text', text: 'Done' }], details: subagentDetails },
      },
    })

    const tool = useAgentStore.getState().panels[panelId].messages[0]
    expect(tool).toMatchObject({
      type: 'tool',
      result: 'Done',
      subagent: { results: [{ agent: 'worker', finalText: 'Worker done' }] },
    })
  })
})

describe('agentStore vault-index cache lifecycle', () => {
  let dispatchAgentEvent: (envelope: AgentEventEnvelope) => void

  beforeEach(() => {
    vi.resetModules()
    dispatchAgentEvent = () => {}
    window.electronAPI = {
      onAgentEvent: vi.fn((callback: (envelope: AgentEventEnvelope) => void) => {
        dispatchAgentEvent = callback
        return vi.fn()
      }),
      onAgentToolRequest: vi.fn(() => vi.fn()),
      flashqueryListVaultIndex: vi.fn(() => Promise.resolve([])),
    } as never
  })

  it('T-U-006 refreshes through preload IPC and replaces the panel cache', async () => {
    const entries = [{ filename: 'Plan.md', fullPath: 'Docs/Plan.md' }]
    vi.mocked(window.electronAPI.flashqueryListVaultIndex).mockResolvedValueOnce(entries)
    const { useAgentStore } = await import('./agentStore')
    const panelId = 'agent-panel'

    useAgentStore.getState().init(panelId)
    const refresh = useAgentStore.getState().refreshVaultIndex(panelId, 'ws-a')
    expect(useAgentStore.getState().panels[panelId].vaultIndexLoading).toBe(true)
    expect(window.electronAPI.flashqueryListVaultIndex).toHaveBeenCalledWith('ws-a')

    await refresh

    expect(useAgentStore.getState().panels[panelId]).toMatchObject({
      vaultIndex: entries,
      vaultIndexLoading: false,
      vaultIndexWorkspaceId: 'ws-a',
    })
  })

  it('T-U-006 discards older late refresh responses while keeping loading stable', async () => {
    let resolveFirst!: (entries: Array<{ filename: string; fullPath: string }>) => void
    let resolveSecond!: (entries: Array<{ filename: string; fullPath: string }>) => void
    const firstEntries = [{ filename: 'Old.md', fullPath: 'Docs/Old.md' }]
    const secondEntries = [{ filename: 'New.md', fullPath: 'Docs/New.md' }]
    vi.mocked(window.electronAPI.flashqueryListVaultIndex)
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve }))
    const { useAgentStore } = await import('./agentStore')
    const panelId = 'agent-panel'

    useAgentStore.getState().init(panelId)
    const first = useAgentStore.getState().refreshVaultIndex(panelId, 'ws-a')
    const second = useAgentStore.getState().refreshVaultIndex(panelId, 'ws-a')
    expect(useAgentStore.getState().panels[panelId].vaultIndexLoading).toBe(true)

    resolveFirst(firstEntries)
    await first
    expect(useAgentStore.getState().panels[panelId].vaultIndex).toEqual([])
    expect(useAgentStore.getState().panels[panelId].vaultIndexLoading).toBe(true)

    resolveSecond(secondEntries)
    await second
    expect(useAgentStore.getState().panels[panelId].vaultIndex).toEqual(secondEntries)
    expect(useAgentStore.getState().panels[panelId].vaultIndexLoading).toBe(false)
  })

  it('T-U-006 clears cache metadata and blocks pending stale responses', async () => {
    let resolvePending!: (entries: Array<{ filename: string; fullPath: string }>) => void
    vi.mocked(window.electronAPI.flashqueryListVaultIndex).mockReturnValueOnce(
      new Promise((resolve) => { resolvePending = resolve }),
    )
    const { useAgentStore } = await import('./agentStore')
    const panelId = 'agent-panel'

    useAgentStore.getState().init(panelId)
    const pending = useAgentStore.getState().refreshVaultIndex(panelId, 'ws-a')
    useAgentStore.getState().clearVaultIndex(panelId)

    expect(useAgentStore.getState().panels[panelId]).toMatchObject({
      vaultIndex: [],
      vaultIndexLoading: false,
      vaultIndexWorkspaceId: null,
    })

    resolvePending([{ filename: 'Stale.md', fullPath: 'Docs/Stale.md' }])
    await pending

    expect(useAgentStore.getState().panels[panelId].vaultIndex).toEqual([])
  })

  it('T-U-006 clears old workspace entries before loading replacement entries', async () => {
    const wsAEntries = [{ filename: 'A.md', fullPath: 'A/A.md' }]
    const wsBEntries = [{ filename: 'B.md', fullPath: 'B/B.md' }]
    vi.mocked(window.electronAPI.flashqueryListVaultIndex)
      .mockResolvedValueOnce(wsAEntries)
      .mockResolvedValueOnce(wsBEntries)
    const { useAgentStore } = await import('./agentStore')
    const panelId = 'agent-panel'

    useAgentStore.getState().init(panelId)
    await useAgentStore.getState().refreshVaultIndex(panelId, 'ws-a')
    const refreshB = useAgentStore.getState().refreshVaultIndex(panelId, 'ws-b')

    expect(useAgentStore.getState().panels[panelId]).toMatchObject({
      vaultIndex: [],
      vaultIndexLoading: true,
      vaultIndexWorkspaceId: 'ws-b',
    })

    await refreshB
    expect(useAgentStore.getState().panels[panelId].vaultIndex).toEqual(wsBEntries)
  })

  it('T-U-006 refreshes workspace caches after successful mutating FlashQuery document tool events only', async () => {
    const refreshedEntries = [{ filename: 'Updated.md', fullPath: 'Docs/Updated.md' }]
    vi.mocked(window.electronAPI.flashqueryListVaultIndex).mockResolvedValue(refreshedEntries)
    const { useAgentStore } = await import('./agentStore')
    const panelId = 'agent-panel'

    useAgentStore.getState().init(panelId)
    await useAgentStore.getState().refreshVaultIndex(panelId, 'ws-a')
    vi.mocked(window.electronAPI.flashqueryListVaultIndex).mockClear()

    dispatchAgentEvent({
      panelId,
      event: { type: 'tool_execution_start', toolCallId: 'tool-1', toolName: 'flashquery:search_documents', args: {} },
    })
    dispatchAgentEvent({
      panelId,
      event: {
        type: 'tool_execution_end',
        toolCallId: 'tool-1',
        result: { content: [{ type: 'text', text: 'Done' }], details: { flashquery: true, toolName: 'search_documents', workspaceId: 'ws-a' } },
      },
    })
    expect(window.electronAPI.flashqueryListVaultIndex).not.toHaveBeenCalled()

    dispatchAgentEvent({
      panelId,
      event: { type: 'tool_execution_start', toolCallId: 'tool-2', toolName: 'flashquery:writeDocument', args: {} },
    })
    dispatchAgentEvent({
      panelId,
      event: {
        type: 'tool_execution_end',
        toolCallId: 'tool-2',
        result: { content: [{ type: 'text', text: 'Done' }], details: { flashquery: true, toolName: 'write_document', workspaceId: 'ws-a' } },
      },
    })

    await waitFor(() => expect(window.electronAPI.flashqueryListVaultIndex).toHaveBeenCalledWith('ws-a'))
  })
})
