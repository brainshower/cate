---
status: resolved
trigger: "When a document opens in the Monaco editor, Graph/connections takes a moment to load after clicking Graph; preload connections with document load so Graph displays immediately, and editor reload refreshes both document and connections."
created: 2026-06-18
updated: 2026-06-18
---

## Symptoms

- Expected behavior: Opening a FlashQuery Markdown document should also begin loading its semantic connections so the Graph panel can render from ready or in-flight data when opened.
- Actual behavior: Connections are requested only when the Graph panel opens, causing a visible wait.
- Error messages: None reported.
- Timeline: Observed after the FlashQuery `get_document(include: connections)` integration.
- Reproduction: Open a document in Monaco, click Graph, wait while connections load; reload should refresh both document and connections.

## Current Focus

- hypothesis: The editor load path can warm the existing semantic-connections cache using the same provider contract, and the Graph panel can consume the warmed/in-flight cache without issuing duplicate work.
- test: Added renderer coverage for document-open preload and explicit cache invalidation on reload.
- expecting: Document load starts connection fetch as soon as Markdown body content is available; Graph opens against the shared cached or in-flight result; editor reload invalidates and refetches.
- next_action: resolved

## Evidence

- timestamp: 2026-06-18
  observation: `SemanticConnectionsPanel` owned its local loading state, while the default FlashQuery semantic provider cache was module-local to the panel file. Therefore the provider request did not start until the Graph panel mounted.
- timestamp: 2026-06-18
  observation: Editor refresh previously fetched only `get_document(include: body)` and did not invalidate semantic connection cache entries when the body text stayed unchanged.

## Eliminated

## Resolution

- root_cause: Connections were lazy-loaded from the Graph panel lifecycle, so opening a document did not start the document-connections request. Existing cache keys also needed explicit invalidation for manual reloads where content hash is unchanged but embeddings/connections may have changed.
- fix: Added a shared renderer semantic-connections preload/default-provider helper, warmed it from `EditorPanel` when Markdown body content is loaded or reused, reused the same provider from `SemanticConnectionsPanel`, and added optional provider invalidation for manual reload/retry paths.
- verification: `npm test -- src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/SemanticConnectionsPanel.test.tsx`; `npm run typecheck`; `npm run build`.
- files_changed: src/renderer/lib/semanticConnections.ts, src/renderer/lib/semanticConnectionsProvider.ts, src/renderer/lib/semanticConnectionsPreload.ts, src/renderer/panels/EditorPanel.tsx, src/renderer/panels/SemanticConnectionsPanel.tsx, src/renderer/lib/semanticConnectionsProvider.test.ts, src/renderer/panels/EditorPanel.test.tsx.
