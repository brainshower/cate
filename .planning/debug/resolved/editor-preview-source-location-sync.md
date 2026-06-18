---
status: resolved
trigger: "Keep editor location when toggling source/preview and open semantic connection targets in preview at the target heading"
created: 2026-06-18
updated: 2026-06-18
---

# Editor Preview Source Location Sync

## Symptoms

- Expected behavior: Switching Markdown source to Preview keeps the user near the same document section instead of starting at the top.
- Actual behavior: Preview starts at line 1 after toggling from source.
- Expected behavior: Switching Preview to source after selecting a section reveals the corresponding source heading.
- Actual behavior: Source opens without moving to the selected preview section.
- Expected behavior: Opening a semantic connection target prefers Markdown Preview and jumps to the target heading when possible.
- Actual behavior: New target editor opens in source mode by default.

## Current Focus

- hypothesis: Source/preview can share Markdown heading identity. Source cursor line maps to nearest enclosing heading; selected preview chunk maps back to a heading id; connection opens can set the new editor to preview and use existing pending heading reveal.
- test: Add EditorPanel toggle tests and SemanticConnectionsPanel open-preview tests.
- expecting: Missing heading resolution degrades to normal toggle/open behavior.
- next_action: Patch editor toggle, connection open handler, and shell injection paths.

## Evidence

- timestamp: 2026-06-18
  observation: `EditorPanel` already exposes `scrollPreviewToHeading` and consumes pending heading reveal.
- timestamp: 2026-06-18
  observation: `SemanticConnectionsPanel` already sets pending heading reveal when opening a new target editor.
- timestamp: 2026-06-18
  observation: `SemanticConnectionsPanelProps` already includes `setEditorPreviewForOpen`, but the panel was not using it and shell injectors were not passing it.

## Eliminated

## Resolution

- root_cause: Markdown source/preview mode switches did not preserve a shared location token, and semantic connection opens requested a pending heading reveal but did not ask the target editor to open in Markdown Preview.
- fix: Map the source cursor to the nearest enclosing Markdown heading when switching to Preview, map selected preview chunks back to source heading lines when switching to Source, and request preview mode when semantic connection cards open target documents. Pending heading reveals now also work for editors born directly in Preview mode.
- verification: `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/lib/editorReveal.test.ts`; `npm run typecheck`; `npm run build`.
- files_changed: `src/renderer/panels/EditorPanel.tsx`, `src/renderer/panels/EditorPanel.test.tsx`, `src/renderer/panels/SemanticConnectionsPanel.tsx`, `src/renderer/panels/SemanticConnectionsPanel.test.tsx`, `src/renderer/panels/types.ts`, `src/renderer/App.tsx`, `src/renderer/shells/DockWindowShell.tsx`, `src/renderer/shells/PanelWindowShell.tsx`.
