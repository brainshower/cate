# Phase 20: Pi `@` Mentions and Clipboard Utilities - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning
**Source:** Product-doc express path from user-supplied Milestone 2 requirements and test plan

<domain>
## Phase Boundary

Phase 20 implements `REQ-018` and `REQ-019`: Pi chat `@` mention autocomplete for FlashQuery vault documents, backed by a workspace-scoped vault-index cache, plus copy actions for forward-slash vault paths and whole-document `{{ref:path.md}}` references across vault tree rows, search document rows, and FlashQuery editor title actions.

This phase must stay inside existing Cate surfaces: `AgentChatInput`/agent store, existing FlashQuery IPC/preload contracts, existing vault tree/search panels, and existing editor title actions. It must not add rich-input chips, chat footer buttons/pills, section anchors, markdown-link reference variants, a Cate macro launcher, a FlashQuery Pi provider, or automatic push-driven cache invalidation for external vault changes.
</domain>

<decisions>
## Implementation Decisions

### Source Priority
- D-01: Downstream research, planning, implementation, verification, and review agents MUST read the product requirements and test plan listed in `<canonical_refs>` before answering scope questions, editing code, deciding acceptance coverage, or evaluating completion.
- D-02: The Milestone 2 requirements document is the product source of truth for `REQ-018` and `REQ-019` behavior.
- D-03: The Milestone 2 test plan is the source of truth for targeted test IDs and coverage expectations.
- D-04: FlashQuery roadmap companion material is traceability only, not Cate implementation scope.

### Pi `@` Mention Behavior
- D-05: Implement `@` mention detection in `src/agent/renderer/AgentChatInput.tsx` near the existing slash-command popover pattern.
- D-06: Use the existing portal pattern for the dropdown; it appears above the textarea.
- D-07: Add no new footer buttons, footer pills, rich-input chips, or document-reference chips.
- D-08: The selected document is inserted as plain literal text `{{ref:<fullPath>}}`.
- D-09: The active mention segment is `@<filter>` near the cursor; cursor movement before that segment dismisses the popover.
- D-10: Matching filters by case-insensitive substring on `filename` only.
- D-11: Matching sorts alphabetically by `fullPath`.
- D-12: Rows show both `filename` and `fullPath`.
- D-13: `ArrowUp` and `ArrowDown` move selection; `Enter` and `Tab` accept; `Esc` dismisses.
- D-14: No-match plus space-without-pick keeps the literal `@` text and dismisses.
- D-15: Loading state text is exactly `Loading vault...`.
- D-16: If a typing-time visual highlight is added for the active `@<filter>` segment, it must drop on dismiss, pick, or literal fallback.

### Vault-Index Cache
- D-17: Store vault-index cache in `agentStore.ts` with shape `Array<{ filename: string; fullPath: string }>` plus loading state.
- D-18: Populate the cache on workspace connect, workspace switch, and reconnect via `flashquery:list-vault-index`.
- D-19: Refresh the cache after vault tree refresh, successful `flashquery:writeDocument`, and successful extension-dispatched mutating FlashQuery document tools.
- D-20: Clear the cache on disconnect or connection loss.
- D-21: Cache updates are whole-response replacements only; do not implement incremental per-document patching.
- D-22: Cache refreshes use last-fetch-wins race handling: newer requests may supersede older in-flight requests, and older late responses must be discarded.
- D-23: Loading state must not flicker when overlapping refreshes occur.
- D-24: Automatic invalidation for external vault changes is out of scope; manual vault refresh is the user-visible recovery trigger until FlashQuery push notifications exist.

### Clipboard Utilities
- D-25: Vault tree document context menu adds `Copy vault path` and `Copy as reference`.
- D-26: Search document context menu includes `Copy vault path` and `Copy as reference`.
- D-27: FlashQuery editor title action row includes a Phosphor `Clipboard` action visible only for `flashquery:` editors.
- D-28: The editor title Clipboard action opens a menu with `Copy vault path` and `Copy as reference`.
- D-29: Vault paths use forward slashes.
- D-30: References use whole-document shape `{{ref:path.md}}`.
- D-31: Do not add section anchors, block references, or markdown-link variants.
- D-32: Memory search rows do not add a formal context menu.

### Tests And Evidence
- D-33: `T-U-006` must cover vault-index IPC return shape, forward-slash normalization/sorting, disconnect behavior, and stale-result clearing on workspace changes.
- D-34: `T-U-020` must cover `AgentChatInput` active `@` segment detection, loading/matches/no literal behavior, filename-only filtering, full-path sorting, keyboard accept/dismiss, literal insertion, slash-command non-conflict, optional typing highlight lifecycle, no chips, and no footer additions.
- D-35: `T-E-004` must populate fixture vault index, exercise Pi chat `@` insertion, verify literal reference insertion, workspace-switch cache replacement, disconnect cache clearing, and no extra footer UI.
- D-36: `T-U-011` and `T-U-012` must cover search row, vault tree, and editor-title path/reference copy actions.
- D-37: `T-E-003` already covers search document row clipboard behavior; preserve and extend it only where Phase 20 scope requires.
- D-38: `T-M-004` must record native macOS clipboard verification for vault tree, search row, and editor title actions, and confirm no section-anchor or markdown-link variants appear.

### the agent's Discretion
- D-39: The exact helper/module split for vault-index cache refresh orchestration is at the implementation agent's discretion, provided workspace scoping, lifecycle triggers, and last-fetch-wins behavior are testable.
- D-40: The exact styling details for the mention dropdown should follow current Cate/Pi chat popover styling and semantic tokens.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Defines `REQ-018`, `REQ-019`, the `@` mention cache lifecycle, literal reference insertion, copy utility scope, and out-of-scope boundaries.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Defines `T-U-006`, `T-U-011`, `T-U-012`, `T-U-020`, `T-E-003`, `T-E-004`, `T-E-007`, and `T-M-004`.

### Cate Planning Context
- `.planning/ROADMAP.md` - Phase 20 goal, requirement mapping, and success criteria.
- `.planning/REQUIREMENTS.md` - v1.2 requirement traceability preserving product `REQ-###` IDs.
- `.planning/STATE.md` - Current milestone state and latest handoff notes.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-03-SUMMARY.md` - Workspace-generation FlashQuery lifecycle, metadata refresh, stale-tool ownership, and Phase 20 handoff notes.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-03-SUMMARY.md` - Renderer/session FlashQuery diagnostics preservation and E2E harness patterns.
- `.planning/phases/19-pi-toolcard-observability-rendering/19-CONTEXT.md` - Locked no-new-chat-message/no-standalone-FlashQuery-chat decisions to preserve in Phase 20.
- `.planning/phases/19-pi-toolcard-observability-rendering/19-PATTERNS.md` - Current `ChatThread`/agent renderer pattern map and E2E harness notes.
- `.planning/phases/19-pi-toolcard-observability-rendering/19-02-SUMMARY.md` - Latest AgentPanel/ToolCard E2E harness behavior and manual evidence conventions.

### Expected Code Areas
- `src/agent/renderer/AgentChatInput.tsx` - Existing slash-command popover and portal pattern; target for `@` mention UI.
- `src/agent/renderer/agentStore.ts` - Existing Pi message/tool state; likely owner for workspace-scoped vault-index cache.
- `src/shared/ipc-channels.ts`, `src/shared/types.ts`, `src/preload/index.ts`, and `src/shared/electron-api.d.ts` - Existing `flashquery:list-vault-index` contracts to preserve and use.
- `src/main/ipc/flashquery.ts` and `src/main/flashquery/clientManager.ts` - Vault-index IPC implementation and disconnect/error behavior.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` - Vault tree refresh and document context-menu actions.
- `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` - Existing search document row context-menu copy behavior.
- `src/renderer/panels/EditorPanel.tsx` and dock/title action components that render FlashQuery editor actions - Target for the editor title Clipboard menu.
- `e2e/fixtures/flashquery-server.ts`, `e2e/flashquery-vault-search.spec.ts`, and `src/renderer/lib/e2eHarness.ts` - Fixture and E2E harnesses to extend for `T-E-004`/clipboard evidence.
</canonical_refs>

<specifics>
## Specific Ideas

- `flashquery:list-vault-index` already exists in shared IPC constants and current tests; executors should verify the current contract and reuse it rather than adding a new channel.
- Existing `FlashQueryVaultSearchPanel` tests already assert search document `Copy as reference` writes `{{ref:Docs/Plan.md}}`; Phase 20 should preserve this behavior while adding missing vault-tree/editor-title surfaces.
- `AgentChatInput.tsx` already has more than one `useNodePortalTarget` usage for popovers; the `@` mention dropdown should reuse that interaction shape.
- The cache should be workspace-scoped and reset before/while switching workspaces so old-workspace filenames are not offered in the new workspace.
- Extension-dispatched mutating document tools should trigger a whole cache refresh only after successful mutation, not on failed tool calls.
- Clipboard actions should use `navigator.clipboard.writeText` in renderer context where surrounding surfaces already do, and native context menus should preserve the existing `window.electronAPI.showContextMenu` pattern.
</specifics>

<deferred>
## Deferred Ideas

- Cross-surface hardening for every disconnected/reconnect/workspace-switch path across the full milestone is Phase 21, though Phase 20 must implement its own cache clear/reload behavior and targeted tests.
- Push-notification-driven vault cache invalidation is deferred until FlashQuery push notifications exist.
- Rich document-centric AI surfaces, selection palettes, conversation-as-document, section anchors, markdown links, and rich-input reference chips remain out of scope.
</deferred>

---

*Phase: 20-pi-mentions-and-clipboard-utilities*
*Context gathered: 2026-06-04 via product-doc express path*
