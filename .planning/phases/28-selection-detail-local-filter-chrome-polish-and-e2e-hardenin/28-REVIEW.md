---
phase: 28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin
reviewed: 2026-07-01T11:50:33Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/renderer/lib/semanticConnections.ts
  - src/renderer/lib/semanticConnections.test.ts
  - src/renderer/lib/semanticConnectionsProvider.ts
  - src/renderer/lib/semanticConnectionsProvider.test.ts
  - src/renderer/panels/SemanticConnectionsPanel.tsx
  - src/renderer/panels/SemanticConnectionsPanel.test.tsx
  - src/renderer/stores/semanticConnectionsChromeStore.ts
  - src/renderer/lib/e2eHarness.ts
  - src/renderer/lib/e2eHarness.test.tsx
  - e2e/semantic-connections-graph.spec.ts
  - e2e/semantic-connections-inspector.spec.ts
  - e2e/semantic-connections-preview-selection.spec.ts
  - e2e/flashquery-editor-refresh-frontmatter.spec.ts
findings:
  critical: 0
  warning: 1
  info: 0
  total: 1
status: issues_found
resolved:
  critical: 1
---

# Phase 28: Code Review Report

**Reviewed:** 2026-07-01T11:50:33Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

Reviewed the Phase 28 Semantic Connections renderer helpers, provider enrichment, panel behavior, chrome store, E2E harness, and Playwright coverage. The main functional surface is well covered. The critical diagnostic redaction issue found in this review has been fixed and verified; one detached-window regression path remains disabled rather than covered.

## Narrative Findings (AI reviewer)

## Resolved Critical Issues

### CR-01: Query graph diagnostics can leak bearer tokens — RESOLVED

**File:** `src/renderer/lib/semanticConnectionsProvider.ts:612`
**Classification:** BLOCKER
**Issue:** `backfillNodeMeta()` appends raw `payload.error` and raw caught exception messages into `result.diagnostics` at lines 612-622. `backfillEdgeMetadata()` only redacts the catch path at line 672, while its `payload.error` branch at line 663 is also raw. These diagnostics are kept in renderer state and can be surfaced to debugging, test harness, telemetry, or future UI. Because FlashQuery failures often include request context, an upstream error such as `Bearer <token>` would be preserved verbatim.
**Fix:** Redact all query_graph diagnostic sources before appending them, not only edge thrown errors.

```ts
if (payload.error) {
  diagnostics.push(`Unable to load node metadata for ${entry.flashqueryChunkId}: ${redactedDiagnosticMessage(payload.error)}`)
  return
}

// ...

} catch (error) {
  diagnostics.push(
    `Unable to load node metadata for ${entry.flashqueryChunkId}: ${redactedDiagnosticMessage(error)}`,
  )
}
```

Apply the same `redactedDiagnosticMessage(payload.error)` treatment to the edge metadata `payload.error` branch.

**Resolution:** Fixed after review. Node metadata `payload.error`, node metadata thrown errors, and edge metadata `payload.error` now pass through `redactedDiagnosticMessage()` before entering `result.diagnostics`.

**Verification:** `npm run test:unit -- src/renderer/lib/semanticConnectionsProvider.test.ts` passed with 23 tests, including bearer redaction assertions for thrown node errors and node/edge `payload.error` diagnostics.

## Warnings

### WR-01: Detached dock-window Semantic Connections regression is skipped

**File:** `e2e/semantic-connections-inspector.spec.ts:126`
**Classification:** WARNING
**Issue:** The detached dock-window test for opening referenced documents is committed as `test.skip`. Phase 28 changed Semantic Connections panel chrome, harness wiring, and app-shell E2E coverage, but the detached dock-window path remains untested. That leaves a real regression gap for a supported placement mode, especially because detached windows use a different renderer lifecycle and the summary notes the harness API is not currently exposed there.
**Fix:** Either install the E2E harness in detached dock windows and enable this test, or replace it with an enabled test that verifies the detached-window behavior through public UI and main-window observable state.

```ts
test('semantic connection open icon opens referenced document editor from a detached canvas dock window', async () => {
  // enable once detached dock windows expose the required test surface
})
```

---

_Reviewed: 2026-07-01T11:50:33Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
