---
phase: 26-browser-uplift
plan: 10
artifact: manual-evidence
created: 2026-06-26T20:37:00-03:00
status: manual-pending
---

# Phase 26 Manual Evidence

## T-M-001 Real-Site Login Persistence

Status: MANUAL PENDING

This check requires a human operator to sign into a low-risk third-party website from inside Cate. The agent did not perform the check because it requires user-selected credentials/account access and should not be automated or fabricated.

Required non-sensitive evidence to add after the human run:

- Date/time of the check.
- Low-risk site category, without credentials, cookies, tokens, account screenshots, or sensitive account identifiers.
- Same-workspace restart result.
- Different-workspace isolation result.
- Pass/fail notes.

Automated substitute already present: deterministic local fake-auth restart/session isolation E2E in `e2e/browser-uplift.spec.ts`. That strengthens REQ-001 automated coverage but does not replace this manual real-site checkpoint.
