import { test, expect } from '@playwright/test'
import { closeApp, launchApp } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

test('T-E-006 preserves mocked FlashQuery Pi diagnostics through renderer tool message data', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    const panelId = await page.evaluate(() => window.__cateE2E!.createAgent(
      { x: 160, y: 120 },
      { target: 'dock', zone: 'center' },
    ))
    const agentKey = await page.waitForFunction((panelId) => {
      return window.__cateE2E!.agentPanelIds().find((id) => id.startsWith(`agent-${panelId}-`)) ?? null
    }, panelId).then((handle) => handle.jsonValue() as Promise<string>)
    const longPayload = 'T-E-006-long-messages-payload ' + 'diagnostic-payload '.repeat(500)
    const secretSentinel = 'T-E-006-secret-sentinel'

    await page.evaluate(({ panelId, longPayload, secretSentinel }) => {
      const api = window.__cateE2E!
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_start',
        toolCallId: 'call-model-1',
        toolName: 'call_model',
        args: {
          prompt: 'Use {{ref:Path/to/Doc.md}}',
          purpose: 'summarize-doc',
          template_params: { audience: 'developer' },
        },
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
            result: {
              resolver: 'purpose',
              modelName: 'gpt-4.1-mini',
              iterations: 1,
              messages: [{ role: 'system', content: 'Resolving refs' }],
              secretDiagnosticToken: secretSentinel,
            },
          },
        },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_end',
        toolCallId: 'call-model-1',
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              content: [{ type: 'text', text: 'Reference answer' }],
              metadata: {
                resolver: 'purpose',
                name: 'gpt-4.1-mini',
                resolved_model_name: 'gpt-4.1-mini',
                iterations: 2,
                tokens: { input: 30, output: 12 },
                cost_usd: 0.01,
                latency_ms: 1234,
                resolution_chain: [
                  { step: 'purpose', value: 'summarize-doc' },
                  { step: 'model', value: 'gpt-4.1-mini' },
                ],
                injected_references: [{ path: 'Path/to/Doc.md', resolved: true }],
                tool_calls: [
                  { index: 1, name: 'get_document', status: 'success', summary: 'Path/to/Doc.md' },
                  { index: 2, name: 'search_memory', status: 'success', summary: '2 memories' },
                ],
                template_params: {
                  audience: 'developer',
                  document: 'Path/to/Doc.md',
                  auth: `Bearer ${secretSentinel}`,
                  credentials: secretSentinel,
                  safeLookingValue: `Bearer ${secretSentinel}`,
                },
              },
              messages: [
                { role: 'system', content: 'Use injected document references.' },
                { role: 'user', content: longPayload },
              ],
            }),
          }],
          details: {
            flashquery: true,
            toolName: 'call_model',
            traceId: 'cate-ws-12345678-conv-abcdefghijklmnop',
            diagnostics: {
              secretDiagnosticToken: secretSentinel,
            },
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
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_start',
        toolCallId: 'call-macro-1',
        toolName: 'call_macro',
        args: { source_ref: 'macros/digest.md' },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_end',
        toolCallId: 'call-macro-1',
        result: {
          content: [{ type: 'text', text: 'Macro complete' }],
          details: {
            flashquery: true,
            toolName: 'call_macro',
            result: {
              trace: [
                { step: 'load', status: 'success', tool: 'get_document', message: 'Loaded macro source' },
                { step: 'run', status: 'success', tool: 'call_model', message: 'Generated digest' },
              ],
            },
          },
        },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_start',
        toolCallId: 'generic-1',
        toolName: 'get_document',
        args: { path: 'Docs/Generic.md' },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_end',
        toolCallId: 'generic-1',
        result: {
          content: [{ type: 'text', text: 'Generic document body' }],
          details: {
            flashquery: true,
            toolName: 'get_document',
            result: { path: 'Docs/Generic.md' },
          },
        },
      })
    }, { panelId: agentKey, longPayload, secretSentinel })

    const messages = await page.evaluate((panelId) => window.__cateE2E!.agentMessages(panelId), agentKey)
    expect(messages).toHaveLength(4)
    expect(messages.every((message) => (message as { type?: string }).type === 'tool')).toBe(true)
    expect(messages[0]).toMatchObject({
      type: 'tool',
      name: 'call_model',
      status: 'success',
      result: expect.stringContaining('resolved_model_name'),
      flashquery: {
        flashquery: true,
        toolName: 'call_model',
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
    expect(messages[2]).toMatchObject({
      type: 'tool',
      name: 'call_macro',
      status: 'success',
      flashquery: {
        flashquery: true,
        result: {
          trace: [
            { step: 'load', status: 'success', tool: 'get_document' },
            { step: 'run', status: 'success', tool: 'call_model' },
          ],
        },
      },
    })
    expect(messages[3]).toMatchObject({
      type: 'tool',
      name: 'get_document',
      status: 'success',
      flashquery: {
        flashquery: true,
        toolName: 'get_document',
      },
    })

    await expect(page.getByText('call_model · via purpose gpt-4.1-mini · 2 iter · 2 FQ calls · 42 tok · $0.010 · 1.23s')).toBeVisible()
    await expect(page.getByText('search_memory')).toHaveCount(0)
    await expect(page.getByText(longPayload)).toHaveCount(0)
    await expect(page.getByText(secretSentinel)).toHaveCount(0)

    await page.getByText('call_model · via purpose gpt-4.1-mini').click()
    await expect(page.getByText('Resolution chain')).toBeVisible()
    await expect(page.getByText('purpose: summarize-doc')).toBeVisible()
    await expect(page.getByText('model: gpt-4.1-mini')).toBeVisible()
    await expect(page.getByText('Injected refs')).toBeVisible()
    await expect(page.getByText('Path/to/Doc.md').first()).toBeVisible()
    await expect(page.getByText('FlashQuery tool loop')).toBeVisible()
    await expect(page.getByText('get_document').first()).toBeVisible()
    await expect(page.getByText('search_memory')).toBeVisible()
    await expect(page.getByText('Cost')).toBeVisible()
    await expect(page.getByText('$0.010', { exact: true })).toBeVisible()
    await expect(page.getByText('Template params')).toBeVisible()
    await expect(page.getByText('"audience": "developer"')).toBeVisible()
    await expect(page.getByText('Messages', { exact: true })).toBeVisible()
    await expect(page.getByText('Messages payload')).toBeVisible()
    await expect(page.getByText(longPayload)).toHaveCount(0)
    await expect(page.getByText(secretSentinel)).toHaveCount(0)

    await page.getByText('Messages payload').click()
    await expect(page.getByText(longPayload)).toBeVisible()
    await expect(page.getByText(secretSentinel)).toHaveCount(0)

    await page.getByRole('button', { name: 'Used call_model', exact: true }).click()
    await expect(page.getByText('Reference {{ref:Missing.md}} could not be resolved (document not found).')).toBeVisible()
    await expect(page.getByText('Tool reported an error')).toBeVisible()

    await expect(page.getByText('call_macro · 2 steps')).toBeVisible()
    await page.getByText('call_macro · 2 steps').click()
    await expect(page.getByText('Trace')).toBeVisible()
    await expect(page.getByText('Loaded macro source')).toBeVisible()
    await expect(page.getByText('Generated digest')).toBeVisible()

    await expect(page.getByText('Used')).toHaveCount(4)
    await expect(page.getByText('get_document')).toHaveCount(3)
    await page.getByRole('button', { name: 'Used get_document', exact: true }).click()
    await expect(page.getByText('Docs/Generic.md')).toBeVisible()
    await expect(page.getByText('Generic document body')).toBeVisible()
  } finally {
    if (app) await closeApp(app)
  }
})
