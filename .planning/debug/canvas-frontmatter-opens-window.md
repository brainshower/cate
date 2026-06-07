---
status: resolved
trigger: "When I use the button to open the frontmatter in the Canvas, it opens a separate window, instead of a separate tab. I anticipated a new tab would open with frontmatter in the same place where the document's body content is opened."
created: "2026-06-06T17:41:21Z"
updated: "2026-06-06T22:41:30Z"
---

# Debug Session: Canvas Frontmatter Opens Window

## Symptoms

- expected_behavior: "Clicking the frontmatter button for a document opened in Canvas should open frontmatter as a separate tab in the same Canvas window/tab strip where the document body is opened."
- actual_behavior: "Clicking the frontmatter button opens the frontmatter in a separate Canvas window."
- error_messages: "No error message reported; behavior visible in screenshot."
- timeline: "Reported on 2026-06-06. Whether this previously worked is unknown."
- reproduction: "Open a document body in the Canvas, then use the frontmatter button from that document/window."

## Current Focus

- hypothesis: "Unknown; gather initial evidence from Canvas tab/window creation code and frontmatter open action."
- test: "npx vitest run src/renderer/stores/appStore.test.ts; npm run typecheck"
- expecting: "FlashQuery frontmatter opened from a Canvas-hosted body editor is inserted into the source Canvas node's private tab strip, not placed as a new Canvas node."
- next_action: "complete"
- reasoning_checkpoint: "Root cause confirmed in appStore.openFlashQueryFrontmatterEditor: Canvas-hosted panels are not tracked in the global dock store, so the previous sourceLocation check fell through to placePanel(... target canvas), creating a separate Canvas node/window."
- tdd_checkpoint: ""

## Evidence

- timestamp: "2026-06-06T17:42:11Z"; observation: "Resolved debugger model to gpt-5.3-codex. Direct subagent tool was unavailable in this environment; the SDK runner was attempted, recognized as the wrong broader milestone interface, and stopped."
- timestamp: "2026-06-06T17:44:00Z"; observation: "Existing regression test in src/renderer/stores/appStore.test.ts expected openFlashQueryFrontmatterEditor to call addNodeAndFocus for Canvas-hosted source panels, encoding the reported separate-window behavior."
- timestamp: "2026-06-06T17:44:20Z"; observation: "src/renderer/stores/appStore.ts only checked useDockStore.panelLocations for source placement. Canvas node tab strips use per-node private DockStore instances and persisted node.dockLayout, so Canvas-hosted source panels have no global dock location."
- timestamp: "2026-06-06T17:45:30Z"; observation: "Implemented Canvas-node placement path using nodeDockRegistry live stores when mounted and persisted node dockLayout when not mounted; existing frontmatter panels now activate their Canvas-node tab and focus the node."
- timestamp: "2026-06-06T17:46:01Z"; observation: "npx vitest run src/renderer/stores/appStore.test.ts passed: 14 tests."
- timestamp: "2026-06-06T17:46:25Z"; observation: "npm run typecheck passed."
- timestamp: "2026-06-06T22:40:22Z"; observation: "Added a regression where a source editor is visibly mounted in a live canvas-node tab store while stale global useDockStore.panelLocations still marks it docked. Before the fix, the live canvas-node layout remained unchanged and the test failed."
- timestamp: "2026-06-06T22:40:52Z"; observation: "Changed openFlashQueryFrontmatterEditor to try placePanelInCanvasNode before trusting global dock metadata for both new and existing frontmatter panels. Focused regression suite passed: appStore, canvasStore, and DockTabBar."
- timestamp: "2026-06-06T22:41:10Z"; observation: "npm run typecheck passed."

## Eliminated

## Resolution

- root_cause: "openFlashQueryFrontmatterEditor treated Canvas-hosted editors as undocked because it only consulted the global dock store; it then routed frontmatter through canvas placement, creating a separate Canvas node/window instead of a tab in the source node."
- fix: "Added Canvas-node-aware frontmatter placement and focus logic in appStore.ts, using live per-node DockStore instances or persisted node.dockLayout to insert/activate the frontmatter tab next to the source editor."
- verification: "npx vitest run src/renderer/stores/appStore.test.ts; npm run typecheck"
- files_changed: "src/renderer/stores/appStore.ts; src/renderer/stores/appStore.test.ts; .planning/debug/canvas-frontmatter-opens-window.md"

## Follow-up Resolution 2026-06-06

- root_cause: "When an editor had stale global dock metadata but was visibly mounted in a canvas-node mini-dock, openFlashQueryFrontmatterEditor trusted the global dock location first. The frontmatter panel was inserted/focused in the hidden or stale global dock path instead of the live canvas-node tab strip, making the canvas button appear to do nothing."
- fix: "Changed new and existing frontmatter placement to prefer placePanelInCanvasNode(workspaceId, sourcePanelId, panelId) before using useDockStore.panelLocations[sourcePanelId]. Added a regression test for stale global dock location versus visible canvas-node ownership."
- verification: "npx vitest run src/renderer/stores/appStore.test.ts src/renderer/stores/canvasStore.test.ts src/renderer/docking/DockTabBar.test.tsx --pool=forks --maxWorkers=1 --reporter verbose --testTimeout=10000; npm run typecheck"
- files_changed: "src/renderer/stores/appStore.ts; src/renderer/stores/appStore.test.ts; .planning/debug/canvas-frontmatter-opens-window.md"
