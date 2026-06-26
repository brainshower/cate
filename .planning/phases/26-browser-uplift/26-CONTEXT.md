# Phase 26: Browser Uplift - Context

**Gathered:** 2026-06-26
**Status:** Ready for planning
**Source:** Product requirements and test plan supplied by project owner

<domain>
## Phase Boundary

Phase 26 implements the Browser Uplift end to end for Cate's forked browser panel while preserving FlashQuery integration boundaries. It delivers durable workspace-scoped browser sessions, per-workspace history/bookmarks, browser affordances, robust load/crash/shortcut handling, modular screenshot IPC, workspace cleanup, scoped clear-data controls, portal bridge preservation, FlashQuery isolation, and full supplied test coverage.

The upstream source spec's four implementation phases are preserved as ordered sub-slices inside this one GSD phase:

1. Browser Foundation
2. Browser State and Affordances
3. Workspace Safety and Controls
4. System Verification

Tests must land with the sub-slice they verify. Do not implement all browser behavior first and postpone coverage to a final catch-up slice.
</domain>

<decisions>
## Implementation Decisions

### Canonical Source Docs
- D-01: Downstream agents MUST read the full requirements doc before resolving scope questions: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`.
- D-02: Downstream agents MUST read the full test plan before choosing, naming, or marking tests: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`.
- D-03: If this context conflicts with those two docs, the supplied product docs win unless the local codebase makes a requirement impossible.

### Scope
- D-04: Phase 26 owns REQ-001 through REQ-012 from the Browser Uplift requirements document.
- D-05: Phase 26 must preserve the product doc's one-phase GSD structure while ordering the work as Browser Foundation, Browser State and Affordances, Workspace Safety and Controls, and System Verification.
- D-06: In-panel tabs, start page, URL autocomplete, per-panel proxy support, DOM extraction, Readability/Turndown, PDF/DOCX extraction, vault writes from captured content, `cate_browser` MCP tooling, FlashQuery server changes, and old per-panel cookie migration remain out of scope.
- D-07: Browser state may share `workspaceId` for scoping, but it must remain separate from FlashQuery tokens, connection metadata, vault documents, indexes, and MCP sessions.

### Workspace-Scoped Browser Foundation
- D-08: Browser webviews use `persist:browser-ws-${workspaceId}`; they must not use `panelId` as the durable partition key.
- D-09: `BrowserPanel` must fail closed or resolve the owning workspace when `workspaceId` is missing. It must never mount a webview using `persist:browser-ws-` with an empty suffix.
- D-10: Workspace ID threading must be verified across canvas nodes, dock tabs, detached panel windows, detached dock windows, same-workspace multi-window use, and brand-new pre-first-save workspaces.
- D-11: Load-error handling must show the failed-load overlay only for non-aborted main-frame failures. Missing `isMainFrame` is treated as main-frame.
- D-12: Screenshot/page capture moves out of `src/main/index.ts` into a focused browser/capture IPC module while preserving `{ filePath, dataUrl }`, Desktop PNG output, and webview guest ownership validation.
- D-13: `portalRegistry.register()` / `unregister()` must preserve the fork-only `orchRegisterPortalWc` bridge and stay best-effort.

### Browser State and Affordances
- D-14: Browser history and bookmarks are persisted per workspace and queried by explicit `workspaceId`; upstream global browser state must not be copied as a single active workspace singleton.
- D-15: Renderer store invalidation events carry `workspaceId`; only matching workspace panels refresh.
- D-16: The bookmarks bar and star toggle operate on the active panel's workspace only and must not include tab, start-page, proxy, or autocomplete controls.
- D-17: The in-panel browser popover hosts only the bookmarks-bar toggle and scoped clear-data. Homepage/search remain editable only in the Settings-window Browser panel.
- D-18: `browserShowBookmarksBar` must be added to `AppSettings`, `DEFAULT_SETTINGS`, `SETTINGS_SCHEMA`, the Settings-window `BrowserSettings.tsx`, and the in-panel controls.

### Workspace Safety and Controls
- D-19: Removing a workspace cleans up only that workspace's browser partition plus persisted browser history/bookmarks. The concrete cleanup home is `src/main/workspaceManager.ts` beside existing workspace teardown.
- D-20: Clear browsing data requires confirmation and clears only the current workspace's browser partition, history, and bookmarks.
- D-21: Clear-data must not force-reload or navigate open panels. The cleared session takes effect on the next user-initiated navigation or reload.
- D-22: Browser clear-data and workspace cleanup must not touch FlashQuery credential storage, `flashqueryConnection`, client manager state, vault documents, indexes, or MCP sessions.
- D-23: Webview crash recovery shows a distinct crash overlay for non-clean `render-process-gone` events and provides a reload action that clears crash state.
- D-24: Main-process webview shortcut forwarding is limited to Cmd/Ctrl+R, Cmd/Ctrl+L, Cmd/Ctrl+[ and Cmd/Ctrl+]. Cmd/Ctrl+T, Cmd/Ctrl+W, and Cmd/Ctrl+Shift+B remain Cate app shortcuts.
- D-25: Shortcut collision checks must inspect both `src/shared/types.ts` `DEFAULT_SHORTCUTS` and `src/main/menu.ts` accelerators before relying on browser shortcut forwarding.

### Testing and Verification
- D-26: Tests from the supplied test plan must land with the feature slice they verify. No final "test catch-up" plan is acceptable.
- D-27: Unit tests `T-U-001` through `T-U-031`, integration tests `T-I-001` through `T-I-006`, E2E tests `T-E-001` through `T-E-021`, and manual test `T-M-001` must be implemented or explicitly recorded with evidence.
- D-28: E2E browser tests should prefer local HTTP servers and deterministic cookies/localStorage over public websites. `T-M-001` is the real-site login persistence check.
- D-29: Existing FlashQuery persistence smoke coverage must remain green if shared preload/settings surfaces are touched.
- D-30: Verification should run through Node 20 or 22. Use `npx -p node@22 ...` if the local default Node is outside Cate's `>=20 <23` engine range.
- D-35: Every implementation wave must include the tests that validate the functionality implemented in that same wave. Wave 10 is for full-system verification, evidence, and manual `T-M-001`; it must not become a backlog for unit/integration/E2E tests that should have landed with Waves 1 through 9.

### the agent's Discretion
- D-31: The exact module split for browser partition helpers, browser state persistence, and browser IPC is discretionary if the string contracts, workspace scoping, and tests prove consistency.
- D-32: The browser history/bookmarks persistence shape may be one workspace-keyed JSON file or one sanitized file per workspace.
- D-33: E2E harness additions are allowed if they remain gated to `CATE_E2E=1` and do not leak into production behavior.
- D-34: `T-E-009` crash E2E may use a deterministic simulation hook if direct renderer crash induction is unreliable; unit tests remain the primary crash coverage.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md` - locked REQ-001 through REQ-012, invariants, codebase citations, architecture contracts, out-of-scope boundaries, and source-slice ordering.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md` - required unit, integration, E2E, and manual test IDs plus traceability rules.

### Cate Planning
- `.planning/ROADMAP.md` - phase goal, success criteria, internal execution order, and required test coverage grouping.
- `.planning/REQUIREMENTS.md` - milestone-level project requirements and current generated context.
- `.planning/STATE.md` - current milestone state and owner decisions.
- `.planning/codebase/ARCHITECTURE.md` - process boundaries and IPC/preload/renderer layering.
- `.planning/codebase/CONVENTIONS.md` - TypeScript, React, IPC, testing, and style conventions.
- `.planning/codebase/TESTING.md` - local quality/test commands and test layout.
- `.planning/phases/25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish/25-CONTEXT.md` - prior pattern for using supplied product docs as mandatory source of truth.

### Production Code Touchpoints
- `src/renderer/panels/BrowserPanel.tsx` - current browser component, webview partition, screenshot button, load-error handling, portal registration, and toolbar state.
- `src/renderer/panels/browserUrl.ts` and `src/renderer/panels/BrowserPanel.test.ts` - existing URL helper and browser test pattern.
- `src/renderer/lib/portalRegistry.ts` - fork-only portal bridge that must survive upstream grafting.
- `src/main/index.ts` - current inline `CAPTURE_PAGE` and `WEBVIEW_SCREENSHOT` registration to relocate.
- `src/main/webSecurity.ts` - webview attach/session security policy and future shortcut forwarding home.
- `src/shared/ipc-channels.ts`, `src/preload/index.ts`, and `src/shared/electron-api.d.ts` - shared browser IPC/preload/API contracts.
- `src/main/workspaceManager.ts` and `src/renderer/stores/appStore.ts` - workspace creation/removal, workspace ID persistence, and cleanup trigger path.
- `src/shared/types.ts`, `src/main/store.ts`, and `src/renderer/settings/BrowserSettings.tsx` - browser settings schema, defaults, and Settings-window Browser UI.
- `src/main/flashquery/credentials.ts`, `src/main/ipc/flashquery.ts`, and `src/main/flashquery/clientManager.ts` - FlashQuery state that browser operations must not read, mutate, or clear.
- `src/renderer/lib/e2eHarness.ts`, `e2e/fixtures/electron-app.ts`, `e2e/smoke.spec.ts`, and `e2e/flashquery-persistence.spec.ts` - Electron E2E harness and FlashQuery persistence smoke targets.

### Upstream Reference
- `upstream/main:src/main/ipc/capture.ts` - lift screenshot/capture module shape only; do not lift proxy or extraction handlers.
- `upstream/main:src/renderer/panels/browserLoadError.ts` - lift/adapt main-frame load-error helper.
- `upstream/main:src/renderer/stores/browserStore.ts` - adapt global history/bookmark renderer store to explicit workspace scoping.
- `upstream/main:src/main/browserStateStore.ts` - adapt global browser history/bookmark persistence to per-workspace records.
- `upstream/main:src/renderer/panels/BookmarksBar.tsx`, `BrowserMenu.tsx`, and `BrowserSettingsPopover.tsx` - lift UI affordances while dropping New Tab, start-page, proxy, and homepage/search controls.
</canonical_refs>

<specifics>
## Specific Ideas

- Keep plan slices vertical and test-coupled: foundation tests with partition/load/capture/portal changes, state tests with history/bookmark/settings UI, safety tests with cleanup/crash/shortcuts/clear-data/FlashQuery invariants, then Wave 10 full-system verification/manual evidence only.
- Prefer small pure helpers for partition construction, load-error classification, shortcut classification, and recordable URL filtering so unit tests can pin the contracts before wiring UI.
- Main-process browser state tests should mock Electron session APIs and use temporary files, following `src/main/ipc/git.test.ts` patterns.
- Renderer store tests should seed Zustand state directly and assert workspace-scoped selectors/events rather than relying on a global active workspace.
- E2E tests should use local HTTP pages for cookies, subresource failures, and screenshot behavior; reserve the public-site login path for `T-M-001`.
</specifics>

<deferred>
## Deferred Ideas

- Page capture/extraction and browser-control MCP integration remain deferred to the separate Browser Capture and Control build.
- Proxy partition composition remains future work; the partition helper may leave an extension point but must not implement proxy behavior in this phase.
- History ingestion into FlashQuery remains future work. This phase stores per-workspace history only inside Cate browser state.
- Global-bookmarks promotion, tabs, start page, autocomplete, and old per-panel cookie migration remain out of scope.
</deferred>

---

*Phase: 26-browser-uplift*
*Context gathered: 2026-06-26*
