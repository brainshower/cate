# Phase 19: Pi ToolCard Observability Rendering - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning
**Source:** Product-doc express path from user-supplied Milestone 2 requirements and test plan

<domain>
## Phase Boundary

Phase 19 implements `REQ-017`: FlashQuery Pi tool calls render through Cate's normal Pi `ToolCard` system, with richer structured observability for `call_model` and `call_macro`.

This phase consumes the structured FlashQuery diagnostics preserved by Phase 18. It must add presentation behavior only inside existing Pi ToolCard rendering. It must not introduce new chat message types, standalone FlashQuery chat chrome, a FlashQuery provider surface, a Cate macro launcher, or Pi `@` mention/clipboard utilities.
</domain>

<decisions>
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
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Defines `REQ-017`, the required `call_model` summary format, expanded diagnostics sections, `call_macro` trace rendering, and out-of-scope boundaries.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Defines `T-U-019`, `T-E-006`, `T-M-003`, and related `T-U-018` diagnostics-preservation coverage.

### Cate Planning Context
- `.planning/ROADMAP.md` - Phase 19 goal, requirement mapping, and success criteria.
- `.planning/REQUIREMENTS.md` - v1.2 requirement traceability preserving product `REQ-###` IDs.
- `.planning/STATE.md` - Current milestone state and latest handoff notes.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-CONTEXT.md` - Locked Phase 18 decisions around diagnostics data preservation and Phase 19 deferral.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-RESEARCH.md` - Technical research on Pi extension diagnostics and ToolCard handoff.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-01-SUMMARY.md` - `call_model` diagnostics helper, trace/ref preservation, and specialized wrapper handoff.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-02-SUMMARY.md` - `call_macro` diagnostics/progress preservation and macro trace handoff.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-03-SUMMARY.md` - Renderer/session FlashQuery diagnostics preservation, mocked `T-E-006` harness, and manual blocker notes.

### Expected Code Areas
- `src/agent/renderer/ChatThread.tsx` - Existing Pi chat thread and ToolCard rendering path.
- `src/agent/renderer/agentStore.ts` and `src/agent/main/sessionFiles.ts` - Phase 18 FlashQuery details preservation source.
- `src/agent/extensions/cate-flashquery/diagnostics.ts`, `src/agent/extensions/cate-flashquery/model-tool.ts`, and `src/agent/extensions/cate-flashquery/macro-tool.ts` - Structured diagnostics shapes emitted by specialized FlashQuery tool wrappers.
- `e2e/flashquery-pi-diagnostics.spec.ts` and `src/renderer/lib/e2eHarness.ts` - Existing mocked diagnostics E2E harness to extend for ToolCard UI assertions.
</canonical_refs>

<specifics>
## Specific Ideas

- The collapsed summary must prefer product-specified values when present, but partial data must not produce `undefined`, `NaN`, broken currency, or broken latency text.
- The expanded server-side tool-loop block should appear only after completion when diagnostics include tool-loop data.
- Long returned messages payloads should be collapsed by default or behind an explicit disclosure control so the ToolCard remains scan-friendly.
- Error/system-message rendering from Phase 18 diagnostics should remain visible in the normal ToolCard flow.
- Tests should assert that ordinary non-special FlashQuery tools still render with the existing standard ToolCard summary/details behavior.
</specifics>

<deferred>
## Deferred Ideas

- Pi `@` mention autocomplete and clipboard utilities are Phase 20.
- Cross-surface disconnected/reconnect/workspace-switch hardening is Phase 21.
- A Cate-level Run Macro button, user-facing model/purpose picker, FlashQuery as a Pi provider, and global Pi `auth.json` credential flows remain out of scope.
</deferred>

---

*Phase: 19-pi-toolcard-observability-rendering*
*Context gathered: 2026-06-04 via product-doc express path*
