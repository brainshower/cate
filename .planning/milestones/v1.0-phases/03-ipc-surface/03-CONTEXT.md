# Phase 3: IPC Surface - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 3 exposes the typed renderer-to-main FlashQuery API that later UI and editor phases consume. It adds shared `flashquery:*` channel constants, preload bridge methods, `ElectronAPI` declarations, a main-process FlashQuery IPC module, and registration from Cate startup. It also wires manager status transitions into main-to-renderer broadcasts.

This phase owns connection mutation and vault tool IPC behavior: set or clear a workspace connection, list vault entries, read an existing document body, write an existing document body, and broadcast status. It does not build the vault panel, shared chip, settings dialog, workspace menu entry, editor URI routing, editor badge, E2E harness, or visual checks.

</domain>

<decisions>
## Implementation Decisions

### Source Authority
- **D-01:** Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 3. These docs are the primary source for REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, and tests T-U-040..050, T-I-001..014, T-U-099..101.
- **D-02:** If local planning docs, roadmap rows, or code comments appear ambiguous, agents must re-read the external requirements and test-plan docs before asking the user.
- **D-03:** No additional user discussion is needed before planning Phase 3. The product docs lock the WHAT, handler signatures, safe return shapes, and test coverage.

### Scope Boundaries
- **D-04:** Implement only the IPC surface for REQ-007, REQ-008, REQ-009, REQ-010, renderer-broadcast REQ-011, and Phase 3 ownership of REQ-012.
- **D-05:** Do not implement Phase 4/5/6 UI/editor work in this phase: no vault panel, chip, dialog, workspace menu item, editor URI routing, editor badge, or visual checks.
- **D-06:** Preserve the invariant that the renderer never instantiates or calls MCP client code directly. Renderer code calls only the preload API; main owns FlashQuery I/O.
- **D-07:** Keep FlashQuery runtime ownership outside Cate. Cate calls the configured HTTP MCP endpoint; it must not start FlashQuery, manage Supabase, inspect vault files, or duplicate FlashQuery storage behavior.

### IPC Contract
- **D-08:** Add shared constants for `flashquery:setConnection`, `flashquery:listVault`, `flashquery:getDocument`, `flashquery:writeDocument`, and `flashquery:status`.
- **D-09:** Add preload invoke methods for set/list/get/write and an `onFlashQueryStatus` subscription helper that returns an unsubscribe function.
- **D-10:** Add matching `ElectronAPI` types and serializable result types for vault entries, document reads, writes, and status payloads.
- **D-11:** Add `src/main/ipc/flashquery.ts` with a `registerHandlers()` style entry point and register it from `registerCriticalHandlers()` near workspace handlers.

### Connection Mutation And Status
- **D-12:** `flashquery:setConnection(workspaceId, connection)` validates the workspace ID through existing workspace mutation behavior and validates non-null connection URLs as parseable `http:` or `https:`.
- **D-13:** Non-null connection updates workspace metadata via the existing workspace manager path so token storage and metadata sanitization stay centralized.
- **D-14:** Clearing a connection uses the same workspace manager path with `flashqueryConnection: undefined`, clears the token, and disposes manager state.
- **D-15:** Replacing a connection disposes stale manager state before a new probe/client state can be used.
- **D-16:** Status changes from `FlashQueryClientManager.subscribe(workspaceId, 'status', handler)` map to `flashquery:status` broadcasts with `{ workspaceId, status, error? }`.
- **D-17:** Broadcasts use `windowRegistry.broadcastToAll`, not direct BrowserWindow loops inside the FlashQuery IPC module.
- **D-18:** On clear, prefer a deterministic disconnected/no-connection broadcast so all renderer windows converge immediately. Product docs permit this choice.

### Vault Tool Calls
- **D-19:** `flashquery:listVault(workspaceId, vaultPath?)` returns `{ name, type: 'folder' | 'document', vaultPath, title? }[]`.
- **D-20:** `listVault` returns `[]` for unconfigured or disconnected workspaces and MUST NOT reject for that state.
- **D-21:** `listVault` omits or safely marks per-entry failures and must not throw only because one FlashQuery batch element failed.
- **D-22:** `flashquery:getDocument(workspaceId, vaultPath)` calls `get_document` with `identifiers: vaultPath` and `include: ['body']` exactly.
- **D-23:** `getDocument` MUST NOT request `frontmatter` or `headings`, returns `{ body, version_token, modified }`, and does not retain `version_token` in global state.
- **D-24:** `flashquery:writeDocument(workspaceId, vaultPath, content)` calls `write_document` with `mode: 'update'`, `identifier: vaultPath`, and `content` only.
- **D-25:** `writeDocument` MUST NOT include `frontmatter`, `title`, `tags`, `expected_version`, or `if_match`, and MUST NOT use `mode: 'create'`.
- **D-26:** Write failures return `{ success: false, error }` rather than throwing; get-document failures reject with a descriptive error.

### Dependency And Manager Shape
- **D-27:** If implementing real MCP HTTP calls requires `@modelcontextprotocol/sdk`, add it as an explicit dependency task and verify lockfile changes under a Node version satisfying Cate's `>=20 <23` engine.
- **D-28:** Prefer domain-shaped manager methods (`listVault`, `getDocument`, `writeDocument`) over exposing a generic FlashQuery tool executor through IPC.
- **D-29:** If a custom transport is chosen instead of the SDK, the plan must require tests for initialize/session headers/tool-call behavior and document the protocol risk.

### Testing
- **D-30:** Phase 3 coverage lives primarily in `src/main/ipc/flashquery.test.ts`, with supporting regressions for preload/types/manager/URI helpers where needed.
- **D-31:** Unit tests cover T-U-040..050: channel registration, connection set/clear/replace, invalid URL rejection, exact get/write tool arguments, forbidden key absence, and no create mode.
- **D-32:** Integration-style tests cover T-I-001..014 with mocked manager/MCP responses: list root/folder, disconnected list, partial list failure, get success/error/no retention, write success/failure, and multi-window status broadcasts.
- **D-33:** Verification must include focused FlashQuery IPC tests, Phase 2 manager regression tests, URI helper tests, workspace-manager token/sanitization regressions if touched, and `npm run typecheck`.

### the agent's Discretion
- The planner may choose whether `setConnection` starts an immediate manager probe by calling `connect` or emits `connecting` via a helper before probing, as long as tests prove renderer windows receive the expected status sequence.
- The planner may choose exact response-normalization helpers for MCP tool envelopes, provided renderer-facing results match the product docs and raw MCP content does not leak into UI-facing types.
- The planner may choose whether helper types live in `src/shared/types.ts` or beside the IPC module, provided preload and renderer declarations remain stable and import-safe.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specs
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — Primary requirements source. Read Spec §6.2 and §6.3.1 plus invariants INV-01, INV-02, INV-07, INV-08, INV-10, and INV-12 before implementation.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — Primary test source. Read Test Plan §4.3 and checklist rows for T-U-040..050, T-I-001..014, and T-U-099..101.

### Local Planning Artifacts
- `.planning/PROJECT.md` — Milestone goal, brownfield integration posture, source-of-truth docs, and project constraints.
- `.planning/REQUIREMENTS.md` — Local milestone requirement summary and traceability table.
- `.planning/ROADMAP.md` — Phase 3 boundary, success criteria, and plan breakdown.
- `.planning/STATE.md` — Confirms Phase 2 complete and Phase 3 next.
- `.planning/phases/02-connection-layer/02-VERIFICATION.md` — Verifies Phase 2 manager status behavior that Phase 3 consumes.
- `.planning/phases/02-connection-layer/02-CONTEXT.md` — Locked decisions from manager-side status/retry work.
- `.planning/phases/03-ipc-surface/03-RESEARCH.md` — Phase 3 research and pattern findings.

### Codebase Maps And Existing Code
- `.planning/codebase/ARCHITECTURE.md` — Electron layering, main/preload/renderer separation, shared contracts, workspace metadata sync, and IPC boundaries.
- `.planning/codebase/TESTING.md` — Vitest locations, Electron mocking patterns, focused run commands, and jsdom/node split.
- `src/shared/ipc-channels.ts` — Channel constants pattern.
- `src/preload/index.ts` — Preload invoke/subscription pattern.
- `src/shared/electron-api.d.ts` — Renderer-facing API declaration pattern.
- `src/main/index.ts` — Critical/deferred handler registration points.
- `src/main/ipc/filesystem.ts` — Main-process IPC handler module pattern.
- `src/main/windowRegistry.ts` — Cross-window broadcast helper.
- `src/main/workspaceManager.ts` — Workspace metadata mutation, token storage, sanitization, and workspace-change broadcast.
- `src/main/flashquery/clientManager.ts` — Phase 2 manager status, retry, subscription, and probe behavior.
- `src/main/flashquery/credentials.ts` — Token storage helper boundary.
- `src/main/flashquery/uri.ts` — Canonical `flashquery://` URI helpers.

</canonical_refs>

<specifics>
## Specific Ideas

- User specifically directed that downstream agents should refer first to the external requirements and test-plan docs before asking implementation questions.
- Phase 3 should be split into three executable plans: contract/registration, connection/status, and vault list/read/write.
- The research pass recommends `broadcastToAll(FLASHQUERY_STATUS, payload)` for status fanout and warns against duplicate token writes because `workspaceManager.updateWorkspace()` already owns token storage/clearing when `flashqueryConnection` changes.
- `@modelcontextprotocol/sdk` is not currently in Cate. If real MCP calls land in Phase 3 through the SDK, dependency installation and lockfile review must be explicit.
- Local npm research ran under Node 24 and hit Cate's engine warning; dependency/lockfile work should run under Node 20 or 22.

</specifics>

<deferred>
## Deferred Ideas

- Vault panel, shared chip primitive, row interactions, refresh UX, and panel states belong to Phase 4.
- Settings dialog and workspace context-menu entry belong to Phase 5.
- Editor URI routing, save routing, diff guardrails, dirty-state behavior, and vault badge belong to Phase 6.
- Existing E2E regression, FlashQuery E2E harness, and manual/design checks belong to Phase 7.
- Live vault-change notifications, SSE subscription, conflict detection, OAuth, refresh-token rotation, keychain migration, stdio transport, and vault document creation remain outside v1 or outside this phase.

</deferred>

---

*Phase: 3-IPC Surface*
*Context gathered: 2026-05-29*
