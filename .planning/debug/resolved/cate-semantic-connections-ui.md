---
status: resolved
trigger: "Cate semantic connections panel visual and open behavior regressions versus POC reference"
created: 2026-06-17
updated: 2026-06-17
---

## Symptoms

- Expected behavior: semantic connection cards should match the POC layout more closely, with a right-side score area, hover-only external-link action, no filename metadata line, clearer section heading, header count moved into the scope row, and Whole Document / Selection scope toggles.
- Actual behavior: cards show a visible Open text button, score number inside the pie, filename/path metadata, a small section heading, count badge in the panel title chrome, and only a single scope label.
- Error messages: none reported.
- Timeline: current implementation, compared against prior POC design.
- Reproduction: open Cate semantic connections and inspect the connections side panel/card list.

## Current Focus

- hypothesis: The regression is isolated to SemanticConnectionsPanel card/scope rendering and SemanticConnectionsTitleActions header count rendering.
- test: Update renderer tests for scope controls, title actions, score affordance, and open action accessibility.
- expecting: Focused Vitest tests pass after UI patch.
- next_action: complete

## Evidence

- 2026-06-17: `SemanticConnectionsPanel.tsx` owned card metadata, score pie, open behavior, scope row, and scoped connection count.
- 2026-06-17: `SemanticConnectionsTitleActions.tsx` owned the title/header count badge.

## Eliminated

## Resolution

- root_cause: The current implementation kept several POC-era controls in the wrong visual layer: score text was embedded in the pie, the open action was a persistent text button, file path metadata was rendered as a card subtitle, scope was a single mutable label, and the count badge lived in panel title chrome.
- fix: Reworked semantic connection cards to show a hover-only external-link icon, a numberless tooltip-labeled pie with no redundant visible score text, title plus larger/lighter section heading only, a segmented Whole Document / Selection scope row, and the scoped count on that row. Removed the title chrome count badge. Routed unregistered cross-document opens through `openFileAsPanel` with center-dock placement, and converted FlashQuery vault-relative target paths into `flashquery://...` editor URIs so Monaco opens the actual referenced document instead of an empty local-path panel.
- verification: Focused Vitest tests, typecheck, and production build passed.
- files_changed: src/renderer/panels/SemanticConnectionsPanel.tsx, src/renderer/panels/SemanticConnectionsPanel.test.tsx, src/renderer/components/SemanticConnectionsTitleActions.tsx, src/renderer/components/SemanticConnectionsTitleActions.test.tsx
