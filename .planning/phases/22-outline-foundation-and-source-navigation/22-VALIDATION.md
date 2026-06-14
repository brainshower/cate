---
phase: 22-outline-foundation-and-source-navigation
status: implemented
date: 2026-06-14
---

# Phase 22 Validation Strategy

## Coverage Targets

| Requirement Set | Required Evidence |
|---|---|
| REQ-001 through REQ-003 | Shared panel, registry, app-store, dock-placement, and toolbar integration tests. |
| REQ-004, REQ-011, REQ-013 | Active editor binding, cursor tracking, live updates, model/language changes, cleanup tests. |
| REQ-005 through REQ-008 | Pure parser unit tests for Markdown, HTML, and code section markers. |
| REQ-009 through REQ-016 | OutlinePanel component tests for depth, rendering, source navigation, search, clear, and Enter-cycle behavior. |
| REQ-020 through REQ-022 | State isolation, theme/readability checks, and non-interference tests around EditorPanel Preview/save/dirty/model/dispose behavior. |

## Required Automated Commands

Use Node 20 or 22. If the shell default is outside `>=20 <23`, use:

```bash
npx -p node@22 npm test -- src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts
npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts
npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx
npx -p node@22 npm run typecheck
```

## Required Acceptance And Manual Checks

- T-A-001: Open a Markdown editor, toggle Outline, confirm right dock placement and H1-H3 default list.
- T-A-002: Change depth to H1-H6 and confirm deeper headings appear with correct indentation.
- T-A-003: Click an Outline row in source mode and confirm Monaco scroll/focus.
- T-A-004: Search, verify row/subtext highlighting, press Enter repeatedly, and confirm wrapping.
- T-A-006: Switch active editor tabs and confirm Outline updates.
- T-A-007: Close Outline and confirm unrelated dock panels remain open.
- T-M-001 through T-M-004: dark/light states, toolbar width, and long-heading layout.

## Validation Notes

Preview routing checks T-I-023 through T-I-030 and T-A-005 are deferred to Phase 23. Phase 22 should still verify the existing Preview toggle remains intact.

## Execution Result

Automated Phase 22 validation passed on 2026-06-14:

- Shared/registry/store focused suite passed.
- Parser focused suite passed.
- Active editor, OutlinePanel, and EditorPanel focused suite passed.
- Typecheck passed.
- Exclusion grep for preview routing, Document Chat, and Graph Explorer selection additions returned no matches in `src/`.

Manual Electron acceptance/visual checks remain pending owner UAT: T-A-001 through T-A-004, T-A-006, T-A-007, and T-M-001 through T-M-004.
