# Phase 18: `call_model`, `call_macro`, and Diagnostics Data - Research

**Researched:** 2026-06-04
**Domain:** Cate bundled Pi extension, FlashQuery MCP tools, Pi renderer diagnostics
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Source Priority
- The downstream implementation agent MUST read the product requirements and test plan listed in `<canonical_refs>` before answering scope questions, editing code, or deciding acceptance coverage.
- The Milestone 2 requirements document is the product source of truth for Phase 18 behavior.
- The Milestone 2 test plan is the source of truth for targeted test IDs and coverage expectations.
- FlashQuery roadmap companion material is traceability only, not Cate implementation scope.

### `call_model`
- Fetch FlashQuery purpose/model metadata through zero-cost `call_model` resolver paths: `call_model` with `resolver: 'list_purposes'` and `call_model` with `resolver: 'list_models'`. Do not reintroduce direct MCP `list_purposes` or `list_models` tool calls.
- Embed formatted purpose/model lists in the `call_model` Pi tool description.
- If tool registration happens before discovery completes, register with placeholder text `Available purposes: loading...` and update registration after discovery.
- Every `call_model` invocation must pass `return_messages: true`.
- Mint a per-Pi-conversation `trace_id` on first FlashQuery tool invocation and thread it through `_meta` for later FlashQuery calls in that conversation.
- `trace_id` format is `cate-ws-<workspace-hash-8>-conv-<random-base32-16>`.
- If a `{{ref:path}}` document reference cannot be hydrated, show Pi system message `Reference {{ref:Path/to/Doc.md}} could not be resolved (document not found).` and do not send the user message to the model.
- Mid-stream errors must render as Pi system messages and preserve tool diagnostics.
- `call_model` in-flight UI must use Pi's standard tool-in-flight indicator only. Cate must not synthesize fake iteration counts, per-tool latencies, or live tool-loop progress before the response envelope returns.

### `call_macro`
- Host model invocation of `call_macro` is the only macro execution path for this milestone.
- `source_ref` invocations execute without pre-confirmation.
- Inline `source` invocations require a confirmation modal showing the macro source.
- Dispatch defaults to `interactive: true`.
- Dispatch defaults to `progress: 'milestones'`.
- The extension mints an MCP `progressToken`, subscribes to `notifications/progress`, filters progress notifications by token, and forwards only matching messages into Pi thinking/progress UI.
- Live macro progress renders a spinner plus the most-recent progress message only. Do not synthesize checkmarks, pending markers, completion counts, elapsed times, or per-statement latencies.
- Completed macro trace details come only from the result envelope's `MacroExecutionResult.trace` array and must be preserved for Phase 19 rendering.
- `needs_user_input` envelopes are surfaced as tool-result messages for the host model to relay; there is no pause/resume protocol in Milestone 2.
- If FlashQuery is unavailable, return tool result error `FlashQuery is not connected.`

### Diagnostics Data
- Preserve structured FlashQuery details from Pi tool execution start/update/end events without breaking standard text result extraction.
- Preserve existing subagent details behavior.
- Store enough `call_model` and `call_macro` detail for Phase 19 to render normal Pi `ToolCard` observability, but do not add new chat message types or standalone FlashQuery chat chrome in this phase.

### the agent's Discretion
- The exact helper/module split inside `src/agent/extensions/cate-flashquery/` is at the implementation agent's discretion, provided it follows Phase 17 patterns and keeps tests focused.
- The exact Pi progress forwarding mechanism should prefer tool `onUpdate`; if local API inspection proves `ctx.ui.setStatus` or `ctx.ui.setWidget` is the supported path, update tests and manual evidence notes to assert the chosen path.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Full `REQ-017` ToolCard collapsed summaries, expanded diagnostic sections, completed macro trace table rendering, long-payload collapse behavior, and graceful partial-diagnostics rendering are Phase 19.
- Pi `@` mention autocomplete and clipboard utilities are Phase 20.
- Cross-surface disconnected/reconnect/workspace-switch hardening is Phase 21.
- A Cate-level Run Macro button, user-facing model/purpose picker, FlashQuery as a Pi provider, and global Pi `auth.json` credential flows remain out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-015 | User can invoke `call_model` as a Pi tool with discovery-enriched descriptions, per-conversation trace metadata, `return_messages: true`, reference hydration, and preserved diagnostics. | Existing lifecycle already fetches model/purpose metadata but generic registration ignores it; Phase 18 should specialize `call_model` registration/execution in `src/agent/extensions/cate-flashquery/lifecycle.ts`. [VERIFIED: codebase grep] |
| REQ-016 | User can invoke `call_macro` as a Pi tool with source confirmation rules, interactive/progress defaults, filtered progress notifications, completed trace rendering, and disconnected errors. | Pi `execute(..., onUpdate, ctx)` supports `onUpdate`; `ctx.ui.confirm` supports inline confirmation; MCP SDK request options support `onprogress` for `notifications/progress`. [CITED: node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts] [CITED: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts] |
| REQ-017 foundation | Preserve FlashQuery diagnostics data for future ToolCard rendering. | `agentStore` currently preserves text and `subagent` details only; add a structured FlashQuery details field without changing chat message types. [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 18 should extend the Phase 17 `cate-flashquery` lifecycle rather than replacing it. Phase 17 already created a generation-scoped FlashQuery client lifecycle, registry filtering, TypeBox schema translation, current-workspace wrappers, model/purpose metadata refresh, and stale-tool rejection. [VERIFIED: `.planning/phases/17-flashquery-pi-extension-bootstrap/17-03-SUMMARY.md`] The missing Phase 18 behavior is special-case registration and execution for `call_model` and `call_macro`, plus renderer/store preservation of structured FlashQuery diagnostics. [VERIFIED: codebase grep]

The most important planning split is: extension behavior first, renderer data retention second, and final ToolCard presentation later. Full `call_model` collapsed summaries, expanded sections, and macro trace tables are Phase 19; Phase 18 should only store data and keep generic Pi ToolCards working. [VERIFIED: `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-CONTEXT.md`]

**Primary recommendation:** Implement Phase 18 as three slices: `call_model` specialization, `call_macro` specialization/progress, then `agentStore`/session transcript diagnostics preservation with targeted unit and mocked E2E evidence. [VERIFIED: product docs + codebase grep]

## Project Constraints (from AGENTS.md)

- Use the existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; do not add a separate backend or UI framework. [CITED: AGENTS.md]
- Preserve process boundaries: main owns Electron/Node APIs, preload exposes `window.electronAPI`, renderer must not import Electron or Node directly. [CITED: AGENTS.md]
- FlashQuery bearer tokens must not reach renderer state or Pi global `auth.json`; privileged work goes through main/preload IPC or the controlled Pi extension bridge. [CITED: AGENTS.md] [VERIFIED: `.planning/phases/17-flashquery-pi-extension-bootstrap/17-CONTEXT.md`]
- Use TypeScript strict mode, single quotes, no semicolons in normal TS/TSX, 2-space indentation, and co-located `.test.ts` / `.test.tsx` files. [CITED: AGENTS.md]
- Do not build a web UI; Cate remains Electron + Pi agent surfaces for this phase. [CITED: AGENTS.md]
- Available quality commands are `npm run typecheck`, `npm test`, and `npm run test:e2e`; broad milestone preflight is `npm run preflight`. [CITED: AGENTS.md] [VERIFIED: package.json]
- Do not make direct repo edits outside GSD workflow unless explicitly requested; this file is the requested research artifact. [CITED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FlashQuery tool registration and execution | Pi Extension / Agent Subprocess | FlashQuery MCP server | `src/agent/extensions/cate-flashquery/` owns MCP client lifecycle, schema translation, and tool wrappers. [VERIFIED: codebase grep] |
| `call_model` description enrichment | Pi Extension / Agent Subprocess | FlashQuery MCP server | Lifecycle already fetches `listModels()` and `listPurposes()` during rebind, and the Phase 17 gap fix makes those helpers call `call_model` with `resolver: 'list_models'` / `resolver: 'list_purposes'`. Registration must use that metadata without reverting to direct `list_models` or `list_purposes` MCP tools. [VERIFIED: codebase grep + Phase 17 gap fix] |
| Per-conversation trace IDs | Pi Extension / Agent Subprocess | Pi session manager | Pi context exposes `sessionManager.getSessionId()` and Cate workspace ID is in handoff; trace state should be session-local. [CITED: node_modules/@earendil-works/pi-coding-agent/dist/core/session-manager.d.ts] |
| Reference blocking system messages | Renderer Agent Store | Pi Extension | The extension can mark unresolved references in tool details; `agentStore` can append the required system message while preserving the tool result. [VERIFIED: codebase grep] |
| Macro inline-source confirmation | Pi Extension UI bridge | Renderer AgentPanelChrome | `ctx.ui.confirm` emits `extension_ui_request`; Cate already renders confirm requests and returns `AGENT_UI_RESPONSE`. [CITED: node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts] [VERIFIED: codebase grep] |
| Macro progress forwarding | Pi Extension / MCP client | Renderer Agent Store | MCP SDK `onprogress` attaches/request-routes progress notifications; Pi `onUpdate` streams partial tool results to `tool_execution_update`. [CITED: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts] [CITED: node_modules/@earendil-works/pi-agent-core/dist/types.d.ts] |
| Diagnostics preservation | Renderer Agent Store + session transcript loader | ChatThread | `agentStore` and `sessionFiles.ts` project Pi tool details into Cate messages; `ChatThread` can remain generic for Phase 18. [VERIFIED: codebase grep] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@earendil-works/pi-coding-agent` | installed `0.75.4`; npm latest `0.78.0` | Pi RPC client, extension API, `registerTool`, extension UI, session manager | Cate is already built around this dependency; Phase 18 must target the installed API, not latest. [VERIFIED: package.json] [VERIFIED: npm registry] |
| `@modelcontextprotocol/sdk` | installed/range `^1.29.0`; npm latest `1.29.0` | FlashQuery MCP HTTP client and progress request handling | Existing extension client already uses `Client` and `StreamableHTTPClientTransport`; `onprogress` is the standard request-scoped progress path. [VERIFIED: codebase grep] [VERIFIED: npm registry] |
| `typebox` | installed via Pi stack | Pi tool parameter schemas | Phase 17 schema translator already emits TypeBox schemas for `pi.registerTool`. [VERIFIED: codebase grep] |
| Vitest | `3.2.4` | Unit/component tests | Existing Phase 17 extension tests use Vitest and mocked Pi/MCP clients. [VERIFIED: local command] |
| Playwright | `1.60.0` | Electron E2E | Existing FlashQuery E2E fixture and Pi extension E2E use Playwright. [VERIFIED: local command] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `crypto` Web/API or Node `crypto` | Node runtime | Hash workspace ID and generate base32 trace suffix | Use in extension-local pure helpers for required `trace_id` format. [ASSUMED] |
| FlashQuery MCP docs/source | local FlashQuery repo | Tool envelope contracts for `call_model`, `call_macro`, and macro progress | Use as canonical implementation detail source because Cate delegates execution to FlashQuery. [CITED: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/docs/FlashQuery MCP Tool Guide.md`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MCP SDK `onprogress` | Global `setNotificationHandler(ProgressNotificationSchema, ...)` | `onprogress` is request-scoped and auto-routes matching tokens; a global handler would need more custom token bookkeeping. [CITED: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts] |
| Store diagnostics in new chat messages | Store diagnostics on existing `ToolMessage` | New chat message types are explicitly out of scope; existing tool messages preserve normal ToolCard flow. [VERIFIED: 18-CONTEXT.md] |

**Installation:** No new packages should be installed for Phase 18. [VERIFIED: package.json + Phase 18 scope]

## Architecture Patterns

### System Architecture Diagram

```text
Pi host model
  -> registered FlashQuery Pi tool (`call_model` / `call_macro`)
  -> cate-flashquery generation wrapper
     -> current FlashQuery MCP client
        -> FlashQuery MCP server
           -> model/purpose resolver OR macro runtime
        <- result envelope + diagnostics / progress notifications
     -> Pi tool result with text + `details.flashquery`
  -> AgentManager forwards Pi events
  -> agentStore extracts text + preserves FlashQuery details
  -> ChatThread generic ToolCard now; Phase 19 rich rendering later
```

### Recommended Project Structure

```text
src/agent/extensions/cate-flashquery/
├── lifecycle.ts              # register special tool wrappers and generation state
├── client.ts                 # widen callTool options for progress; optional get_document helper
├── model-tool.ts             # call_model description, trace, refs, result details
├── macro-tool.ts             # call_macro confirmation/defaults/progress/details
├── diagnostics.ts            # shared detail/envelope normalization
└── *.test.ts                 # T-U-016/T-U-017 focused tests

src/agent/renderer/
├── agentStore.ts             # T-U-018 live event preservation
└── agentStore.test.ts        # add/extend if absent

src/agent/main/
└── sessionFiles.ts           # preserve FlashQuery details when loading transcripts

e2e/
├── fixtures/flashquery-server.ts
└── flashquery-pi-diagnostics.spec.ts
```

### Pattern 1: Specialize Only Eligible FlashQuery Tools

**What:** Keep generic wrappers for ordinary tools, but branch on `candidate.name === 'call_model'` and `candidate.name === 'call_macro'` during `publishTools()`. [VERIFIED: codebase grep]

**When to use:** Use for Phase 18 because generic execution cannot add `return_messages`, trace IDs, inline confirmation, macro progress, or diagnostics normalization. [VERIFIED: product docs]

**Example:**

```typescript
// Source: existing lifecycle.ts pattern + Pi ToolDefinition execute signature.
pi.registerTool({
  name: candidate.name,
  label: candidate.label,
  description: buildDescription(candidate, generation),
  parameters: flashQuerySchemaToTypeBox(candidate.inputSchema),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    if (candidate.name === 'call_model') {
      return executeCallModelTool(generation, candidate, params, signal, ctx)
    }
    if (candidate.name === 'call_macro') {
      return executeCallMacroTool(generation, candidate, params, signal, onUpdate, ctx)
    }
    return executeFlashQueryTool(generation, registeredTools, candidate.name, params, signal)
  },
})
```

### Pattern 2: Request-Scoped Macro Progress

**What:** Widen `FlashQueryExtensionClient.callTool()` to accept request options including `onprogress`; pass progress updates to Pi `onUpdate` with only the newest message text and structured progress details. [CITED: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts]

**When to use:** Use for `call_macro` only; `call_model` does not emit progress in this milestone. [VERIFIED: Milestone 2 Requirements.md]

**Example:**

```typescript
// Source: MCP SDK RequestOptions.onprogress + Pi AgentToolUpdateCallback.
await generation.client.callTool('call_macro', args, {
  signal,
  onprogress(progress) {
    onUpdate?.({
      content: [{ type: 'text', text: progress.message ?? 'Running macro...' }],
      details: { flashquery: true, toolName: 'call_macro', macroProgress: progress },
    })
  },
})
```

### Pattern 3: Preserve Details Without Rendering Them Yet

**What:** Add `flashquery?: FlashQueryToolDetails` to `ToolMessage`, plus `extractFlashQueryDetails(event.partialResult/result)` similar to `extractSubagentDetails()`. [VERIFIED: codebase grep]

**When to use:** Use on `tool_execution_update` and `tool_execution_end`; do not alter Phase 19 rendering in Phase 18. [VERIFIED: 18-CONTEXT.md]

**Example:**

```typescript
// Source: existing agentStore subagent preservation pattern.
const flashquery = extractFlashQueryDetails(event.result)
useAgentStore.getState().updateToolCall(panelId, toolCallId, {
  status: isError ? 'error' : 'success',
  result,
  ...(flashquery ? { flashquery } : {}),
})
```

### Anti-Patterns to Avoid

- **Synthetic `call_model` progress:** Do not invent iteration counts, tool-call rows, or elapsed times while `call_model` is running. [VERIFIED: Milestone 2 Requirements.md]
- **Macro progress tables before completion:** Live macro UI may show spinner plus latest message only; per-step trace rows come from final `MacroExecutionResult.trace`. [VERIFIED: Milestone 2 Requirements.md] [CITED: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/src/mcp/utils/response-formats.ts`]
- **New FlashQuery chat chrome:** Keep existing message types and ToolCards; Phase 19 owns rich rendering. [VERIFIED: 18-CONTEXT.md]
- **Using provider APIs for tools:** FlashQuery must not register as a Pi provider and stale-tool behavior must not use provider unregister hacks. [VERIFIED: 17-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP progress routing | Custom global notification multiplexer first | MCP SDK `RequestOptions.onprogress` | SDK attaches `_meta.progressToken` and routes matching progress notifications by request. [CITED: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts] |
| Inline macro confirmation UI | New renderer modal framework | Existing `ctx.ui.confirm` -> `extension_ui_request` -> `ExtensionDialog` | Cate already handles extension confirm dialogs in panel chrome. [VERIFIED: codebase grep] |
| Tool schema conversion | New JSON-schema validator | Existing `flashQuerySchemaToTypeBox()` | Phase 17 already normalized FlashQuery schemas to Pi-compatible TypeBox. [VERIFIED: codebase grep] |
| Final diagnostics rendering | New Phase 18 UI | Existing ToolMessage storage; Phase 19 ToolCard work | Prevents crossing deferred scope. [VERIFIED: 18-CONTEXT.md] |
| Reference hydration engine | Full custom document parser | Minimal `{{ref:path}}` scan plus FlashQuery `get_document` existence check, then let FlashQuery perform final hydration | FlashQuery already hydrates execution messages and returns diagnostics; Cate only needs pre-blocking for exact system message behavior. [CITED: FlashQuery MCP Tool Guide.md] |

**Key insight:** Phase 18 is primarily a tool-wrapper and data-shape phase, not a renderer redesign. [VERIFIED: 18-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Confusing Phase 18 With Phase 19

**What goes wrong:** Implementation adds full `call_model` summaries, expanded sections, or macro trace tables in `ChatThread`. [VERIFIED: 18-CONTEXT.md]
**Why it happens:** REQ-017 is mentioned as foundation, but full rendering is deferred. [VERIFIED: 18-CONTEXT.md]
**How to avoid:** Store `flashquery` details in `ToolMessage`; keep generic ToolCard behavior except data preservation and exact system/error cases. [VERIFIED: codebase grep]
**Warning signs:** New standalone FlashQuery message rows or large UI diffs in `ChatThread.tsx`. [ASSUMED]

### Pitfall 2: Dropping Diagnostics During Text Extraction

**What goes wrong:** `agentStore` extracts `content[].text` but discards `result.details`, so Phase 19 has nothing to render. [VERIFIED: codebase grep]
**Why it happens:** Current store preserves only `subagent` details. [VERIFIED: codebase grep]
**How to avoid:** Add a generic FlashQuery detail extractor for partial and final results, and mirror it in `sessionFiles.ts`. [VERIFIED: codebase grep]
**Warning signs:** T-U-018 passes text assertions but `ToolMessage.flashquery` is undefined after `tool_execution_end`. [ASSUMED]

### Pitfall 3: Returning Macro `needs_user_input` as a Hard Error

**What goes wrong:** The host model receives an unrecoverable error instead of a tool-result message it can relay to the user. [VERIFIED: Milestone 2 Requirements.md]
**Why it happens:** FlashQuery expected-error envelopes can be returned with `isError: false`; generic normalization may over-classify JSON reason fields. [CITED: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/src/mcp/utils/response-formats.ts`]
**How to avoid:** Preserve envelope details and content; only set `isError` when FlashQuery/MCP result sets `isError` or transport fails. [CITED: FlashQuery MCP Tool Guide.md]
**Warning signs:** Tests see `needs_user_input` in `error` instead of result/details. [ASSUMED]

### Pitfall 4: Treating Local Node 24 As Representative

**What goes wrong:** Tests pass locally on Node 24 but fail under the project-supported Node 20/22 range. [VERIFIED: local command] [CITED: AGENTS.md]
**Why it happens:** Current shell reports `node v24.7.0`; package constraints target Node 20 or 22. [VERIFIED: local command] [CITED: AGENTS.md]
**How to avoid:** Planner should include a Node-version checkpoint or run final evidence under Node 20/22. [ASSUMED]
**Warning signs:** Native/Electron/Playwright startup differences or engine warnings. [ASSUMED]

## Code Examples

### Widen FlashQuery Extension Client Progress Options

```typescript
// Source: existing client.ts + MCP SDK RequestOptions.onprogress.
export interface FlashQueryToolCallOptions {
  signal?: AbortSignal
  onprogress?: (progress: { progress: number; total?: number; message?: string }) => void
}

async callTool(name, params, options) {
  return client.callTool(
    { name, arguments: params },
    undefined,
    { signal: options?.signal, onprogress: options?.onprogress },
  )
}
```

### Trace ID Helper Shape

```typescript
// Source: Phase 18 required format. Hash/random implementation choice is local.
const traceId = `cate-ws-${workspaceHash8}-conv-${randomBase32_16}`
```

### Macro Defaults Before Dispatch

```typescript
// Source: Milestone 2 Requirements REQ-016.
const args = {
  ...params,
  interactive: params.interactive ?? true,
  progress: params.progress ?? 'milestones',
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Register FlashQuery tools as generic wrappers only | Specialize `call_model` and `call_macro` wrappers while generic tools remain generic | Phase 18 | Enables required trace, defaults, progress, and diagnostics behavior. [VERIFIED: 18-CONTEXT.md] |
| Manual global progress subscription | MCP SDK request `onprogress` callback | MCP SDK 1.29 installed | Request-scoped progress is available without custom notification fan-out. [CITED: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts] |
| `agentStore` preserves only subagent structured details | Preserve FlashQuery structured details too | Phase 18 planned | Phase 19 can render diagnostics without replaying raw Pi events. [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- `@modelcontextprotocol/server` is not a valid package for this project; AGENTS says use `@modelcontextprotocol/sdk`. [CITED: AGENTS.md]
- FlashQuery as a Pi provider is out of scope and forbidden for this milestone. [VERIFIED: 18-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Node `crypto` or Web Crypto is acceptable in the extension subprocess for trace ID hashing/randomness. | Standard Stack | Planner may need a pure JS fallback or import adjustment. |
| A2 | Warning signs listed in pitfalls are inferred from code shape, not verified failures. | Common Pitfalls | Low implementation risk; tests will validate. |

## Open Questions

1. **Exact system-message injection path for unresolved refs**
   - What we know: Cate renderer has `appendSystem`; Pi extension has no direct Cate panel ID, but tool details arrive at `agentStore`. [VERIFIED: codebase grep]
   - What's unclear: Whether product requires a persisted Pi custom message or just a visible Cate system row. [ASSUMED]
   - Recommendation: Add `details.flashquery.unresolvedReferenceMessage` on the tool result and have `agentStore` append the exact system message once while marking the tool error; unit-test the visible store output. [ASSUMED]

2. **Caller-chosen vs SDK-chosen progress token**
   - What we know: MCP SDK `onprogress` sets `_meta.progressToken` to the request message ID and routes matching notifications. [CITED: node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts]
   - What's unclear: Product wording says the extension “mints” a token; if tests require a Cate-shaped token string, `client.callTool()` may need lower-level request handling. [VERIFIED: Milestone 2 Requirements.md]
   - Recommendation: Plan with SDK `onprogress` first and explicitly test that progress is request-scoped and filtered; escalate only if manual integration rejects SDK numeric tokens. [ASSUMED]

3. **Manual evidence availability**
   - What we know: No provider API env var was detected in this shell. [VERIFIED: local command]
   - What's unclear: Whether the user has configured Pi provider credentials in Pi auth storage or a live FlashQuery instance outside env. [ASSUMED]
   - Recommendation: Planner should include T-M-002/T-M-003 evidence tasks with blocker recording if credentials/live FlashQuery are unavailable. [VERIFIED: Milestone 2 Test Plan.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build/tests/Pi subprocess | ⚠ | `v24.7.0` | Use Node 20 or 22 for final evidence. [VERIFIED: local command] |
| npm | Scripts/package manager | ✓ | `11.5.1` | Use npm because lockfile is `package-lock.json`. [VERIFIED: local command] |
| Vitest | T-U-016/T-U-017/T-U-018 | ✓ | `3.2.4` | None needed. [VERIFIED: local command] |
| Playwright | T-E-006 | ✓ | `1.60.0` | Mocked store/unit evidence if Electron E2E cannot inspect Pi internals. [VERIFIED: local command] |
| Native Pi provider credentials | T-M-003 | ✗ env not detected | — | Record manual blocker or rely on existing Pi auth if present. [VERIFIED: local command] |
| Live FlashQuery with macro/model config | T-M-002/T-M-003 | Unknown | — | Use fixture/unit tests; record manual blocker if unavailable. [ASSUMED] |

**Missing dependencies with no fallback:**
- None for automated research/planning. [VERIFIED: local command]

**Missing dependencies with fallback:**
- Native provider/live FlashQuery for manual checks; substitute automated evidence and blocker notes are acceptable per Phase 17 precedent. [VERIFIED: 17-03-SUMMARY.md]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest `3.2.4`; Playwright `1.60.0` [VERIFIED: local command] |
| Config file | `vitest.config.ts`, `playwright.config.ts` [VERIFIED: codebase grep] |
| Quick run command | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts src/agent/extensions/cate-flashquery/index.test.ts` [VERIFIED: package.json] |
| Full suite command | `npm run typecheck && npm test && npm run test:e2e` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-015 | `call_model` description discovery, `return_messages`, trace ID, unresolved refs, diagnostics | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | ✅ extend |
| REQ-016 | `call_macro` confirmation/defaults/progress/needs_user_input/trace/disconnect | unit | `npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts` | ✅ extend or split |
| REQ-017 foundation | Preserve FlashQuery structured details in store and session replay | unit | `npm test -- src/agent/renderer/agentStore.test.ts src/agent/main/sessionFiles.test.ts` | ❌ Wave 0 likely |
| REQ-015/016/017 | Mocked Pi diagnostic event evidence | e2e | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** focused Vitest file for changed area. [ASSUMED]
- **Per wave merge:** `npm run typecheck` plus focused extension/store tests. [ASSUMED]
- **Phase gate:** `npm run typecheck && npm test && npm run test:e2e`, ideally under Node 20/22. [CITED: AGENTS.md]

### Wave 0 Gaps

- [ ] `src/agent/renderer/agentStore.test.ts` - covers T-U-018 if no existing store test is available. [VERIFIED: codebase grep]
- [ ] `src/agent/main/sessionFiles.test.ts` - covers transcript replay preservation if not already present. [VERIFIED: codebase grep]
- [ ] `e2e/flashquery-pi-diagnostics.spec.ts` - covers T-E-006 mocked diagnostic events without full Phase 19 rendering. [VERIFIED: Milestone 2 Test Plan.md]
- [ ] Extend `e2e/fixtures/flashquery-server.ts` with deterministic `call_model`, `call_macro`, and macro progress fixture hooks if planner chooses E2E through real agent startup. [VERIFIED: codebase grep]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Keep FlashQuery bearer tokens in main-owned handoff and out of renderer/global Pi auth. [CITED: AGENTS.md] |
| V3 Session Management | yes | Trace IDs are correlation metadata, not auth/session secrets; store them per Pi conversation. [ASSUMED] |
| V4 Access Control | yes | Register FlashQuery tools unless they are explicitly ineligible (`deprecated`, `unavailable`, `removed`, or `hostEligible: false`); stale wrappers reject after workspace rebind. [VERIFIED: Phase 17 gap fix to `registry.ts`] |
| V5 Input Validation | yes | Existing schema translator validates Pi tool params with TypeBox; macro/source params need confirmation/default validation. [VERIFIED: codebase grep] |
| V6 Cryptography | limited | Use standard crypto randomness/hash for trace IDs; do not treat trace IDs as secrets. [ASSUMED] |

### Known Threat Patterns for Cate/Pi/FlashQuery

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token leakage into renderer/session transcript | Information Disclosure | Keep bearer token only in main-process credential store and workspace Pi handoff; never include it in tool details. [CITED: AGENTS.md] |
| Running inline macro without user confirmation | Elevation of Privilege | Require `ctx.ui.confirm` for `source`; skip confirm only for `source_ref`. [VERIFIED: Milestone 2 Requirements.md] |
| Stale workspace tool execution | Tampering | Preserve Phase 17 generation-scoped wrappers and stale rejection. [VERIFIED: 17-03-SUMMARY.md] |
| Fabricated progress misleading user | Spoofing | Show only actual MCP progress messages for macro and no live `call_model` progress. [VERIFIED: Milestone 2 Requirements.md] |

## Suggested Plan Slices

1. **Model tool specialization:** description enrichment, metadata loading placeholder/update, trace helper, `return_messages`, reference preflight/blocking, diagnostics normalization, T-U-016. [VERIFIED: product docs + codebase grep]
2. **Macro tool specialization:** inline confirmation via `ctx.ui.confirm`, `source_ref` no-confirm, defaults, request-scoped progress, latest-message partial updates, final trace/needs-user-input/disconnect handling, T-U-017. [VERIFIED: product docs + codebase grep]
3. **Diagnostics preservation:** `ToolMessage.flashquery`, `agentStore` update/end extraction, session replay preservation, exact system-message path, T-U-018. [VERIFIED: codebase grep]
4. **Evidence and manual notes:** mocked T-E-006 event feed or fixture extension, plus T-M-002/T-M-003 blocker/evidence doc if no live provider/FlashQuery is available. [VERIFIED: Milestone 2 Test Plan.md]

## Sources

### Primary (HIGH confidence)

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - REQ-015, REQ-016, REQ-017 foundation, progress constraints.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - T-U-016, T-U-017, T-U-018, T-E-006, T-M-002, T-M-003.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-CONTEXT.md` - locked decisions and deferred scope.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-03-SUMMARY.md` - Phase 17 lifecycle/stale-wrapper handoff.
- `src/agent/extensions/cate-flashquery/lifecycle.ts`, `client.ts`, `registry.ts`, `schema.ts` - current extension implementation.
- `src/agent/renderer/agentStore.ts`, `ChatThread.tsx`, `AgentPanelChrome.tsx` - current renderer event/data/UI behavior.
- `node_modules/@earendil-works/pi-coding-agent/dist/core/extensions/types.d.ts` - Pi extension API, tool execute signature, UI context.
- `node_modules/@modelcontextprotocol/sdk/dist/esm/shared/protocol.d.ts` - MCP request `onprogress`.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/docs/FlashQuery MCP Tool Guide.md` - `call_model` and `call_macro` contracts.

### Secondary (MEDIUM confidence)

- npm registry: `@earendil-works/pi-coding-agent` latest `0.78.0`; `@modelcontextprotocol/sdk` latest `1.29.0`.
- Local command probes: Node/npm/Vitest/Playwright availability.

### Tertiary (LOW confidence)

- Assumptions about exact renderer system-message path and crypto helper choice pending implementation proof.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing repo dependencies and local commands verified. [VERIFIED: package.json]
- Architecture: HIGH - current Phase 17 code and Pi typings directly inspected. [VERIFIED: codebase grep]
- Pitfalls: MEDIUM - major pitfalls are product/code verified; some warning signs are inferred. [ASSUMED]

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 for Cate codebase patterns; re-check npm/Pi SDK APIs before dependency upgrades. [ASSUMED]
