---
status: resolved
trigger: "Semantic connections preload works for the first Canvas document, but a second opened document still shows Loading connections for about 3 seconds when Graph is opened."
created: 2026-06-18
updated: 2026-06-18
---

## Symptoms

- Expected behavior: Every opened FlashQuery Markdown document warms semantic connections when its body is loaded, so opening Graph can use a completed or in-flight shared request.
- Actual behavior: The first Canvas document preloads correctly, but at least one subsequently opened document does not appear to start the connections request until Graph opens.
- Error messages: None reported.
- Timeline: Observed immediately after adding document-load semantic connection preloading.
- Reproduction: Open one document on Canvas and verify Graph opens quickly. Open another document, then open Graph; observe Loading connections for about 3 seconds.

## Current Focus

- hypothesis: The first fix warmed mapped semantic connections only after the editor body arrived, and the follow-up raw prefetch still made body and connections separate renderer requests instead of the intended single `get_document` call.
- test: Added focused coverage proving FlashQuery Markdown body load and editor reload use one `get_document` call with `include: ['body', 'connections']`, do not call standalone document connections, and seed the Graph cache from the combined response.
- expecting: FlashQuery Markdown editor mount and title-bar reload fetch body plus connections in one request; Graph later reads the seeded shared cache and only performs markdown mapping.
- next_action: resolved

## Evidence

- timestamp: 2026-06-18
  observation: The editor preload path called `preloadSemanticConnections` only after `flashqueryGetDocument(include: ['body'])` resolved and supplied markdown. This meant the connections request was not truly concurrent with document body loading.
- timestamp: 2026-06-18
  observation: FlashQuery `get_document` supports `include: ['body', 'connections']`, so Cate should not split editor body load and document connections into separate renderer IPC calls.

## Eliminated

## Resolution

- root_cause: Cate's editor body load was still separate from Graph's document-connections load. Even the first follow-up made the connections request concurrent but separate, which missed the intended FlashQuery `get_document` envelope.
- fix: Extended Cate's shared FlashQuery `getDocument` input/output types, IPC validation, and main-process manager to support `connections`; changed editor body load and title-bar reload to call `flashqueryGetDocument` once with body plus connections; seeded the shared Graph cache from the combined response.
- verification: `npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/shared/types.test.ts`; `npm run typecheck`; `npm run build`.
- user_verification: Confirmed working in Cate dev on 2026-06-18.
- files_changed: src/shared/types.ts, src/main/ipc/flashquery.ts, src/main/flashquery/clientManager.ts, src/renderer/lib/semanticConnectionsDocumentCache.ts, src/renderer/lib/semanticConnectionsProvider.ts, src/renderer/panels/EditorPanel.tsx, src/renderer/panels/EditorPanel.test.tsx, src/main/flashquery/clientManager.test.ts, src/main/ipc/flashquery.test.ts.
