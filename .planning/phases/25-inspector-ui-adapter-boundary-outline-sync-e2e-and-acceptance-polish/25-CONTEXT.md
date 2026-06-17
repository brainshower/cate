# Phase 25: Inspector UI, Adapter Boundary, Outline Sync, E2E, and Acceptance Polish - Context

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Source:** Product requirements and test plan supplied by project owner

<domain>
## Phase Boundary

Phase 25 completes the v1.4 Semantic Connections Inspector milestone by delivering the full Inspector experience on top of the Phase 24 foundation: embeddings-only card UI, Top-N/config behavior, exception states, Cate-side adapter/provider boundary, chunk mapping/cache behavior, Outline bidirectional sync closeout, card open/deep-link behavior, keyboard/accessibility support, E2E coverage, and manual acceptance polish.

Phase 25 owns Requirements sections 6.4 through 6.7 from the Semantic Connections Inspector requirements document. It must consume the existing Phase 24 panel shell, semantic utility surface, preview chunk wrappers, and shared selection store rather than rebuilding them.
</domain>

<decisions>
## Implementation Decisions

### Canonical Source Docs
- D-01: Downstream agents MUST read the full requirements doc before resolving scope questions: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Requirements.md`.
- D-02: Downstream agents MUST read the full test plan before choosing, naming, or marking tests: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Test Plan.md`.
- D-03: If this context conflicts with those two docs, the supplied product docs win unless the local codebase makes a requirement impossible.

### Scope
- D-04: Phase 25 owns REQ-010, REQ-011, REQ-012, and REQ-019 through REQ-037, plus any Phase 24 requirements that need end-to-end closeout.
- D-05: Phase 25 must not implement FlashQuery's server-side connection-query API. Cate may define/consume an adapter, mock provider, IPC/MCP boundary, fixtures, and documentation of the backend dependency.
- D-06: Document Chat, spatial Map view, graph-store persistence, typed-edge persistence/classification, and source-mode Monaco semantic decorations remain out of scope.

### Phase 24 Foundation To Reuse
- D-07: Reuse `semantic-connections` panel registration, `SemanticConnectionsPanel.tsx`, `src/renderer/lib/semanticConnections.ts`, and `usePreviewSelectionStore`.
- D-08: Reuse preview chunk IDs from `[data-chunk-id]` wrappers and Outline slug utilities from `parseDocumentHeadings.ts`.
- D-09: Keep the SC panel title and count/config actions in dock chrome. The panel body must not add a duplicate "Connections" title.
- D-10: Preserve Phase 24's no-production-`CustomEvent` preview-selection architecture.

### Inspector UI
- D-11: Launch mode is embeddings-only. When `allRels` is empty, the UI renders similarity cards, score pies, Top-N config, and no sort-by-nature or nature filter controls.
- D-12: The UI must support sparse future typed-edge data without architecture changes. Typed cards can show banners later, but untyped cards stay valid.
- D-13: Exception states are non-blocking and recover when preconditions or provider state change: unsupported file, source mode, no editor, empty results, stale embeddings, FlashQuery unavailable, no vault connected, adapter errors, malformed data, partial mapping failures, loading, and superseded requests.
- D-14: Card expansion, score pie text equivalents, open buttons, config controls, and scope controls must be keyboard and screen-reader usable.

### Adapter Boundary
- D-15: Add a Cate-side `SemanticConnectionsProvider` boundary with `loadDocumentConnections(input)` and result shape `{ overall, byChunkId, chunkOrder, chunkMap, mode, diagnostics }`.
- D-16: The adapter must map FlashQuery UUID/heading metadata to preview chunk IDs. It must never assume FlashQuery chunk UUIDs equal preview slug IDs.
- D-17: Mapping failures are diagnostics, not crashes. They may be shown in developer-facing logs/debug surfaces but not as user-facing failure copy unless the whole provider fails.
- D-18: Cache invalidates on material content hash change, but stale cached results remain visible with a subtle stale indicator until fresh data arrives.

### Outline And Open Behavior
- D-19: Complete Outline bidirectional sync: shared selection highlight wins when `activeChunkId` exists, cursor fallback remains when it does not, search highlighting stays distinct, and Outline click in preview mode pins the matching chunk.
- D-20: Implement two-pass heading matching: slug/occurrence first, preview DOM fallback second.
- D-21: Card open actions route safely to same-document or cross-document targets when metadata is sufficient. Incomplete metadata must disable or recover gracefully, not navigate incorrectly.

### Testing and Verification
- D-22: Tests from the supplied plan must land with the feature slices they verify. No final "test catch-up" plan is acceptable.
- D-23: Phase 25 automated coverage must explicitly target `T-I-009` through `T-I-026`, `T-I-030`, `T-I-036` through `T-I-043`, `T-U-011`, `T-U-012`, and `T-E-001` through `T-E-010`.
- D-24: Manual acceptance must cover `T-M-001` through `T-M-006`, with notes captured in the phase summary or a manual acceptance artifact.
- D-25: Verification should run through Node 20 or 22. Use `npx -p node@22 ...` if the local default Node is outside Cate's `>=20 <23` engine range.

### the agent's Discretion
- D-26: The exact provider module/file split is discretionary as long as renderer components depend on the provider interface, not low-level FlashQuery helpers.
- D-27: Mock fixture shape is discretionary if it exercises embeddings-only, sparse typed, empty, stale, malformed, partial mapping, timeout/error, and no-vault/unavailable states.
- D-28: E2E harness additions are allowed if they remain gated to `CATE_E2E=1` and do not leak into production behavior.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Requirements.md` - locked requirements, launch-mode constraints, adapter shape, UI behavior, exception states, and source-phase boundaries.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Test Plan.md` - required test IDs, per-phase coverage split, and traceability rules.

### Cate Planning
- `.planning/ROADMAP.md` - phase goal, bundled source phases, success criteria, and execution constraints.
- `.planning/REQUIREMENTS.md` - milestone-level requirement mapping and status table.
- `.planning/STATE.md` - current milestone state, owner decisions, and next action.
- `.planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/24-CONTEXT.md` - Phase 24 locked decisions and deferred boundary.
- `.planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/24-PATTERNS.md` - local analog files and extension points.
- `.planning/phases/24-sc-inspector-foundation-docking-preview-chunks-and-selection/24-04-SUMMARY.md` - shared selection implementation status and Phase 25 readiness notes.
- `.planning/phases/22-outline-foundation-and-source-navigation/22-CONTEXT.md` - prior Outline source-mode boundaries.
- `.planning/phases/23-preview-routing-and-final-hardening/23-CONTEXT.md` - preview routing and slugging decisions.

### Production Code Touchpoints
- `src/renderer/panels/SemanticConnectionsPanel.tsx` - existing Phase 24 shell to expand into full Inspector UI.
- `src/renderer/lib/semanticConnections.ts` - shared semantic connection types and display utilities.
- `src/renderer/stores/previewSelectionStore.ts` - shared Preview/Outline/SC selection state.
- `src/renderer/panels/EditorPanel.tsx` - Markdown preview chunk wrappers, preview routing, active editor registration, and same-document scroll behavior.
- `src/renderer/panels/OutlinePanel.tsx` - active-heading, search, and selection-highlight behavior.
- `src/renderer/lib/parseDocumentHeadings.ts` - `slugifyHeading()`, `createHeadingIdTracker()`, and heading parsing utilities.
- `src/renderer/lib/activeEditorRegistry.ts` - active editor preview callbacks and cross-panel bridge.
- `src/renderer/docking/DockTabStack.tsx` - SC header action row pattern.
- `src/renderer/lib/e2eHarness.ts` and `e2e/semantic-connections-preview-selection.spec.ts` - existing E2E surface for SC panel/selection scenarios.
- `src/renderer/panels/FlashQueryVaultPanel.tsx`, `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`, and `src/renderer/components/VaultBadge.tsx` - local patterns for FlashQuery connection/vault states.
</canonical_refs>

<specifics>
## Specific Ideas

- Keep the first Phase 25 slice vertical: provider fixtures feed the real SC panel UI and its tests, rather than building a detached design component.
- Use the existing semantic utility functions for ordering, rel availability, labels, and caution flags; add only the provider/mapping helpers needed for adapter behavior.
- Prefer component tests for the exception-state matrix, then a smaller number of E2E paths that prove the flows inside Electron.
- Add E2E harness helpers only for deterministic setup, not for bypassing the actual visible UI assertions.
- Capture manual acceptance notes in `25-MANUAL-ACCEPTANCE.md` or in the final plan summary so `T-M-001` through `T-M-006` are traceable.
</specifics>

<deferred>
## Deferred Ideas

- Real FlashQuery server-side connection query implementation remains deferred to a separate FlashQuery backend/API phase.
- Typed-edge persistence and graph-store behavior remain deferred.
- Automated visual differential against the standalone `index.html` reference remains out of scope; use it for manual comparison only.
</deferred>

---

*Phase: 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish*
*Context gathered: 2026-06-17*
