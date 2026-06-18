---
status: resolved
trigger: "Move the Semantic Connections config button from the title bar into the panel scope row next to the connection count"
created: 2026-06-17
updated: 2026-06-17
---

# Connections Config Button Placement

## Symptoms

- Expected behavior: The config icon/button appears inside the Connections panel, on the Scope row, immediately left of the total connection count.
- Actual behavior: The config button appears in the window/title-bar chrome.
- Error messages: None.
- Timeline: Observed during Semantic Connections UI review.
- Reproduction: Open the Semantic Connections sidebar/window and inspect the title bar and Scope row.

## Current Focus

- hypothesis: `DockTabStack` injects `SemanticConnectionsTitleActions` into title chrome, while `SemanticConnectionsPanel` owns the Scope row and can render the control there directly.
- test: Remove title-bar render path, add in-panel button, and update tests to assert placement/toggle behavior.
- expecting: No `semantic-connections-title-action-row` render path remains; `Configure semantic connections` is rendered in `SemanticConnectionsPanel` before the connection count.
- next_action: User visual verification in Cate.

## Evidence

- timestamp: 2026-06-17
  observation: `DockTabStack.tsx` renders `SemanticConnectionsTitleActions` for `activePanel.type === 'semantic-connections'`.
- timestamp: 2026-06-17
  observation: `SemanticConnectionsPanel.tsx` renders the Scope row and connection count.

## Eliminated

## Resolution

- root_cause: The Semantic Connections config button was rendered through `DockTabStack` title chrome instead of inside the panel header where the Scope controls and count live.
- fix: Removed the Semantic Connections title-bar action path, deleted its orphaned component/test, and rendered the config icon directly in the panel Scope row immediately left of the connection count.
- verification: `npm test -- src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/docking/DockTabBar.test.tsx src/renderer/panels/CanvasPanel.test.tsx`; `npm run typecheck`; `npm run build`.
- files_changed: src/renderer/panels/SemanticConnectionsPanel.tsx; src/renderer/panels/SemanticConnectionsPanel.test.tsx; src/renderer/docking/DockTabStack.tsx; src/renderer/components/SemanticConnectionsTitleActions.tsx; src/renderer/components/SemanticConnectionsTitleActions.test.tsx
