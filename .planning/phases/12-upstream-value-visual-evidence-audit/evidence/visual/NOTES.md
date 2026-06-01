# Phase 12 Visual Theme Audit Notes

**Date:** 2026-06-01
**Plan:** 12.1 Theme Token And Visual Evidence Audit
**Scope:** Current post-handoff tree audit for REQ-004, REQ-022, and visual evidence IDs T-A-005, T-A-006, T-A-007, T-A-008, and T-A-009.

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

The requirements document controls REQ-004 and REQ-022. The test plan controls T-A-005 through T-A-009 and requires light/dark visual evidence for the vault badge, sidebar vault view, connection dialog, status chip states, and editor tabs with the vault badge.

## Phase 11 Baseline Used

Phase 11 commit `9ea8768` is the current renderer proof baseline for the visual-surface audit:

- T-U-011: `FlashQueryVaultPanel.test.tsx` imports `VIEW_META` and `SidebarViewContent`, proving the `flashqueryVault` icon/title and sidebar mount path resolve to `FlashQueryVaultPanel`.
- T-U-012: `DockTabBar.test.tsx` renders a `flashquery://` editor tab, proves `VaultBadge` is present in tab chrome, and verifies the widened vault-editor tab treatment.
- T-U-015: `WorkspaceTab.test.tsx` lists a `flashqueryVault` panel and focuses its dock stack.

This Plan 12.1 audit does not replay the Phase 8 merge. It audits current post-handoff visual/theme proof.

## Theme System Inventory

| Surface | Current theme-token evidence | Visual ID |
| --- | --- | --- |
| `VaultBadge` | Uses shared `ChipSurface` for chip geometry and neutral chrome, `text-primary`, `text-muted`, `bg-surface-4`, and `border-subtle` token classes for text and tooltip. The vault icon retains `#5AD8B8` as the FlashQuery accent. | T-A-005, T-A-009 |
| `DockTabBar` | Vault editor tabs are detected through `flashquery://`, get `max-w-[280px]` to keep the badge legible, and inherit tab backgrounds from `--node-chrome-active-bg`, `--node-chrome-bg`, `--surface-3`, and `--surface-1`. The placeholder uses `--focus-blue` with a fallback for non-themed documents. | T-A-009 |
| `FlashQueryVaultPanel` | Panel chrome uses `bg-surface-4`, `border-subtle`, `text-primary`, `text-muted`, `text-secondary`, `bg-surface-5`, and `hover:bg-hover`. Status rendering goes through the shared `Chip` component. Folder/loading accents use Tailwind teal utilities. | T-A-006, T-A-008 |
| `FlashQueryConnectionDialog` | Dialog shell, fields, borders, helper text, and buttons use `bg-surface-4`, `bg-surface-5`, `bg-hover`, `border-subtle`, `text-primary`, `text-secondary`, `text-muted`, and `focus:border-focus`. It retains FlashQuery accent rings and primary save color using `#5AD8B8`. | T-A-007 |
| `Sidebar` | The `flashqueryVault` view is first-class in `VIEW_META`, renders `FlashQueryVaultPanel` through `SidebarViewContent`, and uses activity/sidebar chrome derived from `--surface-0`, `--surface-1`, tokenized `color-mix(...)`, `border-subtle`, and standard text token classes. | T-A-006 |
| `themeManager` and `src/shared/theme.ts` / `src/shared/themes/*` | The unified theme engine merges built-in or custom `Theme.app` maps over `BASE_DARK` or `BASE_LIGHT`, writes app CSS variables to `<html>`, sets `data-theme` to `dark` or `light`, and persists the active theme for boot background continuity. | REQ-004 |

## Retained Color Exceptions

The current tree still has retained hard-coded color values in FlashQuery-adjacent visual surfaces. They are allowed under REQ-004 only because Plan 12.1 refreshes current light/dark visual evidence and REVIEW.md records explicit pass/fail verdicts.

| Literal | File/surface | Assessment |
| --- | --- | --- |
| `#5AD8B8` | `VaultBadge` icon; `FlashQueryConnectionDialog` icon, focus rings, and save button; shared `Chip` connecting/unknown spinner/dot. | FlashQuery brand/accent color retained. Must pass T-A-005, T-A-007, T-A-008, and T-A-009 light/dark evidence. |
| `#34C759` | Shared `Chip` live status dot. | Status semantic color retained for T-A-008 evidence. |
| `#FF453A` | Shared `Chip` disconnected status dot. | Status semantic color retained for T-A-008 evidence. |
| `text-teal-400` | `FlashQueryVaultPanel` folder/loading/refresh accents. | Tailwind semantic accent retained; must remain legible in T-A-006 and T-A-008 evidence. |
| `text-red-400`, `bg-red-600/10`, `bg-green-600/10`, `text-green-400` | `FlashQueryConnectionDialog` success/error and destructive states. | Semantic success/error colors retained; included in T-A-007 visual review scope. |

## Verification Commands Recorded

- `rg -n "VaultBadge|flashqueryVault|FlashQuery Vault|theme|--|#5AD8B8|status|Can't reach FlashQuery|FlashQuery Connection" src/renderer/components/VaultBadge.tsx src/renderer/docking/DockTabBar.tsx src/renderer/sidebar/Sidebar.tsx src/renderer/panels/FlashQueryVaultPanel.tsx src/renderer/dialogs/FlashQueryConnectionDialog.tsx src/renderer/lib/themeManager.ts src/shared/theme.ts src/shared/themes`

## Task 12.1.1 Result

No source remediation was required during the theme-token inventory. Current code mostly uses unified theme tokens for app chrome and text, with the retained FlashQuery accent/status color exceptions listed above pending fresh Phase 12 visual evidence.
