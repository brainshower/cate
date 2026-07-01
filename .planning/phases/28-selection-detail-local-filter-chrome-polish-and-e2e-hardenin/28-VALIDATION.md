---
phase: 28
slug: selection-detail-local-filter-chrome-polish-and-e2e-hardenin
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-07-01
---

# Phase 28 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 for unit/jsdom tests; Playwright 1.60.0 for Electron E2E |
| **Config file** | `vitest.config.ts`, `playwright.config.ts` |
| **Quick run command** | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` |
| **Full suite command** | `npm run test:unit && npm run typecheck && npm run lint && npm run test:e2e` |
| **Estimated runtime** | ~90-180 seconds for focused Vitest; E2E/full suite depends on Electron startup |

---

## Sampling Rate

- **After every task commit:** Run the focused Vitest command for the files touched by the task.
- **After every plan wave:** Run `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` plus `npm run typecheck`.
- **Before `$gsd-verify-work`:** `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run test:e2e` must be green or have documented environment blockers.
- **Max feedback latency:** 180 seconds for focused non-E2E checks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 28-01-01 | 01 | 1 | REQ-023 | T-28-01 | Edge metadata overlay uses typed preload/main path; renderer does not access credentials | unit | `npm run test:unit -- src/renderer/lib/semanticConnectionsProvider.test.ts` | yes | green |
| 28-01-02 | 01 | 1 | REQ-012, REQ-013 | — | Missing/partial node metadata degrades without blanking selection view | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 28-01-03 | 01 | 1 | REQ-014 | — | Stale/deleted edges are excluded before user-facing grouping | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 28-02-01 | 02 | 2 | REQ-015 | — | Edge details render known metadata prose, not raw JSON dumps | unit/component | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 28-02-02 | 02 | 2 | REQ-019, REQ-020 | — | Target opening and narrow dock behavior preserve existing navigation and accessibility | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 28-03-01 | 03 | 3 | REQ-016, REQ-017, REQ-018 | T-28-02 | Filter is pure renderer logic and does not trigger provider/FlashQuery calls | unit/component | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 28-03-02 | 03 | 3 | REQ-022 | — | Chrome filter active state is separate from config state and counts stay pre-filter | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 28-04-01 | 04 | 4 | REQ-002, REQ-019, REQ-020, REQ-021, REQ-022 | T-28-03 | Deterministic E2E fixtures avoid live credentials and external FlashQuery dependency | E2E | `npm run test:e2e -- e2e/semantic-connections-graph.spec.ts` | yes | green |
| 28-04-02 | 04 | 4 | T-A-001, T-A-002, T-A-003, T-A-004 | — | Full regression commands prove unit, type, lint, and Electron flows | acceptance | `npm run test:unit && npm run typecheck && npm run lint && npm run test:e2e` | yes | green |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] Add missing Phase 28 unit tests `T-U-019`, `T-U-020`, `T-U-021`, `T-U-022`, and `T-U-027` in `src/renderer/lib/semanticConnections.test.ts` or adjacent helper tests.
- [x] Add missing provider test `T-U-024` in `src/renderer/lib/semanticConnectionsProvider.test.ts`.
- [x] Add component tests `T-C-030` through `T-C-062` and `T-C-065` in `src/renderer/panels/SemanticConnectionsPanel.test.tsx`; avoid collisions with existing Phase 27 test labels by keeping test names descriptive even if product IDs overlap.
- [x] Create `e2e/semantic-connections-graph.spec.ts` or extend the closest existing semantic graph E2E spec for `T-E-001` through `T-E-005`.
- [x] Run all verification commands under Node 20 or 22, not Node 26.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Narrow dock visual polish for dense expanded edge rows | REQ-020 | jsdom can assert class/DOM structure but not final Electron text overlap with native fonts | Open the graph panel in a 330-360px dock, expand edge rows with score pie/metadata/actions, and verify no text/control overlap in light and dark themes. |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target < 180s for focused non-E2E checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** validated

## Validation Audit 2026-07-01

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Phase 28 was retroactively audited against its PLAN/SUMMARY/VERIFICATION artifacts and current test infrastructure. All requirement rows map to existing unit, component, Electron E2E, lint, typecheck, and full regression coverage; no new tests were required.

Evidence at current HEAD includes the full Node 20 regression pass recorded in `.planning/v1.6-MILESTONE-AUDIT.md`: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e`.
