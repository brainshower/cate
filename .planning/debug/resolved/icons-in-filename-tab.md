---
status: resolved
trigger: "In this repo: `/Users/matt/Documents/Claude/Projects/Cate/cate/` We have the icons on the left instead of on the right, as designed: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Designs/Design 3 - Editor title-bar action row` The icons are being put in the tab with the filename, when they should be on the right side of the window."
created: "2026-06-06"
updated: "2026-06-06"
---

# Debug Session: icons-in-filename-tab

## Symptoms

- expected_behavior: Editor title-bar action icons should appear on the right side of the editor window, matching the Design 3 title-bar action row reference.
- actual_behavior: The icons appear on the left and are being placed inside the tab with the filename.
- error_messages: No runtime error reported; visual/layout regression shown in screenshot.
- timeline: Reported on 2026-06-06 during Cate FlashQuery milestone 2 design verification.
- reproduction: Open an editor tab/window with the title-bar action row enabled and inspect the top chrome. Icons appear in the filename tab area instead of right-aligned in the window title bar.

## Current Focus

- hypothesis: Confirmed. FlashQuery editor title action buttons were mounted inside DockTabBar's active editor TabPill instead of DockTabStack's right-side title/header control area.
- test: npx vitest run src/renderer/docking/DockTabBar.test.tsx --pool=forks --maxWorkers=1 --reporter verbose --testTimeout=10000; npm run typecheck
- expecting: Dock tab pills contain filename/title, vault badge, and close affordance only; FlashQuery editor action buttons render in the right-side title-bar action row for the active editor.
- next_action: complete
- reasoning_checkpoint: The action component is generic title-bar chrome. Rendering it from DockTabBar tied it to the filename tab layout, causing the reported left-side placement. Moving it to DockTabStack places it after the flexible tab spacer and before the dock controls on the right side of the editor/window header.
- tdd_checkpoint: Focused regression coverage asserts the buttons are absent from the tab pill; direct action-component tests preserve copy, refresh, and frontmatter behavior.

## Evidence

- timestamp: 2026-06-06 20:19:00 -0300
  observation: `src/renderer/docking/DockTabBar.tsx` imported and rendered `FlashQueryEditorTitleActions` inside the active editor `TabPill`, immediately after the filename span.
  supports: Root cause matches symptom: action icons appeared inside the filename tab on the left.
- timestamp: 2026-06-06 20:19:30 -0300
  observation: `src/renderer/docking/DockTabStack.tsx` owns the tab bar's right-side header controls (`+`, split, and host trailing controls), making it the correct placement boundary for active editor title actions.
  supports: Moving the action row from DockTabBar to DockTabStack aligns with the design reference's right-side title-bar action row.
- timestamp: 2026-06-06 20:24:30 -0300
  observation: `npx vitest run src/renderer/docking/DockTabBar.test.tsx --pool=forks --maxWorkers=1 --reporter verbose --testTimeout=10000` passed: 1 file, 7 tests.
  supports: Regression coverage confirms FlashQuery editor action buttons are no longer rendered inside the tab pill and still dispatch/call correctly.
- timestamp: 2026-06-06 20:25:00 -0300
  observation: `npm run typecheck` passed.
  supports: JSX and TypeScript changes compile cleanly.

## Eliminated

- hypothesis: The action component itself dispatches the wrong events.
  reason: Direct component tests verify copy/refresh dispatch and frontmatter action still work after relocating the component.
- hypothesis: Detached panel windows are the failing path.
  reason: The reported screenshot and code path match dock tab chrome; detached panel title bars already render title actions separately on the right.

## Resolution

- root_cause: `DockTabBar` rendered `FlashQueryEditorTitleActions` inside the active editor tab pill, so the buttons became part of the filename tab instead of the editor title-bar action area.
- fix: Removed the action row from `DockTabBar` and rendered it from `DockTabStack` in the right-side header controls for the active editor panel.
- verification: `npx vitest run src/renderer/docking/DockTabBar.test.tsx --pool=forks --maxWorkers=1 --reporter verbose --testTimeout=10000` passed; `npm run typecheck` passed.
- files_changed: `/Users/matt/Documents/Claude/Projects/Cate/cate/src/renderer/docking/DockTabBar.tsx`; `/Users/matt/Documents/Claude/Projects/Cate/cate/src/renderer/docking/DockTabStack.tsx`; `/Users/matt/Documents/Claude/Projects/Cate/cate/src/renderer/docking/DockTabBar.test.tsx`
