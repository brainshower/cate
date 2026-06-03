# Phase 16: Vault Search Panel - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning
**Source:** Product source docs supplied by project owner

<domain>
## Phase Boundary

Phase 16 ships a dedicated FlashQuery Vault Search panel for REQ-008, REQ-009, REQ-010, REQ-011, and REQ-012. It builds on Phase 14's search IPC contract and Phase 15's editor/vault panel behavior.

This phase owns panel registration, search controls, grouped document/memory result rendering, explicit search dispatch, pagination, keyboard/result interactions, native document context menu actions, memory inspection, in-flight state, and disconnected state for the search surface. It must not build the Pi extension, `@` mention autocomplete, ToolCard observability, or broad Phase 21 hardening beyond search-specific disconnected coverage.
</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Documents
- D-01 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` before touching Phase 16 source.
- D-02 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` before touching Phase 16 tests.
- D-03 [locked]: The product documents above are the primary source for REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, T-U-005, T-U-010, T-U-011, T-E-003, and T-E-007.

### Phase 14/15 Dependencies
- D-04 [locked]: Phase 16 builds on Phase 14 search contracts: `flashquerySearch(workspaceId, params)` returns `{ documents, memories, total_documents, total_memories, error? }`; `FlashQuerySearchParams` supports `query`, `mode`, `entity_types`, and `limit`; main IPC sets `include_archived: true` and validates semantic empty dispatch.
- D-05 [locked]: Implementation agents MUST read `.planning/phases/14-shared-flashquery-contracts-and-ipc/14-03-SUMMARY.md` before implementation to understand search IPC validation and safe empty error responses.
- D-06 [locked]: Phase 16 should reuse Phase 15 editor-open/vault URI behavior: document result open actions use `buildVaultUri(workspaceId, fullPath)` and existing `createEditor` dock/canvas placement.
- D-07 [locked]: Phase 16 may include search-row clipboard actions only where required by REQ-011/REQ-019 partial coverage; broader vault tree and editor-title clipboard work remains Phase 20.

### Panel Registration and Chrome
- D-08 [locked]: Add a new panel type and registry entry for the Vault Search panel. The user-visible label is `Vault Search`.
- D-09 [locked]: The panel header includes a `MagnifyingGlass` icon, label `Vault Search`, existing FlashQuery connection chip behavior, and a close action where the local panel chrome pattern supports panel close.
- D-10 [locked]: The search row includes input placeholder `Search the vault...`, clear action, and explicit `Search` button.
- D-11 [locked]: The panel uses Cate's existing panel styling and semantic tokens; do not introduce a standalone visual system.

### Search Semantics
- D-12 [locked]: Search dispatch happens only on `Search` button click or Enter from the search input. Mode/filter changes update UI state but do not automatically re-run search.
- D-13 [locked]: Modes are `filesystem`, `mixed`, and `semantic`; default mode is `mixed`.
- D-14 [locked]: Params include `query`, `mode`, `entity_types`, `limit`, and `include_archived: true` semantics via the existing main IPC contract.
- D-15 [locked]: Empty query in filesystem or mixed mode sends list-all semantics through the existing search IPC; empty query in semantic mode disables the Search button and exposes tooltip `Type a query to search semantically.`
- D-16 [locked]: Default per-active-group limit is 50. `Show more` increments the limit by 50 and reissues the search.

### Result Rendering and Interactions
- D-17 [locked]: Documents render under `Vault`; memories render under `Memories`.
- D-18 [locked]: Group headers render when the corresponding entity-type chip is active; if an active group has no results, it shows `No results.`
- D-19 [locked]: Initial idle state shows exactly `Type a query and press Search.`
- D-20 [locked]: If both entity chips are off, the result area says exactly `Enable Documents or Memories to see results.`
- D-21 [locked]: Match-token highlighting is case-insensitive and applies to rendered row text, except list-all searches.
- D-22 [locked]: Document single click selects a row; document double click opens the document in a docked editor; keyboard Enter opens/expands and Cmd+Enter opens documents on canvas.
- D-23 [locked]: Document right-click opens a native context menu with exact labels `Open`, `Open on Canvas`, `Reveal in Vault Tree`, `Copy vault path`, and `Copy as reference`.
- D-24 [locked]: Memory single click selects a row; memory double click toggles a read-only body inspector; memory rows do not add a formal context menu.
- D-25 [locked]: Search input Enter triggers search and Esc clears.

### Connection and In-Flight Behavior
- D-26 [locked]: During in-flight search, the Search button shows a spinner and repeat searches are ignored.
- D-27 [locked]: If FlashQuery disconnects during or before search, the results area shows a disconnected block and the Search button disables until connection returns.
- D-28 [locked]: Prior successful results must not be mistaken for current results after a disconnected failure.

### The Agent's Discretion
- The exact component decomposition is discretionary, but it should keep search state, rendering helpers, and row interactions testable.
- The exact panel type string is discretionary if all type unions/tests/registry entries agree; prefer `flashqueryVaultSearch`.
- The exact memory inspector presentation is discretionary if it is read-only, row-local or clearly tied to the selected memory, and toggled by double click/Enter.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Sources
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Source of truth for REQ-008 through REQ-012.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Source of truth for T-U-005, T-U-010, T-U-011, T-E-003, and T-E-007.

### Cate Planning Sources
- `.planning/REQUIREMENTS.md` - Cate v1.2 requirement index and traceability.
- `.planning/ROADMAP.md` - Phase 16 goal, success criteria, and mapped requirement IDs.
- `.planning/STATE.md` - Current milestone state and decision history.
- `.planning/phases/14-shared-flashquery-contracts-and-ipc/14-03-SUMMARY.md` - Phase 14 search IPC and validation closeout.
- `.planning/phases/15-editor-refresh-and-frontmatter-panels/15-03-PLAN.md` - E2E fixture extension patterns and FlashQuery editor fixture conventions.
- `.planning/phases/15-editor-refresh-and-frontmatter-panels/15-03-SUMMARY.md` - Phase 15 closeout notes: E2E fixture specs run through Playwright, and `src/renderer/lib/e2eHarness.ts` now has `activatePanel`.

### Current Code Sources
- `src/shared/types.ts` - FlashQuery search result/params types and `PanelType`.
- `src/shared/panels.ts` - Shared panel definitions and canvas sizing.
- `src/renderer/panels/registry.ts` - Renderer panel registry and lazy component pattern.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` - Closest FlashQuery panel UI, status chip, native menu, document open patterns.
- `src/renderer/panels/FlashQueryVaultPanel.test.tsx` - Current FlashQuery panel component test setup and context-menu assertions.
- `src/renderer/stores/appStore.ts` - Panel creation, dock/canvas placement, title updates.
- `src/shared/electron-api.d.ts` - `flashquerySearch` API type exposed to renderer.
- `e2e/fixtures/flashquery-server.ts` - Deterministic FlashQuery MCP fixture, including search behavior.
- `e2e/flashquery-vault-browse.spec.ts` and `e2e/flashquery-disconnect.spec.ts` - Existing FlashQuery E2E setup and disconnect patterns.
- `src/renderer/lib/e2eHarness.ts` - E2E helpers, including `activatePanel`; Phase 16 may add `createFlashQueryVaultSearch` here for the new panel.
</canonical_refs>

<specifics>
## Specific Ideas

- Add `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` and `src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx`.
- Add panel type `flashqueryVaultSearch` with shared label `Vault Search`, teal/green-adjacent brand colors, and a `MagnifyingGlass` registry icon.
- Use `window.electronAPI.flashquerySearch(workspaceId, params)` from the renderer; preserve main-process validation/security ownership.
- Represent active entity chips as `documents` and `memories`; pass only active entity types.
- Track a monotonically increasing search request ID so late responses cannot replace newer results or disconnected states.
- For document result open actions, call `createEditor(workspaceId, buildVaultUri(workspaceId, fullPath), undefined, { target: 'dock', zone: 'center' })` or `{ target: 'canvas' }`.
- For copy actions, write forward-slash `fullPath` and whole-document reference `{{ref:<fullPath>}}` through `navigator.clipboard.writeText`.
- For reveal action, either route to the existing vault tree reveal affordance if present or implement a minimal store/e2e handoff that Phase 20 can reuse.
- Verify `e2e/fixtures/flashquery-server.spec.ts` with `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts`; the repo's Vitest include pattern does not discover E2E fixture specs.
</specifics>

<deferred>
## Deferred Ideas

- Vault tree and editor-title clipboard utilities are Phase 20 except where Phase 16 search-row actions require copy behavior.
- Pi extension, `call_model`, `call_macro`, ToolCards, and `@` mention autocomplete are Phases 17 through 20.
- Full milestone-wide reconnect/workspace-switch hardening is Phase 21.
</deferred>

---

*Phase: 16-vault-search-panel*
*Context gathered: 2026-06-03*
