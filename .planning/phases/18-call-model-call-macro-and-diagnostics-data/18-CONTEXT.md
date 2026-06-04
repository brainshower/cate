# Phase 18: `call_model`, `call_macro`, and Diagnostics Data - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning
**Source:** Product-doc express path from user-supplied Milestone 2 requirements and test plan

<domain>
## Phase Boundary

Phase 18 implements the FlashQuery Pi tool behavior and diagnostics data foundation for `call_model` and `call_macro`.

This phase covers `REQ-015` and `REQ-016`, plus the data-preservation foundation for `REQ-017` through `agentStore` structured FlashQuery details. Full `ToolCard` rendering for `REQ-017` is Phase 19.

The implementation must build on Phase 17's bundled `src/agent/extensions/cate-flashquery/` lifecycle, registry, schema translation, workspace rebinding, stale-tool handling, and metadata refresh work.
</domain>

<decisions>
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
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Defines `REQ-015`, `REQ-016`, progress/diagnostics constraints, source priority, and Phase 18 implementation boundaries.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Defines `T-U-016`, `T-U-017`, `T-U-018`, `T-E-006`, `T-M-002`, and `T-M-003` coverage expectations.

### Cate Planning Context
- `.planning/ROADMAP.md` - Phase 18 goal, requirement mapping, and success criteria.
- `.planning/REQUIREMENTS.md` - v1.2 requirement traceability preserving product `REQ-###` IDs.
- `.planning/STATE.md` - Current milestone state and Phase 17 handoff notes.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-CONTEXT.md` - Phase 17 locked decisions for bundled extension bootstrap.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-RESEARCH.md` - Phase 17 technical research on Pi extension patterns.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-PATTERNS.md` - Existing analog files and implementation patterns for FlashQuery Pi extension work.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-03-SUMMARY.md` - Generation-safe lifecycle, metadata refresh, stale-tool handling, and next-phase readiness.
- `src/agent/extensions/cate-flashquery/client.ts` and `src/agent/extensions/cate-flashquery/client.test.ts` - Phase 17 gap fix: metadata discovery now uses `call_model` resolver calls.
- `src/agent/extensions/cate-flashquery/registry.ts` and `src/agent/extensions/cate-flashquery/registry.test.ts` - Phase 17 gap fix: registry discovery treats tools as eligible unless explicitly ineligible (`deprecated`, `unavailable`, `removed`, or `hostEligible: false`).
- `src/agent/extensions/cate-flashquery/lifecycle.ts`, `src/agent/extensions/cate-flashquery/index.ts`, `src/agent/main/flashQueryHandoffBridge.ts`, and `src/agent/extensions/cate-flashquery/handoff-rebind.integration.test.ts` - Phase 17 gap fix / current codebase shape: handoff changes are watched and refreshed for live sessions.
</canonical_refs>

<specifics>
## Specific Ideas

- `T-U-016` must cover `call_model` description discovery/loading update, `return_messages: true`, trace ID mint/reuse, unresolved ref blocking with the exact system message, and mid-stream diagnostics preservation.
- `T-U-017` must cover `call_macro` `source_ref` execution without confirmation, inline `source` confirmation, default `interactive: true`, default `progress: 'milestones'`, `progressToken` filtering, `needs_user_input`, completed trace capture, disconnected error text, and the "no fabricated progress" live-rendering rule.
- `T-U-018` must cover `agentStore` structured FlashQuery details preservation across start/update/end events while preserving standard text extraction and existing subagent details.
- `T-E-006` is referenced by Phase 18 as mocked Pi diagnostic event evidence, but full ToolCard rendering belongs to Phase 19.
- `T-M-002` and `T-M-003` require live or high-fidelity real integration and should be recorded as manual evidence or blockers if local provider/FlashQuery credentials are unavailable.
</specifics>

<deferred>
## Deferred Ideas

- Full `REQ-017` ToolCard collapsed summaries, expanded diagnostic sections, completed macro trace table rendering, long-payload collapse behavior, and graceful partial-diagnostics rendering are Phase 19.
- Pi `@` mention autocomplete and clipboard utilities are Phase 20.
- Cross-surface disconnected/reconnect/workspace-switch hardening is Phase 21.
- A Cate-level Run Macro button, user-facing model/purpose picker, FlashQuery as a Pi provider, and global Pi `auth.json` credential flows remain out of scope.
</deferred>

---

*Phase: 18-call-model-call-macro-and-diagnostics-data*
*Context gathered: 2026-06-04 via product-doc express path*
