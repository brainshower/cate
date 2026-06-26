# Phase 26: Browser Uplift - Research

**Researched:** 2026-06-26  
**Domain:** Electron webview browser uplift, workspace-scoped state, IPC/preload contracts, React renderer affordances  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- D-01: Downstream agents MUST read the full requirements doc before resolving scope questions: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`.
- D-02: Downstream agents MUST read the full test plan before choosing, naming, or marking tests: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`.
- D-03: If this context conflicts with those two docs, the supplied product docs win unless the local codebase makes a requirement impossible.
- D-04: Phase 26 owns REQ-001 through REQ-012 from the Browser Uplift requirements document.
- D-05: Phase 26 must preserve the product doc's one-phase GSD structure while ordering the work as Browser Foundation, Browser State and Affordances, Workspace Safety and Controls, and System Verification.
- D-06: In-panel tabs, start page, URL autocomplete, per-panel proxy support, DOM extraction, Readability/Turndown, PDF/DOCX extraction, vault writes from captured content, `cate_browser` MCP tooling, FlashQuery server changes, and old per-panel cookie migration remain out of scope.
- D-07: Browser state may share `workspaceId` for scoping, but it must remain separate from FlashQuery tokens, connection metadata, vault documents, indexes, and MCP sessions.
- D-08: Browser webviews use `persist:browser-ws-${workspaceId}`; they must not use `panelId` as the durable partition key.
- D-09: `BrowserPanel` must fail closed or resolve the owning workspace when `workspaceId` is missing. It must never mount a webview using `persist:browser-ws-` with an empty suffix.
- D-10: Workspace ID threading must be verified across canvas nodes, dock tabs, detached panel windows, detached dock windows, same-workspace multi-window use, and brand-new pre-first-save workspaces.
- D-11: Load-error handling must show the failed-load overlay only for non-aborted main-frame failures. Missing `isMainFrame` is treated as main-frame.
- D-12: Screenshot/page capture moves out of `src/main/index.ts` into a focused browser/capture IPC module while preserving `{ filePath, dataUrl }`, Desktop PNG output, and webview guest ownership validation.
- D-13: `portalRegistry.register()` / `unregister()` must preserve the fork-only `orchRegisterPortalWc` bridge and stay best-effort.
- D-14: Browser history and bookmarks are persisted per workspace and queried by explicit `workspaceId`; upstream global browser state must not be copied as a single active workspace singleton.
- D-15: Renderer store invalidation events carry `workspaceId`; only matching workspace panels refresh.
- D-16: The bookmarks bar and star toggle operate on the active panel's workspace only and must not include tab, start-page, proxy, or autocomplete controls.
- D-17: The in-panel browser popover hosts only the bookmarks-bar toggle and scoped clear-data. Homepage/search remain editable only in the Settings-window Browser panel.
- D-18: `browserShowBookmarksBar` must be added to `AppSettings`, `DEFAULT_SETTINGS`, `SETTINGS_SCHEMA`, the Settings-window `BrowserSettings.tsx`, and the in-panel controls.
- D-19: Removing a workspace cleans up only that workspace's browser partition plus persisted browser history/bookmarks. The concrete cleanup home is `src/main/workspaceManager.ts` beside existing workspace teardown.
- D-20: Clear browsing data requires confirmation and clears only the current workspace's browser partition, history, and bookmarks.
- D-21: Clear-data must not force-reload or navigate open panels. The cleared session takes effect on the next user-initiated navigation or reload.
- D-22: Browser clear-data and workspace cleanup must not touch FlashQuery credential storage, `flashqueryConnection`, client manager state, vault documents, indexes, or MCP sessions.
- D-23: Webview crash recovery shows a distinct crash overlay for non-clean `render-process-gone` events and provides a reload action that clears crash state.
- D-24: Main-process webview shortcut forwarding is limited to Cmd/Ctrl+R, Cmd/Ctrl+L, Cmd/Ctrl+[ and Cmd/Ctrl+]. Cmd/Ctrl+T, Cmd/Ctrl+W, and Cmd/Ctrl+Shift+B remain Cate app shortcuts.
- D-25: Shortcut collision checks must inspect both `src/shared/types.ts` `DEFAULT_SHORTCUTS` and `src/main/menu.ts` accelerators before relying on browser shortcut forwarding.
- D-26: Tests from the supplied test plan must land with the feature slice they verify. No final "test catch-up" plan is acceptable.
- D-27: Unit tests `T-U-001` through `T-U-031`, integration tests `T-I-001` through `T-I-006`, E2E tests `T-E-001` through `T-E-021`, and manual test `T-M-001` must be implemented or explicitly recorded with evidence.
- D-28: E2E browser tests should prefer local HTTP servers and deterministic cookies/localStorage over public websites. `T-M-001` is the real-site login persistence check.
- D-29: Existing FlashQuery persistence smoke coverage must remain green if shared preload/settings surfaces are touched.
- D-30: Verification should run through Node 20 or 22. Use `npx -p node@22 ...` if the local default Node is outside Cate's `>=20 <23` engine range.

### the agent's Discretion
- D-31: The exact module split for browser partition helpers, browser state persistence, and browser IPC is discretionary if the string contracts, workspace scoping, and tests prove consistency.
- D-32: The browser history/bookmarks persistence shape may be one workspace-keyed JSON file or one sanitized file per workspace.
- D-33: E2E harness additions are allowed if they remain gated to `CATE_E2E=1` and do not leak into production behavior.
- D-34: `T-E-009` crash E2E may use a deterministic simulation hook if direct renderer crash induction is unreliable; unit tests remain the primary crash coverage.

### Deferred Ideas (OUT OF SCOPE)
- Page capture/extraction and browser-control MCP integration remain deferred to the separate Browser Capture and Control build.
- Proxy partition composition remains future work; the partition helper may leave an extension point but must not implement proxy behavior in this phase.
- History ingestion into FlashQuery remains future work. This phase stores per-workspace history only inside Cate browser state.
- Global-bookmarks promotion, tabs, start page, autocomplete, and old per-panel cookie migration remain out of scope.
</user_constraints>

## Summary

Phase 26 is a selective upstream browser uplift, not a wholesale upstream merge. Cate currently mounts browser webviews with `persist:browser-${panelId}`, which loses session durability on panel recreation; the phase must replace that with `persist:browser-ws-${workspaceId}` and must fail closed when `workspaceId` is empty. [VERIFIED: product requirements] [VERIFIED: codebase grep] Electron documents that `persist:` partitions create persistent sessions shared by identical partition strings and that the webview `partition` attribute must be set before first navigation. [CITED: https://github.com/electron/electron/blob/main/docs/api/webview-tag.md]

The most important planning constraint is preserving fork-specific boundaries while adapting upstream code. Upstream `browserStateStore.ts` and `browserStore.ts` are global, upstream `capture.ts` includes proxy handling, and upstream browser UI includes tabs/start page/autocomplete/homepage/search controls that this phase excludes. [VERIFIED: git show upstream/main] The plan should lift helpers and UI shapes, then add explicit `workspaceId` arguments and negative tests around excluded behavior. [VERIFIED: product requirements]

**Primary recommendation:** Plan four vertical slices matching the product docs: Browser Foundation, Browser State and Affordances, Workspace Safety and Controls, then System Verification, with required tests landing inside each slice. [VERIFIED: product requirements] [VERIFIED: test plan]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Durable browser partition | Renderer | Main | Renderer must set the `<webview partition>` before first navigation; main uses the same partition helper for clear-data and workspace cleanup. [CITED: Electron docs] [VERIFIED: codebase grep] |
| Browser history/bookmarks persistence | Main | Renderer | Main owns files under `userData`; renderer calls typed preload APIs and mirrors state by workspace ID. [VERIFIED: AGENTS.md] [VERIFIED: codebase grep] |
| Bookmarks/menu/settings UI | Renderer | Main | React panels and settings store render controls; main validates persisted settings keys through `SETTINGS_SCHEMA`. [VERIFIED: codebase grep] |
| Screenshot capture | Main | Preload/Renderer | Privileged `webContents.capturePage()` and Desktop writes stay in main; renderer keeps `webviewScreenshot()` contract. [VERIFIED: codebase grep] |
| Shortcut forwarding | Main | Renderer | Webview guest `before-input-event` belongs in `webSecurity.ts`; renderer applies only commands for its owning focused panel. [CITED: Electron docs] [VERIFIED: product requirements] |
| Workspace removal cleanup | Main | Renderer | `WORKSPACE_REMOVE` already routes to `workspaceManager.removeWorkspace`; cleanup belongs beside main-side teardown. [VERIFIED: codebase grep] |
| FlashQuery isolation | Main/Preload | Renderer | FlashQuery tokens and clients are main-owned; browser operations must not import, mutate, or serialize them. [VERIFIED: product requirements] [VERIFIED: codebase grep] |

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-001 | Workspace-scoped durable browser partition. | Electron partition docs, current `BrowserPanel` line 369 uses panel ID, mount-site audit shows `PanelWindowShell` empty fallback. |
| REQ-002 | Workspace lifecycle cleanup for browser state. | `workspaceManager.removeWorkspace` and `WORKSPACE_REMOVE` are the concrete cleanup home. |
| REQ-003 | Per-workspace history/bookmarks persistence. | Upstream stores are global and must be rewritten with explicit `workspaceId` state shape. |
| REQ-004 | Main-frame-only load-error overlay. | Upstream `browserLoadError.ts` is directly reusable with tests. |
| REQ-005 | Renderer crash recovery overlay. | Electron webview emits `render-process-gone`; implement distinct state from load errors. |
| REQ-006 | Scoped browser shortcut forwarding. | Electron `before-input-event` docs plus Cate shortcut collision audit. |
| REQ-007 | Bookmarks bar and star toggle. | Upstream UI is usable as a shape but must consume workspace-scoped selectors. |
| REQ-008 | Browser menu/settings popover. | Settings-window `BrowserSettings.tsx` is existing homepage/search owner; popover scope is limited. |
| REQ-009 | Scoped clear browsing data. | Electron session clear APIs plus FlashQuery invariant tests. |
| REQ-010 | Modular screenshot/capture IPC home. | Upstream `capture.ts` shape is usable, but proxy/extraction imports are excluded. |
| REQ-011 | Preserve portal orchestration bridge. | Current `portalRegistry.pushToMain()` is fork-only and must survive UI grafting. |
| REQ-012 | FlashQuery isolation and contract preservation. | FlashQuery channels/preload methods and credential/client modules must remain unchanged. |
</phase_requirements>

## Project Constraints (from AGENTS.md)

- Use the existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; do not add a separate backend or UI framework. [VERIFIED: AGENTS.md]
- Renderer code must not call Node/Electron APIs directly; privileged work goes through preload APIs and main-process validation. [VERIFIED: AGENTS.md]
- Main/preload/renderer process boundaries must remain separated. [VERIFIED: AGENTS.md]
- IPC payloads and persisted state should use serializable shared contracts from `src/shared/types.ts`; avoid class instances across process boundaries. [VERIFIED: AGENTS.md]
- Keep shared code free of imports from main, preload, renderer, or agent layers. [VERIFIED: AGENTS.md]
- Critical IPC belongs in `registerCriticalHandlers()` when needed before first paint; non-critical handlers can be deferred. [VERIFIED: AGENTS.md]
- Use TypeScript strict mode, single quotes, 2-space indentation, no semicolons, and co-located `.test.ts` / `.test.tsx` tests. [VERIFIED: AGENTS.md]
- Use `window.electronAPI` from preload rather than Electron imports in renderer code. [VERIFIED: AGENTS.md]
- Project skills: none found in `.codex/skills` or `.agents/skills`. [VERIFIED: filesystem]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Electron | 41.2.0 | Desktop app shell, webview sessions, IPC, webContents capture. | Existing runtime and official API surface for partitions, `session.fromPartition`, `clearStorageData`, `render-process-gone`, and `before-input-event`. [VERIFIED: npm list] [CITED: Electron docs] |
| React | 18.3.1 | Browser panel, settings, and toolbar UI. | Existing renderer UI framework. [VERIFIED: npm list] |
| Zustand | 5.0.12 | Renderer app/settings/browser store state. | Existing store pattern for app and settings state. [VERIFIED: npm list] |
| TypeScript | 5.9.3 | Shared IPC/types and strict checking. | Existing strict source language. [VERIFIED: npm list] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 3.2.4 | Unit and integration-style tests. | Pure helpers, renderer store tests, mocked Electron IPC tests. [VERIFIED: npm list] |
| Playwright | 1.60.0 | Electron E2E tests. | Workspace/session/cookie and browser behavior tests using local HTTP pages. [VERIFIED: npm list] |
| @phosphor-icons/react | 2.1.10 range in package.json | Browser toolbar/menu icons. | Existing icon library in `BrowserPanel` and upstream browser UI. [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Existing stack | New browser automation package | Out of scope; adds dependency risk and duplicates Electron webview APIs. [VERIFIED: product requirements] |
| Main-process JSON files | Renderer localStorage | Renderer storage violates process-boundary expectations and complicates multi-window sync. [VERIFIED: AGENTS.md] |
| Workspace-scoped partition | Global upstream `persist:browser-shared` | Easier lift from upstream but violates workspace isolation requirement. [VERIFIED: product requirements] |

**Installation:** No new external packages are required. [VERIFIED: package.json]  
**Version verification:** `npm list electron react zustand vitest @playwright/test typescript --depth=0` verified exact installed versions. [VERIFIED: npm list]

## Package Legitimacy Audit

No new packages should be installed for this phase. [VERIFIED: package.json] `slopcheck 0.6.1` is available locally, but the package legitimacy gate is not applicable because the recommended implementation uses existing dependencies only. [VERIFIED: shell]

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| None | — | — | — | — | — | No install planned |

**Packages removed due to slopcheck [SLOP] verdict:** none.  
**Packages flagged as suspicious [SUS]:** none.

## Architecture Patterns

### System Architecture Diagram

```text
BrowserPanel mount
  -> validate/derive workspaceId
  -> browserPartitionForWorkspace(workspaceId)
  -> <webview partition="persist:browser-ws-${workspaceId}">
      -> webSecurity.ts will-attach-webview configures guest Session
      -> dom-ready registers portalRegistry -> orchRegisterPortalWc
      -> navigation/title events
          -> renderer browserStore.recordVisit(workspaceId, url, title)
          -> preload browserHistoryRecord(...)
          -> main browserStateStore workspace-keyed JSON
          -> BROWSER_HISTORY_CHANGED({ workspaceId })
          -> matching workspace panels refresh only
      -> screenshot button
          -> preload webviewScreenshot(webContentsId)
          -> main capture IPC validates host ownership
          -> Desktop PNG + { filePath, dataUrl }

Workspace removal / Clear data
  -> renderer confirmation or WORKSPACE_REMOVE
  -> main browser cleanup helper
      -> session.fromPartition(partition).clearStorageData()
      -> clear workspace history/bookmarks
      -> broadcast workspace-scoped invalidations
      -> no FlashQuery credential/client/vault calls
```

### Recommended Project Structure

```text
src/
├── main/
│   ├── browserStateStore.ts          # workspace-scoped history/bookmark persistence
│   ├── browserPartition.ts           # partition helper, if shared by main modules
│   └── ipc/
│       ├── browser.ts                # browser state + clear-data IPC
│       └── capture.ts                # CAPTURE_PAGE, WEBVIEW_SCREENSHOT, NATIVE_FILE_DRAG
├── renderer/
│   ├── panels/
│   │   ├── BrowserPanel.tsx
│   │   ├── browserLoadError.ts
│   │   ├── browserPartition.ts       # renderer helper if not shared safely
│   │   ├── BookmarksBar.tsx
│   │   ├── BrowserMenu.tsx
│   │   └── BrowserSettingsPopover.tsx
│   └── stores/
│       └── browserStore.ts           # workspace-parameterized selectors/actions
└── shared/
    ├── ipc-channels.ts
    ├── electron-api.d.ts
    └── types.ts
```

### Pattern 1: Partition Helper First

**What:** Define a tested helper that rejects empty workspace IDs and returns exactly `persist:browser-ws-${workspaceId}`. [VERIFIED: product requirements]  
**When to use:** BrowserPanel mount, clear-data IPC, and workspace cleanup. [VERIFIED: product requirements]  
**Example:**

```ts
// Source: Browser Uplift requirements §7.1 + Electron webview partition docs.
export function browserPartitionForWorkspace(workspaceId: string): string {
  const id = workspaceId.trim()
  if (!id) throw new Error('Browser workspaceId is required')
  return `persist:browser-ws-${id}`
}
```

### Pattern 2: Workspace-Parameterized Browser Store

**What:** Store data keyed by workspace ID and make renderer methods/selectors accept `workspaceId`. [VERIFIED: product requirements]  
**When to use:** History, bookmarks, star state, and invalidation handling. [VERIFIED: product requirements]  
**Example:**

```ts
// Source: product REQ-003/REQ-007; upstream browserStore must be adapted.
type BrowserStateByWorkspace = Record<string, {
  history: BrowserHistoryEntry[]
  bookmarks: BrowserBookmark[]
}>

function bookmarksFor(workspaceId: string): BrowserBookmark[] {
  return get().byWorkspace[workspaceId]?.bookmarks ?? []
}
```

### Pattern 3: Main Boundary Owns Privileged Browser Operations

**What:** Keep capture, session clear, and file writes inside main IPC modules; renderer receives typed results through preload. [VERIFIED: AGENTS.md] [VERIFIED: codebase grep]  
**When to use:** `WEBVIEW_SCREENSHOT`, `CAPTURE_PAGE`, `BROWSER_CLEAR_DATA`, workspace cleanup. [VERIFIED: product requirements]  
**Example:**

```ts
// Source: current src/main/index.ts WEBVIEW_SCREENSHOT handler + upstream capture.ts shape.
const wc = webContents.fromId(webContentsId)
const hostWc = wc?.hostWebContents
if (!wc || !hostWc || hostWc.id !== event.sender.id) return null
const image = await wc.capturePage()
```

### Anti-Patterns to Avoid

- **Wholesale upstream BrowserPanel replacement:** upstream includes tabs, proxy, start page, autocomplete, global browser state, and no fork portal bridge; this violates phase scope. [VERIFIED: git show upstream/main] [VERIFIED: product requirements]
- **Global active workspace browser store:** panels in multiple workspaces/windows would show the wrong bookmarks/history. [VERIFIED: product requirements]
- **Renderer session cleanup:** Electron `session.fromPartition()` and storage clearing belong in main, not renderer. [CITED: Electron docs] [VERIFIED: AGENTS.md]
- **Clear-data auto reload:** product decision D-21 says live panels must not be force-reloaded or navigated. [VERIFIED: CONTEXT.md]
- **FlashQuery coupling:** browser state must not import or call FlashQuery credential/client/vault modules. [VERIFIED: product requirements]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser session persistence | Custom cookie/session store | Electron persistent partitions | Chromium/Electron own cookies, storage, service workers, and cache semantics. [CITED: Electron docs] |
| Session clearing | Manual filesystem deletion under userData | `session.fromPartition(...).clearStorageData()` or `clearData()` | Electron provides storage-aware clearing; filesystem deletion risks corrupting active sessions. [CITED: Electron docs] |
| Webview shortcut capture | DOM listeners inside arbitrary pages | main `before-input-event` on guest webContents | Guest page DOM is untrusted and may not receive all app-level shortcuts. [CITED: Electron docs] |
| Screenshot capture | Renderer canvas/screen scraping | main `webContents.capturePage()` | Existing contract already uses Electron capture with host ownership validation. [VERIFIED: codebase grep] |
| Browser state synchronization | Cross-window mutable globals | Main-owned JSON state + preload events carrying `workspaceId` | Keeps multi-window renderer stores consistent and testable. [VERIFIED: product requirements] |

**Key insight:** This phase is difficult because the upstream browser uplift solved a global-browser problem, while Cate now needs workspace-scoped browser behavior and FlashQuery isolation. [VERIFIED: product requirements] [VERIFIED: git show upstream/main]

## Common Pitfalls

### Pitfall 1: Empty Workspace Partition
**What goes wrong:** Detached browser panels mount with `persist:browser-ws-`. [VERIFIED: product requirements]  
**Why it happens:** `PanelWindowShell.tsx` currently passes `workspaceId ?? ''`. [VERIFIED: codebase grep]  
**How to avoid:** Make partition helper throw on empty IDs and fix all mount sites before enabling browser state. [VERIFIED: product requirements]  
**Warning signs:** Tests pass on canvas but fail for detached panel/dock windows. [VERIFIED: test plan]

### Pitfall 2: Copying Upstream Global Stores
**What goes wrong:** Workspace A shows Workspace B bookmarks/history. [VERIFIED: product requirements]  
**Why it happens:** Upstream `browserStore.ts` has a single `history` and `bookmarks` array. [VERIFIED: git show upstream/main]  
**How to avoid:** Store by workspace ID and make invalidation payloads include `workspaceId`. [VERIFIED: product requirements]  
**Warning signs:** `browserHistoryGet()` or `browserBookmarksGet()` has no workspace argument. [VERIFIED: product requirements]

### Pitfall 3: Accidentally Importing Excluded Upstream Features
**What goes wrong:** Tabs, proxy, start page, autocomplete, homepage/search popover controls, or proxy IPC appear in the fork. [VERIFIED: product requirements]  
**Why it happens:** Upstream files include those features in the same modules as desired browser affordances. [VERIFIED: git show upstream/main]  
**How to avoid:** Lift helpers and visual components surgically; add negative tests for excluded controls and channels. [VERIFIED: test plan]  
**Warning signs:** `BROWSER_SET_PROXY`, `BrowserTabSidebar`, `StartPage`, `UrlSuggestions`, or `browserNewTabBehavior` appears in implementation. [VERIFIED: git show upstream/main]

### Pitfall 4: FlashQuery State Wipe
**What goes wrong:** Browser clear-data logs out FlashQuery or changes workspace connection metadata. [VERIFIED: product requirements]  
**Why it happens:** Both domains use `workspaceId`, but they are separate stores. [VERIFIED: product requirements]  
**How to avoid:** Browser IPC must not import FlashQuery credential/client modules; tests should mock them and assert no calls. [VERIFIED: test plan]  
**Warning signs:** `src/main/ipc/browser.ts` imports from `src/main/flashquery/*`. [VERIFIED: test plan]

### Pitfall 5: Handler Double Registration
**What goes wrong:** IPC handlers throw duplicate registration errors or behave inconsistently after relocation. [VERIFIED: product requirements]  
**Why it happens:** Inline `CAPTURE_PAGE`/`WEBVIEW_SCREENSHOT` handlers in `src/main/index.ts` remain while new capture module registers them. [VERIFIED: codebase grep]  
**How to avoid:** Move handlers once and register the module exactly once from startup. [VERIFIED: product requirements]

## Code Examples

### Main-Frame Load Error Helper

```ts
// Source: upstream/main:src/renderer/panels/browserLoadError.ts
const ERR_ABORTED = -3

export function pageLoadErrorFrom(event: { errorCode: number; errorDescription?: string; isMainFrame?: boolean }): string | null {
  if (event.errorCode === ERR_ABORTED) return null
  if (event.isMainFrame === false) return null
  return event.errorDescription || 'Failed to load page'
}
```

### Electron Session Clear

```ts
// Source: Electron session docs.
const ses = session.fromPartition(browserPartitionForWorkspace(workspaceId))
await ses.clearStorageData()
```

### Browser Shortcut Classifier Shape

```ts
// Source: Electron before-input-event docs + product shortcut contract.
type BrowserShortcutAction = 'reload' | 'focus-url' | 'back' | 'forward'

function browserShortcutFromInput(input: Electron.Input): BrowserShortcutAction | null {
  const command = input.control || input.meta
  if (!command || input.alt || input.shift) return null
  if (input.code === 'KeyR') return 'reload'
  if (input.code === 'KeyL') return 'focus-url'
  if (input.code === 'BracketLeft') return 'back'
  if (input.code === 'BracketRight') return 'forward'
  return null
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Webview `crashed` event | `render-process-gone` event | Electron breaking changes before current Electron 41 | Use `render-process-gone` for crash overlay work. [CITED: Electron docs] |
| Per-panel partition `persist:browser-${panelId}` | Per-workspace partition `persist:browser-ws-${workspaceId}` | Phase 26 product decision | Fixes restart durability while preserving workspace isolation. [VERIFIED: product requirements] |
| Upstream global browser history/bookmarks | Workspace-keyed history/bookmarks | Phase 26 fork adaptation | Prevents cross-workspace state bleed. [VERIFIED: product requirements] |
| Inline screenshot IPC in `main/index.ts` | Focused capture IPC module | Phase 26 product decision | Keeps screenshot/page capture modular while preserving contract. [VERIFIED: product requirements] |

**Deprecated/outdated:**
- `webview.addEventListener('crashed', ...)`: use `render-process-gone`. [CITED: Electron docs]
- Upstream `BROWSER_SET_PROXY` and proxy UI: out of scope for this phase. [VERIFIED: product requirements]
- Upstream homepage/search controls in in-panel popover: out of scope because Settings-window Browser panel is the single source of truth. [VERIFIED: product requirements]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Local HTTP E2E pages can cover cookie/localStorage partition behavior without external services. [ASSUMED] | Validation Architecture | E2E tests may need more harness work or a different deterministic fixture. |
| A2 | The exact browser state file schema can be changed before release because no old per-panel browser state migration is required. [ASSUMED] | Architecture Patterns | Planner may need a compatibility task if hidden state exists outside product scope. |
| A3 | One workspace-keyed history file and one workspace-keyed bookmarks file is the preferred implementation shape. [ASSUMED] | Open Questions | Planner may choose per-workspace files instead; both remain allowed by D-32. |
| A4 | E2E harness additions can cover browser panel creation/inspection, deterministic partition/cookie checks, and optional crash simulation. [ASSUMED] | Validation Architecture | Planner may need to split harness work into earlier setup tasks if Playwright cannot introspect webviews directly. |

## Open Questions

1. **Should browser state live in one workspace-keyed file or per-workspace files?**
   - What we know: both are allowed by D-32 and the product spec. [VERIFIED: CONTEXT.md]
   - What's unclear: operational preference for hand-editability vs cleanup simplicity.
   - Recommendation: use one workspace-keyed history file and one workspace-keyed bookmarks file unless implementation finds cleanup/file-watch complexity; this mirrors upstream filenames while adding workspace maps. [ASSUMED]

2. **How should `T-E-009` simulate a webview crash?**
   - What we know: deterministic crash induction is hard and D-34 allows a `CATE_E2E=1` simulation hook. [VERIFIED: CONTEXT.md]
   - What's unclear: whether direct crash induction works reliably on all CI/local platforms.
   - Recommendation: plan unit tests as primary coverage and add a gated E2E simulation hook only if real crash induction is unreliable. [VERIFIED: test plan]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts, Vitest, Playwright | Wrong version | v26.0.0 | Use Node 20/22; `npx -p node@22 node --version` returned v22.23.1. [VERIFIED: shell] |
| npm | package scripts | ✓ | 11.12.1 | Use project lockfile with npm. [VERIFIED: shell] |
| Git | upstream references | ✓ | 2.50.1 Apple Git-155 | — [VERIFIED: shell] |
| ripgrep | codebase audit | ✓ | 15.1.0 | — [VERIFIED: shell] |
| Python 3 | native module fallback builds | ✓ | 3.12.3 | — [VERIFIED: shell] |
| upstream/main | upstream browser references | ✓ | 538db77b1c8734fe6d9af45213dd48417625c49d | — [VERIFIED: git] |

**Missing dependencies with no fallback:** none identified. [VERIFIED: shell]  
**Missing dependencies with fallback:** default Node v26 is outside Cate's engine range; use Node 20 or 22 for verification commands. [VERIFIED: package.json] [VERIFIED: shell]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + Playwright 1.60.0 [VERIFIED: npm list] |
| Config file | `vitest.config.ts`, `playwright.config.ts` [VERIFIED: codebase grep] |
| Quick run command | `npm test -- <target-file>` under Node 20/22 [VERIFIED: package.json] |
| Full suite command | `npm run typecheck && npm test && npm run test:e2e` under Node 20/22 [VERIFIED: package.json] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-001 | Workspace partitions and no empty ID | unit/e2e/manual | `npm test -- src/renderer/panels/browserPartition.test.ts` + `npm run test:e2e -- e2e/browser-uplift.spec.ts` | ❌ Wave 0 |
| REQ-002 | Workspace removal cleanup | unit/integration/e2e | `npm test -- src/main/browserStateStore.test.ts src/main/ipc/browser.test.ts` | ❌ Wave 0 |
| REQ-003 | Workspace history/bookmarks | unit/e2e | `npm test -- src/main/browserStateStore.test.ts src/renderer/stores/browserStore.test.ts` | ❌ Wave 0 |
| REQ-004 | Main-frame load errors | unit/e2e | `npm test -- src/renderer/panels/browserLoadError.test.ts` | ❌ Wave 0 |
| REQ-005 | Crash overlay | unit/e2e | `npm test -- src/renderer/panels/BrowserPanel.test.tsx` | ❌ Wave 0 |
| REQ-006 | Browser shortcuts | unit/e2e | `npm test -- src/main/webSecurity.test.ts src/renderer/panels/BrowserPanel.test.tsx` | ❌ Wave 0 |
| REQ-007 | Bookmarks bar/star | unit/e2e | `npm test -- src/renderer/stores/browserStore.test.ts src/renderer/panels/BookmarksBar.test.tsx` | ❌ Wave 0 |
| REQ-008 | Menu/settings popover | unit/e2e | `npm test -- src/renderer/panels/BrowserMenu.test.tsx src/renderer/settings/BrowserSettings.test.tsx` | ❌ Wave 0 |
| REQ-009 | Confirmed clear-data | unit/integration/e2e | `npm test -- src/main/ipc/browser.test.ts src/renderer/panels/BrowserSettingsPopover.test.tsx` | ❌ Wave 0 |
| REQ-010 | Capture IPC relocation | integration/e2e | `npm test -- src/main/ipc/capture.test.ts` | ❌ Wave 0 |
| REQ-011 | Portal bridge | unit/e2e | `npm test -- src/renderer/lib/portalRegistry.test.ts` | ❌ Wave 0 |
| REQ-012 | FlashQuery isolation | unit/e2e | `npm test -- src/shared/ipc-channels.test.ts src/main/ipc/browser.test.ts` + `npm run test:e2e -- e2e/flashquery-persistence.spec.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** targeted `npm test -- <changed-test-files>` plus `npm run typecheck` for shared/preload/main contract changes. [VERIFIED: package.json]
- **Per wave merge:** all tests for that product sub-slice and `npm run typecheck`. [VERIFIED: test plan]
- **Phase gate:** `npm run typecheck && npm test && npm run test:e2e`, plus manual `T-M-001` evidence. [VERIFIED: test plan]

### Wave 0 Gaps

- [ ] `src/renderer/panels/browserPartition.ts` and `.test.ts` or equivalent helper coverage for REQ-001.
- [ ] `src/renderer/panels/browserLoadError.ts` and `.test.ts` for REQ-004.
- [ ] `src/main/browserStateStore.ts` and `.test.ts` for REQ-002/003/009.
- [ ] `src/main/ipc/browser.ts` and `.test.ts` for browser state/clear-data IPC.
- [ ] `src/main/ipc/capture.ts` and `.test.ts` for REQ-010.
- [ ] `src/renderer/stores/browserStore.ts` and `.test.ts` for workspace selectors/invalidation.
- [ ] `e2e/browser-uplift.spec.ts` plus local HTTP fixture helpers for E2E coverage.
- [ ] E2E harness additions for browser panel creation/inspection, deterministic partition/cookie checks, and optional crash simulation, gated by `CATE_E2E=1`. [VERIFIED: test plan] [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Keep FlashQuery bearer tokens in main credential storage; browser session cookies stay in Electron workspace partitions only. [VERIFIED: product requirements] |
| V3 Session Management | yes | Electron persistent partition per workspace, clear only target workspace partition. [CITED: Electron docs] [VERIFIED: product requirements] |
| V4 Access Control | yes | Validate webview screenshot ownership and workspace IDs in main IPC handlers. [VERIFIED: codebase grep] [VERIFIED: product requirements] |
| V5 Input Validation | yes | Reject empty workspace IDs, non-recordable URLs, invalid settings types, and unauthorized webContents IDs. [VERIFIED: product requirements] |
| V6 Cryptography | no | No new crypto; do not handle FlashQuery token crypto in browser code. [VERIFIED: product requirements] |

### Known Threat Patterns for Electron Webview + IPC

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Renderer asks to screenshot another window's webview | Information Disclosure | Validate `hostWebContents`/calling window before capture. [VERIFIED: codebase grep] |
| Workspace ID spoof/empty string causes shared partition | Elevation/Information Disclosure | Central partition helper rejects empty IDs and IPC validates target workspace. [VERIFIED: product requirements] |
| Browser clear-data wipes FlashQuery token/connection | Tampering/Denial | No FlashQuery imports in browser IPC; tests assert credential/client modules are untouched. [VERIFIED: test plan] |
| Untrusted webview content receives Node/Electron access | Elevation | `will-attach-webview` strips preload, disables nodeIntegration, enables sandbox/contextIsolation/webSecurity. [VERIFIED: codebase grep] |
| App shortcuts stolen by focused guest | Denial/Tampering | Main classifier forwards only R/L/BracketLeft/BracketRight with command modifier, no T/W/Shift+B. [VERIFIED: product requirements] |

## Sources

### Primary (HIGH confidence)

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md` - REQ-001 through REQ-012, invariants, code touchpoints, source ordering.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md` - T-U/T-I/T-E/T-M coverage and traceability.
- `.planning/phases/26-browser-uplift/26-CONTEXT.md` - locked local decisions D-01 through D-34.
- Cate codebase grep/read: `BrowserPanel.tsx`, `webSecurity.ts`, `workspaceManager.ts`, `ipc-channels.ts`, `preload/index.ts`, `electron-api.d.ts`, `store.ts`, `BrowserSettings.tsx`, `portalRegistry.ts`, `e2eHarness.ts`.
- `git show upstream/main` at `538db77b1c8734fe6d9af45213dd48417625c49d` - upstream browser modules.
- Context7 `/electron/electron` - webview partition, session clear APIs, `before-input-event`, `render-process-gone`, `capturePage` topics.

### Secondary (MEDIUM confidence)

- `npm list electron react zustand vitest @playwright/test typescript --depth=0` - installed package versions.
- `.planning/ROADMAP.md`, `.planning/STATE.md`, `.planning/REQUIREMENTS.md` - milestone status and traceability.

### Tertiary (LOW confidence)

- None. All material planning claims are sourced from product docs, codebase inspection, upstream git, or Electron docs; assumptions are isolated in the Assumptions Log.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - existing dependency versions verified locally; no new packages recommended.
- Architecture: HIGH - source docs and code touchpoints agree on process boundaries and ownership.
- Pitfalls: HIGH - product docs explicitly identify risky seams and code inspection confirmed them.
- E2E feasibility: MEDIUM - infrastructure exists, but crash simulation and webview partition assertions may require harness work.

**Research date:** 2026-06-26  
**Valid until:** 2026-07-26 for codebase planning assumptions; re-check Electron docs/package versions if implementation starts after that date.
