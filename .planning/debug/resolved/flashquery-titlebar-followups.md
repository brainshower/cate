---
status: resolved
trigger: "For the `/Users/matt/Documents/Claude/Projects/Cate/cate/` repo: screenshot shows three FlashQuery editor title-bar problems: the vault information takes too much tab space and hides/runs into the filename; clicking the show frontmatter button while the editor is in canvas does nothing, though docked main-window editor works; the three FlashQuery action buttons have no hover tooltips."
created: "2026-06-06"
updated: "2026-06-06"
---

# Debug Session: flashquery-titlebar-followups

## Symptoms

- expected_behavior: FlashQuery editor tabs should leave enough room for filenames while still showing vault/source metadata; canvas-hosted Open frontmatter should open frontmatter in the same canvas node/tab context; title-bar action buttons should expose hover tooltips explaining refresh, frontmatter, and copy actions.
- actual_behavior: Vault badge occupies enough tab width that the filename is truncated/hidden; canvas Open frontmatter click does nothing; action buttons show only icons with no useful hover tooltip visible.
- error_messages: No visible error reported.
- timeline: Reported on 2026-06-06 after the title action row placement fix.
- reproduction: Open a FlashQuery vault document in a canvas-hosted editor, inspect the tab/title bar, hover the three FlashQuery action buttons, and click the frontmatter button.

## Current Focus

- hypothesis: The tab crowding comes from rendering a wide VaultBadge inside a fixed-width tab; canvas frontmatter actions need explicit workspace context in canvas-node mini-docks; native-only title attributes are not enough for visible action button tooltips inside Electron/dock chrome.
- test: Focused docking/action and frontmatter/canvas store tests, plus TypeScript typecheck.
- expecting: Vault editor tabs preserve filename room, canvas-hosted frontmatter clicks route through the correct workspace/canvas node, and each FlashQuery action button shows an explicit visible hover tooltip.
- next_action: complete
- reasoning_checkpoint: Canvas node chrome was relying on selected workspace instead of the owning canvas panel workspace. That is brittle in canvas-hosted mini-docks and can make the action callback target the wrong workspace. The title action row is also inside an overflow-hidden tab bar, so tooltips must be fixed-position or otherwise escape clipping.
- tdd_checkpoint: Added/updated focused tests for tab width treatment and visible hover tooltips; existing appStore/canvasStore tests cover canvas frontmatter placement.

## Evidence

- timestamp: "2026-06-06"
  observation: "DockTabBar still rendered VaultBadge inside the tab pill with a 120px badge cap and a 280px vault-tab cap, leaving too little room for filenames in compact canvas title bars."
  supports: "The screenshot's filename truncation/collision is explained by tab title and vault metadata competing inside the same constrained flex row."
- timestamp: "2026-06-06"
  observation: "CanvasNode mini-dock DockTabStack did not receive workspaceId and CanvasNodeWrapper orphan cleanup read selectedWorkspaceId instead of the canvas panel's workspaceId."
  supports: "Canvas-hosted title actions could route frontmatter through stale/wrong workspace context, unlike main docked editors."
- timestamp: "2026-06-06"
  observation: "A live canvas-node dock store inserted the frontmatter tab, but placePanelInCanvasNode did not immediately persist that live store layout back to the backing canvas node."
  supports: "The mounted canvas-node path could appear to do nothing or lose the inserted frontmatter tab even though docked main-window placement worked."
- timestamp: "2026-06-06"
  observation: "FlashQueryEditorTitleActions relied on native title attributes only. Explicit fixed-position role=tooltip elements were absent."
  supports: "Users had no visible designed tooltip feedback for the three icon-only actions."
- timestamp: "2026-06-06"
  observation: "Focused tests passed: npm test -- src/renderer/stores/appStore.test.ts src/renderer/docking/DockTabBar.test.tsx src/renderer/components/VaultBadge.test.tsx."
  supports: "Tab/action regressions and frontmatter/canvas routing coverage are green."
- timestamp: "2026-06-06"
  observation: "Typecheck passed: npm run typecheck."
  supports: "Canvas workspace-id plumbing and tooltip component compile cleanly."

## Eliminated

- hypothesis: "The action component click handler is entirely unwired."
  reason: "Focused tests verify Open frontmatter calls openFlashQueryFrontmatterEditor with the provided workspaceId and source panel id."
- hypothesis: "The frontmatter routing store code cannot insert canvas-node tabs at all."
  reason: "Existing appStore/canvasStore tests pass for canvas frontmatter tab insertion and nested canvas-node panel lookup."

## Resolution

- root_cause: "The vault tab layout gave metadata too much fixed space relative to the filename; canvas-node title actions relied on selected workspace instead of the owning canvas workspace and live canvas-node frontmatter insertion did not persist the updated node dock layout; action buttons had only native title attributes and no explicit visible tooltip UI."
- fix: "Widened vault editor tab caps, compacted the VaultBadge in compact mini-docks, threaded workspaceId through CanvasPanel -> CanvasNode -> DockTabStack, updated canvas orphan cleanup to use the owning workspace, persisted live canvas-node dock layouts after frontmatter insertion, and added fixed-position visible tooltips to FlashQueryEditorTitleActions."
- verification: "npm test -- src/renderer/stores/appStore.test.ts src/renderer/docking/DockTabBar.test.tsx src/renderer/components/VaultBadge.test.tsx; npm run typecheck."
- files_changed: "src/renderer/components/FlashQueryEditorTitleActions.tsx; src/renderer/components/VaultBadge.tsx; src/renderer/docking/DockTabBar.tsx; src/renderer/docking/DockTabBar.test.tsx; src/renderer/canvas/CanvasNode.tsx; src/renderer/panels/CanvasPanel.tsx; src/renderer/stores/appStore.ts; src/renderer/stores/appStore.test.ts; .planning/debug/flashquery-titlebar-followups.md"
