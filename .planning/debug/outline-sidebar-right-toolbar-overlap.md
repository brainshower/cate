---
status: verifying
trigger: "Outline sidebar fields extend under Cate right toolbar in canvas-hosted Monaco Outline panel"
created: 2026-06-15T15:36:14Z
updated: 2026-06-15T17:19:30Z
---

# Debug Session: Outline Sidebar Right Toolbar Overlap

## Symptoms

- Expected behavior: When an editor is on the Canvas, its Outline should open inside that editor's canvas node as an editor-local sidebar/companion. Multiple canvas editors can each have their own optional Outline.
- Actual behavior: The Outline toggle created a global Cate right-dock panel, so the Outline appeared attached to Cate's right edge instead of the Monaco editor window. This made the controls look like they extended under Cate's right toolbar.
- Error messages: None observed; visual/layout regression.
- Timeline: Persisted after theming and inner control containment fixes.
- Reproduction: Open Cate dev environment, show Monaco Outline sidebar in a canvas-hosted editor/preview context, observe right edge of controls against the app toolbar.

## Current Focus

- hypothesis: Canvas-mounted `EditorPanel` uses the same global `{ target: 'dock', zone: 'right' }` Outline placement as docked editors.
- test: Add a regression where a source editor is in a canvas node and Outline creation should split that node's private center dock to the right.
- expecting: Outline is created with `{ target: 'none' }` and then placed into the source node's private DockStore as a right split.
- next_action: User visual verification in the restarted dev app, including two canvas editors with independent Outlines and preview-mode heading highlighting.

## Evidence

- 2026-06-15T15:37:00Z: `Sidebar.tsx` publishes actual overlay widths to `--cate-left-sidebar-width` and `--cate-right-sidebar-width`.
- 2026-06-15T15:37:30Z: `DockTabStack.tsx` used `marginRight`/`marginLeft` on center-edge tab bars and content while retaining `w-full`; this left the content box measuring to the full parent width, allowing child controls to appear flush/under the right toolbar.
- 2026-06-15T15:38:30Z: Replaced margin-only reservation with calculated available width using `calc(100% - leftInset - rightInset)`.
- 2026-06-15T15:48:18Z: Regression test confirmed current behavior placed canvas Outline as a tab/right-dock-style companion instead of a right split in the source canvas node.
- 2026-06-15T15:49:36Z: `appStore.createOutline(..., { target: 'none' }, sourceEditorPanelId)` now creates the Outline in workspace state and places it into the source canvas node's private DockStore as a horizontal right split.
- 2026-06-15T15:51:12Z: `EditorPanel` now uses local placement when `nodeId` is present, while docked editors continue using Cate's right dock.
- 2026-06-15T15:56:40Z: Follow-up showed canvas Outline clicks could still no-op because local placement rediscovered the source node indirectly via `nodeForPanel(sourceEditorPanelId)`; if that lookup missed during restored/canvas-local state, `createOutline` rolled the panel back.
- 2026-06-15T15:57:30Z: `EditorPanel` now passes its known `nodeId` into `createOutline`, and appStore local placement resolves that explicit node before falling back to panel lookup.
- 2026-06-15T17:07:15Z: Follow-up showed two independent canvas Outlines could route the wrong editor. `OutlinePanel` read the workspace active editor snapshot, so it could follow whichever editor last registered focus instead of the editor that created that Outline panel.
- 2026-06-15T17:08:42Z: Added `getEditorSnapshotForPanel(workspaceId, panelId)` to the active editor registry and passed `PanelState.sourceEditorPanelId` through `renderPanelComponent` into `OutlinePanel`, avoiding a heavy app-store import/cycle in the panel component.
- 2026-06-15T17:12:30Z: Preview-mode click routing scrolled correctly but did not highlight the clicked row because the preview path returned before updating Outline's local `cursorLine`. `navigateToHeading` now updates `cursorLine` before source/preview routing branches.

## Eliminated

- OutlinePanel control theming and local `w-full` containment were already fixed.
- Global center-dock width reservation improved the docked case, but it did not satisfy the product behavior for canvas-hosted editors because the Outline should not be attached to Cate's right edge there.
- Importing `appStore` directly into `OutlinePanel` was eliminated after Vitest hung during module collection; passing the source editor id as panel metadata keeps the component dependency graph light and matches the existing `filePath`/`url` render contract.

## Resolution

- root_cause: Canvas-mounted `EditorPanel` opened Outline with the same global right-dock placement used by docked editors. The Outline was therefore attached to Cate's shell, not to the Monaco editor's canvas node. A second residual root cause was that `OutlinePanel` bound to the workspace active editor instead of its `sourceEditorPanelId`, and preview-mode clicks did not update local active-heading state.
- fix: `EditorPanel` now requests `{ target: 'none' }` for canvas-mounted editors and passes the exact source canvas `nodeId`; `appStore.createOutline` handles that as private placement and inserts the Outline as a right split in that node's DockStore. Docked editors still open Outline in Cate's right dock. `OutlinePanel` now receives `sourceEditorPanelId` through the panel render contract and snapshots that specific editor via `getEditorSnapshotForPanel`; active-editor fallback remains for legacy/global Outline panels without source metadata. Preview heading clicks now update `cursorLine` before scrolling the markdown preview, so the clicked row highlights immediately.
- verification: `npx -p node@22 npm test -- src/renderer/stores/appStore.test.ts src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/CanvasPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx src/renderer/docking/DockTabBar.test.tsx src/renderer/lib/activeEditorRegistry.test.ts src/renderer/panels/registry.test.ts`, `npx -p node@22 npm run typecheck`, and `npx -p node@22 npm run build` all passed.
- files_changed: `src/shared/types.ts`, `src/renderer/stores/appStore.ts`, `src/renderer/stores/appStore.test.ts`, `src/renderer/panels/EditorPanel.tsx`, `src/renderer/panels/EditorPanel.test.tsx`, `src/renderer/docking/DockTabStack.tsx`, `src/renderer/panels/CanvasPanel.test.tsx`, `src/renderer/lib/activeEditorRegistry.ts`, `src/renderer/lib/activeEditorRegistry.test.ts`, `src/renderer/panels/OutlinePanel.tsx`, `src/renderer/panels/OutlinePanel.test.tsx`, `src/renderer/panels/registry.ts`, `src/renderer/panels/registry.test.ts`, `src/renderer/panels/types.ts`
