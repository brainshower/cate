---
phase: 27
slug: graph-data-contract-and-whole-document-graph-view
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-30
---

# Phase 27 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 with node/jsdom environments |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts` |
| **Full suite command** | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx && npm run typecheck` |
| **Estimated runtime** | ~90-180 seconds |

Implementation verification should use Node 20 or 22. The research pass observed shell Node `v26.0.0`, which is outside Cate's `>=20 <23` engine range.

## Sampling Rate

- **After every task commit:** Run the narrow command for the touched layer:
  - Pure renderer/provider: `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts`
  - Main/preload IPC: `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts`
  - Panel UI: `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx`
- **After every plan wave:** Run the full suite command above.
- **Before `$gsd-verify-work`:** Full suite and `npm run typecheck` must be green.
- **Max feedback latency:** 3 task commits.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | REQ-001, REQ-004 | T-27-01 | Relation metadata is complete and optional score does not reject graph rows | unit | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts` | yes | green |
| 27-01-02 | 01 | 1 | REQ-003, REQ-021 | T-27-02 | Graph payload normalization preserves valid partial rows and redacts credentials | unit | `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts` | yes | green |
| 27-01-03 | 01 | 1 | REQ-003 | T-27-03 | Main IPC validation and shared types accept graph-summary include/options without renderer privilege | unit | `npm run test:unit -- src/main/ipc/flashquery.test.ts src/main/flashquery/clientManager.test.ts && npm run typecheck` | yes | green |
| 27-02-01 | 02 | 2 | REQ-002, REQ-005, REQ-006 | T-27-04 | Provider derives typed/mixed/embeddings-only modes while preserving fallback behavior | unit | `npm run test:unit -- src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/lib/semanticConnections.test.ts` | yes | green |
| 27-02-02 | 02 | 2 | REQ-023, REQ-021 | T-27-05 | `query_graph` bridge validates renderer input and never exposes credentials | unit | `npm run test:unit -- src/main/ipc/flashquery.test.ts src/preload/index.test.ts` | yes | green |
| 27-02-03 | 02 | 2 | REQ-023, REQ-021 | T-27-06 | Node metadata backfill is progressive and per-chunk failure tolerant | unit | `npm run test:unit -- src/renderer/lib/semanticConnectionsProvider.test.ts` | yes | green |
| 27-03-01 | 03 | 3 | REQ-007, REQ-008, REQ-009 | T-27-07 | Whole-document Summary, attention, and sections do not claim clean state while metadata loads | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 27-03-02 | 03 | 3 | REQ-010, REQ-011 | T-27-08 | Grouped connections, Top-N, and relation filters affect only connection lists | component/unit | `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |
| 27-03-03 | 03 | 3 | REQ-019, REQ-020, REQ-022 | T-27-09 | Dock-native navigation and chrome state remain accessible and scoped | component | `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx` | yes | green |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:

- `src/renderer/lib/semanticConnections.test.ts`
- `src/renderer/lib/semanticConnectionsProvider.test.ts`
- `src/main/flashquery/clientManager.test.ts`
- `src/main/ipc/flashquery.test.ts`
- `src/preload/index.test.ts`
- `src/renderer/panels/SemanticConnectionsPanel.test.tsx`

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Narrow dock text fit and no overlap | REQ-020 | jsdom cannot fully prove dock resizing/visual overlap | During implementation, inspect the panel at narrow dock widths or add component assertions for responsive classes where visual inspection is unavailable. |

## Validation Sign-Off

- [x] All tasks have automated verify commands or existing Wave 0 files
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all required references
- [x] No watch-mode flags
- [x] Feedback latency target defined
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated

## Validation Audit 2026-07-01

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

Phase 27 was retroactively audited against its PLAN/SUMMARY/VERIFICATION artifacts and current test infrastructure. All requirement rows map to existing unit, component, main IPC, preload, and typecheck coverage; no new tests were required.

Evidence at current HEAD includes the full Node 20 regression pass recorded in `.planning/v1.6-MILESTONE-AUDIT.md`: `npm run lint`, `npm run typecheck`, `npm test`, and `npm run test:e2e`.
