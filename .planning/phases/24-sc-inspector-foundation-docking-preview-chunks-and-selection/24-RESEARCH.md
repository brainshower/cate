# Phase 24: SC Inspector Foundation, Docking, Preview Chunks, and Selection - Research

## Research Question

What does the implementation agent need to know to plan and execute Phase 24 well?

## Summary

Cate already has most of the structural pieces Phase 24 needs: first-class panel registration, preview heading slug helpers, a renderer-local active-editor bridge, Outline preview routing, and independent dock stores for the main workspace and canvas mini-docks. The cleanest path is to reuse that architecture, add a lightweight `semantic-connections` panel shell plus pure semantic-connection utilities, replace the dock split ratio-only clamp with effective descendant minimums, and introduce a dedicated shared preview-selection store that Preview, Outline, and the SC shell can read without `CustomEvent` plumbing.

## Source Material

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Semantic Connections Inspector Test Plan.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- Prior Outline planning artifacts under `.planning/phases/22-*` and `.planning/phases/23-*`
- Cate source files under `src/shared`, `src/renderer/panels`, `src/renderer/lib`, `src/renderer/stores`, and `src/renderer/docking`

## Existing Architecture Findings

### Panel System

`src/shared/panels.ts`, `src/shared/types.ts`, `src/renderer/panels/registry.ts`, and `src/renderer/stores/appStore.ts` already provide the exact path needed for first-class panel registration. Outline is the closest analog because it already proves main-dock and canvas-node mini-dock hosting through the ordinary placement path, and its tests lock the type-definition-registry-store chain.

### Preview and Outline Infrastructure

`src/renderer/lib/parseDocumentHeadings.ts` already exports `slugifyHeading()` and `createHeadingIdTracker()`, and `EditorPanel.tsx` already uses them for preview heading IDs. `OutlinePanel.tsx` already consumes preview routing through `activeEditorRegistry` and therefore gives Phase 24 a stable place to layer shared selection awareness without reopening the v1.3 source-mode work.

### Dock Layout

`DockSplitContainer.tsx` currently clamps only to a `0.1` ratio floor, which matches the requirements document's identified gap. The layout tree already carries enough information to compute recursive effective minimums from descendant panel definitions, but that logic does not exist yet. The minimum-size source of truth is already centralized in `PANEL_DEFINITIONS`.

### Canvas Mini-Dock Pattern

Canvas nodes already create their own dock stores and host them through `DockStoreProvider`. That means Phase 24 can reuse the same `semantic-connections` panel factory and placement API used for main-dock hosting instead of creating a new canvas-specific panel path.

### Testing Surface

The repo already has strong colocated Vitest patterns for shared panel definitions, registry wiring, app-store creation, panel component behavior, and pure helpers. `EditorPanel.test.tsx` and `OutlinePanel.test.tsx` are the natural homes for the preview-wrapper and selection-flow tests. A focused dock-layout test file will likely need to be added for the minimum-size math because existing dock tests center on tab bars rather than split clamping.

## Implementation Risks

| Risk | Impact | Mitigation |
|---|---|---|
| A new selection architecture duplicates existing preview-routing state | Phase 25 has to reconcile two competing models | Introduce one dedicated shared selection store in Phase 24 and route all new preview/Outline/SC behavior through it. |
| Dock minimum-size math only inspects immediate children | Nested layouts still allow undersized descendants | Compute recursive effective minimums from descendant panel leaves and lock with unit/integration tests. |
| Preview wrappers are added in a way that conflicts with current heading IDs or rerenders | Broken preview routing, stale handlers, or duplicate wrapper state | Reuse existing heading helpers and add explicit lifecycle tests for rerender refresh and preview-mode exit cleanup. |
| The SC panel shell grows into partial UI that diverges from the Phase 25 design | Rework in the next phase | Keep Phase 24 shell deliberately narrow: registration, scope/state seam, and header/body ownership only. |
| Preview click handling interferes with text selection or links | User-facing regression in markdown preview | Use click-level pinning, hit-test to enclosing chunk wrapper, and cover drag-selection/link non-interference in tests. |

## Validation Architecture

### Unit Tests

- Shared panel definition and registry wiring for `semantic-connections`
- Pure semantic-connection utilities
- Preview-selection store reducers/actions
- Effective dock minimum-size and clamped-ratio helpers

### Component / Integration Tests

- `EditorPanel` preview wrapper structure and lifecycle
- Preview hover/pin/clear interaction behavior
- Outline shared-selection awareness
- SC panel shell scope-state behavior
- Dock split enforcement in horizontal, vertical, and nested layouts

### End-to-End Focus

- A single Phase 24 Playwright/Electron path should prove that preview hover updates shared state across Preview and Outline as required by `T-E-004`

### Required Commands

Use Node 20 or 22. If local default Node is outside Cate's engine range, run through Node 22:

```bash
npx -p node@22 npm test -- src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts
npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts src/renderer/lib/activeEditorRegistry.test.ts
npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx
npx -p node@22 npm test -- src/renderer/docking/DockSplitContainer.test.tsx
npx -p node@22 npm run typecheck
```

## Phase Split Guidance

Phase 24 should execute in four plans:

1. Register the `semantic-connections` panel shell, shared semantic-connection types/utilities, and foundational tests.
2. Fix dock minimum-size enforcement with focused dock math and layout tests.
3. Add preview chunk wrappers and lifecycle behavior around `data-chunk-id`.
4. Add shared selection state, preview hover/pin/decorations, and initial Outline/SC shell awareness.

This split preserves the owner's requested interleaving of behavior and tests and keeps the largest cross-cutting change, shared selection state, after the wrappers it depends on.

## Research Complete

Phase 24 has enough product-doc and local-codebase context to plan without additional external research.
