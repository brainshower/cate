# Phase 24: SC Inspector Foundation, Docking, Preview Chunks, and Selection - Pattern Map

**Mapped:** 2026-06-16
**Files analyzed:** 12
**Analogs found:** 12 / 12

## Pattern Assignments

### Panel registration and creation

- `src/shared/types.ts`
- `src/shared/panels.ts`
- `src/renderer/panels/registry.ts`
- `src/renderer/stores/appStore.ts`

Closest analog: Outline registration from Phase 22.

Use the same shared-definition plus renderer-registry plus app-store factory chain. The new `semantic-connections` entry should follow the exact same touchpoints and test style as `outline`, with SC-specific sizing and canvas eligibility from the product docs.

### Dock header actions

- `src/renderer/docking/DockTabStack.tsx`
- `src/renderer/docking/DockTabBar.tsx`

Closest analog: existing editor-specific dock title actions.

Phase 24 only needs to prove that SC-specific controls belong in dock chrome and remain scoped to the active tab. Reuse the active-tab conditional rendering pattern rather than creating header UI inside the panel body.

### Preview slugging and heading identity

- `src/renderer/lib/parseDocumentHeadings.ts`
- `src/renderer/panels/EditorPanel.tsx`
- `src/renderer/panels/OutlinePanel.tsx`

Closest analog: v1.3 Outline preview routing.

Phase 24 must reuse `slugifyHeading()` and `createHeadingIdTracker()` rather than inventing a second slugging system. Preview chunk wrappers should derive IDs and duplicate semantics from the same helpers already used for preview heading IDs and Outline routing.

### Active editor and preview bridge

- `src/renderer/lib/activeEditorRegistry.ts`
- `src/renderer/panels/EditorPanel.tsx`
- `src/renderer/panels/OutlinePanel.tsx`

Closest analog: Phase 23 preview scroll callback.

The shared selection work should stay renderer-local and follow this bridge pattern instead of introducing main-process IPC or DOM-global custom events.

### Dock split resize logic

- `src/renderer/docking/DockSplitContainer.tsx`
- `src/shared/panels.ts`
- `src/shared/types.ts`

Closest analog: current ratio-only resize clamp.

Phase 24 should extend the existing resize logic rather than replace the dock layout tree. Add a small helper layer for recursive effective minimum-size calculation and keep `setSplitRatio()` as the final mutation point.

### Test placement

- `src/shared/panels.test.ts`
- `src/renderer/panels/registry.test.ts`
- `src/renderer/stores/appStore.test.ts`
- `src/renderer/panels/EditorPanel.test.tsx`
- `src/renderer/panels/OutlinePanel.test.tsx`

Closest analog: Phase 22 and 23 colocated tests.

Keep pure helper tests in `.test.ts` files and preview/Outline behavior in `.test.tsx` files. Add a dedicated dock split test file if the current suite does not already cover resize math deeply enough.
