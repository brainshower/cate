---
status: resolved
trigger: "Outline sidebar depth dropdown and search field are visually off-spec and overflow the sidebar."
created: 2026-06-15
updated: 2026-06-15
---

# Debug Session: outline-sidebar-controls

## Symptoms

- Expected behavior: Outline depth dropdown and search input match the Document Outline requirements/prototype styling, stay inside the sidebar width, and respect the active Cate theme.
- Actual behavior: Controls render as bright native fields and extend beyond the right edge of the Outline sidebar.
- Error messages: None.
- Timeline: Observed after bringing up the current Cate dev environment with the new Outline sidebar.
- Reproduction: Open an editor, toggle Outline in the right dock, inspect the depth dropdown and search field at the top of the Outline panel.

## Current Focus

- hypothesis: OutlinePanel used invalid Tailwind theme utility names for the control surfaces and lacked explicit containment classes for the controls.
- test: `npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx`
- expecting: Controls use valid Cate surface/text/border utilities plus min-width/max-width containment.
- next_action: resolved

## Evidence

- timestamp: 2026-06-15
  observation: The prototype `index.html` defines `.outline-search input` as width 100%, 12px text, 3px radius, theme background/text/border, and focus accent border.
- timestamp: 2026-06-15
  observation: `OutlinePanel.tsx` uses `bg-background`, `text-foreground`, `border-border`, `placeholder:text-muted-foreground`, and `hover:bg-muted`, which are not Cate's local Tailwind semantic utilities.

## Eliminated

## Resolution

- root_cause: OutlinePanel used non-existent semantic classes such as `bg-background`, `text-foreground`, `border-border`, `placeholder:text-muted-foreground`, and `hover:bg-muted`. The browser therefore rendered native white form controls. The controls also lacked explicit `box-border`, `min-w-0`, and `max-w-full` containment in the dock sidebar.
- fix: Replaced the Outline panel/control classes with valid Cate theme utilities (`bg-surface-2`, `text-primary`, `border-subtle`, `placeholder:text-muted`, `focus:border-focus`) and compact prototype-aligned sizing. Added explicit containment classes to the panel, control band, select, search wrapper, and search input.
- verification: Red `OutlinePanel.test.tsx` failed on missing containment/theme classes. Green `OutlinePanel.test.tsx` passed 27 tests. Focused outline/preview suite passed 4 files and 87 tests. `npm run typecheck` passed.
- files_changed: `src/renderer/panels/OutlinePanel.tsx`, `src/renderer/panels/OutlinePanel.test.tsx`

## Follow-up: Canvas Hosting Overflow

- timestamp: 2026-06-15
  observation: After the first fix, controls were visually themed but still extended past the right edge when Outline lived inside a Canvas node.
- root_cause: Canvas-node mini-docks render panel content through `DockTabStack`. The stack root and active content wrapper did not carry horizontal containment classes (`w-full`, `min-w-0`, `overflow-hidden`), so child panel controls could still visually overflow in the compact Canvas host even when the Outline component itself used contained fields.
- fix: Added width/min-width/overflow containment to `DockTabStack` root, tab bar, and active panel content wrapper.
- verification: Red `CanvasPanel.test.tsx` failed on the missing dock-stack containment class contract. Green `CanvasPanel.test.tsx` + `OutlinePanel.test.tsx` passed 29 tests. Focused canvas/dock/outline/preview suite passed 6 files and 97 tests. `npm run typecheck` passed.
- files_changed: `src/renderer/docking/DockTabStack.tsx`, `src/renderer/panels/CanvasPanel.test.tsx`
