---
phase: 19-pi-toolcard-observability-rendering
reviewed: 2026-06-04T17:30:43Z
depth: deep
files_reviewed: 4
files_reviewed_list:
  - e2e/flashquery-pi-diagnostics.spec.ts
  - src/agent/renderer/ChatThread.tsx
  - src/agent/renderer/ChatThread.test.tsx
  - src/renderer/lib/e2eHarness.ts
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 19: Code Review Report

**Reviewed:** 2026-06-04T17:30:43Z
**Depth:** deep
**Files Reviewed:** 4
**Status:** issues_found

## Summary

Reviewed the Phase 19 renderer, component tests, Electron E2E, and E2E harness change for `REQ-017` / `T-U-019` / `T-E-006` / `T-M-003`. The implementation passes against invented flattened diagnostics, but the live FlashQuery `call_model` result is a JSON `CallModelEnvelope` in tool-result text with data under `metadata`, so the shipped UI will not render the required summary/details for real calls. The renderer sanitizer also still permits some credential-bearing diagnostic keys/values through the displayed JSON blocks.

## Critical Issues

### CR-01: Live `call_model` envelopes are not parsed, so REQ-017 observability disappears for real results

**File:** `src/agent/renderer/ChatThread.tsx:905`

**Issue:** `flashQueryDiagnostics()` only merges `msg.flashquery`, `msg.flashquery.diagnostics`, and `msg.flashquery.result` as objects. A real FlashQuery `call_model` returns a tool result whose `content[0].text` is a JSON `CallModelEnvelope` with `metadata` fields such as `resolver`, `name`, `resolved_model_name`, nested `tokens`, `cost_usd`, `latency_ms`, `tool_calls`, `injected_references`, and `messages`. The summary code at `ChatThread.tsx:919` then looks for flattened/non-live aliases like `modelName`, numeric `tokens`, `iterations`, `flashqueryCalls`, and `serverToolLoop`, so live calls degrade to `call_model` plus raw result text instead of the required collapsed summary, resolution, refs, messages payload, cost/tokens/latency, and server-side tool loop. The tests mask this by seeding non-live fixture shapes in `src/agent/renderer/ChatThread.test.tsx:57` and `e2e/flashquery-pi-diagnostics.spec.ts:63`.

**Fix:**
```ts
function parseCallModelEnvelope(msg: ToolMessage, details: Record<string, unknown>) {
  const text =
    msg.result ??
    firstTextBlock(asRecord(details.result)?.content)
  const envelope = parseJsonRecord(text)
  const metadata = asRecord(envelope?.metadata)
  if (!metadata) return {}
  const tokenObj = asRecord(metadata.tokens)
  return {
    resolver: metadata.resolver,
    modelName: firstValue(metadata.resolved_model_name, metadata.name),
    tokens: sumNumbers(tokenObj?.input, tokenObj?.output),
    cost_usd: metadata.cost_usd,
    latency_ms: metadata.latency_ms,
    messages: envelope?.messages,
    refs: metadata.injected_references,
    serverToolLoop: firstValue(metadata.tool_calls, asRecord(metadata.tools)?.calls_log),
    iterations: asNumber(asRecord(metadata.tools)?.iterations),
  }
}
```
Then merge that parsed envelope into `flashQueryDiagnostics()` for `call_model`, map `metadata.tool_calls` / `metadata.tools.calls_log` into loop rows, map `metadata.injected_references` into injected refs, and replace the component/E2E fixtures with real `CallModelEnvelope` text fixtures.

## Warnings

### WR-01: Display sanitizer still allows credential-bearing diagnostic keys and values

**File:** `src/agent/renderer/ChatThread.tsx:1211`

**Issue:** `sanitizeDisplayValue()` renders arbitrary nested template/message JSON after only key-based filtering, and `isSecretDiagnosticKey()` does not block common credential keys like `auth`, `credentials`, or `credential`. It also does not redact string values that contain bearer/basic authorization material when the key is innocuous. Since `ToolMessage.flashquery` is untrusted diagnostic data and these JSON blocks are user-visible, this can leak provider or server credentials if FlashQuery/Pi emits a field outside the current narrow key list.

**Fix:** Expand the predicate to include credential/auth aliases and redact suspicious string values before rendering JSON payloads.

```ts
function isSecretDiagnosticKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalized === 'tokens') return false
  return /authorization|auth|bearer|token|header|cookie|handoff|endpoint|requestinit|apikey|secret|password|credential/.test(normalized)
}

function sanitizeDiagnosticString(value: string): string | undefined {
  return /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/i.test(value) ? undefined : value
}
```

Add component coverage with keys such as `credentials`, `auth`, and benign keys containing `Bearer ...` values.

---

_Reviewed: 2026-06-04T17:30:43Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
