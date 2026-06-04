# Phase 20: Pi `@` Mentions and Clipboard Utilities - Research

**Researched:** 2026-06-04
**Domain:** Electron/React renderer state, FlashQuery IPC, Pi chat composer UX, native context menu clipboard utilities
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- Cross-surface hardening for every disconnected/reconnect/workspace-switch path across the full milestone is Phase 21, though Phase 20 must implement its own cache clear/reload behavior and targeted tests.
- Push-notification-driven vault cache invalidation is deferred until FlashQuery push notifications exist.
- Rich document-centric AI surfaces, selection palettes, conversation-as-document, section anchors, markdown links, and rich-input reference chips remain out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-018 | User can type `@` in Pi chat to autocomplete FlashQuery vault documents and insert literal `{{ref:<fullPath>}}` references from a workspace-scoped vault-index cache. [CITED: Milestone 2 Requirements.md §6.18] | Use existing `flashquery:list-vault-index` IPC, add workspace-scoped cache actions to `src/agent/renderer/agentStore.ts`, and extend `src/agent/renderer/AgentChatInput.tsx` with portal dropdown behavior. [VERIFIED: codebase grep] |
| REQ-019 | User can copy vault paths and whole-document references from vault tree rows, search document rows, and FlashQuery editor title actions. [CITED: Milestone 2 Requirements.md §6.19] | Search row copy actions already exist; vault tree and editor title action gaps remain. [VERIFIED: codebase grep] |
</phase_requirements>

## Summary

Phase 20 should be planned as a renderer-focused integration over existing Cate surfaces, not as a new subsystem. `flashquery:list-vault-index` already exists in shared constants, preload, Electron API typings, main IPC, and `FlashQueryClientManager.listVaultIndex`; it normalizes backslashes to forward slashes and returns `{ filename, fullPath }[]`. [VERIFIED: codebase grep] The missing product behavior is renderer cache ownership and lifecycle orchestration in `agentStore.ts`, plus `AgentChatInput` autocomplete behavior, plus clipboard actions on vault tree and editor title surfaces. [VERIFIED: codebase grep]

The standard implementation should keep all privileged FlashQuery access behind `window.electronAPI.flashqueryListVaultIndex`, `flashqueryWriteDocument`, status events, and native context-menu IPC. [VERIFIED: codebase grep] React portals are appropriate for the mention dropdown because React supports rendering popup/modal content into another DOM node while preserving React tree ownership. [VERIFIED: Context7 /reactjs/react.dev] Zustand store actions are appropriate for async cache refresh and whole-response replacement because the existing agent store already uses typed action methods and immutable state updates. [VERIFIED: codebase grep] [VERIFIED: Context7 /pmndrs/zustand/v5.0.12]

**Primary recommendation:** Plan three implementation tracks: cache/lifecycle in `agentStore.ts` plus call sites, mention UI in `AgentChatInput.tsx`, and clipboard actions in vault tree/editor title chrome, with T-U-006/T-U-020/T-U-012/T-E-004 as the main new verification gates. [VERIFIED: codebase grep] [CITED: Milestone 2 Test Plan.md §4.1, §4.4, §4.8]

## Project Constraints (from AGENTS.md)

- Use existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; do not add a separate backend or UI framework. [CITED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work must go through typed preload APIs and main-process validation. [CITED: AGENTS.md]
- FlashQuery data remains in the configured FlashQuery instance and vault; Cate stores only connection metadata, preferences, and UI/session state. [CITED: AGENTS.md]
- Connection and context behavior must be workspace-aware. [CITED: AGENTS.md]
- Do not break existing agent, terminal, editor, browser, Git, workspace, or layout behavior. [CITED: AGENTS.md]
- Use npm and the existing package-lock workflow; Node must be `>=20 <23`. [CITED: AGENTS.md] [VERIFIED: package.json]
- Use TypeScript strict mode, single quotes, 2-space indentation, and local naming conventions. [CITED: AGENTS.md]
- Tests should be focused: unit/component tests for pure helpers and renderer state, Electron E2E for happy-path UI workflows. [CITED: AGENTS.md]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Vault-index fetch contract | Main process / IPC | Preload bridge | Main owns FlashQuery MCP client access and renderer receives typed results through `window.electronAPI.flashqueryListVaultIndex`. [VERIFIED: codebase grep] |
| Vault-index cache ownership | Renderer agent state | Preload bridge | User decision requires `agentStore.ts` cache state; cache refresh invokes existing preload IPC. [CITED: 20-CONTEXT.md D-17] [VERIFIED: codebase grep] |
| `@` mention detection and keyboard UI | Renderer Pi composer | Renderer agent state | `AgentChatInput.tsx` owns composer text, key handling, and slash popover behavior; cache data should be passed from the agent store/AgentPanel. [VERIFIED: codebase grep] |
| Vault tree copy actions | Renderer panel | Main native menu IPC | Vault tree rows already use `window.electronAPI.showContextMenu`; copy should use `navigator.clipboard.writeText` like search rows. [VERIFIED: codebase grep] |
| Search row copy actions | Renderer panel | Main native menu IPC | Existing `FlashQueryVaultSearchPanel` already shows copy path/reference actions for document rows and writes via `navigator.clipboard.writeText`. [VERIFIED: codebase grep] |
| Editor title copy action | Renderer editor chrome | Main native menu IPC | `EditorPanel.tsx` already renders FlashQuery title action row; add a Phosphor `Clipboard` button and menu only for FlashQuery editors. [VERIFIED: codebase grep] |
| E2E fixtures | Test harness | FlashQuery stub server | Existing fixture server implements `search` and can populate vault index through list-all filesystem search. [VERIFIED: codebase grep] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React / React DOM | 18.3.1 installed; latest registry 19.2.7 as of 2026-06-03. [VERIFIED: package.json] [VERIFIED: npm registry] | Renderer components and `createPortal` dropdown rendering. [VERIFIED: codebase grep] | Existing Cate renderer stack; do not upgrade in this phase. [CITED: AGENTS.md] |
| Zustand | 5.0.12 installed; latest registry 5.0.14 as of 2026-05-28. [VERIFIED: package.json] [VERIFIED: npm registry] | `agentStore.ts` cache state and actions. [VERIFIED: codebase grep] | Existing agent/app store pattern. [VERIFIED: codebase grep] |
| Electron preload IPC | Electron 41.2.0 installed. [VERIFIED: package.json] | Typed renderer access to FlashQuery and native context menus. [VERIFIED: codebase grep] | Required by project security boundary. [CITED: AGENTS.md] |
| Phosphor Icons | 2.1.10 installed and latest as of 2025-05-22. [VERIFIED: package.json] [VERIFIED: npm registry] | Existing icon set; use `Clipboard` for editor title action. [CITED: 20-CONTEXT.md D-27] [VERIFIED: codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.2.4 installed; latest registry 4.1.8 as of 2026-06-01. [VERIFIED: package.json] [VERIFIED: npm registry] | Unit/component tests. [VERIFIED: package.json] | T-U-006, T-U-012, T-U-020. [CITED: Milestone 2 Test Plan.md] |
| Playwright | 1.60.0 installed and latest as of 2026-06-04. [VERIFIED: package.json] [VERIFIED: npm registry] | Electron E2E tests. [VERIFIED: package.json] | T-E-004 and clipboard workflow extensions. [CITED: Milestone 2 Test Plan.md] |
| `@modelcontextprotocol/sdk` | 1.29.0 installed and latest as of 2026-03-30. [VERIFIED: package.json] [VERIFIED: npm registry] | E2E FlashQuery stub MCP server and main FlashQuery client integration. [VERIFIED: codebase grep] | Existing fixture/server code only; no new dependency. [VERIFIED: codebase grep] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand cache in `agentStore.ts` | App-level store or panel-local state | Rejected because D-17 locks `agentStore.ts` as owner and autocomplete is Pi-agent specific. [CITED: 20-CONTEXT.md D-17] |
| Native Electron clipboard IPC | `navigator.clipboard.writeText` | Use renderer clipboard because search rows already do; native menu remains IPC only for item picking. [VERIFIED: codebase grep] |
| Rich input mention chips | Slate/ProseMirror/chip renderer | Rejected by D-07/D-08; selected references must be plain literal text. [CITED: 20-CONTEXT.md] |

**Installation:** No new packages should be installed for this phase. [VERIFIED: package.json] [CITED: AGENTS.md]

## Package Legitimacy Audit

No external package installation is recommended for Phase 20. [VERIFIED: package.json] Existing stack packages were checked with `npm view` for current registry availability and postinstall scripts; no checked package returned a `scripts.postinstall` value. [VERIFIED: npm registry] `slopcheck` was available but version `0.6.1` rejected the requested `--json` flag, so no new-package disposition is needed. [VERIFIED: command output]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| none | npm | n/a | n/a | n/a | n/a | No install planned. [VERIFIED: package.json] |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: package.json]
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Workspace connection/status
  -> preload onFlashQueryStatus
  -> agentStore vault-index lifecycle actions
  -> flashquery:list-vault-index IPC
  -> main FlashQueryClientManager.listVaultIndex()
  -> FlashQuery MCP search(list_all documents)
  -> whole-response cache replacement
  -> AgentPanel passes cache to AgentChatInput
  -> @ segment detection/filter/sort
  -> literal {{ref:fullPath}} insertion

Vault/search/editor surfaces
  -> renderer context button/menu
  -> window.electronAPI.showContextMenu where needed
  -> navigator.clipboard.writeText(fullPath or {{ref:fullPath}})
```

### Recommended Project Structure

```text
src/
├── agent/renderer/
│   ├── agentStore.ts                  # vault-index cache state, refresh/clear actions, status/tool-event hooks
│   ├── AgentPanel.tsx                 # workspace/status lifecycle wiring and ChatInput props
│   └── AgentChatInput.tsx             # @ mention detection/dropdown/keyboard insertion
├── renderer/panels/
│   ├── FlashQueryVaultPanel.tsx       # vault tree copy actions and refresh trigger hook
│   ├── FlashQueryVaultSearchPanel.tsx # preserve existing document copy actions
│   └── EditorPanel.tsx                # FlashQuery editor title Clipboard menu
└── shared/
    └── flashqueryUri.ts               # parse editor URI to recover forward-slash vault path
```

### Pattern 1: Typed Store Actions For Cache Refresh

**What:** Add typed vault-index state and actions to `agentStore.ts`, using immutable replacements and a request sequence counter. [VERIFIED: codebase grep]
**When to use:** Every lifecycle trigger should call one store action, so last-fetch-wins and loading flicker rules are centralized. [CITED: 20-CONTEXT.md D-18 to D-23]
**Example:**

```typescript
// Source: Context7 /pmndrs/zustand/v5.0.12 and local agentStore.ts pattern
refreshVaultIndex: async (workspaceId) => {
  const requestId = nextRequestId()
  set({ vaultIndexLoading: true, vaultIndexWorkspaceId: workspaceId, vaultIndexRequestId: requestId })
  const entries = await window.electronAPI.flashqueryListVaultIndex(workspaceId)
  set((state) => state.vaultIndexRequestId === requestId
    ? { vaultIndex: entries, vaultIndexLoading: false }
    : state)
}
```

### Pattern 2: Portal Dropdown Above Composer

**What:** Use `createPortal` with the existing `useNodePortalTarget` helper to render the mention dropdown above the textarea inside the canvas-node coordinate frame. [VERIFIED: codebase grep] [VERIFIED: Context7 /reactjs/react.dev]
**When to use:** The mention dropdown should avoid clipping and align with the existing compact/stats popover approach. [CITED: 20-CONTEXT.md D-06]
**Example:**

```typescript
// Source: React createPortal docs and AgentChatInput.tsx useNodePortalTarget pattern
{mentionOpen && pos && portalTarget && createPortal(
  <MentionPopup entries={matches} selectedIdx={selectedMentionIdx} />,
  portalTarget,
)}
```

### Pattern 3: Native Menu Selection, Renderer Clipboard Write

**What:** Use `window.electronAPI.showContextMenu` for menu picking and `navigator.clipboard.writeText` for final copy. [VERIFIED: codebase grep]
**When to use:** Vault tree and editor title menu actions should follow existing search row behavior. [VERIFIED: codebase grep]
**Example:**

```typescript
// Source: FlashQueryVaultSearchPanel.tsx
const action = await window.electronAPI.showContextMenu([
  { id: 'copy-path', label: 'Copy vault path' },
  { id: 'copy-reference', label: 'Copy as reference' },
])
if (action === 'copy-path') await navigator.clipboard.writeText(fullPath)
if (action === 'copy-reference') await navigator.clipboard.writeText(`{{ref:${fullPath}}}`)
```

### Anti-Patterns to Avoid

- **Adding a new FlashQuery channel for autocomplete:** `FLASHQUERY_LIST_VAULT_INDEX = 'flashquery:list-vault-index'` already exists. [VERIFIED: codebase grep]
- **Renderer MCP calls:** Renderer must not access tokens or FlashQuery MCP directly. [CITED: AGENTS.md]
- **Incremental cache mutation:** Whole-response replacement is locked. [CITED: 20-CONTEXT.md D-21]
- **Footer UI additions or chips:** Mention output must stay plain text with no new footer buttons/pills/chips. [CITED: 20-CONTEXT.md D-07, D-08]
- **Memory row context menu:** Search memory rows must remain without a formal context menu. [CITED: 20-CONTEXT.md D-32]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FlashQuery vault index retrieval | New HTTP/MCP client in renderer | `window.electronAPI.flashqueryListVaultIndex(workspaceId)` | Preserves token boundary and existing IPC validation. [VERIFIED: codebase grep] [CITED: AGENTS.md] |
| Popover rendering and positioning | Separate overlay framework | Existing `useNodePortalTarget` plus React `createPortal` | Matches local canvas-node coordinate pattern. [VERIFIED: codebase grep] |
| Clipboard menu infrastructure | Custom HTML context menu for tree/search | Existing `showContextMenu` IPC | Native OS menus are the established pattern for vault tree/search rows. [CITED: Milestone 2 Requirements.md §4.3] [VERIFIED: codebase grep] |
| Reference syntax parsing variants | Section anchors, markdown links, rich chips | Literal `{{ref:path.md}}` strings | Whole-document reference shape is locked. [CITED: 20-CONTEXT.md D-30, D-31] |

**Key insight:** The hard part is not retrieving documents; it is preventing stale workspace cache leakage while keeping existing Pi composer and FlashQuery surfaces unchanged. [CITED: 20-CONTEXT.md D-20 to D-24] [VERIFIED: codebase grep]

## Already Implemented Pieces

- `FLASHQUERY_LIST_VAULT_INDEX` exists in `src/shared/ipc-channels.ts`, preload exposes `flashqueryListVaultIndex`, and `src/shared/electron-api.d.ts` types it as returning `FlashQueryVaultIndexEntry[]`. [VERIFIED: codebase grep]
- `FlashQueryVaultIndexEntry` already has `{ filename: string; fullPath: string }`. [VERIFIED: codebase grep]
- `FlashQueryClientManager.listVaultIndex()` calls FlashQuery `search` with empty filesystem list-all document search, `limit: 1_000`, `include_archived: true`, and returns normalized document entries. [VERIFIED: codebase grep]
- Main IPC test and client manager test already include T-U-006 coverage for channel delegation, path normalization, memory filtering, and disconnected empty return. [VERIFIED: codebase grep]
- Search document rows already include `Copy vault path` and `Copy as reference` and write `{{ref:Docs/Plan.md}}` in tests. [VERIFIED: codebase grep]
- `AgentPanel` already has E2E harness access for creating agent panels and reading agent messages, and `e2e/flashquery-pi-diagnostics.spec.ts` demonstrates injecting mocked Pi events. [VERIFIED: codebase grep]

## Known Gaps To Plan

- `agentStore.ts` currently has no vault-index cache state or refresh/clear actions. [VERIFIED: codebase grep]
- `AgentChatInput.tsx` currently handles slash commands only when the whole draft starts with `/`; it does not inspect cursor-local `@` segments. [VERIFIED: codebase grep]
- Slash popup currently renders inline absolute; other popovers in the same file use `createPortal`, so the mention dropdown needs the portal variant explicitly. [VERIFIED: codebase grep]
- `FlashQueryVaultPanel` document context menu currently has `Open`, `Open frontmatter`, and `Open on Canvas`, but no copy actions. [VERIFIED: codebase grep]
- `EditorPanel` title action row currently has `Frontmatter` and `Refresh from vault`, but no Clipboard menu. [VERIFIED: codebase grep]
- Cache refresh after successful extension-dispatched mutating FlashQuery document tools is not wired; generic extension tool execution results carry FlashQuery metadata in `event.result.details`, which `agentStore.ts` sanitizes into `ToolMessage.flashquery`, while the original Pi tool name is also available as `ToolMessage.name` from the start event. The trigger should inspect successful `tool_execution_end` completions using those current post-Phase-19 shapes. [VERIFIED: codebase grep]
- E2E fixture supports search/list-all but T-E-004 does not exist yet. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Stale Workspace Entries In Pi Mentions
**What goes wrong:** Old workspace filenames remain offered after workspace switch or disconnect. [CITED: 20-CONTEXT.md D-20, D-22]
**Why it happens:** Fetches are async and `AgentPanel`/`agentStore` can receive late responses after workspace state changes. [VERIFIED: codebase grep]
**How to avoid:** Store `workspaceId`, request id, loading count or active request id, and discard late results. [CITED: 20-CONTEXT.md D-22, D-23]
**Warning signs:** T-E-004 can still insert a document from the previous workspace after switching. [CITED: Milestone 2 Test Plan.md]

### Pitfall 2: Slash Command Regression
**What goes wrong:** `@` key handling consumes Enter/Tab/Esc while slash popup is active. [CITED: Milestone 2 Test Plan.md T-U-020]
**Why it happens:** `AgentChatInput` currently has one keydown branch for slash popup. [VERIFIED: codebase grep]
**How to avoid:** Make mention and slash active states mutually ordered; slash keeps priority when active. [VERIFIED: codebase grep]
**Warning signs:** `/plan` autocomplete changes behavior or Esc clears mention text unexpectedly. [VERIFIED: codebase grep]

### Pitfall 3: Clipboard Path Encoding Confusion
**What goes wrong:** Editor URI text like `flashquery://workspace-1/Docs/Space%20Plan.md` is copied instead of `Docs/Space Plan.md`. [VERIFIED: codebase grep]
**Why it happens:** Editor surfaces store FlashQuery docs as URIs; clipboard utilities require vault paths. [CITED: 20-CONTEXT.md D-29, D-30]
**How to avoid:** Use `parseVaultUri(filePath)` before copying from editor title actions. [VERIFIED: codebase grep]
**Warning signs:** Tests see `%20`, `flashquery://`, backslashes, anchors, or markdown-link syntax in clipboard output. [CITED: Milestone 2 Test Plan.md T-M-004]

### Pitfall 4: Cache Refresh Hidden Behind Only Vault Panel
**What goes wrong:** Users never opened the vault tree, so Pi mentions never load. [CITED: 20-CONTEXT.md D-18]
**Why it happens:** Refresh after vault tree refresh is only one lifecycle trigger; connect/reconnect/switch must also populate cache. [CITED: 20-CONTEXT.md D-18, D-19]
**How to avoid:** Put primary lifecycle in `AgentPanel`/`agentStore` status/workspace effects; vault tree refresh and writes are additional triggers. [VERIFIED: codebase grep]

## Code Examples

### Current Vault-Index IPC Shape

```typescript
// Source: src/main/flashquery/clientManager.ts
async listVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]> {
  const payload = await this.callJsonTool(client, 'search', {
    query: '',
    mode: 'filesystem',
    entity_types: ['documents'],
    limit: 1_000,
    include_archived: true,
    list_all: true,
  })
  return entries.flatMap((entry) => this.normalizeVaultIndexEntry(entry))
}
```

### Current Search Row Clipboard Pattern

```typescript
// Source: src/renderer/panels/FlashQueryVaultSearchPanel.tsx
if (action === 'copy-path') await copyDocumentValue(result.fullPath)
if (action === 'copy-reference') await copyDocumentValue(`{{ref:${result.fullPath}}}`)
```

### Current Editor FlashQuery Action Row

```typescript
// Source: src/renderer/panels/EditorPanel.tsx
{isFlashQueryBody && !diffMode && (
  <div className="absolute top-2 right-5 z-10 flex items-center gap-1">
    <button aria-label="Show metadata editor">Frontmatter</button>
    <button aria-label="Refresh from vault">Refresh from vault</button>
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Body-only FlashQuery editor URIs | Body/frontmatter URI parts with `parseVaultUri` and `buildVaultUri` | Phase 15 / Milestone 2. [VERIFIED: codebase grep] | Editor clipboard actions must parse URIs to recover raw vault paths. [VERIFIED: codebase grep] |
| Search row interactions without copy utilities | Search document rows now include path/reference copy actions | Phase 16 / Milestone 2. [VERIFIED: codebase grep] | Preserve existing behavior and avoid duplicating helper logic incorrectly. [VERIFIED: codebase grep] |
| FlashQuery tools absent from Pi | Bundled `cate-flashquery` extension registers tools and emits structured diagnostics | Phases 17-18. [VERIFIED: codebase grep] | Cache refresh after mutating extension tool success can observe `tool_execution_end` details. [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- Adding `@modelcontextprotocol/server` is forbidden; Cate uses `@modelcontextprotocol/sdk`. [CITED: AGENTS.md]
- Rich document-reference chips are out of scope. [CITED: 20-CONTEXT.md D-07]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Extension-dispatched mutating document tools can be detected in renderer by successful `tool_execution_end` events whose `event.result.details.flashquery === true` survives sanitization, with tool names from `ToolMessage.name` and/or sanitized `flashquery.toolName` such as `write_document`. [ASSUMED] | Known Gaps / Architecture Patterns | If Pi event details omit enough metadata for some tools, executor needs a lower-level extension callback or explicit renderer event. |
| A2 | T-E-004 can use the existing real Pi panel shell plus mocked/harnessed state rather than a live provider. [ASSUMED] | Validation Architecture | If the composer cannot be exercised without a configured provider/session, planner must add a harness-only route or use mocked component E2E. |

## Open Questions (RESOLVED)

1. **Where should successful mutating extension tools publish cache-refresh intent?**
   - What we know: generic FlashQuery tool execution results include FlashQuery metadata under `event.result.details`; `agentStore.ts` extracts and sanitizes it into `ToolMessage.flashquery`, and the existing tool message keeps the Pi tool name as `ToolMessage.name`. [VERIFIED: codebase grep]
   - What's unclear: whether every mutating document tool uses stable names and result shapes. [ASSUMED]
   - Recommendation: Plan a small helper that classifies known document-mutating tool names first, with tests around successful vs failed `tool_execution_end`. [ASSUMED]
   - RESOLVED: Phase 20 will publish cache-refresh intent from the renderer agent-store event path by classifying successful FlashQuery document-mutating tool completions using the current post-Phase-19 event shape: locate the `ToolMessage` by `toolCallId`, read `ToolMessage.name`, and read sanitized FlashQuery details extracted from `event.result.details` when present. Plan 20-01 owns the helper and requires tests for successful mutation, failed mutation, and non-mutating/read-only tools. If implementation finds a tool event lacks enough metadata, that is an execution deviation to solve locally by adding a narrowly scoped extension detail field or renderer bridge event, not a product-scope question.

2. **Should `@` mention loading fetch start only when an agent panel exists?**
   - What we know: D-17 places cache in `agentStore.ts` and the cache serves Pi chat only. [CITED: 20-CONTEXT.md]
   - What's unclear: whether preloading globally before an agent panel exists has product value. [ASSUMED]
   - Recommendation: Trigger from mounted `AgentPanel` workspace/status effects and from explicit surface events; this keeps scope minimal. [ASSUMED]
   - RESOLVED: Phase 20 will fetch the vault-index cache from mounted/active AgentPanel workspace-status lifecycle and explicit successful surface/tool events only. No global preloading before an agent panel exists is required for REQ-018, because the cache serves the Pi composer and the product docs do not require background population for absent agent panels.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | build/test/runtime | yes, but unsupported for project | v24.7.0 | Switch to Node 20 or 22 before installing/running full validation. [VERIFIED: command output] [VERIFIED: package.json] |
| npm | package scripts | yes | 11.5.1 | Use existing lockfile; avoid dependency installs in this phase. [VERIFIED: command output] |
| git | docs commit | yes | 2.50.1 | none. [VERIFIED: command output] |
| Vitest | unit/component tests | package script present | 3.2.4 installed in package manifest | `npm test -- <file>` once supported Node is active. [VERIFIED: package.json] |
| Playwright | E2E tests | package script present | 1.60.0 installed in package manifest | Use focused component tests if local Electron cannot launch. [VERIFIED: package.json] |

**Missing dependencies with no fallback:**
- Supported Node version is not active; local shell is Node 24 while project requires `>=20 <23`. [VERIFIED: command output] [VERIFIED: package.json]

**Missing dependencies with fallback:**
- none identified. [VERIFIED: command output]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 and Playwright 1.60.0. [VERIFIED: package.json] |
| Config file | `vitest.config.ts`, `playwright.config.ts`. [VERIFIED: codebase grep] |
| Quick run command | `npm test -- src/agent/renderer/AgentChatInput.atMention.test.tsx src/agent/renderer/agentStore.test.ts src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` [VERIFIED: package.json] |
| Full suite command | `npm run typecheck && npm test && npm run test:e2e` [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-018 | vault-index IPC normalizes/sorts/clears stale data | unit | `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts` | yes, but renderer cache stale-result coverage missing. [VERIFIED: codebase grep] |
| REQ-018 | `AgentChatInput` detects `@`, filters filename-only, sorts fullPath, keyboard accept/dismiss, inserts literal refs | component | `npm test -- src/agent/renderer/AgentChatInput.atMention.test.tsx` | no; add Wave 0. [VERIFIED: codebase grep] |
| REQ-018 | E2E mention insertion, workspace switch replacement, disconnect clear | E2E | `npm run test:e2e -- e2e/flashquery-pi-mentions.spec.ts` | no; add Wave 0. [VERIFIED: codebase grep] |
| REQ-019 | search document row copy path/reference | component/E2E | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx && npm run test:e2e -- e2e/flashquery-vault-search.spec.ts` | yes. [VERIFIED: codebase grep] |
| REQ-019 | vault tree copy path/reference and editor title Clipboard menu | component | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` | files exist; assertions missing. [VERIFIED: codebase grep] |

### Sampling Rate

- **Per task commit:** targeted Vitest file for edited surface. [VERIFIED: package.json]
- **Per wave merge:** `npm run typecheck && npm test -- <changed test files>`. [VERIFIED: package.json]
- **Phase gate:** focused E2E for T-E-004 plus existing T-E-003, then full suite if supported Node is active. [CITED: Milestone 2 Test Plan.md] [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] `src/agent/renderer/AgentChatInput.atMention.test.tsx` — covers T-U-020. [CITED: Milestone 2 Test Plan.md]
- [ ] `src/agent/renderer/agentStore.test.ts` additions — covers renderer-side T-U-006 stale-result/cache lifecycle behavior. [CITED: Milestone 2 Test Plan.md]
- [ ] `src/renderer/panels/FlashQueryVaultPanel.test.tsx` additions — covers vault tree T-U-012 copy actions. [CITED: Milestone 2 Test Plan.md]
- [ ] `src/renderer/panels/EditorPanel.test.tsx` additions — covers editor title Clipboard menu. [CITED: Milestone 2 Test Plan.md]
- [ ] `e2e/flashquery-pi-mentions.spec.ts` or equivalent split — covers T-E-004. [CITED: Milestone 2 Test Plan.md]
- [ ] Manual evidence note for T-M-004 — native macOS clipboard verification. [CITED: Milestone 2 Test Plan.md]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Do not expose FlashQuery bearer tokens to renderer; use existing main/preload connection boundary. [CITED: AGENTS.md] |
| V3 Session Management | no | MCP/Pi session state is already owned by Pi agent manager; Phase 20 adds no server session. [CITED: AGENTS.md] |
| V4 Access Control | yes | Workspace-scoped cache must be keyed and cleared per workspace. [CITED: 20-CONTEXT.md D-17 to D-24] |
| V5 Input Validation | yes | Main IPC already validates non-empty workspace ID for vault index; renderer should treat cache entries as data and normalize only by existing IPC results. [VERIFIED: codebase grep] |
| V6 Cryptography | no | No cryptographic operations are added. [VERIFIED: codebase grep] |

### Known Threat Patterns for Cate/Electron Renderer

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token disclosure through renderer autocomplete | Information Disclosure | Fetch through preload IPC only; never pass bearer token or endpoint auth into `agentStore`. [CITED: AGENTS.md] |
| Cross-workspace data leakage | Information Disclosure | Clear cache on disconnect/workspace switch and discard stale fetch responses. [CITED: 20-CONTEXT.md D-20, D-22] |
| Clipboard writing wrong encoded URI | Tampering / UX integrity | Copy parsed forward-slash vault path and `{{ref:path.md}}` only. [CITED: 20-CONTEXT.md D-29, D-30] |
| Native menu injection | Tampering | Use static menu item IDs/labels for Phase 20 actions. [VERIFIED: codebase grep] |

## Sources

### Primary (HIGH confidence)

- `.planning/phases/20-pi-mentions-and-clipboard-utilities/20-CONTEXT.md` - locked user decisions, phase scope, expected files. [CITED: local file]
- `.planning/ROADMAP.md` - Phase 20 goal and success criteria. [CITED: local file]
- `.planning/REQUIREMENTS.md` - REQ-018/REQ-019 traceability. [CITED: local file]
- `Milestone 2 Requirements.md` - product source of truth for REQ-018/REQ-019. [CITED: local file]
- `Milestone 2 Test Plan.md` - T-U/T-E/T-M coverage. [CITED: local file]
- Cate source grep/read of `src/agent/renderer/AgentChatInput.tsx`, `agentStore.ts`, FlashQuery IPC/client files, vault/search/editor panels, E2E fixtures. [VERIFIED: codebase grep]
- Context7 `/reactjs/react.dev` - `createPortal` behavior. [VERIFIED: Context7]
- Context7 `/pmndrs/zustand/v5.0.12` - typed store and async actions. [VERIFIED: Context7]

### Secondary (MEDIUM confidence)

- npm registry checks for existing stack versions and postinstall scripts. [VERIFIED: npm registry]

### Tertiary (LOW confidence)

- Assumptions A1 and A2 around exact mutating-tool classification and E2E agent harness feasibility. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing project stack verified in package manifest and registry; no new packages needed. [VERIFIED: package.json] [VERIFIED: npm registry]
- Architecture: HIGH - target files and existing patterns verified directly in code. [VERIFIED: codebase grep]
- Pitfalls: HIGH for stale cache/clipboard/IPC risks from locked decisions and code; MEDIUM for extension mutating-tool trigger details pending implementation proof. [CITED: 20-CONTEXT.md] [ASSUMED]

**Research date:** 2026-06-04
**Valid until:** 2026-07-04 for internal code patterns; re-check npm/tool versions if planning occurs after that date. [ASSUMED]
