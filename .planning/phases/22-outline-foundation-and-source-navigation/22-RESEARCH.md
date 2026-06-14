# Phase 22: Outline Foundation and Source Navigation - Research

## Research Question

What does the implementation agent need to know to plan and execute Phase 22 well?

## Summary

Cate already has the panel, dock, store, toolbar, Monaco, ReactMarkdown, and Vitest infrastructure needed for the source-mode Document Outline. The safest approach is to reuse the existing panel registration and app-store creation patterns, add a small active-editor adapter/registry around Monaco editor focus/model lifecycle, keep heading parsing in a pure utility, and cover behavior with focused node/jsdom Vitest tests.

## Source Material

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- Cate source files under `src/shared`, `src/renderer/panels`, and `src/renderer/stores`.

## Existing Architecture Findings

### Panel System

`PanelType` lives in `src/shared/types.ts`. `PANEL_DEFINITIONS` in `src/shared/panels.ts` is the shared source for label, sizing, colors, ghost SVG, and canvas eligibility. Renderer-only registry entries in `src/renderer/panels/registry.ts` lazy-load panel components, assign Phosphor icons, and delegate creation to `useAppStore.getState().createX(...)`.

Closest analog: `flashqueryVaultSearch` was added with a type, shared definition, registry entry, app-store method, and tests.

### Dock Placement

`PanelPlacement` in `src/renderer/stores/appStore.ts` already accepts `{ target: 'dock', zone: DockZonePosition }`. `placePanel()` routes dock placements to `useDockStore.getState().dockPanel(panelId, placement.zone)`. `dockStore.dockPanel()` owns the existing dock layout behavior, including making zones visible.

### Editor and Preview State

`EditorPanel.tsx` already stores `markdownPreview` in `PanelState`, renders the Preview/Source button, syncs Markdown content into `MarkdownPreview`, and hides the Monaco container while preview is active. The current Markdown preview lacks heading IDs, but that belongs to Phase 23. Phase 22 must avoid breaking this path.

### Monaco Lifecycle

`EditorPanel.tsx` keeps editor refs locally, creates/reuses models, subscribes to model content and focus events, and carefully disposes diff editors before models. Outline needs an explicit active-editor bridge instead of reaching into DOM nodes. The bridge must unregister editor/model references during cleanup.

### Tests

`EditorPanel.test.tsx` already mocks Monaco editor/model creation, focus listeners, change listeners, and Electron APIs. Extend this mock with cursor/model-change/language subscriptions only as needed for Outline. Parser tests should be `.test.ts` node tests. Outline component and toolbar/dock tests should be `.test.tsx` jsdom tests.

## Implementation Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Active editor binding is ambiguous across canvas/dock/tab focus | Outline shows stale headings or jumps the wrong editor | Introduce a narrow active-editor adapter with panel id, editor, model, preview state, and subscriptions; test focus/model switch cases. |
| Holding disposed Monaco refs | Runtime errors during editor close/model cache changes | Unregister on EditorPanel unmount, guard `isDisposed()`, dispose Outline subscriptions and timers. |
| Parser grows inside React component | Hard-to-test behavior and brittle UI tests | Keep parser pure in `src/renderer/lib/parseDocumentHeadings.ts`. |
| Search focus and active cursor style collide | UX ambiguity and failed visual checks | Encode separate CSS classes/state names and test their presence. |
| Toolbar toggle closes unrelated Outline panel | User loses another dock panel | Associate Outline panels by workspace/editor context or source editor panel id; close only the matching panel. |
| Phase 23 preview routing becomes harder | Duplicated heading logic | Keep markdown inline stripping reusable; do not implement heading IDs in Phase 22 unless needed for parser utility tests. |

## Validation Architecture

### Unit Tests

- Shared panel definition tests: `src/shared/panels.test.ts`.
- Registry factory tests: `src/renderer/panels/registry.test.ts`.
- Parser tests: `src/renderer/lib/parseDocumentHeadings.test.ts`.
- Active-editor adapter tests if the adapter is pure enough: `src/renderer/lib/activeEditorRegistry.test.ts` or equivalent.

### Component/Integration Tests

- Outline component tests: `src/renderer/panels/OutlinePanel.test.tsx`.
- Editor toolbar/dock toggle tests: `src/renderer/panels/EditorPanel.test.tsx`.
- Store creation tests: `src/renderer/stores/appStore.test.ts`.

### Required Commands

Use Node 20 or 22. If local default Node is outside Cate's engine range, run through Node 22:

```bash
npx -p node@22 npm test -- src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts
npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts
npx -p node@22 npm test -- src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx
npx -p node@22 npm run typecheck
```

## Phase Split Guidance

Phase 22 should be executable in four plans:

1. Register panel/store plumbing and tests.
2. Build parser utility and parser tests.
3. Build active-editor binding and OutlinePanel source-mode UI behavior.
4. Wire EditorPanel toolbar toggle, right dock open/close behavior, and cleanup/non-interference tests.

Phase 23 should handle Markdown preview heading IDs and preview scroll routing.

## Research Complete

Phase 22 has enough local codebase context and product-source context to plan without additional external research.
