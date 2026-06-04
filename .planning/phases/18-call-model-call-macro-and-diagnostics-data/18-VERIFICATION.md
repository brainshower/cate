---
phase: 18-call-model-call-macro-and-diagnostics-data
status: passed
score: 8/8
verified: 2026-06-04
requirements: [REQ-015, REQ-016]
manual_only: [T-M-002, T-M-003]
---

# Phase 18 Verification: `call_model`, `call_macro`, and Diagnostics Data

## Verdict

**Passed.** Phase 18 achieved its goal: `call_model` and `call_macro` are specialized as Pi tools, and structured FlashQuery diagnostics are preserved through live agent state, session replay, and mocked E2E evidence.

## Requirement Coverage

| Requirement | Result | Evidence |
|-------------|--------|----------|
| REQ-015 | Passed | T-U-016 lifecycle tests cover description enrichment/loading placeholder, `return_messages`, trace ID format/reuse, ref hydration/blocking, error diagnostics, and no synthetic progress. T-U-018/T-E-006 preserve details for later ToolCards. |
| REQ-016 | Passed | T-U-017 lifecycle tests cover `source_ref` no-confirm dispatch, inline source confirmation/cancel, defaults, progress forwarding, `needs_user_input`, and exact disconnected text. T-U-018/T-E-006 preserve details for later ToolCards. |

## Must-Have Checks

| Check | Status |
|-------|--------|
| Pi can invoke FlashQuery `call_model` with discovered purpose/model context or loading placeholder. | Passed |
| `call_model` dispatch sends `return_messages: true` and threaded trace IDs. | Passed |
| Resolved document refs are preflighted and unresolved refs block dispatch with exact text. | Passed |
| `call_model` error envelopes preserve FlashQuery diagnostics without synthetic live progress. | Passed |
| Pi can invoke FlashQuery `call_macro` through `source_ref` without pre-confirmation. | Passed |
| Inline macro source requires user confirmation before dispatch. | Passed |
| Macro defaults, progress updates, `needs_user_input`, traces, and disconnected text are preserved. | Passed |
| Live and replayed tool messages preserve structured FlashQuery details without new chat message types. | Passed |

## Automated Evidence

All commands passed on 2026-06-04:

```bash
npm run build
npm run typecheck
npm test -- src/agent/extensions/cate-flashquery/lifecycle.test.ts
npm test -- src/agent/extensions/cate-flashquery/client.test.ts
npm test -- src/agent/renderer/agentStore.test.ts src/agent/main/sessionFiles.test.ts
npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts
```

## Acknowledged Manual-Only Checks

| Test | Status | Rationale |
|------|--------|-----------|
| T-M-002 | Manual-only blocker acknowledged | Requires live FlashQuery macro runtime and Pi provider credentials. Expected observations are recorded in `18-UAT.md`. |
| T-M-003 | Manual-only blocker acknowledged | Requires live provider credentials and configured FlashQuery model/purpose runtime. Expected observations are recorded in `18-UAT.md`. |

## Gaps

None.

## Next Phase Readiness

Phase 19 can implement rich ToolCard rendering from the existing `ToolMessage.flashquery` details. No Phase 18 implementation gaps remain.
