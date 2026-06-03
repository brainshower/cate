---
phase: 16
phase_slug: vault-search-panel
created: 2026-06-03
updated: 2026-06-03T23:20:36Z
status: complete
nyquist_compliant: true
---

# Phase 16 Validation Strategy

## Validation Architecture

Phase 16 validation is centered on deterministic renderer/component coverage plus one Electron E2E workflow against the FlashQuery fixture server. The final coverage is Nyquist-compliant for the Phase 16 requirement set: every mapped requirement has automated component/unit and/or E2E evidence.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + Playwright Electron |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` |
| **Full suite command** | `npm test -- src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts src/renderer/lib/flashquerySearchReveal.test.ts src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx src/main/ipc/flashquery.test.ts && npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts && npm run test:e2e -- e2e/flashquery-vault-search.spec.ts && npm run typecheck` |
| **Estimated runtime** | ~25 seconds targeted, excluding build |

## Per-Task Verification Map

| Task ID | Plan | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|-------------|-----------|-------------------|-------------|--------|
| 16.1.1 | 16.1 | REQ-008 | unit | `npm test -- src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts` | yes | green |
| 16.1.2 | 16.1 | REQ-009 | component | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` | yes | green |
| 16.1.3 | 16.1 | REQ-010, REQ-012 | component | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` | yes | green |
| 16.2.1 | 16.2 | REQ-011, REQ-019 | component/unit | `npm test -- src/renderer/lib/flashquerySearchReveal.test.ts src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` | yes | green |
| 16.2.2 | 16.2 | REQ-011 | component | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` | yes | green |
| 16.2.3 | 16.2 | REQ-011 | component | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` | yes | green |
| 16.3.1 | 16.3 | REQ-009, REQ-010 | e2e fixture | `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` | yes | green |
| 16.3.2 | 16.3 | REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-019 | e2e | `npm run test:e2e -- e2e/flashquery-vault-search.spec.ts` | yes | green |
| 16.3.3 | 16.3 | REQ-008, REQ-009, REQ-010, REQ-011, REQ-012 | closeout | `rg -n "T-U-005|T-U-010|T-U-011|T-E-003|T-E-007" src e2e` | yes | green |

## Coverage Matrix

| Requirement/Test ID | Evidence | Status |
|---------------------|----------|--------|
| REQ-008 | Shared/registry/store tests and Vault Search E2E panel-open assertion | covered |
| REQ-009 / T-U-005 | `src/main/ipc/flashquery.test.ts`, component dispatch tests, fixture last-search args | covered |
| REQ-010 / T-U-010 | `FlashQueryVaultSearchPanel.test.tsx`, `e2e/flashquery-vault-search.spec.ts` | covered |
| REQ-011 / T-U-011 | `FlashQueryVaultSearchPanel.test.tsx`, reveal helper tests, E2E document/memory actions | covered |
| REQ-012 / T-E-007 | Component disconnect tests and fixture disconnect/reconnect E2E | covered |
| REQ-019 partial | Component and E2E copy path/reference assertions | covered |

## Manual-Only Verifications

All Phase 16 behaviors have automated verification. Full native macOS clipboard visual/manual coverage remains tracked by milestone manual test T-M-004 for Phase 20 scope.

## Validation Audit 2026-06-03

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

## Validation Sign-Off

- [x] All tasks have automated verification.
- [x] Sampling continuity maintained through per-plan targeted commands.
- [x] No watch-mode flags used.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-06-03
