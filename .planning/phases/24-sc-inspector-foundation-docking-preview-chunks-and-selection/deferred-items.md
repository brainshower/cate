# Deferred Items

## 2026-06-16 - Out-of-scope typecheck failure, resolved concurrently

- **Found during:** Plan 24-03 verification
- **Command:** `npx -p node@22 npm run typecheck`
- **Issue:** TypeScript currently fails in `src/renderer/docking/DockSplitContainer.test.tsx` because `DockLayoutNode` values are passed where `DockSplitNode` is expected at lines 80, 92, 104, and 119.
- **Reason deferred:** This is outside Plan 24-03's Markdown preview chunk wrapper ownership boundary and was not caused by the `EditorPanel` changes.
- **Current status:** Resolved by concurrent commit `bd53939`; the required Plan 24-03 typecheck command now passes.
