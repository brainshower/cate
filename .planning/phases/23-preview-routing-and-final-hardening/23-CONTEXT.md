# Phase 23: Preview Routing and Final Hardening - Context

**Gathered:** 2026-06-14
**Status:** Ready for planning
**Source:** Product requirements and test plan supplied by project owner

<domain>
## Phase Boundary

Phase 23 completes the v1.3 Document Outline milestone by adding Markdown preview heading IDs, exposing preview scroll behavior for Outline navigation, routing Outline row clicks and Enter-to-cycle search through the rendered preview when preview mode is active, and running final focused verification across the full Outline workflow.

Phase 23 owns only preview routing and final hardening for REQ-017, REQ-018, and REQ-019. Phase 22 already delivered panel registration, source-mode parsing/navigation, search, active editor binding, toolbar integration, and cleanup behavior. Phase 23 must reuse those surfaces rather than reworking the Outline architecture.
</domain>

<decisions>
## Implementation Decisions

### Canonical Source Docs
- D-01: Downstream agents MUST read the full requirements doc before resolving scope questions: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md`.
- D-02: Downstream agents MUST read the full test plan before choosing or naming tests: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md`.
- D-03: If this context conflicts with those two docs, the supplied product docs win unless the local codebase makes a requirement impossible.

### Scope
- D-04: Phase 23 owns REQ-017, REQ-018, and REQ-019.
- D-05: Phase 23 must not implement Document Chat behavior, Graph Explorer unified selection, or `preview-section-select` dispatch.
- D-06: Phase 23 must preserve Phase 22 source-mode behavior, including parser output, search state, active heading state, toolbar toggle behavior, and right-dock hosting.

### Preview Heading IDs
- D-07: Add a shared `slugifyHeading(text)` helper that lowercases, strips non-word characters while preserving whitespace and hyphens with `/[^\w\s-]/g`, collapses whitespace to single hyphens, and trims leading/trailing hyphens.
- D-08: Duplicate Markdown preview headings receive `-1`, `-2`, and subsequent numeric suffixes during render, not by mutating Outline parser output.
- D-09: Heading ID generation must use text with Markdown inline formatting stripped consistently with the existing Outline parser utility.

### Preview Scroll API
- D-10: The preview scroll API accepts Outline heading text, strips inline Markdown formatting, computes the same slug used by rendered heading IDs, finds the matching heading element, and calls `scrollIntoView({ behavior: 'smooth', block: 'start' })`.
- D-11: The preview scroll API applies a standalone blue flash highlight for 1.5 seconds using a background equivalent to `rgba(0,122,204,0.2)` and removes it after the timer.
- D-12: No-target headings must degrade safely: no throw, no source-mode fallback while preview mode is active unless the implementation explicitly documents and tests that fallback.

### Outline Routing
- D-13: Outline must detect the active editor panel's `markdownPreview` state from `PanelState` or the Phase 22 active-editor adapter.
- D-14: Row clicks and Enter-to-cycle search call preview scroll behavior when Markdown preview is active.
- D-15: Source mode continues to call `editor.revealLineInCenter(line)`, `editor.setPosition({ lineNumber: line, column: 1 })`, and `editor.focus()`.
- D-16: Toggling preview on/off must not unnecessarily reset Outline `searchQuery`, `searchMatchIdx`, `maxDepth`, parsed headings, or active heading behavior.

### Testing and Verification
- D-17: Unit tests must cover T-U-015 and T-U-016 for slug generation and duplicate heading IDs.
- D-18: Integration/component tests must cover T-I-023 through T-I-030 for Markdown preview IDs, preview scroll behavior, Outline routing, fake-timer flash removal, and non-dispatch of Graph Explorer events.
- D-19: Acceptance/manual coverage includes T-A-005 plus a final rerun or review of Phase 22 acceptance/manual checks that preview routing could affect.
- D-20: Verification should run through Node 20 or 22. Use `npx -p node@22 ...` if the local default Node is outside Cate's `>=20 <23` engine range.

### the agent's Discretion
- D-21: The exact preview scroll API shape is left to implementation as long as it is testable and does not require renderer-to-main IPC.
- D-22: The duplicate heading ID tracker may live inside `MarkdownPreview` or a pure helper if tests can prove deterministic behavior.
- D-23: The active-editor adapter may be extended narrowly to expose preview routing state and callbacks, but broad state-store rewrites are out of scope.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md` — locked requirements, especially REQ-017, REQ-018, REQ-019, exclusions, and full Outline workflow expectations.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md` — required test IDs, especially T-U-015, T-U-016, T-I-023 through T-I-030, T-A-005, and traceability rules.

### Cate Planning
- `.planning/ROADMAP.md` — phase goal, Phase 23 requirement IDs, bundled tests, and success criteria.
- `.planning/REQUIREMENTS.md` — milestone-level requirement mapping and status table.
- `.planning/STATE.md` — current milestone state, decisions, and next action.
- `.planning/phases/22-outline-foundation-and-source-navigation/22-CONTEXT.md` — locked Phase 22 boundary and deferred preview-routing decisions.
- `.planning/phases/22-outline-foundation-and-source-navigation/22-PATTERNS.md` — existing Outline implementation patterns to preserve.
- `.planning/phases/22-outline-foundation-and-source-navigation/22-UI-SPEC.md` — UI state distinctions that preview routing must preserve.

### Production Code Touchpoints
- `src/renderer/lib/parseDocumentHeadings.ts` — parser and `stripMarkdownInlineFormatting()` helper.
- `src/renderer/lib/parseDocumentHeadings.test.ts` — parser test style and traceability pattern.
- `src/renderer/panels/EditorPanel.tsx` — `MarkdownPreview`, `ReactMarkdown`, `remark-gfm`, `markdownPreview` state, Preview/Source toggle, and preview DOM surface.
- `src/renderer/panels/EditorPanel.test.tsx` — jsdom/Monaco mocks and toolbar/preview integration tests.
- `src/renderer/panels/OutlinePanel.tsx` — row click and Enter-to-cycle source navigation behavior.
- `src/renderer/panels/OutlinePanel.test.tsx` — component test harness for Outline navigation and state behavior.
- `src/renderer/lib/activeEditorRegistry.ts` — active editor adapter created during Phase 22.
- `src/shared/types.ts` — `PanelState.markdownPreview` and panel metadata.
- `src/renderer/stores/appStore.ts` — preview-state updates and panel records.
</canonical_refs>

<specifics>
## Specific Ideas

- Prefer extending `src/renderer/lib/parseDocumentHeadings.ts` with `slugifyHeading()` and duplicate ID helper tests so preview and Outline share formatting/slug semantics.
- Add custom heading renderers in `MarkdownPreview` for h1-h6 that assign deterministic IDs from rendered/stripped text.
- Keep flash styling local to preview headings, either by a temporary class/data attribute or inline style that fake-timer tests can observe and verify removal.
- Let `OutlinePanel` route through a preview callback exposed by the active-editor adapter only when the active panel is in Markdown preview mode.
- Use focused Vitest tests rather than broad Electron E2E for automated proof; document manual T-A-005 status in the final plan summary.
</specifics>

<deferred>
## Deferred Ideas

- Document Chat remains out of scope.
- Graph Explorer unified selection and `preview-section-select` dispatch remain out of scope.
- Persistent Outline depth/search preferences remain deferred unless needed for correctness.
</deferred>

---

*Phase: 23-preview-routing-and-final-hardening*
*Context gathered: 2026-06-14*
