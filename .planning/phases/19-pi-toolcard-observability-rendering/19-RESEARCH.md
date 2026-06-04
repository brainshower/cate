# Phase 19: Pi ToolCard Observability Rendering - Research

**Researched:** 2026-06-04
**Domain:** React renderer ToolCard rendering for preserved FlashQuery Pi diagnostics
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
## Implementation Decisions

### Source Priority
- D-01: Downstream research, planning, implementation, verification, and review agents MUST read the product requirements and test plan listed in `<canonical_refs>` before answering scope questions, editing code, deciding acceptance coverage, or evaluating completion.
- D-02: The Milestone 2 requirements document is the product source of truth for `REQ-017` behavior.
- D-03: The Milestone 2 test plan is the source of truth for targeted test IDs and coverage expectations.
- D-04: FlashQuery roadmap companion material is traceability only, not Cate implementation scope.

### ToolCard Scope
- D-05: FlashQuery tool calls must continue to render through Cate's normal Pi `ToolCard` system.
- D-06: Do not add a new chat message type.
- D-07: Do not add standalone FlashQuery chat chrome.
- D-08: Do not render FlashQuery server-side tool-loop diagnostics as free-standing chat-thread rows.
- D-09: Other FlashQuery tools, including FlashQuery-native and brokered MCP tools that are not `call_model` or `call_macro`, must continue to use standard ToolCard rendering.

### `call_model` Rendering
- D-10: When diagnostics data is available, the `call_model` collapsed summary format is `call_model · via <resolver> <name> · <iterations> iter · <FQ calls> FQ calls · <tokens> tok · $<cost> · <latency>s`.
- D-11: Missing or partial `call_model` diagnostics must degrade gracefully by omitting unavailable summary segments without breaking ToolCard layout.
- D-12: `call_model` expanded view must include resolution chain.
- D-13: `call_model` expanded view must include injected refs.
- D-14: `call_model` expanded view must include the FlashQuery server-side tool loop as an expanded-view sub-block with teal accent.
- D-15: `call_model` expanded view must include cost.
- D-16: `call_model` expanded view must include template params.
- D-17: `call_model` expanded view must include a collapsible messages payload.
- D-18: `call_model` in-flight rendering must show Pi's standard tool-in-flight indicator only. Do not fabricate iteration counters, fake per-iteration progress, live tool-loop rows, per-tool latencies, or synthesized elapsed times before the response envelope returns.

### `call_macro` Rendering
- D-19: `call_macro` expanded view must render completed `MacroExecutionResult.trace` arrays as structured step tables.
- D-20: Live macro progress behavior from Phase 18 remains spinner plus latest real progress message only; this phase must not synthesize pre-completion trace rows, checkmarks, completion counts, or elapsed times.
- D-21: Missing or malformed macro trace diagnostics must fall back to standard ToolCard behavior or an empty-state detail without layout breakage.

### Tests And Evidence
- D-22: `T-U-019` must cover `ChatThread`/ToolCard rendering for `call_model` collapsed summary, `call_model` expanded sections, `call_macro` trace table, standard rendering for other FlashQuery tools, missing/partial diagnostics, and no fabricated in-flight `call_model` progress.
- D-23: `T-E-006` must feed mocked Pi tool events with FlashQuery diagnostics and verify collapsed/expanded ToolCard UI, long payload collapse, error/system-message rendering, and no new message type.
- D-24: `T-M-003` remains manual or real-integration evidence for invoking `call_model` through the host model with document references, verifying purpose/model resolution, injected refs, messages payload, cost/tokens/latency, and server-side FQ tool-loop diagnostics.

### the agent's Discretion
- D-25: The exact helper/component split for ToolCard FlashQuery rendering is at the implementation agent's discretion, provided it follows existing `ChatThread`/ToolCard patterns and keeps `call_model`/`call_macro` special handling isolated.
- D-26: Exact visual tokens should follow current Cate Pi ToolCard styling; use the required teal accent for the FlashQuery server-side tool-loop sub-block without introducing a new visual system.

### Deferred Ideas (OUT OF SCOPE)
## Deferred Ideas

- Pi `@` mention autocomplete and clipboard utilities are Phase 20.
- Cross-surface disconnected/reconnect/workspace-switch hardening is Phase 21.
- A Cate-level Run Macro button, user-facing model/purpose picker, FlashQuery as a Pi provider, and global Pi `auth.json` credential flows remain out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-017 | User can inspect FlashQuery tool calls through Cate's normal Pi `ToolCard` system, with richer structured details for `call_model` and `call_macro`. | `ChatThread.tsx` already routes normal tool messages through `ToolCard`, while Phase 18 added optional `ToolMessage.flashquery` diagnostics without a new message type. [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 19 is a renderer presentation phase, not a FlashQuery extension, IPC, or store-schema phase. [VERIFIED: 19-CONTEXT.md] Phase 18 already produced the data input: ordinary `ToolMessage` objects can carry sanitized `flashquery` details from live Pi tool events and session replay. [VERIFIED: src/agent/renderer/agentStore.ts] [VERIFIED: src/agent/main/sessionFiles.ts] The planner should keep all implementation inside the existing Pi chat/ToolCard path and should not create new message types, standalone FlashQuery rows, or new chat chrome. [VERIFIED: Milestone 2 Requirements.md]

The closest local analog is the `subagent` rich-card branch in `MessageRow`: it keeps the message type as `tool`, branches by tool name/details, and renders richer expanded content without changing chat thread architecture. [VERIFIED: src/agent/renderer/ChatThread.tsx] Phase 19 should use the same pattern for `call_model` and `call_macro`, but leave other FlashQuery tools on the existing generic `ToolCard` implementation. [VERIFIED: 19-CONTEXT.md]

**Primary recommendation:** Add FlashQuery-specific summary/detail helpers in or near `src/agent/renderer/ChatThread.tsx`, branch only for `msg.flashquery && (msg.name === 'call_model' || msg.name === 'call_macro')`, and extend `T-U-019` plus mocked `T-E-006` to assert actual collapsed/expanded UI behavior. [VERIFIED: codebase grep]

## Project Constraints (from AGENTS.md)

- Use the existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; do not add a separate backend or UI framework. [CITED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged work must go through typed preload APIs and main-process validation. [CITED: AGENTS.md]
- FlashQuery data remains local-first; Cate stores connection metadata, preferences, and UI/session state only. [CITED: AGENTS.md]
- Do not build a web UI; FlashQuery/Cate work in this milestone remains Electron + CLI/MCP/Pi surfaces. [CITED: AGENTS.md]
- Use TypeScript strict mode, single quotes, no semicolons in normal TS/TSX, 2-space indentation, and co-located `.test.ts` / `.test.tsx` files. [CITED: AGENTS.md]
- Unit tests use `src/**/*.test.ts` / `src/**/*.test.tsx`; Playwright Electron E2E tests live in `e2e/*.spec.ts`. [CITED: AGENTS.md] [VERIFIED: vitest.config.ts] [VERIFIED: playwright.config.ts]
- Available quality commands are `npm run typecheck`, `npm test`, `npm run test:e2e`, and broader `npm run preflight`. [VERIFIED: package.json]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| FlashQuery ToolCard rendering | Renderer / Agent UI | Agent store | `ChatThread.tsx` owns message rendering and existing `ToolCard`; `agentStore` already supplies `ToolMessage.flashquery`. [VERIFIED: src/agent/renderer/ChatThread.tsx] [VERIFIED: src/agent/renderer/agentStore.ts] |
| Diagnostics data preservation | Agent store + session replay | Pi extension | Phase 18 already preserves sanitized `details.flashquery === true` on live update/end events and replayed session tool results. [VERIFIED: src/agent/renderer/agentStore.ts] [VERIFIED: src/agent/main/sessionFiles.ts] |
| `call_model` collapsed summary | Renderer helper | FlashQuery diagnostics envelope | Summary must be derived from available preserved diagnostics and omit unavailable fields. [VERIFIED: 19-CONTEXT.md] |
| `call_model` expanded diagnostics | Renderer helper/component | FlashQuery result details | Resolution chain, refs, server-side tool loop, cost, template params, and messages payload belong inside expanded ToolCard content only. [VERIFIED: Milestone 2 Requirements.md] [CITED: Cate-FlashQuery Milestone 2 UI Spec.md] |
| `call_macro` trace table | Renderer helper/component | FlashQuery final result envelope | Completed trace rows come only from `MacroExecutionResult.trace`; live progress must remain the generic running indicator plus real progress text. [VERIFIED: Milestone 2 Requirements.md] |
| Mocked UI evidence | Playwright E2E harness | Agent store event handler | `e2eHarness.dispatchAgentEvent()` calls the real `handleAgentEvent`, so E2E can inject mocked Pi tool events without a live provider. [VERIFIED: src/renderer/lib/e2eHarness.ts] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | installed range `^18.3.0` | Render `ChatThread`, `ToolCard`, and component tests | Cate renderer already uses React 18. [VERIFIED: package.json] |
| TypeScript | installed range `^5.6.0`; AGENTS reports 5.9.3 | Strict typed renderer helpers and test fixtures | Cate source and tests are TypeScript. [VERIFIED: package.json] [CITED: AGENTS.md] |
| `@phosphor-icons/react` | installed range `^2.1.10` | Tool icons and FlashQuery tool-loop glyphs | Existing `ChatThread.tsx` imports Phosphor icons for tool rows. [VERIFIED: package.json] [VERIFIED: src/agent/renderer/ChatThread.tsx] |
| `@testing-library/react` | installed range `^16.3.2`; npm latest `16.3.2` modified 2026-01-19 | T-U-019 component rendering assertions | Existing renderer component tests use Testing Library. [VERIFIED: package.json] [VERIFIED: npm registry] [VERIFIED: codebase grep] |
| Vitest | installed range `^3.2.4`; npm latest `4.1.8` modified 2026-06-01 | Unit/component test runner | Existing config and scripts use Vitest; use installed project version, not latest. [VERIFIED: package.json] [VERIFIED: npm registry] |
| Playwright | installed range `^1.60.0`; npm latest `1.60.0` modified 2026-06-04 | Electron E2E for mocked `T-E-006` UI assertions | Existing `e2e/flashquery-pi-diagnostics.spec.ts` uses Playwright. [VERIFIED: package.json] [VERIFIED: npm registry] [VERIFIED: e2e/flashquery-pi-diagnostics.spec.ts] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-markdown` + `remark-gfm` | installed ranges `^10.1.0` and `^4.0.1` | Existing markdown rendering in assistant messages | Do not route diagnostics through markdown unless reusing existing generic result rendering; specialized diagnostics should use typed JSX helpers. [VERIFIED: package.json] [VERIFIED: src/agent/renderer/ChatThread.tsx] |
| `@earendil-works/pi-coding-agent` | installed range `^0.75.4` | Source of Pi tool events/results | Phase 19 consumes events already normalized by `agentStore`; no new Pi package API work is needed. [VERIFIED: package.json] [VERIFIED: src/agent/renderer/agentStore.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline helpers inside `ChatThread.tsx` | New `FlashQueryToolCard.tsx` sibling component | New file improves isolation if the detail rendering grows, but inline helpers match the current single-file `ToolCard` / `SubagentCard` pattern. [VERIFIED: src/agent/renderer/ChatThread.tsx] |
| New message type for diagnostics | Existing `ToolMessage.flashquery` | New message types are explicitly forbidden; existing tool messages already preserve diagnostics. [VERIFIED: 19-CONTEXT.md] [VERIFIED: src/agent/renderer/agentStore.ts] |
| Standalone FlashQuery chat rows | Expanded sub-block inside ToolCard | The UI spec says earlier free-standing FlashQuery blocks were reorganized into the `call_model` ToolCard expanded view. [CITED: Cate-FlashQuery Milestone 2 UI Spec.md] |

**Installation:** No new packages should be installed for Phase 19. [VERIFIED: package.json + phase scope]

## Package Legitimacy Audit

> Phase 19 should not install external packages. [VERIFIED: package.json + 19-CONTEXT.md]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| none | n/a | n/a | n/a | n/a | n/a | No install required |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: no package recommendations]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: no package recommendations]

Note: `slopcheck` 0.6.1 is installed locally, but `slopcheck install --json` rejected `--json` when no packages were supplied; this does not affect Phase 19 because no packages are recommended. [VERIFIED: local command]

## Architecture Patterns

### System Architecture Diagram

```text
Pi tool event stream
  -> agentStore.handleAgentEvent()
     -> existing ToolMessage { type: "tool", name, args, status, result/error, flashquery? }
        -> ChatThread.MessageRow()
           -> subagent? SubagentCard
           -> plan_complete? PlanReadyCard
           -> call_model/call_macro with msg.flashquery? FlashQuery ToolCard detail path
           -> all other tools? existing generic ToolCard
              -> collapsed summary
              -> user expands
                 -> structured diagnostics sections inside the card only
```

### Recommended Project Structure

```text
src/agent/renderer/
├── ChatThread.tsx               # Add FlashQuery ToolCard branch/helpers or local component
├── ChatThread.test.tsx          # Add T-U-019 component coverage
└── agentStore.ts                # Read-only input; do not change message union unless a test exposes a real gap

e2e/
└── flashquery-pi-diagnostics.spec.ts  # Extend from preservation checks to UI assertions

src/renderer/lib/
└── e2eHarness.ts                # Existing dispatch/inspect hooks; only extend if DOM-oriented E2E setup needs it
```

### Pattern 1: Rich ToolCard Branch Without New Message Type

**What:** In `MessageRow`, add a branch before the generic `ToolCard` that selects a FlashQuery-rich ToolCard only when `msg.type === 'tool'`, `msg.flashquery` is present, and `msg.name` is `call_model` or `call_macro`. [VERIFIED: src/agent/renderer/ChatThread.tsx]

**When to use:** Use for Phase 19 because other FlashQuery tools must retain standard ToolCard rendering. [VERIFIED: 19-CONTEXT.md]

**Example:**

```tsx
// Source: current MessageRow branch pattern in ChatThread.tsx.
if (msg.type === 'tool' && msg.name === 'subagent') {
  return <SubagentCard msg={msg} shimmer={shimmer} />
}
if (msg.type === 'tool' && isRichFlashQueryTool(msg)) {
  return <FlashQueryToolCard msg={msg} shimmer={shimmer} />
}
return <ToolCard msg={msg} shimmer={shimmer} />
```

### Pattern 2: Defensive Diagnostics Normalization in Renderer

**What:** Treat `msg.flashquery` as unknown data and extract optional fields with narrow helper functions like `asString`, `asNumber`, and `asArray`. [VERIFIED: src/agent/renderer/agentStore.ts]

**When to use:** Use for all `call_model` and `call_macro` sections because Phase 18 stores `FlashQueryDetails = Record<string, unknown>`. [VERIFIED: src/agent/renderer/agentStore.ts]

**Example:**

```ts
// Source: current agentStore defensive narrowing style.
function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
```

### Pattern 3: Omit Missing Summary Segments

**What:** Build `call_model` collapsed summary from an array of present segments and join with ` · `; never interpolate raw optional values. [VERIFIED: 19-CONTEXT.md]

**When to use:** Use when diagnostics are partial, missing, or malformed. [VERIFIED: Milestone 2 Test Plan.md]

**Example:**

```ts
// Source: Phase 19 required summary and partial-diagnostics rule.
const parts = ['call_model']
if (resolver && name) parts.push(`via ${resolver} ${name}`)
if (iterations != null) parts.push(`${iterations} iter`)
if (fqCalls != null) parts.push(`${fqCalls} FQ calls`)
return parts.join(' · ')
```

### Pattern 4: Collapsible Payloads Stay Inside Expanded Content

**What:** Render long message/result payloads behind a nested disclosure inside the already expanded ToolCard. [VERIFIED: Milestone 2 Requirements.md] [CITED: Cate-FlashQuery Milestone 2 UI Spec.md]

**When to use:** Use for `call_model` returned messages payload, raw diagnostic/result objects, and long text arrays. [VERIFIED: 19-CONTEXT.md]

**Example:**

```tsx
// Source: current ThinkingBlock/ToolCard disclosure pattern in ChatThread.tsx.
const [messagesOpen, setMessagesOpen] = useState(false)
<button onClick={() => setMessagesOpen((value) => !value)}>Messages</button>
{messagesOpen && <pre>{prettyArgs(messages)}</pre>}
```

### Anti-Patterns to Avoid

- **Synthetic `call_model` progress:** Do not render iteration counts, server-tool-loop rows, elapsed time, or FQ-call counts while `msg.status` is `running` unless they came from actual data already present; Phase 18 intentionally did not call `onUpdate` for `call_model`. [VERIFIED: Milestone 2 Requirements.md] [VERIFIED: src/agent/extensions/cate-flashquery/model-tool.ts]
- **Free-standing server-side tool-loop rows:** The FlashQuery server-side loop belongs only in the expanded `call_model` ToolCard sub-block. [VERIFIED: Milestone 2 Test Plan.md] [CITED: Cate-FlashQuery Milestone 2 UI Spec.md]
- **Special chrome for all FlashQuery tools:** Only `call_model` and `call_macro` get richer rendering; `search`, `get_document`, brokered MCP tools, and other FlashQuery tools use the current generic `ToolCard`. [VERIFIED: 19-CONTEXT.md]
- **Assuming a single diagnostics key spelling:** Existing tests show `diagnostics`, `result`, and nested `trace`/`serverToolLoop` examples; renderer helpers should support known aliases defensively and omit unknowns. [VERIFIED: e2e/flashquery-pi-diagnostics.spec.ts] [VERIFIED: src/agent/extensions/cate-flashquery/diagnostics.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chat-thread data model | New `FlashQueryMessage` union member | Existing `ToolMessage.flashquery` | New message types are out of scope and Phase 18 already preserved diagnostics on tool messages. [VERIFIED: 19-CONTEXT.md] [VERIFIED: src/agent/renderer/agentStore.ts] |
| Separate FlashQuery chat surface | Dedicated FQ row/chrome renderer | Existing `ToolCard` branch in `ChatThread.tsx` | Product and UI specs require normal Pi ToolCard placement. [VERIFIED: Milestone 2 Requirements.md] [CITED: Cate-FlashQuery Milestone 2 UI Spec.md] |
| New test harness | Custom renderer event simulator | Existing `window.__cateE2E.dispatchAgentEvent()` | Existing harness dispatches mocked events through the real store handler. [VERIFIED: src/renderer/lib/e2eHarness.ts] |
| New formatting library | Package for tables/disclosure/JSON views | Local JSX helpers plus existing `prettyArgs`/`CodePreview` patterns | No new packages are needed for small diagnostic UI. [VERIFIED: src/agent/renderer/ChatThread.tsx] |
| Live macro trace synthesis | Synthetic step status model | Completed `MacroExecutionResult.trace` only | Product says live progress has only coarse progress messages; trace table comes from final result envelope. [VERIFIED: Milestone 2 Requirements.md] |

**Key insight:** The complexity is not rendering a table; it is preserving the boundary between actual FlashQuery diagnostics and fabricated observability. [VERIFIED: Milestone 2 Requirements.md]

## Common Pitfalls

### Pitfall 1: Rendering `undefined`, `NaN`, or Broken Currency in Collapsed Summary

**What goes wrong:** Partial diagnostics produce strings like `undefined iter`, `NaN tok`, or `$undefined`. [VERIFIED: 19-CONTEXT.md]
**Why it happens:** `ToolMessage.flashquery` is `Record<string, unknown>`, and Phase 18 intentionally stores opaque sanitized details. [VERIFIED: src/agent/renderer/agentStore.ts]
**How to avoid:** Use numeric/string guards and segment joining; omit missing parts. [VERIFIED: 19-CONTEXT.md]
**Warning signs:** Snapshot/text assertions contain `undefined`, `NaN`, `null`, or dangling separators. [ASSUMED]

### Pitfall 2: Accidentally Giving All FlashQuery Tools Rich Chrome

**What goes wrong:** `search`, `get_document`, brokered MCP tools, or stale/disconnected generic FlashQuery tools get FQ badges/accent blocks. [VERIFIED: 19-CONTEXT.md]
**Why it happens:** Branching on `msg.flashquery` alone catches every FlashQuery tool. [VERIFIED: src/agent/extensions/cate-flashquery/diagnostics.ts]
**How to avoid:** Branch on `msg.name === 'call_model' || msg.name === 'call_macro'`; fall back to generic `ToolCard` for all others. [VERIFIED: 19-CONTEXT.md]
**Warning signs:** T-U-019 finds FQ-specific text or badges in an ordinary FlashQuery `get_document` card. [ASSUMED]

### Pitfall 3: Free-Standing Server Tool Loop Rows

**What goes wrong:** FlashQuery server-side tool loop entries render as separate chat messages, making it look like Cate/Pi invoked those tools directly. [VERIFIED: Milestone 2 Test Plan.md]
**Why it happens:** The UI mockup history had free-standing FlashQuery blocks before the architecture changed. [CITED: Cate-FlashQuery Milestone 2 UI Spec.md]
**How to avoid:** Render server-side loop only inside the expanded `call_model` ToolCard. [CITED: Cate-FlashQuery Milestone 2 UI Spec.md]
**Warning signs:** Message count increases for server-loop rows in component/E2E tests. [ASSUMED]

### Pitfall 4: Fabricated `call_model` Progress

**What goes wrong:** The running card shows fake iterations, fake live tool calls, fake elapsed time, or fake cost before completion. [VERIFIED: Milestone 2 Requirements.md]
**Why it happens:** The final diagnostics are tempting to project as a live timeline, but `call_model` does not emit live progress in this milestone. [VERIFIED: Milestone 2 Requirements.md] [VERIFIED: src/agent/extensions/cate-flashquery/model-tool.ts]
**How to avoid:** While `msg.status === 'running'`, use the same `cate-notif-pulse`/generic output behavior as current `ToolCard`; render rich server-loop details only after completion data exists and the card is expanded. [VERIFIED: src/agent/renderer/ChatThread.tsx]
**Warning signs:** T-U-019 can find `iter`, `FQ calls`, or server-loop rows before a mocked `tool_execution_end`. [ASSUMED]

### Pitfall 5: Long Messages Payload Dominates the Panel

**What goes wrong:** Returned model messages or diagnostic payloads expand into hundreds of visible lines. [VERIFIED: Milestone 2 Test Plan.md]
**Why it happens:** Current generic `ToolCard` renders full result pre blocks up to `max-h-[280px]`, which is still too much for nested diagnostics. [VERIFIED: src/agent/renderer/ChatThread.tsx]
**How to avoid:** Add nested collapsed disclosure for messages payload and keep raw JSON in a bounded scroll area. [VERIFIED: 19-CONTEXT.md]
**Warning signs:** E2E long-payload assertion sees the repeated payload visible before clicking a nested disclosure. [ASSUMED]

## Code Examples

Verified patterns from local source:

### Current ToolCard Routing Point

```tsx
// Source: src/agent/renderer/ChatThread.tsx
if (msg.type === 'tool' && msg.name === 'subagent') {
  return <SubagentCard msg={msg} shimmer={shimmer} />
}
return <ToolCard msg={msg} shimmer={shimmer} />
```

### Current Preserved Diagnostics Shape

```ts
// Source: src/agent/renderer/agentStore.ts
export interface ToolMessage {
  type: 'tool'
  name: string
  status: ToolStatus
  result?: string
  error?: string
  flashquery?: Record<string, unknown>
}
```

### Phase 18 Details Producer

```ts
// Source: src/agent/extensions/cate-flashquery/diagnostics.ts
details: {
  flashquery: true,
  toolId: context.candidate.toolId,
  toolName: context.candidate.name,
  result: context.result,
  diagnostics,
  traceId: context.traceId,
  refs: context.refs,
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FlashQuery observability considered as free-standing chat-thread blocks in design reference | FlashQuery diagnostics render inside normal Pi ToolCards, with richer expanded content only for special tools | Product/UI spec current as of 2026-06-04 | Planner must not add new message rows or chrome. [CITED: Cate-FlashQuery Milestone 2 UI Spec.md] |
| Phase 18 only preserved diagnostics for later UI | Phase 19 renders the preserved `ToolMessage.flashquery` details | Phase 19 scope | Planner should not revisit extension dispatch except to understand data shape. [VERIFIED: 18-03-SUMMARY.md] |
| Mocked E2E only asserted data preservation | Phase 19 should assert actual ToolCard collapsed/expanded DOM behavior | Phase 19 target | Extend `e2e/flashquery-pi-diagnostics.spec.ts` instead of replacing it. [VERIFIED: e2e/flashquery-pi-diagnostics.spec.ts] |

**Deprecated/outdated:**
- Standalone FlashQuery chat chrome: dropped from scope; use normal Pi ToolCards. [VERIFIED: 19-CONTEXT.md]
- Cate Run Macro UI: stale mockup only; host model invokes `call_macro` as a Pi tool. [CITED: Cate-FlashQuery Milestone 2 UI Spec.md]
- FlashQuery as Pi provider surface: out of scope for Milestone 2. [VERIFIED: 19-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Diagnostic field aliases beyond `diagnostics`, `result`, `refs`, `traceId`, `macroProgress`, `trace`, and `serverToolLoop` may appear in live FlashQuery envelopes. | Architecture Patterns / Pitfalls | Renderer could omit a live field until manual T-M-003 confirms the exact production envelope. |
| A2 | `call_model` resolution chain fields may be nested in `diagnostics` or `result` depending on FlashQuery response shape. | Architecture Patterns | Planner should include fixture variants and manual evidence to lock the exact mapping. |

## Open Questions

1. **Exact live `call_model` envelope keys**
   - What we know: Phase 18 preserves `result`, `diagnostics`, `traceId`, and `refs`; mocked E2E uses `diagnostics.tokens`, `diagnostics.cost_usd`, `diagnostics.latency_ms`, and `result.serverToolLoop`. [VERIFIED: src/agent/extensions/cate-flashquery/diagnostics.ts] [VERIFIED: e2e/flashquery-pi-diagnostics.spec.ts]
   - What's unclear: The exact live keys for resolver/name, iterations, FQ call count, resolution chain, template params, returned messages, and server-side loop may differ from mocked names. [ASSUMED]
   - Recommendation: Planner should add renderer helper tests with alias coverage and keep T-M-003 as the real-envelope confirmation gate. [VERIFIED: Milestone 2 Test Plan.md]

2. **Whether to split `FlashQueryToolCard` into a separate file**
   - What we know: Current `ChatThread.tsx` already contains `ToolCard`, `SubagentCard`, `PlanReadyCard`, and helper renderers in one file. [VERIFIED: src/agent/renderer/ChatThread.tsx]
   - What's unclear: The final implementation size may push readability past the current local pattern. [ASSUMED]
   - Recommendation: Start in `ChatThread.tsx` or a small sibling component only if the planner expects more than a few local helpers; either choice is allowed by D-25. [VERIFIED: 19-CONTEXT.md]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Build, typecheck, Vitest, Playwright | yes | local `v24.7.0`; project supports `>=20 <23` | Run final evidence under Node 20/22 if possible. [VERIFIED: local command] [VERIFIED: package.json] |
| npm | Package scripts | yes | local `11.5.1` | Use project lockfile with npm. [VERIFIED: local command] [VERIFIED: package-lock.json] |
| Vitest | T-U-019 | yes | project range `^3.2.4` | None needed. [VERIFIED: package.json] |
| Playwright | T-E-006 | yes | project range `^1.60.0` | Existing Electron harness. [VERIFIED: package.json] [VERIFIED: playwright.config.ts] |
| Graphify | Code relationship graph | no | disabled | Use code grep and planning artifacts. [VERIFIED: local command] |

**Missing dependencies with no fallback:**
- None for automated mocked/component work. [VERIFIED: local command + package.json]

**Missing dependencies with fallback:**
- Graphify is disabled; grep and direct source reads provided the needed context. [VERIFIED: local command]
- Live FlashQuery/provider credentials for T-M-003 are not guaranteed locally; record manual evidence or blocker as Phase 18 did. [VERIFIED: 18-03-SUMMARY.md]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest component/unit tests plus Playwright Electron E2E. [VERIFIED: package.json] |
| Config file | `vitest.config.ts`, `playwright.config.ts`. [VERIFIED: codebase grep] |
| Quick run command | `npm test -- src/agent/renderer/ChatThread.test.tsx` [VERIFIED: package.json] |
| Full suite command | `npm run typecheck && npm test && npm run test:e2e` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-017 / T-U-019 | `call_model` collapsed summary uses available resolver/name/iterations/FQ calls/tokens/cost/latency segments and omits missing segments. | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | No - Wave 0 |
| REQ-017 / T-U-019 | `call_model` expanded sections include resolution chain, injected refs, teal server-side tool loop, cost, template params, and collapsible messages payload. | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | No - Wave 0 |
| REQ-017 / T-U-019 | `call_macro` expanded view renders completed trace arrays as a structured step table. | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | No - Wave 0 |
| REQ-017 / T-U-019 | Other FlashQuery tools keep generic ToolCard rendering. | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | No - Wave 0 |
| REQ-017 / T-U-019 | Missing or partial diagnostics do not break layout or render invalid values. | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | No - Wave 0 |
| REQ-017 / T-U-019 | In-flight `call_model` shows standard ToolCard running indicator only. | component | `npm test -- src/agent/renderer/ChatThread.test.tsx` | No - Wave 0 |
| REQ-017 / T-E-006 | Mocked Pi tool events with diagnostics render collapsed/expanded UI, long payload collapse, error/system text, and no new message type. | e2e | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | Yes - extend |
| REQ-017 / T-M-003 | Real host-model invocation with refs shows purpose/model resolution, refs, messages payload, cost/tokens/latency, and server-side FQ tool loop diagnostics. | manual | n/a | Existing manual blocker pattern from Phase 18 |

### Sampling Rate

- **Per task commit:** `npm test -- src/agent/renderer/ChatThread.test.tsx` [VERIFIED: package.json]
- **Per wave merge:** `npm run typecheck && npm test -- src/agent/renderer/ChatThread.test.tsx src/agent/renderer/agentStore.test.ts && npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` [VERIFIED: package.json]
- **Phase gate:** `npm run typecheck`, targeted unit/component tests, targeted E2E, and manual T-M-003 evidence or explicit blocker. [VERIFIED: Milestone 2 Test Plan.md]

### Wave 0 Gaps

- [ ] `src/agent/renderer/ChatThread.test.tsx` - covers T-U-019 component rendering. [VERIFIED: no existing file found]
- [ ] Extend `e2e/flashquery-pi-diagnostics.spec.ts` - promote T-E-006 from data-preservation assertions to DOM ToolCard assertions. [VERIFIED: e2e/flashquery-pi-diagnostics.spec.ts]
- [ ] Optional: add stable selectors/ARIA labels in `ChatThread.tsx` for nested disclosures if text-only E2E selectors are brittle. [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | Phase 19 does not handle credentials. [VERIFIED: 19-CONTEXT.md] |
| V3 Session Management | no | Existing session replay only reads sanitized diagnostics; no session protocol changes. [VERIFIED: src/agent/main/sessionFiles.ts] |
| V4 Access Control | no | No new privileged APIs or renderer-main access paths. [VERIFIED: 19-CONTEXT.md] |
| V5 Input Validation | yes | Treat `msg.flashquery` as untrusted unknown data and narrow before rendering. [VERIFIED: src/agent/renderer/agentStore.ts] |
| V6 Cryptography | no | No cryptographic behavior in renderer presentation. [VERIFIED: 19-CONTEXT.md] |

### Known Threat Patterns for Renderer Diagnostics

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Information disclosure through diagnostic payloads | Information Disclosure | Preserve Phase 18 sanitizer boundary; do not add raw handoff/header/token rendering. [VERIFIED: src/agent/renderer/agentStore.ts] [VERIFIED: src/agent/main/sessionFiles.ts] |
| UI spoofing of FlashQuery execution progress | Spoofing / Repudiation | Render only actual completed diagnostics; do not fabricate live `call_model` or macro trace states. [VERIFIED: Milestone 2 Requirements.md] |
| Renderer crash from malformed diagnostics | Denial of Service | Defensive narrowing, bounded pre blocks, collapsed long payloads. [VERIFIED: src/agent/renderer/agentStore.ts] [VERIFIED: 19-CONTEXT.md] |

## Sources

### Primary (HIGH confidence)
- `AGENTS.md` - Project constraints, stack, testing, and process-boundary rules. [CITED: AGENTS.md]
- `.planning/phases/19-pi-toolcard-observability-rendering/19-CONTEXT.md` - Locked Phase 19 decisions and scope. [VERIFIED: local file]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - REQ-017 acceptance and Phase 19 boundaries. [CITED: Milestone 2 Requirements.md]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - T-U-019, T-E-006, T-M-003, and T-U-018 expectations. [CITED: Milestone 2 Test Plan.md]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Cate-FlashQuery Milestone 2 - UI Spec.md` - Pi chat observability visual binding and teal accent rules. [CITED: Cate-FlashQuery Milestone 2 UI Spec.md]
- `src/agent/renderer/ChatThread.tsx` - Existing ToolCard/SubagentCard rendering paths. [VERIFIED: codebase grep]
- `src/agent/renderer/agentStore.ts` - Live `ToolMessage.flashquery` preservation. [VERIFIED: codebase grep]
- `src/agent/main/sessionFiles.ts` - Replay `flashquery` preservation. [VERIFIED: codebase grep]
- `src/agent/extensions/cate-flashquery/diagnostics.ts`, `model-tool.ts`, `macro-tool.ts` - Phase 18 diagnostics producer shapes. [VERIFIED: codebase grep]
- `e2e/flashquery-pi-diagnostics.spec.ts` and `src/renderer/lib/e2eHarness.ts` - Mocked E2E harness and existing diagnostics assertions. [VERIFIED: codebase grep]

### Secondary (MEDIUM confidence)
- `npm view` registry checks for `@testing-library/react`, `@playwright/test`, and `vitest` versions/modified timestamps. [VERIFIED: npm registry]
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-01-SUMMARY.md`, `18-02-SUMMARY.md`, `18-03-SUMMARY.md` - Phase 18 implementation handoff. [VERIFIED: local file]

### Tertiary (LOW confidence)
- Assumed live FlashQuery envelope aliases beyond the mocked examples; T-M-003 must validate exact production keys. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing installed React/Vitest/Playwright stack and no new packages. [VERIFIED: package.json]
- Architecture: HIGH - Existing code clearly routes all tool messages through `ChatThread` and already preserves `flashquery` details. [VERIFIED: src/agent/renderer/ChatThread.tsx] [VERIFIED: src/agent/renderer/agentStore.ts]
- Pitfalls: HIGH for scope/progress pitfalls from product docs; MEDIUM for exact live envelope-key pitfalls until T-M-003 confirms live data. [VERIFIED: Milestone 2 Requirements.md] [ASSUMED]

**Research date:** 2026-06-04
**Valid until:** 2026-06-11 for live FlashQuery envelope details; 2026-07-04 for local renderer architecture. [ASSUMED]
