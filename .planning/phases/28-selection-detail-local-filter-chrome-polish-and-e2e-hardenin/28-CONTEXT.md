# Phase 28: Selection Detail, Local Filter, Chrome Polish, and E2E Hardening - Context

**Gathered:** 2026-07-01
**Status:** Ready for planning
**Source:** User-provided Graph Intelligence requirements and test plan

<domain>
## Phase Boundary

Phase 28 completes the remaining graph intelligence user workflow after Phase 27's graph contract and whole-document view foundation:

- Selection View Detail: section-level inspection with selection header/back behavior, status notes, external references, temporal-marker expansion, v1 string claims, structured-claim compatibility, claim-linked edge nesting, General connections, expandable edge rows, target opening, score color thresholds, and narrow dock behavior.
- Edge Metadata Overlay: provider-side merge of `query_graph` edge metadata by edge `id`, including qualifiers, `source_claims_referenced`, `target_claims_referenced`, and known metadata keys such as `severity`, `strength`, and `dependency_type`.
- Text Filter and Chrome Polish: toolbar filter toggle/input behavior, pure local matching helpers, area-specific filtering in whole-document and selection views, no-results state, separate config/filter active indicators, stable pre-filter connection counts, and chrome unregister on unmount.
- Integrated E2E and Regression Hardening: deterministic Electron coverage for opening the graph panel, whole-document-to-selection navigation, local filtering without backend reloads, embeddings-only fallback, and recoverable FlashQuery unavailable/no-vault states.

Phase 28 must build on the shipped Phase 27 surfaces instead of replacing them. It must not rework graph generation, graph linting, community detection, LLM extraction, or FlashQuery server behavior.
</domain>

<decisions>
## Implementation Decisions

### Source of Truth

- Downstream implementation agents MUST read these two product documents first, before making planning or implementation decisions:
  - `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md`
  - `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md`
- Downstream agents MUST treat `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, this `28-CONTEXT.md`, and any Phase 28 `RESEARCH.md`/`PATTERNS.md` as the local GSD traceability layer. If a question is answered by the product docs, the product docs win.
- If the product docs and prototype disagree, the requirements document wins. The prototype is visual/behavioral reference only.
- Implementation agents should only ask the project owner questions after checking the two product docs, this context, Phase 27 artifacts, and current Cate code.

### Selection View Detail

- Implement REQ-012, REQ-013, REQ-014, REQ-015, REQ-019, REQ-020, and the edge-metadata overlay portion of REQ-023.
- Selection view is entered when `activeChunkId` is set. It must provide a back control to whole-document view and must degrade to section title plus back control when node metadata is missing.
- Node metadata may include chunk summary, community context, `questionStatus`, `questionResolution`, `certaintyLevel`, `stalenessRisk`, `externalRefs`, `temporalMarkers`, and `keyClaims`; partial or absent metadata must not blank the selection view.
- FlashQuery v1 claims are `string[]`. Render them as plain text in array order. Do not invent basis tags or per-claim question styling in v1.
- Structured claim objects are forward-compatible input only: render claim text without crashing, but keep basis tags and per-claim question text out of the UI.
- Stale and deleted edges must be filtered out before claim nesting or General connections are rendered.
- Claim blocks stay in claim index order regardless of sort mode. Similarity/nature sort only reorders edges within each claim block and within General connections.

### Edge Metadata Overlay and Edge Rows

- The provider must merge `query_graph` edge metadata onto active chunk connections by edge `id`. The merge must support qualifiers, `sourceClaimsReferenced`, `targetClaimsReferenced`, and known metadata keys.
- Claim-linked edges nest under claims when `sourceClaimsReferenced` matches a claim array index; edges with no refs or invalid refs render under General connections.
- Edge rows must show relation label, optional score pie, target document, target heading, and snippet in collapsed state.
- Null or undefined `score` must omit `ScorePie`.
- Expanded edge rows must reveal unclamped snippet, reasoning, body, qualifier prose, and readable known metadata prose. Do not render raw JSON dumps for user-facing metadata.
- Score color thresholds are locked: red below `0.4`, orange `0.4` to below `0.6`, teal `0.6` to below `0.8`, and green at `0.8` or above.
- Existing same-document and cross-document target opening behavior must continue to work from selection-view edge rows.

### Local Filter and Chrome Polish

- Implement REQ-016, REQ-017, REQ-018, REQ-020, and REQ-022.
- The toolbar filter opens a local input that autofocuses. Filter text persists across whole-document and selection view switches while the filter remains open.
- Escape in the filter input clears text and closes the filter without triggering provider reloads. Closing through the toggle or clear control also clears text.
- Filtering is pure renderer logic over already-loaded result data. It must never call FlashQuery, provider reload, semantic search, graph query, or network APIs.
- Connection matching searches document name, section heading, snippet, reasoning, body, qualifiers, known metadata strings, and relation labels.
- Section matching searches section heading, chunk summary, question resolution, all claim text, and all connections belonging to the section.
- Structural labels, attention headers, navigation controls, icons, count numbers, community summaries, selection header summary, temporal marker text, external ref URLs, and basis labels must not determine matches.
- Whole-document filtering keeps Summary structural and filters attention rows, section rows, and connection rows. Empty groups and labels hide.
- Selection filtering keeps header/status/external refs structural and filters claims plus General connections. A claim block remains whole when visible because its text or any linked edge matches.
- When no filterable items match, render `No items match [search term]`.
- Filter active state must be separate from config active state. Dock chrome connection counts must remain pre-filter counts. Chrome state must clear on unmount.

### E2E and Regression Hardening

- Implement deterministic Playwright Electron coverage for T-E-001 through T-E-005 in `e2e/semantic-connections-graph.spec.ts` or the closest existing graph E2E spec.
- Use deterministic graph fixtures. E2E must not require a live external FlashQuery instance unless a test explicitly provisions one.
- E2E should prove graph panel dock opening, whole-document section/attention navigation into selection view, local filter workflow without backend reload, embeddings-only fallback, and recoverable FlashQuery unavailable/no-vault states.
- Final verification must include `npm run test:unit`, `npm run typecheck`, `npm run lint`, and `npm run test:e2e`.

### Security and Process Boundaries

- Renderer code must continue calling typed preload/provider APIs only. It must not import Electron/Node APIs or receive FlashQuery bearer tokens or connection credentials.
- `query_graph` calls remain local IPC/provider work and must preserve FlashQuery content-gating rules already established in Phase 27.
- Diagnostics and fixtures must avoid exposing FlashQuery credentials.
- Preserve existing Cate agent, terminal, editor, browser, Git, workspace, dock, preview selection, and layout behavior.

### the agent's Discretion

- Exact helper names, component extraction boundaries, row disclosure UI, qualifier prose wording, filter helper location, and E2E fixture structure are implementation discretion as long as the requirements, tests, and Cate conventions are satisfied.
- The planner may split Phase 28 into four plans matching `.planning/ROADMAP.md` waves or slightly finer plans if dependency ordering makes execution safer.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements and Tests

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md` — detailed REQ-012 through REQ-023 selection/filter/chrome/E2E behavior, contracts, invariants, and scope boundaries.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md` — required T-U/T-C/T-E/T-A coverage and verification commands for Phase 28.
- `.planning/REQUIREMENTS.md` — local GSD traceability table and phase mapping.
- `.planning/ROADMAP.md` — Phase 28 waves, success criteria, test lists, and verification commands.

### Phase 27 Foundation

- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-CONTEXT.md` — shipped boundary between Phase 27 foundation and Phase 28 deferred work.
- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-RESEARCH.md` — technical findings for semantic connection graph contract/provider/UI.
- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-PATTERNS.md` — existing analog files and code excerpts.
- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-01-PLAN.md`
- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-02-PLAN.md`
- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-03-PLAN.md`
- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-VERIFICATION.md`

### Existing Cate Surfaces

- `src/renderer/lib/semanticConnections.ts` — graph-aware semantic connection types, `SC_EDGE`, score helpers, local sorting/filter helper candidates.
- `src/renderer/lib/semanticConnectionsProvider.ts` — FlashQuery-to-panel translation, preview chunk mapping, node metadata backfill, and the provider location for edge metadata merge.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` — selection/whole-document UI state, graph row rendering, toolbar/chrome integration, and component tests.
- `src/renderer/stores/previewSelectionStore.ts` — scoped preview section navigation and active/pinned chunk state.
- `src/renderer/stores/semanticConnectionsChromeStore.ts` — dock chrome count/config/filter publication and cleanup.
- `src/shared/types.ts` — shared graph/FlashQuery IPC-facing types.
- `src/shared/ipc-channels.ts` — FlashQuery channel constants.
- `src/main/flashquery/clientManager.ts` — main-process FlashQuery request/response normalization and credential handling.
- `src/main/ipc/flashquery.ts` — main-process FlashQuery IPC handlers and validation.
- `src/preload/index.ts` and `src/shared/electron-api.d.ts` — renderer-safe preload contract.

### Required Test Files

- `src/renderer/lib/semanticConnections.test.ts`
- `src/renderer/lib/semanticConnectionsProvider.test.ts`
- `src/renderer/panels/SemanticConnectionsPanel.test.tsx`
- `e2e/semantic-connections-graph.spec.ts`
- Existing E2E fixtures under `e2e/fixtures/`
</canonical_refs>

<specifics>
## Specific Ideas

- Plan 1 should cover selection header/status/claims/edge metadata overlay together so claim nesting has the provider data it needs.
- Plan 2 should cover expandable edge rows, readable qualifier/metadata prose, score color thresholds, selection sort, target opening regression, accessibility labels, and narrow-width row behavior.
- Plan 3 should cover local filter helpers and UI plus chrome store polish, keeping implementation and tests in the same wave.
- Plan 4 should cover deterministic Electron graph fixtures, E2E flows, full regression commands, and any E2E-specific app-shell wiring needed to keep tests stable.
- Include product test IDs directly in each plan's `requirements`, task acceptance criteria, or verification text so executors can trace every assertion.
</specifics>

<deferred>
## Deferred Ideas

- Per-claim basis tags and per-claim question text remain out of v1 scope because FlashQuery v1 emits `key_claims` as `string[]`.
- Graph generation, graph linting, community detection, and LLM extraction stay in FlashQuery, not Cate.
- Additional graph actions such as accepting/resolving/dismissing findings remain future scope.
- Highlight-in-place filtering and editor-level graph search/verification query UI remain future scope.
</deferred>

---

*Phase: 28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin*
*Context gathered: 2026-07-01 from product requirements/test plan, Phase 27 artifacts, and Cate planning docs*
