# Upstream Sync Runbook

This fork consumes upstream Cate releases and preserves FlashQuery-specific behavior locally. Do not rebase or squash upstream release syncs; use a real merge commit so future merge bases remain queryable.

## Sync Ledger

| Date | Target | Target SHA | Prior Base | Notes |
|------|--------|------------|------------|-------|
| 2026-06 | upstream `v1.1.0` | `5b6549d` | `120d58ed` | Merged on `sync/upstream-v1.1.0` with FlashQuery v1 surfaces preserved. |

## Standard Flow

1. Capture clean fork baseline on `main`: `npm run build`, `npm run typecheck`, `npm test`, `npm run test:e2e`.
2. Fetch upstream tags and verify the target release tag SHA.
3. Create `sync/upstream-<tag>` from current `main`.
4. Run one `git merge --no-ff <tag>` and resolve conflicts by layer: build/deps, shared contracts, renderer/E2E, theme/upstream features, final docs.
5. Keep central conflict review notes with upstream change, fork behavior preserved, rationale, and test evidence.
6. Finish with full matrix, provenance gates, visual evidence, and a runbook ledger entry.

## Protected FlashQuery Surfaces

- IPC channels: exact seven `flashquery:*` strings in `src/shared/ipc-channels.ts`.
- Main process token boundary: `src/main/ipc/flashquery.ts` and `sanitizeFlashQueryConnection()`.
- Preload/renderer API shape: `src/preload/index.ts` and `src/shared/electron-api.d.ts`.
- Workspace/session persistence: `src/shared/types.ts`, `src/renderer/lib/session.ts`, `src/main/projectWorkspaceStore.ts`.
- Vault panel and command entry: `src/renderer/stores/appStore.ts`, `src/renderer/panels/registry.ts`, `src/renderer/ui/CommandPalette.tsx`.
- Vault editor behavior: `src/renderer/panels/EditorPanel.tsx`, `src/shared/flashqueryUri.ts`, `src/main/flashquery/uri.ts`.
- Sidebar/dock chrome: `src/renderer/sidebar/Sidebar.tsx`, `src/renderer/sidebar/WorkspaceTab.tsx`, `src/renderer/docking/DockTabBar.tsx`, `src/renderer/components/VaultBadge.tsx`.
- E2E harness and stub: `e2e/fixtures/electron-app.ts`, `e2e/fixtures/flashquery-server.ts`, `src/renderer/lib/e2eHarness.ts`.

## Conflict Hotspots From `v1.1.0`

- Build/dependency/package lock: regenerated from the merged `package.json`.
- Shared contracts: IPC constants, Electron API types, preload bridge, session reload helper, appStore workspace creation.
- Renderer shell: editor imports/theme/reveal behavior, dock tab middle-click/worktree style plus vault badge, command palette reload plus vault command.
- E2E harness: upstream terminal/perf helpers plus FlashQuery vault/context-menu helpers.
- Upstream removals: `BulkActionChip.tsx`, `TerminalUrlPrompt.tsx`, shortcut hint overlays, and URL prompt store are removed upstream with no dangling imports after build/typecheck.

## Verification Matrix

| Gate | Command / Evidence | Status |
|------|--------------------|--------|
| Build | `npm run build` | Passed |
| Typecheck | `npm run typecheck` | Passed |
| Unit/component | `npm test` | Passed |
| E2E | `npm run test:e2e` | Passed |
| Electron smoke | `npm run test:smoke:electron` | Passed |
| Visual evidence | `.planning/phases/08-upstream-sync-v1-1-0/evidence/visual/flashquery-surfaces-{dark,light}.png` | Passed |
| Provenance | merge-base, ancestor, behind-count, merge commit message | Passed |

## E2E Traceability

The upstream-sync test plan uses canonical E2E IDs `T-E-001` through `T-E-005`. The shipped specs include those IDs in their test titles and preserve the older v1.0 scenario IDs where useful:

| Canonical ID | Spec | Scenario Evidence |
|--------------|------|-------------------|
| T-E-001 | `e2e/flashquery-happy-path.spec.ts` | Happy path, editor save/reopen, and open-on-canvas coverage (`T-E-008`/`T-E-009`) |
| T-E-002 | `e2e/flashquery-vault-browse.spec.ts` | Vault browse, empty vault, refresh, and multi-level folders (`T-E-011`) |
| T-E-003 | `e2e/flashquery-disconnect.spec.ts` | Disconnect status and retry recovery (`T-E-010`) |
| T-E-004 | `e2e/flashquery-persistence.spec.ts` | Restart persistence and no eager probe (`T-E-006`/`T-E-007`) |
| T-E-005 | `e2e/fixtures/flashquery-server.spec.ts` | Stub server list/read/write/reset/auth lifecycle cases |

## Process Gates

- `.planning/` remains tracked.
- `.gitignore` allows `.claude/settings.local.json` only; no broad `.claude/` ignore was added.
- `git merge-base HEAD v1.1.0` is `5b6549d661a8427c829f60e15c4de9e71d49ac4d`.
- `git rev-list --count HEAD..v1.1.0` is `0`.
- Latest merge commit message records `v1.1.0` and `5b6549d`.
