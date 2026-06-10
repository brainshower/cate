---
status: fixing
trigger: "Monaco editor context menu in a markdown editor on the Canvas appears down and to the right of the mouse pointer."
created: 2026-06-10
updated: 2026-06-10
---

## Symptoms

- Expected behavior: Right-clicking inside a Monaco editor on the Canvas opens the editor menu near the pointer.
- Actual behavior: The menu appears well down and to the right.
- Error messages: none.
- Timeline: observed in markdown editor panels on the Canvas.
- Reproduction: open a markdown file in a Canvas editor panel, right-click inside Monaco.

## Current Focus

- hypothesis: Monaco's built-in context/overflow UI is positioned inside the transformed canvas world, so page coordinates are transformed again by canvas pan/zoom.
- test: Inspect editor construction options and Monaco context menu path; add fixed overflow widget option and a unit guard.
- expecting: Monaco overflow/context UI uses fixed positioning and is not offset by the canvas transform.
- next_action: run focused editor tests, typecheck, build

## Evidence

- Canvas applies `transform: scale(...) translate(...)` to the world div that contains canvas nodes.
- EditorPanel uses Monaco's default built-in context menu; Cate does not intercept editor body right-clicks with native `showContextMenu`.
- Monaco exposes `fixedOverflowWidgets`, which is intended for overflow UI under transformed ancestors.

## Eliminated

## Resolution

- root_cause: Monaco's built-in overflow/context UI was using default positioning while the editor lived inside the Canvas world transform. That can apply canvas pan/zoom transform math to the menu placement, making it appear down and to the right of the pointer.
- fix: Enable `fixedOverflowWidgets` for both regular Monaco editors and Monaco diff editors created by `EditorPanel`.
- verification:
  - `npm test -- src/renderer/panels/EditorPanel.test.tsx` passed: 30 tests.
  - `npm run typecheck` passed.
- files_changed:
  - `src/renderer/panels/EditorPanel.tsx`
  - `src/renderer/panels/EditorPanel.test.tsx`
