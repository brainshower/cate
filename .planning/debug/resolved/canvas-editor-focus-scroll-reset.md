---
status: resolved
trigger: "Canvas Monaco editor opened from semantic connections jumps to the relevant chunk, then scrolls to the top when the newly opened editor gains focus"
created: 2026-06-18
updated: 2026-06-18
---

# Canvas Editor Focus Scroll Reset

## Symptoms

- Expected behavior: When a connection card opens another document on the canvas, the target editor remains scrolled to the relevant section after the user focuses that editor.
- Actual behavior: The target editor initially opens at the correct relevant chunk, but when it gains focus it consistently scrolls to the top of the document.
- Error messages: None reported.
- Timeline: Observed after adding preview/open-to-heading behavior for semantic connection cards.
- Reproduction: Open two Monaco editors on the canvas. In one document, open Connections. Click a connection card link to another document. The new editor opens at the relevant chunk. Click/focus the newly opened editor and it scrolls back to the top.

## Current Focus

- hypothesis: Registered target editors were being scrolled before their canvas node/dock tab was focused. The subsequent focus/layout pass could then reset preview scroll to the top or another section. The first attempted fix also consumed its one-shot refocus scroll immediately because the node was already focused before the editor mounted.
- test: Focus/raise the existing target panel before delayed preview scroll/selection; keep the editor-level refocus scroll armed only for future focus epochs.
- expecting: Existing and newly opened preview targets remain on the requested chunk, and the chunk stays selected/highlighted.
- next_action: Closed after user manual verification in dev app.

## Evidence

- timestamp: 2026-06-18
  observation: `EditorPanel` consumes pending heading reveal before/while opening markdown preview, and preview scrolling is a one-shot effect.
- timestamp: 2026-06-18
  observation: Canvas node focus increments `focusEpoch` and updates z-order, causing the node subtree to re-render when clicking an unfocused canvas editor.
- timestamp: 2026-06-18
  observation: `TerminalPanel` already uses canvas focus epoch to re-run focus-sensitive behavior when the same node is refocused.
- timestamp: 2026-06-18
  observation: Regression test `keeps a pending preview reveal visible after the canvas node is refocused` passes.
- timestamp: 2026-06-18
  observation: `SemanticConnectionsPanel.openRegisteredPreview` previously called `scrollPreviewToHeading` before focusing the target editor/panel.
- timestamp: 2026-06-18
  observation: Added `focusPanel` app-store action and injected `focusEditorForOpen` so registered target opens can focus the canvas node/dock tab first, then scroll after layout settles.
## Eliminated

## Resolution

- root_cause: Registered preview targets were scrolled before their canvas node or dock tab was focused. The later focus/layout pass could reset the preview scroll position, and the initial refocus workaround could consume itself on mount before the user's later focus action.
- fix: Store the last pending preview heading reveal as a future-only one-shot refocus reveal; for registered target editors, focus/raise the target panel first and then scroll/select after two animation frames.
- verification: `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/lib/editorReveal.test.ts`; `npm run typecheck`; `npm run build`.
- files_changed: `src/renderer/panels/EditorPanel.tsx`, `src/renderer/panels/EditorPanel.test.tsx`, `src/renderer/panels/SemanticConnectionsPanel.tsx`, `src/renderer/panels/SemanticConnectionsPanel.test.tsx`, `src/renderer/panels/types.ts`, `src/renderer/App.tsx`, `src/renderer/stores/appStore.ts`, `src/renderer/shells/DockWindowShell.tsx`, `src/renderer/shells/PanelWindowShell.tsx`.
