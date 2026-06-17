---
status: resolved
trigger: "Cate whole document semantic connections always show 12 total items regardless of document"
created: 2026-06-17
updated: 2026-06-17
---

# Cate Whole Document Connections Limit

## Symptoms

- Expected behavior: Whole Document semantic connections should reflect the aggregate unique outbound links across stored document chunks.
- Actual behavior: Multiple documents show exactly 12 Whole Document connections.
- Error messages: None observed.
- Timeline: Observed after Cate was updated to use FlashQuery `get_document` connections.
- Reproduction: Open different Markdown documents in Cate preview, open Graph / connections view, select Whole Document.

## Current Focus

- hypothesis: Cate is applying a hard-coded backend request limit of 12, so the displayed count is a fetch cap rather than the true aggregate count.
- test: Inspect renderer provider and panel count/display logic; update request cap if confirmed.
- expecting: Provider sends `limit: 12` to `flashqueryDocumentConnections`, and the panel count uses the returned `overall.length`.
- next_action: Verify in running Cate dev session against real documents.

## Evidence

- timestamp: 2026-06-17
  observation: `src/renderer/lib/semanticConnectionsProvider.ts` calls `flashqueryDocumentConnections` with `limit: 12` and `limit_per_chunk: 5`.
- timestamp: 2026-06-17
  observation: `src/renderer/panels/SemanticConnectionsPanel.tsx` derives the Whole Document badge and list count from `result.overall.length`.

## Eliminated

## Resolution

- root_cause: Cate was sending `limit: 12` to the FlashQuery `get_document` connections path, so Whole Document counts reflected the renderer request cap rather than the full aggregate returned by FlashQuery.
- fix: Increased the renderer document-connections aggregate request limit to 200 while preserving per-source-chunk fanout at 5. The legacy semantic-search fallback remains capped at 12.
- verification: `npm test -- src/renderer/lib/semanticConnectionsProvider.test.ts`; `npm test -- src/main/flashquery/clientManager.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts src/main/ipc/flashquery.test.ts src/shared/ipc-channels.test.ts`; `npm run typecheck`; `npm run build`.
- files_changed: src/renderer/lib/semanticConnectionsProvider.ts; src/renderer/lib/semanticConnectionsProvider.test.ts
