---
phase: 27-graph-data-contract-and-whole-document-graph-view
reviewed: 2026-06-30T23:59:53Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - src/main/flashquery/clientManager.test.ts
  - src/main/flashquery/clientManager.ts
  - src/main/ipc/flashquery.test.ts
  - src/main/ipc/flashquery.ts
  - src/preload/index.test.ts
  - src/preload/index.ts
  - src/renderer/lib/semanticConnections.test.ts
  - src/renderer/lib/semanticConnections.ts
  - src/renderer/lib/semanticConnectionsProvider.test.ts
  - src/renderer/lib/semanticConnectionsProvider.ts
  - src/renderer/panels/SemanticConnectionsPanel.test.tsx
  - src/renderer/panels/SemanticConnectionsPanel.tsx
  - src/shared/electron-api.d.ts
  - src/shared/ipc-channels.ts
  - src/shared/types.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
---

# Phase 27: Code Review Report

**Reviewed:** 2026-06-30T23:59:53Z
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Reviewed the Phase 27 FlashQuery graph data contract, IPC/preload bridge, renderer provider, and semantic connections panel implementation. The main security boundary is maintained through typed preload APIs and main-process validation, but one user-visible graph-data contract path is incomplete: live backend community labels are normalized into `graphSummary` and then dropped before they can drive the whole-document summary UI.

## Narrative Findings (AI reviewer)

## Warnings

### WR-01: Live Graph Community Labels Never Reach the Summary UI

**File:** `src/renderer/lib/semanticConnectionsProvider.ts:599`
**Issue:** `buildConnectionsResultFromDocumentConnections` preserves `response.graph_summary` as `graphSummary`, but never derives or assigns `communitySummary`. The whole-document panel reads only `result.communitySummary` for its Summary block at `src/renderer/panels/SemanticConnectionsPanel.tsx:377`, so real FlashQuery responses containing `graph_summary.community_labels` cannot render the community summary/label UI. The tests exercise `communitySummary` only by manually constructing provider results (`src/renderer/lib/semanticConnectionsProvider.test.ts:179`, `src/renderer/panels/SemanticConnectionsPanel.test.tsx:209`), which misses the live provider path.
**Fix:** Map the graph summary labels into `communitySummary` when building provider results, or remove the panel contract if FlashQuery is not expected to provide it. For example:

```ts
const communityLabels = response.graph_summary?.community_labels ?? []
const communitySummary = communityLabels.length > 0
  ? {
      dominantLabel: communityLabels[0],
      labels: communityLabels,
    }
  : undefined

return {
  mode: deriveMode(response.graph_summary, renderedConnections),
  overall,
  byChunkId,
  chunkOrder: mapping.chunkOrder,
  chunkMap: mapping.chunkMap,
  diagnostics: [
    ...mapping.diagnostics,
    ...(response.diagnostics ?? []),
    ...unknownRelationDiagnostics(renderedConnections),
  ],
  ...(response.graph_summary ? { graphSummary: response.graph_summary } : {}),
  ...(communitySummary ? { communitySummary } : {}),
}
```

Add a provider-boundary test that passes `graph_summary.community_labels` through `createFlashQuerySemanticConnectionsProvider` and asserts `result.communitySummary`, rather than only seeding `communitySummary` directly in fixtures.

---

_Reviewed: 2026-06-30T23:59:53Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
