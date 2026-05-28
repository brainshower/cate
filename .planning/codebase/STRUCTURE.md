# Codebase Structure

**Analysis Date:** 2026-05-28

## Directory Layout

```
cate/
├── .github/             # GitHub workflow configuration
├── .planning/           # GSD planning and codebase maps
├── assets/              # Source images and logo assets
├── build/               # Build-time icons and macOS entitlements
├── dist/                # electron-vite build output
├── docs/                # Developer and release notes
├── e2e/                 # Playwright Electron end-to-end tests
├── release/             # Packaged release artifacts
├── scripts/             # Build, packaging, smoke, and Sentry utility scripts
├── src/                 # Application source code
│   ├── agent/           # Pi agent integration and agent panel UI
│   ├── main/            # Electron main process
│   ├── preload/         # Secure preload bridge
│   ├── renderer/        # React renderer application
│   └── shared/          # Cross-process types, constants, and contracts
├── electron-builder.yml # Packaging configuration
├── electron.vite.config.ts # Electron/Vite build configuration
├── index.html           # Renderer HTML entry
├── package.json         # Scripts, package metadata, runtime dependencies
├── playwright.config.ts # E2E test configuration
├── tailwind.config.ts   # Tailwind theme and content configuration
├── tsconfig.json        # TypeScript project config
├── tsconfig.node.json   # Node-side TypeScript config
└── vitest.config.ts     # Unit test configuration
```

## Directory Purposes

**`src/main/`:**
- Purpose: Electron main-process application code.
- Contains: App startup, BrowserWindow creation, native menu, settings store, analytics, updates, shell environment, workspace metadata, window registry, security policy, path grants, and IPC modules.
- Key files: `src/main/index.ts`, `src/main/workspaceManager.ts`, `src/main/windowRegistry.ts`, `src/main/store.ts`, `src/main/projectWorkspaceStore.ts`, `src/main/webSecurity.ts`, `src/main/logger.ts`.
- Subdirectories: `src/main/ipc/` for domain-specific IPC handlers and `src/main/templates/` for generated skill template content.

**`src/main/ipc/`:**
- Purpose: Main-process IPC handler implementations.
- Contains: Terminal PTY management, filesystem operations, path validation, Git operations, shell/process monitoring, drag handling, menu events, notifications, and terminal logging.
- Key files: `src/main/ipc/terminal.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/git.ts`, `src/main/ipc/git-monitor.ts`, `src/main/ipc/pathValidation.ts`, `src/main/ipc/shell.ts`, `src/main/ipc/drag.ts`.
- Subdirectories: None.

**`src/preload/`:**
- Purpose: Secure bridge between renderer and Electron main.
- Contains: `contextBridge.exposeInMainWorld('electronAPI', ...)`, typed wrappers around `ipcRenderer.invoke`, and event subscription helpers.
- Key files: `src/preload/index.ts`.
- Subdirectories: None.

**`src/renderer/`:**
- Purpose: React UI for the infinite canvas IDE.
- Contains: Renderer entry, app window router, shell components, stores, panels, canvas, docking, drag/drop, sidebar, dialogs, settings, hooks, libraries, workers, and styles.
- Key files: `src/renderer/main.tsx`, `src/renderer/App.tsx`, `src/renderer/styles/globals.css`.
- Subdirectories: `src/renderer/canvas/`, `src/renderer/docking/`, `src/renderer/drag/`, `src/renderer/hooks/`, `src/renderer/lib/`, `src/renderer/panels/`, `src/renderer/settings/`, `src/renderer/shells/`, `src/renderer/sidebar/`, `src/renderer/stores/`, `src/renderer/ui/`, `src/renderer/workers/`.

**`src/renderer/stores/`:**
- Purpose: Zustand stores and state helpers for renderer windows.
- Contains: Workspace/panel state, canvas state, dock state, settings, UI overlays, update status, shortcuts, context providers, and sync guards.
- Key files: `src/renderer/stores/appStore.ts`, `src/renderer/stores/canvasStore.ts`, `src/renderer/stores/dockStore.ts`, `src/renderer/stores/settingsStore.ts`, `src/renderer/stores/uiStore.ts`, `src/renderer/stores/updateStore.ts`.
- Subdirectories: None.

**`src/renderer/panels/`:**
- Purpose: Panel components and panel registry.
- Contains: Terminal, editor, browser, Git, file explorer, project list, document, and canvas panel implementations.
- Key files: `src/renderer/panels/registry.ts`, `src/renderer/panels/types.ts`, `src/renderer/panels/TerminalPanel.tsx`, `src/renderer/panels/EditorPanel.tsx`, `src/renderer/panels/BrowserPanel.tsx`, `src/renderer/panels/GitPanel.tsx`, `src/renderer/panels/CanvasPanel.tsx`.
- Subdirectories: None.

**`src/renderer/canvas/`:**
- Purpose: Infinite canvas UI, node wrappers, layout engine, minimap, regions, selection, and canvas control components.
- Contains: React canvas components and pure layout/geometry helpers.
- Key files: `src/renderer/canvas/Canvas.tsx`, `src/renderer/canvas/CanvasNodeWrapper.tsx`, `src/renderer/canvas/layoutEngine.ts`, `src/renderer/canvas/RegionBox.tsx`, `src/renderer/canvas/Minimap.tsx`.
- Subdirectories: None.

**`src/renderer/docking/`:**
- Purpose: Dock zones, tab stacks, split containers, and dock drop interactions.
- Contains: Reusable docking UI primitives used by main shell, dock windows, and per-node dock layouts.
- Key files: `src/renderer/docking/DockZone.tsx`, `src/renderer/docking/DockTabBar.tsx`, `src/renderer/docking/SplitContainer.tsx`, `src/renderer/docking/DropOverlay.tsx`.
- Subdirectories: None.

**`src/renderer/drag/`:**
- Purpose: Cross-window and in-window drag/drop runtime.
- Contains: Drag store, runtime, geometry, registry, commit/resolve logic, overlays, cross-window coordination, remote grab, terminal remount, tests, and harnesses.
- Key files: `src/renderer/drag/index.ts`, `src/renderer/drag/runtime.ts`, `src/renderer/drag/commit.ts`, `src/renderer/drag/crossWindow.ts`, `src/renderer/drag/registry.ts`, `src/renderer/drag/types.ts`.
- Subdirectories: `src/renderer/drag/__tests__/` for drag-specific test harnesses and scenarios.

**`src/renderer/lib/`:**
- Purpose: Renderer-side reusable helpers and service-style modules.
- Contains: Session persistence, terminal registry, theme management, panel transfer, Sentry, OS notifications, performance marks, editor save registry, file routing, coordinate utilities, and agent screen detection.
- Key files: `src/renderer/lib/session.ts`, `src/renderer/lib/terminalRegistry.ts`, `src/renderer/lib/themeManager.ts`, `src/renderer/lib/panelTransfer.ts`, `src/renderer/lib/agentScreenDetector.ts`, `src/renderer/lib/canvasBridge.ts`.
- Subdirectories: None.

**`src/renderer/shells/`:**
- Purpose: Top-level layouts for each Electron window type.
- Contains: Main window shell, dock window shell, legacy panel window shell, titlebar strip, and close/empty helpers.
- Key files: `src/renderer/shells/MainWindowShell.tsx`, `src/renderer/shells/DockWindowShell.tsx`, `src/renderer/shells/PanelWindowShell.tsx`, `src/renderer/shells/TitlebarStrip.tsx`.
- Subdirectories: None.

**`src/renderer/sidebar/`:**
- Purpose: Left/right sidebar navigation and workspace tools.
- Contains: File explorer, source control view, project list, workspace tab, parallel work/worktree tab, sidebar section components, and file clipboard helper.
- Key files: `src/renderer/sidebar/Sidebar.tsx`, `src/renderer/sidebar/WorkspaceTab.tsx`, `src/renderer/sidebar/SourceControlView.tsx`, `src/renderer/sidebar/FileExplorer.tsx`, `src/renderer/sidebar/ParallelWorkTab.tsx`.
- Subdirectories: None.

**`src/renderer/settings/`:**
- Purpose: Settings UI sections.
- Contains: Settings window and per-domain sections for appearance, updates, native tabs, agents, terminals, advanced behavior, and notifications.
- Key files: `src/renderer/settings/SettingsWindow.tsx`.
- Subdirectories: None.

**`src/renderer/hooks/`:**
- Purpose: React hooks and hook-adjacent utilities.
- Contains: Shortcuts, process monitoring, canvas interaction, node resize, notification debounce, and agent panel metadata hooks.
- Key files: `src/renderer/hooks/useShortcuts.ts`, `src/renderer/hooks/useProcessMonitor.ts`, `src/renderer/hooks/useCanvasInteraction.ts`, `src/renderer/hooks/useNodeResize.ts`.
- Subdirectories: None.

**`src/renderer/ui/`:**
- Purpose: Shared renderer UI components.
- Contains: Logo, command palette, welcome page, node switcher, and shortcut overlays/badges.
- Key files: `src/renderer/ui/CommandPalette.tsx`, `src/renderer/ui/NodeSwitcher.tsx`, `src/renderer/ui/CateLogo.tsx`, `src/renderer/ui/WelcomePage.tsx`.
- Subdirectories: None.

**`src/agent/`:**
- Purpose: Pi agent integration split between main process and renderer UI.
- Contains: Main-process auth, RPC, marketplace, session, node shim, extension installation, renderer agent panel, providers view, chat thread, and agent store.
- Key files: `src/agent/main/agentManager.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/main/authManager.ts`, `src/agent/main/ipcAuth.ts`, `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/ChatThread.tsx`.
- Subdirectories: `src/agent/main/`, `src/agent/renderer/`, and `src/agent/extensions/cate-plan-mode/`.

**`src/shared/`:**
- Purpose: Cross-process contracts and pure helpers.
- Contains: IPC channel constants, serializable types, panel metadata, colors, path utilities, and Electron API declarations.
- Key files: `src/shared/ipc-channels.ts`, `src/shared/types.ts`, `src/shared/panels.ts`, `src/shared/electron-api.d.ts`, `src/shared/colors.ts`, `src/shared/pathUtils.ts`.
- Subdirectories: None.

**`e2e/`:**
- Purpose: Playwright Electron tests.
- Contains: Smoke test and drag scenario specs plus Electron launch fixture.
- Key files: `e2e/smoke.spec.ts`, `e2e/drag-split.spec.ts`, `e2e/drag-move.spec.ts`, `e2e/drag-detach.spec.ts`, `e2e/fixtures/electron-app.ts`.
- Subdirectories: `e2e/fixtures/`.

**`scripts/`:**
- Purpose: Local build/release utility scripts.
- Contains: Icon generation, Electron smoke launch, Sentry test, and Electron name patching.
- Key files: `scripts/generate-icons.js`, `scripts/run-electron-smoke.mjs`, `scripts/sentry-test.mjs`, `scripts/patch-electron-name.sh`.
- Subdirectories: None.

**`assets/`:**
- Purpose: Source assets used by documentation, branding, and app packaging inputs.
- Contains: Cate logo SVG, demo GIF, and agent provider logos.
- Key files: `assets/cate-logo.svg`, `assets/demo.gif`, `assets/logos/openai.svg`, `assets/logos/claude.svg`, `assets/logos/cursor.svg`.
- Subdirectories: `assets/logos/`.

**`build/`:**
- Purpose: Packaging assets consumed by Electron build tooling.
- Contains: App icons and macOS entitlements.
- Key files: `build/icon.icns`, `build/icon.ico`, `build/icon.png`, `build/entitlements.mac.plist`.
- Generated: Partly generated by `scripts/generate-icons.js`.
- Committed: Yes.

**`dist/`:**
- Purpose: Build output from `electron-vite build`.
- Contains: Compiled main, preload, and renderer bundles.
- Generated: Yes.
- Committed: Present in working tree; treat as generated output.

**`release/`:**
- Purpose: Packaged app artifacts from `electron-builder`.
- Contains: DMG/ZIP artifacts, blockmaps, latest metadata, and packaged app directories.
- Generated: Yes.
- Committed: Present in working tree; treat as release output.

## Key File Locations

**Entry Points:**
- `src/main/index.ts`: Electron main-process entry, startup sequence, BrowserWindow factory, global IPC registration, window transfer, and app lifecycle.
- `src/preload/index.ts`: Preload bridge entry exposing `window.electronAPI`.
- `src/renderer/main.tsx`: React renderer entry.
- `src/renderer/App.tsx`: Window-type router and main-window app initializer.
- `index.html`: Vite renderer HTML entry.

**Configuration:**
- `package.json`: Package metadata, scripts, engines, dependencies, and main output path.
- `package-lock.json`: npm dependency lockfile.
- `electron.vite.config.ts`: Main/preload/renderer build entry configuration.
- `electron-builder.yml`: Packaging, app ID, files, assets, and platform build settings.
- `tsconfig.json`: TypeScript compiler configuration for the app.
- `tsconfig.node.json`: TypeScript configuration for Node-side config files.
- `tailwind.config.ts`: Tailwind content paths and theme extensions.
- `postcss.config.js`: PostCSS plugin configuration.
- `vitest.config.ts`: Vitest unit test environment, aliases, and setup.
- `playwright.config.ts`: Playwright E2E test configuration.
- `.nvmrc`: Node version hint.

**Core Logic:**
- `src/main/index.ts`: Application lifecycle and main-process orchestration.
- `src/main/ipc/terminal.ts`: PTY lifecycle, terminal ownership, idle suspension, and cross-window transfer buffering.
- `src/main/ipc/filesystem.ts`: File reads/writes, directory reads, search, and shared chokidar watchers.
- `src/main/ipc/git.ts`: Git command IPC handlers.
- `src/main/workspaceManager.ts`: Main-process source of truth for workspace metadata and trusted roots.
- `src/renderer/stores/appStore.ts`: Workspace/panel renderer state and workspace sync.
- `src/renderer/stores/canvasStore.ts`: Canvas node, viewport, region, selection, and history state.
- `src/renderer/stores/dockStore.ts`: Dock zone, split, tab, and panel location state.
- `src/renderer/panels/registry.ts`: Panel lazy loading, icons, creation factory, and render dispatcher.
- `src/shared/ipc-channels.ts`: IPC protocol names.
- `src/shared/types.ts`: Cross-process serializable domain types.
- `src/shared/panels.ts`: Shared panel metadata.
- `src/agent/main/agentManager.ts`: Pi RPC subprocess lifecycle.

**Testing:**
- `src/**/*.test.ts`: Co-located Vitest unit tests beside source modules.
- `src/renderer/drag/__tests__/`: Drag runtime and scenario tests.
- `e2e/*.spec.ts`: Playwright Electron E2E specs.
- `e2e/fixtures/electron-app.ts`: Playwright fixture for launching Electron.
- `vitest.config.ts`: Unit test configuration.
- `playwright.config.ts`: E2E configuration.

**Documentation:**
- `README.md`: Primary user-facing project README.
- `README.de.md`, `README.fr.md`, `README.zh-CN.md`: Localized READMEs.
- `CLAUDE.md`: AI-agent contributor instructions for this repo.
- `CONTRIBUTING.md`: Contributor guidance.
- `CHANGELOG.md`: Release notes.
- `docs/local-mac-build-notes.md`: Local macOS build notes.
- `.planning/codebase/ARCHITECTURE.md`: Architecture map.
- `.planning/codebase/STRUCTURE.md`: Structure map.

## Naming Conventions

**Files:**
- `PascalCase.tsx` for React components: `src/renderer/panels/TerminalPanel.tsx`, `src/renderer/shells/MainWindowShell.tsx`, `src/agent/renderer/AgentPanel.tsx`.
- `camelCase.ts` for TypeScript modules and utilities: `src/main/workspaceManager.ts`, `src/renderer/lib/session.ts`, `src/renderer/stores/appStore.ts`.
- `kebab-case.ts` for a small set of compatibility or domain files: `src/main/auto-updater.ts`, `src/main/ipc/git-monitor.ts`, `src/shared/ipc-channels.ts`.
- `*.test.ts` and `*.test.tsx` for Vitest unit tests: `src/main/ipc/git.test.ts`, `src/renderer/drag/runtime.test.ts`, `src/renderer/sidebar/WorkspaceTab.test.tsx`.
- `*.spec.ts` for Playwright E2E specs under `e2e/`.
- `UPPERCASE.md` for top-level project docs: `README.md`, `CHANGELOG.md`, `LICENSE`, `CLAUDE.md`.

**Directories:**
- Lowercase or camelCase feature directories under `src/renderer/`: `src/renderer/panels/`, `src/renderer/stores/`, `src/renderer/file?` is not used.
- Process-boundary directories are fixed: `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`, `src/agent/`.
- Test-only subdirectories use `__tests__`: `src/renderer/drag/__tests__/`.

**Special Patterns:**
- `registerHandlers()` exports belong in main IPC modules such as `src/main/ipc/terminal.ts`, `src/main/ipc/filesystem.ts`, and `src/main/ipc/git.ts`.
- `PANEL_REGISTRY` is the renderer-side extension point for panel components in `src/renderer/panels/registry.ts`.
- `PANEL_DEFINITIONS` is the shared extension point for panel metadata in `src/shared/panels.ts`.
- Shared IPC names belong only in `src/shared/ipc-channels.ts`.
- Cross-process domain types belong in `src/shared/types.ts`; renderer-only prop types belong near the component, such as `src/renderer/panels/types.ts`.
- Zustand stores export `useXStore` hooks from `src/renderer/stores/*.ts`.

## Where to Add New Code

**New Main-Process IPC Capability:**
- Channel constant: `src/shared/ipc-channels.ts`
- Preload method: `src/preload/index.ts`
- Handler implementation: Add or extend a domain file under `src/main/ipc/`
- Handler registration: `src/main/index.ts` in `registerCriticalHandlers()` only when required before first paint; otherwise `registerDeferredHandlers()`
- Shared payload types: `src/shared/types.ts`
- Tests: Co-located `src/main/ipc/{domain}.test.ts`

**New Renderer Panel Type:**
- Shared type union: `src/shared/types.ts`
- Shared panel metadata: `src/shared/panels.ts`
- Renderer component: `src/renderer/panels/{Name}Panel.tsx`
- Registry entry: `src/renderer/panels/registry.ts`
- Store creation action: `src/renderer/stores/appStore.ts`
- Tests: Co-located `src/renderer/panels/{Name}Panel.test.tsx` or store-level tests near `src/renderer/stores/`

**New Canvas Behavior:**
- Canvas component code: `src/renderer/canvas/`
- Canvas state mutation: `src/renderer/stores/canvasStore.ts`
- Shared geometry/domain type: `src/shared/types.ts`
- Pure geometry helper: `src/renderer/lib/coordinates.ts` or a focused helper in `src/renderer/canvas/`
- Tests: Co-located `*.test.ts` beside the helper/store or under `src/renderer/drag/__tests__/` for drag interactions

**New Docking Behavior:**
- Dock UI component: `src/renderer/docking/`
- Dock state/tree mutation: `src/renderer/stores/dockStore.ts`
- Tree helper: `src/renderer/stores/dockTreeUtils.ts`
- Cross-window drag integration: `src/renderer/drag/` and `src/main/index.ts` window/drag IPC handlers
- Tests: `src/renderer/stores/dockStore.test.ts` or focused tests near `src/renderer/drag/`

**New Agent Capability:**
- Renderer UI: `src/agent/renderer/`
- Main IPC wrapper: `src/agent/main/ipcAgent.ts` or `src/agent/main/ipcAuth.ts`
- Agent lifecycle/RPC logic: `src/agent/main/agentManager.ts`
- Agent session/marketplace/auth helpers: `src/agent/main/sessionFiles.ts`, `src/agent/main/marketplace.ts`, `src/agent/main/authManager.ts`
- Shared channel/type additions: `src/shared/ipc-channels.ts` and `src/shared/types.ts`
- Tests: Co-located tests under `src/agent/main/` or renderer tests near `src/agent/renderer/`

**New Workspace or Persistence Feature:**
- Renderer state: `src/renderer/stores/appStore.ts` or a new focused store in `src/renderer/stores/`
- Main metadata/persistence: `src/main/workspaceManager.ts`, `src/main/projectWorkspaceStore.ts`, or `src/main/store.ts`
- Session serialization: `src/renderer/lib/session.ts`
- IPC contracts: `src/shared/ipc-channels.ts` and `src/shared/types.ts`
- Tests: Co-located tests next to the modified store or main module

**New Shared Utility:**
- Cross-process pure utility: `src/shared/`
- Renderer-only utility: `src/renderer/lib/`
- Main-only utility: `src/main/`
- Hook utility: `src/renderer/hooks/`
- Tests: Co-located `*.test.ts`

**New E2E Scenario:**
- Spec: `e2e/{scenario}.spec.ts`
- Electron fixture usage: `e2e/fixtures/electron-app.ts`
- Renderer-only harness additions: `src/renderer/lib/e2eHarness.ts`

## Special Directories

**`dist/`:**
- Purpose: Compiled application bundles from `electron-vite build`.
- Source: Generated from `src/main/`, `src/preload/`, and `src/renderer/`.
- Generated: Yes.
- Committed: Present in working tree; do not hand-edit.

**`release/`:**
- Purpose: Packaged release output from `electron-builder`.
- Source: Generated by `npm run package`, `npm run package:mac`, `npm run package:win`, or `npm run package:linux`.
- Generated: Yes.
- Committed: Present in working tree; do not hand-edit.

**`build/`:**
- Purpose: Packaging resources consumed by Electron Builder.
- Source: Icons can be generated by `scripts/generate-icons.js`; entitlements are maintained directly.
- Generated: Partly.
- Committed: Yes.

**`node_modules/`:**
- Purpose: Installed npm dependencies.
- Source: Generated by `npm install`.
- Generated: Yes.
- Committed: No.

**`.planning/codebase/`:**
- Purpose: GSD-generated codebase maps used by planning and execution commands.
- Source: Mapper output.
- Generated: Yes.
- Committed: Project-dependent; edit only through mapping workflows unless explicitly requested.

**`src/agent/extensions/cate-plan-mode/`:**
- Purpose: Bundled pi agent extension resources for Cate plan mode.
- Source: Application source asset installed by `src/agent/main/installPlanMode.ts`.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-05-28*
*Update when directory structure changes*
