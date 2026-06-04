import { test, expect } from '@playwright/test'
import { closeApp, launchApp } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

// REQ-016 #8 / REQ-017 #4 — automated companion to manual T-M-002.
//
// This is the deterministic regression that closes the Phase 20 Gap 5 / CF-01
// residual: it drives a `call_macro` through the REAL FlashQuery response
// envelope shape — the trace lives as a JSON string inside `content[0].text`
// (`{ task_id, result, trace }`), exactly as `normalizeFlashQueryToolResult`
// produces it from a live server — with NO fabricated top-level
// `details.result.trace`. The only way the completed trace table can render
// here is if `parseCallMacroEnvelope` parses the live envelope, so a passing
// run proves the fix end-to-end through the real agentStore -> ChatThread path.
//
// The genuinely-live parts that this cannot prove (a real host model choosing
// to call the macro, a real server emitting throttled progress notifications,
// `needs_user_input`) remain the manual T-M-002 scope recorded in 20-UAT.md.
test('T-E-006b REQ-017 renders call_macro trace table from the REAL envelope shape and forwards live progress', async () => {
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

    // The real macro envelope: a JSON string carrying the trace, delivered
    // inside content[0].text — NOT a top-level details.result.trace array.
    const progressMessage = 'Phase 2 of 3: generating digest'
    const macroEnvelope = JSON.stringify({
      task_id: 'macro-real-1',
      result: { summary: 'Digest written to Docs/Digest.md' },
      trace: [
        { kind: 'tool_call', name: 'get_document', message: 'Loaded macro source', at: '2026-06-04T12:00:00Z', elapsed_ms: 12 },
        { kind: 'model_call', name: 'call_model', message: 'Generated digest', at: '2026-06-04T12:00:01Z', elapsed_ms: 240 },
        { kind: 'tool_call', name: 'write_document', message: 'Wrote target document', at: '2026-06-04T12:00:02Z', elapsed_ms: 30 },
      ],
    })

    // 1) Start + a live progress update (mirrors the extension's onUpdate ->
    //    notifications/progress forwarding). No end event yet.
    await page.evaluate(({ panelId, progressMessage }) => {
      const api = window.__cateE2E!
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_start',
        toolCallId: 'call-macro-real',
        toolName: 'call_macro',
        args: { source_ref: 'macros/digest.md' },
      })
      api.dispatchAgentEvent(panelId, {
        type: 'tool_execution_update',
        toolCallId: 'call-macro-real',
        partialResult: {
          content: [{ type: 'text', text: progressMessage }],
          details: {
            flashquery: true,
            toolName: 'call_macro',
            macroProgress: { progress: 2, total: 3, message: progressMessage },
          },
        },
      })
    }, { panelId: agentKey, progressMessage })

    // The live progress message must reach the running tool message (this is the
    // partialText the running ToolCard renders; REQ-016 #7). Asserted at the
    // data level so it is deterministic and not raced by the completion event.
    await page.waitForFunction(({ panelId, progressMessage }) => {
      const messages = window.__cateE2E!.agentMessages(panelId) as Array<Record<string, unknown>>
      const macro = messages.find((m) => m.name === 'call_macro')
      return !!macro && macro.status === 'running' && macro.partialText === progressMessage
    }, { panelId: agentKey, progressMessage })

    // 2) Completion with the real envelope shape.
    await page.evaluate(({ panelId, macroEnvelope }) => {
      window.__cateE2E!.dispatchAgentEvent(panelId, {
        type: 'tool_execution_end',
        toolCallId: 'call-macro-real',
        result: {
          content: [{ type: 'text', text: macroEnvelope }],
          details: {
            flashquery: true,
            toolName: 'call_macro',
            workspaceId: 'ws-e2e',
            traceId: 'cate-ws-12345678-conv-abcdefghijklmnop',
            // Real shape: the raw MCP tool result, trace buried in content text.
            result: { content: [{ type: 'text', text: macroEnvelope }] },
          },
        },
      })
    }, { panelId: agentKey, macroEnvelope })

    // Data-level: the stored message uses the real shape (no top-level
    // details.result.trace; trace is only inside the content text).
    const macroMessage = await page.evaluate((panelId) => {
      const messages = window.__cateE2E!.agentMessages(panelId) as Array<Record<string, unknown>>
      return messages.find((m) => m.name === 'call_macro') ?? null
    }, agentKey)
    expect(macroMessage).toMatchObject({
      type: 'tool',
      name: 'call_macro',
      status: 'success',
      flashquery: { flashquery: true, toolName: 'call_macro' },
    })
    const fqResult = (macroMessage as { flashquery?: { result?: Record<string, unknown> } }).flashquery?.result
    expect(Array.isArray(fqResult?.content)).toBe(true) // real raw-MCP-result shape
    expect(fqResult?.trace).toBeUndefined()              // NOT the fabricated top-level shape

    // UI-level: collapsed summary proves the trace was parsed from the real
    // envelope (3 steps could only come from parseCallMacroEnvelope here).
    await expect(page.getByText('call_macro · 3 steps')).toBeVisible()
    await page.getByText('call_macro · 3 steps').click()
    await expect(page.getByText('Trace')).toBeVisible()
    await expect(page.getByText('tool_call').first()).toBeVisible()
    await expect(page.getByText('model_call')).toBeVisible()
    await expect(page.getByText('Loaded macro source')).toBeVisible()
    await expect(page.getByText('Generated digest')).toBeVisible()
    await expect(page.getByText('Wrote target document')).toBeVisible()
  } finally {
    if (app) await closeApp(app)
  }
})
