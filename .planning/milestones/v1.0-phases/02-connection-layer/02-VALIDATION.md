---
phase: 2
slug: connection-layer
status: compliant
nyquist_compliant: true
wave_0_complete: true
created: 2026-05-30
audit_source: retroactive
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Retroactively created during milestone v1.0 audit on 2026-05-30. Original Phase 2 execution shipped `02-VERIFICATION.md` (passed, 10/10 must-haves) but no `02-VALIDATION.md`. This document reconstructs the validation contract from the SUMMARY/VERIFICATION/source-test evidence.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx -p node@22 npm test -- src/main/flashquery/clientManager.test.ts` |
| **Full suite command** | `npx -p node@22 npm test` |
| **Estimated runtime** | ~0.5 s (focused) / ~30 s (full unit suite) |

---

## Sampling Rate

- **After every task commit:** Run the quick command.
- **After every plan wave:** Run the full suite.
- **Before `/gsd:verify-work`:** Full suite must be green.
- **Max feedback latency:** 30 seconds.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | REQ-004 | — | First-use probe of `GET /mcp/info`, no Authorization header even when a stored token exists | unit | `npx vitest run src/main/flashquery/clientManager.test.ts` | ✅ | ✅ green |
| 2-01-02 | 01 | 1 | REQ-011 | — | Probe failure transitions status to `disconnected` and surfaces error context | unit | same | ✅ | ✅ green |
| 2-02-01 | 02 | 1 | REQ-005 | — | Successful probe transitions to `live` with `version` + `instance_id`; failure schedules retry with exponential backoff (2s → 60s cap) | unit | same | ✅ | ✅ green |
| 2-02-02 | 02 | 1 | REQ-011 | — | Disconnect/reconnect events emit through subscribers; retry timer cleared on success or workspace disposal | unit | same | ✅ | ✅ green |
| 2-03-01 | 03 | 1 | REQ-006 | — | `subscribe<T>(workspaceId, eventType, handler)` is generic, returns an unsubscribe, isolates per workspace and per event type, and accepts the open `(string & {})` future-event escape hatch | unit | same | ✅ | ✅ green |
| 2-03-02 | 03 | 1 | REQ-011 | — | Subscription payloads conform to `FlashQueryStatusPayload` shape; cross-workspace events do not bleed | unit | same | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Last green run:** 2026-05-30 — 37 tests passed in `src/main/flashquery/clientManager.test.ts` (~0.2 s). Audit re-run confirmed during Phase 1 validation in the same pass.

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.* Phase 1 established the test file `src/main/flashquery/clientManager.test.ts`; Phase 2 expanded it across three plans without adding new infrastructure.

Tests added by Phase 2:

- Plan 01 (REQ-004, REQ-011): T-U-021 through T-U-025 — probe behavior, no-auth header, error classification (10 tests at landing time)
- Plan 02 (REQ-005, REQ-011): T-U-026 through T-U-032 — fake-timer coverage for connecting→live, retry backoff, timer cleanup (15 tests at landing time)
- Plan 03 (REQ-006, REQ-011): T-U-033 through T-U-039 — subscription delivery, unsubscribe, workspace/event isolation, payload shape (19 tests at landing time)

Current count in `clientManager.test.ts`: 37 tests (grew across phases 3-7 as the manager picked up additional behavior).

---

## Manual-Only Verifications

*All phase behaviors have automated verification.* Phase 2 was a no-UI / no-network-rendering phase; every behavior is unit-testable with fake timers and a stubbed fetch.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references *(N/A — Phase 1 established test file)*
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-05-30 (retroactive; verified via re-run of focused command on `main` showing 37/37 tests green)

---

## Validation Audit 2026-05-30

| Metric | Count |
|--------|-------|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |

**Notes:** Audit performed during milestone v1.0 close-out. Original phase shipped with `02-VERIFICATION.md` (passed, 10/10) and `02-REVIEW.md` (status: clean) but no `02-VALIDATION.md`. All 4 milestone REQs (REQ-004, REQ-005, REQ-006, REQ-011) trace to currently-passing unit tests. No remediation needed.
