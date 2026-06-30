# Phase 27: Graph Data Contract and Whole-Document Graph View - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning
**Source:** User-provided Graph Intelligence requirements and test plan

<domain>
## Phase Boundary

Phase 27 delivers the first two source phases from the Graph Intelligence Monaco Side Panel milestone:

- Graph Data Contract: expand Cate's shared/renderer/main FlashQuery graph contract, preserve typed `get_document` graph payloads, keep embeddings-only fallback green, map FlashQuery source chunks to Cate preview chunk IDs, derive `typed | mixed | embeddings-only` modes, and add a typed `query_graph` IPC/preload/provider path for progressive node metadata backfill.
- Whole-Document Graph View: render graph-aware whole-document triage in the existing `SemanticConnectionsPanel`, including community summary, Needs attention, graph-enhanced sections, grouped relation connections, Top-N allocation, relation filters, dock-native responsiveness, chrome counts/config state, and section navigation.

Phase 27 must not implement Phase 28 selection-view detail, text-filter polish, edge-metadata overlay UI, or E2E hardening except where tests are explicitly listed for the Phase 27 foundation.
</domain>

<decisions>
## Implementation Decisions

### Source of Truth

- Downstream implementation agents MUST read these documents before planning edits or writing code:
  - `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md`
  - `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md`
- Downstream agents MUST treat `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` as the local GSD traceability index, but the two product docs above are the detailed requirement/test authority.
- If the product docs and prototype disagree, the requirements document wins; the prototype is visual/behavioral reference only.

### Graph Contract and IPC

- Implement REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-021, and the Phase 27 portion of REQ-023.
- Extend `src/renderer/lib/semanticConnections.ts` instead of replacing it so embeddings-only fixtures remain valid.
- `SemanticConnection.score` must become optional at both type and runtime-validation layers; graph rows with null/absent scores must not invalidate otherwise useful results.
- `SemanticConnectionRel` and `SC_EDGE` must cover `contains`, `references`, `depends_on`, `supersedes`, `rationale_for`, `elaborates`, `summarizes`, `contradicts`, `duplicates`, `supports`, `extends`, `resolves`, and `semantically_similar_to`.
- `FlashQueryDocumentPart` must support `graph_summary` for `get_document include:['connections','graph_summary']`. The planner may allow `headings` as optional future-proofing, but Phase 27 must not depend on it.
- `FlashQueryClientManager` must preserve graph overlay fields, source chunks, graph summary, target health-tier fields, and useful partial rows. Malformed optional graph fields become omissions/diagnostics, not whole-response failure.
- Add a typed `query_graph` IPC/preload path, probably `flashquery:queryGraph` and `window.electronAPI.flashqueryQueryGraph()`, routed through the main process. Renderer code must never see FlashQuery bearer tokens or connection credentials.
- `query_graph action:'node'` must populate `nodeMeta` progressively; per-chunk failure degrades only that chunk and records a diagnostic.
- Phase 27 provider work needs node metadata backfill (`T-U-023`, `T-U-025`) but must leave Phase 28's edge-metadata overlay (`T-U-024`) to the selection-view phase unless a small data-shape hook is needed for forward compatibility.

### Provider and Chunk Mapping

- Preserve the existing heading/preview mapping strategy in `src/renderer/lib/semanticConnectionsProvider.ts`; do not introduce graph-only chunk IDs into `usePreviewSelectionStore` when a preview chunk ID is available.
- Build `chunkOrder`, `chunkMap`, `byChunkId`, `overall`, `graphSummary`, `nodeMeta`, `communitySummary`, `diagnostics`, `stale`, and `nodeMetaLoading` without mutating provider results.
- Mode derivation must follow the requirements: graph summary with edges plus all rels -> `typed`; graph summary with some untyped rows -> `mixed`; no graph summary/zero edges with embeddings data -> `embeddings-only`.
- Embeddings-only fallback is a regression boundary. Existing score sorting, card/list behavior, stale cached display, and recoverable states must remain green.

### Whole-Document UI

- Implement REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-019, REQ-020, and REQ-022 for the whole-document graph mode.
- Keep `SemanticConnectionsPanel` as the state owner unless extraction is needed for maintainability. Acceptable extracted components include `WholeDocumentGraphView`, `AttentionGroup`, `SectionsList`, `GroupedConnections`, and relation/filter helper views.
- Graph mode must render Summary, Needs attention, Sections, and grouped Connections. Empty summary/attention chrome must stay hidden.
- Attention rows and section rows must navigate through `usePreviewSelectionStore.selectSection()` and switch into the local section selection state already used by the panel.
- Whole-document typed rows omit visible scores and score pies. Embeddings-only rows continue using the fallback layout.
- Top-N and relation filters apply only to connection lists, not attention or section rows.
- Chrome count and active state must remain accurate through `semanticConnectionsChromeStore`; config active state and future filter active state must stay distinct.
- The UI must be dock-native: no fixed prototype width, no prototype CSS wholesale, accessible controls, and no text overlap at narrow dock widths.

### Testing and Verification

- Each plan must include tests in the same wave as implementation; no final catch-up test wave for Phase 27.
- Required verification commands:
  - `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts`
  - `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts`
  - `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx`
  - `npm run typecheck`
- Phase 27 does not require full E2E hardening; the product test plan maps integrated E2E to Phase 28.
- Implementation verification should use Node 20 or 22. Current shell reported Node `v26.0.0` during research, outside Cate's `>=20 <23` engine range.

### Security and Process Boundaries

- Renderer code must call typed preload APIs only. It must not import Electron, Node APIs, or direct FlashQuery credentials.
- Main/preload IPC validation is mandatory for every new graph request shape.
- Diagnostics and test fixtures must redact FlashQuery bearer tokens and connection credentials.
- Preserve existing Cate agent, terminal, editor, browser, Git, workspace, dock, and layout behavior.

### the agent's Discretion

- Exact helper names, component extraction boundaries, relation icon choices, and diagnostics copy are implementation discretion as long as they satisfy the requirements and tests.
- The planner may split Phase 27 into three waves matching `.planning/ROADMAP.md`, or into slightly finer plans if dependencies make execution safer.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Requirements and Tests

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md` — detailed REQ-001 through REQ-023 behavior, contracts, invariants, and scope boundaries.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md` — required T-U/T-I/T-C/T-E/T-A coverage and verification commands.
- `.planning/REQUIREMENTS.md` — local GSD traceability table and phase mapping.
- `.planning/ROADMAP.md` — Phase 27 waves, success criteria, and test lists.

### Existing Cate Surfaces

- `src/renderer/lib/semanticConnections.ts` — current semantic connection types, `SC_EDGE`, sorting, label helpers, and caution flags.
- `src/renderer/lib/semanticConnectionsProvider.ts` — FlashQuery-to-panel translation, preview heading/chunk mapping, mode/result construction, cache path, and provider calls.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` — current panel state, validation, fallback rendering, config chrome, loading/error behavior, and preview selection integration.
- `src/renderer/stores/previewSelectionStore.ts` — scoped preview section navigation and active/pinned chunk state.
- `src/renderer/stores/semanticConnectionsChromeStore.ts` — dock chrome count/config publication.
- `src/shared/types.ts` — shared FlashQuery document, connection, search, and IPC-facing types.
- `src/shared/ipc-channels.ts` — FlashQuery channel constants.
- `src/main/flashquery/clientManager.ts` — main-process FlashQuery request/response normalization and credential handling.
- `src/main/ipc/flashquery.ts` — main-process FlashQuery IPC handlers and validation.
- `src/preload/index.ts` and `src/shared/electron-api.d.ts` — renderer-safe preload contract.

### Required Test Files

- `src/renderer/lib/semanticConnections.test.ts`
- `src/renderer/lib/semanticConnectionsProvider.test.ts`
- `src/main/flashquery/clientManager.test.ts`
- `src/main/ipc/flashquery.test.ts`
- `src/preload/index.test.ts`
- `src/renderer/panels/SemanticConnectionsPanel.test.tsx`
</canonical_refs>

<specifics>
## Specific Ideas

- Wave 1 should cover graph contracts, relation metadata, optional score, `get_document include:['connections','graph_summary']`, graph summary normalization, target health fields, malformed optional field handling, and token-redaction diagnostics.
- Wave 2 should cover typed/mixed/embeddings-only mode derivation, chunk mapping diagnostics, `query_graph` channel/preload/client/provider foundation, progressive node metadata backfill, and node-meta loading/degradation UI signals.
- Wave 3 should cover the whole-document Summary, Needs attention, Sections list, grouped relation rows, relation priority sorting, mixed-mode catch-all group, Top-N, relation filters, navigation, responsive dock layout, and chrome count/config state.
- The planner must include REQ-021 in Waves 1 and 2 even though `.planning/REQUIREMENTS.md` lists it primarily under Phase 28, because Phase 27 roadmap explicitly includes malformed data, credential redaction, loading, unsupported context, and partial node metadata behavior.
- The planner must include the exact test IDs named in `.planning/ROADMAP.md` for each wave.
</specifics>

<deferred>
## Deferred Ideas

- Phase 28 owns selection-view detail: REQ-012, REQ-013, REQ-014, REQ-015.
- Phase 28 owns toolbar-local text filter and final chrome polish: REQ-016, REQ-017, REQ-018, and the remaining REQ-022 tests.
- Phase 28 owns `query_graph` edge metadata overlay consumption for selection view (`T-U-024`) and integrated Playwright E2E hardening.
- Per-claim basis tags and per-claim question text are explicitly future requirements because FlashQuery v1 emits `key_claims` as `string[]`.
- Graph generation, graph linting, community detection, and LLM extraction stay in FlashQuery, not Cate.
</deferred>

---

*Phase: 27-graph-data-contract-and-whole-document-graph-view*
*Context gathered: 2026-06-30 from product requirements/test plan and Cate codebase scan*
