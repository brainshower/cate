---
status: accepted-simulated
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
awaiting: optional live provider/runtime/document-reference follow-up

## Tests

### 1. T-M-003 live call_model observability
expected: |
  Run Cate with a configured native Pi provider, live FlashQuery runtime, and a document-reference
  fixture. Invoke call_model through a Pi Agent panel with {{ref:<fullPath>}}, expand the resulting
  call_model ToolCard, and verify purpose/model resolution, injected refs, collapsed messages
  payload, cost/tokens/latency when present, and server-side FlashQuery tool-loop diagnostics.
result: accepted-simulated
blocker: |
  Owner accepted deterministic substitute evidence on 2026-06-06 for milestone closeout.
  Live provider credentials, a live FlashQuery runtime, and a document-reference fixture path were
  not available during automated Phase 19 execution and remain optional follow-up evidence.

## Summary

total: 1
passed: 1
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None. This was closed by accepted deterministic substitute evidence; live execution remains optional follow-up.
