---
phase: 23-preview-routing-and-final-hardening
plan: 04
subsystem: outline-final-hardening
tags:
  - outline
  - verification
  - validation
  - req-017
  - req-018
  - req-019
key-files:
  - .planning/phases/23-preview-routing-and-final-hardening/23-04-SUMMARY.md
  - .planning/phases/23-preview-routing-and-final-hardening/23-VERIFICATION.md
  - .planning/phases/23-preview-routing-and-final-hardening/23-VALIDATION.md
metrics:
  tasks_completed: 3
  full_suite_test_files: 91
  full_suite_tests_passed: 845
  full_suite_tests_skipped: 3
---

# Plan 23-04 Summary

## Outcome

Final Phase 23 hardening passed. REQ-017, REQ-018, and REQ-019 have focused automated coverage and full-suite regression coverage. Phase 22 Outline surfaces impacted by preview routing were rerun or reviewed through focused tests. Document Chat and Graph Explorer unified selection remain out of scope.

## Coverage Evidence

| Test ID | Status | Evidence |
|---|---|---|
| T-U-015 | Passed | `parseDocumentHeadings.test.ts` covers `slugifyHeading()` normalization semantics. |
| T-U-016 | Passed | `parseDocumentHeadings.test.ts` covers duplicate heading ID suffixes. |
| T-I-023 | Passed | `EditorPanel.test.tsx` covers deterministic Markdown preview heading IDs. |
| T-I-024 | Passed | `EditorPanel.test.tsx` covers duplicate Markdown preview heading IDs. |
| T-I-025 | Passed | `EditorPanel.test.tsx` covers formatted heading text slug semantics. |
| T-I-026 | Passed | `OutlinePanel.test.tsx` covers preview-mode row-click routing. |
| T-I-027 | Passed | `OutlinePanel.test.tsx` covers preview-mode Enter-to-cycle routing and state preservation. |
| T-I-028 | Passed | `EditorPanel.test.tsx` covers smooth preview `scrollIntoView`. |
| T-I-029 | Passed | `EditorPanel.test.tsx` covers 1.5s blue flash cleanup with fake timers. |
| T-I-030 | Passed | Component tests and grep cover absence of preview-selection dispatch. |
| T-A-005 | Covered by automated acceptance proxy | EditorPanel and OutlinePanel component tests exercise preview toggle rendering, preview heading target lookup, row/Enter routing, smooth scroll, and flash behavior. Live Electron visual UAT was not launched in this run. |
| T-A-003/T-A-004/T-A-006 | Reviewed/rerun | Source-mode click, search cycling, active-editor rebinding, and state preservation tests passed. |
| T-M-003/T-M-004 | Reviewed/rerun | Existing toolbar/long-heading layout coverage remained green; no Phase 23 CSS changes altered toolbar sizing or Outline row truncation. |

## Commands

| Command | Result |
|---|---|
| `npx -p node@22 npm test -- src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts` | Passed: 3 files, 41 tests |
| `npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts` | Passed: 1 file, 10 tests |
| `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx` | Passed: 2 files, 63 tests |
| `npx -p node@22 npm test -- src/agent/renderer/AgentChatInput.atMention.test.tsx` | Passed: 1 file, 7 tests |
| `npx -p node@22 npm test` | Passed: 91 files, 845 tests passed, 3 skipped |
| `npx -p node@22 npm run typecheck` | Passed |
| `! rg -n "preview-section-select" src/renderer src/shared` | Passed |

## Commits

| Commit | Description |
|---|---|
| `6ea7095` | `test(23-04): stabilize final regression suite` |

## Deviations from Plan

**[Rule 2 - Missing critical verification stability] Full-suite hang from pre-existing logger import**

- Found during: Task 23.4.3 full-suite rerun.
- Issue: `AgentChatInput.atMention.test.tsx` imported `ChatInput`, which imports `useSettingsStore`, which imports the real renderer logger. Under jsdom this started real logging machinery and caused the full suite to hang after visible tests.
- Fix: Added the same renderer logger mock pattern used by neighboring tests.
- Files modified: `src/agent/renderer/AgentChatInput.atMention.test.tsx`.
- Verification: `AgentChatInput.atMention.test.tsx` passed standalone and full `npm test` exited cleanly.
- Commit hash: `6ea7095`.

**[Rule 2 - Missing direct registry test coverage] Preview snapshot shape needed direct unit assertion**

- Found during: Task 23.4.3 full-suite rerun.
- Issue: `activeEditorRegistry.test.ts` had an exact disposed-snapshot assertion that did not include the new `markdownPreview` field.
- Fix: Updated the disposed snapshot assertion and added direct coverage for preview mode plus `scrollPreviewToHeading`.
- Files modified: `src/renderer/lib/activeEditorRegistry.test.ts`.
- Verification: `activeEditorRegistry.test.ts`, full `npm test`, and typecheck passed.
- Commit hash: `6ea7095`.

**Total deviations:** 2 auto-fixed.
**Impact:** Positive verification stability and direct coverage; no production behavior broadened beyond Phase 23 scope.

## Post-Audit Residual

An auditor found one residual duplicate-preview-routing edge case after the original Phase 23 fix: Outline occurrence indexes were computed from the depth-filtered Outline rows, while Markdown preview heading IDs are assigned across all rendered headings. With depth `2`, `# Setup\n## Notes\n### Notes\n## Notes` routed the second visible `Notes` row to occurrence `1` instead of preview ID `notes-2`.

Resolution:

- Added a red regression in `src/renderer/panels/OutlinePanel.test.tsx` for the exact depth-filtered duplicate case; it failed with `('Notes', 1)` before the fix.
- Updated `src/renderer/panels/OutlinePanel.tsx` to compute preview occurrence indexes from the active model with a full-depth source-line count.
- Confirmed Cate preview renders setext headings via `ReactMarkdown`/`remark-gfm`; added setext support and coverage in `src/renderer/lib/parseDocumentHeadings.ts` / `.test.ts`.
- Confirmed raw HTML headings are not rendered as preview heading elements without `rehype-raw`; source-mode HTML/code marker Outline behavior remains unchanged.

Verification after residual fix:

| Command | Result |
|---|---|
| `npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx` before implementation | Failed as expected: required regression received `('Notes', 1)` instead of `('Notes', 2)` |
| `npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts src/renderer/panels/OutlinePanel.test.tsx` | Passed: 2 files, 37 tests |
| `npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts src/renderer/lib/activeEditorRegistry.test.ts src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` | Passed: 4 files, 84 tests |
| `npx -p node@22 npm run typecheck` | Passed |

## Self-Check: PASSED

REQ-017, REQ-018, and REQ-019 are implemented and verified. All required focused automated tests pass, the full Vitest suite passes under Node 22, typecheck passes, and excluded Graph Explorer/Document Chat behavior remains out of scope.
