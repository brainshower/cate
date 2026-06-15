---
status: resolved
trigger: "Docked Outline right sidebar leaves a visible gap between editor and Outline while extending under Cate right toolbar"
created: 2026-06-15T17:43:00Z
updated: 2026-06-15T17:51:00Z
---

# Debug Session: Docked Outline Right Sidebar Gap

## Symptoms

- Expected behavior: When a markdown document is opened in Cate outside Canvas mode, opening Outline in Cate's right sidebar should place the Outline flush against the editor and keep the Outline's right edge out from under Cate's right toolbar.
- Actual behavior: A distinct gap appears between the editor and the right Outline sidebar, while the Outline content still appears to extend under the rightmost Cate toolbar area.
- Error messages: None; visual/layout regression.
- Timeline: Follow-up after Canvas-local Outline behavior was fixed and verified working.
- Reproduction: Open a markdown document outside Canvas mode, click Outline, observe Cate right-dock Outline placement relative to the editor and right toolbar.

## Current Focus

- hypothesis: Confirmed. The center dock was still told it touched the viewport right edge even when the right dock was visible, so editor content reserved right-toolbar width internally and left a gap before the Outline. The right dock itself also had no right-toolbar reservation, so it could sit under Cate's right toolbar overlay.
- test: Static regressions around `MainWindowShell` and `DockZone`, plus focused Outline/appStore/EditorPanel suites.
- expecting: Center dock only reserves right-toolbar width when no right dock is visible; the global right dock reserves the right toolbar with a right margin, moving it left and keeping it flush against the center.
- next_action: Complete; user visually verified the docked Outline gap/toolbar overlap fix.

## Evidence

- 2026-06-15T17:43:00Z: Screenshot shows docked Outline tab stack separated from editor by a visible gutter at its left edge; the right edge is visually aligned beneath Cate's right toolbar.
- 2026-06-15T17:47:20Z: `DockZone` previously rendered every zone layout with `renderNode(zone.layout, true, true)`, so the center zone always behaved as if it touched both viewport edges.
- 2026-06-15T17:48:10Z: `MainWindowShell` now passes `viewportRightEdge={!rightVisible}` to the center dock and wraps the right dock with `marginRight: var(--cate-right-sidebar-width, 0px)`.
- 2026-06-15T17:50:05Z: Focused regressions passed: `MainWindowShell.test.ts`, `CanvasPanel.test.tsx`, `OutlinePanel.test.tsx`, `EditorPanel.test.tsx`, and `appStore.test.ts`.

## Eliminated

- Canvas-local Outline placement is explicitly out of scope for this regression; user verified that path works correctly.
- Canvas mini-docks do not use `MainWindowShell`/global `DockZone`, so the change is limited to top-level Cate dock geometry.

## Resolution

- root_cause: The global center dock was always treated as a viewport right-edge stack, even when Cate's right dock was visible. That made the editor reserve the right toolbar inset inside the center content, creating the visible gap. The global right dock did not reserve the right toolbar inset, so its right side could remain underneath the toolbar overlay.
- fix: Added explicit viewport-edge props to `DockZone`; `MainWindowShell` now tells the center dock it touches the right viewport edge only when the right dock is hidden. The global right dock is wrapped with a right margin equal to `--cate-right-sidebar-width`, shifting the dock left out from under the right toolbar while keeping it adjacent to the editor/resize handle.
- verification: `npx -p node@22 npm test -- src/renderer/shells/MainWindowShell.test.ts src/renderer/panels/CanvasPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx src/renderer/stores/appStore.test.ts`, `npx -p node@22 npm run typecheck`, and `npx -p node@22 npm run build` passed.
- files_changed: `src/renderer/docking/DockZone.tsx`, `src/renderer/shells/MainWindowShell.tsx`, `src/renderer/shells/MainWindowShell.test.ts`, `src/renderer/panels/CanvasPanel.test.tsx`
