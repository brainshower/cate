---
status: resolved
trigger: "When opening a connection from one Canvas document to another already-open preview document, Cate scrolls the target document to the right chunk but does not leave that chunk selected."
created: 2026-06-18
updated: 2026-06-18
---

## Symptoms

- Expected behavior: Clicking a connection card open/link icon should scroll the target preview document to the relevant chunk and select that preview chunk as if the user clicked it.
- Actual behavior: The target preview document scrolls correctly, but the chunk is not visibly selected and associated Outline/Connections sidebars do not reflect the selected target section.
- Error messages: None reported.
- Timeline: Observed with two Canvas documents open, both with Connections panels open.
- Reproduction: In document A's Connections panel, click the open/link icon for a card that targets document B, which is already open in preview mode.

## Current Focus

- hypothesis: The connection card carries a FlashQuery chunk id, but Cate preview selection expects a preview DOM chunk id. The open handler scrolls the target preview, then overwrites the target editor's correct selection with the FlashQuery chunk id.
- test: Adjusted renderer coverage for registered-preview connection opens to use a FlashQuery target chunk id and assert target preview selection uses the target editor's resolved preview chunk id.
- expecting: Cross-document open scrolls the target preview and leaves `previewSelectionStore` scoped to the target editor panel with the preview chunk id.
- next_action: resolved

## Evidence

- timestamp: 2026-06-18
  observation: `scrollPreviewToHeading()` selects the DOM preview chunk id inside the target editor, but `SemanticConnectionsPanel.openRegisteredPreview()` immediately called `selectSection()` with `connection.target.chunkId`.
- timestamp: 2026-06-18
  observation: For document-connections cards, `connection.target.chunkId` can be a FlashQuery chunk id rather than Cate's preview chunk id, so the second selection write fails to match preview decorations and sidebars.

## Eliminated

## Resolution

- root_cause: Cross-document preview navigation mixed FlashQuery chunk identifiers with Cate preview chunk identifiers. The scroll succeeded by heading, but the selected section was overwritten with the non-preview chunk id.
- fix: Resolve the target preview chunk id through the registered target editor before selecting. For same-document preview opens, select the resolved preview chunk id instead of blindly reusing the card target chunk id.
- verification: `npm test -- src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx`; `npm run typecheck`; `npm run build`.
- user_verification: Confirmed working in Cate dev on 2026-06-18.
- files_changed: src/renderer/panels/SemanticConnectionsPanel.tsx, src/renderer/panels/SemanticConnectionsPanel.test.tsx.
