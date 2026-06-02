# Phase 12.2 Upstream Smoke Notes

**Date:** 2026-06-01
**Source-doc acknowledgement:** Read the canonical upstream-sync requirements and test plan before upstream-smoke or removed-file decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## Scope

This Plan 12.2 evidence checks REQ-003 agent/provider refactor retention, REQ-018 high-value upstream fix retention, REQ-020 removed-file decisions, the REQ-013 carry-forward for upstream editor-fix coexistence, and the T-A-003/T-A-011 build/package gate.

## Upstream Feature Smoke

### Automated UI Smoke Addendum — 2026-06-02

The static/headless rows below are now backed by a focused Electron UI smoke spec:

`npx playwright test e2e/upstream-value-smoke.spec.ts`

Latest focused run: 2026-06-02, 4/4 passed.

Latest full E2E run: 2026-06-02, `npm run test:e2e`, 37 passed / 2 skipped, including all four upstream-value smoke rows.

| Test ID | Automated UI evidence |
| --- | --- |
| T-M-001 | `e2e/upstream-value-smoke.spec.ts` creates a terminal panel in Electron, waits for a live PTY, writes a marker through the terminal IPC path, verifies the xterm UI is visible, and verifies the marker appears in the terminal log. |
| T-M-002 | Opens a local editor panel in Electron, verifies Monaco editor text loads, edits the document, saves through Cate's editor save registry, and verifies the edited body remains in the live editor. |
| T-M-003 | Opens a workspace containing visible and excluded fixture folders, observes both in the File Explorer UI, adds an exclusion through the Settings UI, closes settings, and verifies the visible folder remains while the excluded folder disappears without relaunch. |
| T-M-005 | Creates an Agent panel in Electron, opens its Settings view, verifies provider settings UI renders, then creates a FlashQuery Vault panel to prove the agent/provider panel refactor does not regress the FlashQuery panel factory. |

| Test ID | Requirement | Result | Files inspected | Commands / evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| T-M-001 | REQ-018 terminal smoke | Pass by automated Electron UI smoke | `e2e/upstream-value-smoke.spec.ts`, `src/renderer/panels/TerminalPanel.tsx`, `src/renderer/lib/terminalRegistry.ts`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/unit-all.log`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/baseline/test-e2e.log` | `npx playwright test e2e/upstream-value-smoke.spec.ts`; previous static audit commands remain supporting evidence. | Live terminal UI is observed in Electron with PTY output through the real terminal write/log path. Static source evidence still covers detach-without-kill behavior, search, resize debounce, render-scale snapping, and retry handling. |
| T-M-002 | REQ-018, REQ-013 carry-forward | Pass by automated Electron UI smoke plus static coexistence proof | `e2e/upstream-value-smoke.spec.ts`, `src/renderer/panels/EditorPanel.tsx`, `src/shared/flashqueryUri.ts`, `.planning/phases/11-renderer-behavior-audit/11-VERIFICATION.md`, `.planning/phases/11-renderer-behavior-audit/11-UAT.md` | `npx playwright test e2e/upstream-value-smoke.spec.ts`; previous `rg`, `npm run build`, and `npm run typecheck` evidence remains supporting proof. | Electron smoke observes local editor open/edit/save. Static proof still closes the REQ-013 carry-forward for upstream markdown-preview reset, terminal-path reveal, and FlashQuery vault write routing. |
| T-M-003 | REQ-018, REQ-011 | Pass by automated Electron UI smoke plus static/git proof | `e2e/upstream-value-smoke.spec.ts`, `src/renderer/sidebar/WorkspaceTab.tsx`, `src/main/projectWorkspaceStore.ts`, `src/main/ipc/fileExclusions.test.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/git.ts`, `src/shared/types.ts`, `docs/UPSTREAM-SYNC.md`, `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/unit-all.log` | `npx playwright test e2e/upstream-value-smoke.spec.ts`; previous static audit commands remain supporting evidence. | Electron smoke observes live File Explorer behavior before and after changing file exclusions through Settings with no relaunch. Static proof still covers workspace reload, git listing, and FlashQuery Vault sidebar non-regression. |
| T-M-005 | REQ-003, REQ-012 | Pass by automated Electron UI smoke plus static refactor proof | `e2e/upstream-value-smoke.spec.ts`, `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/ProvidersView.tsx`, `src/agent/renderer/AgentSettingsView.tsx`, `src/renderer/panels/registry.ts`, `src/renderer/stores/appStore.ts`, `src/shared/types.ts` | `npx playwright test e2e/upstream-value-smoke.spec.ts`; previous `rg`, `npm run build`, and `npm run typecheck` evidence remains supporting proof. | Electron smoke observes the Agent settings/provider surface and confirms FlashQuery Vault panel creation still works afterward. Static proof still covers split AgentPanel, ProvidersView accordion/settings UI, and separate appStore panel factories. |

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
