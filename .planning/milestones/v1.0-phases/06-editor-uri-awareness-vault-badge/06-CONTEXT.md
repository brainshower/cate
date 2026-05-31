# Phase 6: Editor URI-Awareness + Vault Badge - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning
**Source:** Product-doc guided context from requirements and test plan supplied by the project owner

<domain>
## Phase Boundary

Phase 6 extends Cate's existing editor so FlashQuery vault documents opened from the vault panel behave like editable editor documents while preserving local-file behavior. It consumes the Phase 3 FlashQuery IPC/preload surface and the Phase 4 shared chip primitive.

This phase owns `EditorPanel` URI-scheme awareness, vault read routing, vault save routing, dirty-state behavior for vault documents, local-file and local-diff regressions, vault diff guardrails, the editor title-bar vault badge, and the badge tooltip.

This phase does not build new FlashQuery IPC handlers, vault panel browsing, settings dialog behavior, workspace menu behavior, Electron E2E happy-path harness, manual design signoff, vault document creation, frontmatter editing, conflict detection, OAuth, keychain storage, live vault notifications, or stdio transport.

</domain>

<decisions>
## Implementation Decisions

### Source Authority
- **D-01:** Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 6. These docs are the primary source for REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-041, REQ-042, and tests T-I-079..098.
- **D-02:** If local planning docs, roadmap rows, code comments, or existing Cate conventions appear ambiguous, agents MUST re-read the external requirements and test-plan docs first, then inspect the existing code, before asking the user.
- **D-03:** The project owner explicitly requested that all downstream implementation agents refer to the external requirements and test-plan docs first. Every Phase 6 plan task that touches implementation or tests must include both docs in `<read_first>`.

### Scope Boundaries
- **D-04:** Implement only Phase 6 editor behavior: URI detection, read routing, save routing, dirty-state parity, diff guardrails, badge rendering, badge tooltip, and associated focused tests.
- **D-05:** Do not add create-new-vault-document behavior, frontmatter UI, conflict/staleness UI, version-token persistence, vault rename/delete/move/tag/archive, or live vault notification behavior.
- **D-06:** Renderer code must call the existing Phase 3 preload API for FlashQuery document read/write. `EditorPanel` MUST NOT instantiate MCP clients, call Node APIs directly, or use filesystem IPC for `flashquery://` documents.
- **D-07:** Local-file editor behavior remains the regression baseline. Any Phase 6 change must preserve local reads, local saves, local diff mode, local dirty-state behavior, close-confirm behavior, Monaco model lifecycle, and title-bar behavior for non-vault files.

### URI Recognition And Read Routing
- **D-08:** Treat `flashquery://<workspaceId>/<vault-path>` as the canonical vault editor URI shape. Use existing `parseVaultUri` / `buildVaultUri` helpers from the renderer-safe shared module rather than duplicating parsing logic in `EditorPanel`.
- **D-09:** `EditorPanel` must accept both local file paths and `flashquery://...` URI strings in its existing `filePath` prop.
- **D-10:** The model cache key remains the full `filePath` string. Do not normalize, rewrite, or strip the `flashquery://` scheme before caching.
- **D-11:** For vault URIs, Monaco model lookup/creation must use `monaco.Uri.parse(filePath)`. For local paths, preserve the existing `monaco.Uri.file(filePath)` behavior.
- **D-12:** The read branch point must live at the editor model construction/read entry point: vault URI calls `window.electronAPI.flashqueryGetDocument(workspaceId, vaultPath)` and uses the returned `body`; local path uses the existing filesystem read path unchanged.

### Save And Dirty-State Behavior
- **D-13:** The existing editor save path must route by URI scheme: vault URI calls `window.electronAPI.flashqueryWriteDocument(workspaceId, vaultPath, model.getValue())`; local path calls the existing filesystem write path unchanged.
- **D-14:** Successful vault saves clear dirty state exactly like successful local saves: `isDirtyRef.current = false`, `setPanelDirty(workspaceId, panelId, false)`, and the title dirty marker is removed.
- **D-15:** Failed vault saves leave dirty state intact and surface a user-visible save failure message. The implementation may use Cate's existing status/toast/inline error convention, but silent failure is not acceptable.
- **D-16:** Saving while the FlashQuery status is disconnected must still attempt the IPC call. The editor must not block locally based on renderer-side connection status.
- **D-17:** Vault editors must not persist unsaved body content into `PanelState.unsavedContent` or a temp file. The Monaco model is the only unsaved buffer; session restore persists only the `flashquery://` `filePath` and re-reads from FlashQuery.
- **D-18:** Closing a dirty vault editor must use the existing `DIALOG_CONFIRM_UNSAVED` flow. Do not introduce a new custom close-confirm dialog.

### Git Diff Guardrails
- **D-19:** Git diff mode is local-file-only. If `diffMode` is requested for a vault URI, `EditorPanel` must short-circuit to standard editor mode, log a warning, and avoid relative-path or Git IPC work.
- **D-20:** Local diff mode for staged and working files must continue to work unchanged.

### Badge And Tooltip
- **D-21:** Vault editors render a title-bar badge between the dirty-state indicator/title area and right-side actions. Local-file editors render no badge.
- **D-22:** Badge content is locked: teal Phosphor `Vault` icon, text `Vault`, separator `.`, and the host parsed from the workspace FlashQuery connection URL.
- **D-23:** The badge surface must reuse the Phase 4 `Chip` primitive or a directly parameterized primitive from the same file. Do not duplicate chip surface styling inside `EditorPanel`.
- **D-24:** The badge is not clickable in v1.
- **D-25:** Hovering the badge shows the full decoded vault-relative path from `parseVaultUri(filePath).vaultPath`, using Cate's existing tooltip styling/timing pattern where feasible.

### Frontmatter And Conflict Guardrails
- **D-26:** The editor presents the FlashQuery `body` string as-is and must not parse or render YAML frontmatter. Frontmatter remains invisible in v1.
- **D-27:** Phase 6 must preserve the Phase 3 write contract: no `frontmatter`, `title`, `tags`, `expected_version`, or `if_match` data is passed from the editor. The editor does not retain or send `version_token`.
- **D-28:** No staleness/conflict UI may appear in v1. Last-write-wins behavior is intentional.

### Testing
- **D-29:** Add or extend `src/renderer/panels/EditorPanel.test.tsx` for T-I-079..098.
- **D-30:** Tests must cover vault read routing, local read regression, model cache identity by full URI string, Monaco `Uri.parse` retrieval for vault URIs, vault save routing, local save regression, successful save dirty clearing, failed save dirty preservation and visible error, and disconnected-status save attempt.
- **D-31:** Tests must cover vault diff guardrails, local diff regression, and proof that vault diff mode does not attempt local relative-path work.
- **D-32:** Tests must cover dirty title marker parity, `PanelState.unsavedContent` non-use for vault editors, close-confirm reuse, vault badge rendering/content, local no-badge regression, tooltip text, and chip primitive reuse.
- **D-33:** Run focused `EditorPanel` tests plus `npm run typecheck`. If the local default Node is outside Cate's `>=20 <23` engine, use the established project pattern from prior phases: run through Node 22 and note that in summaries.

### the agent's Discretion
- The planner may decide whether URI-scheme helpers local to `EditorPanel` are needed, provided canonical parsing remains delegated to shared FlashQuery URI helpers.
- The planner may choose the smallest user-visible save-error surface that fits existing Cate patterns and is testable.
- The planner may split Phase 6 into the three roadmap-aligned plans or smaller test-first slices, provided every Phase 6 requirement ID appears in at least one plan frontmatter `requirements` list.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specs
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — Primary requirements source. Read Spec §6.6, §6.8.2, §6.8.3, invariants INV-04, INV-05, INV-08, INV-09, INV-10, INV-12, and roadmap Phase 6 §8.8 before implementation.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — Primary test source. Read Test Plan §4.6 and checklist rows T-I-079..098 before implementation.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — UI Spec.md` — Visual source for the editor badge, tooltip, chip surface reuse, and design-token expectations if badge styling questions arise.

### Local Planning Artifacts
- `.planning/PROJECT.md` — Brownfield Cate/FlashQuery posture, process boundaries, and testing expectations.
- `.planning/REQUIREMENTS.md` — Local milestone requirement summary and traceability table.
- `.planning/ROADMAP.md` — Phase 6 boundary, success criteria, and roadmap plan breakdown.
- `.planning/STATE.md` — Confirms Phase 5 completion and Phase 6 readiness.
- `.planning/phases/03-ipc-surface/03-CONTEXT.md` — Locked Phase 3 decisions for FlashQuery preload/IPC contracts consumed by the editor.
- `.planning/phases/03-ipc-surface/03-03-SUMMARY.md` — Confirms `getDocument`, `writeDocument`, body-only reads, update-only writes, and shared URI helper behavior.
- `.planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md` — Locked Phase 4 decisions for the shared chip primitive and `flashquery://` editor-opening behavior.
- `.planning/phases/04-vault-panel-shared-chip/04-01-SUMMARY.md` — Confirms the reusable chip primitive location and API.
- `.planning/phases/05-settings-dialog-workspace-menu-entry/05-CONTEXT.md` — Confirms dialog/workspace connection behavior available before Phase 6.
- `.planning/phases/05-settings-dialog-workspace-menu-entry/05-VERIFICATION.md` — Confirms Phase 5 completion status before editor work.

### Codebase Maps And Existing Code
- `.planning/codebase/ARCHITECTURE.md` — Electron layering, renderer/store/panel boundaries, and shared contracts.
- `.planning/codebase/CONVENTIONS.md` — Naming, TypeScript style, tests, imports, and token usage.
- `.planning/codebase/TESTING.md` — Vitest jsdom/node split and focused test command patterns.
- `AGENTS.md` — Project-specific constraints and brownfield integration posture.
- `CLAUDE.md` — Cate architecture and build/test commands if present.
- `src/renderer/panels/EditorPanel.tsx` — Primary implementation target: URI detection, model creation/read, save, dirty state, diff gate, title bar badge, and tooltip.
- `src/renderer/panels/EditorPanel.test.tsx` — Primary Phase 6 test target.
- `src/shared/flashqueryUri.ts` — Canonical `buildVaultUri` / `parseVaultUri` helpers for renderer-safe URI parsing.
- `src/shared/electron-api.d.ts` — Renderer-facing FlashQuery API type shape.
- `src/preload/index.ts` — Existing FlashQuery preload methods and naming.
- `src/renderer/components/Chip.tsx` — Reusable chip primitive created in Phase 4 and required for the vault badge.
- `src/renderer/components/Chip.test.tsx` — Chip API expectations and reusable surface tests.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` — Existing vault document open behavior and status-chip usage.
- `src/renderer/stores/appStore.ts` — Panel dirty-state, title, close-confirm, and session persistence behavior.
- `src/shared/types.ts` — `PanelState`, `PanelType`, workspace, FlashQuery connection, and document result types.
- `src/main/flashquery/clientManager.test.ts` — Existing body-only and update-only write invariant tests for REQ-041 and REQ-042.

</canonical_refs>

<specifics>
## Specific Ideas

- The external product docs are mandatory first reads for downstream agents; this is an explicit project-owner instruction.
- Phase 6 likely plans cleanly as three executable slices: URI read/model routing, save/dirty-state behavior, and badge/diff/frontmatter guardrails.
- The roadmap's Plan 6.3 combines badge and guardrails because both live in `EditorPanel` and depend on the vault URI classifier, but the planner may split if `EditorPanel.test.tsx` is already large.
- Phase 6 should avoid touching main-process FlashQuery code except to run or reference existing invariant tests. REQ-041 and REQ-042 are primarily preserved by Phase 3 manager tests; Phase 6 should prove the editor does not introduce frontmatter/version data.
- The local default Node has previously been outside Cate's supported engine range; verification should use Node 20 or 22 if needed.

</specifics>

<deferred>
## Deferred Ideas

- Full Electron E2E happy path, restart behavior, existing E2E regression, and manual/design checklist belong to Phase 7.
- Vault document creation, rename/delete/archive/tag/move, frontmatter editing, conflict detection, live vault notifications, OAuth, token refresh, keychain migration, stdio transport, agent integration, and brokered tool execution remain outside v1 or future work.

</deferred>

---

*Phase: 06-editor-uri-awareness-vault-badge*
*Context gathered: 2026-05-29*
