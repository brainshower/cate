# Phase 24: SC Inspector Foundation, Docking, Preview Chunks, and Selection - Context

**Gathered:** 2026-06-16
**Status:** Ready for planning
**Source:** Product requirements and test plan supplied by project owner

<domain>
## Phase Boundary

Phase 24 starts the v1.4 Semantic Connections Inspector milestone by delivering the foundation needed before the full Inspector UI can land safely: panel registration and hosting, shared semantic-connection types and pure utilities, dock minimum-size enforcement, preview chunk wrappers, shared preview-selection state, preview hover/pin interactions, and the first Outline hooks that consume the shared selection surface without reworking the completed v1.3 Outline architecture.

Phase 24 owns Requirements sections 6.1 through 6.3 from the Semantic Connections Inspector requirements document. It must intentionally stop short of the full card-list UI, adapter boundary, exception states, and deep-link behavior that belong to Phase 25, while still leaving clean seams so those later requirements do not require architectural churn.
</domain>

<decisions>
## Implementation Decisions

### Canonical Source Docs
- D-01: Downstream agents MUST read the full requirements doc before resolving scope questions: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Requirements.md`.
- D-02: Downstream agents MUST read the full test plan before choosing or naming tests: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Test Plan.md`.
- D-03: If this context conflicts with those two docs, the supplied product docs win unless the local codebase makes a requirement impossible.

### Scope
- D-04: Phase 24 owns REQ-001 through REQ-018, REQ-035, and only the foundational portions of REQ-010, REQ-011, and REQ-012 needed to avoid Phase 25 architectural rework.
- D-05: Phase 24 must not implement the full Semantic Connections card UI, adapter/provider boundary, exception-state matrix, stale-result behavior, deep-linking, or accessibility closeout from REQ-019 through REQ-037 except where a tiny foundation seam is explicitly required by REQ-009 through REQ-012.
- D-06: FlashQuery backend connection-query implementation, typed graph persistence, Document Chat, and broader Graph Explorer surfaces remain out of scope.

### Panel Registration and Dock Hosting
- D-07: Add `semantic-connections` as a first-class `PanelType`, `PANEL_DEFINITIONS` entry, renderer registry entry, and app-store creation action following the existing Outline hosting pattern.
- D-08: The SC panel must use ordinary dock placement and the existing `DockStoreProvider` ancestry. No canvas/non-canvas special case should be introduced outside the same creation/placement pattern already used by Outline.
- D-09: The SC panel body starts at the scope row or placeholder body content; duplicate in-body title rows are forbidden because header chrome belongs in the dock tab/header.
- D-10: Phase 24 may ship a lightweight panel shell that reads shared selection state and proves header/body ownership without shipping the full Phase 25 card UI.

### Semantic Connection Types and Utilities
- D-11: Shared semantic-connection types live in code that both renderer components and future provider code can import without UI assumptions.
- D-12: `Connection.rel` and `Connection.dir` remain optional at the type level from day one.
- D-13: Pure utilities for edge labels, display ordering, document-wide rel availability, and caution flags must land in Phase 24 with direct unit coverage before any later UI layer depends on them.
- D-14: Embeddings-only mode is first-class behavior, not a temporary fallback. Utilities and shell UI must not assume every connection is typed.

### Dock Minimum Size Enforcement
- D-15: `DockSplitContainer` must enforce descendant effective minimum sizes derived from `PANEL_DEFINITIONS[type].minimumSize`, including the SC panel's `330px` width floor.
- D-16: The current 10% ratio floor may remain as a secondary constraint, but the resized delta must clamp against actual pixel minimums and only transfer the clamped adjacent delta.
- D-17: Nested dock layouts must compute effective minimums recursively rather than only inspecting the immediate split children.

### Preview Chunks and Selection Surface
- D-18: Markdown preview chunk wrappers must reuse `slugifyHeading()` and `createHeadingIdTracker()` from `src/renderer/lib/parseDocumentHeadings.ts`.
- D-19: Chunk regions are heading-scoped wrappers, not heading-only elements. They must cover the heading plus body content until the next heading.
- D-20: Preview wrapper lifecycle must refresh on preview rerender and clean up when preview mode exits.
- D-21: Shared preview selection state should live in a dedicated renderer-local Zustand store or a tightly isolated slice rather than in Outline-local component state and not via browser `CustomEvent`.
- D-22: The authoritative selection rule is `activeChunkId = hoveredChunkId || pinnedChunkId`.
- D-23: Pinning must use click-level semantics and preserve normal preview text selection and existing link behavior.
- D-24: Active and pinned chunk styling belongs on `[data-chunk-id]` wrappers so it scrolls naturally with preview content.
- D-25: Caution decoration support should be wired through the shared utility surface now, but embeddings-only fixtures in Phase 24 should prove that no caution decoration appears when typed data is absent.

### Initial Outline Awareness
- D-26: Outline must start consuming shared selection state in Phase 24 only to the extent needed to avoid a second selection architecture in Phase 25.
- D-27: Phase 24 does not need the full two-pass slug-plus-DOM matching contract from final REQ-012, but it should preserve the existing slug utilities and expose chunk identity in a form that allows Phase 25 to complete that work cleanly.
- D-28: Existing Phase 22 and 23 source-mode Outline behavior must remain intact.

### Testing and Verification
- D-29: Tests from the supplied plan must land with the feature slices they verify. No final "test catch-up" plan is acceptable.
- D-30: Phase 24 automated coverage must explicitly target `T-U-001` through `T-U-010`, `T-U-013`, `T-U-014`, `T-I-001` through `T-I-008`, `T-I-027` through `T-I-035`, and `T-E-004`.
- D-31: Verification should run through Node 20 or 22. Use `npx -p node@22 ...` if the local default Node is outside Cate's `>=20 <23` engine range.

### the agent's Discretion
- D-32: The exact file split for shared semantic types/utilities and preview-selection state is discretionary as long as the modules remain renderer-local, testable, and future provider code can consume them without circular imports.
- D-33: The SC panel shell may render a narrow placeholder or scope-aware skeleton in Phase 24 as long as it does not pre-empt or contradict the Phase 25 UI contract.
- D-34: Chunk wrapping may use a renderer pass over the preview DOM or a more structured Markdown render hook, provided wrapper lifecycle and duplicate-heading semantics satisfy the product docs.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Requirements.md` — locked requirements, architecture constraints, source-phase boundaries, and launch-mode rules.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Test Plan.md` — required test IDs, phase coverage split, and traceability rules.

### Cate Planning
- `.planning/ROADMAP.md` — phase goal, bundled source phases, success criteria, and execution constraints.
- `.planning/REQUIREMENTS.md` — milestone-level requirement mapping and status table.
- `.planning/STATE.md` — current milestone state, owner decisions, and next action.
- `.planning/phases/22-outline-foundation-and-source-navigation/22-CONTEXT.md` — prior Outline source-mode boundaries and panel-hosting decisions.
- `.planning/phases/23-preview-routing-and-final-hardening/23-CONTEXT.md` — preview slugging and preview-routing decisions that Phase 24 must reuse rather than replace.

### Production Code Touchpoints
- `src/shared/types.ts` — `PanelType`, dock layout types, panel state, and size helpers.
- `src/shared/panels.ts` — shared panel metadata and `minimumSize` source of truth.
- `src/renderer/panels/registry.ts` — lazy panel registry and app-store factory delegation.
- `src/renderer/stores/appStore.ts` — panel creation, placement, and workspace panel records.
- `src/renderer/docking/DockSplitContainer.tsx` — current split resize logic that only enforces a ratio floor.
- `src/renderer/docking/DockTabStack.tsx` and `src/renderer/docking/DockTabBar.tsx` — header action and tab chrome patterns.
- `src/renderer/panels/EditorPanel.tsx` — Markdown preview rendering, heading ID logic, preview routing, and active editor registration.
- `src/renderer/panels/OutlinePanel.tsx` — current active-heading, search, and preview-routing behavior from v1.3.
- `src/renderer/lib/parseDocumentHeadings.ts` — `slugifyHeading()`, `createHeadingIdTracker()`, and formatting-stripping utilities.
- `src/renderer/lib/activeEditorRegistry.ts` — renderer-local active editor preview bridge.
</canonical_refs>

<specifics>
## Specific Ideas

- Use Outline as the registration/placement analog and FlashQuery panel patterns as the header-action analog instead of inventing a new host path.
- Keep semantic-connection utilities pure and small so later provider code and panel UI can reuse them directly.
- Add a dedicated preview-selection store to keep Preview, Outline, and the SC panel synchronized without coupling them into the large app store.
- Favor focused Vitest coverage for dock math, preview wrapper lifecycle, and selection behavior; keep Playwright in this phase limited to the single required preview-hover synchronization path.
- Treat the SC panel shell as a seam-proving surface in Phase 24, not as a place to partially ship the full card UI.
</specifics>

<deferred>
## Deferred Ideas

- Full Semantic Connections card list UI, config panel, loading/error/empty states, and open actions are deferred to Phase 25.
- Adapter/provider boundary, chunk mapping diagnostics, stale-result behavior, and FlashQuery service/vault exception states are deferred to Phase 25.
- Full Outline two-pass chunk resolution and final bidirectional sync closeout are deferred to Phase 25, after the shared selection surface exists.
</deferred>

---

*Phase: 24-sc-inspector-foundation-docking-preview-chunks-and-selection*
*Context gathered: 2026-06-16*
