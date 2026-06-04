// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

function renderThread(messages: AgentMessage[]) {
  return render(
    <ChatThread
      messages={messages}
      pendingApprovals={[]}
      onApproval={vi.fn()}
      running={false}
    />,
  )
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

function completedCallModel(overrides: Partial<ToolMessage> = {}): ToolMessage {
  return tool({
    toolCallId: 'call-model-1',
    name: 'call_model',
    result: 'Answer from FlashQuery',
    flashquery: {
      flashquery: true,
      toolName: 'call_model',
      traceId: 'trace-REQ-017-T-U-019',
      refs: [
        { path: 'Docs/Brief.md', resolved: true },
        { path: 'Docs/Missing.md', resolved: false, error: 'document not found' },
      ],
      result: {
        diagnostics: {
          resolver: 'purpose',
          modelName: 'gpt-4.1-mini',
          iterations: 3,
          flashqueryCalls: 2,
          tokens: 1280,
          costUsd: 0.024,
          latencyMs: 1450,
          resolutionChain: [
            { step: 'purpose', value: 'research' },
            { step: 'model', value: 'gpt-4.1-mini' },
          ],
          serverToolLoop: [
            { index: 1, tool: 'search_documents', status: 'success', summary: 'Found 2 docs' },
            { index: 2, tool: 'get_document', status: 'success', summary: 'Loaded Docs/Brief.md' },
          ],
          templateParams: {
            audience: 'developer',
            authorization: 'Bearer should-not-render',
            headers: { authorization: 'Bearer should-not-render' },
            endpointUrl: 'https://should-not-render.example',
            requestInit: { cookie: 'should-not-render' },
            handoff: { token: 'should-not-render' },
          },
          messages: [
            { role: 'system', content: 'Use the project context.' },
            { role: 'user', content: 'Summarize {{ref:Docs/Brief.md}}' },
          ],
        },
      },
    },
    ...overrides,
  })
}

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ChatThread FlashQuery ToolCard rendering', () => {
  it('T-U-019 REQ-017 renders completed call_model collapsed summary from diagnostics', () => {
    renderThread([completedCallModel()])

    expect(screen.getByText('call_model · via purpose gpt-4.1-mini · 3 iter · 2 FQ calls · 1280 tok · $0.024 · 1.45s')).toBeTruthy()
  })

  it('T-U-019 REQ-017 expands call_model diagnostics inside the ToolCard', () => {
    renderThread([completedCallModel()])

    fireEvent.click(screen.getByText('call_model · via purpose gpt-4.1-mini · 3 iter · 2 FQ calls · 1280 tok · $0.024 · 1.45s'))

    expect(screen.getByText('Resolution chain')).toBeTruthy()
    expect(screen.getByText('purpose: research')).toBeTruthy()
    expect(screen.getByText('model: gpt-4.1-mini')).toBeTruthy()
    expect(screen.getByText('Injected refs')).toBeTruthy()
    expect(screen.getByText('Docs/Brief.md')).toBeTruthy()
    expect(screen.getByText('Docs/Missing.md')).toBeTruthy()
    expect(screen.getByText('FlashQuery tool loop')).toBeTruthy()
    expect(screen.getByText('search_documents')).toBeTruthy()
    expect(screen.getByText('Loaded Docs/Brief.md')).toBeTruthy()
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

  it('T-U-019 REQ-017 omits partial or malformed call_model diagnostics and secret-like fields', () => {
    const message = completedCallModel({
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
            templateParams: {
              authorization: 'Bearer should-not-render',
              bearerToken: 'should-not-render',
              headers: { cookie: 'should-not-render' },
              handoff: { token: 'should-not-render' },
              endpointUrl: 'https://should-not-render.example',
              requestInit: { signal: 'should-not-render' },
              visible: 'safe',
            },
          },
        },
      },
    })
    const { container } = renderThread([message])

    expect(screen.getByText('call_model · via purpose gpt-4.1-mini')).toBeTruthy()
    expect(container.textContent).not.toContain('undefined')
    expect(container.textContent).not.toContain('NaN')
    expect(container.textContent).not.toContain(' · $')
    expect(container.textContent).not.toContain('Bearer')
    expect(container.textContent).not.toContain('authorization')
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

    expect(screen.getByText('Used')).toBeTruthy()
    expect(screen.getByText('call_model')).toBeTruthy()
    expect(container.querySelector('.cate-notif-pulse')).toBeTruthy()
    expect(container.textContent).not.toContain('iter')
    expect(container.textContent).not.toContain('FQ calls')
    expect(container.textContent).not.toContain('FlashQuery tool loop')
    expect(container.textContent).not.toContain('$0.2')
    expect(container.textContent).not.toContain('10s')
  })

  it('T-U-019 REQ-017 renders completed call_macro trace as a structured table and keeps running progress generic', () => {
    renderThread([
      tool({
        toolCallId: 'call-macro-1',
        name: 'call_macro',
        result: 'Macro complete',
        flashquery: {
          flashquery: true,
          toolName: 'call_macro',
          result: {
            trace: [
              { step: 'load', status: 'success', tool: 'get_document', message: 'Loaded source' },
              { step: 'write', status: 'success', tool: 'write_document', message: 'Updated target' },
            ],
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

    fireEvent.click(screen.getByText('call_macro · 2 steps'))
    const table = screen.getByRole('table')
    expect(within(table).getByText('load')).toBeTruthy()
    expect(within(table).getByText('get_document')).toBeTruthy()
    expect(within(table).getByText('Updated target')).toBeTruthy()

    expect(screen.getByText('Used')).toBeTruthy()
    expect(screen.getByText('call_macro')).toBeTruthy()
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
