# Phase 25: Inspector UI, Adapter Boundary, Outline Sync, E2E, and Acceptance Polish - Pattern Map

**Mapped:** 2026-06-17
**Files analyzed:** 14
**Analogs found:** 14 / 14

## Pattern Assignments

### SC panel body and card UI

- `src/renderer/panels/SemanticConnectionsPanel.tsx`
- `src/renderer/lib/semanticConnections.ts`
- `src/renderer/stores/previewSelectionStore.ts`

Closest analog: Phase 24 SC shell plus existing FlashQuery panel state rendering.

Expand the shell in place. Use `semanticConnections.ts` for ordering, rel availability, labels, and caution flags. Read selection scope from `previewSelectionStore`. Keep header/title actions in dock chrome, not the panel body.

### Exception/loading/connection states

- `src/renderer/panels/FlashQueryVaultPanel.tsx`
- `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`
- `src/renderer/components/VaultBadge.tsx`

Closest analog: FlashQuery connection and vault-state UI.

Borrow the recoverable state shape and accessible retry/settings buttons, but do not couple SC directly to Vault panel internals.

### Provider/adapter boundary and fixtures

- `src/renderer/lib/semanticConnections.ts`
- candidate new file: `src/renderer/lib/semanticConnectionsProvider.ts`
- candidate new test: `src/renderer/lib/semanticConnectionsProvider.test.ts`

Closest analog: pure helper modules under `src/renderer/lib/`.

Define provider contracts and mapping/cache helpers outside the React panel so they are unit-testable. UI consumes the provider interface or a hook that wraps it.

### Preview/active editor integration

- `src/renderer/panels/EditorPanel.tsx`
- `src/renderer/lib/activeEditorRegistry.ts`
- `src/renderer/lib/parseDocumentHeadings.ts`

Closest analog: preview scroll callbacks and Phase 24 chunk wrappers.

Use existing active editor snapshots to determine Markdown/preview/source/no-editor state and to route same-document open actions. Do not add production DOM `CustomEvent` bridges.

### Outline bidirectional sync

- `src/renderer/panels/OutlinePanel.tsx`
- `src/renderer/panels/OutlinePanel.test.tsx`
- `src/renderer/lib/parseDocumentHeadings.ts`

Closest analog: Phase 22/23 Outline source navigation plus Phase 24 active selection highlight.

Add two-pass chunk matching as a helper with direct tests: slug/occurrence first, preview DOM fallback second. Preserve search Enter cycling and source-mode reveal behavior.

### Dock header and compact canvas fit

- `src/renderer/docking/DockTabStack.tsx`
- `src/renderer/docking/DockTabBar.tsx`
- `src/renderer/docking/DockSplitContainer.tsx`
- `src/renderer/docking/DockSplitContainer.test.tsx`

Closest analog: existing active-tab-specific title actions.

SC header count/config controls should remain scoped to active SC tab and fit compact canvas headers. Dock minimum E2E should assert Phase 24's `330px` floor.

### E2E harness

- `src/renderer/lib/e2eHarness.ts`
- `e2e/semantic-connections-preview-selection.spec.ts`
- candidate new spec: `e2e/semantic-connections-inspector.spec.ts`

Closest analog: Phase 24 Semantic Connections E2E and FlashQuery E2E specs.

Add only deterministic setup helpers needed to seed provider fixtures, open panels, switch preview/source, and inspect state. Assertions should target visible UI and interactions.

## Pattern Risks

- `SemanticConnectionsPanel.tsx` will grow quickly; extract local subcomponents inside the same file or nearby only when tests show meaningful complexity.
- Provider/cache helpers should stay renderer-local until a real main/preload FlashQuery API exists.
- E2E fixture hooks must be gated under `CATE_E2E=1` and never drive production behavior.
