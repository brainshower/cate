# Phase 27: Graph Data Contract and Whole-Document Graph View - UI-SPEC

**Created:** 2026-06-30
**Status:** Ready for planning
**Scope:** Whole-document graph intelligence UI inside Cate's existing `SemanticConnectionsPanel`

## Design Subject

This is not a standalone web page. It is a dense docked IDE inspector for developers reading a Markdown document while Cate surfaces FlashQuery graph intelligence. The single job is to make a document's graph state scannable: what community it belongs to, what needs attention, which sections carry graph signals, and how typed cross-document connections are grouped.

## Source-of-Truth Requirement

Downstream implementation agents MUST read these before editing UI code:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md`
- `.planning/phases/27-graph-data-contract-and-whole-document-graph-view/27-CONTEXT.md`

## Visual Direction

Use Cate's existing dock and theme language: compact, utility-first, calm, and readable in narrow panel widths. The visual signature for graph mode is not decoration; it is relation grammar:

- typed relations grouped as labeled strata,
- attention rows with restrained warning/caution emphasis,
- section rows that read like a graph-enhanced outline,
- relation colors only where they encode graph semantics.

Avoid a prototype-copy visual transplant. The prototype is reference for information hierarchy and behavior, not CSS tokens or fixed dimensions.

## Layout Contract

Whole-document graph mode should render in this order:

1. Toolbar/chrome already owned by `SemanticConnectionsPanel`.
2. Optional Summary block when community data exists.
3. Optional Needs attention block when contradictions, open questions, or medium/low certainty items exist.
4. Sections list ordered by `chunkOrder`.
5. Grouped Connections list ordered by relation priority.

At narrow dock widths:

- text wraps or truncates within rows without overlap,
- groups remain vertically stacked,
- controls use existing compact button/icon conventions,
- no production container imposes the prototype fixed width.

## Interaction Contract

- Attention rows select the source preview chunk and enter section selection state.
- Section rows select the preview chunk via `usePreviewSelectionStore.selectSection()`.
- Whole-document connection rows navigate to their source chunk when traceable; otherwise they no-op and may record a diagnostic.
- Selection-view target-opening behavior for edge rows must remain reserved for Phase 28/detail behavior and must not regress existing target-opening semantics.
- Top-N and relation filters affect connection lists only; they must not hide attention or section rows.
- Embeddings-only mode keeps the fallback list/card behavior and hides graph-only controls.

## Component Guidance

`SemanticConnectionsPanel.tsx` may remain the state owner. Extract components only where it reduces risk and test weight:

- `WholeDocumentGraphView`
- `AttentionGroup`
- `SectionsList`
- `GroupedConnections`
- compact relation/filter helpers

Extracted components must be fed plain view-model props; they should not own FlashQuery calls or privileged data access.

## Accessibility and Copy

- Buttons and icon controls need accessible labels.
- Section, attention, relation group, and config controls should be keyboard reachable where existing panel patterns make that expected.
- Error, pending, and partial-data text should tell the user what state exists, not promise the document is clean while `nodeMetaLoading` is true.
- UI text should be plain and functional: "Needs attention", "Sections", "Connections", relation labels, and specific recoverable state messages.

## Non-Negotiables

- No renderer access to Node/Electron APIs or FlashQuery credentials.
- No hardcoded prototype backgrounds as the dominant palette.
- No fixed production width.
- No score pies or visible score text in whole-document typed relation rows.
- No graph controls in embeddings-only fallback.
- No nature/relation filter impact on attention or sections.
- No clean/no-issues claim while node metadata is still loading.

## Required UI Test Coverage

- `T-C-001`, `T-C-002`, `T-C-003`, `T-C-004`, `T-C-005`, `T-C-006`, `T-C-007`, `T-C-008`, `T-C-009`, `T-C-010`, `T-C-011`, `T-C-012`, `T-C-013`, `T-C-014`, `T-C-015`, `T-C-016`, `T-C-017`, `T-C-018`, `T-C-019`, `T-C-020`, `T-C-021`, `T-C-022`, `T-C-023`, `T-C-024`, `T-C-025`, `T-C-026`, `T-C-027`, `T-C-028`, `T-C-029`, `T-C-063`, `T-C-064`.

## Verification

- `npm run test:unit -- src/renderer/panels/SemanticConnectionsPanel.test.tsx`
- `npm run test:unit -- src/renderer/lib/semanticConnections.test.ts src/renderer/lib/semanticConnectionsProvider.test.ts`
- `npm run typecheck`
