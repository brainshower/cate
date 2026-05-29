# Phase 04: Vault Panel + Shared Chip - Research

**Researched:** 2026-05-29  
**Domain:** Electron renderer panel, React component state, Zustand app/UI stores, FlashQuery preload IPC  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
Source Authority, Scope Boundaries, Panel Registration, Shared Chip Primitive, Vault Panel UX, Row Interaction And Refresh, Design And Styling, and Testing decisions D-01 through D-38 from `04-CONTEXT.md` are locked and must be honored verbatim. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]

Verbatim locked decisions from `04-CONTEXT.md`: [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]

#### Source Authority
- **D-01:** Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 4. These docs are the primary source for REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-024, REQ-025, REQ-026, REQ-040, and tests T-U-051..054, T-I-015..049, T-U-102..103.
- **D-02:** If local planning docs, roadmap rows, code comments, or existing Cate conventions appear ambiguous, agents MUST re-read the external requirements and test-plan docs first, then inspect the existing code, before asking the user.
- **D-03:** The project owner explicitly requested that all downstream implementation agents refer to the external requirements and test-plan docs first. Plans must repeat these docs in every task's `<read_first>` when the task touches Phase 4 behavior.

#### Scope Boundaries
- **D-04:** Implement only Phase 4 behavior: shared chip primitive, vault panel registration, app-store factory, vault panel UI, lazy tree loading, refresh, row interaction, context menu behavior, and associated tests.
- **D-05:** Do not implement vault document creation. No "New File", "New Folder", command palette action, shortcut, folder context menu, write create mode, rename, delete, archive, tag, move, copy, or frontmatter affordance belongs in Phase 4.
- **D-06:** Do not implement Phase 5's full `FlashQueryConnectionDialog` or workspace menu entry except for the minimum UI-store/open hook needed for Phase 4 empty/disconnected actions if not already present.
- **D-07:** Do not implement Phase 6 editor URI-awareness or vault badge. Phase 4 may open editors with `flashquery://` URIs through existing `createEditor`, but editor read/save routing belongs to Phase 6.
- **D-08:** Renderer code must call the Phase 3 preload API (`window.electronAPI.flashquery.*` shape or equivalent existing API). The vault panel MUST NOT instantiate MCP clients, call Node APIs, or use filesystem IPC.

#### Panel Registration
- **D-09:** Add `flashqueryVault` as a `PanelType` and `PANEL_DEFINITIONS` entry with label `FlashQuery Vault`, brand/switcher color `#5AD8B8`, muted color `#4a9080`, `tintClass: 'text-teal-400'`, file-explorer-like default/minimum sizing, `canLiveOnCanvas: true`, and a vault-themed ghost SVG.
- **D-10:** Add a renderer registry entry using the Phosphor `Vault` icon, lazy `FlashQueryVaultPanel`, and a factory calling `useAppStore.getState().createFlashQueryVault(workspaceId, canvasPoint, placement) || null`.
- **D-11:** Add `createFlashQueryVault` to `appStore`, mirroring `createFileExplorer`, producing panels with `type: 'flashqueryVault'`.

#### Shared Chip Primitive
- **D-12:** Create the reusable chip primitive in `src/renderer/components/Chip.tsx` even if `src/renderer/components/` does not exist yet. The product docs explicitly identify this shared location for REQ-026; implementation should keep the directory narrowly scoped to the chip.
- **D-13:** The chip API must support connection states `{ kind: 'connecting' }`, `{ kind: 'live' }`, `{ kind: 'disconnected'; error?: string }`, and `{ kind: 'unknown' }`, with an exhaustive switch and default/fallback for future unknown variants.
- **D-14:** Visual values are locked by the product docs: 22 px pill, 999 radius, subtle translucent background/border, 11 px system font, teal spinner for connecting, green dot for live, red dot and retry affordance for disconnected.
- **D-15:** Only disconnected chips are actionable. Live and connecting clicks are no-ops and must not fire `onRetry`. Disconnected hover shows the error and "Click to retry"; click fires manual retry.

#### Vault Panel UX
- **D-16:** The panel header shows a Phosphor `Vault` icon, `FlashQuery Vault`, parsed host text after a `.` separator, status chip, refresh icon button, and standard close behavior. The host truncates before the label.
- **D-17:** The panel renders the five product states exactly: populated, no connection, connecting, disconnected, and empty vault.
- **D-18:** The no-connection state must include the exact primary message "No FlashQuery connection configured for this workspace.", helper text directing the user to the workspace FlashQuery connection entry, and an "Open workspace settings" button wired to the Phase 5 dialog visibility hook if available.
- **D-19:** The connecting state renders skeleton tree rows and footer text `probing <host>`.
- **D-20:** The disconnected state renders "Can't reach FlashQuery.", the broadcast error/host context, a Retry button that triggers manual reconnect, and an Edit connection button that opens the same settings hook as the empty state.
- **D-21:** The empty-vault state renders "This vault has no documents yet." and helper "Create a document in FlashQuery to see it here.", with no create action.
- **D-22:** The populated state renders root entries from `flashquery:listVault`; folders are lazily loaded the first time they expand, and the tree remains scrollable.
- **D-23:** Folder rows show a chevron, folder icon, name, loading indicator while fetching, and local expansion state. Expansion state persists across refreshes but is not globally persisted across sessions.
- **D-24:** Document rows show file icon plus filename/title. Prefer returned `title` for display when present without parsing document bodies.

#### Row Interaction And Refresh
- **D-25:** Single-click on a document selects it and does not open it. Double-click opens a dock editor using `buildVaultUri(workspaceId, entry.vaultPath)`.
- **D-26:** Right-click on a document row invokes `window.electronAPI.showContextMenu()` with exactly two items: `{ id: 'open', label: 'Open' }` and `{ id: 'open-on-canvas', label: 'Open on Canvas' }`.
- **D-27:** The `open` menu result behaves like double-click. The `open-on-canvas` result creates an editor panel on the canvas with the same `flashquery://` URI.
- **D-28:** Right-clicking a folder row MUST NOT call `showContextMenu` in v1.
- **D-29:** Refresh reloads the root listing, ignores duplicate clicks while in flight, preserves expansion and selection for vault paths that still exist, drops expansion for removed folders, and does not close open editors.
- **D-30:** Multi-select behavior should match the local file tree where feasible. If full local-file selection machinery is too coupled, preserve the test-visible Shift/Cmd/Ctrl selection semantics in the vault panel and document any narrower behavior in the plan.

#### Design And Styling
- **D-31:** Phase 4 UI should feel like Cate's existing dense desktop tool UI: restrained, token-based, and panel-native. Do not create a landing page, marketing layout, decorative background, or standalone visual language.
- **D-32:** Use existing Cate semantic utility classes from `src/renderer/styles/globals.css` such as `text-primary`, `text-secondary`, `text-muted`, `bg-surface-*`, and `bg-hover`. Avoid stock Tailwind neutral palette classes (`zinc`, `gray`, `slate`) in rendered Phase 4 UI.
- **D-33:** Icons should come from `@phosphor-icons/react` to match Cate's existing icon library.
- **D-34:** The plan must include tests T-U-102 and T-U-103 or equivalent source/snapshot assertions that the vault panel and chip do not introduce forbidden stock Tailwind neutral classes.

#### Testing
- **D-35:** Add or extend tests for T-U-051..054: shared panel definition, brand colors, renderer registry entry/factory, and app-store `createFlashQueryVault`.
- **D-36:** Add `src/renderer/components/Chip.test.tsx` for T-I-015..021.
- **D-37:** Add `src/renderer/panels/FlashQueryVaultPanel.test.tsx` for T-I-022..049 and T-U-102.
- **D-38:** Run focused tests for the new files plus `npm run typecheck`. If the local default Node is outside Cate's `>=20 <23` engine, use the existing project pattern from Phase 3: run through Node 22 (`npx -p node@22 ...`) and note that in summaries.

Key locked constraints for planning:
- Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 4. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Plans must repeat the two external product docs in every task's `<read_first>` when the task touches Phase 4 behavior. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Implement only Phase 4 behavior: shared chip primitive, vault panel registration, app-store factory, vault panel UI, lazy tree loading, refresh, row interaction, context menu behavior, and associated tests. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Do not implement vault document creation, Phase 5's full settings dialog, or Phase 6 editor URI-awareness. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Renderer code must call the Phase 3 preload API and must not instantiate MCP clients, call Node APIs, or use filesystem IPC for vault browsing. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Add `flashqueryVault` to `PanelType`, `PANEL_DEFINITIONS`, renderer `PANEL_REGISTRY`, and `appStore.createFlashQueryVault`. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Create `src/renderer/components/Chip.tsx`; disconnected chip is the only actionable chip state. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Right-clicking a folder row MUST NOT call `showContextMenu` in v1. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Phase 4 UI must use Cate semantic classes and must include tests proving no forbidden stock Tailwind neutral classes were introduced. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]

### the agent's Discretion
- The planner may decide whether the status chip component is named `Chip` or `ConnectionStatusChip`, provided the reusable exported component lives in `src/renderer/components/Chip.tsx` and future editor badge reuse is straightforward. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- The planner may choose the narrow state-management shape for panel-local vault entries, expansion, selection, and in-flight loads, provided the test-visible behavior and local file-tree conventions are met. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- The planner may split the phase into either three roadmap-aligned plans or smaller test-first slices, provided every Phase 4 requirement ID appears in at least one plan frontmatter `requirements` list. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]

### Deferred Ideas (OUT OF SCOPE)
- Full settings dialog, URL/token fields, test connection form behavior, save/cancel/remove flows, and workspace context-menu entry belong to Phase 5. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Editor read routing, save routing, diff guardrails, dirty-state persistence behavior, and editor vault badge belong to Phase 6. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Full E2E happy path, restart behavior, existing E2E regression, and manual/design checklist belong to Phase 7. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
- Live vault-change notifications, SSE subscriptions, conflict detection, frontmatter editing, vault document creation, rename/delete/archive/tag/move, OAuth, token refresh, keychain migration, and stdio transport remain outside v1 or future work. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-014 | Panel type registration | Add shared type/definition, renderer registry entry, lazy component, and `createFlashQueryVault` by mirroring existing file explorer patterns. [CITED: product Requirements §6.4.1] [VERIFIED: codebase grep] |
| REQ-015 | Panel header chrome | Header needs Vault icon, label, host, chip, refresh, close-style behavior, truncating host first. [CITED: product Requirements §6.4.2] |
| REQ-016 | Vault tree rendering | Use `flashqueryListVault` for root and lazy folder children; keep expansion state panel-local. [CITED: product Requirements §6.4.3] [VERIFIED: codebase grep] |
| REQ-017 | Vault row interactions | Match `FileTreeNode`: single-click select, double-click dock open, document context menu with exactly Open/Open on Canvas. [CITED: product Requirements §6.4.4] [VERIFIED: codebase grep] |
| REQ-018 | Refresh action | Reload root, debounce while in flight, preserve valid expansion and selection, never close editors. [CITED: product Requirements §6.4.5] |
| REQ-019 | Panel states | Render populated, no-connection, connecting, disconnected, and empty-vault states. [CITED: product Requirements §6.4.6] |
| REQ-024 | Chip extensible state API | `Chip.tsx` should accept connecting/live/disconnected/unknown and default unknown future variants to unknown rendering. [CITED: product Requirements §6.5.1] |
| REQ-025 | Chip interaction | Only disconnected chip fires retry and shows retry tooltip. [CITED: product Requirements §6.5.2] |
| REQ-026 | Shared chip primitive location | Create `src/renderer/components/Chip.tsx` for reuse by Phase 6 badge. [CITED: product Requirements §6.5.3] |
| REQ-040 | No vault doc creation | Do not add New File/New Folder/keyboard/command affordances; folder right-click does not show a menu. [CITED: product Requirements §6.8.1] |
</phase_requirements>

## Summary

Phase 4 should be planned as an additive renderer/UI slice over the already-completed Phase 3 FlashQuery IPC surface. The implementation should not introduce a backend, direct filesystem access, MCP client code in the renderer, or vault mutation affordances. [CITED: product Requirements INV-01, INV-03, INV-07, INV-11] [VERIFIED: codebase grep]

The safest plan shape is four test-first slices: `Chip`, panel registration, minimal missing renderer hooks, then vault panel tree/state behavior. The "minimal missing renderer hooks" slice is important because current code exposes `flashquerySetConnection`, `flashqueryListVault`, `flashqueryGetDocument`, `flashqueryWriteDocument`, and `onFlashQueryStatus`, but no renderer-callable manual retry method; current `uiStore` also has no FlashQuery dialog visibility action. [VERIFIED: codebase grep]

**Primary recommendation:** Use existing React + Zustand + preload IPC patterns, add `flashqueryVault` as a standard Cate panel, add `Chip.tsx`, add a narrow manual-retry preload IPC and narrow UI-store dialog-open placeholder only if required, and write focused Vitest/jsdom component tests before implementation. [VERIFIED: codebase grep] [CITED: product Test Plan §4.4]

## Project Constraints (from AGENTS.md)

- Use the existing Electron, React, TypeScript, Zustand, IPC, and Vitest/Playwright stack; do not add a separate backend or UI framework. [CITED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work goes through typed preload APIs and main-process validation. [CITED: AGENTS.md]
- FlashQuery data remains in FlashQuery and the vault; Cate stores only connection metadata, user preferences, and UI/session state. [CITED: AGENTS.md]
- Connection/context behavior must be workspace-aware. [CITED: AGENTS.md]
- Do not break existing Cate agent, terminal, editor, browser, Git, workspace, or layout behavior. [CITED: AGENTS.md]
- TypeScript strict mode, ESM, async/await, typed boundary errors, Zod for external validation, and human-readable MCP/tool response conventions are project norms. [CITED: AGENTS.md]
- Unit tests live as `src/**/*.test.ts`; TSX component tests use jsdom through Vitest `environmentMatchGlobs`. [CITED: AGENTS.md] [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Shared chip rendering | Browser / Client | — | Pure React visual primitive with no privileged operations. [CITED: product Requirements §6.5] |
| Vault panel registration | Browser / Client | Shared contracts | `PanelType`/`PANEL_DEFINITIONS` are shared, while registry/component/factory live in renderer/store code. [VERIFIED: codebase grep] |
| Vault list/tree loading | Browser / Client | Main IPC | Renderer owns tree state and calls preload `flashqueryListVault`; main owns MCP calls. [CITED: product Requirements INV-01, INV-03] [VERIFIED: codebase grep] |
| Manual retry | Main IPC | Browser / Client | Renderer may initiate retry, but manager retry must remain main-process owned. [VERIFIED: codebase grep] |
| Settings open placeholder | Browser / Client | — | Phase 4 can only open/toggle future dialog state; full dialog belongs to Phase 5. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md] |
| Document open actions | Browser / Client | Shared URI helper | Renderer creates editor panels with `flashquery://` URIs; Phase 6 owns editor read/save routing. [CITED: product Requirements §6.4.4] [VERIFIED: codebase grep] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React / React DOM | 18.3.1 installed | Function components, local state/effects, lazy panel chunk. | Cate renderer already uses React, and official docs support `lazy`, `Suspense`, and effect cleanup for subscriptions/fetches. [VERIFIED: package.json] [CITED: /reactjs/react.dev] |
| Zustand | 5.0.12 installed | `appStore` and `uiStore` actions/selectors. | Existing stores use `create`, `getState`, selectors, and actions; official docs support this typed store pattern. [VERIFIED: package.json] [CITED: /pmndrs/zustand/v5.0.12] |
| Vitest | 3.2.4 installed | Unit/jsdom component tests. | Existing config routes `.test.tsx` to jsdom and Vitest docs support mocks and snapshots. [VERIFIED: package.json] [CITED: /vitest-dev/vitest/v3_2_4] |
| @phosphor-icons/react | 2.1.10 installed | Vault, refresh, folder/file/status icons. | Existing renderer registry and file tree already use Phosphor icons. [VERIFIED: package.json] [VERIFIED: codebase grep] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @testing-library/react | 16.3.2 current on npm | Render/query React components in jsdom tests. | Use for `Chip.test.tsx` and `FlashQueryVaultPanel.test.tsx` because the product test plan explicitly calls for React Testing Library style tests. [VERIFIED: npm registry] [CITED: /testing-library/react-testing-library] |
| @testing-library/dom | 10.4.1 current on npm | DOM utilities required by RTL v16+. | Install with RTL per official README if adding RTL. [VERIFIED: npm registry] [CITED: /testing-library/react-testing-library] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @testing-library/react | `react-dom/test-utils` + direct DOM queries | Avoids dev dependency, but product Test Plan §4.4 names React Testing Library and RTL gives more maintainable interaction tests. [CITED: product Test Plan §4.4] [CITED: /testing-library/react-testing-library] |
| Global persisted tree state | Panel-local React state | Product requires expansion state to persist across refresh only, not across Cate sessions. [CITED: product Requirements §6.4.3] |
| Reusing `FileTreeNode` directly | New vault row component mirroring behavior | `FileTreeNode` is tightly coupled to filesystem IPC and create/rename/delete affordances, which are forbidden for vault rows. [VERIFIED: codebase grep] [CITED: product Requirements INV-03, REQ-040] |

**Installation if planner adopts RTL:**
```bash
npm install --save-dev @testing-library/react @testing-library/dom
```

**Version verification:** `npm view @testing-library/react version` returned `16.3.2`; `npm view @testing-library/dom version` returned `10.4.1`; both had no `scripts.postinstall` value. [VERIFIED: npm registry]

## Package Legitimacy Audit

Required only if the planner chooses to add React Testing Library dev dependencies. Slopcheck 0.6.1 is installed locally but does not support `--json`; plain `slopcheck install @testing-library/react @testing-library/dom` reported both packages `[OK]`. Its command attempted installation, which was immediately undone with `npm uninstall`; no dependency diff remains from research. [VERIFIED: slopcheck] [VERIFIED: codebase grep]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| @testing-library/react | npm | created 2019-05-30, modified 2026-01-19 | 39,595,767/week for 2026-05-22..2026-05-28 | github.com/testing-library/react-testing-library | OK | Approved if RTL added. [VERIFIED: npm registry] [CITED: /testing-library/react-testing-library] |
| @testing-library/dom | npm | created 2019-05-30, modified 2025-12-13 | 47,353,042/week for 2026-05-22..2026-05-28 | github.com/testing-library/dom-testing-library | OK | Approved if RTL added. [VERIFIED: npm registry] [CITED: /testing-library/react-testing-library] |

**Packages removed due to slopcheck [SLOP] verdict:** none. [VERIFIED: slopcheck]  
**Packages flagged as suspicious [SUS]:** none. [VERIFIED: slopcheck]

## Architecture Patterns

### System Architecture Diagram

```text
User opens flashqueryVault panel
  -> renderer registry factory
  -> appStore.createFlashQueryVault(workspaceId, point, placement)
  -> FlashQueryVaultPanel renders for workspace
      -> read workspace.flashqueryConnection from appStore
      -> subscribe to window.electronAPI.onFlashQueryStatus
      -> if no connection: render no-connection state
      -> if connecting/disconnected: render status-specific state and actions
      -> if live: window.electronAPI.flashqueryListVault(workspaceId, path?)
          -> preload IPC
          -> main FlashQuery IPC handler
          -> FlashQueryClientManager.listVault
          -> MCP list_vault tool
          -> normalized FlashQueryVaultEntry[]
      -> user row interaction
          -> single click: local selection only
          -> double click/Open: appStore.createEditor(..., { target: 'dock', zone: 'center' })
          -> Open on Canvas: appStore.createEditor(..., canvas placement)
```

### Recommended Project Structure

```text
src/
├── renderer/
│   ├── components/
│   │   ├── Chip.tsx
│   │   └── Chip.test.tsx
│   └── panels/
│       ├── FlashQueryVaultPanel.tsx
│       └── FlashQueryVaultPanel.test.tsx
├── shared/
│   ├── types.ts
│   ├── flashqueryUri.ts
│   ├── panels.ts
│   └── panels.test.ts
└── renderer/
    ├── panels/registry.ts
    └── stores/appStore.ts
```

### Pattern 1: Standard Panel Registration

**What:** Extend `PanelType`, add `PANEL_DEFINITIONS.flashqueryVault`, lazy-load `FlashQueryVaultPanel`, and add a registry factory calling the app-store factory. [VERIFIED: codebase grep]  
**When to use:** Required for every Cate panel type. [VERIFIED: codebase grep]

```typescript
// Source: src/renderer/panels/registry.ts
const FlashQueryVaultPanel = React.lazy(() => import('./FlashQueryVaultPanel'))

flashqueryVault: {
  ...PANEL_DEFINITIONS.flashqueryVault,
  icon: Vault,
  Component: FlashQueryVaultPanel,
  create: ({ workspaceId, canvasPoint, placement }) =>
    useAppStore.getState().createFlashQueryVault(workspaceId, canvasPoint, placement) || null,
}
```

### Pattern 2: Local Tree State With Stale-Response Guard

**What:** Store root entries, child entries by folder vaultPath, expanded vaultPaths, selected vaultPaths, per-path loading, and refresh-in-flight in `FlashQueryVaultPanel` local state. Use an ignore flag or request token in effects so stale list responses do not overwrite newer state. [CITED: /reactjs/react.dev] [CITED: product Requirements §6.4.3]  
**When to use:** Use for Phase 4 because product state is panel-local and refresh-local, not globally persisted. [CITED: product Requirements §6.4.3]

```typescript
// Source: React official docs pattern adapted to Cate local state.
useEffect(() => {
  let ignore = false
  async function loadRoot() {
    const entries = await window.electronAPI.flashqueryListVault(workspaceId)
    if (!ignore) setRootEntries(entries)
  }
  if (status === 'live') void loadRoot()
  return () => { ignore = true }
}, [workspaceId, status])
```

### Pattern 3: Native Context Menu Only For Documents

**What:** Document row right-click calls `showContextMenu` with exactly Open and Open on Canvas; folder right-click returns without calling `showContextMenu`. [CITED: product Requirements §6.4.4, §6.8.1]  
**When to use:** Required for REQ-017 and REQ-040.

```typescript
// Source: product Requirements §6.4.4, matching FileTreeNode open semantics.
const result = await window.electronAPI.showContextMenu([
  { id: 'open', label: 'Open' },
  { id: 'open-on-canvas', label: 'Open on Canvas' },
])
```

### Anti-Patterns to Avoid

- **Calling `fsReadDir` or other filesystem IPC from the vault panel:** product invariant says FlashQuery vault IPC and local filesystem IPC are disjoint. [CITED: product Requirements INV-03]
- **Reusing local folder context menu items:** New File, New Folder, Rename, Delete, Copy/Paste, Reveal, and related actions are out of scope and violate REQ-040. [CITED: product Requirements §6.8.1] [VERIFIED: codebase grep]
- **Parsing document bodies to display titles:** `listVault` already returns optional `title`; product requires preferring it without body parsing. [CITED: product Requirements §6.8.2] [VERIFIED: codebase grep]
- **Custom React context menus:** Cate uses native OS context menus through `window.electronAPI.showContextMenu`. [CITED: product Requirements INV-11] [VERIFIED: codebase grep]
- **Persisting expansion state globally:** product requires expansion state to persist across refresh but not across sessions. [CITED: product Requirements §6.4.3]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| FlashQuery transport | Renderer MCP client or HTTP calls | Phase 3 preload/main IPC methods | Renderer must not own MCP or privileged I/O. [CITED: product Requirements INV-01] [VERIFIED: codebase grep] |
| Panel lifecycle | Custom panel placement logic | `appStore` factory + `placePanel` path | Existing panel creation handles dock/canvas placement and rollback on placement failure. [VERIFIED: codebase grep] |
| Context menus | React dropdown component | `window.electronAPI.showContextMenu` | Native menu is the Cate convention and v1 invariant. [CITED: product Requirements INV-11] [VERIFIED: codebase grep] |
| URI construction | String concatenation | shared `buildVaultUri(workspaceId, vaultPath)` from `src/shared/flashqueryUri.ts` | Helper preserves encoding and folder separators while remaining safe for renderer imports. Main-side `src/main/flashquery/uri.ts` should re-export the shared helper for existing code compatibility. [VERIFIED: codebase grep] |
| Component test utilities | Ad hoc DOM renderer | `@testing-library/react` if adding RTL | Product Test Plan specifies jsdom + React Testing Library; official RTL docs provide render/screen/fireEvent patterns. [CITED: product Test Plan §4.4] [CITED: /testing-library/react-testing-library] |

**Key insight:** The vault panel should copy file-tree behavior, not file-tree implementation wholesale; the existing file tree is filesystem-mutating and therefore unsafe to reuse directly for vault rows. [VERIFIED: codebase grep] [CITED: product Requirements INV-03, REQ-040]

## Common Pitfalls

### Pitfall 1: Missing Manual Retry Surface

**What goes wrong:** The chip and Retry button need to trigger manual reconnect, but current preload/types expose no `flashqueryRetry` method. [VERIFIED: codebase grep]  
**Why it happens:** Phase 2 implemented `FlashQueryClientManager.retry(workspaceId)`, but Phase 3 only exposed set/list/get/write/status IPC. [VERIFIED: codebase grep]  
**How to avoid:** Plan a narrow Phase 4 task to expose `flashquery:retry` or equivalent through shared channel, main IPC, preload, and `ElectronAPI`, delegating to `FlashQueryClientManager.retry`. [VERIFIED: codebase grep]  
**Warning signs:** UI code attempts to call `flashquerySetConnection` as retry or imports manager/main code into renderer. [ASSUMED]

### Pitfall 2: Missing Dialog Visibility Hook

**What goes wrong:** No-connection and disconnected states require "Open workspace settings" / "Edit connection", but `uiStore` currently has settings actions only and no FlashQuery dialog state. [VERIFIED: codebase grep]  
**Why it happens:** Full dialog is Phase 5, while Phase 4 still needs a callable action for tests. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]  
**How to avoid:** Add only a narrow placeholder state/action such as `showFlashQueryConnectionDialog` and `setShowFlashQueryConnectionDialog`, without implementing the dialog. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]  
**Warning signs:** Planning pulls in Phase 5 form fields, save/remove flows, or workspace context-menu entries. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]

### Pitfall 3: Component Test Dependency Gap

**What goes wrong:** The product plan expects React Testing Library tests, but Cate does not currently install `@testing-library/react`. [CITED: product Test Plan §4.4] [VERIFIED: codebase grep]  
**Why it happens:** Existing renderer tests are mostly pure `.test.ts` files; Vitest jsdom is configured, but RTL is absent. [VERIFIED: codebase grep]  
**How to avoid:** Either add approved dev dependencies `@testing-library/react` and `@testing-library/dom`, or explicitly plan lower-level React DOM tests as a deviation. [VERIFIED: npm registry] [CITED: /testing-library/react-testing-library]  
**Warning signs:** `Chip.test.tsx` imports fail or tests resort to brittle manual DOM event dispatch. [ASSUMED]

### Pitfall 4: Stock Tailwind Neutral Classes

**What goes wrong:** New UI accidentally uses `gray`, `slate`, or `zinc` utility classes, violating the product invariant. [CITED: product Requirements INV-10]  
**Why it happens:** Tailwind examples commonly use neutral palettes, but Cate's renderer has semantic classes. [CITED: AGENTS.md]  
**How to avoid:** Use `text-primary`, `text-secondary`, `text-muted`, `bg-surface-*`, `bg-hover`, inline product colors for chip dots/spinner, and add T-U-102/T-U-103 source/render assertions. [CITED: product Test Plan §4.4]  
**Warning signs:** Snapshots or source grep contain `text-gray`, `bg-slate`, `border-zinc`, or similar. [CITED: product Test Plan §4.4]

## Code Examples

### App-Store Factory Shape

```typescript
// Source: src/renderer/stores/appStore.ts createFileExplorer pattern.
createFlashQueryVault(workspaceId, position?, placement?) {
  const panelId = generateId()
  const panel: PanelState = {
    id: panelId,
    type: 'flashqueryVault',
    title: 'FlashQuery Vault',
    isDirty: false,
  }
  set((state) => ({
    workspaces: state.workspaces.map((ws) =>
      ws.id === workspaceId ? { ...ws, panels: { ...ws.panels, [panelId]: panel } } : ws,
    ),
  }))
  placePanel(panelId, 'flashqueryVault', placement, position, workspaceId === get().selectedWorkspaceId)
  return panelId
}
```

### File-Tree Interaction Semantics To Mirror

```typescript
// Source: src/renderer/sidebar/FileTreeNode.tsx
// Single click selects only; double-click opens; context-menu result chooses dock/canvas.
onSelect(node.path, { shift: e.shiftKey, cmd: e.metaKey || e.ctrlKey })
onFileOpen(paths, 'dock')
onFileOpen(pathsToOpen, 'canvas')
```

### FlashQuery URI Construction

```typescript
// Source: planned shared helper src/shared/flashqueryUri.ts
buildVaultUri(workspaceId, entry.vaultPath)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic renderer tool executor | Domain-shaped preload/main calls: set/list/get/write/status | Phase 3 completed 2026-05-29 | Phase 4 should call typed methods only. [CITED: .planning/phases/03-ipc-surface/03-03-SUMMARY.md] |
| Body parsing for metadata | `list_vault` returns normalized entries with optional `title` | Phase 3 completed 2026-05-29 | Vault rows can display title without reading bodies. [CITED: .planning/phases/03-ipc-surface/03-03-SUMMARY.md] |
| Local filesystem tree behavior | Separate FlashQuery vault tree that mirrors interactions | Phase 4 target | Avoids filesystem mutation and forbidden create actions. [CITED: product Requirements INV-03, REQ-040] |

**Deprecated/outdated:**
- Reusing local-folder context menu for vault folders is explicitly forbidden for v1. [CITED: product Requirements §6.8.1]
- Implementing a full settings dialog in Phase 4 is out of scope. [CITED: .planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A warning sign for missing retry is UI code attempting to misuse `flashquerySetConnection` as retry. | Common Pitfalls | Low; planner can still require a narrow retry IPC. |
| A2 | Import failures or manual DOM dispatch are likely if RTL is not installed. | Common Pitfalls | Low; planner can choose either dependency install or lower-level tests. |

## Open Questions (RESOLVED)

1. **RESOLVED: Phase 4 adds a narrow `flashqueryRetry` IPC method.**
   What we know: manager has `retry(workspaceId)`, but preload/types do not expose it. [VERIFIED: codebase grep]  
   Chosen decision: Plan 03 exposes `flashqueryRetry(workspaceId)` through shared IPC channel, preload, `ElectronAPI`, and main IPC, delegating to `FlashQueryClientManager.retry`. This satisfies REQ-025 and T-I-028 without exposing a generic manager or MCP executor. [CITED: product Requirements §6.5.2] [CITED: product Test Plan §4.4]

2. **RESOLVED: Phase 4 installs React Testing Library dev dependencies.**
   What we know: product Test Plan names jsdom + React Testing Library, Vitest jsdom is configured, and packages are legitimate. [CITED: product Test Plan §4.4] [VERIFIED: npm registry]  
   Chosen decision: Plan 01 installs `@testing-library/react` and `@testing-library/dom` as approved dev dependencies in the chip/test slice, using the Package Legitimacy Audit above. [VERIFIED: npm registry]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts and typecheck | Available but unsupported locally | v24.7.0 | Use Node 20 or 22 via existing Phase 3 pattern. [VERIFIED: shell] [CITED: .planning/phases/03-ipc-surface/03-03-SUMMARY.md] |
| npm | package/test commands | Yes | 11.5.1 | Use npm to match lockfile. [VERIFIED: shell] |
| rg | codebase inspection | Yes | installed | grep/find if missing. [VERIFIED: shell] |
| slopcheck | package legitimacy | Yes | 0.6.1 observed; no `--json` support | Plain output is usable. [VERIFIED: shell] |
| @testing-library/react | Product component tests | Not installed | 16.3.2 current on npm | Add dev dependency or use lower-level React DOM tests. [VERIFIED: codebase grep] [VERIFIED: npm registry] |
| Graphify | semantic graph context | Disabled / no graph file | — | Use direct code/doc inspection. [VERIFIED: shell] |

**Missing dependencies with no fallback:** none. [VERIFIED: shell]  
**Missing dependencies with fallback:** `@testing-library/react` / `@testing-library/dom`; add them or use lower-level React DOM testing. [VERIFIED: codebase grep] [VERIFIED: npm registry]

## Testing Architecture

Nyquist validation is explicitly disabled in `.planning/config.json`, so the formal Validation Architecture section is omitted. Phase 4 still needs the product-mandated focused tests below. [VERIFIED: codebase grep] [CITED: product Test Plan §4.4]

| Req ID | Test IDs | File |
|--------|----------|------|
| REQ-014 | T-U-051..054 | `src/shared/panels.test.ts`, `src/renderer/panels/registry.test.ts`, `src/renderer/stores/appStore.test.ts` [CITED: product Test Plan §4.4] |
| REQ-024, REQ-025, REQ-026 | T-I-015..021, T-U-103 | `src/renderer/components/Chip.test.tsx` [CITED: product Test Plan §4.4] |
| REQ-015, REQ-019 | T-I-022..031 | `src/renderer/panels/FlashQueryVaultPanel.test.tsx` [CITED: product Test Plan §4.4] |
| REQ-016, REQ-017, REQ-040 | T-I-032..043 | `src/renderer/panels/FlashQueryVaultPanel.test.tsx` [CITED: product Test Plan §4.4] |
| REQ-018 | T-I-044..049 | `src/renderer/panels/FlashQueryVaultPanel.test.tsx` [CITED: product Test Plan §4.4] |
| REQ-045 design-token discipline | T-U-102..103 | Vault panel and chip tests [CITED: product Test Plan §4.4] |

**Quick run command:** `npm test -- src/renderer/components/Chip.test.tsx src/renderer/panels/FlashQueryVaultPanel.test.tsx src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts` [VERIFIED: package.json]  
**Typecheck command:** `npm run typecheck` with Node 20 or 22 if local Node remains v24. [VERIFIED: package.json] [VERIFIED: shell]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | Indirect | Renderer never reads bearer token; Phase 4 consumes sanitized connection metadata only. [CITED: product Requirements INV-01, INV-02] |
| V3 Session Management | No | MCP is stateless from renderer perspective in this phase. [CITED: AGENTS.md] |
| V4 Access Control | Yes | Workspace ID is passed through typed preload/main IPC; no cross-workspace global tree state. [CITED: AGENTS.md] [VERIFIED: codebase grep] |
| V5 Input Validation | Yes | Renderer calls typed preload APIs; main Phase 3 validates workspace/connection/list args. [CITED: .planning/phases/03-ipc-surface/03-CONTEXT.md] |
| V6 Cryptography | No direct crypto | Do not handle tokens in renderer or add key storage. [CITED: product Requirements INV-02] |

### Known Threat Patterns for Electron Renderer

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Renderer privilege escalation via Node/Electron APIs | Elevation of privilege | Use `window.electronAPI` only; no direct Electron/Node imports in renderer. [CITED: AGENTS.md] |
| Data boundary confusion between local filesystem and vault | Tampering / Information disclosure | Vault panel uses only `flashqueryListVault` and not `fs:*` IPC. [CITED: product Requirements INV-03] |
| Secret leakage into renderer state/logs | Information disclosure | Phase 4 reads `workspace.flashqueryConnection.url` only; no bearer token display or storage. [CITED: product Requirements INV-02] |
| Unauthorized vault mutation through UI affordance | Tampering | No create/rename/delete/archive/tag/move/copy menu or shortcut in v1. [CITED: product Requirements REQ-040] |

## Sources

### Primary (HIGH confidence)
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` - Spec §6.4, §6.5, §6.8.1, invariants INV-01, INV-03, INV-06, INV-10, INV-11, INV-12. [CITED]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` - Test Plan §4.4 and T-U-051..054, T-I-015..049, T-U-102..103. [CITED]
- `.planning/phases/04-vault-panel-shared-chip/04-CONTEXT.md` - locked decisions and owner instruction to read product docs first. [CITED]
- `.planning/phases/03-ipc-surface/03-03-SUMMARY.md` - available Phase 3 IPC/URI behavior. [CITED]
- Context7 `/reactjs/react.dev` - `lazy`, `Suspense`, effect cleanup, stale fetch guard. [CITED]
- Context7 `/pmndrs/zustand/v5.0.12` - typed store actions and `getState` pattern. [CITED]
- Context7 `/vitest-dev/vitest/v3_2_4` - jsdom, mocks, snapshots. [CITED]
- Context7 `/testing-library/react-testing-library` - RTL package/install/render/fireEvent patterns. [CITED]

### Secondary (MEDIUM confidence)
- npm registry for `@testing-library/react` and `@testing-library/dom` versions, repository URLs, publish dates, no postinstall scripts, and download API counts. [VERIFIED: npm registry]
- Local code inspection of `src/shared/types.ts`, `src/shared/panels.ts`, `src/renderer/panels/registry.ts`, `src/renderer/stores/appStore.ts`, `src/renderer/sidebar/FileTreeNode.tsx`, `src/renderer/sidebar/FileExplorer.tsx`, `src/renderer/stores/uiStore.ts`, `src/shared/electron-api.d.ts`, `src/preload/index.ts`, and `src/main/flashquery/uri.ts`. [VERIFIED: codebase grep]

### Tertiary (LOW confidence)
- None beyond assumptions listed in the Assumptions Log. [VERIFIED: codebase grep]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing Cate stack verified in package/code and docs fetched from Context7. [VERIFIED: package.json] [CITED: /reactjs/react.dev]
- Architecture: HIGH - product docs and code agree on renderer/preload/main separation and panel registration shape. [CITED: product Requirements] [VERIFIED: codebase grep]
- Pitfalls: MEDIUM - missing retry/dialog hooks are directly verified, but exact remediation remains a planner choice. [VERIFIED: codebase grep]

**Research date:** 2026-05-29  
**Valid until:** 2026-06-05 for package/test dependency currency; Cate codebase findings remain valid until relevant files change.
