---
status: resolved
trigger: "Canvas-local Outline opens at half width; default should be one third for Outline and two thirds for editor"
created: 2026-06-15T18:02:00Z
updated: 2026-06-15T18:13:00Z
---

# Debug Session: Canvas Outline Default Width

## Symptoms

- Expected behavior: When a Canvas editor opens its local Outline, the editor should keep about two thirds of the original node width and the Outline should use about one third by default. The user can still resize afterward.
- Actual behavior: The live Canvas node split defaults to 50/50, making the Outline too wide and the editor too narrow.
- Error messages: None; layout default issue.
- Timeline: Found after Canvas-local Outline placement and routing were verified working.
- Reproduction: Open a markdown editor on Canvas, enable Outline, observe the initial editor/Outline split widths.

## Current Focus

- hypothesis: Confirmed. The serialized Canvas fallback used approximate Outline ratios, but the live Canvas node path routed through the generic DockStore split target, which hardcoded `[0.5, 0.5]`.
- test: Updated the Canvas Outline placement regression to assert `[2 / 3, 1 / 3]` on the live node dock layout.
- expecting: Only the programmatic Canvas Outline split changes; manual splits and docked Cate right-sidebar behavior keep existing defaults.
- next_action: Complete; user visually verified the one-third Canvas Outline default.

## Evidence

- 2026-06-15T18:02:00Z: `placePanelInCanvasNode(..., 'split-right')` creates a live `DockDropTarget` with `{ type: 'split', edge: 'right' }`; `dockStore.dockPanel` used default `ratios: [0.5, 0.5]` for generic split targets.
- 2026-06-15T18:03:00Z: `layoutWithPanelSplitRight` fallback already used approximate Outline ratios (`0.68 / 0.32`), so persisted/restored fallback and live behavior were inconsistent.
- 2026-06-15T18:08:30Z: Added optional split ratios to `DockDropTarget`, preserving the default `[0.5, 0.5]` when unspecified.
- 2026-06-15T18:09:10Z: Canvas Outline split-right placement now passes `[2 / 3, 1 / 3]`; fallback layout uses the same named ratio.

## Eliminated

- Docked Cate right-sidebar Outline is out of scope for this change.
- Canvas-local Outline placement and editor binding are not changed.

## Resolution

- root_cause: Live Canvas node Outline placement used the generic dock split target, which defaulted to an equal split. The fallback Canvas layout path had its own approximate Outline ratio, so live and fallback behavior diverged.
- fix: Added optional ratios to `DockDropTarget` split targets and taught `dockStore.dockPanel` to use them for both newly nested splits and same-direction sibling inserts. Canvas Outline split-right placement now passes a named `[2 / 3, 1 / 3]` ratio, and the serialized fallback uses the same ratio.
- verification: `npx -p node@22 npm test -- src/renderer/stores/appStore.test.ts src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx`, `npx -p node@22 npm run typecheck`, and `npx -p node@22 npm run build` passed.
- files_changed: `src/shared/types.ts`, `src/renderer/stores/dockStore.ts`, `src/renderer/stores/appStore.ts`, `src/renderer/stores/appStore.test.ts`
