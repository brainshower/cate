---
phase: 26
slug: browser-uplift
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-06-26
---

# Phase 26 — Validation Strategy

> Per-phase validation contract for Browser Uplift execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + Playwright 1.60.0 |
| **Config files** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npx -p node@22 npm test -- <target-file>` |
| **Full suite command** | `npx -p node@22 npm run typecheck && npx -p node@22 npm test && npx -p node@22 npm run test:e2e` |
| **Estimated runtime** | Focused Vitest: seconds; full unit/type/E2E suite: minutes |

## Sampling Rate

- **After every task commit:** Run the focused Vitest files introduced or modified by that task.
- **After every shared/preload/main contract task:** Run `npx -p node@22 npm run typecheck`.
- **After every plan wave:** Run all tests for that product sub-slice plus `npx -p node@22 npm run typecheck`.
- **Before `$gsd-verify-work`:** Run the full suite command and record manual `T-M-001` evidence.
- **Max feedback latency:** No three consecutive implementation tasks without automated verification.
- **No deferred testing:** Each wave must land the unit, integration, and E2E tests that validate the behavior it implements. Wave 10 audits and runs the complete matrix; it does not absorb missing feature-slice tests from Waves 1 through 9.

## Coverage Matrix

| Requirement | Required Test IDs | Primary Commands |
|---|---|---|
| REQ-001 | T-U-001, T-U-002, T-U-029, T-E-001, T-E-002, T-E-003, T-E-020, T-E-021, T-M-001 | `npx -p node@22 npm test -- src/renderer/panels/browserPartition.test.ts`; `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` |
| REQ-002 | T-U-003, T-U-004, T-I-001, T-E-004 | `npx -p node@22 npm test -- src/main/browserStateStore.test.ts src/main/ipc/browser.test.ts` |
| REQ-003 | T-U-005, T-U-006, T-U-007, T-U-008, T-U-030, T-E-005, T-E-006 | `npx -p node@22 npm test -- src/main/browserStateStore.test.ts src/renderer/stores/browserStore.test.ts` |
| REQ-004 | T-U-009, T-U-010, T-U-011, T-E-007, T-E-008 | `npx -p node@22 npm test -- src/renderer/panels/browserLoadError.test.ts` |
| REQ-005 | T-U-012, T-U-013, T-E-009 | `npx -p node@22 npm test -- src/renderer/panels/BrowserPanel.test.tsx` |
| REQ-006 | T-U-014, T-U-015, T-U-016, T-E-010, T-E-011 | `npx -p node@22 npm test -- src/main/webSecurity.test.ts src/renderer/panels/BrowserPanel.test.tsx` |
| REQ-007 | T-U-017, T-U-018, T-U-030, T-E-012, T-E-013 | `npx -p node@22 npm test -- src/renderer/stores/browserStore.test.ts src/renderer/panels/BookmarksBar.test.tsx` |
| REQ-008 | T-U-019, T-U-020, T-U-021, T-U-031, T-E-014 | `npx -p node@22 npm test -- src/renderer/panels/BrowserMenu.test.tsx src/renderer/panels/BrowserSettingsPopover.test.tsx src/main/store.test.ts src/renderer/settings/BrowserSettings.test.tsx` |
| REQ-009 | T-U-022, T-U-023, T-U-024, T-I-002, T-I-003, T-E-015 | `npx -p node@22 npm test -- src/main/browserStateStore.test.ts src/main/ipc/browser.test.ts src/renderer/panels/BrowserSettingsPopover.test.tsx` |
| REQ-010 | T-I-004, T-I-005, T-I-006, T-E-016 | `npx -p node@22 npm test -- src/main/ipc/capture.test.ts` |
| REQ-011 | T-U-025, T-U-026, T-E-017 | `npx -p node@22 npm test -- src/renderer/lib/portalRegistry.test.ts` |
| REQ-012 | T-U-027, T-U-028, T-E-018, T-E-019 | `npx -p node@22 npm test -- src/shared/ipc-channels.test.ts src/main/ipc/browser.test.ts`; `npx -p node@22 npm run test:e2e -- e2e/flashquery-persistence.spec.ts` |

## Wave 0 Requirements

- [ ] `src/renderer/panels/browserPartition.ts` and `.test.ts` or an equivalent tested helper for REQ-001.
- [ ] `src/renderer/panels/browserLoadError.ts` and `.test.ts` for REQ-004.
- [ ] `src/main/browserStateStore.ts` and `.test.ts` for REQ-002, REQ-003, and REQ-009.
- [ ] `src/main/ipc/browser.ts` and `.test.ts` for browser state and clear-data IPC.
- [ ] `src/main/ipc/capture.ts` and `.test.ts` for REQ-010.
- [ ] `src/renderer/stores/browserStore.ts` and `.test.ts` for workspace-scoped selectors and invalidation.
- [ ] `e2e/browser-uplift.spec.ts` and local HTTP fixture helpers for E2E coverage.
- [ ] E2E harness additions for deterministic browser panel creation, webview inspection, partition/cookie checks, and optional crash simulation, gated by `CATE_E2E=1`.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real third-party login persists across restart | REQ-001 / T-M-001 | Public login flows require credentials and should not be automated in CI | Sign into a low-risk real website in one workspace, restart Cate, reopen that workspace, and record whether the session persists without leaking to another workspace. |

## Phase Completion Gate

Before Phase 26 is considered complete:

- All plan summaries must exist.
- Each summary must state that downstream agents read the Browser Uplift requirements and test plan first.
- Each Wave 1 through Wave 9 summary must list the feature-slice tests added or updated in that wave and their latest command results.
- `npx -p node@22 npm run typecheck` must pass.
- Focused unit/integration tests for each implemented sub-slice must pass before moving to the next sub-slice.
- `npx -p node@22 npm run test:e2e -- e2e/browser-uplift.spec.ts` must pass, with any crash simulation hook documented if used.
- `npx -p node@22 npm run test:e2e -- e2e/flashquery-persistence.spec.ts` must pass if shared preload/settings/FlashQuery-adjacent files changed.
- Manual `T-M-001` evidence must be captured in a manual acceptance artifact or final phase summary.

## Validation Sign-Off

- [ ] All tasks have automated verify commands or explicit Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks without automated verification.
- [ ] Wave 0 covers all missing test scaffolds.
- [ ] No watch-mode flags in verification commands.
- [ ] Node 20/22 is used for verification, not local Node 26.
- [ ] `nyquist_compliant: true` is set in frontmatter.

**Approval:** pending
