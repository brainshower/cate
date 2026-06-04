---
phase: 21-cross-surface-hardening-and-regression
plan: 03
status: complete-with-blockers
completed_at: 2026-06-04T21:41:10Z
requirements:
  - REQ-020
coverage:
  - T-M-001
  - T-M-002
  - T-M-003
  - T-M-004
key-files:
  modified:
    - e2e/flashquery-visual-evidence.spec.ts
    - .planning/phases/21-cross-surface-hardening-and-regression/21-UAT.md
  created:
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/NOTES.md
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-surfaces-dark.png
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-surfaces-light.png
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-status-chip-live-dark.png
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-status-chip-live-light.png
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-status-chip-connecting-dark.png
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-status-chip-connecting-light.png
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-status-chip-disconnected-dark.png
    - .planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/flashquery-status-chip-disconnected-light.png
---

# Plan 21-03 Summary

## Objective

Completed Phase 21 manual/UAT evidence reconciliation and refreshed visual evidence notes for Milestone 2 visible surfaces.

## What Changed

- Updated `21-UAT.md` with a visual evidence section referencing Phase 21 screenshots and explicitly carrying forward blocked manual/live checks.
- Narrowed `e2e/flashquery-visual-evidence.spec.ts` so the visual evidence flow writes only to the Phase 21 evidence directory during this closeout.
- Captured Phase 21 dark/light full-page FlashQuery surface screenshots and live/connecting/disconnected status-chip screenshots.
- Created `evidence/visual/NOTES.md` with UI Spec sections reviewed, screenshot paths, command results, and blocker notes for surfaces not currently captured by the visual flow.

## Verification

| Command | Status | Result |
| --- | --- | --- |
| `npm run build` | passed | Electron bundle rebuilt before visual E2E |
| `npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts` | passed | 1 visual evidence test passed |
| `test -f .../21-UAT.md && rg -n "T-M-001|T-M-002|T-M-003|T-M-004|..." .../21-UAT.md` | passed | Manual rows and statuses found |
| `test -f .../evidence/visual/NOTES.md && rg -n "UI Spec|Vault Search|ToolCard|clipboard" .../NOTES.md` | passed | Visual evidence notes cover required surfaces |

## Manual Checkpoint

No real FlashQuery endpoint, configured native Pi provider, progress-emitting macro, host-model `call_model` run, or human native macOS clipboard paste evidence was available in this session. `21-UAT.md` keeps `T-M-001`, `T-M-002`, `T-M-003`, and `T-M-004` blocked with exact prerequisites.

## Deviations from Plan

The existing visual evidence flow does not screenshot Vault Search, expanded Pi ToolCards, Pi `@` mention popover, or clipboard menus. Those surfaces remain covered behaviorally by focused unit/component/E2E suites, and screenshot limitations are recorded in `evidence/visual/NOTES.md`.

**Total deviations:** 1 documented visual-evidence limitation.

## Self-Check: PASSED WITH BLOCKERS

Automated visual evidence and UAT validation passed. Manual/live evidence remains blocked honestly and is not marked passed.
