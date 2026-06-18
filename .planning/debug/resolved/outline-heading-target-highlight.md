---
status: resolved
trigger: "Outline heading clicks navigate source/preview editor but target heading is not visibly highlighted at the right time"
created: 2026-06-15T18:35:00Z
updated: 2026-06-18T00:00:00Z
---

# Debug Session: Outline Heading Target Highlight

## Symptoms

- Expected behavior: Clicking a heading in Outline should navigate to that heading and then show a subtle temporary highlight on the target line/heading in the editor or preview.
- Actual behavior: In source mode, the editor scrolls to the heading but the target line has no subtle highlight. In preview mode, highlighting appears before scroll and fades before the user sees the target heading.
- Error messages: None; visual feedback issue.
- Timeline: Observed after Outline placement, routing, and search cycling were fixed.
- Reproduction: Open markdown with Outline enabled, click a heading in source mode; repeat in preview mode.

## Current Focus

- hypothesis: Source mode confirmed fixed. Preview mode should behave like a selected target. The verified visible preview implementation was the immediate inline style write inside `scrollPreviewToHeading`; removing that in favor of delayed `scrollend`/fallback startup caused Canvas preview to lose the highlight.
- test: Preview regression now verifies the target heading is highlighted synchronously when Outline navigation scrolls it, persists over time, and selecting another preview heading clears the previous one.
- expecting: Preview mode keeps the selected Outline heading highlighted in the rendered editor until another heading is selected or the preview unmounts.
- next_action: User visual verification in the restarted dev app.

## Evidence

- 2026-06-15T18:35:00Z: User reports source mode lacks target highlight and preview mode highlight timing occurs before scroll completes.
- 2026-06-15T18:40:00Z: `OutlinePanel` source navigation called `revealLineInCenter`, `setPosition`, and optional focus, but no source highlight callback existed.
- 2026-06-15T18:42:00Z: `EditorPanel.scrollPreviewToHeading` called `scrollIntoView` and immediately set `backgroundColor`, then cleared it after 1500ms.
- 2026-06-15T18:44:00Z: Added `highlightSourceLine` to active editor snapshots and wired `OutlinePanel` to call it after source reveal/position.
- 2026-06-15T18:45:00Z: `EditorPanel` now owns a Monaco decorations collection for transient whole-line source highlights and delays preview heading flash until after scroll has started.
- 2026-06-15T18:51:00Z: User visual verification found source highlight only appeared once and preview highlight did not appear.
- 2026-06-15T18:54:00Z: Reworked both effects into restartable flash cycles: source clears pending timers/decorations before reapplying, and preview clears pending timers/classes before adding `cate-preview-target-heading` after scroll.
- 2026-06-15T19:00:00Z: Added registry regression proving `registerActiveEditor(workspaceId, panelId, editor)` cleared `scrollPreviewToHeading` and `highlightSourceLine` after `updateActiveEditorPreview`.
- 2026-06-15T19:01:00Z: Patched `registerActiveEditor` to preserve the existing panel's preview/highlight callbacks and preview state on same-panel re-registration.
- 2026-06-15T19:02:00Z: Preview heading flash now applies both `cate-preview-target-heading` and direct temporary inline styles after the scroll delay, then clears them.
- 2026-06-15T19:08:00Z: User verified source mode works but preview mode still showed no visible heading highlight.
- 2026-06-15T19:09:00Z: Preview highlight now applies direct inline background, box shadow, and outline immediately after `scrollIntoView`, then reapplies after 500ms so the effect survives smooth-scroll timing.
- 2026-06-15T19:14:00Z: User verified preview highlight works, but requested the fade happen after scroll completion and remain visible for about two seconds.
- 2026-06-15T19:15:00Z: Preview highlight timing now waits 700ms after `scrollIntoView`, holds the visible highlight for 2000ms, then fades over 650ms before clearing styles.
- 2026-06-15T19:20:00Z: User reported the fixed 700ms timing lost Canvas preview highlighting entirely.
- 2026-06-15T19:22:00Z: Preview highlight start now listens for `scrollend` on the preview scroll container and uses a 900ms fallback if `scrollend` does not fire; stale listeners are cleaned up on subsequent navigation/unmount.
- 2026-06-15T19:25:00Z: User asked whether preview selection can remain highlighted instead of fading.
- 2026-06-15T19:26:00Z: Removed preview fade/clear timers. Preview heading highlight now persists until a subsequent Outline navigation clears all preview headings and highlights the newly selected target.
- 2026-06-15T19:30:00Z: User reported persistent delayed preview selection still showed no highlight, and asked what changed since the quick-highlight version.
- 2026-06-15T19:31:00Z: Diff confirmed the quick-highlight version applied inline preview styles immediately in `scrollPreviewToHeading`; later changes removed the immediate application and depended on delayed `scrollend`/fallback timing.
- 2026-06-15T19:32:00Z: Restored immediate preview highlight application after `scrollIntoView` and kept it persistent. Removed delayed-start `scrollend`/fallback logic.

## Eliminated

- Outline selection state in the sidebar is not enough; the target inside editor/preview needs visible feedback.

## Resolution

- root_cause: Outline source navigation originally had no editor-side highlight effect. After adding the highlight callback, Monaco focus re-registered the active editor and `registerActiveEditor` replaced the panel entry with a fresh object, clearing `highlightSourceLine` and `scrollPreviewToHeading`; this made the first source click flash and subsequent clicks only navigate. Preview navigation needed the highlight to be applied directly after scroll so the visible target heading receives the effect.
- fix: `registerActiveEditor` now preserves the existing panel's `markdownPreview`, `scrollPreviewToHeading`, and `highlightSourceLine` values when the same panel is re-registered. `EditorPanel` still provides a restartable Monaco line-decoration flash for source mode. Preview mode clears prior preview heading highlights, scrolls the target heading, immediately applies a visible inline background, box shadow, and outline, and leaves it selected until the next preview heading selection or unmount cleanup.
- verification: `npx -p node@22 npm test -- src/renderer/lib/activeEditorRegistry.test.ts` first failed with the new regression, then passed after the registry fix. `npx -p node@22 npm test -- src/renderer/lib/activeEditorRegistry.test.ts src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx`, `npx -p node@22 npm run typecheck`, and `npx -p node@22 npm run build` passed. Cate dev app restarted for visual verification.
- files_changed: `src/renderer/lib/activeEditorRegistry.ts`, `src/renderer/lib/activeEditorRegistry.test.ts`, `src/renderer/panels/OutlinePanel.tsx`, `src/renderer/panels/OutlinePanel.test.tsx`, `src/renderer/panels/EditorPanel.tsx`, `src/renderer/panels/EditorPanel.test.tsx`, `src/renderer/styles/globals.css`, `src/test/monaco-editor-mock.ts`
