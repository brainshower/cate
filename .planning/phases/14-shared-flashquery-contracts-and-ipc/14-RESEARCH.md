# Phase 14: Shared FlashQuery Contracts and IPC - Research

## Research Complete

Phase 14 is a contract-widening phase. The current code already has a clean Milestone 1 baseline: shared channel constants, shared FlashQuery connection/vault/document/write types, a preload bridge, typed Electron API declarations, main IPC validation, and `FlashQueryClientManager` methods for `list_vault`, `get_document`, and `write_document`.

## Current Implementation Shape

- `src/shared/ipc-channels.ts` defines seven FlashQuery channels: set connection, probe, list vault, get document, write document, retry, and status.
- `src/shared/types.ts` defines `FlashQueryVaultEntry`, `FlashQueryDocumentBody`, and `FlashQueryWriteResult`; there are no search, vault-index, document-part, get-options, or write-payload object types yet.
- `src/shared/flashqueryUri.ts` currently treats everything after the workspace as vault path text. Query strings are not parsed, so `?part=frontmatter` would currently become part of `vaultPath`.
- `src/preload/index.ts` exposes `flashqueryGetDocument(workspaceId, vaultPath)` and `flashqueryWriteDocument(workspaceId, vaultPath, content)`.
- `src/shared/electron-api.d.ts` mirrors the body-only preload contract.
- `src/main/ipc/flashquery.ts` currently validates workspace/vault path strings, validates string content only, and registers six invoke handlers.
- `src/main/flashquery/clientManager.ts` calls MCP tools `list_vault`, `get_document`, and `write_document`, parses JSON text content, handles error envelopes, redacts tokens, and transitions status to disconnected on list failures.

## Required Contract Additions

1. Document parts:
   - `FlashQueryDocumentPart = 'body' | 'frontmatter'`
   - `flashquery:getDocument(workspaceId, vaultPath, options?: { include?: FlashQueryDocumentPart[] })`
   - Default include remains `['body']`.
   - `FlashQueryDocumentBody` keeps `body` for compatibility and adds optional `frontmatter`.

2. Write payload:
   - `FlashQueryWritePayload = string | { content?: string; frontmatter?: Record<string, unknown>; tags?: string[] }`
   - Legacy string writes map to current body-only `content`.
   - Object writes validate at least one provided write field.
   - Managed frontmatter fields are filtered before FlashQuery writes.

3. Search:
   - Channel constant `FLASHQUERY_SEARCH = 'flashquery:search'`.
   - API method `flashquerySearch(workspaceId, params)`.
   - Params include `query`, `mode`, `entity_types`, `limit`, and `include_archived: true`.
   - Modes are `filesystem`, `mixed`, and `semantic`.
   - Empty filesystem/mixed query maps to list-all semantics.
   - Empty semantic query is rejected before dispatch.

4. Vault index:
   - Channel constant `FLASHQUERY_LIST_VAULT_INDEX = 'flashquery:list-vault-index'`.
   - API method `flashqueryListVaultIndex(workspaceId)`.
   - Result entries normalize to `{ filename, fullPath }`.

## Existing Test Anchors

- `src/shared/ipc-channels.test.ts` already verifies exact FlashQuery channel strings and collision freedom for T-U-002; it must be updated for the two new channels.
- `src/shared/flashqueryUri.test.ts` already covers default/body URI behavior and malformed escapes; it must add `?part=body`, `?part=frontmatter`, encoded paths with query separators, and invalid part cases for T-U-001.
- `src/main/flashquery/clientManager.test.ts` has MCP client fixtures and transport redaction tests; it is the best place for T-U-003, manager-side write normalization, search/list-index normalization, and disconnected handling.
- `src/main/ipc/flashquery.test.ts` already mocks `FlashQueryClientManager` and handler registration; it is the best place for renderer input validation, new channel registration, search param validation, and safe error responses.
- `src/shared/electron-api.d.ts` and `src/preload/index.ts` currently have no dedicated preload contract test for these methods, so T-U-002 should cover them by source assertions or a focused preload test if one already exists.

## Validation Architecture

Phase 14 validation should be fast and unit-heavy:

- Shared contract tests:
  - `npm test -- src/shared/ipc-channels.test.ts src/shared/flashqueryUri.test.ts src/shared/types.test.ts`
- Main FlashQuery tests:
  - `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts`
- Typed contract proof:
  - `npm run typecheck`

Sampling:

- Run focused shared tests after Plan 14.1.
- Run focused manager tests after Plan 14.2.
- Run focused IPC tests after Plan 14.3.
- Run `npm run typecheck` at the end of every plan and before phase verification.

## Risks And Pitfalls

- Query parsing can accidentally treat `?part=frontmatter` as a literal path segment. T-U-001 must catch this.
- Widening `FlashQueryDocumentBody.body` from required to optional could break existing body editor code. Prefer preserving required `body: string` in the shared type while returning an empty string only where the renderer expects body compatibility, or introduce a separate response type if needed.
- Search result shapes may vary by FlashQuery server version. Normalize defensively and return empty arrays plus safe error text where appropriate.
- IPC validation should reject malformed renderer inputs before calling manager methods.
- Token redaction must be preserved in every new error path.

## Research Complete

The implementation path is clear enough for planning. No external web research is required because the source-of-truth behavior is captured in the supplied Milestone 2 requirements and test plan.
