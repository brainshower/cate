# Phase 12.2 Upstream Smoke Notes

**Date:** 2026-06-01
**Source-doc acknowledgement:** Read the canonical upstream-sync requirements and test plan before upstream-smoke or removed-file decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## Scope

This Plan 12.2 evidence checks REQ-003 agent/provider refactor retention, REQ-018 high-value upstream fix retention, REQ-020 removed-file decisions, the REQ-013 carry-forward for upstream editor-fix coexistence, and the T-A-003/T-A-011 build/package gate.

## Upstream Feature Smoke

| Test ID | Requirement | Result | Files inspected | Commands / evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| T-M-001 | REQ-018 terminal smoke | Pass by static evidence; manual UI smoke not run in this headless executor | `src/renderer/panels/TerminalPanel.tsx`, `src/renderer/lib/terminalRegistry.ts`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/unit-all.log`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/baseline/test-e2e.log` | `rg -n "terminal\|Terminal" src/renderer/panels/TerminalPanel.tsx src/renderer/sidebar/WorkspaceTab.tsx .planning/phases/08-upstream-sync-v1-1-0`; Phase 8 logs include `terminalRegistry.test.ts`, terminal link/keymap/remount tests, and E2E terminal seeding evidence. | Live `TerminalPanel` still mounts through `terminalRegistry`, preserves detach-without-kill behavior, search, resize debounce, render-scale snapping, and retry handling. |
| T-M-002 | REQ-018, REQ-013 carry-forward | Pass by static evidence; manual UI smoke not run in this headless executor | `src/renderer/panels/EditorPanel.tsx`, `src/shared/flashqueryUri.ts`, `.planning/phases/11-renderer-behavior-audit/11-VERIFICATION.md`, `.planning/phases/11-renderer-behavior-audit/11-UAT.md` | `rg -n "preview\|markdown\|takePendingReveal\|parseVaultUri\|flashqueryWriteDocument" src/renderer/panels/EditorPanel.tsx`; `npm run build`; `npm run typecheck` | Phase 11 carry-forward / REQ-013 carry-forward is closed here for the static coexistence check: upstream `063b61d` markdown-preview reset is present because `markdownPreview` is keyed by `panelId`, preview content is synced from the active model/file, and source/preview toggling is per panel; upstream `0822786` terminal-path open is present through `takePendingReveal(panelId)` line/column reveal handling. FlashQuery vault documents still route through `parseVaultUri()` and `window.electronAPI.flashqueryWriteDocument(workspaceId, vaultPath, content)` with dirty-state cleanup. |
| T-M-003 | REQ-018, REQ-011 | Pass by static evidence; manual UI smoke not run in this headless executor | `src/renderer/sidebar/WorkspaceTab.tsx`, `src/main/projectWorkspaceStore.ts`, `src/main/ipc/fileExclusions.test.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/git.ts`, `src/shared/types.ts`, `src/shared/electron-api.d.ts`, `docs/UPSTREAM-SYNC.md`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/unit-all.log` | `rg -n "reload\|workspace\|exclude\|git\|FlashQuery Vault" src/renderer/sidebar/WorkspaceTab.tsx src/main/projectWorkspaceStore.ts src/main/ipc/fileExclusions.test.ts src/main/ipc/filesystem.ts src/main/ipc/git.ts src/shared/types.ts src/shared/electron-api.d.ts docs/UPSTREAM-SYNC.md .planning/phases/08-upstream-sync-v1-1-0` | Workspace panel listing still includes git-aware sorting (`git`, `fileExplorer` panel types), terminal status mapping, and panel focus. Project workspace state still detects external `.cate/workspace.json` edits and prompts reload instead of clobbering edits. File-exclusion retention for upstream `4b19446` is present: `AppSettings.fileExclusions` / `FILE_EXCLUSIONS` are typed in `src/shared/types.ts`, bridged in `src/shared/electron-api.d.ts`, honored live by explorer/search/watch paths in `src/main/ipc/filesystem.ts`, covered by `src/main/ipc/fileExclusions.test.ts`, and git listing still uses `--exclude-standard` in `src/main/ipc/git.ts`. Phase 8/11 evidence covers FlashQuery Vault sidebar discovery; file-exclusion and git-decoration paths do not filter or hide the `flashqueryVault` sidebar view. |
| T-M-005 | REQ-003, REQ-012 | Pass by static/headless evidence; manual UI smoke not run in this headless executor | `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/ProvidersView.tsx`, `src/agent/renderer/AgentSettingsView.tsx`, `src/renderer/panels/registry.ts`, `src/renderer/stores/appStore.ts`, `src/shared/types.ts` | `rg -n "AgentPanel\|ProvidersView\|SettingsView\|createAgent\|createFlashQueryVault\|flashqueryVault" src/agent/renderer src/renderer/panels/registry.ts src/renderer/stores/appStore.ts src/shared/types.ts`; `npm run build`; `npm run typecheck` | Upstream agent/provider refactor remains adopted on the post-handoff tree: `AgentPanel.tsx` owns the split multi-chat agent panel, `ProvidersView.tsx` keeps workspace-facing provider auth as an accordion with scoped-provider expansion, and `AgentSettingsView.tsx` embeds the provider UI in settings. `src/renderer/panels/registry.ts` lazy-loads the split `AgentPanel`; `appStore.ts` keeps separate `createAgent()` and `createFlashQueryVault()` factories; `PanelType` and `PANEL_DEFAULT_SIZES.flashqueryVault` remain intact, so the FlashQuery panel is unaffected by the appStore/panel refactor. |

## REQ-018 Named Upstream Fix Accounting

- `b18df3d` / terminal detachment and lifecycle: covered by `TerminalPanel.tsx`, `terminalRegistry`, and T-M-001 static smoke evidence.
- `bd3722d` / terminal link and key handling: covered by terminal link/keymap/remount tests referenced from Phase 8 evidence and the live terminal panel wiring in T-M-001.
- `85fd115` / terminal render-scale snapping: covered by T-M-001 static smoke evidence.
- `f5364d1` / terminal scroll-speed/performance behavior: covered by T-M-001 static smoke evidence and terminal settings/panel retention.
- `4b19446` / file-exclusion config: covered by the updated T-M-003 row with typed settings, explorer/search/watch integration, git listing, and focused file-exclusion tests.
- `348e9df` / workspace reload-from-disk behavior: covered by T-M-003 project workspace store evidence.
- `87990e3` / packaging asar unpack: no Phase 12 package/Electron config changes; T-A-011 remains not required here, with Phase 8 package evidence as supporting history.

## Removed-file decision audit

T-M-004 covers REQ-020. Live state on 2026-06-01:

- `rg -n "skillTemplate|SKILL_TEMPLATE|BulkActionChip" src || true` returned only `src/main/templates/skillTemplate.ts` and the dynamic `SKILL_TEMPLATE` import/use in `src/main/projectWorkspaceStore.ts`; it returned no `BulkActionChip` import or use.
- `src/main/templates/skillTemplate.ts` exists.
- `src/renderer/canvas/BulkActionChip.tsx` does not exist.
- `src/renderer/canvas/Canvas.tsx` has no `BulkActionChip` import.
- `npm run build` exited 0.
- `npm run typecheck` exited 0.

skillTemplate.ts decision: retained. This matches the Phase 8 conflict-review decision because `src/main/projectWorkspaceStore.ts` still dynamically imports `SKILL_TEMPLATE` when installing the project-local Cate workspace skill. Retention preserves the `.cate/workspace.json` authoring/reload workflow and avoids a dangling import.

BulkActionChip.tsx decision: removed. The live tree has no `src/renderer/canvas/BulkActionChip.tsx` file and no `BulkActionChip` references under `src`, so the upstream removal remains accepted and import-safe.

## Build And Package Evidence

- T-A-003 / REQ-018: `build.log` captures `npm run build`; acceptance is `exit_code: 0`.
- T-A-011: not required. No Phase 12 packaging or Electron dependency changes. `git diff --name-only -- package.json package-lock.json electron-builder.yml .github/workflows/release.yml` returned no files during Plan 12.2.
