# Codebase Concerns

**Analysis Date:** 2026-05-28

## Tech Debt

**Main-process orchestration concentration:**
- Issue: `src/main/index.ts` owns app lifecycle, BrowserWindow construction, security headers, dialogs, screenshots, panel transfer, drag ghost windows, cross-window drag state, updater startup, Sentry, analytics, quit coordination, and PTY shutdown in one 1,375-line file.
- Files: `src/main/index.ts`, `src/preload/index.ts`, `src/shared/ipc-channels.ts`
- Why: Electron app responsibilities accumulated around one startup module and one preload bridge.
- Impact: Security-sensitive changes are hard to review because trusted-window setup, untrusted webview policy, filesystem grants, drag/drop IPC, and quit behavior share one file and several module-level variables.
- Fix approach: Move coherent IPC groups into focused modules under `src/main/ipc/`, keep `src/main/index.ts` as lifecycle wiring, and add module-level tests before extracting handlers.

**Preload bridge surface is broad and weakly typed at runtime:**
- Issue: `src/preload/index.ts` exposes filesystem, git mutation, terminal, webview screenshot, settings, agent bash, auth, marketplace install, and external URL APIs directly to renderer code with mostly pass-through parameters.
- Files: `src/preload/index.ts`, `src/shared/electron-api.d.ts`, `src/shared/ipc-channels.ts`
- Why: The bridge is used as the central renderer-to-main contract.
- Impact: Every renderer XSS or compromised dependency gets a large privileged API surface; correctness depends on each main-process handler validating its own parameters.
- Fix approach: Group the exposed API by capability, add Zod-style payload validation in main handlers, and keep high-risk APIs such as `AGENT_BASH`, `AUTH_SAVE_API_KEY`, `AGENT_MARKETPLACE_INSTALL`, and file mutation behind explicit renderer call sites.

**Renderer panel creation repeats rollback logic:**
- Issue: Panel creation methods duplicate optimistic store mutation, `placePanel(...)`, catch, rollback, and `return null as unknown as string`.
- Files: `src/renderer/stores/appStore.ts`
- Why: Panel types were added incrementally.
- Impact: New panel types can miss rollback behavior or propagate impossible return types; UI callers see a `string` signature even when failure returns a null value cast through `unknown`.
- Fix approach: Introduce one internal `createPanelWithPlacement(...)` helper that returns `string | null`, then update public action types and callers.

**Runtime settings writes bypass schema validation:**
- Issue: startup reads validate known setting types, but `SETTINGS_SET` stores any key/value directly into electron-store and `settingsCache`.
- Files: `src/main/store.ts`, `src/shared/types.ts`, `src/renderer/stores/settingsStore.ts`
- Why: Runtime writes rely on typed renderer callers.
- Impact: A renderer bug or compromised renderer can persist invalid settings that affect shell selection, privacy toggles, browser behavior, and launch-time caches until startup validation silently ignores them.
- Fix approach: Reuse `SETTINGS_SCHEMA` in `SETTINGS_SET`, reject unknown keys and wrong types, and validate enum-like strings such as `browserSearchEngine`, `canvasGridStyle`, and `autoOpenUrlsFromTerminal`.

**Local generated artifacts are very large:**
- Issue: ignored build outputs are present in the working tree: `release/` is about 2.2 GB, `dist/` is about 62 MB, and `node_modules/` is about 1.4 GB.
- Files: `.gitignore`, `release/`, `dist/`, `node_modules/`
- Why: Local package/build output remains under the repo root.
- Impact: Whole-repo scans, backup tools, search tools, and codebase mappers can waste time in generated output unless every command excludes these paths.
- Fix approach: Keep generated artifacts ignored, clean `release/` and `dist/` before audits when not actively packaging, and make repo tooling consistently exclude ignored directories.

## Known Bugs

**No current TypeScript compile failures detected:**
- Symptoms: `npm run typecheck` exits successfully.
- Files: `package.json`, `tsconfig.json`
- Trigger: Run `npm run typecheck`.
- Workaround: Not applicable.
- Root cause: Not applicable.
- Blocked by: Not applicable.

**First-install feedback prompt does not match the major/minor prompt comment:**
- Symptoms: `decideUpdateAction(...)` queues `pendingFeedbackForVersion` and returns a feedback prompt on first install, while the later no-change path only re-prompts for major/minor bumps.
- Files: `src/main/analytics.ts`
- Trigger: Fresh install with no `analytics-state.json`; `trackAppStart()` calls `checkAndReportUpdate(...)`.
- Workaround: User can dismiss the feedback dialog.
- Root cause: First-install branch always sets `prompt` and pending feedback state.

**Worktree add/remove accepts target paths outside validated workspace roots:**
- Symptoms: `GIT_WORKTREE_ADD` calls `fs.mkdir(path.dirname(targetPath), { recursive: true })`, runs `git worktree add` on `targetPath`, then allowlists that path; `GIT_WORKTREE_REMOVE` runs `git worktree remove` and `fs.rm(worktreePath, { recursive: true, force: true })` without validating the target path first.
- Files: `src/main/ipc/git.ts`, `src/preload/index.ts`, `src/renderer/sidebar/ParallelWorkTab.tsx`
- Trigger: Renderer sends a crafted `targetPath` or `worktreePath` through the worktree IPC methods.
- Workaround: Use only UI-generated worktree paths.
- Root cause: Worktree mutation handlers validate `repoCwd` but not the filesystem target path before creation/removal.

## Security Considerations

**AI credentials are persisted as plaintext JSON despite UI status naming:**
- Risk: API keys and OAuth credentials are written to `~/.pi/agent/auth.json`; status reports API keys as `source: 'safeStorage'`, but the implementation writes JSON with file mode `0600`, not Electron `safeStorage` encryption.
- Files: `src/agent/main/authManager.ts`, `src/agent/main/ipcAuth.ts`, `src/agent/renderer/ProvidersView.tsx`
- Current mitigation: Parent directory mode `0700`, file mode `0600`, and shared storage location compatible with the spawned pi process.
- Recommendations: Rename the status source or implement real OS-backed encryption; avoid logging credential-bearing errors; add tests that assert file permissions and redacted status responses.

**Untrusted DOCX HTML is inserted into the renderer DOM:**
- Risk: `mammoth.convertToHtml(...)` output is passed to `dangerouslySetInnerHTML` without an explicit sanitizer.
- Files: `src/renderer/panels/DocumentPanel.tsx`
- Current mitigation: File reads are constrained by main-process path validation, and the Electron renderer has context isolation and no node integration.
- Recommendations: Sanitize converted HTML before rendering, block unsafe links/URLs in generated markup, and add a regression test with malicious DOCX-derived HTML.

**Browser panels allow `file://` and persistent webview partitions:**
- Risk: Browser panels can load local HTML files and each panel uses `partition="persist:browser-${panelId}"`; remote pages are restricted by browser same-origin policy, but local file content and persistent cookies/storage need careful handling.
- Files: `src/main/webSecurity.ts`, `src/renderer/panels/BrowserPanel.tsx`, `src/main/index.ts`
- Current mitigation: Webview hardening removes guest preload, disables node integration, enables sandbox/context isolation/webSecurity, blocks non-http(s)/file main-frame URLs, and limits permissions to cookies/storage-access.
- Recommendations: Require explicit user approval for `file://` loads, prefer non-persistent partitions unless persistence is user-visible, and add tests for blocked protocols, popup behavior, and file-origin navigation.

**External package installation executes marketplace packages through pi:**
- Risk: `AGENT_MARKETPLACE_INSTALL` shells out to the bundled `pi` CLI with `pi install npm:<name>` after scraping a live HTML catalog; installed extensions execute in the agent runtime and can request UI interactions.
- Files: `src/agent/main/marketplace.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/agentStore.ts`
- Current mitigation: Package name rejects whitespace and shell metacharacters, spawn uses argv instead of shell interpolation, and the UI flags extensions that appear to require a terminal UI.
- Recommendations: Add package provenance display, install confirmation, allowlist or signature metadata where available, and tests around scoped package names, uninstall behavior, and failed installs.

**Renderer can request arbitrary HTTP(S) external opens:**
- Risk: `OPEN_EXTERNAL_URL` opens any `http://` or `https://` string from renderer code, and `UPDATE_OPEN_RELEASE` opens a renderer-provided URL or cached release URL.
- Files: `src/main/analytics.ts`, `src/main/auto-updater.ts`, `src/preload/index.ts`
- Current mitigation: Non-http(s) schemes are blocked in `OPEN_EXTERNAL_URL`; updater release URLs normally originate from GitHub release metadata.
- Recommendations: Restrict update release opens to `github.com/0-AI-UG/cate`, centralize URL validation, and use an allowlist for app-owned external links.

**Agent file helpers can open arbitrary paths:**
- Risk: `AGENT_OPEN_SKILL_FILE` passes renderer-provided `filePath` to `shell.openPath(...)` without the `~/.pi/agent` check used by `AGENT_DELETE_SKILL_FILE`.
- Files: `src/agent/main/ipcAgent.ts`, `src/preload/index.ts`
- Current mitigation: The normal UI obtains paths from `AGENT_LIST_SKILL_FILES`, which lists files under `~/.pi/agent/{agents,prompts,skills}`.
- Recommendations: Apply the same `isUserAgentPath(...)` check to open operations and ensure the path is a markdown file inside the selected skill directory.

## Performance Bottlenecks

**Recursive file search is serial and content reads whole files:**
- Problem: `FS_SEARCH` recursively walks directories, reads eligible files into memory, lowercases full text, and searches serially until `maxResults`.
- Files: `src/main/ipc/filesystem.ts`, `src/shared/types.ts`, `src/preload/index.ts`
- Measurement: Not measured in this audit; default `maxResults` is 200 and default `maxFileBytes` is 1 MB per file.
- Cause: Simplicity-first recursive traversal and content scanning in the main process.
- Improvement path: Add cancellation/debounce from the renderer, stream or chunk large text files, cap traversal work per tick, and consider ripgrep-backed search for workspace content.

**Process monitoring polls every terminal with OS commands:**
- Problem: Every second, the shell monitor uses `pgrep`, `ps`, and `lsof` across registered terminals, then scans listening ports.
- Files: `src/main/ipc/shell.ts`, `src/main/ipc/terminal.ts`
- Measurement: Not measured in this audit; concurrency is capped at 4 OS command calls.
- Cause: Agent detection, CWD tracking, and port detection are inferred from process trees instead of event-based state.
- Improvement path: Increase polling interval when unfocused/idle, skip port scans unless needed by visible UI, and add telemetry/perf marks for terminal counts over 10, 25, and 50.

**Session autosave can force periodic full serialization:**
- Problem: Autosave runs after idle changes, after a max wait, and every 30 seconds even when no change is detected.
- Files: `src/renderer/lib/session.ts`, `src/renderer/stores/appStore.ts`, `src/renderer/stores/canvasStore.ts`, `src/main/projectWorkspaceStore.ts`
- Measurement: Not measured in this audit; constants are `IDLE_DELAY = 500`, `MAX_WAIT = 4000`, and `PERIODIC_INTERVAL = 30_000`.
- Cause: Session persistence protects against crashes and external terminal state drift by serializing broad workspace state.
- Improvement path: Track dirty sources per workspace/window, avoid full saves for unchanged workspaces, and benchmark large sessions with many panels and detached windows.

**Document rendering loads full binary data into renderer memory:**
- Problem: `DocumentPanel` reads entire binary files through IPC, converts images to base64 strings, and renders PDF pages through PDF.js on demand.
- Files: `src/renderer/panels/DocumentPanel.tsx`, `src/main/ipc/filesystem.ts`, `src/preload/index.ts`
- Measurement: Not measured in this audit; there is no document file-size cap in `FS_READ_BINARY`.
- Cause: Simple whole-file read path shared across images, PDFs, and DOCX.
- Improvement path: Enforce file-size limits or warnings for document panels, stream large files where supported, and add tests for large image/PDF behavior.

**Canvas layout and visibility selectors sort and scan all nodes:**
- Problem: visible-node and node-id selectors sort all nodes, and layout/snapping functions scan neighbor lists for every operation.
- Files: `src/renderer/stores/canvasStore.ts`, `src/renderer/canvas/layoutEngine.ts`, `src/renderer/canvas/Canvas.tsx`
- Measurement: Not measured in this audit.
- Cause: Canvas state is kept as object maps with derived arrays computed in selectors and layout routines.
- Improvement path: Add performance tests for hundreds of nodes, memoize sorted node order where possible, and introduce spatial indexing only if measured node counts require it.

## Fragile Areas

**Filesystem trust boundary:**
- Why fragile: Allowed roots, temporary write allowances, persistent file grants, symlink checks, and creation-target realpath logic are split across path validation and many IPC handlers.
- Files: `src/main/ipc/pathValidation.ts`, `src/main/ipc/filesystem.ts`, `src/main/index.ts`, `src/main/grantedPathStore.ts`
- Common failures: Granting too broad a path, failing to pass `ownerWindowId`, lexical validation without realpath validation, or allowing symlink escapes.
- Safe modification: Add path-validation tests first, use `validatePathStrict(...)` for existing reads/deletes, `validatePathForCreation(...)` for writes/creates, and thread `windowFromEvent(event)?.id` through grant-aware handlers.
- Test coverage: `src/main/ipc/pathValidation.test.ts` exists; filesystem handler tests are sparse.

**Terminal lifecycle and transfer ownership:**
- Why fragile: PTYs have owners, loggers, process group kills, idle SIGSTOP/SIGCONT, transfer buffers, cross-window migration, quit-time special handling, and a `process.reallyExit(0)` fallback.
- Files: `src/main/ipc/terminal.ts`, `src/renderer/lib/terminalRegistry.ts`, `src/main/index.ts`, `src/renderer/panels/TerminalPanel.tsx`
- Common failures: orphaned child processes, lost output during panel transfer, suspended terminals ignoring termination, or session restore losing CWD/scrollback.
- Safe modification: Preserve the ordering around `SESSION_FLUSH_SAVE`, terminal transfer ack, and `killAllTerminals()`; run `src/main/ipc/terminal.test.ts`, `src/renderer/lib/terminalRegistry.test.ts`, and E2E drag tests after changes.
- Test coverage: Targeted unit tests exist, but full lifecycle behavior depends on Electron/PTY E2E coverage.

**Cross-window drag, panel transfer, and dock restore:**
- Why fragile: A transfer crosses renderer stores, main process window registry, native BrowserWindow creation, terminal ownership, and asynchronous `did-finish-load` delivery.
- Files: `src/main/index.ts`, `src/main/dragLogic.ts`, `src/renderer/drag/commit.ts`, `src/renderer/drag/useDragOp.ts`, `src/renderer/shells/DockWindowShell.tsx`, `src/renderer/lib/session.ts`
- Common failures: black windows in macOS fullscreen, duplicate/lost panels, terminal transfer races, and state restore ordering bugs.
- Safe modification: Keep pure drag decisions in `src/main/dragLogic.ts`, avoid adding side effects to renderer drop resolution, and run `e2e/drag-*.spec.ts` plus `src/renderer/drag/__tests__/*.test.tsx`.
- Test coverage: Strongest coverage is around drag; detached dock/window restore remains high-risk because it spans real Electron windows.

**Agent session multiplexing:**
- Why fragile: One AgentPanel can host multiple pi processes keyed by generated agent keys while also mapping to on-disk session files and renderer store slices.
- Files: `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/agentStore.ts`, `src/agent/main/agentManager.ts`, `src/agent/main/sessionFiles.ts`, `src/agent/main/ipcAgent.ts`
- Common failures: duplicate live sessions for one file, stale active chat after deletion, lost tool approvals, and UI events routed to the wrong panel key.
- Safe modification: Treat `agentKey` as the IPC identity and `sessionFile` as metadata; add tests around open/close/delete chat behavior before changing session bookkeeping.
- Test coverage: `src/agent/main/nodeShim.test.ts` exists, but AgentPanel multi-chat UI and agent event routing have limited automated coverage.

**Auto-update and quit coordination:**
- Why fragile: Update install, session flush, PTY cleanup, Sentry flush, Electron relaunch, and `process.reallyExit(0)` interact in quit paths.
- Files: `src/main/auto-updater.ts`, `src/main/index.ts`, `electron-builder.yml`
- Common failures: update installs without relaunch, session loss during update restart, hanging quit, or PTY process leakage.
- Safe modification: Keep `isInstallingUpdate()` gating in `will-quit`, avoid bypassing Electron updater relaunch hooks, and smoke-test packaged update behavior separately from dev mode.
- Test coverage: Unit coverage for updater is not detected; packaged-update behavior is mostly manual.

## Scaling Limits

**Electron main process as shared bottleneck:**
- Current capacity: Not measured; the main process owns filesystem search, chokidar watcher fanout, git commands, process polling, PTY data buffering, screenshots, updater, analytics, auth, and agent IPC.
- Files: `src/main/index.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/git.ts`, `src/main/ipc/shell.ts`, `src/main/ipc/terminal.ts`, `src/agent/main/ipcAgent.ts`
- Limit: UI responsiveness degrades when expensive IPC handlers or OS polling occupy the main process during large workspaces or many terminals.
- Symptoms at limit: delayed IPC responses, stale watcher updates, slow search, terminal UI lag, and delayed app quit/save.
- Scaling path: Move heavy filesystem/search work to worker processes, add cancellation to long IPC operations, and measure main-process event-loop delay.

**Per-panel browser persistence scales with panel count:**
- Current capacity: Not measured; each browser panel gets a separate persistent partition named by panel ID.
- Files: `src/renderer/panels/BrowserPanel.tsx`, `src/main/webSecurity.ts`
- Limit: Many browser panels accumulate separate cookies/cache/storage and webContents processes.
- Symptoms at limit: memory growth, stale persistent web sessions, and slower startup/restore.
- Scaling path: Offer shared or ephemeral browser profiles, garbage-collect unused panel partitions, and expose browser storage clearing controls.

**Canvas state is in-memory per renderer window:**
- Current capacity: Not measured; canvas nodes, regions, history, dock layouts, panel state, and deferred snapshots live in Zustand stores.
- Files: `src/renderer/stores/canvasStore.ts`, `src/renderer/stores/appStore.ts`, `src/renderer/stores/dockStore.ts`, `src/renderer/lib/session.ts`
- Limit: Large multi-workspace sessions with many canvases, dock windows, terminals, and editors increase memory and autosave serialization cost.
- Symptoms at limit: slow workspace switching, large `.cate/session.json` writes, delayed render updates, and high memory use.
- Scaling path: Add large-session benchmarks, persist inactive workspace snapshots without hydrating full stores, and cap undo/history depth by memory budget.

## Dependencies at Risk

**Electron 41 and native modules:**
- Risk: Electron upgrades can break `node-pty`, webview behavior, sandbox defaults, auto-update packaging, and native module rebuilds.
- Files: `package.json`, `package-lock.json`, `electron-builder.yml`, `src/main/webSecurity.ts`, `src/main/ipc/terminal.ts`
- Impact: Terminal panels, browser panels, packaged builds, and update install behavior can fail.
- Migration plan: Pin Electron upgrades behind a compatibility test matrix: typecheck, unit tests, Electron smoke, E2E drag, terminal create/kill, packaged app launch.

**Pi agent packages are core runtime dependencies:**
- Risk: `@earendil-works/pi-*` packages are bundled/unpacked and expose agent RPC, OAuth, marketplace install, session formats, and CLI behavior.
- Files: `package.json`, `electron.vite.config.ts`, `electron-builder.yml`, `src/agent/main/agentManager.ts`, `src/agent/main/authManager.ts`, `src/agent/main/marketplace.ts`, `src/agent/main/sessionFiles.ts`
- Impact: Agent panels, auth, session replay, marketplace extensions, and node shim behavior can break on package updates.
- Migration plan: Add contract tests for pi RPC event shapes, session file parsing, OAuth callback flow, and marketplace install/uninstall before dependency bumps.

**PDF/DOCX rendering libraries process untrusted files:**
- Risk: `pdfjs-dist` and `mammoth` parse local documents opened from user workspaces.
- Files: `package.json`, `src/renderer/panels/DocumentPanel.tsx`
- Impact: Parser vulnerabilities or resource exhaustion can affect the renderer process.
- Migration plan: Keep these packages current, run dependency audit before releases, add file-size limits, and sanitize DOCX HTML.

## Missing Critical Features

**Central IPC payload validation:**
- Problem: Many IPC handlers accept raw renderer input and rely on TypeScript declarations rather than runtime validation.
- Files: `src/preload/index.ts`, `src/main/index.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/git.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/main/ipcAuth.ts`
- Current workaround: Hand-written validation exists for path-sensitive handlers and selected string inputs.
- Blocks: Confident security hardening and systematic IPC fuzz testing.
- Implementation complexity: Medium; define schemas per IPC group and reject invalid payloads at handler boundaries.

**Dependency/security audit workflow is not visible in package scripts:**
- Problem: `package.json` exposes build, typecheck, unit, E2E, smoke, and packaging scripts, but no audit/security script.
- Files: `package.json`, `package-lock.json`
- Current workaround: Manual `npm audit` or external release checks.
- Blocks: Repeatable release security gate for Electron, native modules, document parsers, Sentry, and agent packages.
- Implementation complexity: Low to medium; add an audit script and document exceptions/triage policy.

**Packaged update tests are not automated:**
- Problem: Auto-update code has platform-specific behavior and fallback paths, but no detected automated tests for `src/main/auto-updater.ts`.
- Files: `src/main/auto-updater.ts`, `src/main/index.ts`, `electron-builder.yml`, `scripts/run-electron-smoke.mjs`
- Current workaround: Manual packaged build/update testing.
- Blocks: Safe changes to updater, quit, relaunch, and release URL behavior.
- Implementation complexity: Medium to high; requires signed/notarized or fixture update feeds plus Electron automation.

## Test Coverage Gaps

**Main-process IPC security handlers:**
- What's not tested: Runtime payload validation and failure paths for `FS_*`, high-risk git worktree mutations, `OPEN_EXTERNAL_URL`, `WEBVIEW_SCREENSHOT`, `AGENT_OPEN_SKILL_FILE`, `AUTH_SAVE_API_KEY`, and marketplace install/uninstall.
- Files: `src/main/index.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/git.ts`, `src/main/analytics.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/main/ipcAuth.ts`
- Risk: Renderer-originated malformed payloads can cause filesystem mutation, external app opens, unexpected shell behavior, or information exposure.
- Priority: High.
- Difficulty to test: Medium; use mocked Electron IPC events and fake BrowserWindow/window registry wrappers.

**Document rendering security:**
- What's not tested: Malicious DOCX-derived HTML, oversized images/PDFs, PDF render cancellation, and unsupported binary behavior.
- Files: `src/renderer/panels/DocumentPanel.tsx`
- Risk: XSS-like renderer DOM injection, memory spikes, and hung document panels.
- Priority: High.
- Difficulty to test: Medium; jsdom can cover sanitization, while PDF rendering needs focused integration tests or mocked PDF.js.

**Agent multi-chat and marketplace UI flows:**
- What's not tested: Opening multiple chats in one AgentPanel, deleting active sessions, mapping session files to live agent keys, tool approval routing, extension UI request routing, marketplace install/uninstall lifecycle.
- Files: `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/agentStore.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/main/marketplace.ts`, `src/agent/main/sessionFiles.ts`
- Risk: Lost conversations, wrong chat receives commands, or untrusted extension install flows regress.
- Priority: High.
- Difficulty to test: High; requires mocked pi RPC and renderer integration tests.

**Updater and privacy defaults:**
- What's not tested: `UPDATE_DOWNLOAD`, `UPDATE_INSTALL`, `UPDATE_OPEN_RELEASE`, fallback GitHub release check, opt-out behavior for Sentry/analytics defaults, and release URL allowlisting.
- Files: `src/main/auto-updater.ts`, `src/main/analytics.ts`, `src/main/sentry.ts`, `src/shared/types.ts`, `src/main/store.ts`
- Risk: Telemetry or crash reporting behavior changes unnoticed, or update links/install paths regress.
- Priority: Medium.
- Difficulty to test: Medium; pure decision logic exists for analytics, updater needs mocked `electron-updater` and `shell`.

**Large-session performance:**
- What's not tested: Hundreds of canvas nodes, many active terminals, large file search, many browser partitions, and autosave serialization cost.
- Files: `src/renderer/stores/canvasStore.ts`, `src/renderer/lib/session.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/shell.ts`, `src/renderer/lib/terminalRegistry.ts`
- Risk: Performance regressions appear only in real projects with many panels.
- Priority: Medium.
- Difficulty to test: Medium; add synthetic benchmark tests and perf assertions outside normal unit tests.

---

*Concerns audit: 2026-05-28*
*Update as issues are fixed or new ones discovered*
