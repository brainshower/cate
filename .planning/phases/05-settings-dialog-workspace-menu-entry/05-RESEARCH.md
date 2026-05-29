# Phase 05: Settings Dialog + Workspace Menu Entry - Research

**Researched:** 2026-05-29  
**Domain:** Electron preload/main IPC, React dialog UI, Zustand transient UI state, native workspace context menu  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Source Authority
- **D-01:** Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 5. These docs are the primary source for REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039, and tests T-U-055, T-I-050..078, T-U-104.
- **D-02:** If local planning docs, roadmap rows, code comments, or existing Cate conventions appear ambiguous, agents MUST re-read the external requirements and test-plan docs first, then inspect the existing code, before asking the user.
- **D-03:** The project owner explicitly requested that all downstream implementation agents refer to the external requirements and test-plan docs first. Every Phase 5 plan task that touches implementation or tests must include both docs in `<read_first>`.

### Dialog Scope
- **D-04:** Create `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`, structurally mirroring `src/renderer/dialogs/SavedLayoutsDialog.tsx`; do not introduce a third-party dialog framework.
- **D-05:** The dialog is controlled by `showFlashQueryConnectionDialog` and `setShowFlashQueryConnectionDialog(show: boolean)` in `src/renderer/stores/uiStore.ts`, initialized to `false` and mounted alongside existing root dialogs.
- **D-06:** Dialog chrome must reuse Cate's established overlay, close button, Escape-to-close, and click-outside behavior. Title bar content is locked: teal Phosphor `Lightning`, title `FlashQuery Connection`, subtitle `For workspace: <workspace name>` in muted text, and standard close `X`.
- **D-07:** Dialog state must be ephemeral. Each open re-reads the current workspace connection and token; field edits are discarded on cancel, close, Escape, click-outside, and between opens.

### Form Behavior
- **D-08:** URL field values are locked: label `FlashQuery URL`, text input, placeholder `https://fq.example.com` or `http://localhost:3100`, helper text `The HTTP base URL where FlashQuery's MCP server is listening.`, and blur/save validation requiring parseable `http:` or `https:` URL.
- **D-09:** Bearer token field values are locked: label `Bearer token`, password by default, Phosphor `Eye` / `EyeSlash` reveal toggle, helper text `A bearer token issued by FlashQuery. Stored locally with this workspace.`, and no validation beyond non-empty where required by a save/test flow.
- **D-10:** Edit mode prepopulates URL from `WorkspaceInfo.flashqueryConnection.url` and token through the existing preload/IP C contract for token retrieval or connection details. First-time setup leaves fields empty.

### Test Connection
- **D-11:** The dialog must include a `Test connection` button below the bearer-token field.
- **D-12:** Test connection probes the current field values without persistence. Prefer the Phase 3 `flashquery:probe` IPC if present; otherwise add the narrow IPC/preload/shared channel surface required to issue `GET /mcp/info` against the form URL without storing connection metadata or token.
- **D-13:** Successful test results render a green `CheckCircle` and `Connected to FlashQuery v<version> (instance <instance_id_short>)`. Failed tests render a red `XCircle` and a one-line error reason.
- **D-14:** The result area starts empty and clears between attempts. Test connection must not dispatch `flashquery:setConnection`.

### Save, Cancel, And Remove
- **D-15:** Save validates the URL, dispatches `flashquery:setConnection(workspaceId, { transport: 'http', url, auth: { type: 'bearer', token } })`, closes on success, and surfaces the error while keeping the dialog open on failure.
- **D-16:** Save is the primary action with teal styling (`#5AD8B8`) and a visible focus ring.
- **D-17:** Cancel, close `X`, Escape, and click-outside close without saving and without any IPC writes.
- **D-18:** Remove connection is a footer-left muted destructive ghost action. First-time setup disables it with tooltip `Currently no connection to remove.` Edit mode shows inline confirmation `Really remove?` with adjacent `Yes` / `No` affordances. Confirming dispatches `flashquery:setConnection(workspaceId, null)` and closes.

### Workspace Context Menu
- **D-19:** Add `{ id: 'flashquery-connection', label: 'FlashQuery Connection...' }` to the native workspace context menu in `src/renderer/sidebar/WorkspaceTab.tsx`, positioned between `copy-cwd` and the duplicate group with surrounding separators.
- **D-20:** Handle `case 'flashquery-connection':` by calling `useUIStore.getState().setShowFlashQueryConnectionDialog(true)`.
- **D-21:** Do not introduce a custom React dropdown for workspace context menus. Cate's native `window.electronAPI.showContextMenu()` remains the rendering layer.
- **D-22:** The menu item is always present whenever the workspace context menu opens.

### Design And Styling
- **D-23:** Phase 5 UI must feel like Cate's existing dense desktop tool UI: restrained, token-based, and dialog-native. Do not create a marketing surface, standalone visual language, or decorative layout.
- **D-24:** Use existing Cate semantic utility classes from `src/renderer/styles/globals.css` such as `text-primary`, `text-secondary`, `text-muted`, `bg-surface-*`, and `bg-hover`. Avoid stock Tailwind neutral palette classes (`zinc`, `gray`, `slate`) in the rendered dialog.
- **D-25:** Icons come from `@phosphor-icons/react` to match Cate's existing icon library.

### Testing
- **D-26:** Add or extend `src/renderer/stores/uiStore.test.ts` for T-U-055.
- **D-27:** Add `src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` for T-I-050..074 and T-U-104.
- **D-28:** Extend `src/renderer/sidebar/WorkspaceTab.test.tsx` for T-I-075..078.
- **D-29:** Run focused tests for the changed files plus `npm run typecheck`. If the local default Node is outside Cate's `>=20 <23` engine, use the established project pattern from prior phases: run through Node 22 and note that in summaries.

### the agent's Discretion
- The planner may decide whether to add one or more narrow preload/shared types for test-probe and token prepopulation if existing Phase 3 APIs are insufficient, provided privileged work stays in main/preload and renderer state does not expose secrets outside the dialog form.
- The planner may choose a compact helper for URL validation and result formatting if it makes tests clearer and stays local to the dialog or an existing renderer utility pattern.
- The planner may split Phase 5 into three roadmap-aligned plans or smaller test-first slices, provided every Phase 5 requirement ID appears in at least one plan frontmatter `requirements` list.

### Deferred Ideas (OUT OF SCOPE)
- Editor URI-awareness, save routing, local Git diff guardrails, dirty-state handling, and editor vault badge belong to Phase 6.
- Full Electron E2E happy path, restart behavior, existing E2E regression, and manual/design checklist belong to Phase 7.
- Vault document creation, rename/delete/archive/tag/move, frontmatter editing, conflict detection, live vault notifications, OAuth, token refresh, keychain migration, and stdio transport remain outside v1 or future work.
</user_constraints>

## Summary

Phase 5 is a renderer-facing UI phase with one small main/preload gap: the existing FlashQuery IPC supports save/list/read/write/retry/status, but it does not currently expose a dry-run probe or token-read method for dialog prepopulation. [VERIFIED: codebase grep `src/shared/ipc-channels.ts`, `src/preload/index.ts`, `src/shared/electron-api.d.ts`, `src/main/ipc/flashquery.ts`] The planner should include a narrow contract for `flashquery:probe` and `flashquery:getToken` or equivalent connection-details read, implemented through main/preload only. [CITED: product requirements §6.7.2-§6.7.3]

The UI-store boolean already exists and has focused tests, so the first implementation slice should not recreate it; it should mount `FlashQueryConnectionDialog` in the root modal section of `App.tsx` and add the component/test shell. [VERIFIED: codebase `src/renderer/stores/uiStore.ts:54`, `:77`, `:103`, `:128`; `src/renderer/stores/uiStore.test.ts:4`] The dialog must mirror `SavedLayoutsDialog` overlay/Escape/click-outside behavior while using the locked FlashQuery title bar, form labels, helper text, test result rendering, save/cancel/remove behavior, and no stock neutral Tailwind classes. [CITED: product requirements §6.7.1-§6.7.5]

The workspace menu currently uses native `window.electronAPI.showContextMenu(items)` in `WorkspaceTab.tsx`; Phase 5 should insert the FlashQuery item after `copy-cwd`, add a separator before and after the item group, and handle the returned id by opening the UI-store dialog. [VERIFIED: codebase `src/renderer/sidebar/WorkspaceTab.tsx:296-343`] This should be covered by extending `WorkspaceTab.test.tsx`, which currently only covers `TerminalPanelRow`, so the planner should add a new render harness for `WorkspaceTab` context-menu behavior. [VERIFIED: codebase `src/renderer/sidebar/WorkspaceTab.test.tsx`]

**Primary recommendation:** Plan three slices: IPC gaps for dry-run probe/token read, dialog shell + full form behavior, then native workspace menu wiring and focused tests. [VERIFIED: 05-CONTEXT.md; CITED: product test plan §4.5]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Dialog visibility and ephemeral form state | Browser / Client | — | Zustand and React own transient UI state; field edits are discarded on close/open. [VERIFIED: codebase `uiStore.ts`; CITED: product requirements §6.7.4] |
| Save/remove connection | API / Backend (Electron main IPC) | Preload bridge, Browser / Client | Renderer submits intent; main validates, updates workspace metadata, stores/clears token, disposes/probes manager state. [VERIFIED: codebase `src/main/ipc/flashquery.ts:80-104`] |
| Dry-run test connection | API / Backend (Electron main IPC) | Preload bridge, Browser / Client | Product requires probing current form values without persistence; privileged fetch and token handling must stay out of renderer. [CITED: product requirements §6.7.3; Context7 Electron docs] |
| Edit-mode token prepopulation | API / Backend (Electron main IPC) | Preload bridge, Browser / Client | Token is stored in main via `getWorkspaceToken`; renderer should receive it only inside the dialog flow through a narrow preload API. [VERIFIED: codebase `src/main/flashquery/credentials.ts:22-35`; CITED: product requirements §6.7.2] |
| Workspace context-menu entry | Browser / Client | Preload/native menu IPC | `WorkspaceTab` builds the item array; native menu rendering remains `window.electronAPI.showContextMenu`. [VERIFIED: codebase `WorkspaceTab.tsx:296-309`; CITED: product requirements §6.7.6] |

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-034 | `FlashQueryConnectionDialog` modal component | Create `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`, mirror `SavedLayoutsDialog`, mount from `App.tsx`. [CITED: product requirements §6.7.1; VERIFIED: codebase `SavedLayoutsDialog.tsx`, `App.tsx:487-493`] |
| REQ-035 | URL and bearer-token fields | Use locked labels/helper text/placeholder, password field, Phosphor reveal toggle, edit-mode token prepopulation through main/preload. [CITED: product requirements §6.7.2] |
| REQ-036 | Test connection inline action | Add or expose narrow dry-run probe IPC; do not call `flashquerySetConnection`. [CITED: product requirements §6.7.3; VERIFIED: codebase gap in current IPC/preload files] |
| REQ-037 | Save, cancel, remove flows | Save calls `flashquerySetConnection`, cancel/close paths call no write IPC, remove confirms then calls `flashquerySetConnection(workspaceId, null)`. [CITED: product requirements §6.7.4] |
| REQ-038 | UI-store dialog visibility | Already present; planner should verify and mount dialog using it. [VERIFIED: codebase `uiStore.ts:54`, `:77`, `:103`, `:128`] |
| REQ-039 | Workspace context-menu addition | Insert native menu item between `copy-cwd` and duplicate group; handle id by opening UI-store dialog. [CITED: product requirements §6.7.6; VERIFIED: codebase `WorkspaceTab.tsx:296-343`] |

## Project Constraints (from AGENTS.md)

- Use existing Electron, React, TypeScript, Zustand, IPC, Vitest/Playwright stack; do not add a web backend or UI framework. [VERIFIED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work goes through typed preload APIs and main-process validation. [VERIFIED: AGENTS.md]
- FlashQuery data remains in the configured FlashQuery instance/vault; Cate stores only connection metadata, preferences, and UI/session state. [VERIFIED: AGENTS.md]
- Connection behavior must be workspace-aware; different Cate projects can use different FlashQuery instances or vaults. [VERIFIED: AGENTS.md]
- Prefer FlashQuery host-visible MCP/HTTP surface; stdio remains out of scope unless explicitly approved. [VERIFIED: AGENTS.md; CITED: product requirements §3.2]
- Do not break existing Cate panels, agents, terminal, editor, browser, Git, workspace, or layout behavior. [VERIFIED: AGENTS.md; CITED: product requirements INV-12]
- Codebase conventions: TypeScript strict mode, ESM, named exports for utilities/stores, project path aliases where local convention supports them, single quotes, 2-space indentation, no semicolons in normal TS/TSX. [VERIFIED: AGENTS.md]
- Test convention: colocated Vitest tests; `.test.tsx` runs jsdom and `.test.ts` runs node via `vitest.config.ts`. [VERIFIED: codebase `vitest.config.ts`]

## Standard Stack

### Core

| Library | Project Version | Registry Current | Purpose | Why Standard |
|---------|-----------------|------------------|---------|--------------|
| Electron | `^41.2.0` | `42.3.0`, modified 2026-05-29 | Main/preload/renderer process boundary and native context menu IPC | Existing app shell; Electron docs recommend exposing specific preload helpers rather than raw `ipcRenderer`. [VERIFIED: npm registry; CITED: https://www.electronjs.org/docs/latest/tutorial/ipc] |
| React / React DOM | `^18.3.0` | React `19.2.6`, modified 2026-05-28 | Dialog component rendering | Existing renderer app is React 18; do not upgrade in this phase. [VERIFIED: package.json; VERIFIED: npm registry] |
| Zustand | `^5.0.0` | `5.0.14`, modified 2026-05-28 | UI-store visibility state and direct `getState()` menu action | Existing stores use Zustand; official docs support `getState`/`setState` outside components. [VERIFIED: npm registry; CITED: Context7 `/pmndrs/zustand/v5.0.12`] |
| Vitest + jsdom | Vitest `^3.2.4`, jsdom `^29.1.1` | Vitest `4.1.7`, modified 2026-05-20 | Dialog/store/menu tests | Existing config maps `.test.tsx` to jsdom using `environmentMatchGlobs`. [VERIFIED: codebase `vitest.config.ts`; CITED: Context7 `/vitest-dev/vitest/v3_2_4`] |
| `@phosphor-icons/react` | `^2.1.10` | `2.1.10`, modified 2025-05-22 | `Lightning`, `Eye`, `EyeSlash`, `CheckCircle`, `XCircle`, `X` icons | Existing Cate UI uses Phosphor; Phase 5 decisions lock Phosphor icons. [VERIFIED: package.json; VERIFIED: npm registry; VERIFIED: 05-CONTEXT.md] |

### Supporting

| Library | Project Version | Registry Current | Purpose | When to Use |
|---------|-----------------|------------------|---------|-------------|
| `@modelcontextprotocol/sdk` | `^1.29.0` | `1.29.0`, modified 2026-03-30 | Existing FlashQuery MCP client path | Do not add for Phase 5; use existing manager/probe helpers or a narrow main-process fetch. [VERIFIED: package.json; VERIFIED: npm registry; VERIFIED: codebase `clientManager.ts`] |
| `electron-store` | `^10.0.0` | `11.0.2`, modified 2026-04-24 | Existing token persistence via `credentials.ts` | Do not expose store directly; read token through a main IPC helper if prepopulation is required. [VERIFIED: package.json; VERIFIED: npm registry; VERIFIED: codebase `credentials.ts`] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing `SavedLayoutsDialog` chrome | Third-party dialog package | Rejected by locked decision and product requirements; would add unnecessary dependency and visual drift. [CITED: product requirements §6.7.1] |
| Narrow `flashquery:probe` | Dry-run flag on `flashquery:setConnection` | Probe channel is clearer and avoids accidental persistence; product permits either but requires no persistence. [CITED: product requirements §6.7.3] |
| Main IPC token read | Storing token in renderer app store | Renderer store persistence would violate token boundary; only dialog-local value should receive the token if needed. [VERIFIED: AGENTS.md; VERIFIED: codebase `credentials.ts`] |

**Installation:** No new external package installation is recommended for Phase 5. [VERIFIED: package.json; VERIFIED: codebase imports]

## Package Legitimacy Audit

No new external packages are recommended. The Package Legitimacy Gate is not required because Phase 5 should use existing dependencies only. [VERIFIED: package.json; VERIFIED: 05-CONTEXT.md]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| None | — | — | — | — | — | No install |

**Packages removed due to slopcheck [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```text
Workspace native context menu
  -> WorkspaceTab.handleContextMenu()
  -> window.electronAPI.showContextMenu(items)
  -> selected id: flashquery-connection
  -> useUIStore.setShowFlashQueryConnectionDialog(true)
  -> App modal root mounts FlashQueryConnectionDialog
  -> Dialog reads selected WorkspaceInfo from useAppStore
  -> Dialog requests token via narrow preload IPC (needed gap)
  -> User actions:
       Test connection -> preload flashqueryProbe -> main GET /mcp/info -> result only, no persistence
       Save -> preload flashquerySetConnection -> main validate/update workspace/store token/connect
       Remove -> preload flashquerySetConnection(null) -> main clear metadata/token/dispose
       Cancel/close -> local close only
```

### Recommended Project Structure

```text
src/
├── shared/
│   ├── ipc-channels.ts              # add FLASHQUERY_PROBE and token/details channel if chosen
│   ├── electron-api.d.ts            # add typed preload methods and result types
│   └── types.ts                     # add FlashQueryProbeResult if not kept local
├── main/ipc/
│   ├── flashquery.ts                # add dry-run probe and token-read handlers
│   └── flashquery.test.ts           # add main IPC coverage if handler behavior changes
├── preload/
│   └── index.ts                     # expose narrow flashqueryProbe/getToken helpers
└── renderer/
    ├── dialogs/
    │   ├── FlashQueryConnectionDialog.tsx
    │   └── FlashQueryConnectionDialog.test.tsx
    ├── stores/
    │   ├── uiStore.ts               # already has state; verify, do not duplicate
    │   └── uiStore.test.ts          # already covers T-U-055; extend only if needed
    ├── sidebar/
    │   ├── WorkspaceTab.tsx
    │   └── WorkspaceTab.test.tsx
    └── App.tsx                      # import and mount dialog beside SavedLayoutsDialog
```

### Pattern 1: Preload-Only IPC Exposure

**What:** Expose a named renderer API that wraps a fixed channel and argument list. [CITED: https://www.electronjs.org/docs/latest/tutorial/ipc]  
**When to use:** Any renderer-to-main FlashQuery operation, including probe and token prepopulation. [VERIFIED: AGENTS.md]  
**Example:**

```ts
// Source: Electron IPC tutorial + local preload pattern
flashqueryProbe(workspaceId: string, connection: FlashQueryConnection): Promise<FlashQueryProbeResult> {
  return ipcRenderer.invoke(FLASHQUERY_PROBE, workspaceId, connection)
}
```

### Pattern 2: Dialog Mounting Beside Existing Modals

**What:** Import the dialog in `App.tsx` and render it in the modal overlay section with `SavedLayoutsDialog` and `PostUpdateFeedbackDialog`. [VERIFIED: codebase `App.tsx:487-493`]  
**When to use:** Phase 5 dialog should be globally available from workspace menu and vault panel actions. [CITED: product requirements §6.7.5]  
**Example:**

```tsx
// Source: local App.tsx modal pattern
<SavedLayoutsDialog />
<FlashQueryConnectionDialog />
<PostUpdateFeedbackDialog />
```

### Pattern 3: Native Workspace Menu Switch

**What:** Add item to the `NativeContextMenuItem[]`, then act on the returned id in the same switch. [VERIFIED: codebase `WorkspaceTab.tsx:296-343`]  
**When to use:** Workspace-level actions in the sidebar. [CITED: product requirements §6.7.6]  
**Example:**

```ts
// Source: local WorkspaceTab.tsx pattern
{ id: 'copy-cwd', label: 'Copy Working Directory' },
{ type: 'separator' },
{ id: 'flashquery-connection', label: 'FlashQuery Connection…' },
{ type: 'separator' },
{ id: 'duplicate', label: 'Duplicate Workspace' },
```

### Anti-Patterns to Avoid

- **Renderer fetch to `/mcp/info`:** violates renderer/main separation and token boundary; probe belongs in main IPC. [VERIFIED: AGENTS.md; CITED: Electron IPC docs]
- **Using `flashquerySetConnection` for Test connection without a hard dry-run contract:** risks persistence during a test-only action. [CITED: product requirements §6.7.3]
- **Persisting dialog edits in Zustand/app store:** product requires ephemeral dialog state and re-read on each open. [CITED: product requirements §6.7.4]
- **Custom React context menu:** product and AGENTS require native menu path for workspace menu. [CITED: product requirements §6.7.6]
- **New UI framework or stock Tailwind neutral classes:** violates project constraints and visual invariants. [VERIFIED: AGENTS.md; CITED: product test plan T-U-104]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native context menu rendering | Custom dropdown/menu overlay | Existing `window.electronAPI.showContextMenu(items)` | Product invariant locks native menu rendering. [CITED: product requirements INV-11] |
| Dialog state store | New global store or persistent app-state field | Existing `useUIStore.showFlashQueryConnectionDialog` | State exists and matches Phase 4 placeholder. [VERIFIED: codebase `uiStore.ts`] |
| Token persistence | Renderer localStorage/session state | `getWorkspaceToken`/`setWorkspaceToken` via main IPC | Token helpers already centralize storage. [VERIFIED: codebase `credentials.ts`] |
| URL validation | Regex-only parser | `new URL()` plus protocol check | Existing IPC validates URL this way. [VERIFIED: codebase `flashquery.ts:49-58`] |
| `/mcp/info` parsing | Separate renderer parser | Shared main helper or extracted main utility from `clientManager` | Existing manager already knows info URL and response shape. [VERIFIED: codebase `clientManager.ts:324-336`] |

**Key insight:** The deceptively complex parts are process-boundary and persistence semantics, not the React form. Keep privileged connection work in main, keep dialog state ephemeral, and prove "Test connection" never writes. [CITED: product requirements §6.7.3-§6.7.4]

## Common Pitfalls

### Pitfall 1: Assuming Existing FlashQuery IPC Covers Dialog Needs
**What goes wrong:** The dialog cannot prepopulate the token or dry-run probe without either leaking secrets or misusing save IPC. [VERIFIED: codebase gap in `ipc-channels.ts`, `preload/index.ts`, `electron-api.d.ts`]  
**Why it happens:** Phase 3 implemented set/list/get/write/retry/status, not dialog-only read/probe. [VERIFIED: codebase `flashquery.ts:155-174`]  
**How to avoid:** Add narrow main/preload methods for probe and token/details, with main tests. [CITED: product requirements §6.7.2-§6.7.3]  
**Warning signs:** Dialog test uses `flashquerySetConnection` for "Test connection" or reads token from workspace metadata. [CITED: product test plan T-I-065]

### Pitfall 2: Duplicating UI Store State
**What goes wrong:** Multiple booleans can desynchronize vault panel, workspace menu, and root dialog. [VERIFIED: codebase `FlashQueryVaultPanel.tsx:39`, `uiStore.ts:54`]  
**Why it happens:** Phase 4 already added the placeholder. [VERIFIED: codebase `uiStore.test.ts:4-20`]  
**How to avoid:** Reuse `showFlashQueryConnectionDialog` and only mount the component. [VERIFIED: codebase]

### Pitfall 3: Workspace Menu Test Harness Underestimation
**What goes wrong:** Planner assumes `WorkspaceTab.test.tsx` already has context-menu harnesses, but it currently covers terminal row indicators only. [VERIFIED: codebase `WorkspaceTab.test.tsx`]  
**Why it happens:** Existing `WorkspaceTab` export is testable, but setup requires mocking status, dock, agent, and electron API dependencies. [VERIFIED: codebase `WorkspaceTab.tsx` imports]  
**How to avoid:** Plan a small harness that renders `WorkspaceTab`, stubs `window.electronAPI.showContextMenu`, triggers `contextmenu`, captures items, and resolves `flashquery-connection`. [VERIFIED: codebase pattern from `FlashQueryVaultPanel.test.tsx`]

### Pitfall 4: Token Exposure Beyond Dialog Local State
**What goes wrong:** A token added to `WorkspaceInfo`, Zustand app store, logs, or errors can persist or leak outside the dialog. [VERIFIED: AGENTS.md; VERIFIED: codebase `workspaceManager.ts` sanitization pattern]  
**Why it happens:** Edit-mode prepopulation needs a token read, but workspace metadata intentionally sanitizes auth. [VERIFIED: codebase grep `sanitizeFlashQueryConnection`]  
**How to avoid:** Return token only from a narrow main IPC handler, store it in component-local state, and clear it on close/open. [CITED: product requirements §6.7.2, §6.7.4]

### Pitfall 5: Node Version Mismatch
**What goes wrong:** Local `npm` commands run under Node 24, outside Cate's `>=20 <23` engine. [VERIFIED: environment probe `node --version` = `v24.7.0`; VERIFIED: package.json engines]  
**Why it happens:** Machine default is newer than project constraint. [VERIFIED: environment probe]  
**How to avoid:** Use Node 22 for verification, e.g. `npx -p node@22 npm test -- ...` or project-approved Node manager. [VERIFIED: environment probe `npx -p node@22 node --version` = `v22.22.3`]

## Code Examples

### URL Validation Helper

```ts
// Source: local src/main/ipc/flashquery.ts validateConnection pattern
function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}
```

### Dialog Close Pattern

```tsx
// Source: local src/renderer/dialogs/SavedLayoutsDialog.tsx
useEffect(() => {
  if (!show) return
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }
  document.addEventListener('keydown', handler, { capture: true })
  return () => document.removeEventListener('keydown', handler, { capture: true })
}, [show, close])
```

### Renderer Test Double Pattern

```ts
// Source: local src/renderer/panels/FlashQueryVaultPanel.test.tsx
Object.defineProperty(window, 'electronAPI', {
  configurable: true,
  value: {
    flashquerySetConnection: vi.fn().mockResolvedValue(undefined),
    flashqueryProbe: vi.fn().mockResolvedValue({ ok: true, version: '1.2.3', instanceId: 'fq-instance-1' }),
    flashqueryGetToken: vi.fn().mockResolvedValue('secret'),
  },
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Expose broad Electron APIs to renderer | Expose specific preload functions wrapping fixed IPC channels | Current Electron security docs | Phase 5 probe/token read must be named helpers, not raw `ipcRenderer`. [CITED: https://www.electronjs.org/docs/latest/tutorial/ipc] |
| Custom menu overlays for workspace actions | Native `showContextMenu` item arrays | Existing Cate implementation | Menu work is array insertion and switch handling. [VERIFIED: codebase `WorkspaceTab.tsx`] |
| Phase 5 would add UI-store state | Phase 4 already added `showFlashQueryConnectionDialog` | Phase 4 completion | Planner should verify/extend tests, not duplicate store state. [VERIFIED: codebase `uiStore.ts`; VERIFIED: STATE.md] |

**Deprecated/outdated:** No new deprecated package APIs were found for this phase. React 19 and Electron 42 are current on npm, but Cate is pinned to React 18/Electron 41 and Phase 5 should not upgrade. [VERIFIED: npm registry; VERIFIED: package.json]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A narrow `flashquery:getToken` IPC is the Phase 5 plan contract when implemented through main/preload and kept dialog-local. [RESOLVED] | Summary, Architecture Patterns | If future security review rejects token-return-to-renderer even inside dialog, a later follow-up can switch to a masked "unchanged token" sentinel flow. |
| A2 | The planner may add `FlashQueryProbeResult` to `src/shared/types.ts` instead of keeping it local to `electron-api.d.ts`. [RESOLVED] | Recommended Project Structure | Type placement can be adjusted during implementation to match existing shared type conventions without changing behavior. |

## Open Questions (RESOLVED)

1. **Token prepopulation exact contract**
   - What we know: Product requires edit mode fields pre-populated from `WorkspaceInfo.flashqueryConnection` plus `getWorkspaceToken`; current preload API has no token read. [CITED: product requirements §6.7.2; VERIFIED: codebase]
   - Resolution: Plan a narrow `flashqueryGetToken(workspaceId)` / `flashqueryGetConnectionSecret(workspaceId)` IPC that returns `string | null` to dialog-local React state only. Do not store the token in Zustand, workspace metadata, logs, snapshots, broadcasts, or tests. Clear the local token state on every close/reopen. A masked "existing token unchanged" sentinel is not used in Phase 5 because the product requirement explicitly asks for prepopulation from `getWorkspaceToken`.

2. **Probe should reuse manager internals or duplicate fetch helper**
   - What we know: `FlashQueryClientManager` has private `probeConnection`, `buildInfoUrl`, and `parseInfoPayload` helpers. [VERIFIED: codebase `clientManager.ts:194-253`, `:324-336`]
   - Resolution: Keep Phase 5's dialog test as a small main-side dry-run probe helper in `src/main/ipc/flashquery.ts` (or an adjacent main helper imported only by that IPC module), not as a public manager method. This avoids mutating manager connection state, retry timers, subscriptions, or status broadcasts.
   - Requirement resolution: The dialog probe must use the current form URL and token. It should call `GET <url>/mcp/info` and include `Authorization: Bearer <token>` when the user entered a token, while still never persisting the token or connection. This is intentionally separate from the manager's connection-establishment probe, which omits authorization. Tests must prove the dry-run request includes the current token when present, returns 401/403 as an auth failure, and does not call workspace persistence, token write helpers, manager connect, retry, or broadcast paths.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Typecheck/test/build | Available, wrong default version | `v24.7.0` | Use Node 22 through project-approved manager or `npx -p node@22 ...`. [VERIFIED: environment probe] |
| Node 22 via npx | Verification under project engine | Available | `v22.22.3` | Install/use local Node 20/22 if npx cache is unavailable. [VERIFIED: environment probe] |
| npm | Package scripts | Available, tied to Node 24 default | `11.5.1` | Run npm through Node 22. [VERIFIED: environment probe] |
| Vitest | Unit/jsdom tests | Available via project dependency | `^3.2.4` | Use `npm test -- ...` under Node 22. [VERIFIED: package.json] |
| TypeScript | Static typecheck | Available via project dependency | `^5.6.0` | None needed. [VERIFIED: package.json] |

**Missing dependencies with no fallback:** none found. [VERIFIED: environment probe]  
**Missing dependencies with fallback:** default Node version is outside the project engine; use Node 22. [VERIFIED: environment probe; VERIFIED: package.json]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Bearer token handled only via main `credentials.ts` and narrow preload IPC. [VERIFIED: codebase `credentials.ts`; VERIFIED: AGENTS.md] |
| V3 Session Management | no | Phase 5 does not implement user sessions; FlashQuery token expiry/refresh is out of scope. [CITED: product requirements §3.2] |
| V4 Access Control | yes | Workspace id is passed to main IPC; main updates workspace-scoped connection only. [VERIFIED: codebase `flashquery.ts:80-104`] |
| V5 Input Validation | yes | Validate URL with `new URL()` and protocol check before save/probe. [VERIFIED: codebase `flashquery.ts:49-58`] |
| V6 Cryptography | no | Phase 5 does not implement cryptography; token storage abstraction already exists. [VERIFIED: codebase `credentials.ts`] |

### Known Threat Patterns for Electron/FlashQuery Dialog

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Arbitrary IPC from renderer | Elevation of Privilege | Expose only fixed preload methods; never expose raw `ipcRenderer`. [CITED: Electron IPC docs] |
| Token leakage to renderer global state/logs | Information Disclosure | Keep token in main store and dialog-local state only; clear on close/open; do not log token. [VERIFIED: AGENTS.md; VERIFIED: codebase `credentials.ts`] |
| Probe accidentally persists connection | Tampering | Separate `flashqueryProbe` from `flashquerySetConnection`; assert no set call in T-I-065. [CITED: product test plan §4.5.3] |
| SSRF-like arbitrary URL probing | Tampering/Information Disclosure | Phase scope allows user-entered HTTP URL; constrain to `http:`/`https:` and no file/custom protocols. [CITED: product requirements §6.7.2; VERIFIED: codebase validation pattern] |

## Validation Architecture

Skipped because `.planning/config.json` sets `workflow.nyquist_validation` to `false`. [VERIFIED: .planning/config.json]

## Recommended Plan Split

1. **05-01 IPC gaps and dialog shell**
   - Read first: external Requirements and Test Plan. [VERIFIED: 05-CONTEXT.md]
   - Add `FLASHQUERY_PROBE` and token/details read channel if needed; update `electron-api.d.ts`, `preload/index.ts`, and `src/main/ipc/flashquery.ts`. [VERIFIED: codebase gap]
   - Create/mount `FlashQueryConnectionDialog.tsx` with overlay, title bar, close/Escape/click-outside, first render tests T-I-050..055. [CITED: product test plan §4.5.1]

2. **05-02 Form behavior and persistence flows**
   - Implement URL/token fields, reveal toggle, edit/first-time prepopulation, test result state, save/cancel/remove flows. [CITED: product requirements §6.7.2-§6.7.4]
   - Add `FlashQueryConnectionDialog.test.tsx` coverage T-I-056..074 and T-U-104. [CITED: product test plan §4.5.2-§4.5.4]

3. **05-03 Workspace menu wiring**
   - Insert native menu item between `copy-cwd` and duplicate group; add switch case to open UI-store dialog. [CITED: product requirements §6.7.6]
   - Extend `WorkspaceTab.test.tsx` for T-I-075..078 with `showContextMenu` capture/resolve harness. [CITED: product test plan §4.5.5]

## Verification Commands

Run commands under Node 22 because the default Node is `v24.7.0`, outside `>=20 <23`. [VERIFIED: environment probe; VERIFIED: package.json]

```bash
npx -p node@22 npm test -- src/renderer/stores/uiStore.test.ts
npx -p node@22 npm test -- src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx
npx -p node@22 npm test -- src/renderer/sidebar/WorkspaceTab.test.tsx
npx -p node@22 npm test -- src/main/ipc/flashquery.test.ts
npx -p node@22 npm run typecheck
```

## Sources

### Primary (HIGH confidence)
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` - Phase 5 requirements §6.7, invariants, roadmap §8.7. [CITED]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` - Phase 5 tests §4.5, T-U-104, Phase 5 checklist. [CITED]
- `AGENTS.md` - project stack, security boundaries, test/build constraints. [VERIFIED: codebase]
- `.planning/phases/05-settings-dialog-workspace-menu-entry/05-CONTEXT.md` - locked Phase 5 decisions and guardrails. [VERIFIED: codebase]
- `src/renderer/dialogs/SavedLayoutsDialog.tsx` - dialog chrome pattern. [VERIFIED: codebase]
- `src/renderer/stores/uiStore.ts` and `uiStore.test.ts` - existing Phase 4 visibility state. [VERIFIED: codebase]
- `src/renderer/App.tsx` - modal mounting location. [VERIFIED: codebase]
- `src/renderer/sidebar/WorkspaceTab.tsx` and `WorkspaceTab.test.tsx` - native menu implementation and test gap. [VERIFIED: codebase]
- `src/shared/ipc-channels.ts`, `src/shared/electron-api.d.ts`, `src/preload/index.ts`, `src/main/ipc/flashquery.ts` - current FlashQuery IPC/preload surface. [VERIFIED: codebase]
- Context7 `/websites/electronjs` - IPC/preload security pattern. [CITED: https://www.electronjs.org/docs/latest/tutorial/ipc]
- Context7 `/pmndrs/zustand/v5.0.12` - `getState`/`setState` testing and outside-component access. [CITED]
- Context7 `/vitest-dev/vitest/v3_2_4` - jsdom and `environmentMatchGlobs` behavior. [CITED]

### Secondary (MEDIUM confidence)
- npm registry lookups for current package versions and modification dates. [VERIFIED: npm registry]

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - project dependencies and current registry versions were checked; no new packages recommended. [VERIFIED: package.json; VERIFIED: npm registry]
- Architecture: HIGH - local code shows exact main/preload/renderer surfaces and product docs lock behavior. [VERIFIED: codebase; CITED: product docs]
- Pitfalls: HIGH - gaps were verified directly in current IPC/preload files and tests. [VERIFIED: codebase]

**Research date:** 2026-05-29  
**Valid until:** 2026-06-28 for local codebase findings; re-check npm/framework docs before dependency upgrades. [ASSUMED]
