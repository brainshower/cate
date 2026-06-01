---
phase: 8
phase_slug: upstream-sync-v1-1-0
date: 2026-06-01
status: planned
---

# Phase 8 Validation Strategy

## Source Of Truth

The validation source of truth is:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

Every implementation plan must cite the relevant test IDs from that document and must not substitute weaker local checks for product-defined gates.

## Required Gates

| Gate | Test IDs | Required By |
|------|----------|-------------|
| Baseline capture | T-A-001 | Plan 8.1 |
| Per-phase cumulative regression | T-A-002 | Plans 8.1-8.6 |
| Build/typecheck | T-A-003, T-A-004 | Plans 8.2-8.6 |
| Contract/security/session unit tests | T-U-001..T-U-009 | Plan 8.3 |
| Renderer unit/component tests | T-U-010..T-U-017 | Plan 8.4 |
| FlashQuery E2E | T-E-001..T-E-005 | Plans 8.3-8.6 once build is green |
| Visual evidence | T-A-005..T-A-009 | Plans 8.5-8.6 |
| Upstream smoke | T-M-001..T-M-005 | Plan 8.5 |
| Product acceptance | T-A-010 | Plan 8.6 |
| Packaged smoke | T-A-011 | Plan 8.6 if packaging/Electron deps changed |
| Process/provenance | T-A-012..T-A-015 | Plan 8.6 |

## Blocking Conditions

- Any raw `auth.token` in persisted workspace/session output.
- Any changed `flashquery:*` IPC channel string.
- Any unguarded E2E bridge without `CATE_E2E`.
- Any missing central-file conflict-review note.
- Any missing or untracked `docs/UPSTREAM-SYNC.md`.
- Any `.planning/` tracking regression.
- Any merge strategy that rebases/squashes upstream instead of recording `v1.1.0` ancestry.

