// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
