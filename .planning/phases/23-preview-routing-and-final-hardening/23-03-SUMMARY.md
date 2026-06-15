---
phase: 23-preview-routing-and-final-hardening
plan: 03
subsystem: outline-preview-routing
tags:
  - outline
  - markdown-preview
  - req-019
key-files:
  - src/renderer/panels/OutlinePanel.tsx
  - src/renderer/panels/OutlinePanel.test.tsx
  - src/renderer/lib/activeEditorRegistry.ts
metrics:
  tasks_completed: 2
  tests_added: 2
---

# Plan 23-03 Summary

## Outcome

Outline navigation now checks the active editor snapshot before navigating. When Markdown preview mode is active, row clicks and Enter-to-cycle call the preview scroll callback with the parsed heading text and do not call Monaco source navigation. When preview mode is inactive, the existing Phase 22 source-mode behavior remains intact: `revealLineInCenter`, `setPosition`, and `focus`.

## Coverage

| Test ID | Evidence |
|---|---|
| T-I-026 | `OutlinePanel.test.tsx` verifies row clicks call preview scroll and skip Monaco navigation in preview mode. |
| T-I-027 | `OutlinePanel.test.tsx` verifies Enter cycling calls preview scroll for each match, wraps, and preserves search/depth/headings across preview updates. |
| T-I-030 | `OutlinePanel.test.tsx` plus grep verify no preview-selection event dispatch from Outline routing. |
| T-I-011/T-I-015 | Existing source-mode click and Enter-to-cycle tests still verify Monaco navigation. |

## Commits

| Commit | Description |
|---|---|
| `29babed` | `feat(23-03): route outline navigation to markdown preview` |

## Verification

| Command | Result |
|---|---|
| `npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx` | Passed |
| `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx` | Passed |
| `! rg -n "preview-section-select" src/renderer src/shared` | Passed |
| `npx -p node@22 npm run typecheck` | Passed |

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact:** None.

## Self-Check: PASSED

Row clicks and Enter-to-cycle route through preview only when preview is active, and source-mode navigation remains covered.
