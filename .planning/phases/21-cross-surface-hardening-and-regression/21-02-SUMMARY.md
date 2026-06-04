---
phase: 21-cross-surface-hardening-and-regression
plan: 02
status: complete
completed_at: 2026-06-04T21:31:30Z
requirements:
  - REQ-020
coverage:
  - T-E-001
  - T-E-002
  - T-E-003
  - T-E-004
  - T-E-005
  - T-E-006
  - T-E-006b
  - T-E-007
  - T-M-001
  - T-M-002
  - T-M-003
  - T-M-004
key-files:
  modified:
    - e2e/fixtures/flashquery-server.ts
    - e2e/fixtures/flashquery-server.spec.ts
    - e2e/flashquery-disconnect.spec.ts
  created:
    - .planning/phases/21-cross-surface-hardening-and-regression/21-UAT.md
---

# Plan 21-02 Summary

## Objective

Reconciled Phase 21 Electron E2E coverage for `REQ-020` and created the UAT evidence matrix for automated and live/manual checks.

## What Changed

- Reconciled deterministic fixture support with the real FlashQuery contract: vault-index replacement is proven through the existing `search({ list_all: true, entity_types: ['documents'] })` path rather than a non-existent `list_vault_index` MCP tool.
- Standardized fixture disconnect/reconnect control on the existing `setAvailable(false|true)` API.
- Extended the fixture Playwright spec with vault-index replacement and disconnect/reconnect coverage.
- Replaced the obsolete `T-E-010` disconnect label with the canonical `T-E-007 REQ-020` test title.
- Created `21-UAT.md` mapping `T-E-001` through `T-E-007` plus `T-E-006b` to fresh command evidence and carrying forward honest blockers for `T-M-001` through `T-M-004`.

## Verification

| Command | Status | Result |
| --- | --- | --- |
| `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | passed | 6 Playwright fixture tests passed |
| `npm run build` | passed | Electron main, preload, and renderer bundles built |
| `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts` | passed | 5 Electron tests passed |
| `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts e2e/flashquery-pi-diagnostics.spec.ts e2e/flashquery-pi-macro-trace.spec.ts` | passed | 3 Electron tests passed |
| `rg -n "T-E-010" ...` | passed | No obsolete `T-E-010` label remains in the Phase 21 E2E/UAT surface |

## Deviations from Plan

The plan listed `npm test -- e2e/fixtures/flashquery-server.spec.ts`, but the repo's Vitest config only includes `src/**/*.test.ts(x)`. The fixture file is a Playwright spec, so verification used `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts`.

**Total deviations:** 1 documented command correction.

## Self-Check: PASSED

Fresh focused Electron E2E evidence is passing and `21-UAT.md` records live/manual checks as blocked rather than overstating automated substitutes.
