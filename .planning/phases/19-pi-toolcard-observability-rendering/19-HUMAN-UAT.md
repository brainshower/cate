---
status: partial
phase: 19-pi-toolcard-observability-rendering
source:
  - 19-VERIFICATION.md
  - 19-UAT.md
started: 2026-06-04T17:47:53Z
updated: 2026-06-04T17:47:53Z
---

# Phase 19 Human UAT: Live call_model Observability

## Current Test

number: 1
name: T-M-003 live call_model observability
expected: |
  With a configured native Pi provider, live FlashQuery runtime, and document-reference fixture,
  a real call_model ToolCard shows purpose/model resolution, injected refs, messages payload,
  cost/tokens/latency when present, and server-side FlashQuery tool-loop diagnostics only inside
  the expanded ToolCard. The evidence record must omit bearer tokens, provider keys, request
  headers, handoff payloads, endpoint fields, request-init fields, cookies, and raw
  credential-bearing diagnostics.
awaiting: live provider/runtime/document-reference prerequisites

## Tests

### 1. T-M-003 live call_model observability
expected: |
  Run Cate with a configured native Pi provider, live FlashQuery runtime, and a document-reference
  fixture. Invoke call_model through a Pi Agent panel with {{ref:<fullPath>}}, expand the resulting
  call_model ToolCard, and verify purpose/model resolution, injected refs, collapsed messages
  payload, cost/tokens/latency when present, and server-side FlashQuery tool-loop diagnostics.
result: blocked
blocker: |
  Live provider credentials, a live FlashQuery runtime, and a document-reference fixture path were
  not available during automated Phase 19 execution.

## Summary

total: 1
passed: 0
issues: 0
pending: 0
skipped: 0
blocked: 1

## Gaps

None. This is a manual prerequisite gap, not an automated implementation gap.
