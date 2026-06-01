# Phase 10 Security And Session Evidence

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

## Token Boundary

Bearer tokens remain main-process only.

- `src/shared/types.ts` defines `FlashQueryConnection` with optional bearer auth, and `sanitizeFlashQueryConnection()` returns only `{ transport, url }`.
- `src/renderer/lib/session.ts` sanitizes `flashqueryConnection` when building `.cate/workspace.json`, building session snapshots, restoring project files, and migrating legacy snapshots.
- `src/main/projectWorkspaceStore.ts` sanitizes FlashQuery metadata when loading project-local workspace files and converting snapshots.
- `src/main/flashquery/credentials.ts` stores raw tokens in the main-process `electron-store` token namespace only.

Evidence:

- `src/shared/types.test.ts` covers `T-U-004` and the explicit `T-U-009` shape assertion for `WorkspaceInfo`, `WorkspaceState`, `SessionSnapshot`, and `ProjectWorkspaceFile`.
- `src/renderer/lib/session.test.ts` covers `T-U-008` using the generated pre-merge fixtures and asserts no `premerge-secret-token` or `auth` key leaks into the restored snapshot.
- `src/main/flashquery/credentials.test.ts` covers token storage, deletion, failure propagation, and workspace isolation.

## Session Compatibility

Pre-merge workspace/session fixtures are present at:

- `src/renderer/lib/__fixtures__/premerge-workspace.json`
- `src/renderer/lib/__fixtures__/premerge-session.json`
- `src/renderer/lib/__fixtures__/premerge-workspace.source.md`

`src/renderer/lib/session.test.ts` loads those fixtures through `projectFilesToSnapshot()` and proves the restored FlashQuery connection is sanitized metadata:

```text
{ transport: 'http', url: 'https://premerge.flashquery.local/mcp' }
```

The fixture source note ties the data to the pre-merge fork parent `318214f^1`.

## Public Probe And Private MCP Auth

`src/main/ipc/flashquery.ts` preserves the required split:

- Public reachability probe: `GET /mcp/info`, no `Authorization` header.
- Private MCP handshake: `POST /mcp` through `StreamableHTTPClientTransport`, with `Authorization: Bearer <token>` when a non-empty token is provided.
- Auth failures from the private handshake are surfaced as token-specific 401 errors.

Evidence:

- `src/main/ipc/flashquery.test.ts` asserts `/mcp/info` request shape, bearer header use for private calls, no workspace persistence during probe, and token redaction in failures (`T-U-005` / `REQ-006`).

## Supporting Body-Only Write Coverage

Phase 10 does not expand scope to `REQ-007`; body-only write remains supporting coverage for the protected contract set.

Evidence:

- `src/renderer/panels/EditorPanel.test.tsx` asserts vault saves call `flashqueryWriteDocument(workspaceId, vaultPath, content)` with exactly three arguments.
- `src/main/ipc/flashquery.test.ts` asserts the main IPC write handler forwards exactly `workspaceId`, `vaultPath`, and `content` to the client manager.
- `src/renderer/panels/EditorPanel.tsx` calls `window.electronAPI.flashqueryWriteDocument(vaultParts.workspaceId, vaultParts.vaultPath, value)` without create-mode flags, frontmatter, or version tokens.

## Commands

| Command | Result |
|---------|--------|
| `npm test -- src/shared/types.test.ts src/main/flashquery/credentials.test.ts src/renderer/lib/session.test.ts src/main/ipc/flashquery.test.ts src/renderer/panels/EditorPanel.test.tsx` | Pass, 5 files / 45 tests |
| `rg -n "sanitizeFlashQueryConnection|flashqueryConnection|auth\\.token|premerge|/mcp/info|Authorization|Bearer|401|token rejected|flashqueryWriteDocument|writeDocument" ...` | Pass, expected implementation and test anchors present |

## Result

Status: Passed.

No unresolved security/session gaps remain for `REQ-005`, `REQ-006`, `REQ-009`, `REQ-024`, or `REQ-025`. Body-only write coverage remains documented as supporting `T-U-006` evidence only.
