<!-- GSD:project-start source:PROJECT.md -->
## Project

**Cate FlashQuery Integration**

Cate is a spatial desktop IDE with an infinite canvas for code, terminals, browsers, documents, Git, and AI agent panels. This fork uses Cate as the desktop surface for FlashQuery-related workflows: connecting a workspace to a FlashQuery instance, making memories and documents visible inside the IDE, and giving in-app agents a durable local-first data layer they can use across sessions.

The project is brownfield. Cate already has a mature Electron/React shell, workspace model, file/editor/terminal/browser panels, Git tooling, and an embedded Pi agent subsystem. The new work should extend those surfaces instead of replacing them.

**Core Value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.

### Constraints

- **Tech stack**: Use the existing Electron, React, TypeScript, Zustand, IPC, and Vitest/Playwright stack - avoid adding a separate web backend or UI framework.
- **Security**: Renderer code must not call Node/Electron APIs directly; all privileged FlashQuery work must go through typed preload APIs and main-process validation.
- **Local-first**: FlashQuery data remains in the user's configured FlashQuery instance and vault; Cate stores only connection metadata, user preferences, and UI/session state.
- **Workspace scoping**: Connection and context behavior should be workspace-aware so different Cate projects can use different FlashQuery instances or vaults.
- **Transport**: Prefer FlashQuery's host-visible MCP/HTTP surface for integration planning, with room to support stdio later only if needed.
- **Compatibility**: Do not break existing Cate agent, terminal, editor, browser, Git, workspace, or layout behavior.
- **Testing**: Add focused unit tests for config, IPC validation, and pure helpers; add renderer tests for UI state; add Electron smoke/E2E coverage for at least the happy-path workflow once UI exists.
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.3 - Main process, preload bridge, renderer UI, agent integration, shared types, tests, and build config in `src/`, `electron.vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, and `tailwind.config.ts`.
- TSX / React JSX - Renderer and agent-panel components in `src/renderer/**/*.tsx` and `src/agent/renderer/**/*.tsx`.
- JavaScript / Node ESM scripts - Utility scripts in `scripts/generate-icons.js`, `scripts/run-electron-smoke.mjs`, and `scripts/sentry-test.mjs`.
- YAML - GitHub Actions and Electron Builder configuration in `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and `electron-builder.yml`.
- CSS / Tailwind - Renderer styling in `src/renderer/styles/`, Tailwind tokens in `tailwind.config.ts`, and PostCSS setup in `postcss.config.js`.
## Runtime
- Node.js 20.x or 22.x - `.nvmrc` pins `20`, and `package.json` enforces `>=20 <23`.
- Electron 41.2.0 - Desktop runtime for the main process, preload bridge, renderer windows, webviews, native shell integration, and packaged app distribution.
- Chromium renderer - React UI runs inside Electron renderer processes loaded from `index.html` through `electron-vite`.
- Native Node modules - `node-pty` requires native compilation/prebuild compatibility; `README.md` requires Python 3 and a C++ toolchain for source builds.
- npm >= 9 - Source setup and CI use `npm install`; `README.md` documents npm >= 9.
- Lockfile: `package-lock.json` present, lockfileVersion 3.
- Package manager field: not specified in `package.json`; use npm to match the lockfile and workflows.
## Frameworks
- Electron 41.2.0 - Desktop app shell, main process, IPC, BrowserWindow/webview support, native menus, shell access, and packaging entry point via `src/main/index.ts`.
- React 18.3.1 + React DOM 18.3.1 - Renderer application and agent panel UI in `src/renderer/main.tsx`, `src/renderer/App.tsx`, and `src/agent/renderer/AgentPanel.tsx`.
- electron-vite 5.0.0 + Vite 7.3.2 - Main/preload/renderer bundling configured in `electron.vite.config.ts`.
- @earendil-works Pi stack - Embedded coding-agent runtime through `@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, and `@earendil-works/pi-agent-core` in `src/agent/main/agentManager.ts` and `src/agent/main/authManager.ts`.
- Vitest 3.2.4 - Unit and jsdom tests configured in `vitest.config.ts`; test files are co-located under `src/**/*.test.ts` and `src/**/*.test.tsx`.
- jsdom 29.1.1 - DOM runtime for TSX tests selected by `environmentMatchGlobs` in `vitest.config.ts`.
- Playwright 1.60.0 / @playwright/test 1.60.0 - Electron E2E tests configured in `playwright.config.ts` and stored in `e2e/`.
- Electron smoke harness - `npm run test:smoke:electron` runs `scripts/run-electron-smoke.mjs`.
- TypeScript compiler 5.9.3 - Strict typechecking via `npm run typecheck` and `tsconfig.json`.
- @vitejs/plugin-react 4.7.0 - React transform for renderer and Vitest in `electron.vite.config.ts` and `vitest.config.ts`.
- electron-builder 26.8.1 - Platform packages configured in `electron-builder.yml`.
- Tailwind CSS 3.4.19 + PostCSS 8.5.9 + autoprefixer 10.4.27 - Renderer styling pipeline in `tailwind.config.ts` and `postcss.config.js`.
- @electron/rebuild 4.0.3 - Native dependency rebuild support for Electron-compatible modules.
## Key Dependencies
- `@earendil-works/pi-coding-agent` 0.75.4 - Spawns the Pi RPC coding-agent subprocess from `src/agent/main/agentManager.ts`.
- `@earendil-works/pi-ai` 0.75.5 - Provides OAuth providers, provider discovery, and environment-key lookup in `src/agent/main/authManager.ts`.
- `node-pty` 1.1.0 - Native PTY backend for terminal panels in `src/main/ipc/terminal.ts`.
- `monaco-editor` 0.52.2 - Code editor and worker runtime for editor panels in `src/renderer/panels/EditorPanel.tsx` and `src/renderer/workers/editorService.worker.ts`.
- `zustand` 5.0.12 - Renderer and agent state stores in `src/renderer/stores/`, `src/renderer/drag/store.ts`, and `src/agent/renderer/agentStore.ts`.
- `@sentry/electron` 5.12.0 - Main and renderer crash/error reporting in `src/main/sentry.ts` and `src/renderer/lib/sentry.ts`.
- `electron-updater` 6.8.3 - Native update checks/download/install flow in `src/main/auto-updater.ts`.
- `electron-store` 10.1.0 - User settings, recent projects, and saved layouts in `src/main/store.ts`.
- `electron-log` 5.4.3 - Main and renderer logging in `src/main/logger.ts` and `src/renderer/lib/logger.ts`.
- `simple-git` 3.35.2 - Git status, diff, branch, fetch/pull/push, and worktree operations in `src/main/ipc/git.ts`.
- `chokidar` 4.0.3 - Shared filesystem watcher pool in `src/main/ipc/filesystem.ts`.
- `@xterm/xterm` 5.5.0 with fit/search/webgl addons - Terminal rendering in `src/renderer/lib/terminalRegistry.ts`.
- `pdfjs-dist` 5.7.284 and `mammoth` 1.12.0 - PDF and DOCX document panels in `src/renderer/panels/DocumentPanel.tsx`.
## Configuration
- `SENTRY_DSN` - Optional runtime/build-time Sentry DSN read by `src/main/sentry.ts`; `electron.vite.config.ts` inlines it as `__SENTRY_DSN__`; package scripts provide a default DSN for packaged builds.
- `DEV_FORCE_DIALOG` - Development-only feedback dialog trigger used by `src/main/analytics.ts` and `npm run dev:dialog`.
- `CATE_E2E` - E2E isolation flag used by `src/preload/index.ts`, `src/main/index.ts`, and `e2e/fixtures/electron-app.ts`.
- `CATE_SMOKE_TEST` - Electron smoke-test flag set by `scripts/run-electron-smoke.mjs` and read by `src/main/index.ts`.
- `ELECTRON_RENDERER_URL` - electron-vite development renderer URL consumed by `src/main/index.ts` and `src/main/webSecurity.ts`.
- AI provider credentials - Optional environment variables detected by `src/agent/main/authManager.ts`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `ZAI_API_KEY`, `MINIMAX_API_KEY`, `CEREBRAS_API_KEY`, `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `HF_TOKEN`, `CLOUDFLARE_API_KEY`, and `AI_GATEWAY_API_KEY`.
- Release signing/publishing credentials - GitHub Actions release job uses `GH_TOKEN`, `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` in `.github/workflows/release.yml`.
- `.env` files: none detected at repo root during analysis.
- `package.json` - Scripts, engines, dependency ranges, app metadata, and main entry.
- `package-lock.json` - Resolved npm dependency graph.
- `electron.vite.config.ts` - Main/preload/renderer build targets, Sentry define injection, React plugin, PostCSS, and Pi package bundling exceptions.
- `electron-builder.yml` - App ID, product name, output directory, asar unpack rules, extra resources, GitHub publish provider, and macOS/Windows/Linux targets.
- `tsconfig.json` and `tsconfig.node.json` - Strict TypeScript options and path aliases: `@shared/*`, `@renderer/*`, and `@main/*`.
- `tailwind.config.ts` and `postcss.config.js` - Tailwind content roots, theme tokens, dark mode, PostCSS plugins.
- `vitest.config.ts` and `playwright.config.ts` - Unit/jsdom and Electron E2E test configuration.
## Platform Requirements
- macOS, Linux, or Windows with Node.js 20 or 22 LTS; Node 23+ is excluded by `package.json` and `README.md`.
- Python 3 and C++ build tools are required for native dependencies such as `node-pty`; platform-specific prerequisites are documented in `README.md`.
- Use `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, and `npm run test:e2e` from the repo root.
- Git is required for source-control features implemented through `simple-git` in `src/main/ipc/git.ts`.
- Distributed as an Electron desktop app through `electron-builder`.
- macOS targets: DMG and ZIP for x64 and arm64, hardened runtime and notarization configured in `electron-builder.yml`.
- Windows targets: NSIS installer and ZIP for x64 in `electron-builder.yml`.
- Linux targets: AppImage, DEB, and tar.gz for x64 in `electron-builder.yml`.
- Release CI builds and uploads artifacts from `release/` through `.github/workflows/release.yml`.
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Use `PascalCase.tsx` for React components and UI surfaces: `src/renderer/canvas/CanvasToolbar.tsx`, `src/renderer/sidebar/FileTreeNode.tsx`, `src/renderer/settings/ShortcutRecorder.tsx`.
- Use `camelCase.ts` for utilities, stores, hooks, and main-process modules: `src/main/pathValidation.ts`, `src/renderer/drag/grabOffset.ts`, `src/renderer/stores/canvasStore.ts`.
- Keep test files next to the code they cover with `.test.ts` or `.test.tsx`: `src/main/ipc/pathValidation.test.ts`, `src/renderer/drag/geometry.test.ts`, `src/renderer/sidebar/WorkspaceTab.test.tsx`.
- Use `*.spec.ts` only for Playwright E2E tests in `e2e/`: `e2e/smoke.spec.ts`, `e2e/drag-move.spec.ts`.
- Use `index.ts` only as a true entry point or package boundary, not as a general barrel: `src/preload/index.ts`, `src/main/index.ts`, `src/renderer/main.tsx`, `src/agent/extensions/cate-plan-mode/index.ts`.
- Use `camelCase` for functions and hooks: `validatePathStrict` in `src/main/ipc/pathValidation.ts`, `cursorToCanvasOrigin` in `src/renderer/drag/geometry.ts`, `useCanvasStoreApi` in `src/renderer/stores/CanvasStoreContext.tsx`.
- React hooks must use the `useThing` prefix and live near their domain: `src/renderer/drag/useDragOp.ts`, `src/renderer/hooks/useNodeResize.ts`, `src/renderer/canvas/useCanvasNodeStyle.ts`.
- Event callbacks and local UI callbacks use action names such as `onNewTerminal`, `onZoomToFit`, and small wrapper helpers such as `pick` in `src/renderer/canvas/CanvasToolbar.tsx`.
- Test helper factories and drivers use direct imperative names: `launchApp`, `closeApp`, `dragMouse`, `seedTerminal` in `e2e/fixtures/electron-app.ts`.
- Use `camelCase` for locals and state selectors: `menuOpen`, `menuRef`, `zoomText` in `src/renderer/canvas/CanvasToolbar.tsx`.
- Use `UPPER_SNAKE_CASE` for exported constants and IPC channel names: `TERMINAL_CREATE`, `GIT_STATUS`, `AGENT_CREATE` in `src/shared/ipc-channels.ts`.
- Use `PascalCase` for React component identifiers, including local components: `ToolbarButton`, `MenuItem`, `CanvasToolbar` in `src/renderer/canvas/CanvasToolbar.tsx`.
- Avoid underscore private prefixes. Prefer module-private variables such as `allowedRoots`, `scopedWriteAllowances`, and `persistentFileGrants` in `src/main/ipc/pathValidation.ts`.
- Use `PascalCase` for interfaces and type aliases with no `I` prefix: `CanvasStoreState`, `CanvasStoreActions`, `CanvasHistoryEntry` in `src/renderer/stores/canvasStore.ts`.
- Use explicit exported interfaces for structured props and public contracts: `CanvasToolbarProps` in `src/renderer/canvas/CanvasToolbar.tsx`, `LaunchResult` in `e2e/fixtures/electron-app.ts`.
- Use discriminated unions and literal types for domain state where possible: `PanelType`, `CateWindowType`, `DockLayoutNode`, and drag-state types in `src/shared/types.ts` and `src/renderer/drag/types.ts`.
- Prefer `import type` for type-only imports: `src/renderer/drag/geometry.ts`, `src/renderer/stores/canvasStore.ts`, `e2e/smoke.spec.ts`.
## Code Style
- No formatter config is present. Match the existing style used in `src/main/logger.ts`, `src/renderer/canvas/CanvasToolbar.tsx`, and `vitest.config.ts`.
- Use TypeScript with strict mode from `tsconfig.json`; run `npm run typecheck` before broad changes.
- Use single quotes for strings and imports.
- Omit semicolons in normal TypeScript/TSX code.
- Use 2-space indentation in JSX and object literals.
- Allow trailing commas in multiline parameters, imports, arrays, and objects: `registerScopedWriteAllowance` in `src/main/ipc/pathValidation.ts`, type imports in `src/renderer/stores/canvasStore.ts`.
- Keep JSX utility classes inline with Tailwind strings when components are small and localized: `src/renderer/canvas/CanvasToolbar.tsx`.
- Use numeric separators for large constants and timing values: `60_000` in `src/main/ipc/pathValidation.ts`, `timeout: 60_000` in `playwright.config.ts`.
- No ESLint, Prettier, or Biome config is detected in the repo root.
- Available quality commands are `npm run typecheck`, `npm test`, and `npm run test:e2e` from `package.json`.
- Treat `tsconfig.json` strictness as the primary static correctness gate.
## Import Organization
- Blank lines are not consistently required between import groups. Follow the surrounding file.
- Keep import order readable by dependency distance rather than strict alphabetization.
- For tests that mock import-time side effects, place `vi.mock(...)` before dynamic imports of the module under test: `src/main/analytics.test.ts`, `src/main/ipc/git.test.ts`.
- `@shared/*` maps to `src/shared/*` in `tsconfig.json` and `vitest.config.ts`.
- `@renderer/*` maps to `src/renderer/*` in `tsconfig.json`.
- `@main/*` maps to `src/main/*` in `tsconfig.json`.
- Existing source mostly uses relative imports; prefer the local convention in the edited directory unless an alias already appears nearby.
## Error Handling
- Main-process IPC handlers catch errors at the boundary, log with the IPC channel name, and return safe fallback values where the renderer expects data: `src/main/ipc/git.ts`, `src/main/index.ts`.
- Validation helpers throw `Error` with user-actionable messages for denied paths or invalid state: `validatePath`, `validatePathStrict`, and `validatePathForCreation` in `src/main/ipc/pathValidation.ts`.
- Best-effort cleanup uses narrow empty catches only where failure is intentionally ignored: `closeApp` in `e2e/fixtures/electron-app.ts`, stream EIO guards in `src/main/logger.ts`, window cleanup in `src/main/index.ts`.
- Async operations use `async`/`await`; avoid `.then()` chains unless interacting with APIs where a compact continuation is already established.
- Use plain `Error` for validation and invariant failures unless the surrounding module defines a richer domain type.
- Include the failed operation or path in error messages, as in `normalizeCreationTarget` and `validatePathStrict` in `src/main/ipc/pathValidation.ts`.
- Preserve operational context in logs with prefixes such as `[auto-updater]`, `[DIALOG_SAVE_FILE]`, and IPC channel constants in `src/main/auto-updater.ts` and `src/main/index.ts`.
## Logging
- Main process logging uses `electron-log/main` through the default export in `src/main/logger.ts`.
- Renderer logging uses `electron-log/renderer` through renderer-side logger modules such as `src/renderer/lib/logger.ts`.
- Sentry is initialized and flushed through `src/main/sentry.ts` and renderer Sentry support in `src/renderer/lib/sentry.ts`.
- Import `log` from the local logger module, not directly from `electron-log`, for production code.
- Use levels `debug`, `info`, `warn`, and `error`; file transport persists `info+`, while console debug is development-only in `src/main/logger.ts`.
- Log state transitions and external/native boundaries: update checks in `src/main/auto-updater.ts`, startup and shutdown in `src/main/index.ts`, git IPC errors in `src/main/ipc/git.ts`.
- Do not use `console.log` for app logging. Console use is limited to scripts such as `scripts/generate-icons.js` and `scripts/sentry-test.mjs`.
## Comments
- Use block banner comments to orient substantial modules: `src/main/ipc/pathValidation.ts`, `src/renderer/drag/geometry.ts`, `src/renderer/drag/__tests__/harness.tsx`.
- Comment security, coordinate-system, IPC, and timing decisions where the reason is not obvious.
- Keep inline comments focused on invariants and edge cases, such as symlink handling in `src/main/ipc/pathValidation.ts` and drag regression notes in `src/renderer/drag/__tests__/scenarios.test.tsx`.
- Use JSDoc for exported helpers where callers need contract details: `grantFileAccess`, `validatePathStrict`, `validatePathForCreation`, and `validateCwd` in `src/main/ipc/pathValidation.ts`.
- React components generally do not use JSDoc; keep prop interfaces self-describing.
- No enforced TODO format is detected. When adding TODOs, include the concrete missing behavior and preferably a tracking issue or phase reference.
## Function Design
- Prefer pure helper functions for reusable logic and keep UI components composed from small local helpers: `ToolbarButton` and `MenuItem` in `src/renderer/canvas/CanvasToolbar.tsx`.
- For large state stores, group actions by behavior in interfaces and comments: `CanvasStoreState` and `CanvasStoreActions` in `src/renderer/stores/canvasStore.ts`.
- Extract cross-cutting math and decisions into pure modules with direct tests: `src/renderer/lib/coordinates.ts`, `src/renderer/drag/geometry.ts`, `src/main/dragLogic.ts`.
- Use positional parameters for small pure helpers with stable signatures: `cursorToCanvasOrigin` in `src/renderer/drag/geometry.ts`.
- Use options objects for test helpers and extensible APIs: `dragMouse` in `e2e/fixtures/electron-app.ts`, `downOnNode` in `src/renderer/drag/__tests__/harness.tsx`.
- Type callback props explicitly in component prop interfaces: `CanvasToolbarProps` in `src/renderer/canvas/CanvasToolbar.tsx`.
- Return normalized domain values rather than mutating caller-owned objects in pure helpers: `ghostScreenRect` in `src/renderer/drag/geometry.ts`.
- Return `null` for expected absence in lookup helpers: `getNodeRect`, `getNodeOrigin`, and `firstNodeInfo` in `e2e/fixtures/electron-app.ts`.
- Throw for invalid security-sensitive inputs at validation boundaries: `src/main/ipc/pathValidation.ts`.
## Module Design
- Prefer named exports for utilities, stores, handlers, and test helpers: `src/main/ipc/pathValidation.ts`, `src/renderer/drag/geometry.ts`, `e2e/fixtures/electron-app.ts`.
- Use default exports for singleton logger instances and top-level React components where already established: `src/main/logger.ts`, `src/renderer/canvas/CanvasToolbar.tsx`.
- Keep module-private state inside the module that owns it: path grants in `src/main/ipc/pathValidation.ts`, registered drag rects in `src/renderer/drag/__tests__/harness.tsx`.
- General barrel files are not a dominant pattern. Add imports from concrete modules unless the directory already exposes an intentional entry point.
- Preserve process boundaries: main-process code belongs in `src/main/`, preload bridge code in `src/preload/`, renderer UI/state in `src/renderer/`, and shared contracts/constants in `src/shared/`.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Electron main process starts the app, owns native windows, registers IPC handlers, and controls OS-level resources in `src/main/index.ts`.
- React renderer owns the canvas IDE interface, panel registry, workspace UI state, dock layout, session restore, and panel rendering in `src/renderer/App.tsx`.
- `src/preload/index.ts` is the only renderer-to-main bridge; renderer code should call `window.electronAPI` instead of importing Electron directly.
- Shared channel constants, panel definitions, and serializable types live in `src/shared/` and are imported by both main and renderer code.
- Agent panels use a main-process `AgentManager` wrapper around `@earendil-works/pi-coding-agent` RPC subprocesses in `src/agent/main/agentManager.ts`.
## Layers
- Purpose: Own application lifecycle, BrowserWindow creation, IPC registration, OS integration, security policy, terminal processes, filesystem access, Git access, workspace metadata, auto-updates, analytics, and agent subprocesses.
- Contains: `src/main/index.ts`, `src/main/ipc/*.ts`, `src/main/workspaceManager.ts`, `src/main/windowRegistry.ts`, `src/main/store.ts`, `src/main/projectWorkspaceStore.ts`, `src/main/webSecurity.ts`.
- Depends on: Electron, Node.js APIs, `node-pty`, `simple-git`, `chokidar`, `electron-store`, `electron-updater`, Sentry, and shared constants/types from `src/shared/`.
- Used by: Preload IPC invocations from `src/preload/index.ts` and app lifecycle events from Electron.
- Purpose: Expose a controlled `window.electronAPI` facade for renderer code while keeping `contextIsolation: true` and `nodeIntegration: false`.
- Contains: `src/preload/index.ts` and the public API shape declared in `src/shared/electron-api.d.ts`.
- Depends on: Electron `contextBridge`, `ipcRenderer`, `webUtils`, and channel constants from `src/shared/ipc-channels.ts`.
- Used by: Renderer panels, stores, hooks, and libraries under `src/renderer/` and `src/agent/renderer/`.
- Purpose: Route each BrowserWindow to the correct React shell and wire global renderer systems.
- Contains: `src/renderer/main.tsx`, `src/renderer/App.tsx`, `src/renderer/shells/MainWindowShell.tsx`, `src/renderer/shells/PanelWindowShell.tsx`, `src/renderer/shells/DockWindowShell.tsx`.
- Depends on: React, Zustand stores, renderer libraries, panel registry, shared types, and `window.electronAPI`.
- Used by: Vite-rendered Electron windows loaded by `src/main/index.ts`.
- Purpose: Manage workspaces, panel records, canvas nodes, regions, dock zones, settings, status, shortcuts, and UI overlays.
- Contains: `src/renderer/stores/appStore.ts`, `src/renderer/stores/canvasStore.ts`, `src/renderer/stores/dockStore.ts`, `src/renderer/stores/settingsStore.ts`, `src/renderer/stores/uiStore.ts`, `src/renderer/stores/updateStore.ts`.
- Depends on: Zustand, shared types in `src/shared/types.ts`, panel definitions in `src/shared/panels.ts`, and renderer helpers in `src/renderer/lib/`.
- Used by: Shells, panels, canvas components, sidebar components, dialogs, and hooks.
- Purpose: Render IDE content as movable canvas nodes, dock tabs/splits, sidebars, terminal/browser/editor/git/file/document/agent panels, and drag/drop interactions.
- Contains: `src/renderer/panels/`, `src/renderer/canvas/`, `src/renderer/docking/`, `src/renderer/drag/`, `src/renderer/sidebar/`, `src/renderer/dialogs/`, `src/renderer/ui/`.
- Depends on: Renderer stores, `PANEL_REGISTRY` in `src/renderer/panels/registry.ts`, `PANEL_DEFINITIONS` in `src/shared/panels.ts`, and IPC bridge APIs.
- Used by: `src/renderer/App.tsx` and shell components under `src/renderer/shells/`.
- Purpose: Provide agent panels backed by pi RPC sessions, auth, marketplace extensions, session files, and renderer chat UI.
- Contains: `src/agent/main/agentManager.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/main/authManager.ts`, `src/agent/main/sessionFiles.ts`, `src/agent/main/marketplace.ts`, `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/ChatThread.tsx`.
- Depends on: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-agent-core`, Electron IPC, main-process shell environment, shared types, and renderer panel registry.
- Used by: The `agent` panel entry in `src/renderer/panels/registry.ts` and deferred IPC registration in `src/main/index.ts`.
- Purpose: Keep main, preload, renderer, and agent code aligned on serializable contracts.
- Contains: `src/shared/ipc-channels.ts`, `src/shared/types.ts`, `src/shared/panels.ts`, `src/shared/colors.ts`, `src/shared/pathUtils.ts`, `src/shared/electron-api.d.ts`.
- Depends on: TypeScript only.
- Used by: All runtime layers.
## Data Flow
- Renderer UI state is local to each renderer process through Zustand stores in `src/renderer/stores/`.
- Workspace metadata is authoritative in the main process through `src/main/workspaceManager.ts`.
- Settings, layouts, boot snapshots, recent projects, and project workspace state are persisted by `src/main/store.ts` and `src/main/projectWorkspaceStore.ts`.
- Terminal PTY instances and ownership live in main-process maps in `src/main/ipc/terminal.ts`.
- Agent RPC sessions live in `AgentManager.sessions` in `src/agent/main/agentManager.ts`.
## Key Abstractions
- Purpose: Provide a named, shared protocol for preload, renderer, and main process communication.
- Examples: `src/shared/ipc-channels.ts`, `src/preload/index.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/terminal.ts`, `src/agent/main/ipcAgent.ts`.
- Pattern: Constants plus `ipcMain.handle`/`ipcRenderer.invoke`; main-to-renderer events use `webContents.send`.
- Purpose: Centralize panel type metadata, lazy component loading, icons, defaults, and creation logic.
- Examples: `src/shared/panels.ts`, `src/renderer/panels/registry.ts`, `src/shared/types.ts`.
- Pattern: Shared serializable definitions extended by renderer-only registry entries. Add a panel type in both `src/shared/panels.ts` and `src/renderer/panels/registry.ts`.
- Purpose: Hold renderer window state and expose mutation methods to UI components.
- Examples: `src/renderer/stores/appStore.ts`, `src/renderer/stores/canvasStore.ts`, `src/renderer/stores/dockStore.ts`, `src/renderer/stores/settingsStore.ts`.
- Pattern: Store modules export hooks and imperative `getState()` APIs; shared logic belongs in `src/renderer/lib/` or a dedicated store utility.
- Purpose: Represent VS Code-style dock zones, tab stacks, splits, and per-node dock layouts.
- Examples: `DockLayoutNode`, `DockSplitNode`, and `DockTabStack` in `src/shared/types.ts`; tree operations in `src/renderer/stores/dockStore.ts`; helpers in `src/renderer/stores/dockTreeUtils.ts`.
- Pattern: Recursive serializable tree with actions for docking, moving tabs, ratios, and snapshots.
- Purpose: Represent infinite canvas nodes, regions, viewport, zoom, selection, z-order, and undo/redo.
- Examples: `src/renderer/stores/canvasStore.ts`, `src/renderer/canvas/Canvas.tsx`, `src/renderer/canvas/CanvasNodeWrapper.tsx`.
- Pattern: One primary canvas store plus per-canvas-panel store instances routed through canvas operations in `src/renderer/stores/appStore.ts`.
- Purpose: Track Electron windows by ID and type, send events to specific windows, broadcast events, and store panel/dock metadata.
- Examples: `src/main/windowRegistry.ts`, `src/main/index.ts`.
- Pattern: Main-process singleton registry used by IPC handlers and window lifecycle code.
- Purpose: Own one pi RPC client per agent panel and translate renderer commands into RPC calls.
- Examples: `src/agent/main/agentManager.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/renderer/AgentPanel.tsx`.
- Pattern: Class with per-panel sessions map and per-panel promise locks.
## Entry Points
- Location: `src/main/index.ts`
- Triggers: `electron-vite dev`, packaged app launch, or `electron-vite preview`.
- Responsibilities: Initialize shell env/security, register IPC handlers, create windows, manage startup/shutdown, window transfer, drag/drop, updates, analytics, and cross-window events.
- Location: `src/preload/index.ts`
- Triggers: BrowserWindow preload configured by `createWindow()` in `src/main/index.ts`.
- Responsibilities: Expose `window.electronAPI`, wrap IPC methods, expose event subscription helpers, and keep renderer isolated from Node/Electron imports.
- Location: `src/renderer/main.tsx`
- Triggers: `index.html` loaded by BrowserWindow.
- Responsibilities: Initialize renderer logging/Sentry, global error handlers, OS notification click subscription, styles, and React root.
- Location: `src/renderer/App.tsx`
- Triggers: React render from `src/renderer/main.tsx`.
- Responsibilities: Route main/panel/dock windows by query params and initialize main-window systems.
- Location: `src/agent/main/ipcAgent.ts`
- Triggers: Deferred IPC registration in `src/main/index.ts`.
- Responsibilities: Register `AGENT_*` handlers and delegate to `AgentManager`, session files, skill files, and marketplace helpers.
## Architectural Constraints
- **Process model:** Main, preload, and renderer must remain separated. Main can use Node/Electron APIs; renderer should use `window.electronAPI` from `src/preload/index.ts`.
- **Security boundary:** `BrowserWindow` uses `contextIsolation: true`, `nodeIntegration: false`, sandboxing unless disabled by dev feature flags, `webSecurity: true`, CSP, and webview security hooks in `src/main/index.ts` and `src/main/webSecurity.ts`.
- **Workspace trust:** Filesystem and terminal operations must pass through trusted roots and path validation in `src/main/ipc/pathValidation.ts`, `src/main/workspaceRoots.ts`, and `src/main/workspaceManager.ts`.
- **Global state:** Main process uses module-level registries and maps for windows, workspaces, terminals, watchers, grants, settings, and agents in files such as `src/main/windowRegistry.ts`, `src/main/workspaceManager.ts`, `src/main/ipc/terminal.ts`, `src/main/ipc/filesystem.ts`, and `src/agent/main/agentManager.ts`.
- **Cold-start path:** Critical IPC belongs in `registerCriticalHandlers()` in `src/main/index.ts`; Git, notifications, auth, and agent handlers belong in deferred registration when not needed before first paint.
- **Panel type extension:** Add shared metadata in `src/shared/panels.ts`, update the `PanelType` union in `src/shared/types.ts`, and add renderer loading/creation logic in `src/renderer/panels/registry.ts`.
- **Serializable contracts:** IPC payloads and persisted session state should use structures from `src/shared/types.ts`; avoid sending class instances or non-serializable objects across process boundaries.
- **Circular imports:** Not detected during this mapping; keep shared code free of imports from `src/main/`, `src/preload/`, `src/renderer/`, or `src/agent/`.
## Anti-Patterns
### Renderer Importing Electron or Node APIs
### Switching on Panel Types Across the App
### Mutating Workspace Metadata Only in Renderer
### Blocking First Paint With Non-Critical Handlers
## Error Handling
- Main startup and renderer startup install global error logging in `src/main/index.ts` and `src/renderer/main.tsx`.
- Renderer render failures are contained by the `ErrorBoundary` in `src/renderer/main.tsx`.
- Workspace mutations return `WorkspaceMutationResult` from `src/main/workspaceManager.ts`.
- Agent creation catches startup errors, sends an error event, and returns `{ ok: false, error }` in `src/agent/main/ipcAgent.ts`.
- IPC modules commonly log warnings with `src/main/logger.ts` and return empty arrays, null, false, or structured failure objects for recoverable failures.
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
