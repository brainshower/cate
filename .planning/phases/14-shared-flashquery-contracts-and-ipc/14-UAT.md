---
status: complete
phase: 14-shared-flashquery-contracts-and-ipc
source:
  - 14-01-SUMMARY.md
  - 14-02-SUMMARY.md
  - 14-03-SUMMARY.md
started: 2026-06-03T18:48:50Z
updated: 2026-06-03T18:48:50Z
---

## Current Test

[testing complete]

## Tests

### 1. URI Body and Frontmatter Parts
expected: FlashQuery URIs default to body, parse `?part=frontmatter`, keep encoded literal question marks inside `vaultPath`, and reject malformed part values.
result: pass
evidence: `npm test -- src/shared/flashqueryUri.test.ts src/main/flashquery/uri.test.ts`

### 2. Shared Channel, Preload, and Electron API Contract
expected: Shared types expose widened get/write/search/vault-index contracts; IPC channels include search and vault-index without collisions; preload and `ElectronAPI` signatures match runtime values.
result: pass
evidence: `npm test -- src/shared/types.test.ts src/shared/ipc-channels.test.ts && npm run typecheck`

### 3. Manager Document and Write Normalization
expected: `FlashQueryClientManager` sends requested include parts, normalizes body/frontmatter/version metadata, preserves legacy string writes, filters managed frontmatter fields, and returns safe write errors.
result: pass
evidence: `npm test -- src/main/flashquery/clientManager.test.ts`

### 4. Manager Search and Vault Index Normalization
expected: Search uses `include_archived: true`, defaults to mixed documents+memories with limit 50, maps empty filesystem/mixed query to list-all, rejects empty semantic search, and normalizes vault-index entries to `{ filename, fullPath }`.
result: pass
evidence: `npm test -- src/main/flashquery/clientManager.test.ts`

### 5. Main IPC Validation
expected: Main IPC registers eight FlashQuery invoke channels exactly once, validates get/write/search renderer-controlled payloads before manager dispatch, and returns safe typed failures for invalid search/write input.
result: pass
evidence: `npm test -- src/main/ipc/flashquery.test.ts`

### 6. Focused Phase Coverage
expected: T-U-001 through T-U-006 coverage references exist and all focused Phase 14 suites pass with typecheck.
result: pass
evidence: `rg -n "T-U-001|T-U-002|T-U-003|T-U-004|T-U-005|T-U-006" src/shared src/main && npm test -- src/shared/ipc-channels.test.ts src/shared/flashqueryUri.test.ts src/main/flashquery/uri.test.ts src/shared/types.test.ts src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts && npm run typecheck`

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None.
