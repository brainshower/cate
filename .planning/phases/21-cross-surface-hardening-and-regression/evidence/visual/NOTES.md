---
phase: 21-cross-surface-hardening-and-regression
status: passed-with-blockers
created: 2026-06-04
---

# Phase 21 Visual Evidence Notes

## UI Spec Reviewed

Reviewed `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Cate-FlashQuery Milestone 2 — UI Spec.md`, especially:

- §2.1 editor title-bar action row and Vault badge.
- §2.2 frontmatter dock-tab layout.
- §2.3 Vault Search panel visual requirements.
- §2.4 Pi `@` mention popover.
- §2.5 Pi ToolCard observability surfaces.
- §2.6 refresh modal and clipboard menu textual surfaces.

## Command Evidence

| Command | Status | Notes |
| --- | --- | --- |
| `npm run build` | passed | Refreshed Electron bundle before visual E2E. |
| `npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts` | passed | Captured Phase 21 screenshot files in this directory. |

## Screenshot Evidence

| Surface | Files | Status |
| --- | --- | --- |
| FlashQuery vault/editor surfaces, including editor title actions and Vault badge | `flashquery-surfaces-dark.png`, `flashquery-surfaces-light.png` | passed |
| Connection chip live state | `flashquery-status-chip-live-dark.png`, `flashquery-status-chip-live-light.png` | passed |
| Connection chip connecting state | `flashquery-status-chip-connecting-dark.png`, `flashquery-status-chip-connecting-light.png` | passed |
| Connection chip disconnected state and tooltip trigger | `flashquery-status-chip-disconnected-dark.png`, `flashquery-status-chip-disconnected-light.png` | passed |

All generated PNG files are non-empty and have expected dimensions: full-page captures are 1200x800; status-chip captures are 220x32.

## Coverage Notes

- Editor refresh/frontmatter behavior is visually represented in the editor/vault surface screenshots and behaviorally covered by `T-E-001`, `T-E-002`, and `T-U-021`.
- Vault Search is visually specified in the UI Spec and behaviorally covered by `T-E-003` plus `T-U-021`; this visual evidence flow does not currently create a Vault Search panel screenshot.
- Pi ToolCard diagnostics are behaviorally covered by `T-E-006` and `T-E-006b`; this visual evidence flow does not currently capture expanded ToolCard screenshots.
- Pi `@` mention popover is behaviorally covered by `T-E-004` and `T-U-021`; this visual evidence flow does not currently capture the popover.
- Clipboard menus are covered through component/E2E menu and clipboard assertions; native clipboard verification now passes through `e2e/flashquery-native-clipboard.spec.ts` as `T-M-004`.

## Blockers

Visual screenshot capture for Vault Search, expanded Pi ToolCard, Pi `@` mention popover, and clipboard-menu screenshots is not yet automated by `e2e/flashquery-visual-evidence.spec.ts`. The underlying behavior for those surfaces passed focused E2E/component coverage; screenshot-specific evidence remains a visual evidence limitation, not a known product defect.

Manual/live blockers remain recorded in `21-UAT.md`:

- `T-M-001`: blocked pending real FlashQuery endpoint and configured native Pi provider.
- `T-M-002`: blocked pending real host-model `call_macro`, progress-emitting macro, `needs_user_input`, and disconnected macro check.
- `T-M-003`: blocked pending live host-model `call_model` with document refs and diagnostics.
- `T-M-004`: passed by native clipboard E2E.
