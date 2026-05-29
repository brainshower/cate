---
phase: 03
slug: ipc-surface
status: complete
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-29
updated: 2026-05-29
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for FlashQuery IPC surface execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts src/main/flashquery/clientManager.test.ts src/main/flashquery/uri.test.ts` |
| **Full suite command** | `npx -p node@22 npm run typecheck && npx -p node@22 npm test` |
| **Estimated runtime** | ~15-30 seconds for focused Phase 3 checks |

## Sampling Rate

- **After every task commit:** Run the focused Vitest file for the touched behavior.
- **After every plan wave:** Run `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts src/main/flashquery/clientManager.test.ts src/main/flashquery/uri.test.ts`.
- **Before `$gsd-verify-work`:** Focused Phase 3 suite and typecheck must be green.
- **Max feedback latency:** ~30 seconds.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | REQ-007..012 | T-03-01-S / T-03-01-E | Channel constants and preload API keep renderer behind typed IPC, not MCP. | unit | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts` | yes | green |
| 03-01-02 | 01 | 1 | REQ-007..012 | T-03-01-I | Shared result/status types expose no token-returning fields. | typecheck | `npx -p node@22 npm run typecheck` | yes | green |
| 03-01-03 | 01 | 1 | REQ-007..012 | T-03-01-E | Preload exposes domain methods only. | unit/typecheck | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts && npx -p node@22 npm run typecheck` | yes | green |
| 03-01-04 | 01 | 1 | REQ-007..012 | T-03-01-S | Main registers all renderer-to-main FlashQuery invoke channels exactly once. | unit | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts` | yes | green |
| 03-02-01 | 02 | 2 | REQ-007 | T-03-02-S / T-03-02-I | Set/clear connection validates URL, preserves centralized token handling, and avoids token leaks. | unit | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts` | yes | green |
| 03-02-02 | 02 | 2 | REQ-007 | T-03-02-T / T-03-02-D | Workspace metadata mutation and manager disposal occur through central paths. | unit | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts src/main/flashquery/clientManager.test.ts` | yes | green |
| 03-02-03 | 02 | 2 | REQ-011 | T-03-02-I | Status broadcasts are renderer-safe and include error only for disconnected states. | unit | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts` | yes | green |
| 03-02-04 | 02 | 2 | REQ-011 | T-03-02-D | Status bridge registration is idempotent. | unit | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts` | yes | green |
| 03-03-01 | 03 | 3 | REQ-008..010 | T-03-03-T / T-03-03-I | IPC list/get/write handlers delegate to domain manager methods and preserve response semantics. | unit | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts` | yes | green |
| 03-03-02 | 03 | 3 | REQ-008..010, REQ-012 | T-03-03-T / T-03-03-I | Manager tool calls use exact list_vault, get_document body-only, and write_document update-only argument shapes. | unit | `npx -p node@22 npx vitest run src/main/flashquery/clientManager.test.ts src/main/flashquery/uri.test.ts` | yes | green |
| 03-03-03 | 03 | 3 | REQ-008..010 | T-03-03-I2 / T-03-03-D | MCP response parsing handles malformed JSON and token-bearing failures safely. | unit | `npx -p node@22 npx vitest run src/main/flashquery/clientManager.test.ts` | yes | green |
| 03-03-04 | 03 | 3 | REQ-008..010 | T-03-03-E | IPC exposes list/get/write only, no generic MCP executor. | unit/typecheck | `npx -p node@22 npx vitest run src/main/ipc/flashquery.test.ts && npx -p node@22 npm run typecheck` | yes | green |

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

## Manual-Only Verifications

All Phase 3 behaviors have automated verification. Later UI phases will add human-visible panel/editor checks.

## Validation Sign-Off

- [x] All tasks have automated verify coverage.
- [x] Sampling continuity: no 3 consecutive tasks without automated verify.
- [x] Wave 0 covers all MISSING references.
- [x] No watch-mode flags.
- [x] Feedback latency < 30s for focused checks.
- [x] `nyquist_compliant: true` set in frontmatter.

**Approval:** approved 2026-05-29
