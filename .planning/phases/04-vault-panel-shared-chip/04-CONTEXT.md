# Phase 4: Vault Panel + Shared Chip - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning
**Source:** Product-doc guided context from requirements and test plan supplied by the project owner

<domain>
## Phase Boundary

Phase 4 gives users a dedicated FlashQuery vault panel and the reusable connection-status chip primitive. It consumes the Phase 3 FlashQuery IPC surface and registers a new `flashqueryVault` panel type across shared panel metadata, renderer registry, and app-store creation.

This phase owns the `flashqueryVault` panel definition, renderer component, shared chip component, vault tree rendering, lazy folder loading, refresh behavior, connection state rendering, row/context-menu interactions, and tests for those surfaces.

This phase does not build the settings dialog, workspace context-menu entry, editor URI read/save routing, editor title badge, E2E harness, or full cross-cutting regression phase. It may call existing Phase 3 IPC/preload methods and may open the future settings dialog through a UI-store action only if the action already exists; otherwise the implementation should create a narrow placeholder/store hook only when required by tests and defer the real dialog to Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Source Authority
- **D-01:** Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 4. These docs are the primary source for REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-024, REQ-025, REQ-026, REQ-040, and tests T-U-051..054, T-I-015..049, T-U-102..103.
- **D-02:** If local planning docs, roadmap rows, code comments, or existing Cate conventions appear ambiguous, agents MUST re-read the external requirements and test-plan docs first, then inspect the existing code, before asking the user.
- **D-03:** The project owner explicitly requested that all downstream implementation agents refer to the external requirements and test-plan docs first. Plans must repeat these docs in every task's `<read_first>` when the task touches Phase 4 behavior.

### Scope Boundaries
- **D-04:** Implement only Phase 4 behavior: shared chip primitive, vault panel registration, app-store factory, vault panel UI, lazy tree loading, refresh, row interaction, context menu behavior, and associated tests.
- **D-05:** Do not implement vault document creation. No "New File", "New Folder", command palette action, shortcut, folder context menu, write create mode, rename, delete, archive, tag, move, copy, or frontmatter affordance belongs in Phase 4.
- **D-06:** Do not implement Phase 5's full `FlashQueryConnectionDialog` or workspace menu entry except for the minimum UI-store/open hook needed for Phase 4 empty/disconnected actions if not already present.
- **D-07:** Do not implement Phase 6 editor URI-awareness or vault badge. Phase 4 may open editors with `flashquery://` URIs through existing `createEditor`, but editor read/save routing belongs to Phase 6.
- **D-08:** Renderer code must call the Phase 3 preload API (`window.electronAPI.flashquery.*` shape or equivalent existing API). The vault panel MUST NOT instantiate MCP clients, call Node APIs, or use filesystem IPC.

### Panel Registration
- **D-09:** Add `flashqueryVault` as a `PanelType` and `PANEL_DEFINITIONS` entry with label `FlashQuery Vault`, brand/switcher color `#5AD8B8`, muted color `#4a9080`, `tintClass: 'text-teal-400'`, file-explorer-like default/minimum sizing, `canLiveOnCanvas: true`, and a vault-themed ghost SVG.
- **D-10:** Add a renderer registry entry using the Phosphor `Vault` icon, lazy `FlashQueryVaultPanel`, and a factory calling `useAppStore.getState().createFlashQueryVault(workspaceId, canvasPoint, placement) || null`.
- **D-11:** Add `createFlashQueryVault` to `appStore`, mirroring `createFileExplorer`, producing panels with `type: 'flashqueryVault'`.

### Shared Chip Primitive
- **D-12:** Create the reusable chip primitive in `src/renderer/components/Chip.tsx` even if `src/renderer/components/` does not exist yet. The product docs explicitly identify this shared location for REQ-026; implementation should keep the directory narrowly scoped to the chip.
- **D-13:** The chip API must support connection states `{ kind: 'connecting' }`, `{ kind: 'live' }`, `{ kind: 'disconnected'; error?: string }`, and `{ kind: 'unknown' }`, with an exhaustive switch and default/fallback for future unknown variants.
- **D-14:** Visual values are locked by the product docs: 22 px pill, 999 radius, subtle translucent background/border, 11 px system font, teal spinner for connecting, green dot for live, red dot and retry affordance for disconnected.
- **D-15:** Only disconnected chips are actionable. Live and connecting clicks are no-ops and must not fire `onRetry`. Disconnected hover shows the error and "Click to retry"; click fires manual retry.

### Vault Panel UX
- **D-16:** The panel header shows a Phosphor `Vault` icon, `FlashQuery Vault`, parsed host text after a `.` separator, status chip, refresh icon button, and standard close behavior. The host truncates before the label.
- **D-17:** The panel renders the five product states exactly: populated, no connection, connecting, disconnected, and empty vault.
- **D-18:** The no-connection state must include the exact primary message "No FlashQuery connection configured for this workspace.", helper text directing the user to the workspace FlashQuery connection entry, and an "Open workspace settings" button wired to the Phase 5 dialog visibility hook if available.
- **D-19:** The connecting state renders skeleton tree rows and footer text `probing <host>`.
- **D-20:** The disconnected state renders "Can't reach FlashQuery.", the broadcast error/host context, a Retry button that triggers manual reconnect, and an Edit connection button that opens the same settings hook as the empty state.
- **D-21:** The empty-vault state renders "This vault has no documents yet." and helper "Create a document in FlashQuery to see it here.", with no create action.
- **D-22:** The populated state renders root entries from `flashquery:listVault`; folders are lazily loaded the first time they expand, and the tree remains scrollable.
- **D-23:** Folder rows show a chevron, folder icon, name, loading indicator while fetching, and local expansion state. Expansion state persists across refreshes but is not globally persisted across sessions.
- **D-24:** Document rows show file icon plus filename/title. Prefer returned `title` for display when present without parsing document bodies.

### Row Interaction And Refresh
- **D-25:** Single-click on a document selects it and does not open it. Double-click opens a dock editor using `buildVaultUri(workspaceId, entry.vaultPath)`.
- **D-26:** Right-click on a document row invokes `window.electronAPI.showContextMenu()` with exactly two items: `{ id: 'open', label: 'Open' }` and `{ id: 'open-on-canvas', label: 'Open on Canvas' }`.
- **D-27:** The `open` menu result behaves like double-click. The `open-on-canvas` result creates an editor panel on the canvas with the same `flashquery://` URI.
- **D-28:** Right-clicking a folder row MUST NOT call `showContextMenu` in v1.
- **D-29:** Refresh reloads the root listing, ignores duplicate clicks while in flight, preserves expansion and selection for vault paths that still exist, drops expansion for removed folders, and does not close open editors.
- **D-30:** Multi-select behavior should match the local file tree where feasible. If full local-file selection machinery is too coupled, preserve the test-visible Shift/Cmd/Ctrl selection semantics in the vault panel and document any narrower behavior in the plan.

### Design And Styling
- **D-31:** Phase 4 UI should feel like Cate's existing dense desktop tool UI: restrained, token-based, and panel-native. Do not create a landing page, marketing layout, decorative background, or standalone visual language.
- **D-32:** Use existing Cate semantic utility classes from `src/renderer/styles/globals.css` such as `text-primary`, `text-secondary`, `text-muted`, `bg-surface-*`, and `bg-hover`. Avoid stock Tailwind neutral palette classes (`zinc`, `gray`, `slate`) in rendered Phase 4 UI.
- **D-33:** Icons should come from `@phosphor-icons/react` to match Cate's existing icon library.
- **D-34:** The plan must include tests T-U-102 and T-U-103 or equivalent source/snapshot assertions that the vault panel and chip do not introduce forbidden stock Tailwind neutral classes.

### Testing
- **D-35:** Add or extend tests for T-U-051..054: shared panel definition, brand colors, renderer registry entry/factory, and app-store `createFlashQueryVault`.
- **D-36:** Add `src/renderer/components/Chip.test.tsx` for T-I-015..021.
- **D-37:** Add `src/renderer/panels/FlashQueryVaultPanel.test.tsx` for T-I-022..049 and T-U-102.
- **D-38:** Run focused tests for the new files plus `npm run typecheck`. If the local default Node is outside Cate's `>=20 <23` engine, use the existing project pattern from Phase 3: run through Node 22 (`npx -p node@22 ...`) and note that in summaries.

### the agent's Discretion
- The planner may decide whether the status chip component is named `Chip` or `ConnectionStatusChip`, provided the reusable exported component lives in `src/renderer/components/Chip.tsx` and future editor badge reuse is straightforward.
- The planner may choose the narrow state-management shape for panel-local vault entries, expansion, selection, and in-flight loads, provided the test-visible behavior and local file-tree conventions are met.
- The planner may split the phase into either three roadmap-aligned plans or smaller test-first slices, provided every Phase 4 requirement ID appears in at least one plan frontmatter `requirements` list.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specs
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — Primary requirements source. Read Spec §6.4, §6.5, §6.8.1, invariants INV-03, INV-06, INV-10, INV-11, INV-12, and the Phase 4 file list around the roadmap section before implementation.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — Primary test source. Read Test Plan §4.4 and checklist rows for T-U-051..054, T-I-015..049, T-U-102..103.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — UI Spec.md` — Visual source for panel chrome, panel states, chip measurements, spacing, and token usage if needed during implementation.

### Local Planning Artifacts
- `.planning/PROJECT.md` — Brownfield Cate/FlashQuery posture, process boundaries, and testing expectations.
- `.planning/REQUIREMENTS.md` — Local milestone requirement summary and traceability table.
- `.planning/ROADMAP.md` — Phase 4 boundary, success criteria, and plan breakdown.
- `.planning/STATE.md` — Confirms Phase 3 completion and Phase 4 readiness.
- `.planning/phases/03-ipc-surface/03-CONTEXT.md` — Locked decisions for Phase 3 IPC contracts consumed by Phase 4.
- `.planning/phases/03-ipc-surface/03-03-SUMMARY.md` — Confirms `listVault`, `getDocument`, `writeDocument`, and `flashquery://` URI helper behavior available to the vault panel.

### Codebase Maps And Existing Code
- `.planning/codebase/ARCHITECTURE.md` — Electron layering, renderer/store/panel boundaries, and shared contracts.
- `.planning/codebase/CONVENTIONS.md` — Naming, TypeScript style, tests, imports, and token usage.
- `.planning/codebase/TESTING.md` — Vitest jsdom/node split and focused test command patterns.
- `AGENTS.md` — Project-specific constraints and brownfield integration posture.
- `CLAUDE.md` — Cate architecture and build/test commands.
- `src/shared/types.ts` — `PanelType`, `PanelState`, workspace, point, size, and shared contract types.
- `src/shared/panels.ts` — Shared panel definition pattern and ghost SVG helper.
- `src/renderer/panels/registry.ts` — Renderer panel registry and factory pattern.
- `src/renderer/stores/appStore.ts` — Panel creation methods and workspace state access.
- `src/renderer/panels/FileExplorerPanel.tsx` — Panel chrome and file-tree panel structure precedent.
- `src/renderer/sidebar/FileTreeNode.tsx` — Row interaction and context-menu source of truth.
- `src/renderer/stores/uiStore.ts` — Dialog visibility slice pattern for the settings button/edit action.
- `src/main/flashquery/uri.ts` — `buildVaultUri` helper for document open actions.
- `src/shared/electron-api.d.ts` — Renderer API type shape for FlashQuery IPC and context-menu calls.
- `src/preload/index.ts` — Preload-exposed FlashQuery API names to call from renderer tests/components.

</canonical_refs>

<specifics>
## Specific Ideas

- The external product docs are mandatory first reads for downstream agents; this is an explicit project-owner instruction, not planner preference.
- Phase 4 should likely plan as three executable slices: shared chip primitive, panel registration/factory, and vault tree UX. The third slice may be large enough to split into state rendering and row/refresh interactions if the planner wants smaller test-first units.
- `src/renderer/components/` does not currently exist in the Cate tree. Product docs approve creating it for the reusable chip; keep it small and avoid migrating unrelated UI.
- Existing Phase 3 summaries confirm the manager now exposes domain-shaped `listVault`, `getDocument`, and `writeDocument` methods, and the IPC layer returns normalized vault entries.
- The local default Node has previously been outside Cate's supported engine range; verification should use Node 20 or 22 if needed.

</specifics>

<deferred>
## Deferred Ideas

- Full settings dialog, URL/token fields, test connection form behavior, save/cancel/remove flows, and workspace context-menu entry belong to Phase 5.
- Editor read routing, save routing, diff guardrails, dirty-state persistence behavior, and editor vault badge belong to Phase 6.
- Full E2E happy path, restart behavior, existing E2E regression, and manual/design checklist belong to Phase 7.
- Live vault-change notifications, SSE subscriptions, conflict detection, frontmatter editing, vault document creation, rename/delete/archive/tag/move, OAuth, token refresh, keychain migration, and stdio transport remain outside v1 or future work.

</deferred>

---

*Phase: 04-vault-panel-shared-chip*
*Context gathered: 2026-05-29*
