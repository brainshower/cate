# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-31) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Release Readiness + Provenance Closeout** — Phases 8-13 (shipped 2026-06-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 FlashQuery Milestone 2** — Phases 14-21 (completed 2026-06-06) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Document Outline** — Phases 22-23 (shipped 2026-06-16) — [archive](milestones/v1.3-ROADMAP.md)
- ▶ **v1.4 Semantic Connections Inspector** — Phases 24-25 (planned)

## Phases

<details>
<summary>✅ v1.0 Vault Connect, Read, Edit (Phases 1-7) — SHIPPED 2026-05-31</summary>

See archived roadmap for full phase details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Release Readiness + Provenance Closeout (Phases 8-13) — SHIPPED 2026-06-02</summary>

See archived roadmap for full phase details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 FlashQuery Milestone 2 (Phases 14-21) — COMPLETED 2026-06-06</summary>

See archived roadmap for full phase details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3 Document Outline (Phases 22-23) — SHIPPED 2026-06-16</summary>

See archived roadmap for full phase details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

</details>

## Current Status

Active milestone: v1.4 Semantic Connections Inspector. Build the Cate-side embeddings-only Semantic Connections Inspector in two GSD phases, preserving the seven source implementation phases from the requirements document as grouped sub-slices.

### Phase 24: SC Inspector Foundation, Docking, Preview Chunks, and Selection

**Goal:** Implement source requirement phases 1-3 as a cohesive foundation: first-class panel registration, semantic connection types/utilities, dock minimum-size enforcement, preview chunk wrappers, shared selection state, preview hover/pin behavior, and initial Outline selection awareness.

**GSD progress:** In progress — 3 of 4 plan summaries complete (`24-01`, `24-02`, and concurrent `24-03`).

**Source phases included:**

- Requirements Section 6.1 Phase 1: Types, Utilities, and Panel Registration
- Requirements Section 6.2 Phase 2: Dock Minimum Size Enforcement
- Requirements Section 6.3 Phase 3: Preview Chunk Wrapping and Selection Store

**Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-035, plus the foundational portions of REQ-010, REQ-011, and REQ-012 needed to avoid architectural rework in Phase 25.

**Success criteria:**

1. `semantic-connections` exists as a registered Cate panel with Outline-style docking in main and canvas contexts, no duplicate body title, and SC header actions scoped to the active tab.
2. Shared semantic connection types and pure utilities support embeddings-only data and future typed-edge mixed data without UI assumptions that every connection is typed.
3. Dock split resizing enforces descendant panel minimum widths/heights, including the SC `330px` width floor, with adjacent-ratio transfer preserved.
4. Markdown preview exposes stable heading-scoped `data-chunk-id` wrappers that reuse existing heading slug logic, refresh across preview rerenders, and clean up on source-mode return.
5. Preview hover/click/Esc interactions update shared selection state, preserve text selection, and decorate active/pinned chunks without using production `CustomEvent` bridges.
6. Tests land alongside each feature slice: registry/util tests before or with panel registration, dock tests with resize logic, preview wrapper tests with wrapper implementation, and selection tests with selection behavior.

**Required test coverage during the phase:**

- Panel/types/utilities: `T-U-001` through `T-U-010`
- Dock minimums: `T-U-013`, `T-U-014`, `T-I-027`, `T-I-028`, `T-I-029`
- Preview chunks/decorations/selection: `T-I-001` through `T-I-008`, `T-I-031` through `T-I-035`, `T-E-004`

**Execution constraint:** Do not finish the panel shell and then add tests later. Each sub-slice should pair behavior and tests before the next sub-slice begins.

### Phase 25: Inspector UI, Adapter Boundary, Outline Sync, E2E, and Acceptance Polish

**Goal:** Implement source requirement phases 4-7: the full SC Inspector UI and exception states, Outline bidirectional sync, Cate-side adapter boundary and mapping/cache behavior, deep-link/open behavior, accessibility, E2E coverage, and manual acceptance polish.

**Source phases included:**

- Requirements Section 6.4 Phase 4: SC Inspector UI with Mock/Adapter Data
- Requirements Section 6.5 Phase 5: Outline Bidirectional Sync
- Requirements Section 6.6 Phase 6: Data Adapter Boundary and Integration Stubs
- Requirements Section 6.7 Phase 7: E2E and Acceptance Polish

**Requirements:** REQ-010, REQ-011, REQ-012, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-034, REQ-036, REQ-037, plus any Phase 24 requirements that need end-to-end closeout.

**Success criteria:**

1. The SC panel renders embeddings-only similarity cards, score pies, Top-N config, accessible card expansion/open actions, and no typed-edge controls when all data omits `rel`/`dir`.
2. All documented exception states are recoverable and non-blocking: unsupported file type, source mode, no editor, empty results, stale embeddings, FlashQuery unavailable, no vault connected, adapter errors, malformed data, partial mapping failures, and loading/superseded requests.
3. Outline reads shared selection state, preserves cursor fallback and search behavior, pins preview chunks on Outline click, and resolves headings through slug match plus DOM fallback.
4. Cate defines a provider/adapter boundary that maps FlashQuery chunk UUID/heading metadata to preview chunk IDs, records diagnostics, invalidates cache on material content change, and documents the out-of-scope FlashQuery backend dependency.
5. Card open actions navigate safely to same-document or cross-document targets when metadata allows, and disable or recover gracefully when metadata is incomplete.
6. E2E and manual acceptance validate main dock, canvas mini-dock, hover/pin/Outline/SC synchronization, embeddings-only hidden controls, source-to-preview transition, empty-to-loaded transition, compact header fit, no duplicate title, stale indicator behavior, text selection, and keyboard flow.
7. Tests continue to land alongside the UI, adapter, sync, and E2E slices; no final "test catch-up" plan is acceptable.

**Required test coverage during the phase:**

- SC panel UI, config, cards, exception states, loading: `T-I-009` through `T-I-026`, `T-I-030`
- Outline sync: `T-I-036` through `T-I-039`, `T-E-004`, `T-E-006`
- Adapter boundary: `T-U-011`, `T-U-012`, `T-I-040` through `T-I-043`
- E2E and acceptance: `T-E-001` through `T-E-010`, `T-M-001` through `T-M-006`

**Execution constraint:** UI states should be tested as they are introduced: for example, embeddings-only cards and hidden typed controls before mixed typed readiness, precondition states before adapter error states, and Outline sync before final E2E polish.

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- v1.3 preserves product `REQ-###` IDs from the Document Outline requirements document so supplied test IDs remain directly traceable.
- Document Chat remains excluded from v1.4; Graph Explorer selection behavior is limited to the SC Inspector preview/Outline/panel synchronization described in the v1.4 requirements.
- v1.4 preserves product `REQ-###` IDs from the Semantic Connections Inspector requirements document and requires supplied tests to be implemented with the feature slices they verify.
