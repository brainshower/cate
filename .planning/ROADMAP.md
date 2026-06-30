# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-31) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Release Readiness + Provenance Closeout** — Phases 8-13 (shipped 2026-06-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 FlashQuery Milestone 2** — Phases 14-21 (completed 2026-06-06) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Document Outline** — Phases 22-23 (shipped 2026-06-16) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Semantic Connections Inspector** — Phases 24-25 (completed 2026-06-17)
- ✅ **v1.5 Browser Uplift** — Phase 26 (shipped 2026-06-30) — [archive](milestones/v1.5-ROADMAP.md)
- ▶ **v1.6 Graph Intelligence Monaco Side Panel** — Phases 27-28 (planned)

## Active Milestone: v1.6 Graph Intelligence Monaco Side Panel

**Source requirements:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md`

**Phasing decision:** The product docs outline five source phases. This roadmap implements them in two GSD phases:

- **Phase 27** bundles source Phases 1-2: Graph Data Contract plus Whole-Document Graph View.
- **Phase 28** bundles source Phases 3-5: Selection View Detail, Text Filter and Chrome Polish, Integrated E2E and Regression Hardening.

This grouping keeps the first GSD phase vertically testable: the graph data contract, `query_graph` node backfill, whole-document rendering, attention rows, sections list, grouped connections, and their tests land together. The second GSD phase then deepens the selected-section experience and finishes the user-facing workflow with local filtering, chrome polish, and full Electron coverage.

## Phases

### Phase 27: Graph Data Contract and Whole-Document Graph View

**Goal:** Safely carry FlashQuery typed graph data through Cate and render the whole-document graph intelligence experience without regressing embeddings-only Semantic Connections.

**Covers source phases:** 1. Graph Data Contract; 2. Whole-Document Graph View.

**Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-023 foundation/node backfill.

**Recommended waves:**

1. ✅ **Shared graph contract + normalization** — completed by plan 27-01 (`27-01-SUMMARY.md`)
   - Implement graph relation/type expansion, optional-score validation, `get_document` graph-summary include support, target health-tier normalization, malformed optional field handling, and token-redaction diagnostics.
   - Requirements in this wave: REQ-001, REQ-003, REQ-021.
   - Tests in same wave: T-U-001, T-U-002, T-U-003, T-U-026, T-I-001, T-I-002, T-I-003, T-I-004, T-I-007, T-I-008, T-U-028.
   - Verification: focused renderer/provider and main/IPC unit suites pass; `npm run typecheck` passes. Node 20/22 precheck could not pass in the current shell because only Node 26 is installed.

2. **Provider mode, chunk mapping, and `query_graph` node backfill**
   - Implement typed/mixed/embeddings-only mode derivation, source chunk to preview chunk mapping, diagnostics for unmapped chunks, stale/partial-data handling, `query_graph` IPC/preload bridge, node metadata backfill, loading state, and per-chunk degradation.
   - Requirements in this wave: REQ-002, REQ-005, REQ-006, REQ-021, REQ-023.
   - Tests in same wave: T-U-004, T-U-005, T-U-009, T-U-010, T-U-011, T-U-012, T-U-013, T-U-014, T-U-015, T-U-016, T-U-023, T-U-025, T-I-005, T-I-006, T-I-009, T-C-001, T-C-002, T-C-003, T-C-004, T-C-063.

3. **Whole-document graph UI and navigation**
   - Render community summary, attention groups, section list, grouped relation connections, Top-N allocation, graph-only config controls, relation filter behavior, count/config chrome state, dock-native responsive/accessibility behavior, and source-section navigation.
   - Requirements in this wave: REQ-004, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-019, REQ-020, REQ-022.
   - Tests in same wave: T-U-006, T-U-007, T-U-008, T-U-017, T-U-018, T-C-005, T-C-006, T-C-007, T-C-008, T-C-009, T-C-010, T-C-011, T-C-012, T-C-013, T-C-014, T-C-015, T-C-016, T-C-017, T-C-018, T-C-019, T-C-020, T-C-021, T-C-022, T-C-023, T-C-024, T-C-025, T-C-026, T-C-027, T-C-028, T-C-029, T-C-064.

**Success criteria:**

1. Embeddings-only panel behavior remains green and graph-only controls stay hidden in fallback mode.
2. Graph fields survive main/preload/shared normalization and invalid optional fields do not discard valid rows.
3. `query_graph` node metadata backfill is progressive, credential-safe, and partial-failure tolerant.
4. Whole-document graph mode renders Summary, Needs attention, Sections, grouped Connections, Top-N, relation filters, and chrome state.
5. Attention rows, section rows, and traceable whole-document connection rows select the local preview section without opening the wrong target.

**Verification:**

- `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts`
- `npm run test:unit -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/preload/index.test.ts`
- `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx`
- `npm run typecheck`

### Phase 28: Selection Detail, Local Filter, Chrome Polish, and E2E Hardening

**Goal:** Complete the graph intelligence user workflow with section-level inspection, claim-linked edge detail, local filtering, polished chrome, and integrated Electron regression coverage.

**Covers source phases:** 3. Selection View Detail; 4. Text Filter and Chrome Polish; 5. Integrated E2E and Regression Hardening.

**Requirements:** REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023 edge metadata overlay.

**Recommended waves:**

1. **Selection header, status notes, claims, and edge metadata overlay**
   - Implement selection-view header/back behavior, node-meta degradation, question/certainty/staleness/external-ref notes, temporal marker expansion, v1 string-claim rendering, structured-claim compatibility, `query_graph` edge metadata merge by edge ID, claim-linked edge nesting, and stale/deleted filtering.
   - Requirements in this wave: REQ-012, REQ-013, REQ-014, REQ-023.
   - Tests in same wave: T-U-024, T-C-030, T-C-031, T-C-032, T-C-033, T-C-034, T-C-035, T-C-036, T-C-037, T-C-038, T-C-039, T-C-040, T-C-041, T-C-042, T-C-065.

2. **Expandable edge rows and target navigation**
   - Implement selection-view edge row collapsed/expanded states, optional score pie, readable qualifier/metadata prose, nature/similarity sort within claims and General connections, score color thresholds, target opening regression behavior, accessibility labels, and narrow-width layout.
   - Requirements in this wave: REQ-015, REQ-019, REQ-020.
   - Tests in same wave: T-U-027, T-C-043, T-C-044, T-C-045, T-C-046, T-C-047, T-C-048, T-C-049.

3. **Toolbar local filter and chrome polish**
   - Implement filter toggle/autofocus/clear/Escape behavior, pure local matching helpers, whole-document and selection-view filtering granularity, no-results state, no provider/network calls from filtering, separate config/filter active indicators, stable pre-filter connection counts, and chrome unregister on unmount.
   - Requirements in this wave: REQ-016, REQ-017, REQ-018, REQ-022.
   - Tests in same wave: T-U-019, T-U-020, T-U-021, T-U-022, T-C-050, T-C-051, T-C-052, T-C-053, T-C-054, T-C-055, T-C-056, T-C-057, T-C-058, T-C-059, T-C-060, T-C-061, T-C-062.

4. **Integrated E2E and final regression**
   - Add deterministic Electron fixture coverage for graph panel dock opening, whole-document to selection navigation, local filter workflow, embeddings-only fallback, and recoverable FlashQuery unavailable/no-vault states.
   - Requirements in this wave: REQ-002, REQ-007, REQ-008, REQ-009, REQ-010, REQ-012, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023.
   - Tests in same wave: T-E-001, T-E-002, T-E-003, T-E-004, T-E-005, T-A-001, T-A-002, T-A-003, T-A-004.

**Success criteria:**

1. Selected sections show summaries, status notes, external refs, claims, claim-linked edges, General connections, and readable edge details without requiring structured claim data.
2. Edge qualifiers and claim references are merged from `query_graph` metadata and degrade by chunk/edge without failing the whole panel.
3. Local text filtering applies the specified field and area rules, preserves structural context, and never triggers FlashQuery calls.
4. Dock chrome publishes correct pre-filter counts, separate config/filter active states, and unregisters on unmount.
5. Electron E2E proves the graph panel, preview navigation, local filtering, embeddings fallback, and recoverable error states in the app shell.

**Verification:**

- `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts`
- `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx`
- `npm run test:unit`
- `npm run typecheck`
- `npm run lint`
- `npm run test:e2e`

## Notes

- Every wave should include implementation and tests for the requirements it touches. Avoid a final test catch-up wave except for the intentionally integrated E2E/regression hardening in Phase 28.
- Product `REQ-###` IDs and test IDs from the supplied docs are preserved for traceability.
- FlashQuery v1 `key_claims` are `string[]`; per-claim basis tags and per-claim question text are future scope.
- `query_graph` is the v1 source for node analysis and rich edge metadata; `get_document` remains the source for connection overlays and graph summary.
- The panel must keep Cate dock sizing, theme, active editor registry, preview selection store, and existing target-opening conventions.

## Current Status

Plan 27-01 completed Wave 1 shared graph contract and normalization work. Requirements are defined in `.planning/REQUIREMENTS.md`, and the active roadmap has two phases with all 23 requirements mapped.

---
*Last updated: 2026-06-30 after v1.6 roadmap creation*
