# Phase 12.2 Upstream Smoke Notes

**Date:** 2026-06-01
**Source-doc acknowledgement:** Read the canonical upstream-sync requirements and test plan before upstream-smoke or removed-file decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## Scope

This Plan 12.2 evidence checks REQ-018 high-value upstream fix retention, REQ-020 removed-file decisions, the REQ-013 carry-forward for upstream editor-fix coexistence, and the T-A-003/T-A-011 build/package gate.

## Upstream Feature Smoke

| Test ID | Requirement | Result | Files inspected | Commands / evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| T-M-001 | REQ-018 terminal smoke | Pass by static evidence; manual UI smoke not run in this headless executor | `src/renderer/panels/TerminalPanel.tsx`, `src/renderer/lib/terminalRegistry.ts`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/unit-all.log`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/baseline/test-e2e.log` | `rg -n "terminal\|Terminal" src/renderer/panels/TerminalPanel.tsx src/renderer/sidebar/WorkspaceTab.tsx .planning/phases/08-upstream-sync-v1-1-0`; Phase 8 logs include `terminalRegistry.test.ts`, terminal link/keymap/remount tests, and E2E terminal seeding evidence. | Live `TerminalPanel` still mounts through `terminalRegistry`, preserves detach-without-kill behavior, search, resize debounce, render-scale snapping, and retry handling. |
| T-M-002 | REQ-018, REQ-013 carry-forward | Pass by static evidence; manual UI smoke not run in this headless executor | `src/renderer/panels/EditorPanel.tsx`, `src/shared/flashqueryUri.ts`, `.planning/phases/11-renderer-behavior-audit/11-VERIFICATION.md`, `.planning/phases/11-renderer-behavior-audit/11-UAT.md` | `rg -n "preview\|markdown\|takePendingReveal\|parseVaultUri\|flashqueryWriteDocument" src/renderer/panels/EditorPanel.tsx`; `npm run build`; `npm run typecheck` | Phase 11 carry-forward / REQ-013 carry-forward is closed here for the static coexistence check: upstream `063b61d` markdown-preview reset is present because `markdownPreview` is keyed by `panelId`, preview content is synced from the active model/file, and source/preview toggling is per panel; upstream `0822786` terminal-path open is present through `takePendingReveal(panelId)` line/column reveal handling. FlashQuery vault documents still route through `parseVaultUri()` and `window.electronAPI.flashqueryWriteDocument(workspaceId, vaultPath, content)` with dirty-state cleanup. |
| T-M-003 | REQ-018, REQ-011 | Pass by static evidence; manual UI smoke not run in this headless executor | `src/renderer/sidebar/WorkspaceTab.tsx`, `src/main/projectWorkspaceStore.ts`, `docs/UPSTREAM-SYNC.md`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/unit-all.log` | `rg -n "reload\|workspace\|exclude\|git\|FlashQuery Vault" src/renderer/sidebar/WorkspaceTab.tsx src/main/projectWorkspaceStore.ts docs/UPSTREAM-SYNC.md .planning/phases/08-upstream-sync-v1-1-0` | Workspace panel listing still includes git-aware sorting (`git`, `fileExplorer` panel types), terminal status mapping, and panel focus. Project workspace state still detects external `.cate/workspace.json` edits and prompts reload instead of clobbering edits. Phase 8/11 evidence covers FlashQuery Vault sidebar discovery; no source path hides the FlashQuery Vault entry. |

## Removed-file decision audit

T-M-004 covers REQ-020. Live state on 2026-06-01:

- `rg -n "skillTemplate|SKILL_TEMPLATE|BulkActionChip" src || true` returns `src/main/templates/skillTemplate.ts` and the dynamic `SKILL_TEMPLATE` import/use in `src/main/projectWorkspaceStore.ts`; it returns no `BulkActionChip` import or use.
- `src/main/templates/skillTemplate.ts` exists.
- `src/renderer/canvas/BulkActionChip.tsx` does not exist.
- `src/renderer/canvas/Canvas.tsx` has no `BulkActionChip` import.

skillTemplate.ts decision: retained. This matches the Phase 8 conflict-review decision because `src/main/projectWorkspaceStore.ts` still dynamically imports `SKILL_TEMPLATE` when installing the project-local Cate workspace skill. Retention preserves the `.cate/workspace.json` authoring/reload workflow and avoids a dangling import.

BulkActionChip.tsx decision: removed. The live tree has no `src/renderer/canvas/BulkActionChip.tsx` file and no `BulkActionChip` references under `src`, so the upstream removal remains accepted and import-safe.

## Build And Package Evidence

- T-A-003 / REQ-018: `build.log` captures `npm run build`; expected acceptance is `exit_code: 0`.
- T-A-011: not required. No Phase 12 packaging or Electron dependency changes. `git diff --name-only -- package.json package-lock.json electron-builder.yml .github/workflows/release.yml` returned no files during Plan 12.2.

