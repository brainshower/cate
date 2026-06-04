# Phase 19: Pi ToolCard Observability Rendering - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 4 new/modified files
**Analogs found:** 4 / 4

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/agent/renderer/ChatThread.tsx` | component | event-driven render/transform | `src/agent/renderer/ChatThread.tsx` rich `subagent` and generic `ToolCard` branches | exact |
| `src/agent/renderer/ChatThread.test.tsx` | test | event-driven render assertions | `src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` + `src/agent/renderer/agentStore.test.ts` | role-match |
| `e2e/flashquery-pi-diagnostics.spec.ts` | test | event-driven E2E harness | `e2e/flashquery-pi-diagnostics.spec.ts` | exact |
| `src/renderer/lib/e2eHarness.ts` | utility/harness | event-driven bridge | `src/renderer/lib/e2eHarness.ts` | exact |

Reference-only inputs, not expected source edits unless an implementation gap is discovered:

| Reference File | Role | Data Flow | Use |
|----------------|------|-----------|-----|
| `src/agent/renderer/agentStore.ts` | store | event-driven transform | `ToolMessage.flashquery` shape and live event preservation |
| `src/agent/main/sessionFiles.ts` | service | file-I/O transform | replayed session `flashquery` preservation |
| `src/agent/extensions/cate-flashquery/diagnostics.ts` | utility | transform | Phase 18 diagnostics envelope emitted by FlashQuery tools |
| `src/agent/extensions/cate-flashquery/model-tool.ts` | service | request-response | `call_model` trace/ref/result shape |
| `src/agent/extensions/cate-flashquery/macro-tool.ts` | service | request-response/progress event | `call_macro` progress/final-result shape |

## Pattern Assignments

### `src/agent/renderer/ChatThread.tsx` (component, event-driven render/transform)

**Analog:** `src/agent/renderer/ChatThread.tsx`

**Imports pattern** (lines 10-34):
```tsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRenderCount } from '../../renderer/lib/perf/perfClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Wrench,
  PencilSimple,
  Terminal as TerminalIcon,
  FileText,
  MagnifyingGlass,
  Copy,
  ClipboardText,
  ArrowClockwise,
  WarningCircle,
  Info,
} from '@phosphor-icons/react'
import type { AgentMessage, DiffInfo, RetryState, SubagentResult, SubagentToolCall, ToolMessage } from './agentStore'
import { deriveDiff } from './agentStore'
```

Copy this style: React hooks first, renderer helpers via relative paths, Phosphor icons from `@phosphor-icons/react`, and `import type` for `ToolMessage`/message contracts. Add any new icons to the existing Phosphor import rather than adding a second icon package.

**Routing pattern** (lines 297-311):
```tsx
if (msg.type === 'tool' && msg.name === 'subagent') {
  return <SubagentCard msg={msg} shimmer={shimmer} />
}
if (msg.type === 'tool' && msg.name === 'plan_complete') {
  return (
    <PlanReadyCard
      msg={msg}
      onImplement={onImplementPlan}
      onRefine={onRefinePlan}
      onClearAndImplement={onClearAndImplement}
      stale={!isLast}
    />
  )
}
return <ToolCard msg={msg} shimmer={shimmer} />
```

Apply Phase 19 by adding a branch before the generic `ToolCard`, and only for `msg.flashquery && (msg.name === 'call_model' || msg.name === 'call_macro')`. Do not add a new message type or free-standing FlashQuery chat row.

**Generic ToolCard collapsed/expanded pattern** (lines 523-552, 583-620):
```tsx
function ToolCard({ msg, shimmer }: { msg: ToolMessage; shimmer?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const liveOutput = msg.status === 'running' ? msg.partialText : undefined
  const verb = toolVerb(msg)
  const summary = toolSummary(msg)

  const hasExtras =
    isEditish ||
    (isWrite && writeContent.length > 0) ||
    (isRead && readBody.length > 0) ||
    !!msg.result || !!liveOutput || !!msg.error || msg.args != null

  const isRunning = msg.status === 'running' || msg.status === 'pending'

  return (
    <div className="text-[12px] cate-fade-in">
      <button
        onClick={() => hasExtras && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-1.5 text-left ${isRunning || shimmer ? 'cate-notif-pulse' : ''} ${hasExtras ? 'hover:text-primary' : 'cursor-default'}`}
      >
        <span className="text-muted shrink-0">{verb}</span>
        <span className="truncate text-primary/90 font-mono flex-1">{summary}</span>
      </button>
      {expanded && hasExtras && (
        <div className="mt-1 pl-4 space-y-1.5">
          {/* details */}
          {msg.error && (
            <pre className="text-[11px] text-rose-300/90 whitespace-pre-wrap break-words font-mono leading-snug">
              {msg.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
```

Copy the same card rhythm: collapsed button, `cate-notif-pulse` while running, `truncate` summary, expanded `pl-4 space-y-1.5`, bounded `pre` payloads, and red monospace error text.

**Rich-card analog** (lines 640-690, 718-746):
```tsx
function SubagentCard({ msg, shimmer }: { msg: ToolMessage; shimmer?: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const running = msg.status === 'running' || msg.status === 'pending'

  return (
    <div className="text-[12px] cate-fade-in">
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center gap-1.5 text-left hover:text-primary ${running || shimmer ? 'cate-notif-pulse' : ''}`}
      >
        <span className="text-muted shrink-0">subagent</span>
        <span className="truncate text-primary/90 font-mono flex-1">
          {results.length > 0 ? `${results.length} task${results.length > 1 ? 's' : ''}` : ''}
        </span>
      </button>
      {expanded && (
        <div className="mt-1 pl-4 space-y-1.5">
          {results.map((r, i) => <SubagentResultRow key={i} result={r} parentRunning={running} />)}
        </div>
      )}
    </div>
  )
}

const usageBits: string[] = []
if (result.usage?.turns) usageBits.push(`${result.usage.turns} turn${result.usage.turns > 1 ? 's' : ''}`)
if (result.usage?.input) usageBits.push(`↑${formatTokensShort(result.usage.input)}`)
if (result.usage?.output) usageBits.push(`↓${formatTokensShort(result.usage.output)}`)
if (result.usage?.cost) usageBits.push(`$${result.usage.cost.toFixed(3)}`)
```

Use this for the FlashQuery-rich card: local helper/component, typed rows, optional metric segments, and no global chrome. Unlike `SubagentCard`, keep `call_model` running state standard: do not render final-only diagnostics while `msg.status === 'running'`.

**Payload/display pattern** (lines 476-501, 601-614):
```tsx
function CodePreview({ text, startLine = 1, maxLines = 200 }: { text: string; startLine?: number; maxLines?: number }) {
  const lines = text.split('\n')
  const truncated = lines.length > maxLines
  const shown = truncated ? lines.slice(0, maxLines) : lines
  return (
    <div className="font-mono text-[11px] leading-snug max-h-[280px] overflow-auto">
      {shown.map((l, i) => (
        <div key={i} className="flex">
          <span className="text-muted/40 select-none w-5 text-right pr-1.5 shrink-0">{startLine + i}</span>
          <span className="whitespace-pre-wrap break-words text-primary/85 flex-1">{l || ' '}</span>
        </div>
      ))}
      {truncated && <div className="text-muted text-[10.5px] mt-1 pl-5">… {lines.length - maxLines} more lines</div>}
    </div>
  )
}
```

Use bounded, nested disclosure for returned `messages` payloads and raw diagnostic JSON. Do not show long message payloads by default.

### `src/agent/renderer/ChatThread.test.tsx` (test, event-driven render assertions)

**Analogs:** `src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx`, `src/agent/renderer/agentStore.test.ts`

**Component test imports/setup pattern** (`FlashQueryVaultSearchPanel.test.tsx` lines 1-18):
```tsx
import React from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))
```

Copy the Testing Library style for rendering and user interaction. Prefer `screen`, `fireEvent`, and `waitFor`; call `cleanup()` and `vi.restoreAllMocks()` in `afterEach`.

**Agent event/store test pattern** (`agentStore.test.ts` lines 1-29, 40-75):
```ts
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AgentEventEnvelope } from '../../shared/types'

vi.mock('../../renderer/lib/logger', () => ({ default: { debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() } }))

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
    dispatchAgentEvent({ panelId, event: { type: 'tool_execution_start', toolCallId: 'tool-1', toolName: 'call_model', args: { prompt: 'Use refs' } } })
    dispatchAgentEvent({ panelId, event: { type: 'tool_execution_end', toolCallId: 'tool-1', result: { content: [{ type: 'text', text: 'Done' }], details: flashqueryDetails } } })
    expect(tool).toMatchObject({ type: 'tool', status: 'success', result: 'Done', flashquery: { flashquery: true, toolName: 'call_model' } })
  })
})
```

For `T-U-019`, render `ChatThread` directly with hand-built `ToolMessage` arrays. Cover:

- `call_model` collapsed summary with all segments.
- partial diagnostics omitting unavailable segments, with no `undefined`, `NaN`, dangling `$`, or broken latency text.
- expanded resolution chain, refs, teal server-side tool-loop sub-block, cost, template params, and collapsed messages payload.
- `call_macro` completed trace table from final trace only.
- ordinary FlashQuery tools such as `get_document` still using generic `ToolCard`.
- running `call_model` showing only the standard pulse/in-flight card, no fabricated iterations/FQ calls/server-loop rows.

### `e2e/flashquery-pi-diagnostics.spec.ts` (test, event-driven E2E harness)

**Analog:** `e2e/flashquery-pi-diagnostics.spec.ts`

**Imports and launch/cleanup pattern** (lines 1-10, 98-100):
```ts
import { test, expect } from '@playwright/test'
import { closeApp, launchApp } from './fixtures/electron-app'
import type { ElectronApplication } from 'playwright'

test('T-E-006 preserves mocked FlashQuery Pi diagnostics through renderer tool message data', async () => {
  let app: ElectronApplication | null = null
  try {
    const launched = await launchApp()
    app = launched.electronApp
    const page = launched.mainWindow
    // assertions
  } finally {
    if (app) await closeApp(app)
  }
})
```

Keep this one-app lifecycle pattern and extend the existing `T-E-006` rather than creating a parallel diagnostics spec.

**Mock Pi event injection pattern** (lines 14-49):
```ts
await page.evaluate(({ panelId, longPayload }) => {
  const api = window.__cateE2E!
  api.dispatchAgentEvent(panelId, {
    type: 'tool_execution_start',
    toolCallId: 'call-model-1',
    toolName: 'call_model',
    args: { prompt: 'Use {{ref:Path/to/Doc.md}}' },
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
}, { panelId, longPayload })
```

Extend the payload shape to include the product-required values: resolver/name, iterations, FQ call count, tokens, cost, latency, resolution chain, refs, template params, messages payload, server tool loop, and macro trace.

**Existing preservation assertion pattern** (lines 72-87):
```ts
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
  },
})
```

Keep these data-shape assertions, then add DOM assertions against the actual ToolCard UI: collapsed summary text, expand click behavior, nested messages disclosure, error/system-message visibility, and unchanged message count/no new message type.

### `src/renderer/lib/e2eHarness.ts` (utility/harness, event-driven bridge)

**Analog:** `src/renderer/lib/e2eHarness.ts`

**Global API typing pattern** (lines 21-63):
```ts
declare global {
  interface Window {
    __cateE2E?: {
      ready: true
      createAgent(point: Point, placement?: PanelPlacement): string
      dispatchAgentEvent(panelId: string, event: { type: string; [key: string]: unknown }): void
      agentMessages(panelId: string): unknown[]
    }
  }
}
```

Only extend the harness if DOM setup needs a missing agent-panel helper. Prefer current helpers first.

**Dispatch/inspect implementation pattern** (lines 326-332, 370-371):
```ts
const dispatchAgentEvent = (panelId: string, event: { type: string; [key: string]: unknown }): void => {
  handleAgentEvent(panelId, event)
}

const agentMessages = (panelId: string): unknown[] => {
  return useAgentStore.getState().panels[panelId]?.messages ?? []
}

window.__cateE2E = {
  dispatchAgentEvent,
  agentMessages,
}
```

This already feeds mocked Pi events through the real renderer store. Planner should not add a separate simulator.

## Shared Patterns

### Diagnostics Envelope

**Source:** `src/agent/extensions/cate-flashquery/diagnostics.ts` lines 23-67
**Apply to:** FlashQuery-rich ToolCard normalization

```ts
export interface FlashQueryToolDetails {
  flashquery: true
  toolId: string
  toolName: string
  workspaceId?: string
  generation?: number
  result?: unknown
  diagnostics?: unknown
  traceId?: string
  refs?: FlashQueryRefDiagnostic[]
  macroProgress?: unknown
  disconnected?: boolean
  stale?: boolean
  error?: string
}

return {
  content,
  details: {
    flashquery: true,
    toolId: context.candidate.toolId,
    toolName: context.candidate.name,
    workspaceId: context.handoff.workspaceId,
    generation: context.generationId,
    result: context.result,
    ...(diagnostics !== undefined ? { diagnostics } : {}),
    ...(context.traceId ? { traceId: context.traceId } : {}),
    ...(context.refs ? { refs: context.refs } : {}),
    ...(context.macroProgress !== undefined ? { macroProgress: context.macroProgress } : {}),
    ...(error ? { error } : {}),
  },
}
```

Renderer helpers must treat `msg.flashquery` as `Record<string, unknown>` and defensively search known fields under `diagnostics`, `result`, and top-level details.

### Live Event Preservation

**Source:** `src/agent/renderer/agentStore.ts` lines 81-100, 879-923
**Apply to:** `ChatThread.tsx` input assumptions and tests

```ts
export interface ToolMessage {
  type: 'tool'
  id: string
  toolCallId: string
  name: string
  args: unknown
  status: ToolStatus
  partialText?: string
  result?: string
  error?: string
  subagent?: SubagentDetails
  flashquery?: FlashQueryDetails
}

const flashquery = extractFlashQueryDetails(event.partialResult)
if (flashquery) patch.flashquery = flashquery

const flashquery = extractFlashQueryDetails(event.result)
useAgentStore.getState().updateToolCall(panelId, toolCallId, {
  status: isError ? 'error' : 'success',
  result,
  partialText: undefined,
  error: error ?? (isError ? 'Tool reported an error' : undefined),
  ...(flashquery ? { flashquery } : {}),
})
```

Do not change the message union for Phase 19. All rich rendering hangs off `ToolMessage.flashquery`.

### Session Replay Preservation

**Source:** `src/agent/main/sessionFiles.ts` lines 179-187, 302-318, 421-425
**Apply to:** replayed `ChatThread` rendering

```ts
export interface RendererToolMessage {
  type: 'tool'; id: string; toolCallId: string; name: string; args: unknown
  status: 'success' | 'error'; result?: string; error?: string
  subagent?: unknown
  flashquery?: unknown
}

const flashquery = normalizeFlashQuery(msg.details)
out[idx] = {
  ...tool,
  status: isError ? 'error' : 'success',
  result: isError ? undefined : text,
  error: isError ? text || 'Tool reported an error' : undefined,
  ...(flashquery ? { flashquery } : {}),
}

function normalizeFlashQuery(details: unknown): unknown {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined
  const d = details as Record<string, unknown>
  if (d.flashquery !== true) return undefined
  return sanitizeFlashQueryDetails(d)
}
```

Component tests should include hand-built replay-like completed messages, not only live event output.

### `call_model` Final-Only Observability

**Source:** `src/agent/extensions/cate-flashquery/model-tool.ts` lines 33-78 and product requirements lines 322-330, 357-359
**Apply to:** `call_model` card

```ts
const traceId = getOrCreateFlashQueryTraceId(generation.handoff.workspaceId, ctx)
const refs = await resolveFlashQueryRefs(generation.client, findFlashQueryRefs(args), { signal })
const unresolved = refs.find((ref) => !ref.resolved)
if (unresolved) {
  return errorFlashQueryToolResult({
    traceId,
    refs,
    message: `Reference {{ref:${unresolved.path}}} could not be resolved (document not found).`,
  })
}

const dispatchArgs = {
  ...args,
  return_messages: true,
  _meta: { ...existingMeta, trace_id: traceId },
}
const result = await generation.client.callTool(candidate.toolId, dispatchArgs, { signal })
return normalizeFlashQueryToolResult({ result, traceId, refs })
```

Requirement constraint: in-flight rendering uses Pi's standard indicator only. The collapsed product summary and expanded resolution/refs/server-loop/cost/template/messages details should appear from returned diagnostics, not invented live progress.

### `call_macro` Progress vs Final Trace

**Source:** `src/agent/extensions/cate-flashquery/macro-tool.ts` lines 35-62, 101-107 and product requirements lines 343-346, 360
**Apply to:** `call_macro` card

```ts
const dispatchArgs = {
  ...args,
  interactive: args.interactive ?? true,
  progress: args.progress ?? 'milestones',
}
const result = await generation.client.callTool(candidate.toolId, dispatchArgs, {
  signal,
  onprogress(progress) {
    onUpdate?.({
      content: [{ type: 'text' as const, text: progressMessage(progress) }],
      details: {
        flashquery: true,
        toolId: candidate.toolId,
        toolName: candidate.name,
        macroProgress: progress,
      },
    })
  },
})

function progressMessage(progress: unknown): string {
  if (progress && typeof progress === 'object') {
    const message = (progress as Record<string, unknown>).message
    if (typeof message === 'string' && message.trim().length > 0) return message
  }
  return 'Running macro...'
}
```

Running macro cards may show only the standard spinner/pulse plus latest real progress text already present as `partialText`. The structured trace table comes from the completed result/diagnostics only.

### Sanitization

**Source:** `src/agent/renderer/agentStore.ts` lines 710-747 and `src/agent/main/sessionFiles.ts` lines 428-455
**Apply to:** all renderer diagnostics display

```ts
function extractFlashQueryDetails(v: unknown): FlashQueryDetails | undefined {
  if (!v || typeof v !== 'object') return undefined
  const details = (v as Record<string, unknown>).details
  if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined
  const d = details as Record<string, unknown>
  if (d.flashquery !== true) return undefined
  return sanitizeFlashQueryDetails(d)
}

const FLASHQUERY_SECRET_KEYS = new Set([
  'authorization',
  'bearertoken',
  'headers',
  'requestinit',
  'handoff',
  'endpointurl',
])
```

Do not display raw unsanitized event objects from outside `msg.flashquery`.

## No Analog Found

None. Every planned file has a close local analog.

## Metadata

**Analog search scope:** `src/agent/renderer`, `src/agent/extensions/cate-flashquery`, `src/agent/main`, `src/renderer/lib`, `src/renderer/panels`, `e2e`
**Files scanned:** 12 targeted files plus phase/product context
**Pattern extraction date:** 2026-06-04
