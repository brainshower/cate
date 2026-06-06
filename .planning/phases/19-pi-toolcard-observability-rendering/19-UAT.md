# Phase 19 UAT Evidence: Pi ToolCard Observability Rendering

**Date:** 2026-06-04
**Requirement:** REQ-017
**Scope:** Normal Pi `ToolCard` rendering for FlashQuery `call_model`, `call_macro`, and generic FlashQuery tools.

## Coverage Map

| Requirement | Test ID | Layer | Status | Evidence |
| --- | --- | --- | --- | --- |
| REQ-017 | T-U-019 | Component | Passed | `npm test -- src/agent/renderer/ChatThread.test.tsx` exited 0. Vitest reported 1 file passed, 6 tests passed. |
| REQ-017 | T-E-006 | Electron E2E | Passed | `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` exited 0 after rebuilding the Electron bundle for the updated E2E harness. Playwright reported 1 passed. |
| REQ-017 | T-M-003 | Accepted deterministic substitute | Passed by accepted simulated evidence | Owner accepted deterministic substitute evidence on 2026-06-06. `e2e/flashquery-pi-diagnostics.spec.ts` preserves refs, `return_messages`, provider/model diagnostics, messages payload, tokens, latency, server-side tool-loop data, missing-ref errors, and ToolCard rendering through normal Pi tool messages. |

## Automated Command Evidence

| Command | Status | Result |
| --- | --- | --- |
| `npm run build` | Passed | Required once because Electron E2E launches the built app bundle; build exited 0. |
| `npm run test:e2e -- e2e/flashquery-pi-diagnostics.spec.ts` | Passed | Playwright Electron reported 1 passed test for `T-E-006`. |
| `npm test -- src/agent/renderer/ChatThread.test.tsx` | Passed | Vitest reported 1 test file passed, 6 tests passed for `T-U-019` renderer behavior. |
| `npm run typecheck` | Passed | `tsc --noEmit` exited 0. |

## T-E-006 Mocked Electron Evidence

`T-E-006` now mounts a real Agent panel, dispatches mocked Pi tool events through `window.__cateE2E.dispatchAgentEvent`, and verifies the rendered DOM rather than only the stored data shape.

Assertions covered:

- Completed `call_model` renders the collapsed summary with resolver/model, iterations, FlashQuery call count, tokens, cost, and latency.
- Expanded `call_model` shows resolution chain, injected refs, FlashQuery server-side tool loop, cost, template params, and a nested collapsed messages payload.
- The long messages payload is not visible until the nested `Messages payload` disclosure is opened.
- The server-side `search_memory` tool-loop row appears only after expanding the `call_model` ToolCard.
- A secret-like diagnostic sentinel is not visible in the rendered ToolCard, including after nested payload expansion.
- Error `call_model` output stays in the normal ToolCard flow and shows the unresolved-reference system text plus the tool error state.
- Completed `call_macro` renders a structured trace table.
- Generic FlashQuery tool diagnostics still render through the ordinary generic ToolCard path.
- `window.__cateE2E.agentMessages(panelId)` returns only existing `type: 'tool'` messages; no new chat message type is introduced.

## T-M-003 Live Follow-Up Procedure

`T-M-003` is accepted for milestone closeout by deterministic substitute evidence. To collect optional live follow-up evidence, run Cate against a real configured FlashQuery instance and a native Pi provider:

1. Start Cate with a workspace that has a valid FlashQuery connection and a Pi provider configured outside FlashQuery.
2. Ensure the FlashQuery vault contains at least one document fixture that can be referenced as `{{ref:<fullPath>}}`.
3. In a Pi Agent panel, ask the host model to use `call_model` with the document reference.
4. Expand the resulting `call_model` ToolCard.
5. Verify purpose/model resolution is shown.
6. Verify injected refs include the referenced document path and successful resolution.
7. Verify the returned messages payload is available only behind the nested messages disclosure.
8. Verify cost, token count, and latency diagnostics are shown when the live response includes them.
9. Verify the server-side FlashQuery tool loop appears inside the expanded `call_model` ToolCard only, not as free-standing chat rows.
10. Confirm the evidence record omits bearer tokens, provider keys, request headers, handoff payloads, endpoint fields, request-init fields, cookies, and raw credential-bearing diagnostics.

## T-M-003 Closeout

**Status:** Accepted by deterministic substitute.

Owner acceptance on 2026-06-06 makes the deterministic `e2e/flashquery-pi-diagnostics.spec.ts` coverage sufficient for milestone closeout. The following live prerequisites were not available in the executor environment and remain optional follow-up evidence rather than blockers:

- Confirmed native Pi provider credentials usable by the running Cate app.
- Confirmed live FlashQuery runtime configured for this Cate workspace.
- Confirmed document-reference fixture path in the live FlashQuery vault.

No live credential-bearing diagnostics were captured or recorded.
