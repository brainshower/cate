# Requirements: Cate FlashQuery Integration - v1.6 Graph Intelligence Monaco Side Panel

**Defined:** 2026-06-30
**Core Value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.

## Source Documents

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md`

## v1.6 Requirements

### Graph Data Contract

- [x] **REQ-001**: User can rely on graph-aware semantic connection types that cover all FlashQuery graph relation types, edge metadata, node metadata, community context, source chunk ordering, typed/mixed/embeddings-only modes, and optional scores. — Completed in Phase 27 Plan 01.
- [x] **REQ-002**: User can keep using the existing embeddings-only Semantic Connections fallback when typed graph data is absent or unavailable. — Provider fallback and score-sort regressions completed in Phase 27 Plan 02; panel fallback UI remains covered by Plan 27-03/Phase 28 component tests.
- [x] **REQ-003**: User can receive normalized FlashQuery `get_document` graph connection payloads, source chunks, graph summaries, and target health-tier fields through validated Cate IPC without losing useful partial data. — Completed in Phase 27 Plan 01.
- [x] **REQ-004**: User can see safe, complete display metadata for every graph edge relation, including directed/symmetric labels and unknown-relation fallbacks. — Completed in Phase 27 Plan 01.
- [x] **REQ-005**: User can navigate graph source chunks through Cate preview chunk IDs while preserving FlashQuery chunk IDs for diagnostics and duplicate-heading disambiguation. — Completed in Phase 27 Plan 02.
- [x] **REQ-006**: User can distinguish typed, mixed, and embeddings-only results while seeing stale and partial-data diagnostics without losing valid graph data. — Completed in Phase 27 Plan 02 for provider data construction and node metadata degradation.
- [x] **REQ-023**: User can get progressive node and edge metadata through a typed `query_graph` IPC/preload/provider path without exposing FlashQuery credentials. — Node metadata bridge/backfill completed in Phase 27 Plan 02; edge metadata overlay consumption completed in Phase 28 Plan 01.

### Whole-Document Graph View

- [x] **REQ-007**: User can see whole-document community context when graph community data is available, with empty community chrome hidden.
- [x] **REQ-008**: User can see a whole-document attention area for active contradictions, open questions, and uncertainty without nature filters hiding critical findings.
- [x] **REQ-009**: User can use a graph-enhanced sections list ordered by source chunks, with contradiction/question/certainty indicators and section selection.
- [x] **REQ-010**: User can inspect typed whole-document connections grouped and sorted by relation priority, while embeddings-only results remain flat and mixed-mode untyped rows are retained.
- [x] **REQ-011**: User can apply Top-N allocation, sort mode, and relation/nature filters to connection lists without affecting attention or section rows.

### Selection View Detail

- [x] **REQ-012**: User can enter a section selection view with a back control, heading, chunk summary, and community context when node metadata is available.
- [x] **REQ-013**: User can see actionable selection-view status notes for question status, certainty, staleness risk, temporal markers, and external references.
- [x] **REQ-014**: User can inspect FlashQuery v1 string claims in order and see active claim-linked edges nested under matching claims, with stale/deleted edges filtered out.
- [x] **REQ-015**: User can expand selection-view edge rows to see relation, optional score, target context, snippet, reasoning, body, qualifiers, and readable metadata prose.

### Filtering, Navigation, and Chrome

- [x] **REQ-016**: User can open a toolbar-local text filter that persists across whole-document/selection views, clears with Escape/close, and never calls FlashQuery.
- [x] **REQ-017**: User can filter by the specified data-bearing connection and section fields using case-insensitive substring matching, without structural UI text affecting matches.
- [x] **REQ-018**: User can apply local filtering at the correct UI granularity while preserving structural context and seeing a no-results state.
- [x] **REQ-019**: User can navigate from attention rows, section rows, and whole-document connection rows to local sections while preserving target-opening behavior for edge rows.
- [x] **REQ-020**: User can use the graph intelligence panel in Cate docks with native theme tokens, accessible controls, responsive truncation/wrapping, and no fixed prototype width.
- [x] **REQ-021**: User can recover from loading, unsupported context, FlashQuery, adapter, malformed-result, and partial graph metadata states without renderer crashes or premature clean-state claims. — Wave 1 malformed graph payload/credential-safe diagnostics completed in Phase 27 Plan 01; partial node metadata degradation completed in Phase 27 Plan 02; selection edge malformed metadata handling completed in Phase 28 Plan 02. Integrated E2E regression remains scheduled in Phase 28 Plan 04.
- [x] **REQ-022**: User can rely on accurate dock chrome connection counts and separate config/filter active indicators that unregister on unmount.

## Future Requirements

### Structured Claims

- **FUT-001**: User can see per-claim basis tags after FlashQuery emits structured claim objects rather than v1 `string[]` claims.
- **FUT-002**: User can see per-claim question text in attention rows after FlashQuery emits claim-level question typing.

### Graph Actions and Maps

- **FUT-003**: User can accept, resolve, dismiss, or verify graph findings from Cate after product action semantics are defined.
- **FUT-004**: User can use a spatial Graph Explorer map view after the side-panel inspector proves valuable.
- **FUT-005**: User can run editor-level graph search or verification queries beyond the local side-panel text filter.

## Out of Scope

| Feature | Reason |
|---------|--------|
| FlashQuery graph generation, graph linting, community detection, or LLM extraction | Cate consumes graph fields already returned by FlashQuery; FlashQuery owns generation and storage. |
| Standalone web UI | The production surface is Cate's existing Electron/React dock panel. |
| Removing embeddings-only semantic search | Embeddings-only remains the fallback launch path and regression boundary. |
| Server-side semantic search from the sidebar filter | v1.6 filter is local keyword matching over loaded panel data only. |
| User-actionable stale/deleted graph edges | The v1 panel filters these out rather than presenting transient processing state. |
| Prototype CSS or fixed panel width | Cate dock sizing and theme tokens remain authoritative. |
| Duplicate-detection attention cards | Deferred pending user feedback. |
| Highlight-in-place filtering | v1.6 specifies hide-non-matches behavior only. |
| Claim basis tags and per-claim question text | FlashQuery v1 does not emit structured claims; tracked as future requirements. |

## Traceability

| Requirement | Phase | Status | Primary Tests |
|-------------|-------|--------|---------------|
| REQ-001 | Phase 27 | Complete in 27-01 | T-U-001, T-U-002, T-U-003, T-U-026, T-A-002 |
| REQ-002 | Phase 27 | Complete in 27-02 for provider fallback | T-U-004, T-U-005, T-C-001, T-C-002, T-C-021, T-E-004 |
| REQ-003 | Phase 27 | Complete in 27-01 | T-I-001, T-I-002, T-I-003, T-I-004, T-I-007, T-I-008, T-A-002 |
| REQ-004 | Phase 27 | Complete in 27-01 | T-U-006, T-U-007, T-U-008 |
| REQ-005 | Phase 27 | Complete in 27-02 | T-U-009, T-U-010, T-U-011 |
| REQ-006 | Phase 27 | Complete in 27-02 | T-U-012, T-U-013, T-U-014, T-U-015 |
| REQ-007 | Phase 27 | Complete | T-C-005, T-C-006, T-C-007, T-E-001 |
| REQ-008 | Phase 27 | Complete | T-C-008, T-C-009, T-C-010, T-C-011, T-C-012, T-C-026, T-E-002 |
| REQ-009 | Phase 27 | Complete | T-C-013, T-C-014, T-C-015, T-C-016, T-C-017, T-E-002 |
| REQ-010 | Phase 27 | Complete | T-U-017, T-U-018, T-C-018, T-C-019, T-C-020, T-C-021, T-C-064, T-E-001 |
| REQ-011 | Phase 27 | Complete | T-C-022, T-C-023, T-C-024, T-C-025 |
| REQ-012 | Phase 28 | Complete | T-C-030, T-C-031, T-C-032, T-E-002 |
| REQ-013 | Phase 28 | Complete | T-C-033, T-C-034, T-C-035, T-C-036, T-C-037, T-C-065 |
| REQ-014 | Phase 28 | Complete | T-C-038, T-C-039, T-C-040, T-C-041, T-C-042 |
| REQ-015 | Phase 28 | Complete | T-U-027, T-C-043, T-C-044, T-C-045, T-C-046, T-C-047 |
| REQ-016 | Phase 28 | Complete | T-C-050, T-C-051, T-C-052, T-C-053, T-C-054, T-E-003 |
| REQ-017 | Phase 28 | Complete | T-U-019, T-U-020, T-U-021, T-U-022, T-E-003 |
| REQ-018 | Phase 28 | Complete | T-C-055, T-C-056, T-C-057, T-C-058, T-C-059, T-E-003 |
| REQ-019 | Phase 28 | Complete | T-C-017, T-C-026, T-C-027, T-C-048, T-E-002 |
| REQ-020 | Phase 28 | Complete | T-C-028, T-C-049, T-E-001, T-A-003 |
| REQ-021 | Phase 28 | Complete for unit/component scope; E2E regression scheduled in 28-04 | T-U-016, T-U-026, T-U-028, T-C-003, T-C-004, T-C-063, T-I-003, T-E-005 |
| REQ-022 | Phase 28 | Complete | T-C-029, T-C-060, T-C-061, T-C-062 |
| REQ-023 | Phase 27 and Phase 28 | Complete: node bridge/backfill in 27-02; edge overlay in 28-01 | T-I-005, T-I-006, T-I-009, T-U-023, T-U-024, T-U-025, T-E-002 |

**Coverage:**
- v1.6 requirements: 23 total
- Mapped to phases: 23
- Unmapped: 0

---
*Requirements defined: 2026-06-30*
*Last updated: 2026-07-01 after Phase 28 Plan 03 completion*
