---
phase: 17
validation: flashquery-pi-extension-bootstrap
created: 2026-06-04
status: ready
---

# Phase 17 Validation Strategy

## Validation Architecture

Phase 17 validation is split across installer unit tests, extension unit tests, one startup E2E where feasible, and real-integration manual evidence.

## Automated Checks

1. `npm test -- src/agent/main/installFlashQueryExtension.test.ts`
2. `npm test -- src/agent/extensions/cate-flashquery`
3. `npm test -- src/agent/main/agentManager.test.ts` if an AgentManager installer test is added separately.
4. `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts` if the mocked Pi/FlashQuery fixture path is implemented.
5. `npm run typecheck`

## Required Assertions

- T-U-013: installer copies bundled extension files idempotently in dev/prod source layouts and `AgentManager.create()` invokes it without disrupting existing extension installs.
- T-U-014: registry filtering registers only `hostEligible: true` and `status: current`, includes brokered MCP tools, translates schemas, skips unavailable/deprecated tools, and does not register a provider.
- T-U-015: workspace switch reconnects the FlashQuery MCP client, refreshes registry/models/purposes, unregisters or otherwise removes stale tools from subsequent availability, registers changed tools, and leaves in-flight old-workspace calls to complete.
- T-E-005: with mocked agent/FlashQuery fixture where feasible, Cate startup installs the bundled extension and eligible fixture tools become Pi tools after agent startup.
- T-M-001: against real FlashQuery and Pi provider, native and brokered eligible tools register, stale tools disappear after workspace switch, and FlashQuery is absent from ProvidersView.

## Manual Evidence

Record T-M-001 in `.planning/phases/17-flashquery-pi-extension-bootstrap/17-UAT.md` or an `evidence/manual/NOTES.md` file. If local credentials or provider setup block real integration, record the blocker and the automated substitute evidence rather than silently skipping.
