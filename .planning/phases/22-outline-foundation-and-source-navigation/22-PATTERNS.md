# Phase 22: Outline Foundation and Source Navigation - Patterns

## Pattern Map

| Role | Files | Existing Pattern To Reuse |
|---|---|---|
| Shared panel type | `src/shared/types.ts`, `src/shared/panels.ts`, `src/shared/panels.test.ts` | Follow `flashqueryVaultSearch`: add union member, shared definition, default/minimum sizes, ghost SVG, and no-cast tests. |
| Renderer registry | `src/renderer/panels/registry.ts`, `src/renderer/panels/registry.test.ts` | Follow `flashqueryVaultSearch`: lazy-load component, assign Phosphor icon, create via app-store method, return `null` on failed creation. |
| App-store panel creation | `src/renderer/stores/appStore.ts`, `src/renderer/stores/appStore.test.ts` | Use `addAndPlacePanel()` like `createFlashQueryVaultSearch`; route right dock placement through existing `PanelPlacement`. |
| Dock behavior | `src/renderer/stores/dockStore.ts` | Use existing `dockPanel(panelId, 'right')`; do not add a separate sidebar host. |
| Editor toolbar | `src/renderer/panels/EditorPanel.tsx` | Place Outline toggle near existing Preview/Source button and preserve `markdownPreview` sync/useEffect behavior. |
| Monaco lifecycle tests | `src/renderer/panels/EditorPanel.test.tsx` | Extend existing Monaco mock patterns for focus/content subscriptions, adding cursor/model/language hooks only where needed. |
| Panel component tests | `src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx`, `src/renderer/panels/EditorPanel.test.tsx` | Use React Testing Library and exact visible strings/classes for interaction states. |
| Pure utilities | `src/renderer/lib/*.test.ts` | Keep parser/slug-style helpers free of React/Electron/Zustand; test with simple model-like objects. |

## Data Flow

EditorPanel registers its current Monaco editor/model with an active-editor adapter when mounted/focused and unregisters on cleanup. OutlinePanel reads/subscribes to that adapter for the selected workspace, parses the current model with `parseDocumentHeadings(model, maxDepth)`, renders rows, and navigates source mode through the Monaco editor instance.

Toolbar toggling uses app-store and dock-store paths:

1. Editor toolbar detects whether an associated Outline panel is open.
2. Open path calls `createOutline(workspaceId, undefined, { target: 'dock', zone: 'right' })`.
3. Close path calls `closePanel(workspaceId, outlinePanelId)` for only the associated Outline panel.
4. Dock store keeps unrelated right-zone panels intact.

## Implementation Guidance

- Prefer `outline` as the panel type exactly, matching the product requirement.
- Add a `sourcePanelId` or equivalent association if needed to make toggle close behavior precise.
- Keep active-editor state workspace-aware to avoid cross-workspace leakage.
- Keep parser max-depth filtering deterministic and default depth in component/store state, not parser signature.
- Use exact test IDs from the product test plan in test names or comments: T-U-001 through T-U-014, T-I-001 through T-I-022, T-I-031 through T-I-035.
- Do not add preview scroll behavior, heading IDs, or `preview-section-select` dispatch in Phase 22.

## Verification Pattern

Run focused commands first, then typecheck:

```bash
npx -p node@22 npm test -- src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts
npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts
npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx
npx -p node@22 npm run typecheck
```
