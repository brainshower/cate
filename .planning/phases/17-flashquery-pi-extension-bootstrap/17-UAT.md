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

**Date:** 2026-06-04

**Environment:** Local Cate repository at `/Users/matt/Documents/Claude/Projects/Cate/cate`, Electron E2E fixture workspace under macOS temp storage, Node/Electron app launched by Playwright.

**FlashQuery endpoint type:** Mocked HTTP MCP fixture for automated substitute evidence. A live user-owned FlashQuery endpoint was not available in this executor session.

**Pi provider used:** None. No real native Pi LLM provider credentials were available to this executor session, so host-model judgment and live provider-driven tool selection were not manually exercised.

**Native eligible tools observed:** Blocked for real integration. Automated substitute evidence seeded an eligible native fixture tool (`fixture_native_search`) and unit coverage proved eligible native records register as Pi tools.

**Brokered MCP tools observed:** Blocked for real integration. Automated substitute evidence seeded an eligible brokered MCP fixture tool (`github.create_issue`) and unit coverage proved brokered MCP records register as Pi tools.

**Workspace-switch stale-tool behavior:** Blocked for real integration. Automated substitute evidence in `src/agent/extensions/cate-flashquery/lifecycle.test.ts` proves removed tools return `not available in the current FlashQuery workspace`, changed schemas are refreshed, newly available tools register, and in-flight old-workspace calls complete against the old client.

**ProvidersView absence:** Real UI manual check blocked by lack of live Pi provider setup. Automated coverage in `src/agent/extensions/cate-flashquery/index.test.ts` reads `ProvidersView.tsx` and asserts no FlashQuery provider/id row is present; extension tests also assert no provider registration API is called.

### Commands/Checks Run Instead

- `npm test -- src/agent/extensions/cate-flashquery/index.test.ts src/agent/extensions/cate-flashquery/lifecycle.test.ts` — passed.
- `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts` — passed after `npm run build`.
- `npm run typecheck` — passed.

### Skipped Manual Checks

- Live native eligible tool registration: skipped because no live FlashQuery endpoint and no configured native Pi provider credentials were available in this executor environment.
- Live brokered MCP tool registration: skipped because no live FlashQuery endpoint with brokered MCP server configuration was available.
- Live workspace switch in the Pi UI: skipped because no two real FlashQuery workspace endpoints/provider-backed Pi sessions were available.
- Live ProvidersView inspection with a real provider session: skipped because provider credentials were unavailable; static/unit coverage verifies FlashQuery is absent from provider surfaces.

### Remaining Manual Verification

Run Cate against a real FlashQuery HTTP MCP endpoint and a configured native Pi provider, then verify:

1. At least one native eligible FlashQuery tool appears to Pi.
2. At least one brokered MCP eligible tool appears to Pi.
3. Switching to a workspace where a prior tool is absent prevents that stale tool from executing.
4. FlashQuery does not appear in ProvidersView.
