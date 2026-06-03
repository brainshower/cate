# Phase 14: Shared FlashQuery Contracts and IPC - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning
**Source:** Product source docs supplied by project owner

<domain>
## Phase Boundary

Phase 14 establishes the widened FlashQuery document, search, and vault-index contract surface across Cate shared types, URI helpers, preload, typed Electron API, main IPC handlers, and `FlashQueryClientManager`.

This phase is the contract foundation for later Milestone 2 editor, search panel, Pi reference, and degradation work. It must not build the search panel, frontmatter editor UI, Pi extension, ToolCards, or clipboard UX.
</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Documents
- D-01 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` before touching Phase 14 source.
- D-02 [locked]: Every downstream implementation agent MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` before touching Phase 14 tests.
- D-03 [locked]: The product documents above are higher priority than memory or ad hoc assumptions for `REQ-004`, `T-U-001`, `T-U-002`, `T-U-003`, `T-U-004`, `T-U-005`, and `T-U-006`.

### Contract Scope
- D-04 [locked]: `flashquery:getDocument` accepts optional include semantics for `body` and `frontmatter`.
- D-05 [locked]: `flashquery:getDocument` continues to support the existing body-only call shape used by Milestone 1 renderer code.
- D-06 [locked]: `flashquery:writeDocument` accepts the existing legacy string body argument.
- D-07 [locked]: `flashquery:writeDocument` also accepts an object payload with `{ content?: string; frontmatter?: Record<string, unknown>; tags?: string[] }`.
- D-08 [locked]: Main-process code validates renderer payloads before calling FlashQuery.
- D-09 [locked]: `flashquery:search` and `flashquery:list-vault-index` are added to channel constants, preload API, Electron API typings, and main handlers.
- D-10 [locked]: Search validation covers modes `filesystem`, `mixed`, and `semantic`; entity types `documents` and `memories`; positive integer limits; empty semantic dispatch; disconnected state; and safe error responses.
- D-11 [locked]: Vault-index responses normalize to `{ filename, fullPath }` entries with forward-slash paths.

### Compatibility And Safety
- D-12 [locked]: Existing Milestone 1 body editor behavior remains compatible: existing renderer calls to `flashqueryGetDocument(workspaceId, vaultPath)` and `flashqueryWriteDocument(workspaceId, vaultPath, stringContent)` keep working.
- D-13 [locked]: FlashQuery bearer tokens must never be exposed to renderer code or included in errors.
- D-14 [locked]: Renderer code performs FlashQuery work only through main/preload IPC.
- D-15 [locked]: Phase 14 should add focused unit coverage for T-U-001 through T-U-006 and should not wait for later UI phases to prove shared contracts.

### The Agent's Discretion
- The exact internal helper names for validation and normalization are implementation details.
- The exact shape of normalized search result metadata may include optional fields if they are useful for later phases, as long as document and memory grouping remains type-safe and token-safe.
- The executor may centralize FlashQuery managed frontmatter field filtering in shared code or main IPC code, but T-U-004 must prove managed fields are filtered before FlashQuery writes.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Sources
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Source of truth for REQ-004 and Phase 14 contract acceptance.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Source of truth for T-U-001 through T-U-006.

### Cate Planning Sources
- `.planning/REQUIREMENTS.md` - Cate v1.2 requirement index and traceability.
- `.planning/ROADMAP.md` - Phase 14 goal, success criteria, and mapped requirement IDs.
- `.planning/STATE.md` - Current milestone state and decision history.

### Current Code Contract Sources
- `src/shared/ipc-channels.ts` - Current FlashQuery IPC channel constants.
- `src/shared/types.ts` - Current shared FlashQuery types.
- `src/shared/flashqueryUri.ts` - Current FlashQuery URI builder/parser.
- `src/main/flashquery/clientManager.ts` - Current MCP tool client and FlashQuery list/get/write normalization.
- `src/main/ipc/flashquery.ts` - Current renderer input validation and handler registration.
- `src/preload/index.ts` - Current preload bridge.
- `src/shared/electron-api.d.ts` - Current typed renderer API.
</canonical_refs>

<specifics>
## Specific Ideas

- Add shared types for `FlashQueryDocumentPart`, get-document options, write payloads, search params/results, and vault-index entries.
- Extend `buildVaultUri` and `parseVaultUri` so `?part=body` and `?part=frontmatter` are explicit document parts while the default remains `body`.
- Add channel constants for `flashquery:search` and `flashquery:list-vault-index`.
- Keep the legacy write path exactly usable from `EditorPanel`.
- Normalize FlashQuery `get_document` responses even when only one of body/frontmatter is requested.
- Treat empty filesystem/mixed search as list-all, but reject empty semantic search before dispatch.
- Return safe failure shapes for search and vault-index so later renderer surfaces can display disconnected and request-failure states without stale data.
</specifics>

<deferred>
## Deferred Ideas

- Refresh button, dirty-refresh modal, and frontmatter editor UI are Phase 15.
- Vault Search panel UI, grouping, result actions, and pagination are Phase 16.
- Pi extension, tool registration, `call_model`, `call_macro`, ToolCards, and `@` autocomplete are Phases 17 through 20.
- Cross-surface hardening and full E2E degradation coverage are Phase 21.
</deferred>

---

*Phase: 14-shared-flashquery-contracts-and-ipc*
*Context gathered: 2026-06-03*
