# Phase 5: Settings Dialog + Workspace Menu Entry - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning
**Source:** Product-doc guided context from requirements and test plan supplied by the project owner

<domain>
## Phase Boundary

Phase 5 lets users configure, test, save, and remove a workspace's FlashQuery connection from Cate UI. It consumes the Phase 3 FlashQuery IPC surface and the Phase 4 shared status/UI-store groundwork, then adds the visible settings dialog and workspace context-menu entry.

This phase owns `FlashQueryConnectionDialog`, URL/token form behavior, reveal/hide token UI, inline test-connection behavior, save/cancel/remove flows, dialog visibility state, root dialog mounting, and the native workspace context-menu item that opens the dialog.

This phase does not build editor URI-awareness, editor read/save routing, the editor vault badge, full Electron E2E happy-path coverage, manual design signoff, vault document creation, frontmatter editing, conflict detection, OAuth, keychain storage, or stdio transport.

</domain>

<decisions>
## Implementation Decisions

### Source Authority
- **D-01:** Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 5. These docs are the primary source for REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, and tests T-U-055, T-I-050..078, T-U-104.
- **D-02:** If local planning docs, roadmap rows, code comments, or existing Cate conventions appear ambiguous, agents MUST re-read the external requirements and test-plan docs first, then inspect the existing code, before asking the user.
- **D-03:** The project owner explicitly requested that all downstream implementation agents refer to the external requirements and test-plan docs first. Every Phase 5 plan task that touches implementation or tests must include both docs in `<read_first>`.

### Dialog Scope
- **D-04:** Create `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`, structurally mirroring `src/renderer/dialogs/SavedLayoutsDialog.tsx`; do not introduce a third-party dialog framework.
- **D-05:** The dialog is controlled by `showFlashQueryConnectionDialog` and `setShowFlashQueryConnectionDialog(show: boolean)` in `src/renderer/stores/uiStore.ts`, initialized to `false` and mounted alongside existing root dialogs.
- **D-06:** Dialog chrome must reuse Cate's established overlay, close button, Escape-to-close, and click-outside behavior. Title bar content is locked: teal Phosphor `Lightning`, title `FlashQuery Connection`, subtitle `For workspace: <workspace name>` in muted text, and standard close `X`.
- **D-07:** Dialog state must be ephemeral. Each open re-reads the current workspace connection and token; field edits are discarded on cancel, close, Escape, click-outside, and between opens.

### Form Behavior
- **D-08:** URL field values are locked: label `FlashQuery URL`, text input, placeholder `https://fq.example.com` or `http://localhost:3100`, helper text `The HTTP base URL where FlashQuery's MCP server is listening.`, and blur/save validation requiring parseable `http:` or `https:` URL.
- **D-09:** Bearer token field values are locked: label `Bearer token`, password by default, Phosphor `Eye` / `EyeSlash` reveal toggle, mode-aware helper text, and no validation beyond non-empty where required by a save/test flow. First-time setup helper text remains `A bearer token issued by FlashQuery. Stored locally with this workspace.` Edit mode helper text must disclose that a token is already stored, blank save keeps it, entering a value replaces it, and `Remove connection` clears it entirely.
- **D-10:** After the Phase 5 Gap 4 fix, edit mode prepopulates only the URL from `WorkspaceInfo.flashqueryConnection.url`; main must not return the stored token to renderer. First-time setup leaves both fields empty. In edit mode, leaving the token field blank on Save sends the existing renderer → main `preserveExistingToken: true` hint to keep the stored credential; typing a token replaces it.

### Test Connection
- **D-11:** The dialog must include a `Test connection` button below the bearer-token field.
- **D-12:** Test connection probes the current field values without persistence. Prefer the Phase 3 `flashquery:probe` IPC if present; otherwise add the narrow IPC/preload/shared channel surface required to issue `GET /mcp/info` against the form URL without storing connection metadata or token.
- **D-13:** Successful test results render a green `CheckCircle` and `Connected to FlashQuery v<version> (instance <instance_id_short>)`. Failed tests render a red `XCircle` and a one-line error reason.
- **D-14:** The result area starts empty and clears between attempts. Test connection must not dispatch `flashquery:setConnection`.

### Save, Cancel, And Remove
- **D-15:** Save validates the URL, dispatches `flashquery:setConnection` with `{ transport: 'http', url, auth: { type: 'bearer', token } }` when the user enters a token, dispatches `{ transport: 'http', url, preserveExistingToken: true }` when edit mode is saved with a blank token field, closes on success, and surfaces the error while keeping the dialog open on failure.
- **D-16:** Save is the primary action with teal styling (`#5AD8B8`) and a visible focus ring.
- **D-17:** Cancel, close `X`, Escape, and click-outside close without saving and without any IPC writes.
- **D-18:** Remove connection is a footer-left muted destructive ghost action. First-time setup disables it with tooltip `Currently no connection to remove.` Edit mode shows inline confirmation `Really remove?` with adjacent `Yes` / `No` affordances. Confirming dispatches `flashquery:setConnection(workspaceId, null)` and closes.

### Workspace Context Menu
- **D-19:** Add `{ id: 'flashquery-connection', label: 'FlashQuery Connection...' }` to the native workspace context menu in `src/renderer/sidebar/WorkspaceTab.tsx`, positioned between `copy-cwd` and the duplicate group with surrounding separators.
- **D-20:** Handle `case 'flashquery-connection':` by calling `useUIStore.getState().setShowFlashQueryConnectionDialog(true)`.
- **D-21:** Do not introduce a custom React dropdown for workspace context menus. Cate's native `window.electronAPI.showContextMenu()` remains the rendering layer.
- **D-22:** The menu item is always present whenever the workspace context menu opens.

### Design And Styling
- **D-23:** Phase 5 UI must feel like Cate's existing dense desktop tool UI: restrained, token-based, and dialog-native. Do not create a marketing surface, standalone visual language, or decorative layout.
- **D-24:** Use existing Cate semantic utility classes from `src/renderer/styles/globals.css` such as `text-primary`, `text-secondary`, `text-muted`, `bg-surface-*`, and `bg-hover`. Avoid stock Tailwind neutral palette classes (`zinc`, `gray`, `slate`) in the rendered dialog.
- **D-25:** Icons come from `@phosphor-icons/react` to match Cate's existing icon library.

### Testing
- **D-26:** Add or extend `src/renderer/stores/uiStore.test.ts` for T-U-055.
- **D-27:** Add `src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` for T-I-050..074 and T-U-104.
- **D-28:** Extend `src/renderer/sidebar/WorkspaceTab.test.tsx` for T-I-075..078.
- **D-29:** Run focused tests for the changed files plus `npm run typecheck`. If the local default Node is outside Cate's `>=20 <23` engine, use the established project pattern from prior phases: run through Node 22 and note that in summaries.

### the agent's Discretion
- The planner may decide whether to add one or more narrow preload/shared types for test-probe and token prepopulation if existing Phase 3 APIs are insufficient, provided privileged work stays in main/preload and renderer state does not expose secrets outside the dialog form.
- The planner may choose a compact helper for URL validation and result formatting if it makes tests clearer and stays local to the dialog or an existing renderer utility pattern.
- The planner may split Phase 5 into three roadmap-aligned plans or smaller test-first slices, provided every Phase 5 requirement ID appears in at least one plan frontmatter `requirements` list.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specs
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — Primary requirements source. Read Spec §6.7, invariants INV-01, INV-02, INV-10, INV-11, INV-12, and the Phase 5 roadmap section before implementation.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — Primary test source. Read Test Plan §4.5, checklist rows T-U-055, T-I-050..078, T-U-104, and manual rows T-M-005..006 if design questions arise.

### Local Planning Artifacts
- `.planning/PROJECT.md` — Brownfield Cate/FlashQuery posture, process boundaries, and testing expectations.
- `.planning/REQUIREMENTS.md` — Local milestone requirement summary and traceability table.
- `.planning/ROADMAP.md` — Phase 5 boundary, success criteria, and roadmap plan breakdown.
- `.planning/STATE.md` — Confirms Phase 4 completion and Phase 5 readiness.
- `.planning/phases/03-ipc-surface/03-CONTEXT.md` — Locked decisions for Phase 3 IPC contracts consumed by Phase 5.
- `.planning/phases/03-ipc-surface/03-02-SUMMARY.md` — Confirms set/clear connection and probe handler behavior.
- `.planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md` — Locked Phase 4 decisions for status chip, panel actions, and UI-store hook boundary.
- `.planning/phases/04-vault-panel-shared-chip/04-03-SUMMARY.md` — Confirms the narrow renderer hooks for manual retry and future settings dialog open state.

### Codebase Maps And Existing Code
- `.planning/codebase/ARCHITECTURE.md` — Electron layering, renderer/store/panel boundaries, and shared contracts.
- `.planning/codebase/CONVENTIONS.md` — Naming, TypeScript style, tests, imports, and token usage.
- `.planning/codebase/TESTING.md` — Vitest jsdom/node split and focused test command patterns.
- `AGENTS.md` — Project-specific constraints and brownfield integration posture.
- `src/renderer/dialogs/SavedLayoutsDialog.tsx` — Canonical dialog chrome and behavior pattern.
- `src/renderer/stores/uiStore.ts` — Existing modal visibility slice pattern and Phase 4 placeholder hook if present.
- `src/renderer/App.tsx` and renderer shell/root files — Existing dialog mounting location.
- `src/renderer/sidebar/WorkspaceTab.tsx` — Native workspace context-menu construction and result dispatch switch.
- `src/renderer/sidebar/WorkspaceTab.test.tsx` — Context-menu test pattern.
- `src/shared/ipc-channels.ts` — FlashQuery channel constants and any probe channel.
- `src/shared/electron-api.d.ts` — Renderer API type shape for FlashQuery IPC and context-menu calls.
- `src/preload/index.ts` — Preload-exposed FlashQuery API names to call from renderer tests/components.
- `src/main/ipc/flashquery.ts` — Main-process FlashQuery handlers, including set/clear connection and probe behavior.
- `src/main/ipc/flashquery.test.ts` — IPC handler test patterns for probe and set/clear behavior.
- `src/shared/types.ts` — `WorkspaceInfo`, `FlashQueryConnection`, status/result types, and native context-menu item types.

</canonical_refs>

<specifics>
## Specific Ideas

- The external product docs are mandatory first reads for downstream agents; this is an explicit project-owner instruction.
- Phase 5 likely plans as three executable slices: dialog state/shell, form/probe/save/remove behavior, and workspace menu wiring. If existing Phase 3 probe or Phase 4 dialog hook work is incomplete, the first or second slice should include the narrow missing contract rather than asking the user.
- Existing Phase 4 work may already include `showFlashQueryConnectionDialog` as a placeholder; downstream agents should inspect and reuse it instead of duplicating store state.
- The workspace context-menu label in product docs uses an ellipsis glyph. Keep ASCII in planning docs as `FlashQuery Connection...`, but implementation should match the existing codebase/menu label convention if it already uses the single-character ellipsis in user-facing strings.
- The local default Node has previously been outside Cate's supported engine range; verification should use Node 20 or 22 if needed.

</specifics>

<deferred>
## Deferred Ideas

- Editor URI-awareness, save routing, local Git diff guardrails, dirty-state handling, and editor vault badge belong to Phase 6.
- Full Electron E2E happy path, restart behavior, existing E2E regression, and manual/design checklist belong to Phase 7.
- Vault document creation, rename/delete/archive/tag/move, frontmatter editing, conflict detection, live vault notifications, OAuth, token refresh, keychain migration, and stdio transport remain outside v1 or future work.

</deferred>

---

*Phase: 05-settings-dialog-workspace-menu-entry*
*Context gathered: 2026-05-29*
