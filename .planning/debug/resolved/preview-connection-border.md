---
status: resolved
trigger: "Add a left-side border to Markdown preview chunks that have one or more semantic connection cards"
created: 2026-06-17
updated: 2026-06-17
---

# Preview Connection Border

## Symptoms

- Expected behavior: In Markdown preview mode, chunks with one or more semantic connection cards should show a subtle left border so the user knows the chunk is clickable for connections.
- Actual behavior: Chunks show hover/selection/caution states, but no persistent indicator for non-zero connection count.
- Error messages: None.
- Timeline: Requested after whole-document connection aggregation was corrected.
- Reproduction: Open a Markdown document in preview mode, open Graph / connections view, inspect chunks that have connections.

## Current Focus

- hypothesis: The semantic connections panel can publish connected chunk IDs into the existing preview selection store, and the Markdown preview can render a left border for those chunk IDs.
- test: Add unit/integration coverage around store state, panel publication, and preview chunk styling.
- expecting: Only chunks with non-empty `result.byChunkId[chunkId]` receive the border style.
- next_action: User visual verification in Cate dev mode.

## Evidence

- timestamp: 2026-06-17
  observation: `SemanticConnectionsPanel` already computes `result.byChunkId` and is scoped by source editor panel id.
- timestamp: 2026-06-17
  observation: `EditorPanel` Markdown preview wraps heading chunks in `div[data-chunk-id]` and reads scoped state from `usePreviewSelectionStore`.

## Eliminated

## Resolution

- root_cause: Markdown preview chunks had selection and caution decoration state, but no persisted per-chunk state for "this section has semantic connection cards."
- fix: Added scoped `connectedChunkIds` to the preview selection store, published non-empty `result.byChunkId` IDs from the Semantic Connections panel, and rendered a subtle `#2dd4bf4d` left border on matching preview chunks.
- verification: `npm test -- src/renderer/stores/previewSelectionStore.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx`; `npm run typecheck`; `npm run build`.
- files_changed: src/renderer/stores/previewSelectionStore.ts; src/renderer/panels/SemanticConnectionsPanel.tsx; src/renderer/panels/EditorPanel.tsx; related tests
