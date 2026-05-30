---
phase: 07-cross-cutting-regression
reviewed: 2026-05-30T02:11:53Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - e2e/drag-move.spec.ts
  - e2e/drag-split.spec.ts
  - e2e/fixtures/electron-app.ts
  - e2e/fixtures/flashquery-server.spec.ts
  - e2e/fixtures/flashquery-server.ts
  - e2e/flashquery-disconnect.spec.ts
  - e2e/flashquery-happy-path.spec.ts
  - e2e/flashquery-persistence.spec.ts
  - e2e/flashquery-vault-browse.spec.ts
  - playwright.config.ts
  - src/main/flashquery/clientManager.test.ts
  - src/main/flashquery/clientManager.ts
  - src/main/index.ts
  - src/main/ipc/flashquery.test.ts
  - src/main/ipc/flashquery.ts
  - src/renderer/components/VaultBadge.test.tsx
  - src/renderer/lib/e2eHarness.ts
  - src/renderer/lib/session.ts
  - src/renderer/panels/FlashQueryVaultPanel.tsx
  - src/renderer/stores/appStore.ts
  - src/shared/types.ts
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
status: clean
---

# Phase 7: Code Review Report

**Reviewed:** 2026-05-30T02:11:53Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** clean

## Summary

Reviewed the Phase 7 FlashQuery connection/persistence path, renderer vault panel behavior, session/workspace persistence changes, E2E launch harness, FlashQuery MCP stub, new FlashQuery E2E specs, drag regression specs, and focused changed tests. The initial review found one E2E contract gap; it has been fixed and verified. No open critical, warning, or info findings remain.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: FlashQuery E2E Stub Does Not Validate The Persisted Bearer Token Value

**File:** `e2e/fixtures/flashquery-server.ts:169`
**Status:** resolved in `d8b8bb2`
**Issue:** The new MCP stub only checks that `req.headers.authorization` is present before accepting `POST /mcp`. The Phase 7 persistence requirement is specifically about preserving the workspace-scoped stored token across restart, but the E2E server would accept `Bearer wrong-token`, a stale token from another workspace, or any arbitrary bearer value. That leaves the restart specs unable to catch token-mapping regressions that still send some Authorization header.
**Fix:** Make the stub validate an expected bearer value and pass that expected value from the specs. For example:

```ts
export interface FlashQueryStubServerOptions {
  expectedBearerToken?: string
}

export async function startFlashQueryStubServer(
  options: FlashQueryStubServerOptions = {},
): Promise<FlashQueryStubServer> {
  const expectedAuthorization = `Bearer ${options.expectedBearerToken ?? 'fixture-token'}`

  // ...
  if (req.method === 'POST' && url.pathname === '/mcp') {
    mcpPostCount += 1
    if (req.headers.authorization !== expectedAuthorization) {
      jsonResponse(res, 401, { error: 'invalid_authorization' })
      return
    }
    // ...
  }
}
```

Then start each FlashQuery E2E server with the token that the test saves in the dialog, such as `startFlashQueryStubServer({ expectedBearerToken: 'persisted-e2e-token' })`, so T-E-006/T-E-007 fail if the wrong workspace token is used after restart.

**Resolution:** `startFlashQueryStubServer` now accepts `expectedBearerToken`, rejects missing/wrong POST authorization, fixture coverage verifies wrong-token failure and caller-provided-token success, and every FlashQuery E2E spec starts the stub with the token it saves in the dialog.

**Verification:** `npx -p node@22 npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts e2e/flashquery-persistence.spec.ts e2e/flashquery-happy-path.spec.ts e2e/flashquery-disconnect.spec.ts e2e/flashquery-vault-browse.spec.ts` passed with 7 tests.

---

_Reviewed: 2026-05-30T02:11:53Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
