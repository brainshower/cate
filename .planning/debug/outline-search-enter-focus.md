---
status: resolved
trigger: "Outline search Enter cycling moves focus into source editor after first match"
created: 2026-06-15T18:20:00Z
updated: 2026-06-15T18:24:00Z
---

# Debug Session: Outline Search Enter Focus

## Symptoms

- Expected behavior: With Outline search focused, pressing Enter repeatedly should cycle through matching headings and scroll/navigate the associated editor each time while focus remains in the search field.
- Actual behavior: The first Enter navigates to a matching heading, then source editor focus steals keyboard focus, so a second Enter edits the document instead of cycling to the next Outline match.
- Error messages: None; focus routing regression.
- Timeline: Observed after Outline sidebar became usable in both Canvas and docked Cate modes.
- Reproduction: Open markdown source mode with Outline enabled, type a heading filter, press Enter twice.

## Current Focus

- hypothesis: Confirmed. `cycleSearch()` reused `navigateToHeading()`, and the source-mode path always called `editor.focus()` after `setPosition`.
- test: Added a regression that Enter-to-cycle keeps the search input focused after each source-mode navigation while still calling Monaco reveal/setPosition.
- expecting: Clicking a row can keep focusing the editor; search Enter navigation suppresses editor focus so repeated Enter events keep cycling.
- next_action: Complete; user visually verified repeated Enter cycling.

## Evidence

- 2026-06-15T18:20:00Z: Existing `T-I-015` verifies repeated Enter cycles in unit tests but does not assert focus retention, so jsdom keeps sending synthetic key events even though the real app moves focus to Monaco.
- 2026-06-15T18:21:00Z: New regression failed before the fix because `editor.focus()` was called on the first search Enter.
- 2026-06-15T18:22:00Z: `navigateToHeading` now accepts `focusEditor`; row clicks use the default `true`, while `cycleSearch()` passes `false`.

## Eliminated

- Canvas versus docked placement is not causal; the bug occurs in source-mode Outline search regardless of host.

## Resolution

- root_cause: Search Enter navigation shared the same source-mode heading navigation path as row clicks, including `editor.focus()`. In the real app, Monaco took keyboard focus after the first Enter.
- fix: Added a navigation option to suppress editor focus for search cycling. Search Enter still reveals the line and updates the Monaco position/highlight state, but focus remains in the Outline search input. Direct row clicks continue to focus the editor.
- verification: `npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx -t "T-I-015"`, `npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx src/renderer/stores/appStore.test.ts`, `npx -p node@22 npm run typecheck`, and `npx -p node@22 npm run build` passed.
- files_changed: `src/renderer/panels/OutlinePanel.tsx`, `src/renderer/panels/OutlinePanel.test.tsx`
