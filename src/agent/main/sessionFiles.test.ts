import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSessionTranscript } from './sessionFiles'

vi.mock('../../main/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('sessionFiles FlashQuery diagnostics replay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('T-U-018 preserves FlashQuery details from persisted toolResult details without a new message type', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'cate-session-flashquery-'))
    const sessionFile = path.join(cwd, '.cate', 'pi-agent', 'sessions', '-tmp-cate-session--', '2026.jsonl')
    await writeSession(sessionFile, [
      { type: 'session', id: 's1', cwd, timestamp: '2026-06-04T00:00:00Z' },
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [{
            type: 'toolCall',
            id: 'tool-1',
            name: 'call_model',
            arguments: { prompt: 'Use refs' },
          }],
        },
      },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolCallId: 'tool-1',
          content: [{ type: 'text', text: 'Model done' }],
          details: {
            flashquery: true,
            toolName: 'call_model',
            traceId: 'cate-ws-12345678-conv-abcdefghijklmnop',
            refs: [{ path: 'Path/to/Doc.md', resolved: true }],
            result: { tokens: 42 },
          },
        },
      },
    ])

    const messages = await loadSessionTranscript(sessionFile)

    expect(messages).toContainEqual(expect.objectContaining({
      type: 'tool',
      name: 'call_model',
      result: 'Model done',
      flashquery: expect.objectContaining({ flashquery: true, toolName: 'call_model', result: { tokens: 42 } }),
    }))
  })

  it('T-U-018 keeps subagent replay details working', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'cate-session-subagent-'))
    const sessionFile = path.join(cwd, '.cate', 'pi-agent', 'sessions', '-tmp-cate-session--', '2026.jsonl')
    await writeSession(sessionFile, [
      { type: 'session', id: 's1', cwd, timestamp: '2026-06-04T00:00:00Z' },
      {
        type: 'message',
        message: {
          role: 'assistant',
          content: [{
            type: 'toolCall',
            id: 'tool-1',
            name: 'subagent',
            arguments: {},
          }],
        },
      },
      {
        type: 'message',
        message: {
          role: 'toolResult',
          toolCallId: 'tool-1',
          content: [{ type: 'text', text: 'Subagent done' }],
          details: {
            mode: 'single',
            results: [{
              agent: 'worker',
              task: 'check',
              exitCode: 0,
              messages: [{ role: 'assistant', content: [{ type: 'text', text: 'Worker done' }] }],
              usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, cost: 0 },
            }],
          },
        },
      },
    ])

    const messages = await loadSessionTranscript(sessionFile)

    expect(messages).toContainEqual(expect.objectContaining({
      type: 'tool',
      name: 'subagent',
      result: 'Subagent done',
      subagent: expect.objectContaining({ results: [expect.objectContaining({ agent: 'worker', finalText: 'Worker done' })] }),
    }))
  })
})

async function writeSession(filePath: string, entries: unknown[]): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${entries.map((entry) => JSON.stringify(entry)).join('\n')}\n`, { encoding: 'utf-8' })
}
