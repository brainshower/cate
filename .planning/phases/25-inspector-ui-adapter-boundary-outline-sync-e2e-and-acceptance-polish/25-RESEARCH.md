# Phase 25: Inspector UI, Adapter Boundary, Outline Sync, E2E, and Acceptance Polish - Research

**Gathered:** 2026-06-17
**Status:** Ready for planning
**Source:** Local codebase inspection plus supplied product requirements and test plan

## Research Question

What does an executor need to know to implement Phase 25 well, without redoing Phase 24 or accidentally pulling FlashQuery backend work into Cate?

## Findings

### Phase 24 is a usable foundation

Phase 24 already added:

- `src/shared/types.ts` / `src/shared/panels.ts` support for `semantic-connections`.
- `src/renderer/panels/SemanticConnectionsPanel.tsx` as a narrow shell.
- `src/renderer/lib/semanticConnections.ts` with optional typed-edge fields and pure display utilities.
- `src/renderer/stores/previewSelectionStore.ts` with `hoveredChunkId`, `pinnedChunkId`, `activeChunkId`, `selectSection`, `clearSelection`, and caution state.
- `src/renderer/panels/EditorPanel.tsx` preview chunk wrappers and hover/pin/decorations.
- `src/renderer/panels/OutlinePanel.tsx` initial shared-selection awareness.
- `e2e/semantic-connections-preview-selection.spec.ts` for `T-E-004`.

Phase 25 should extend these files and add provider/test modules rather than replacing the architecture.

### Existing UI and test patterns fit the requested work

Cate uses colocated Vitest files under `src/**` and Playwright specs under `e2e/`. Renderer component tests already use Testing Library and jsdom. Electron E2E can use `window.__cateE2E` helpers from `src/renderer/lib/e2eHarness.ts` when launched under `CATE_E2E=1`.

Relevant local patterns:

- `FlashQueryVaultPanel.tsx` handles FlashQuery connection, empty, loading, retry, and vault states with small UI helpers and accessible buttons.
- `FlashQueryConnectionDialog.tsx` shows careful keyboard/focus behavior and async request supersession patterns.
- `DockTabStack.tsx` already has an SC-specific header action row that can evolve to show count/config state.
- `EditorPanel.tsx` exposes preview callbacks via `activeEditorRegistry`, including `scrollPreviewToHeading`.
- `OutlinePanel.tsx` already computes slug/occurrence chunk IDs from the Monaco model; Phase 25 needs the DOM fallback path.

### Adapter work should stay Cate-side and mockable

The product docs explicitly exclude FlashQuery backend implementation. The Cate-side adapter should therefore be an interface plus local/mock provider behavior that can be swapped later. The adapter must accept workspace/editor/document/content inputs and return:

- `mode`
- `overall`
- `byChunkId`
- `chunkOrder`
- `chunkMap`
- `diagnostics`

The important implementation risk is ID mismatch: FlashQuery chunk IDs are UUID-derived and Cate preview chunks are slug-derived. A mapping helper should compare FlashQuery heading paths against parsed Cate heading paths first and fall back safely. Unmapped chunks should produce diagnostics instead of throwing.

### Exception states are the most failure-prone UI area

The requirements list many states that must remain recoverable and non-blocking:

- unsupported file type
- source mode active
- no active editor
- empty results
- stale embeddings
- FlashQuery unavailable
- no vault connected
- adapter timeout/throw
- malformed data
- partial mapping failures
- loading
- superseded in-flight requests

These should be built with fixtures and state-machine style tests around the SC panel/provider boundary. If the panel treats every state as a single "empty" branch, requirements coverage will be shallow and brittle.

### Outline sync should finish the seam, not restart it

Phase 24 already prefers shared `activeChunkId` for Outline highlight. Phase 25 must add the missing product details:

- shared selection highlight remains distinct from search focus
- cursor fallback remains when no active chunk exists
- Outline click in preview mode scrolls and pins the chunk
- slug/occurrence matching is first pass
- preview DOM fallback reads `[data-chunk-id]` and heading text if slug matching fails

This should remain in `OutlinePanel.tsx` plus tests, using `parseDocumentHeadings.ts` helpers.

### E2E should be focused but complete

The test plan requires `T-E-001` through `T-E-010`. Some can share setup in a single spec file, but they should remain separately traceable in test names or status notes:

- main dock open
- canvas mini-dock open
- embeddings-only hidden typed controls
- preview hover/Outline sync
- preview click pin/card interaction
- Outline click pin
- dock resize minimum
- keyboard flow
- source-to-preview transition
- empty-to-loaded transition

Phase 24 already covers `T-E-004`; Phase 25 should keep it passing and add the remaining E2E coverage.

## Risks

| Risk | Mitigation |
|---|---|
| UI scope balloons into real FlashQuery API implementation | Keep provider mock/interface local to Cate; document backend dependency in plan and final summary. |
| Exception states are implemented visually but not recoverably | Tests must assert state transitions after precondition/provider changes. |
| Mapping helper conflates UUIDs and preview slugs | Unit tests `T-U-011` and `T-U-012` must prove explicit mapping and diagnostics. |
| E2E becomes flaky through too much visual setup | Use `window.__cateE2E` only for deterministic workspace/panel setup, then assert visible behavior. |
| Final manual acceptance is skipped | Include `25-MANUAL-ACCEPTANCE.md` as an explicit output in the final polish plan. |

## Validation Architecture

The phase should use four plan slices:

1. Full panel UI and fixture-backed provider path.
2. Adapter boundary, chunk mapping, diagnostics, cache/stale behavior.
3. Outline sync and card open/deep-link behavior.
4. E2E and manual acceptance polish.

Each slice must include the test IDs it owns and must not defer its tests to a later catch-up task.

## RESEARCH COMPLETE
