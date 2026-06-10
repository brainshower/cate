---
status: resolved
trigger: "Cate/Pi FlashQuery MCP calls intermittently return Bad Request: No valid session ID after FlashQuery restart"
created: 2026-06-10
updated: 2026-06-10
---

# Debug Session: Cate FlashQuery Stale Session

## Symptoms

- Expected behavior: Cate should keep using FlashQuery tools after FlashQuery is restarted, or recover on the next tool call.
- Actual behavior: Pi reports `Bad Request: No valid session ID` while invoking FlashQuery MCP tools.
- Error messages: `Bad Request: No valid session ID`.
- Timeline: Restarting FlashQuery first and fully quitting/reopening Cate resolves the error.
- Reproduction: Start Cate with a FlashQuery HTTP handoff, initialize tools, restart FlashQuery, then invoke a FlashQuery tool from the existing Cate/Pi session.

## Current Focus

- hypothesis: Cate's bundled FlashQuery MCP client keeps a stateful Streamable HTTP session ID after FlashQuery restarts; the next non-initialize request uses the stale ID and FlashQuery rejects it before tool dispatch.
- test: Add a client adapter regression test where the SDK client throws the stale-session 400 once, then verify Cate reconnects and retries the operation once.
- expecting: Existing client adapter fails the new test because it forwards the SDK error without reconnecting.
- next_action: Write failing test in `src/agent/extensions/cate-flashquery/client.test.ts`.

## Evidence

- 2026-06-10: FlashQuery server rejects non-initialize `/mcp` requests without a known `mcp-session-id` before tool handlers run.
- 2026-06-10: User confirmed restarting FlashQuery then fully quitting/reopening Cate resolves the issue.
- 2026-06-10: Cate `openFlashQueryClient` creates one SDK `Client`/`StreamableHTTPClientTransport` per handoff generation with no stale-session recovery.

## Eliminated

- hypothesis: Bad FlashQuery tool arguments cause the error.
  evidence: The error is emitted by `/mcp` session routing before tool dispatch.
- hypothesis: Bearer token failure causes the error.
  evidence: Auth failures would surface as 401/403, not `No valid session ID`.

## Resolution

- root_cause: Cate's FlashQuery client adapter kept using one SDK Streamable HTTP client after FlashQuery restarted, so the SDK reused a stale MCP session ID and FlashQuery rejected later non-initialize requests.
- fix: `openFlashQueryClient` now reconnects the underlying MCP SDK client and retries the operation once when it sees the stale-session errors `No valid session ID` or `Invalid or missing session ID`.
- verification: Focused client test failed before the fix and passes after; `npm run typecheck` passes; nearby FlashQuery extension tests pass.
- files_changed: `src/agent/extensions/cate-flashquery/client.ts`, `src/agent/extensions/cate-flashquery/client.test.ts`
