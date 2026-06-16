# Requirements: v1.4 Semantic Connections Inspector

## Source Documents

- Requirements: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Requirements.md`
- Test plan: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Test Plan.md`
- Production codebase: `/Users/matt/Documents/Claude/Projects/Cate/cate`
- Secondary codebase: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery`

## Milestone Goal

Build the Cate-side Semantic Connections Inspector as an embeddings-only Markdown preview companion panel, with panel hosting, preview chunk selection, Outline synchronization, UI states, adapter boundary, dock-size enforcement, E2E polish, and tests implemented alongside each feature slice.

## Scope Guardrails

- Launch mode is embeddings-only semantic similarity. `Connection.rel` and `Connection.dir` are optional and omitted for initial runtime payloads.
- Sort-by-nature controls, nature filters, caution banners, and caution chunk borders render only when typed relationship data exists.
- Cate defines and consumes a local provider/adapter contract, but does not implement FlashQuery's server-side connection-query API in this milestone.
- Source-mode Monaco line decorations, Chat panel work, graph-store persistence, typed-edge classification, typed-edge persistence, and spatial Map view are out of scope.
- Tests from the supplied plan are part of each feature slice. Do not defer all tests to the end of a phase or milestone.

## Active Requirements

### Panel Registration and Hosting

- [ ] **REQ-001:** Cate registers `semantic-connections` as a first-class panel type with shared metadata, renderer registry wiring, lazy panel loading, and app-store creation.
- [ ] **REQ-002:** The Inspector docks through the existing Outline-style dock pattern in both main workspace docks and canvas-node mini-docks.
- [ ] **REQ-003:** The panel body does not duplicate dock header chrome; SC-specific count and config controls appear only in the active dock header.

### Markdown Preview Chunk Addressability

- [ ] **REQ-004:** Markdown preview wraps each heading-scoped region in a stable `div[data-chunk-id]` covering the heading and body until the next heading.
- [ ] **REQ-005:** Preview chunk IDs reuse Cate's existing `slugifyHeading` and `createHeadingIdTracker` behavior.
- [ ] **REQ-006:** Chunk wrappers, handlers, and decorations refresh across preview rerenders and are cleared when preview mode exits.

### Preview Interaction and Selection Sync

- [ ] **REQ-007:** Preview hover and click-pin semantics use `activeChunkId = hoveredChunkId || pinnedChunkId`, including clear-on-Esc, empty-space click, and whole-document affordance.
- [ ] **REQ-008:** Preview text selection, links, and existing preview interactions remain normal; pinning uses click-level semantics, not drag/mousedown semantics.
- [ ] **REQ-009:** Preview, Outline, and SC panel share a React/Zustand selection surface; production code does not use a browser `CustomEvent` bridge.
- [ ] **REQ-010:** Clicking an Outline heading while preview mode is active scrolls preview and pins the matching chunk; source-mode Outline behavior remains unchanged.
- [ ] **REQ-011:** Outline highlights shared selection when present and falls back to cursor-derived active-heading behavior otherwise.
- [ ] **REQ-012:** Outline matches chunk IDs to headings by slug first and preview DOM fallback second.

### Preview Decorations

- [ ] **REQ-013:** Active and pinned preview chunks render teal selection treatment through CSS classes on `[data-chunk-id]` wrappers.
- [ ] **REQ-014:** Orange caution decorations render only from typed warn/caution edge data; embeddings-only mode shows no caution treatment.

### SC Inspector Data Model

- [ ] **REQ-015:** Cate defines shared semantic connection types that support embeddings-only launch and future typed-edge mode.
- [ ] **REQ-016:** Embeddings-only data renders as a first-class similarity browser with score-descending cards and no typed-edge controls.
- [ ] **REQ-017:** Sparse mixed typed/untyped data is supported without assuming every connection has `rel` or `dir`.
- [ ] **REQ-018:** Pure utility functions cover edge labels, display ordering, document-wide rel availability, and caution flags.

### Data Fetching Interface Contract

- [ ] **REQ-019:** Cate depends on a local semantic-connections provider/adapter interface rather than UI calls to low-level FlashQuery helpers.
- [ ] **REQ-020:** Cate maps FlashQuery UUID chunk identities and heading metadata to preview slug-derived chunk IDs, reporting diagnostics instead of crashing on unmapped chunks.
- [ ] **REQ-021:** Document connections load eagerly when Markdown preview is active and the SC panel is open or opened, with cache invalidation on material content change.
- [ ] **REQ-022:** FlashQuery backend connection-query implementation remains out of scope except for documentation or fixtures explicitly needed by Cate tests.

### SC Inspector UI Behavior

- [ ] **REQ-023:** The body renders the scope row, optional caution banner, optional config panel, and scrollable full-width card list per the design brief.
- [ ] **REQ-024:** Cards support accessible expansion, score display, and open action behavior.
- [ ] **REQ-025:** Top-N config supports Max/default behavior and an active config indicator.
- [ ] **REQ-026:** Typed-edge sort/filter controls are absent, not disabled, when document results contain no typed relationship data.

### Exception States

- [ ] **REQ-027:** Unsupported file types show a static not-available state and do not call the adapter.
- [ ] **REQ-028:** Source-mode and no-editor preconditions show guidance and transition automatically when resolved.
- [ ] **REQ-029:** Successful empty results show whole-document or section empty messages without diagnosing root cause to the user.
- [ ] **REQ-030:** Stale embeddings keep showing last available connections and may show a subtle stale indicator.
- [ ] **REQ-031:** FlashQuery unavailable and no-vault-connected states are recoverable and do not block preview or Outline.
- [ ] **REQ-032:** Adapter timeout, thrown errors, and malformed data produce recoverable error states.
- [ ] **REQ-033:** Partial chunk mapping failures render mapped data and record diagnostics for developer inspection.
- [ ] **REQ-034:** Loading state is visually distinct, non-blocking, and superseded safely by newer scope requests.

### Dock Minimum Size Fix

- [ ] **REQ-035:** `DockSplitContainer` enforces panel-specific minimum sizes from descendant panel definitions while preserving clamped adjacent resize transfer.

### Deep-Linking

- [ ] **REQ-036:** Card open actions route to same-document or cross-document target headings/chunks when metadata is sufficient, and fail safely when not.

### Accessibility and Keyboard

- [ ] **REQ-037:** The Inspector is keyboard navigable and screen-reader usable, including standard button semantics, focus behavior, and Esc-to-clear-pin.

## Test Requirements

Every implementation plan in this milestone must identify and land the relevant test IDs from the supplied test plan in the same work slice as the feature behavior:

- Unit tests: `T-U-001` through `T-U-014`
- Component/integration tests: `T-I-001` through `T-I-043`
- End-to-end tests: `T-E-001` through `T-E-010`
- Manual acceptance checks: `T-M-001` through `T-M-006`

Test IDs are allowed to move between Vitest component/integration layers if the Cate test harness makes that more natural, but coverage intent and requirement traceability must remain intact.

## Traceability

| Requirement range | GSD phase | Source phase(s) | Primary test coverage |
|---|---:|---|---|
| REQ-001..REQ-018, REQ-035 partial | 24 | Requirements Section 6.1-6.3 | `T-U-001`..`T-U-010`, `T-U-013`..`T-U-014`, `T-I-001`..`T-I-008`, `T-I-027`..`T-I-035`, `T-E-004` |
| REQ-019..REQ-034, REQ-036..REQ-037, REQ-035 completion | 25 | Requirements Section 6.4-6.7 | `T-U-011`..`T-U-012`, `T-I-009`..`T-I-026`, `T-I-030`, `T-I-036`..`T-I-043`, `T-E-001`..`T-E-010`, `T-M-001`..`T-M-006` |

## Future Requirements

- FlashQuery server-side API for document/chunk connection retrieval.
- Typed graph edge store, typed relationship persistence, and typed-edge classification.
- Spatial Map view and any broader Graph Explorer visualization beyond the Inspector.
- Source-mode Monaco line decorations for semantic connections.
- Chat panel integration.

## Out of Scope

- Replacing the existing Cate Markdown preview toggle or creating a separate web UI.
- Implementing a general-purpose graph database in Cate.
- Implementing FlashQuery backend query APIs as part of this Cate milestone.
- Rendering nature sort/filter controls in embeddings-only runtime data.

---
*Last updated: 2026-06-16 for v1.4 Semantic Connections Inspector milestone planning*
