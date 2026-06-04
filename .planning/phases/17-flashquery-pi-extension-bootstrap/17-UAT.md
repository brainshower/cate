# Phase 17 UAT Evidence

## T-E-005 Automated Startup Fixture

**Date:** 2026-06-04

**Command:** `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts`

**Outcome:** Passed after `npm run build`.

**Evidence recorded:**

- Cate started in E2E mode with a workspace-scoped FlashQuery fixture configured with bearer auth.
- The fixture registry contained one eligible native tool, one eligible brokered MCP tool, and one ineligible deprecated tool.
- Agent startup installed `cate-flashquery/index.ts`, `package.json`, and runtime helper modules under `<workspace>/.cate/pi-agent/extensions/cate-flashquery`.
- The FlashQuery fixture received an MCP POST after Agent startup, proving the installed extension opened the handoff client and fetched registry metadata.

**Harness limitation:**

The current Electron E2E harness does not expose Pi's internal advertised tool list. The automated substitute evidence therefore proves installation plus registry fetch, while unit coverage in `src/agent/extensions/cate-flashquery/lifecycle.test.ts` proves eligible/new/changed/stale tool registration and execution behavior deterministically.

## T-M-001 Manual Real-Integration Evidence

Status: Pending Task 17.3.4.
