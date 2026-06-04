---
phase: 18-call-model-call-macro-and-diagnostics-data
status: partial
automated: passed
manual: blocked
updated: 2026-06-04
---

# Phase 18 UAT: `call_model`, `call_macro`, and Diagnostics Data

## T-E-006 Automated Evidence

**Status:** Passed

**Command:**

```bash
npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts
```

**Observed:** Mocked Pi `tool_execution_*` events preserve structured `details.flashquery === true` data on existing `type: 'tool'` messages. The spec covers `call_model` success diagnostics, long diagnostic payload preservation for Phase 19 collapse readiness, error/system-message data, and no new chat message type.

**Scope note:** Full collapsed/expanded ToolCard rendering remains Phase 19. Phase 18 verifies the data/event layer that Phase 19 will render.

## T-M-002 Manual: Real Macro Progress

**Status:** Blocked pending live FlashQuery macro runtime and Pi provider credentials.

**Expected observations when credentials/runtime are available:**

- Execute a real `call_macro` that emits progress notifications.
- Live macro progress shows only a spinner plus the latest real progress message.
- Live progress does not show fabricated checkmarks, fake completion counts, synthesized elapsed times, or per-step rows.
- Final macro result preserves `MacroExecutionResult.trace`.
- `needs_user_input` remains a tool-result envelope for the host model to relay.
- Disconnected macro execution returns exactly `FlashQuery is not connected.`

## T-M-003 Manual: Real `call_model` Refs And Diagnostics

**Status:** Blocked pending live provider credentials and a configured FlashQuery model/purpose runtime.

**Expected observations when credentials/runtime are available:**

- Invoke `call_model` through Pi with document refs such as `{{ref:Path/to/Doc.md}}`.
- Registered description includes discovered purposes/models or `Available purposes: loading...` while discovery is unavailable.
- Dispatch payload includes `return_messages: true`.
- Resolved refs are hydrated before dispatch and preserved in FlashQuery diagnostics.
- Missing refs return `Reference {{ref:Path/to/Doc.md}} could not be resolved (document not found).`
- Final diagnostics preserve cost, tokens, latency, and server-side FlashQuery tool loop details.

## Regression Boundaries

- No bearer tokens, provider API keys, authorization headers, handoff payloads, endpoint URLs, or request-init data should appear in renderer/session FlashQuery diagnostics.
- No standalone FlashQuery chat message type or separate FlashQuery chat chrome was added.
- Other FlashQuery tools and existing subagent details continue to use normal Pi tool messages.
