// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openTerminalUrl } from '../../renderer/lib/terminalUrlOpen'
import { setCanvasOperations, useAppStore, type CanvasOperations } from '../../renderer/stores/appStore'
import { ChatThread } from './ChatThread'
import type { AgentMessage, ToolMessage } from './agentStore'

vi.mock('../../renderer/lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock('../../renderer/lib/perf/perfClient', () => ({
  useRenderCount: vi.fn(),
}))

vi.mock('../../renderer/lib/terminalRegistry', () => ({
  terminalRegistry: {
    dispose: vi.fn(),
  },
}))

vi.mock('../../renderer/lib/terminalUrlOpen', () => ({
  openTerminalUrl: vi.fn(),
}))

const ChatThreadAny = ChatThread as React.ComponentType<React.ComponentProps<typeof ChatThread> & { workspaceId?: string }>

function renderThread(messages: AgentMessage[]) {
  return render(
    <ChatThreadAny
      messages={messages}
      pendingApprovals={[]}
      onApproval={vi.fn()}
      running={false}
      workspaceId="cate-workspace"
    />,
  )
}

const makeCanvasOps = (): CanvasOperations => ({
  addNodeAndFocus: vi.fn(),
  removeNodeForPanel: vi.fn(),
  loadWorkspaceCanvas: vi.fn(),
  syncCanvasSnapshot: vi.fn(() => ({
    nodes: {},
    regions: {},
    viewportOffset: { x: 0, y: 0 },
    zoomLevel: 1,
    focusedNodeId: null,
  })),
  clearAllNodes: vi.fn(),
  focusPanelNode: vi.fn(),
  storeApi: {} as CanvasOperations['storeApi'],
})

function seedWorkspace() {
  useAppStore.setState({
    selectedWorkspaceId: 'cate-workspace',
    workspaces: [{
      id: 'cate-workspace',
      name: 'Workspace',
      color: '#5AD8B8',
      rootPath: '/workspace',
      panels: {},
      canvasNodes: {},
      regions: {},
      zoomLevel: 1,
      viewportOffset: { x: 0, y: 0 },
      focusedNodeId: null,
    }],
  })
  setCanvasOperations(makeCanvasOps())
}

function tool(overrides: Partial<ToolMessage>): ToolMessage {
  return {
    type: 'tool',
    id: overrides.id ?? `msg-${overrides.toolCallId ?? 'tool'}`,
    toolCallId: overrides.toolCallId ?? 'tool-1',
    name: overrides.name ?? 'call_model',
    args: overrides.args ?? {},
    status: overrides.status ?? 'success',
    ...overrides,
  }
}

function callModelEnvelopeText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    content: [{ type: 'text', text: 'Answer from FlashQuery' }],
    metadata: {
      resolver: 'purpose',
      name: 'research',
      resolved_model_name: 'gpt-4.1-mini',
      provider_name: 'openai',
      fallback_position: 2,
      iterations: 3,
      tokens: { input: 1000, output: 280 },
      cost_usd: 0.024,
      latency_ms: 1450,
      injected_references: [
        {
          path: 'Docs/Brief.md',
          resolved: true,
          template_params_used: { audience: 'developer' },
        },
        { path: 'Docs/Missing.md', resolved: false, error: 'document not found' },
      ],
      tool_calls: [
        { server: 'filesystem', tool: 'read_file', count: 1, cost: 0.002 },
      ],
      tools: {
        calls_log: [
          {
            iteration: 1,
            model_name: 'gpt-4.1-mini',
            provider_name: 'openai',
            tool_calls: [
              { tool_name: 'search_documents', status: 'success', summary: 'Found 2 docs' },
              { tool_name: 'get_document', status: 'success', summary: 'Loaded Docs/Brief.md' },
            ],
          },
        ],
      },
    },
    messages: [
      { role: 'system', content: 'Use the project context.' },
      { role: 'user', content: 'Summarize {{ref:Docs/Brief.md}}' },
    ],
    ...overrides,
  })
}

function templateParams() {
  return {
    'Docs/Brief.md': {
        audience: 'developer',
        authorization: 'Bearer should-not-render',
        auth: 'Basic should-not-render',
        credentials: 'should-not-render',
        headers: { authorization: 'Bearer should-not-render' },
        endpointUrl: 'https://should-not-render.example',
        requestInit: { cookie: 'should-not-render' },
        handoff: { token: 'should-not-render' },
        innocuous: 'Bearer should-not-render',
    },
  }
}

function completedCallModel(overrides: Partial<ToolMessage> = {}): ToolMessage {
  const result = callModelEnvelopeText()
  return tool({
    toolCallId: 'call-model-1',
    name: 'call_model',
    args: {
      prompt: 'Summarize {{ref:Docs/Brief.md}}',
      purpose: 'research',
      template_params: templateParams(),
    },
    result,
    flashquery: {
      flashquery: true,
      toolName: 'call_model',
      traceId: 'trace-REQ-017-T-U-019',
      result: {
        content: [{ type: 'text', text: result }],
      },
    },
    ...overrides,
  })
}

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn()
  seedWorkspace()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ChatThread FlashQuery ToolCard rendering', () => {
  it('T-U-019 REQ-017 renders completed call_model collapsed summary from diagnostics', () => {
    renderThread([completedCallModel()])

    expect(screen.getByText('call_model · via purpose gpt-4.1-mini · 3 iter · 3 FQ calls · 1280 tok · $0.024 · 1.45s')).toBeTruthy()
  })

  it('T-U-019 REQ-017 expands call_model diagnostics inside the ToolCard', () => {
    renderThread([completedCallModel()])

    fireEvent.click(screen.getByText('call_model · via purpose gpt-4.1-mini · 3 iter · 3 FQ calls · 1280 tok · $0.024 · 1.45s'))

    expect(screen.getByText('Resolution chain')).toBeTruthy()
    expect(screen.getByText('purpose: research')).toBeTruthy()
    expect(screen.getByText('model: gpt-4.1-mini')).toBeTruthy()
    expect(screen.getByText('provider: openai')).toBeTruthy()
    expect(screen.getByText('fallback: #2')).toBeTruthy()
    expect(screen.getByText('Injected refs')).toBeTruthy()
    expect(screen.getByText('Docs/Brief.md')).toBeTruthy()
    expect(screen.getByText('Docs/Missing.md')).toBeTruthy()
    expect(screen.getByText('FlashQuery tool loop')).toBeTruthy()
    expect(screen.getByText('search_documents')).toBeTruthy()
    expect(screen.getByText('Loaded Docs/Brief.md')).toBeTruthy()
    expect(screen.getByText('filesystem/read_file')).toBeTruthy()
    expect(screen.getByText('count 1')).toBeTruthy()
    expect(screen.getByText('$0.002')).toBeTruthy()
    expect(screen.getByText('Cost')).toBeTruthy()
    expect(screen.getByText('$0.024')).toBeTruthy()
    expect(screen.getByText('Template params')).toBeTruthy()
    expect(screen.getByText('"audience": "developer"', { exact: false })).toBeTruthy()

    const messagesButton = screen.getByRole('button', { name: /Messages payload/ })
    expect(messagesButton).toBeTruthy()
    expect(screen.queryByText('Use the project context.')).toBeNull()
    fireEvent.click(messagesButton)
    expect(screen.getByText('Use the project context.', { exact: false })).toBeTruthy()
  })

  it('T-U-019 REQ-017 renders native call_model tool loop when brokered tool_calls is empty', () => {
    const result = callModelEnvelopeText({
      metadata: {
        resolver: 'model',
        name: 'gpt-4.1-mini',
        resolved_model_name: 'gpt-4.1-mini',
        provider_name: 'openai',
        iterations: 1,
        tool_calls: [],
        tools: {
          calls_log: [
            {
              iteration: 1,
              tool_calls: [
                { tool_name: 'search_documents', status: 'success', summary: 'Found Docs/Brief.md' },
              ],
            },
          ],
        },
      },
    })

    renderThread([completedCallModel({ result })])

    expect(screen.getByText('call_model · via model gpt-4.1-mini · 1 iter · 1 FQ calls')).toBeTruthy()
    fireEvent.click(screen.getByText('call_model · via model gpt-4.1-mini · 1 iter · 1 FQ calls'))
    expect(screen.getByText('model: gpt-4.1-mini')).toBeTruthy()
    expect(screen.getByText('provider: openai')).toBeTruthy()
    expect(screen.getByText('search_documents')).toBeTruthy()
    expect(screen.getByText('Found Docs/Brief.md')).toBeTruthy()
  })

  it('T-U-019 REQ-017 omits partial or malformed call_model diagnostics and secret-like fields', () => {
    const message = completedCallModel({
      result: 'Partial FlashQuery answer',
      flashquery: {
        flashquery: true,
        toolName: 'call_model',
        result: {
          diagnostics: {
            resolver: 'purpose',
            modelName: 'gpt-4.1-mini',
            iterations: 'bad',
            flashqueryCalls: Number.NaN,
            tokens: undefined,
            costUsd: 'bad',
            latencyMs: undefined,
          },
        },
      },
      args: {
        template_params: {
          visible: 'safe',
          authorization: 'Bearer should-not-render',
          auth: 'Basic should-not-render',
          credentials: 'should-not-render',
          bearerToken: 'should-not-render',
          headers: { cookie: 'should-not-render' },
          handoff: { token: 'should-not-render' },
          endpointUrl: 'https://should-not-render.example',
          requestInit: { signal: 'should-not-render' },
          innocuous: 'Bearer should-not-render',
        },
      },
    })
    const { container } = renderThread([message])

    expect(screen.getByText('call_model · via purpose gpt-4.1-mini')).toBeTruthy()
    expect(container.textContent).not.toContain('undefined')
    expect(container.textContent).not.toContain('NaN')
    expect(container.textContent).not.toContain(' · $')
    expect(container.textContent).not.toContain('Bearer')
    expect(container.textContent).not.toContain('Basic')
    expect(container.textContent).not.toContain('authorization')
    expect(container.textContent).not.toContain('auth')
    expect(container.textContent).not.toContain('credentials')
    expect(container.textContent).not.toContain('bearerToken')
    expect(container.textContent).not.toContain('headers')
    expect(container.textContent).not.toContain('handoff')
    expect(container.textContent).not.toContain('endpointUrl')
    expect(container.textContent).not.toContain('requestInit')

    fireEvent.click(screen.getByText('call_model · via purpose gpt-4.1-mini'))
    expect(screen.getByText('"visible": "safe"', { exact: false })).toBeTruthy()
    expect(container.textContent).not.toContain('should-not-render')
  })

  it('T-U-019 REQ-017 keeps running call_model on the standard in-flight ToolCard path', () => {
    const { container } = renderThread([
      tool({
        toolCallId: 'call-model-running',
        name: 'call_model',
        status: 'running',
        partialText: 'FlashQuery is working',
        flashquery: {
          flashquery: true,
          toolName: 'call_model',
          result: {
            diagnostics: {
              iterations: 4,
              flashqueryCalls: 9,
              costUsd: 0.2,
              latencyMs: 10_000,
              serverToolLoop: [{ tool: 'search_documents', status: 'running' }],
            },
          },
        },
      }),
    ])

    expect(screen.getAllByText('Used').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('call_model')).toBeTruthy()
    expect(container.querySelector('.cate-notif-pulse')).toBeTruthy()
    expect(container.textContent).not.toContain('iter')
    expect(container.textContent).not.toContain('FQ calls')
    expect(container.textContent).not.toContain('FlashQuery tool loop')
    expect(container.textContent).not.toContain('$0.2')
    expect(container.textContent).not.toContain('10s')
  })

  it('T-U-019 REQ-017 renders completed call_macro trace as a structured table and keeps running progress generic', () => {
    const macroEnvelope = JSON.stringify({
      task_id: 'macro-1',
      result: { summary: 'Macro complete' },
      trace: [
        { kind: 'tool_call', name: 'get_document', message: 'Loaded source', at: '2026-06-04T12:00:00Z', elapsed_ms: 12 },
        { kind: 'model_call', name: 'call_model', message: 'Generated digest', at: '2026-06-04T12:00:01Z', elapsed_ms: 240 },
        { kind: 'fail', name: 'write_document', message: 'Updated target', at: '2026-06-04T12:00:02Z' },
      ],
    })
    renderThread([
      tool({
        toolCallId: 'call-macro-1',
        name: 'call_macro',
        result: macroEnvelope,
        flashquery: {
          flashquery: true,
          toolName: 'call_macro',
          result: {
            content: [{ type: 'text', text: macroEnvelope }],
          },
        },
      }),
      tool({
        toolCallId: 'call-macro-running',
        name: 'call_macro',
        status: 'running',
        partialText: 'Running macro step from FlashQuery',
        flashquery: {
          flashquery: true,
          toolName: 'call_macro',
          macroProgress: { message: 'Running macro step from FlashQuery', step: 'load' },
        },
      }),
    ])

    fireEvent.click(screen.getByText('call_macro · 3 steps'))
    const table = screen.getByRole('table')
    expect(within(table).getByText('tool_call')).toBeTruthy()
    expect(within(table).getByText('get_document')).toBeTruthy()
    expect(within(table).getByText('model_call')).toBeTruthy()
    expect(within(table).getByText('call_model')).toBeTruthy()
    expect(within(table).getByText('fail')).toBeTruthy()
    expect(within(table).getByText('Updated target')).toBeTruthy()

    expect(screen.getAllByText('Used').length).toBeGreaterThanOrEqual(1)
    fireEvent.click(screen.getByText('call_macro'))
    expect(screen.getByText('Running macro step from FlashQuery')).toBeTruthy()
    expect(document.body.textContent).not.toContain('1/2')
    expect(document.body.textContent).not.toContain('elapsed')
  })

  it('T-U-019 REQ-017 leaves non-special FlashQuery tools on the generic ToolCard path without new message types', () => {
    const messages: AgentMessage[] = [
      tool({
        toolCallId: 'get-document-1',
        name: 'get_document',
        args: { identifiers: 'Docs/Brief.md' },
        result: 'Document body',
        flashquery: {
          flashquery: true,
          toolName: 'get_document',
          result: { diagnostics: { serverToolLoop: [{ tool: 'search_documents' }] } },
        },
      }),
    ]

    expect(messages.every((message) => message.type === 'tool')).toBe(true)
    renderThread(messages)

    expect(screen.getByText('Used')).toBeTruthy()
    expect(screen.getByText('get_document')).toBeTruthy()
    expect(screen.queryByText('FlashQuery tool loop')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

describe('ChatThread markdown links', () => {
  it('routes clicked website links to a Cate browser panel', () => {
    renderThread([{
      type: 'assistant',
      id: 'assistant-1',
      text: 'Open [the docs](https://example.com/docs).',
      streaming: false,
    }])

    fireEvent.click(screen.getByRole('link', { name: 'the docs' }))

    expect(openTerminalUrl).toHaveBeenCalledWith('cate-workspace', 'https://example.com/docs')
  })

  it('opens clicked FlashQuery vault document links as editor panels', () => {
    renderThread([{
      type: 'assistant',
      id: 'assistant-1',
      text: 'See [the plan](flashquery://fq-workspace/Docs/Plan.md).',
      streaming: false,
    }])

    fireEvent.click(screen.getByRole('link', { name: 'the plan' }))

    const workspace = useAppStore.getState().workspaces.find((ws) => ws.id === 'cate-workspace')
    expect(Object.values(workspace?.panels ?? {})).toEqual([
      expect.objectContaining({
        type: 'editor',
        filePath: 'flashquery://fq-workspace/Docs/Plan.md',
        title: 'Plan.md',
      }),
    ])
  })
})
