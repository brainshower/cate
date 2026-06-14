---
phase: 23-preview-routing-and-final-hardening
plan: 01
subsystem: outline-preview-heading-ids
tags:
  - outline
  - markdown-preview
  - req-017
key-files:
  - src/renderer/lib/parseDocumentHeadings.ts
  - src/renderer/lib/parseDocumentHeadings.test.ts
metrics:
  tasks_completed: 2
  tests_added: 2
---

# Plan 23-01 Summary

## Outcome

Added shared Markdown preview heading ID utilities:

- `slugifyHeading(text)` lowercases, strips inline Markdown formatting, removes non-word characters with `/[^\w\s-]/g`, collapses whitespace, preserves existing hyphens, and trims leading/trailing hyphens.
- `createHeadingIdTracker()` returns deterministic render-order IDs with `-1`, `-2`, and later suffixes for duplicates.
- Added T-U-015 and T-U-016 coverage in `parseDocumentHeadings.test.ts`.

## Commits

| Commit | Description |
|---|---|
| `088265a` | `feat(23-01): add preview heading id helpers` |

## Verification

| Command | Result |
|---|---|
| `npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts` | Passed |
| `npx -p node@22 npm run typecheck` | Passed |

## Deviations from Plan

None - plan executed exactly as written.

**Total deviations:** 0 auto-fixed.
**Impact:** None.

## Self-Check: PASSED

T-U-015 and T-U-016 pass, and downstream preview code can import shared slug and duplicate-ID helpers.
