# Phase 11 Renderer Surface Evidence

**Date:** 2026-06-01
**Plan:** 11.1 Renderer Surface Proof Audit
**Scope:** Post-handoff `main` renderer proof for FlashQuery appStore, panel registry, sidebar, workspace tab, dock tab, command palette, vault badge, editor save path, URI helpers, and connection dialog behavior.

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

The requirements document is the behavior source of truth for REQ-003, REQ-007, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-019, REQ-024, and REQ-025. The test plan is the verification source of truth for T-U-010 through T-U-017 and supporting E2E coverage.

## App Store And Panel Factory

| Proof ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| T-U-010 | REQ-003, REQ-012 | `src/renderer/stores/appStore.ts` exposes `createFlashQueryVault(workspaceId, position?, placement?)`, creates a panel with `type: 'flashqueryVault'`, title `FlashQuery Vault`, and routes placement through `placePanel`. | Passed |
| T-U-010 | REQ-012 | `src/shared/types.ts` keeps `PanelType` including `flashqueryVault` and `PANEL_DEFAULT_SIZES.flashqueryVault` at `{ width: 280, height: 440 }`. | Passed |
| T-U-010 | REQ-003, REQ-012 | `src/renderer/panels/registry.ts` registers `flashqueryVault` and calls `useAppStore.getState().createFlashQueryVault(...)`. `AgentPanel` remains split/lazy-loaded, preserving the upstream provider refactor alongside FlashQuery registration. | Passed |

Fresh verification:

- `npm test -- src/renderer/stores/appStore.test.ts src/renderer/panels/registry.test.ts` -> 2 files, 8 tests passed.
- `npm run typecheck` -> exit 0.

No focused remediation was needed.

## Discoverability Surfaces

| Proof ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| T-U-011 | REQ-011 | `src/renderer/sidebar/Sidebar.tsx` keeps `flashqueryVault` in `VIEW_META` with `Vault` icon and `FlashQuery Vault` title, and routes the view to `FlashQueryVaultPanel`. | Passed |
| T-U-012 | REQ-014 | `src/renderer/components/VaultBadge.tsx` renders vault URI context, and `src/renderer/docking/DockTabBar.tsx` reserves extra tab width and renders `VaultBadge` for vault editor tabs. | Passed |
| T-U-015 | REQ-011 | `src/renderer/sidebar/WorkspaceTab.tsx` remains covered by focused tests for FlashQuery workspace menu behavior and panel navigation surfaces. | Passed |
| T-U-017 | REQ-015 | `src/renderer/ui/CommandPalette.tsx` includes `New FlashQuery Vault` and invokes `createFlashQueryVault(selectedWorkspaceId, undefined, dockCenter)`. `e2e/flashquery-happy-path.spec.ts` contains a dedicated `T-U-017` command-palette path. | Passed |

Fresh verification:

- `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/VaultBadge.test.tsx src/renderer/sidebar/WorkspaceTab.test.tsx` -> 3 files, 41 tests passed.
- `npm run test:e2e -- e2e/flashquery-happy-path.spec.ts` -> 2 Playwright tests passed, including `T-U-017 opens a FlashQuery Vault from the command palette` and `T-E-001 happy path / T-E-008 plus T-E-009 opens on canvas`.
- `rg -n "flashqueryVault|FlashQuery Vault|New FlashQuery Vault|VaultBadge|T-U-017" ...` confirmed all audited renderer entry points.

No focused remediation was needed.

## Editor, URI, And Connection Dialog

| Proof ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| T-U-006 | REQ-007 | `src/renderer/panels/EditorPanel.test.tsx` asserts `flashqueryWriteDocument` is called with exactly three arguments: workspace ID, vault path, and body content. | Passed |
| T-U-013 | REQ-013 | `src/renderer/panels/EditorPanel.tsx` detects vault URIs through `parseVaultUri`, routes saves through `flashqueryWriteDocument`, clears dirty state after successful saves, and preserves dirty state on failures. | Passed |
| T-U-014 | REQ-016 | `src/renderer/dialogs/FlashQueryConnectionDialog.tsx` calls `flashqueryProbe` for connection testing, `flashquerySetConnection` for save/remove, and surfaces probe/save errors through existing UI state. | Passed |
| T-U-016 | REQ-013 | `src/shared/flashqueryUri.ts` and `src/main/flashquery/uri.ts` provide the shared parse/build URI path used by renderer and main-process tests. | Passed |

Fresh verification:

- `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx src/shared/flashqueryUri.test.ts src/main/flashquery/uri.test.ts src/main/ipc/flashquery.test.ts` -> 5 files, 69 tests passed.
- `npm run typecheck` -> exit 0.
- `rg -n "parseVaultUri|flashqueryWriteDocument|flashqueryProbe|flashquerySetConnection|dirty|T-U-013|T-U-014|T-U-016" ...` confirmed the audited code/test anchors.

No focused remediation was needed.

## Plan 11.1 Result

Plan 11.1 found current, post-handoff proof for the scoped FlashQuery renderer surfaces. The audit did not identify a behavior or test coverage gap requiring production code changes. The only Phase 11 change for this plan is this evidence note, which ties existing source and fresh command output to the upstream-sync requirements and canonical test IDs.
