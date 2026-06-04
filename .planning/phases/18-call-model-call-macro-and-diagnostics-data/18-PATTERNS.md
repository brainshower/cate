# Phase 18: `call_model`, `call_macro`, and Diagnostics Data - Pattern Map

**Mapped:** 2026-06-04
**Files analyzed:** 16
**Analogs found:** 11 / 16

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/agent/extensions/cate-flashquery/lifecycle.ts` | service | request-response + event-driven | `src/agent/extensions/cate-flashquery/lifecycle.ts` | exact |
| `src/agent/extensions/cate-flashquery/client.ts` | service | request-response + streaming progress | `src/agent/extensions/cate-flashquery/client.ts` | exact |
| `src/agent/extensions/cate-flashquery/model-tool.ts` | service | request-response | `src/agent/extensions/cate-flashquery/lifecycle.ts` | role-match |
| `src/agent/extensions/cate-flashquery/macro-tool.ts` | service | request-response + streaming progress | `src/agent/extensions/cate-flashquery/lifecycle.ts`; Pi/MCP typings | role-match |
| `src/agent/extensions/cate-flashquery/diagnostics.ts` | utility | transform | `src/agent/extensions/cate-flashquery/lifecycle.ts`; `src/agent/renderer/agentStore.ts` | role-match |
| `src/agent/extensions/cate-flashquery/trace.ts` | utility | transform | `src/agent/extensions/cate-flashquery/lifecycle.ts` | partial |
| `src/agent/extensions/cate-flashquery/refs.ts` | utility | request-response | `src/agent/extensions/cate-flashquery/client.ts`; `e2e/fixtures/flashquery-server.ts` | role-match |
| `src/agent/extensions/cate-flashquery/registry.ts` | utility | transform | `src/agent/extensions/cate-flashquery/registry.ts` | exact |
| `src/agent/extensions/cate-flashquery/schema.ts` | utility | transform | `src/agent/extensions/cate-flashquery/schema.ts` | exact |
| `src/agent/extensions/cate-flashquery/lifecycle.test.ts` or split `model-tool.test.ts` / `macro-tool.test.ts` | test | request-response + event-driven | `src/agent/extensions/cate-flashquery/lifecycle.test.ts`; `index.test.ts` | exact |
| `src/agent/renderer/agentStore.ts` | store | event-driven | `src/agent/renderer/agentStore.ts` | exact |
| `src/agent/renderer/agentStore.test.ts` | test | event-driven | `src/agent/extensions/cate-flashquery/lifecycle.test.ts`; store handler patterns in `agentStore.ts` | role-match |
| `src/agent/main/sessionFiles.ts` | service | file-I/O + transform | `src/agent/main/sessionFiles.ts` | exact |
| `src/agent/main/sessionFiles.test.ts` | test | file-I/O + transform | `src/agent/main/sessionFiles.ts` | role-match |
| `e2e/fixtures/flashquery-server.ts` | test fixture | request-response + streaming progress | `e2e/fixtures/flashquery-server.ts` | exact |
| `e2e/flashquery-pi-diagnostics.spec.ts` | test | event-driven + request-response | `e2e/flashquery-pi-extension.spec.ts`; `e2e/flashquery-vault-search.spec.ts` | role-match |

## Pattern Assignments

### `src/agent/extensions/cate-flashquery/lifecycle.ts` (service, request-response + event-driven)

**Analog:** `src/agent/extensions/cate-flashquery/lifecycle.ts`

**Imports pattern** (lines 1-7):
```typescript
import type { AgentToolResult, ExtensionAPI } from '@earendil-works/pi-coding-agent'
import type { TSchema } from 'typebox'
import { openFlashQueryClient, readFlashQueryHandoff } from './client'
import { registryRecordsToToolCandidates } from './registry'
import { flashQuerySchemaToTypeBox } from './schema'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import type { FlashQueryToolCandidate } from './registry'
```

**Generation metadata/discovery pattern** (lines 84-107):
```typescript
const [records, models, purposes] = await Promise.all([
  client.listRegistryTools(signal),
  client.listModels(signal).catch(() => []),
  client.listPurposes(signal).catch(() => []),
])
if (generationId !== nextGenerationId) {
  await client.close().catch(() => {})
  return
}
```

Copy this pattern for `call_model` discovery. Register with loading text if `models`/`purposes` are not ready, then republish the tool after discovery using the existing `publishTools()` path.

**Tool registration/execute pattern** (lines 133-153):
```typescript
pi.registerTool<TSchema, FlashQueryToolDetails>({
  name: candidate.name,
  label: candidate.label,
  description: candidate.description,
  parameters: flashQuerySchemaToTypeBox(candidate.inputSchema),
  async execute(_toolCallId, params, signal) {
    return executeFlashQueryTool(generation, registeredTools, candidate.name, params, signal)
  },
})
```

For Phase 18, branch inside this registration on `candidate.name === 'call_model'` and `candidate.name === 'call_macro'`; keep generic tools on `executeFlashQueryTool()`.

**Stale/error result pattern** (lines 169-194, 201-218):
```typescript
if (!entry || entry.generationId !== generation.id || entry.candidate.name !== toolName) {
  return unavailableResult(entry?.candidate, toolName, generation)
}

return {
  isError: true,
  content: [{ type: 'text' as const, text: STALE_TOOL_MESSAGE }],
  details: {
    flashquery: true,
    toolId: candidate?.toolId ?? toolName,
    toolName,
    workspaceId: generation.handoff.workspaceId,
    generation: generation.id,
    stale: true,
    error: STALE_TOOL_MESSAGE,
  } satisfies FlashQueryToolDetails,
}
```

Use the same result shape for disconnected `call_macro`, unresolved refs, and mid-stream `call_model` failures, adding richer `details` fields rather than changing chat message types.

**Result normalization pattern** (lines 221-240):
```typescript
return {
  ...(resultObject.isError === true ? { isError: true } : {}),
  content,
  details: {
    flashquery: true,
    toolId: candidate.toolId,
    toolName: candidate.name,
    workspaceId: generation.handoff.workspaceId,
    generation: generation.id,
    result,
  } satisfies FlashQueryToolDetails,
}
```

Extend this in `diagnostics.ts` so `call_model` and `call_macro` preserve envelopes, trace arrays, unresolved references, progress snapshots, and raw FlashQuery result data.

### `src/agent/extensions/cate-flashquery/client.ts` (service, request-response + streaming progress)

**Analog:** `src/agent/extensions/cate-flashquery/client.ts`

**Handoff validation pattern** (lines 25-41):
```typescript
const parsed = JSON.parse(text) as Partial<FlashQueryHandoff>
if (parsed.version !== 1 || typeof parsed.workspaceId !== 'string') return null
if (parsed.endpointUrl !== null && typeof parsed.endpointUrl !== 'string') return null
if (parsed.authMode !== 'none' && parsed.authMode !== 'bearer') return null
```

**MCP client/open pattern** (lines 44-55):
```typescript
const client = new Client({ name: 'cate-flashquery', version: '1.0.0' })
const headers = handoff.authMode === 'bearer' && handoff.bearerToken
  ? new Headers({ Authorization: `Bearer ${handoff.bearerToken}` })
  : undefined
const transport = new StreamableHTTPClientTransport(new URL(buildMcpUrl(handoff.endpointUrl)), {
  ...(headers ? { requestInit: { headers } } : {}),
})
await client.connect(transport)
```

**Discovery/call pattern** (lines 78-85):
```typescript
async listModels(signal) {
  return metadataListFromResult(await client.callTool(
    { name: 'call_model', arguments: { resolver: 'list_models' } },
    undefined,
    { signal },
  ))
},
async listPurposes(signal) {
  return metadataListFromResult(await client.callTool(
    { name: 'call_model', arguments: { resolver: 'list_purposes' } },
    undefined,
    { signal },
  ))
},
async callTool(name, params, signal) {
  return client.callTool({ name, arguments: params }, undefined, { signal })
},
```

Widen `callTool()` to accept an options object, not just `signal`, so `call_macro` can pass `onprogress` while existing calls still pass `signal`.

Phase 17 gap-fix note: do not add direct `list_models` or `list_purposes` MCP calls. The current Cate client intentionally gets both lists through `call_model` resolver invocations.

**MCP progress API source** (`node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts` lines 61-68):
```typescript
export type RequestOptions = {
    /**
     * If set, requests progress notifications from the remote end (if supported). When progress notifications are received, this callback will be invoked.
     */
    onprogress?: ProgressCallback;
```

### `src/agent/extensions/cate-flashquery/model-tool.ts` (service, request-response)

**Analog:** `lifecycle.ts` generic wrapper plus client discovery.

Copy:
- `generation.models` / `generation.purposes` storage from `lifecycle.ts` lines 31-42 and 94-105.
- normalized result details from `lifecycle.ts` lines 221-240.
- stale/disconnected error text shape from `lifecycle.ts` lines 201-218.

Core implementation pattern:
```typescript
const args = {
  ...coercedParams,
  return_messages: true,
  _meta: {
    ...existingMeta,
    trace_id: traceStore.getOrCreateTraceId(generation.handoff.workspaceId, ctx),
  },
}
const result = await generation.client.callTool(candidate.toolId, args, { signal })
return normalizeCallModelResult(result, candidate, generation)
```

Planner note: use the required unresolved-ref message exactly: `Reference {{ref:Path/to/Doc.md}} could not be resolved (document not found).`

### `src/agent/extensions/cate-flashquery/macro-tool.ts` (service, request-response + streaming progress)

**Analogs:** `lifecycle.ts`, Pi tool typings, MCP progress typings.

**Pi execute signature** (`node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts` lines 328-354):
```typescript
export interface ToolDefinition<TParams extends TSchema = TSchema, TDetails = unknown, TState = any> {
    name: string;
    label: string;
    description: string;
    parameters: TParams;
    execute(toolCallId: string, params: Static<TParams>, signal: AbortSignal | undefined, onUpdate: AgentToolUpdateCallback<TDetails> | undefined, ctx: ExtensionContext): Promise<AgentToolResult<TDetails>>;
}
```

**Confirmation UI source** (`types.d.ts` lines 67-79):
```typescript
export interface ExtensionUIContext {
    select(title: string, options: string[], opts?: ExtensionUIDialogOptions): Promise<string | undefined>;
    confirm(title: string, message: string, opts?: ExtensionUIDialogOptions): Promise<boolean>;
    input(title: string, placeholder?: string, opts?: ExtensionUIDialogOptions): Promise<string | undefined>;
    notify(message: string, type?: "info" | "warning" | "error"): void;
    setStatus(key: string, text: string | undefined): void;
```

**Tool partial update callback source** (`node_modules/@earendil-works/pi-agent-core/dist/types.d.ts` lines 316-318):
```typescript
/** Callback used by tools to stream partial execution updates. */
export type AgentToolUpdateCallback<T = any> = (partialResult: AgentToolResult<T>) => void;
```

Core implementation pattern:
```typescript
if (typeof args.source === 'string' && !args.source_ref) {
  const confirmed = await ctx.ui.confirm('Run FlashQuery macro?', args.source, { signal })
  if (!confirmed) return macroCancelledResult(candidate, generation)
}

const dispatchArgs = {
  ...args,
  interactive: args.interactive ?? true,
  progress: args.progress ?? 'milestones',
}

const result = await generation.client.callTool(candidate.toolId, dispatchArgs, {
  signal,
  onprogress(progress) {
    const message = typeof progress.message === 'string' ? progress.message : 'Running macro...'
    onUpdate?.({
      content: [{ type: 'text', text: message }],
      details: { flashquery: true, toolName: 'call_macro', toolId: candidate.toolId, macroProgress: progress },
    })
  },
})
```

Do not synthesize checkmarks, elapsed time, completion counts, or per-step rows during `onprogress`; final trace comes only from the returned envelope.

### `src/agent/extensions/cate-flashquery/diagnostics.ts` (utility, transform)

**Analogs:** `lifecycle.ts` result normalization and `agentStore.ts` defensive extraction.

**Defensive content extraction pattern** (`agentStore.ts` lines 603-624):
```typescript
function extractContentText(v: unknown): string | undefined {
  if (v == null) return undefined
  if (typeof v === 'string') return v
  if (typeof v !== 'object') return undefined
  const obj = v as Record<string, unknown>
  const content = obj.content
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      const b = block as Record<string, unknown>
      const text = asString(b.text)
      if (text) parts.push(text)
    }
    if (parts.length > 0) return parts.join('')
  }
```

Use the same narrow/unknown-safe style for `FlashQueryToolDetails`; preserve raw result/envelope under `details.result` or a `details.flashquery`-specific normalized object.

### `src/agent/extensions/cate-flashquery/trace.ts` (utility, transform)

**Analog:** lifecycle generation and workspace metadata patterns.

Use `workspaceId` from `generation.handoff.workspaceId` (`lifecycle.ts` lines 31-42, 94-105) and attach the generated trace in `_meta` during tool execution. The helper should be pure and directly unit-tested.

Required format:
```typescript
`cate-ws-${workspaceHash8}-conv-${randomBase32_16}`
```

No exact existing analog exists for base32 trace IDs; copy module-private helper style from `registry.ts` lines 33-40 and keep it deterministic-testable by injecting random bytes in tests if needed.

### `src/agent/extensions/cate-flashquery/refs.ts` (utility, request-response)

**Analogs:** `client.ts` callTool shape and FlashQuery fixture `get_document`.

**Fixture `get_document` contract** (`e2e/fixtures/flashquery-server.ts` lines 205-228):
```typescript
server.registerTool(
  'get_document',
  {
    description: 'Read deterministic in-memory vault document body',
    inputSchema: z.object({
      identifiers: z.string(),
      include: z.array(z.string()).optional(),
    }),
  },
  async ({ identifiers, include }) => {
    const vaultPath = normalizeVaultPath(identifiers)
    recordGetArgs({ identifiers: vaultPath, include })
    const document = documents.get(vaultPath)
    if (!document || missingDocuments.has(vaultPath)) {
      return mcpText({ error: 'not_found', message: `No document found for ${identifiers}` })
    }
```

Use a minimal `{{ref:path}}` scanner and a `get_document` preflight. On not found, return a tool error/system-message detail and do not dispatch `call_model`.

### `src/agent/extensions/cate-flashquery/registry.ts` (utility, transform)

**Analog:** same file.

**Eligibility and distinct naming** (lines 43-75, 85-95):
```typescript
for (const record of records) {
  if (!isEligible(record)) continue

  const toolId = firstString(record.toolId, record.metadata?.toolId, record.id, record.name)
  if (!toolId) continue

  const displayName = firstString(record.name, record.metadata?.name, toolId) ?? toolId
  const baseName = normalizePiToolName(displayName)
  const piName = distinctName(baseName, used)
```

Do not re-tighten eligibility for `call_model`/`call_macro`; Phase 17 gap fixes made registry discovery include real FlashQuery tools by default unless they are explicitly ineligible (`deprecated`, `unavailable`, `removed`, or `hostEligible: false`). Keep that registry behavior intact while specializing the registered Pi tool wrappers.

### `src/agent/extensions/cate-flashquery/schema.ts` (utility, transform)

**Analog:** same file.

**TypeBox translation pattern** (lines 6-27):
```typescript
export function flashQuerySchemaToTypeBox(schema: unknown): TSchema {
  if (!isPlainObject(schema)) return permissiveObjectSchema()

  const type = schema.type
  if (type !== 'object') return permissiveObjectSchema()

  const properties = isPlainObject(schema.properties) ? schema.properties : {}
  const required = new Set(Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === 'string')
    : [])
```

Use unchanged unless `call_model`/`call_macro` need schema description decoration; do not add a parallel schema translator.

### Extension Tests (test, request-response + event-driven)

**Analogs:** `lifecycle.test.ts`, `index.test.ts`

**Lifecycle metadata and registration test pattern** (`lifecycle.test.ts` lines 8-31):
```typescript
it('T-U-015 connects on session start and fetches registry, model, and purpose metadata', async () => {
  const pi = mockPi()
  const client = mockClient('ws-a', [
    eligible({ name: 'call_model' }),
    eligible({ name: 'search_tools' }),
  ])
  const lifecycle = createCateFlashQueryLifecycle(pi.api, {
    readHandoff: async () => handoff('ws-a'),
    openClient: async () => client,
  })

  await lifecycle.rebind('/workspace-a')
```

**In-flight workspace rebind test pattern** (`lifecycle.test.ts` lines 62-90):
```typescript
const oldTool = pi.registerTool.mock.calls.at(-1)?.[0]
const oldResultPromise = oldTool.execute('call-1', { value: 'old' }, undefined, undefined, {})

await lifecycle.rebind('/workspace-b')
const newTool = pi.registerTool.mock.calls.at(-1)?.[0]
const newResult = await newTool.execute('call-2', { value: 'new' }, undefined, undefined, {})
oldCall.resolve({ content: [{ type: 'text', text: 'old result' }] })
const oldResult = await oldResultPromise
```

**Mock helpers** (`lifecycle.test.ts` lines 178-226; `index.test.ts` lines 119-160):
```typescript
function mockPi() {
  const registerTool = vi.fn()
  const unregisterProvider = vi.fn()
  const api = {
    on: vi.fn(),
    registerTool,
    unregisterProvider,
  } as unknown as ExtensionAPI
  return { api, registerTool, unregisterProvider }
}
```

Add T-U-016/T-U-017 tests using these mocks. Extend mock `execute()` calls to pass `onUpdate` and `ctx` for macro confirmation/progress.

### `src/agent/renderer/agentStore.ts` (store, event-driven)

**Analog:** same file.

**Tool message shape** (lines 81-96):
```typescript
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
  diff?: DiffInfo
  /** Structured details for tools that emit them (currently: subagent). */
  subagent?: SubagentDetails
}
```

Add `flashquery?: FlashQueryToolDetails` alongside `subagent`; keep all standard `result`, `partialText`, and `error` extraction behavior.

**Subagent detail extraction pattern** (lines 627-704):
```typescript
function extractSubagentDetails(v: unknown): SubagentDetails | undefined {
  if (!v || typeof v !== 'object') return undefined
  const root = v as Record<string, unknown>
  const details = root.details
  if (!details || typeof details !== 'object') return undefined
  const d = details as Record<string, unknown>
```

Copy this defensive shape for `extractFlashQueryDetails()`, but do not require `toolMsg.name === 'call_model'`; any tool result with `details.flashquery === true` should preserve the detail.

**Live update/end patch pattern** (lines 836-876):
```typescript
const partial = extractContentText(event.partialResult)
if (partial !== undefined) patch.partialText = partial
if (toolMsg?.name === 'subagent') {
  const sub = extractSubagentDetails(event.partialResult)
  if (sub) patch.subagent = sub
}
...
const sub = toolMsg?.name === 'subagent' ? extractSubagentDetails(event.result) : undefined
useAgentStore.getState().updateToolCall(panelId, toolCallId, {
  status: isError ? 'error' : 'success',
  result,
  partialText: undefined,
  error: error ?? (isError ? 'Tool reported an error' : undefined),
  ...(diff ? { diff } : {}),
  ...(sub ? { subagent: sub } : {}),
})
```

Mirror this for `flashquery` on start/update/end. If unresolved refs carry a system-message detail, append one `system` message with `kind: 'error'` while leaving the tool message intact.

### `src/agent/main/sessionFiles.ts` (service, file-I/O + transform)

**Analog:** same file.

**Renderer tool message shape** (lines 179-185):
```typescript
export interface RendererToolMessage {
  type: 'tool'; id: string; toolCallId: string; name: string; args: unknown
  status: 'success' | 'error'; result?: string; error?: string
  /** Structured subagent payload preserved from pi's `details` field. Shape
   *  mirrors `SubagentDetails` in the renderer store; serialized as-is. */
  subagent?: unknown
}
```

Add `flashquery?: unknown` here so replayed transcripts match live `agentStore` messages.

**ToolResult replay pattern** (lines 300-314):
```typescript
if (role === 'toolResult') {
  const toolCallId = typeof msg.toolCallId === 'string' ? msg.toolCallId : ''
  const idx = toolCallId ? toolIndex.get(toolCallId) : undefined
  if (idx == null) continue
  const tool = out[idx] as RendererToolMessage
  const isError = msg.isError === true
  const text = extractText(msg.content) ?? ''
  const subagent = tool.name === 'subagent' ? normalizeSubagent(msg.details) : undefined
  out[idx] = {
    ...tool,
    status: isError ? 'error' : 'success',
    result: isError ? undefined : text,
    error: isError ? text || 'Tool reported an error' : undefined,
    ...(subagent ? { subagent } : {}),
  }
```

Copy for `flashquery` with a small `normalizeFlashQuery(details)` that preserves serializable details when `details.flashquery === true`.

### `e2e/fixtures/flashquery-server.ts` (test fixture, request-response + streaming progress)

**Analog:** same file.

**Fixture tool registration pattern** (lines 181-190):
```typescript
for (const tool of registryTools) {
  server.registerTool(
    tool.name,
    {
      description: tool.description ?? `Fixture registry tool ${tool.name}`,
      inputSchema: z.record(z.string(), z.unknown()).optional(),
      _meta: tool.metadata,
    },
    async () => mcpText({ ok: true, tool: tool.name }),
  )
}
```

Extend `FlashQueryStubRegistryTool` with optional handler behavior for deterministic `call_model` and `call_macro`, or add first-class seed methods if the diagnostics E2E needs result envelopes/progress.

**MCP response helper** (lines 163-167):
```typescript
function mcpText(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
  }
}
```

Keep fixture responses JSON-in-text to match existing client parsing.

**Server state/control pattern** (lines 392-470):
```typescript
return {
  baseUrl: `http://127.0.0.1:${port}`,
  close: () => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error)
      else resolve()
    })
  }),
  counts: () => ({ infoRequestCount, mcpPostCount }),
  resetCounts: () => {
    infoRequestCount = 0
    mcpPostCount = 0
    mcpMethods.length = 0
  },
```

Use the same mutable closure state for recorded `call_model` args, macro progress events, final trace envelope, and disconnected behavior.

### `e2e/flashquery-pi-diagnostics.spec.ts` (test, event-driven + request-response)

**Analogs:** `e2e/flashquery-pi-extension.spec.ts`, `e2e/flashquery-vault-search.spec.ts`

**Launch/configure pattern** (`flashquery-pi-extension.spec.ts` lines 20-61):
```typescript
const server = await startFlashQueryStubServer({ expectedBearerToken: 'pi-extension-token' })
const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), 'cate-e2e-pi-extension-'))
let app: ElectronApplication | null = null
try {
  server.seedRegistryTools([...])

  const launched = await launchApp()
  app = launched.electronApp
  const page = launched.mainWindow
  const workspaceId = await configure(page, server.baseUrl, workspaceRoot)

  const createResult = await page.evaluate(async ({ panelId, workspaceId, cwd }) => {
    return window.electronAPI.agentCreate({ panelId, workspaceId, cwd })
  }, { panelId: 'e2e-flashquery-agent', workspaceId, cwd: workspaceRoot })
  expect(createResult.ok).toBe(true)
```

**Deterministic UI/fixture assertion pattern** (`flashquery-vault-search.spec.ts` lines 53-63, 107-120):
```typescript
await expect(page.getByText('Vault Search').first()).toBeVisible()
await expect(page.getByPlaceholder('Search the vault...')).toBeVisible()
...
server.setAvailable(false)
await page.evaluate(() => window.__cateE2E!.retryFlashQuery())
await expect(page.getByTestId('vault-search-disconnected-icon')).toBeVisible()
```

Use `page.evaluate()` to inject mocked Pi tool events if real host-model invocation is nondeterministic; assert generic ToolCard/system-message behavior only, leaving rich Phase 19 rendering out of scope.

## Shared Patterns

### FlashQuery Detail Envelope
**Source:** `src/agent/extensions/cate-flashquery/lifecycle.ts` lines 17-29, 221-240  
**Apply to:** all FlashQuery tool wrappers, diagnostics extractor, renderer store, replay loader

```typescript
export interface FlashQueryToolDetails {
  flashquery: true
  toolId: string
  toolName: string
  workspaceId?: string
  generation?: number
  result?: unknown
  disconnected?: boolean
  stale?: boolean
  error?: string
}
```

Extend this interface for Phase 18 instead of introducing a separate chat message type.

### Tool Result Text Extraction
**Source:** `src/agent/renderer/agentStore.ts` lines 603-624; `src/agent/main/sessionFiles.ts` lines 332-340  
**Apply to:** `agentStore.ts`, `sessionFiles.ts`, diagnostics tests

Keep human-readable text extraction independent from structured details preservation.

### Progress Forwarding
**Source:** Pi `onUpdate` and MCP `RequestOptions.onprogress` typings  
**Apply to:** `macro-tool.ts`, `client.ts`, T-U-017

Use request-scoped MCP progress through `client.callTool(..., { onprogress })` and forward only the latest progress message via `onUpdate`. Do not use fabricated progress data.

### Confirmation
**Source:** `ExtensionUIContext.confirm()` in Pi typings lines 67-71  
**Apply to:** inline `call_macro` source only

Call `ctx.ui.confirm()` for inline `source`; do not confirm `source_ref`.

### Testing Style
**Source:** `src/agent/extensions/cate-flashquery/lifecycle.test.ts` lines 178-226; `index.test.ts` lines 119-160  
**Apply to:** all new extension unit tests

Use local mock factories, explicit T-U IDs in test names, `vi.fn()` dependencies, and direct `tool.execute()` calls.

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/agent/extensions/cate-flashquery/trace.ts` | utility | transform | No existing trace ID/base32 generator exists; use local pure helper style from `registry.ts`. |
| `src/agent/extensions/cate-flashquery/refs.ts` | utility | request-response | No existing `{{ref:path}}` scanner exists; use `client.callTool()` and fixture `get_document` patterns. |
| `src/agent/renderer/agentStore.test.ts` | test | event-driven | No current store test file found; use event handler behavior in `agentStore.ts` and mock style from extension tests. |
| `src/agent/main/sessionFiles.test.ts` | test | file-I/O + transform | No current session replay test file found; write temp session JSONL tests around `loadSessionTranscript()`. |
| `e2e/flashquery-pi-diagnostics.spec.ts` | test | event-driven | No diagnostics-specific E2E exists; copy launch/configure patterns from FlashQuery E2E specs. |

## Metadata

**Analog search scope:** `src/agent/extensions/cate-flashquery/`, `src/agent/renderer/`, `src/agent/main/`, `e2e/fixtures/`, `e2e/flashquery-*.spec.ts`, Pi and MCP installed type declarations  
**Files scanned:** 24 local files plus 3 installed type files  
**Pattern extraction date:** 2026-06-04
