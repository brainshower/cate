# Phase 8 Pattern Map

**Generated:** 2026-06-01
**Status:** Ready for execution

## Global Read-First Pattern

Every Phase 8 task must begin by reading:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-CONTEXT.md`

## Existing Local Patterns To Preserve

| Area | Files To Inspect | Pattern |
|------|------------------|---------|
| IPC channels | `src/shared/ipc-channels.ts`, `src/preload/index.ts`, `src/shared/electron-api.d.ts` | Shared string constants, typed preload bridge, renderer-safe API types. |
| FlashQuery main logic | `src/main/ipc/flashquery.ts`, `src/main/flashquery/clientManager.ts`, `src/main/flashquery/credentials.ts` | Main owns network calls and token handling; renderer receives sanitized metadata only. |
| Workspace/session persistence | `src/shared/types.ts`, `src/renderer/lib/session.ts`, `src/main/projectWorkspaceStore.ts` | Workspace and session shapes carry optional sanitized `flashqueryConnection` metadata. |
| Renderer panel registration | `src/shared/types.ts`, `src/renderer/panels/registry.ts`, `src/renderer/stores/appStore.ts` | Panel type, registry entry, and store factory must agree. |
| Vault editor behavior | `src/renderer/panels/EditorPanel.tsx`, `src/shared/flashqueryUri.ts`, `src/main/flashquery/uri.ts` | `flashquery://` URI routes read/save through FlashQuery without local filesystem/Git assumptions. |
| Sidebar/dock chrome | `src/renderer/sidebar/Sidebar.tsx`, `src/renderer/docking/DockTabBar.tsx`, `src/renderer/components/VaultBadge.tsx` | FlashQuery surfaces are additive and quiet, using Cate chrome conventions. |
| E2E harness | `e2e/fixtures/electron-app.ts`, `e2e/fixtures/flashquery-server.ts`, `src/renderer/lib/e2eHarness.ts` | Electron launch/restart and FlashQuery MCP stub stay explicit and `CATE_E2E`-guarded. |
| Evidence and docs | `.planning/milestones/v1.0-phases/07-cross-cutting-regression/07-VERIFICATION.md`, `.planning/milestones/v1.0-phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` | Verification and visual/manual evidence should be durable, inspectable, and linked from closeout docs. |

## Conflict Review Pattern

For each central conflict file, record:

- File path.
- Upstream change adopted.
- FlashQuery behavior preserved.
- Why the resolution is semantically correct.
- Test/evidence ID proving the resolution.

Central conflict files are listed in product REQ-019.
