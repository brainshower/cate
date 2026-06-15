# Requirements: Cate Document Outline v1.3

**Defined:** 2026-06-14
**Milestone:** v1.3 Document Outline
**Core Value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.

## Source Documents

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md`

The product requirements document is the source of truth for detailed acceptance criteria. This GSD requirements file preserves the product `REQ-###` IDs and maps each requirement to the two execution phases requested for this milestone. Tests are bundled with the phase that implements the corresponding functionality.

## v1.3 Requirements

### Panel Registration and Dock Entry

- [x] **REQ-001**: Cate exposes Document Outline as a registered panel type named `outline`.
- [x] **REQ-002**: Editor panels expose an Outline toggle button in the top-right toolbar adjacent to the existing Preview button.
- [x] **REQ-003**: Opening Outline places it in Cate's right-side dock zone without replacing the existing dock/sidebar system.

### Active Editor and Parsing Foundation

- [x] **REQ-004**: The Outline panel binds to the active Monaco editor for the selected workspace and updates as focus/model context changes.
- [x] **REQ-005**: Heading parsing lives in a pure, unit-testable utility with no React, DOM, Zustand, or Electron dependency.
- [x] **REQ-006**: The parser supports Markdown `#` through `######` headings and strips supported inline Markdown formatting.
- [x] **REQ-007**: The parser supports HTML `<h1>` through `<h6>` headings with attributes and stripped inner tags.
- [x] **REQ-008**: The parser supports code comment section markers with heading levels inferred from indentation.

### Outline Source-Mode Experience

- [x] **REQ-009**: The Outline panel provides a depth dropdown with H1-H3 as the default filter.
- [x] **REQ-010**: The Outline panel renders headings as an indented, clickable React list with theme-compatible visual states.
- [x] **REQ-011**: The Outline highlights the heading containing the active cursor position.
- [x] **REQ-012**: Clicking an Outline row in source mode jumps Monaco to the corresponding heading line.
- [x] **REQ-013**: The Outline updates as editor content, language, or model changes, with a 300ms content-change debounce.
- [x] **REQ-014**: The Outline provides pinned search/filter input with case-insensitive row and substring highlighting.
- [x] **REQ-015**: The Outline search input shows a clear button only when text is present.
- [x] **REQ-016**: Pressing Enter in the search input cycles through matching headings and wraps at the end.

### Markdown Preview Routing

- [x] **REQ-017**: Cate's existing Markdown preview generates stable heading IDs using a shared slug helper and duplicate suffixes.
- [x] **REQ-018**: Markdown preview exposes a scroll-to-heading path that scrolls smoothly and applies a 1.5s standalone blue flash.
- [x] **REQ-019**: When Markdown preview is active, Outline row clicks and Enter-to-cycle navigation target the preview instead of Monaco source.

### State, Theme, and Non-Interference

- [x] **REQ-020**: Outline state preserves headings, max depth, search query, search cycle index, and active heading index per Outline panel instance.
- [x] **REQ-021**: Outline styling respects Cate's active theme and remains readable in light and dark modes.
- [x] **REQ-022**: Outline implementation does not alter excluded Chat, Graph Explorer selection, existing Preview toggle, editor save, dirty-state, model-cache, or dispose behavior.

## Deferred Requirements

### Future Outline and Editor Integrations

- Graph Explorer unified selection model integration for Outline and Preview.
- Persistent Outline depth preference.
- Richer duplicate-heading occurrence targeting if the initial preview implementation only resolves by heading text.
- Document Chat panel from the shared Outline-Chat research guide.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Document Chat | Explicitly excluded from this devspec and planned as a separate feature. |
| Graph Explorer unified selection model | Future additive behavior; this milestone implements standalone blue-flash preview scroll. |
| Replacing Markdown Preview toggle | Cate already has the Preview/Source toggle; this milestone only adds heading IDs and scroll routing needed by Outline. |
| Separate web UI | Cate remains Electron/React/Monaco; the POC is frozen reference material only. |
| Server-side or persisted Outline session state | Outline state is local to panel instances for this milestone. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-001 | Phase 22 | Complete |
| REQ-002 | Phase 22 | Complete |
| REQ-003 | Phase 22 | Complete |
| REQ-004 | Phase 22 | Complete |
| REQ-005 | Phase 22 | Complete |
| REQ-006 | Phase 22 | Complete |
| REQ-007 | Phase 22 | Complete |
| REQ-008 | Phase 22 | Complete |
| REQ-009 | Phase 22 | Complete |
| REQ-010 | Phase 22 | Complete |
| REQ-011 | Phase 22 | Complete |
| REQ-012 | Phase 22 | Complete |
| REQ-013 | Phase 22 | Complete |
| REQ-014 | Phase 22 | Complete |
| REQ-015 | Phase 22 | Complete |
| REQ-016 | Phase 22 | Complete |
| REQ-020 | Phase 22 | Complete |
| REQ-021 | Phase 22 | Complete |
| REQ-022 | Phase 22 | Complete |
| REQ-017 | Phase 23 | Complete |
| REQ-018 | Phase 23 | Complete |
| REQ-019 | Phase 23 | Complete |

**Coverage:**
- v1.3 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-06-14*
*Last updated: 2026-06-14 after Phase 23 execution and verification*
