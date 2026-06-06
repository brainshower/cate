---
phase: 17
validation: flashquery-pi-extension-bootstrap
created: 2026-06-04
updated: 2026-06-04
status: nyquist-compliant
nyquist_compliant: true
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

- T-U-013: installer copies bundled extension files idempotently in dev/prod source layouts and `AgentManager.create()` invokes it without disrupting existing extension installs. Handoff tests must prove bearer tokens are read from `src/main/flashquery/credentials.ts` / `getWorkspaceToken(workspaceId)` and are not written to Pi global `auth.json` or project-local workspace JSON.
- T-U-014: registry filtering registers plain host-filtered `tools/list` records and enriched `hostEligible: true` records with `status: final`, `status: transitional`, or legacy `status: current`; includes brokered MCP tools, translates schemas, skips removed/unavailable/deprecated/unknown-status tools, and does not register a provider.
- T-U-015: workspace switch reconnects the FlashQuery MCP client, refreshes registry/models/purposes, unregisters or otherwise removes stale tools from subsequent availability, registers changed tools, and leaves in-flight old-workspace calls to complete.
- T-E-005: with mocked agent/FlashQuery fixture where feasible, Cate startup installs the bundled extension and eligible fixture tools become Pi tools after agent startup.
- T-M-001: against real FlashQuery and Pi provider, native and brokered eligible tools register, stale tools disappear after workspace switch, and FlashQuery is absent from ProvidersView.

## Manual Evidence

Record T-M-001 in `.planning/phases/17-flashquery-pi-extension-bootstrap/17-UAT.md` or an `evidence/manual/NOTES.md` file. If local credentials or provider setup block real integration, record the blocker and the automated substitute evidence rather than silently skipping.

## Validation Audit 2026-06-04

| Requirement/Test ID | Status | Evidence |
|---------------------|--------|----------|
| T-U-013 | COVERED | `src/agent/main/installFlashQueryExtension.test.ts`, `src/agent/main/agentManager.test.ts` |
| T-U-014 | COVERED | `src/agent/extensions/cate-flashquery/registry.test.ts`, `schema.test.ts`, `index.test.ts` |
| T-U-015 | COVERED | `src/agent/extensions/cate-flashquery/lifecycle.test.ts`, `index.test.ts` |
| T-E-005 | COVERED | `e2e/flashquery-pi-extension.spec.ts`; `17-UAT.md` records Pi tool-list introspection harness limitation |
| T-M-001 | MANUAL-BLOCKED | `17-UAT.md` records live FlashQuery/Pi-provider blockers and substitute automated evidence |

### Commands Run

- `npm test -- src/agent/main/installFlashQueryExtension.test.ts src/agent/main/agentManager.test.ts src/agent/extensions/cate-flashquery/registry.test.ts src/agent/extensions/cate-flashquery/schema.test.ts src/agent/extensions/cate-flashquery/index.test.ts src/agent/extensions/cate-flashquery/lifecycle.test.ts` — passed, 25 tests.
- `npm run build` — passed.
- `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts` — passed, 1 test.
- `npm run typecheck` — passed.

### Audit Result

Automated Nyquist coverage is complete for all Phase 17 automatable requirements. The only remaining live check is T-M-001 against a real FlashQuery endpoint and configured Pi provider; this is explicitly recorded as blocked in `17-UAT.md` with substitute automated evidence.
