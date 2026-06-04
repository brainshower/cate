import { test, expect } from '@playwright/test'
import { closeApp, launchApp } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

test('T-E-006 preserves mocked FlashQuery Pi diagnostics through renderer tool message data', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const panelId = 'e2e-flashquery-diagnostics'
    const longPayload = 'diagnostic-payload '.repeat(500)

    await page.evaluate(({ panelId, longPayload }) => {
      const api = window.__cateE2E!
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_start',
        toolCallId: 'call-model-1',
        toolName: 'call_model',
        args: { prompt: 'Use {{ref:Path/to/Doc.md}}' },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_update',
        toolCallId: 'call-model-1',
        partialResult: {
          content: [{ type: 'text', text: 'Resolving model request' }],
          details: {
            flashquery: true,
            toolName: 'call_model',
            traceId: 'cate-ws-12345678-conv-abcdefghijklmnop',
            refs: [{ path: 'Path/to/Doc.md', resolved: true }],
            result: { longPayload },
          },
        },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_end',
        toolCallId: 'call-model-1',
        result: {
          content: [{ type: 'text', text: 'Reference answer' }],
          details: {
            flashquery: true,
            toolName: 'call_model',
            traceId: 'cate-ws-12345678-conv-abcdefghijklmnop',
            diagnostics: { tokens: 42, cost_usd: 0.01, latency_ms: 1234 },
            result: { longPayload, serverToolLoop: [{ name: 'search_memory', elapsed_ms: 12 }] },
          },
        },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_start',
        toolCallId: 'call-model-error',
        toolName: 'call_model',
        args: { prompt: 'Missing ref' },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_end',
        toolCallId: 'call-model-error',
        isError: true,
        result: {
          content: [{ type: 'text', text: 'Reference {{ref:Missing.md}} could not be resolved (document not found).' }],
          details: {
            flashquery: true,
            toolName: 'call_model',
            refs: [{ path: 'Missing.md', resolved: false }],
            result: { isError: true },
          },
        },
      })
    }, { panelId, longPayload })

    const messages = await page.evaluate((panelId) => window.__cateE2E!.agentMessages(panelId), panelId)
    expect(messages).toHaveLength(2)
    expect(messages.every((message) => (message as { type?: string }).type === 'tool')).toBe(true)
    expect(messages[0]).toMatchObject({
      type: 'tool',
      name: 'call_model',
      status: 'success',
      result: 'Reference answer',
      flashquery: {
        flashquery: true,
        toolName: 'call_model',
        diagnostics: { tokens: 42, cost_usd: 0.01, latency_ms: 1234 },
        result: { serverToolLoop: [{ name: 'search_memory', elapsed_ms: 12 }] },
      },
    })
    expect(JSON.stringify(messages[0])).toContain(longPayload)
    expect(messages[1]).toMatchObject({
      type: 'tool',
      name: 'call_model',
      status: 'error',
      error: 'Tool reported an error',
      flashquery: {
        flashquery: true,
        refs: [{ path: 'Missing.md', resolved: false }],
      },
    })
  } finally {
    if (app) await closeApp(app)
  }
})
