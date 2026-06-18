---
status: resolved
trigger: "Improve Semantic Connections cards by stripping Markdown from snippets and opening target documents at the chunk section"
created: 2026-06-17
updated: 2026-06-17
---

# Connections Card Readability And Open Reveal

## Symptoms

- Expected behavior: Connection card snippets/body previews are readable plain text without residual Markdown link/code/list syntax.
- Actual behavior: Card snippets can include raw Markdown, especially links and formatting characters, making compact cards harder to scan.
- Expected behavior: Opening a connection target should open the document and scroll/reveal the section containing the target chunk.
- Actual behavior: Already-open preview editors scroll to a heading, but newly opened editors only open the document.
- Error messages: None.
- Timeline: Observed during Semantic Connections UI review.
- Reproduction: Open document connections, inspect card snippets with Markdown content, click a cross-document card target that is not already open.

## Current Focus

- hypothesis: Card display text can be normalized at render time, and the existing one-shot editor reveal registry can be extended from line-only reveals to heading-based reveals for newly opened documents.
- test: Add card text normalization tests and target-open reveal tests for createEditor/openFile paths.
- expecting: Card text shows plain text, and newly created/opened target editor panels receive a pending heading reveal.
- next_action: User visual verification in Cate.

## Evidence

- timestamp: 2026-06-17
  observation: `ConnectionCard` renders `connection.target.snippet` / `body` directly.
- timestamp: 2026-06-17
  observation: `editorReveal` already provides one-shot pending line reveals consumed by `EditorPanel` after model load.
- timestamp: 2026-06-17
  observation: `SemanticConnectionsPanel` has target heading metadata when enabling the Open button.

## Eliminated

## Resolution

- root_cause: Connection cards rendered raw chunk Markdown directly, and newly opened target editors only had line-based pending reveal support from terminal links.
- fix: Card text is normalized to compact plain text at render time; Semantic Connections now sets a pending heading reveal when opening a new target editor and reveals the heading immediately for already-open source editors. If the heading cannot be found, the document simply opens normally at the default top position.
- verification: `npm test -- src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx src/renderer/lib/editorReveal.test.ts`; `npm run typecheck`; `npm run build`.
- files_changed: src/renderer/panels/SemanticConnectionsPanel.tsx; src/renderer/panels/SemanticConnectionsPanel.test.tsx; src/renderer/panels/EditorPanel.tsx; src/renderer/panels/EditorPanel.test.tsx; src/renderer/lib/editorReveal.ts
