---
phase: 14
slug: shared-flashquery-contracts-and-ipc
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-03
updated: 2026-06-03T18:48:50Z
---

# Phase 14 - Validation Strategy

## Test Infrastructure

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- src/shared/ipc-channels.test.ts src/shared/flashqueryUri.test.ts src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts` |
| Full suite command | `npm run typecheck && npm test -- src/shared/ipc-channels.test.ts src/shared/flashqueryUri.test.ts src/shared/types.test.ts src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts` |
| Estimated runtime | Less than 60 seconds for focused suites |

## Sampling Rate

- After every task commit: run the plan-specific focused test command.
- After every plan wave: run the full suite command above.
- Before `$gsd-verify-work`: focused suites and `npm run typecheck` must be green.
- Max feedback latency: 60 seconds for focused suites.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14.1.1 | 14.1 | 1 | REQ-004 | 14-T1 | Renderer contract remains typed and compatible | unit/typecheck | `npm test -- src/shared/ipc-channels.test.ts src/shared/flashqueryUri.test.ts src/shared/types.test.ts && npm run typecheck` | yes | green |
| 14.1.2 | 14.1 | 1 | REQ-004 | 14-T1 | Preload exposes only declared FlashQuery methods | unit/typecheck | `npm test -- src/shared/ipc-channels.test.ts && npm run typecheck` | yes | green |
| 14.2.1 | 14.2 | 2 | REQ-004 | 14-T2 | MCP responses are normalized without leaking tokens | unit | `npm test -- src/main/flashquery/clientManager.test.ts` | yes | green |
| 14.2.2 | 14.2 | 2 | REQ-004 | 14-T2 | Search/index calls return safe normalized shapes | unit | `npm test -- src/main/flashquery/clientManager.test.ts` | yes | green |
| 14.3.1 | 14.3 | 3 | REQ-004 | 14-T3 | Renderer-controlled payloads are validated in main | unit | `npm test -- src/main/ipc/flashquery.test.ts` | yes | green |
| 14.3.2 | 14.3 | 3 | REQ-004 | 14-T3 | Invalid search and disconnected errors are safe | unit/typecheck | `npm test -- src/main/ipc/flashquery.test.ts && npm run typecheck` | yes | green |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All Phase 14 behaviors have automated verification. Manual or E2E validation for frontmatter editor UI and vault search UI belongs to later phases.

## Validation Sign-Off

- [x] All tasks have automated verify commands.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all missing references.
- [x] No watch-mode flags.
- [x] Feedback latency target under 60 seconds.
- [x] `nyquist_compliant: true` set in frontmatter.

## Validation Audit 2026-06-03

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

All Phase 14 target IDs T-U-001 through T-U-006 are covered by focused Vitest suites and `npm run typecheck`.

**Approval:** approved 2026-06-03
