# Phase 15: Editor Refresh and Frontmatter Panels - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning
**Source:** Product source docs supplied by project owner

<domain>
## Phase Boundary

Phase 15 adds manual refresh for open FlashQuery body editor tabs and adds independent frontmatter editor tabs on top of the Phase 14 widened FlashQuery document contracts.

This phase owns renderer/store/editor behavior for REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, and REQ-007. It must preserve existing local-file editor behavior and existing Milestone 1 body editing behavior. It must not build the Vault Search panel, Pi extension, `@` mention autocomplete, ToolCard observability, or clipboard utilities.
</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Documents
- D-01 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` before touching Phase 15 source.
- D-02 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` before touching Phase 15 tests.
- D-03 [locked]: The product documents above are the primary source for REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007, T-U-001, T-U-007, T-U-008, T-U-009, T-E-001, and T-E-002.

### Phase 14 Dependency
- D-04 [locked]: Phase 15 builds on Phase 14 shared contracts: `parseVaultUri` returns `part: 'body' | 'frontmatter'`, `buildVaultUri` can produce `?part=frontmatter`, `flashqueryGetDocument` accepts include options, and `flashqueryWriteDocument` accepts legacy strings or object payloads.
- D-05 [locked]: Phase 15 implementation agents MUST read `.planning/phases/14-shared-flashquery-contracts-and-ipc/14-03-SUMMARY.md` before implementation to understand the current get/write IPC guarantees.
- D-05A [locked]: The Phase 14 gap-fix commit `bc62807` changed `FlashQueryClientManager.writeDocument` so managed-only frontmatter writes return `{ success: true, modified: '' }` without calling MCP. Phase 15 must preserve this no-hard-error behavior.

### Refresh Behavior
- D-06 [locked]: Refresh action is visible only for FlashQuery body editors, not local-file editors and not frontmatter editors.
- D-07 [locked]: Clean refresh calls `flashqueryGetDocument(workspaceId, vaultPath, { include: ['body'] })`, replaces only the current body editor model content, preserves Monaco view state, clears body dirty state, and ignores duplicate clicks while in flight.
- D-08 [locked]: Dirty refresh opens the exact modal title `Unsaved changes`, subtitle `<filename> has unsaved edits. Refreshing from the vault will replace the editor contents.`, and actions `Save and refresh`, `Discard and refresh`, and `Cancel`.
- D-09 [locked]: `Save and refresh` saves current body edits first, then fetches latest content; `Discard and refresh` fetches latest content without saving current edits; `Cancel` leaves model content and dirty state unchanged.
- D-10 [locked]: Disconnected, unreachable, not-found, and request-failure refreshes preserve current model content and dirty state and surface an inline error.

### Frontmatter Behavior
- D-11 [locked]: Frontmatter editor URI shape is `flashquery://<workspace>/<vaultPath>?part=frontmatter`.
- D-12 [locked]: Opening frontmatter from a docked body tab creates a sibling dock tab in the same stack where feasible; opening from a floating/canvas body panel creates an adjacent sibling canvas panel.
- D-13 [locked]: Frontmatter editor tabs use Monaco YAML language, a distinct title, independent model cache key, independent dirty state, independent undo stack, independent view state, independent save error state, and independent save operation.
- D-14 [locked]: Body saves call `flashqueryWriteDocument(workspaceId, vaultPath, content)` or an equivalent object payload that writes only body content; frontmatter saves call `flashqueryWriteDocument(workspaceId, vaultPath, { frontmatter })`.
- D-15 [locked]: Empty frontmatter opens as empty YAML and first save creates frontmatter.
- D-16 [locked]: Invalid YAML blocks save and shows an inline parse error.
- D-17 [locked]: FlashQuery-managed fields are filtered before writeback and managed-field edits do not produce a hard user-facing error. If renderer-side filtering removes every frontmatter key, Phase 15 must either skip IPC and clear the managed-only dirty state intentionally, or send the unfiltered object to the existing manager no-op path; it must not send `{ frontmatter: {} }` and surface an empty-payload error.
- D-18 [locked]: Cate does not promise YAML comment, key order, or quoting preservation.

### The Agent's Discretion
- The exact helper names for YAML serialization, refresh state, and modal state are implementation details.
- The exact icon for refresh/frontmatter title actions may follow the existing icon library used in the touched renderer component, as long as tests assert behavior and accessible names rather than decorative implementation.
- The implementation may add focused renderer helper modules if doing so keeps `EditorPanel.tsx` testable.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Sources
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Source of truth for REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, and REQ-007.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Source of truth for T-U-001, T-U-007, T-U-008, T-U-009, T-E-001, and T-E-002.

### Cate Planning Sources
- `.planning/REQUIREMENTS.md` - Cate v1.2 requirement index and traceability.
- `.planning/ROADMAP.md` - Phase 15 goal, success criteria, and mapped requirement IDs.
- `.planning/STATE.md` - Current milestone state and decision history.
- `.planning/phases/14-shared-flashquery-contracts-and-ipc/14-03-SUMMARY.md` - Phase 14 get/write IPC contract closeout.

### Current Code Sources
- `src/shared/flashqueryUri.ts` - Current body/frontmatter URI parser and builder.
- `src/shared/types.ts` - Current FlashQuery document/write payload and managed-frontmatter field types.
- `src/renderer/stores/appStore.ts` - Current editor panel creation and placement logic.
- `src/renderer/stores/dockStore.ts` - Current dock tab insertion/split placement primitives.
- `src/renderer/panels/EditorPanel.tsx` - Current Monaco load/save/dirty/preview behavior.
- `src/renderer/docking/DockTabBar.tsx` - Current FlashQuery editor tab chrome.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` - Current vault-tree open behavior.
- `e2e/fixtures/flashquery-server.ts` - Current deterministic FlashQuery MCP fixture server.
</canonical_refs>

<specifics>
## Specific Ideas

- Add an `openFlashQueryFrontmatterEditor` store action or similarly named helper that derives a frontmatter URI from a body URI and routes placement from the current body editor location.
- Add editor title action buttons for refresh and frontmatter only when `parseVaultUri(filePath)?.part === 'body'`.
- Use the Phase 14 object write payload for frontmatter saves: `{ frontmatter: parsedYamlObject }`. Preserve Phase 14's managed-only no-op semantics.
- Keep model cache keys as full URI strings so `flashquery://workspace/Doc.md` and `flashquery://workspace/Doc.md?part=frontmatter` cannot share a model.
- Extend the E2E FlashQuery stub so `get_document` can return body/frontmatter when include is requested and `write_document` can update either content or frontmatter.
</specifics>

<deferred>
## Deferred Ideas

- Vault Search panel UI, grouping, result actions, and pagination are Phase 16.
- Pi extension, tool registration, `call_model`, `call_macro`, ToolCards, and `@` autocomplete are Phases 17 through 20.
- Cross-surface hardening across editor, search, and Pi chat is Phase 21.
</deferred>

---

*Phase: 15-editor-refresh-and-frontmatter-panels*
*Context gathered: 2026-06-03*
