# Phase 16: Vault Search Panel - Patterns

## Pattern Map

| Role | Files | Existing Pattern To Reuse |
|------|-------|---------------------------|
| Shared panel type | `src/shared/types.ts`, `src/shared/panels.ts`, `src/shared/panels.test.ts` | Add the type to the `PanelType` union, add a `PANEL_DEFINITIONS` entry, and assert identity/sizing in shared tests. |
| Renderer panel registry | `src/renderer/panels/registry.ts`, `src/renderer/panels/registry.test.ts` | Lazy-load the panel component, assign a Phosphor icon, and delegate creation to an app-store create method. |
| App-store panel creation | `src/renderer/stores/appStore.ts`, `src/renderer/stores/appStore.test.ts` | Mirror `createFlashQueryVault`/`createEditor`: create a `PanelState`, route by `PanelPlacement`, and return the panel ID. |
| FlashQuery status chip | `src/renderer/panels/FlashQueryVaultPanel.tsx` | Reuse `Chip`, `onFlashQueryStatus`, retry handling, `hostFromUrl`, `statusToChip`, and disconnected/no-connection display logic. |
| Native context menus | `src/renderer/panels/FlashQueryVaultPanel.tsx`, `src/renderer/panels/FlashQueryVaultPanel.test.tsx` | Use `window.electronAPI.showContextMenu` with serializable labels/IDs and branch on returned ID. |
| Document open | `src/renderer/panels/FlashQueryVaultPanel.tsx` | Use `buildVaultUri(workspaceId, vaultPath)` with `useAppStore.getState().createEditor(...)` and `updatePanelTitle(...)`. |
| Search IPC | `src/shared/electron-api.d.ts`, `src/preload/index.ts`, `src/main/ipc/flashquery.ts`, `src/main/flashquery/clientManager.ts` | Renderer calls the typed preload method; main owns validation, include_archived/list_all mapping, and safe error response shapes. |
| E2E fixture | `e2e/fixtures/flashquery-server.ts`, `e2e/fixtures/flashquery-server.spec.ts` | Extend deterministic search payloads instead of using live FlashQuery. |

## Data Flow

`FlashQueryVaultSearchPanel` owns UI state for `query`, `mode`, active entity chips, selected row, expanded memory rows, current limits, and in-flight request ID. On explicit dispatch, it calls `window.electronAPI.flashquerySearch(workspaceId, params)`. The preload bridge forwards to main IPC. Main validates renderer input and delegates to `FlashQueryClientManager`, which calls FlashQuery's MCP `search` tool and normalizes document/memory results.

Document result actions flow back through existing renderer panel creation APIs. Copy actions use renderer clipboard APIs because they copy non-secret vault paths/references, not credentials or privileged data.

## Implementation Guidance

- Keep bearer tokens and MCP transport in main; the search panel must never access credentials.
- Keep filter/mode changes local until the user presses Enter or Search.
- Use request IDs or equivalent last-request-wins tracking so stale responses cannot replace newer state.
- Treat a response with `error` as a failed current search and clear or mark stale previous results.
- Test exact user-visible strings from the requirements: `Vault Search`, `Search the vault...`, `Type a query and press Search.`, `Enable Documents or Memories to see results.`, `No results.`, and `Type a query to search semantically.`
- Prefer focused tests in `FlashQueryVaultSearchPanel.test.tsx` over broad app-level tests for interaction state.
