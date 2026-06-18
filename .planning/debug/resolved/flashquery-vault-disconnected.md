---
status: resolved
trigger: "FlashQuery connection shows disconnected in Cate left sidebar even though FlashQuery is connected; vault explorer is hidden behind disconnected panel."
created: 2026-06-10
updated: 2026-06-18
---

## Symptoms

- Expected behavior: FlashQuery Vault sidebar shows the vault file explorer when FlashQuery is reachable.
- Actual behavior: Cate left sidebar shows FlashQuery disconnected panel.
- Error messages: none reported in UI yet.
- Timeline: observed after recent FlashQuery vault context action changes and dev rebuild.
- Reproduction: open Cate dev app with FlashQuery running/connected, select FlashQuery Vault sidebar.

## Current Focus

- hypothesis: Cate can preserve a stale `disconnected` status and then refuse to call FlashQuery vault tools, leaving the sidebar stuck behind the disconnected panel.
- test: Verify FlashQuery HTTP/MCP directly, then remove Cate's stale-disconnected gates from vault listing paths.
- expecting: Configured workspaces still attempt MCP vault calls even if the last status says disconnected.
- next_action: run focused tests and typecheck

## Evidence

- `http://127.0.0.1:3100/mcp/info` responds 200 with FlashQuery metadata.
- Direct MCP `list_vault` without bearer fails with 401 Unauthorized, confirming auth is enforced.
- Cate Dev has a stored bearer token for workspace `41933e17-92bd-4995-9f0d-ace211ff015f`.
- Direct MCP `list_vault` with that stored token succeeds and returns vault entries.
- `FlashQueryClientManager.listVault()` and `listVaultIndex()` both had early returns for `status === 'disconnected'`, so a stale status could block recovery before any MCP call was attempted.

## Eliminated

- FlashQuery process down: eliminated by `/mcp/info` 200.
- Missing/invalid Cate token: eliminated by direct bearer-authenticated MCP `list_vault`.
- Session restore clearing the token: current renderer create-sync sends `preserveExistingToken: true`, and the stored token is present.

## Resolution

- root_cause: Cate treated a stale disconnected status as a hard stop for vault listing/index calls, so the sidebar could remain disconnected even after FlashQuery and auth were healthy.
- fix: Remove disconnected-status early returns from configured vault listing paths and add regression coverage that stale disconnected status still attempts MCP calls.
- verification:
- `npm test -- src/main/flashquery/clientManager.test.ts src/renderer/panels/FlashQueryVaultPanel.test.tsx` passed: 79 tests.
- `npm run typecheck` passed.
- files_changed:
