---
status: resolved
trigger: "In Cate canvas windows, the top-right hover-to-resize area makes it difficult to click the X close button."
created: "2026-06-10T18:04:19Z"
updated: "2026-06-10T18:05:43Z"
---

# Debug Session: Canvas Top Right Resize Close

## Symptoms

- expected_behavior: "The close button in the top-right of a focused canvas window should be easy to click, while resize handles remain available at the actual window edges/corners."
- actual_behavior: "Near the top-right corner, a large invisible resize hotspot overlaps the area where the close X lives, so users often trigger resize instead of close."
- error_messages: "No visible error."
- timeline: "Reported on 2026-06-10 while using canvas windows."
- reproduction: "Move the pointer to the top-right of a canvas node and try to click the X close control; the resize cursor/hotspot occupies a large area around the button."

## Current Focus

- hypothesis: "NodeResizeOverlay topRight uses width/height corner + band and is rendered after the node, so it overhangs inward over the top-right titlebar controls."
- test: "npx vitest run src/renderer/canvas/NodeResizeOverlay.test.tsx; npx vitest run src/renderer/hooks/useNodeResize.test.ts; npm run typecheck"
- expecting: "Top corner resize hotspots stay vertically outside the node interior while existing resize hitbox tests and typecheck pass."
- next_action: "complete"
- reasoning_checkpoint: ""
- tdd_checkpoint: "red confirmed; green verified"

## Evidence

- timestamp: "2026-06-10T18:02:40Z"
  observation: "NodeResizeOverlay defaults band=8 and corner=16, then renders topRight with top=-8, right=-8, width=24, height=24."
  supports: "The topRight hotspot extends from y=-8 to y=16 and x=-8 to x=16 relative to the top/right border, overlapping the node interior."
- timestamp: "2026-06-10T18:03:20Z"
  observation: "CanvasNode renders the resize frame after the node with the same z-index family and pointer-events enabled on overlay children."
  supports: "The invisible resize overlay can receive pointer events before the close button in overlapping areas."
- timestamp: "2026-06-10T18:03:55Z"
  observation: "Close/maximize/lock controls are 18px square and live in the node's top chrome at the same corner."
  supports: "A 16px inward top-right resize hotspot is large enough to cover a meaningful portion of the close control."
- timestamp: "2026-06-10T18:04:57Z"
  observation: "New NodeResizeOverlay geometry test failed before the fix: topRight height was 24px instead of 8px."
  supports: "The top-right resize hotspot extended 16px into the node interior."
- timestamp: "2026-06-10T18:05:31Z"
  observation: "After the fix, NodeResizeOverlay geometry test and existing useNodeResize hitbox tests passed."
  supports: "The top corner overlap was removed without breaking existing resize detection expectations."
- timestamp: "2026-06-10T18:05:43Z"
  observation: "TypeScript typecheck passed."
  supports: "The change is type-safe."

## Eliminated

- hypothesis: "The close button itself has an unusually small or misplaced hit target."
  reason: "The close button is a normal 18px GrabButton; the invisible topRight resize overlay was larger, rendered later, and overlapped the same area."

## Resolution

- root_cause: "NodeResizeOverlay top corner hotspots used height corner + band, so topRight covered y=-8..16 relative to the node top edge and overlapped top chrome controls."
- fix: "Changed topLeft/topRight overlay height to the outside resize band only, keeping the diagonal top-corner target in the outside gutter rather than over the titlebar."
- verification: "npx vitest run src/renderer/canvas/NodeResizeOverlay.test.tsx; npx vitest run src/renderer/hooks/useNodeResize.test.ts; npm run typecheck"
- files_changed: "src/renderer/canvas/NodeResizeOverlay.tsx; src/renderer/canvas/NodeResizeOverlay.test.tsx"
