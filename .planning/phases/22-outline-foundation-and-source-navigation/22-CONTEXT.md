# Phase 22: Outline Foundation and Source Navigation - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning
**Source:** Product requirements and test plan supplied by project owner

<domain>
## Phase Boundary

Phase 22 ships the first-class Document Outline foundation for Cate source mode. It registers the `outline` panel type, opens and closes it from the editor toolbar into the right dock zone, binds it to the active Monaco editor, parses source headings, renders depth-filtered/searchable headings, tracks cursor position, jumps Monaco in source mode, and proves live-update/cleanup/non-interference behavior with focused Vitest coverage.

Phase 22 excludes Markdown preview heading IDs and preview scroll routing. Those are Phase 23 deliverables for REQ-017, REQ-018, and REQ-019. Phase 22 must preserve existing Markdown Preview behavior so Phase 23 can add preview routing without repairing regressions first.
</domain>

<decisions>
## Implementation Decisions

### Canonical Source Docs
- D-01: Downstream agents MUST read the full requirements doc before resolving scope questions: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md`.
- D-02: Downstream agents MUST read the full test plan before choosing or naming tests: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md`.
- D-03: If this context conflicts with those two docs, the supplied product docs win unless the local codebase makes a requirement impossible.

### Scope
- D-04: Phase 22 owns REQ-001 through REQ-016 and REQ-020 through REQ-022.
- D-05: Phase 22 must not implement REQ-017, REQ-018, or REQ-019 except for preserving preview state and leaving a clean integration surface for Phase 23.
- D-06: Document Chat behavior, Graph Explorer unified selection, and `preview-section-select` dispatch are out of scope.

### Panel Registration and Docking
- D-07: Add `outline` to `PanelType`, `PANEL_DEFINITIONS`, `PANEL_REGISTRY`, and app-store panel creation with a `createOutline(workspaceId, position?, placement?)` method.
- D-08: Outline opens in the existing right dock zone with placement `{ target: 'dock', zone: 'right' }`; no new sidebar host or dock renderer should be introduced.
- D-09: Closing Outline must close only the associated Outline panel and must not hide, reorder, or close unrelated right-zone panels.

### Active Editor Binding
- D-10: Outline must bind to the active Monaco editor for the selected workspace and rebind on editor focus, editor tab/panel focus, model changes, and active editor teardown.
- D-11: The implementation may choose the active-editor transport after inspecting current focus/dock behavior, but it must expose current editor, model, active editor panel id, and `markdownPreview` state.
- D-12: Editor/model references held by Outline must be nulled or disposed-safe before or during editor teardown.

### Parser and Source Navigation
- D-13: Heading parsing lives in a pure utility, not React, Zustand, DOM, or Electron code.
- D-14: Parser output is `Array<{ line: number; level: number; text: string }>` with one-based line numbers and max depth 2 through 6.
- D-15: Markdown inline stripping must support the syntax and nested order named in REQ-006.
- D-16: HTML headings and code section markers must follow REQ-007 and REQ-008.
- D-17: Source-mode navigation calls `editor.revealLineInCenter(line)`, `editor.setPosition({ lineNumber: line, column: 1 })`, and `editor.focus()`.

### Outline UI
- D-18: Default max depth is H1-H3. Options are H1-H2, H1-H3, H1-H4, H1-H5, and H1-H6.
- D-19: Row indentation is locked to L1 14px, L2 28px, L3 42px, L4 56px, L5 70px, L6 84px.
- D-20: Active cursor state, yellow search-match state, darker substring highlight, and blue search-focus state must remain visually distinct.
- D-21: Outline state is per panel instance: `headings`, `maxDepth`, `searchQuery`, `searchMatchIdx`, and `activeHeadingIdx` or equivalent derived behavior.
- D-22: Search keeps non-matching headings visible for spatial context; whitespace-only input is ignored.

### Testing and Verification
- D-23: Unit tests must cover shared panel/registry parser behavior through T-U-014.
- D-24: Component and integration tests must cover T-I-001 through T-I-022 and T-I-031 through T-I-035.
- D-25: Acceptance/manual coverage for this phase is T-A-001 through T-A-004, T-A-006, T-A-007, and T-M-001 through T-M-004.
- D-26: Verification should run through Node 20 or 22. The local default Node has historically been outside Cate's `>=20 <23` engine range, so `npx -p node@22 ...` is the established fallback.

### the agent's Discretion
- D-27: The exact active-editor registry/store shape is left to the implementation agent as long as REQ-004 and Requirements §4.4 are satisfied.
- D-28: The component can keep Outline state locally unless cross-panel behavior requires a small Zustand slice.
- D-29: The final Phosphor icon is discretionary, but it must be a real Phosphor icon and registry tests must lock the choice.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md` — locked requirements, scope, architecture touchpoints, parser contract, UI behavior, exclusions, and Phase 22/23 boundary.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md` — required test IDs, test strategy, fixtures, and traceability rules.

### Cate Planning
- `.planning/ROADMAP.md` — phase goal, Phase 22 requirement IDs, bundled tests, and success criteria.
- `.planning/REQUIREMENTS.md` — milestone-level requirement mapping and status table.
- `.planning/STATE.md` — current milestone state, decisions, and next action.
- `.planning/phases/22-outline-foundation-and-source-navigation/22-UI-SPEC.md` — compact UI contract derived from the supplied product docs.
- `.planning/phases/22-outline-foundation-and-source-navigation/22-PATTERNS.md` — existing code patterns to reuse.

### Production Code Touchpoints
- `src/shared/types.ts` — `PanelType`, `PanelState`, and markdown preview state.
- `src/shared/panels.ts` — shared panel definitions, sizing, colors, ghost SVGs.
- `src/renderer/panels/registry.ts` — lazy panel registry and factory delegation.
- `src/renderer/stores/appStore.ts` — `PanelPlacement`, panel creation, close, title/dirty/preview state.
- `src/renderer/stores/dockStore.ts` — dock zones, auto-show behavior, and panel locations.
- `src/renderer/panels/EditorPanel.tsx` — Monaco lifecycle, Preview toggle, Markdown preview, model cache, dispose behavior.
- `src/renderer/panels/EditorPanel.test.tsx` — Monaco/jsdom mock patterns for editor toolbar and lifecycle tests.
</canonical_refs>

<specifics>
## Specific Ideas

- Use the existing `FlashQueryVaultSearch` registration pattern as the closest panel-registration analog.
- Use a new pure `src/renderer/lib/parseDocumentHeadings.ts` utility for parser and markdown inline stripping tests.
- Use an active-editor registry or store adapter rather than querying the DOM for Monaco instances.
- Prefer an icon-only Outline toolbar button with a title/accessible label and the same muted/on blue treatment as Preview.
- Use focused Vitest suites over broad Electron E2E for this phase; keep manual checks for final visual confirmation.
</specifics>

<deferred>
## Deferred Ideas

- REQ-017, REQ-018, and REQ-019 preview routing are deferred to Phase 23.
- Persistent Outline depth preference is deferred unless implementation discovers it is required for correctness.
- Document Chat and Graph Explorer unified selection behavior are deferred outside v1.3.
</deferred>

---

*Phase: 22-outline-foundation-and-source-navigation*
*Context gathered: 2026-06-14*
