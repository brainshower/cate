# Architecture

**Analysis Date:** 2026-05-28

## Pattern Overview

**Overall:** Electron desktop application with a React renderer, secured preload IPC boundary, Zustand UI state, and main-process service modules.

**Key Characteristics:**
- Electron main process starts the app, owns native windows, registers IPC handlers, and controls OS-level resources in `src/main/index.ts`.
- React renderer owns the canvas IDE interface, panel registry, workspace UI state, dock layout, session restore, and panel rendering in `src/renderer/App.tsx`.
- `src/preload/index.ts` is the only renderer-to-main bridge; renderer code should call `window.electronAPI` instead of importing Electron directly.
- Shared channel constants, panel definitions, and serializable types live in `src/shared/` and are imported by both main and renderer code.
- Agent panels use a main-process `AgentManager` wrapper around `@earendil-works/pi-coding-agent` RPC subprocesses in `src/agent/main/agentManager.ts`.

## Layers

**Electron Main Process:**
- Purpose: Own application lifecycle, BrowserWindow creation, IPC registration, OS integration, security policy, terminal processes, filesystem access, Git access, workspace metadata, auto-updates, analytics, and agent subprocesses.
- Contains: `src/main/index.ts`, `src/main/ipc/*.ts`, `src/main/workspaceManager.ts`, `src/main/windowRegistry.ts`, `src/main/store.ts`, `src/main/projectWorkspaceStore.ts`, `src/main/webSecurity.ts`.
- Depends on: Electron, Node.js APIs, `node-pty`, `simple-git`, `chokidar`, `electron-store`, `electron-updater`, Sentry, and shared constants/types from `src/shared/`.
- Used by: Preload IPC invocations from `src/preload/index.ts` and app lifecycle events from Electron.

**Preload Bridge:**
- Purpose: Expose a controlled `window.electronAPI` facade for renderer code while keeping `contextIsolation: true` and `nodeIntegration: false`.
- Contains: `src/preload/index.ts` and the public API shape declared in `src/shared/electron-api.d.ts`.
- Depends on: Electron `contextBridge`, `ipcRenderer`, `webUtils`, and channel constants from `src/shared/ipc-channels.ts`.
- Used by: Renderer panels, stores, hooks, and libraries under `src/renderer/` and `src/agent/renderer/`.

**Renderer Application Shell:**
- Purpose: Route each BrowserWindow to the correct React shell and wire global renderer systems.
- Contains: `src/renderer/main.tsx`, `src/renderer/App.tsx`, `src/renderer/shells/MainWindowShell.tsx`, `src/renderer/shells/PanelWindowShell.tsx`, `src/renderer/shells/DockWindowShell.tsx`.
- Depends on: React, Zustand stores, renderer libraries, panel registry, shared types, and `window.electronAPI`.
- Used by: Vite-rendered Electron windows loaded by `src/main/index.ts`.

**Renderer State and Domain Stores:**
- Purpose: Manage workspaces, panel records, canvas nodes, regions, dock zones, settings, status, shortcuts, and UI overlays.
- Contains: `src/renderer/stores/appStore.ts`, `src/renderer/stores/canvasStore.ts`, `src/renderer/stores/dockStore.ts`, `src/renderer/stores/settingsStore.ts`, `src/renderer/stores/uiStore.ts`, `src/renderer/stores/updateStore.ts`.
- Depends on: Zustand, shared types in `src/shared/types.ts`, panel definitions in `src/shared/panels.ts`, and renderer helpers in `src/renderer/lib/`.
- Used by: Shells, panels, canvas components, sidebar components, dialogs, and hooks.

**Panel and Canvas UI:**
- Purpose: Render IDE content as movable canvas nodes, dock tabs/splits, sidebars, terminal/browser/editor/git/file/document/agent panels, and drag/drop interactions.
- Contains: `src/renderer/panels/`, `src/renderer/canvas/`, `src/renderer/docking/`, `src/renderer/drag/`, `src/renderer/sidebar/`, `src/renderer/dialogs/`, `src/renderer/ui/`.
- Depends on: Renderer stores, `PANEL_REGISTRY` in `src/renderer/panels/registry.ts`, `PANEL_DEFINITIONS` in `src/shared/panels.ts`, and IPC bridge APIs.
- Used by: `src/renderer/App.tsx` and shell components under `src/renderer/shells/`.

**Agent Subsystem:**
- Purpose: Provide agent panels backed by pi RPC sessions, auth, marketplace extensions, session files, and renderer chat UI.
- Contains: `src/agent/main/agentManager.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/main/authManager.ts`, `src/agent/main/sessionFiles.ts`, `src/agent/main/marketplace.ts`, `src/agent/renderer/AgentPanel.tsx`, `src/agent/renderer/ChatThread.tsx`.
- Depends on: `@earendil-works/pi-coding-agent`, `@earendil-works/pi-agent-core`, Electron IPC, main-process shell environment, shared types, and renderer panel registry.
- Used by: The `agent` panel entry in `src/renderer/panels/registry.ts` and deferred IPC registration in `src/main/index.ts`.

**Shared Contracts:**
- Purpose: Keep main, preload, renderer, and agent code aligned on serializable contracts.
- Contains: `src/shared/ipc-channels.ts`, `src/shared/types.ts`, `src/shared/panels.ts`, `src/shared/colors.ts`, `src/shared/pathUtils.ts`, `src/shared/electron-api.d.ts`.
- Depends on: TypeScript only.
- Used by: All runtime layers.

## Data Flow

**Application Startup:**

1. Electron calls `app.whenReady()` in `src/main/index.ts:1195`.
2. Main resolves shell environment with `initShellEnv()` in `src/main/index.ts:1203`.
3. Main installs CSP/security, registers critical handlers, runs migration, and creates the main BrowserWindow in `src/main/index.ts:1231` through `src/main/index.ts:1237`.
4. `createWindow()` configures preload, sandboxing, context isolation, web security, window type, and boot snapshot geometry in `src/main/index.ts:95`.
5. Renderer loads `src/renderer/main.tsx`, initializes Sentry/logging/error boundary, and renders `src/renderer/App.tsx`.
6. `App()` routes by URL query to `MainApp`, `PanelWindowShell`, or `DockWindowShell` in `src/renderer/App.tsx:70`.
7. `MainApp` wires canvas operations, loads settings, restores session/workspaces, ensures a center canvas panel, and starts background session autosave in `src/renderer/App.tsx:166`.
8. Deferred IPC handlers and auto-updater startup run after `ready-to-show` in `src/main/index.ts:1248`.

**Renderer-to-Main IPC Request:**

1. A panel/store calls a method on `window.electronAPI` exposed by `src/preload/index.ts:202`.
2. Preload invokes an IPC channel constant from `src/shared/ipc-channels.ts`.
3. Main handles the request in a domain module such as `src/main/ipc/filesystem.ts`, `src/main/ipc/terminal.ts`, `src/main/ipc/git.ts`, `src/main/workspaceManager.ts`, or `src/agent/main/ipcAgent.ts`.
4. Main validates boundaries where needed, performs OS or process work, and returns serializable data to the renderer.
5. Renderer updates Zustand state or component-local state in `src/renderer/stores/` or `src/renderer/panels/`.

**Panel Creation and Placement:**

1. UI code asks `PANEL_REGISTRY` to create a panel in `src/renderer/panels/registry.ts:89`.
2. The registry delegates to `useAppStore.getState().createXxx()` in `src/renderer/stores/appStore.ts`.
3. `placePanel()` sends canvas panels to the center dock zone, explicit dock placements to `useDockStore`, and default panel placements to the active canvas in `src/renderer/stores/appStore.ts:348`.
4. Canvas state records nodes and geometry in `src/renderer/stores/canvasStore.ts`.
5. Dock state records split/tab layout trees and panel locations in `src/renderer/stores/dockStore.ts`.
6. `renderPanelComponent()` lazy-loads the actual panel component from `src/renderer/panels/registry.ts`.

**Workspace Metadata Sync:**

1. Renderer creates or updates workspace state optimistically in `src/renderer/stores/appStore.ts:383`.
2. App store serializes workspace mutations through `workspaceSyncQueue` in `src/renderer/stores/appStore.ts:179`.
3. Main receives `WORKSPACE_CREATE`, `WORKSPACE_UPDATE`, or `WORKSPACE_REMOVE` in `src/main/workspaceManager.ts:163`.
4. Main validates trusted roots, updates its authoritative `Map<string, WorkspaceInfo>`, and updates allowed filesystem roots in `src/main/workspaceManager.ts`.
5. Main broadcasts `WORKSPACE_CHANGED` to other windows in `src/main/workspaceManager.ts:155`.

**Agent Panel Session:**

1. The `agent` panel is lazy-loaded by `src/renderer/panels/registry.ts:47`.
2. Agent renderer code invokes `AGENT_*` methods exposed by `src/preload/index.ts`.
3. Main registers agent handlers after first paint in `src/main/index.ts:445`.
4. `src/agent/main/ipcAgent.ts` forwards commands to `AgentManager`.
5. `AgentManager.create()` starts one `RpcClient` subprocess per panel, stores it in a sessions map, and forwards pi events back through `AGENT_EVENT` in `src/agent/main/agentManager.ts:151`.

**State Management:**
- Renderer UI state is local to each renderer process through Zustand stores in `src/renderer/stores/`.
- Workspace metadata is authoritative in the main process through `src/main/workspaceManager.ts`.
- Settings, layouts, boot snapshots, recent projects, and project workspace state are persisted by `src/main/store.ts` and `src/main/projectWorkspaceStore.ts`.
- Terminal PTY instances and ownership live in main-process maps in `src/main/ipc/terminal.ts`.
- Agent RPC sessions live in `AgentManager.sessions` in `src/agent/main/agentManager.ts`.

## Key Abstractions

**IPC Channel Contract:**
- Purpose: Provide a named, shared protocol for preload, renderer, and main process communication.
- Examples: `src/shared/ipc-channels.ts`, `src/preload/index.ts`, `src/main/ipc/filesystem.ts`, `src/main/ipc/terminal.ts`, `src/agent/main/ipcAgent.ts`.
- Pattern: Constants plus `ipcMain.handle`/`ipcRenderer.invoke`; main-to-renderer events use `webContents.send`.

**Panel Definition and Registry:**
- Purpose: Centralize panel type metadata, lazy component loading, icons, defaults, and creation logic.
- Examples: `src/shared/panels.ts`, `src/renderer/panels/registry.ts`, `src/shared/types.ts`.
- Pattern: Shared serializable definitions extended by renderer-only registry entries. Add a panel type in both `src/shared/panels.ts` and `src/renderer/panels/registry.ts`.

**Zustand Stores:**
- Purpose: Hold renderer window state and expose mutation methods to UI components.
- Examples: `src/renderer/stores/appStore.ts`, `src/renderer/stores/canvasStore.ts`, `src/renderer/stores/dockStore.ts`, `src/renderer/stores/settingsStore.ts`.
- Pattern: Store modules export hooks and imperative `getState()` APIs; shared logic belongs in `src/renderer/lib/` or a dedicated store utility.

**Dock Layout Tree:**
- Purpose: Represent VS Code-style dock zones, tab stacks, splits, and per-node dock layouts.
- Examples: `DockLayoutNode`, `DockSplitNode`, and `DockTabStack` in `src/shared/types.ts`; tree operations in `src/renderer/stores/dockStore.ts`; helpers in `src/renderer/stores/dockTreeUtils.ts`.
- Pattern: Recursive serializable tree with actions for docking, moving tabs, ratios, and snapshots.

**Canvas Node Store:**
- Purpose: Represent infinite canvas nodes, regions, viewport, zoom, selection, z-order, and undo/redo.
- Examples: `src/renderer/stores/canvasStore.ts`, `src/renderer/canvas/Canvas.tsx`, `src/renderer/canvas/CanvasNodeWrapper.tsx`.
- Pattern: One primary canvas store plus per-canvas-panel store instances routed through canvas operations in `src/renderer/stores/appStore.ts`.

**Window Registry:**
- Purpose: Track Electron windows by ID and type, send events to specific windows, broadcast events, and store panel/dock metadata.
- Examples: `src/main/windowRegistry.ts`, `src/main/index.ts`.
- Pattern: Main-process singleton registry used by IPC handlers and window lifecycle code.

**Agent Manager:**
- Purpose: Own one pi RPC client per agent panel and translate renderer commands into RPC calls.
- Examples: `src/agent/main/agentManager.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/renderer/AgentPanel.tsx`.
- Pattern: Class with per-panel sessions map and per-panel promise locks.

## Entry Points

**Electron Main Entry:**
- Location: `src/main/index.ts`
- Triggers: `electron-vite dev`, packaged app launch, or `electron-vite preview`.
- Responsibilities: Initialize shell env/security, register IPC handlers, create windows, manage startup/shutdown, window transfer, drag/drop, updates, analytics, and cross-window events.

**Preload Entry:**
- Location: `src/preload/index.ts`
- Triggers: BrowserWindow preload configured by `createWindow()` in `src/main/index.ts`.
- Responsibilities: Expose `window.electronAPI`, wrap IPC methods, expose event subscription helpers, and keep renderer isolated from Node/Electron imports.

**Renderer Entry:**
- Location: `src/renderer/main.tsx`
- Triggers: `index.html` loaded by BrowserWindow.
- Responsibilities: Initialize renderer logging/Sentry, global error handlers, OS notification click subscription, styles, and React root.

**React App Router:**
- Location: `src/renderer/App.tsx`
- Triggers: React render from `src/renderer/main.tsx`.
- Responsibilities: Route main/panel/dock windows by query params and initialize main-window systems.

**Agent IPC Entry:**
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

**What happens:** Renderer code bypasses the preload bridge and imports Electron, `fs`, `path`, child processes, or other Node APIs directly.
**Why it's wrong:** It violates the BrowserWindow security model configured in `src/main/index.ts` and makes renderer code incompatible with `contextIsolation` and sandboxing.
**Do this instead:** Add or reuse an IPC channel in `src/shared/ipc-channels.ts`, expose a typed method in `src/preload/index.ts`, and implement the handler in `src/main/ipc/*.ts` or another main-process module.

### Switching on Panel Types Across the App

**What happens:** New UI code branches manually on `panel.type` in many components.
**Why it's wrong:** The panel registry already centralizes component loading and creation, and scattered switches make new panel types expensive.
**Do this instead:** Use `PANEL_REGISTRY`, `getPanelDef()`, or `renderPanelComponent()` in `src/renderer/panels/registry.ts`; update `src/shared/panels.ts` for shared panel metadata.

### Mutating Workspace Metadata Only in Renderer

**What happens:** Renderer updates workspace name/root metadata without syncing through main.
**Why it's wrong:** The main process is the source of truth for trusted workspace roots and broadcasts changes to other windows.
**Do this instead:** Use `useAppStore` workspace actions in `src/renderer/stores/appStore.ts`, which serialize mutations to `src/main/workspaceManager.ts`.

### Blocking First Paint With Non-Critical Handlers

**What happens:** Startup code adds slow services to the critical path before the main window paints.
**Why it's wrong:** The app deliberately separates critical and deferred handler registration in `src/main/index.ts`.
**Do this instead:** Put startup-only essentials in `registerCriticalHandlers()` and move Git, notifications, auth, agent, update, analytics, or other background work into the deferred path when possible.

## Error Handling

**Strategy:** Main IPC handlers catch recoverable domain errors and return safe fallback values or `{ ok: false, error }` objects; renderer code logs errors and keeps UI state resilient.

**Patterns:**
- Main startup and renderer startup install global error logging in `src/main/index.ts` and `src/renderer/main.tsx`.
- Renderer render failures are contained by the `ErrorBoundary` in `src/renderer/main.tsx`.
- Workspace mutations return `WorkspaceMutationResult` from `src/main/workspaceManager.ts`.
- Agent creation catches startup errors, sends an error event, and returns `{ ok: false, error }` in `src/agent/main/ipcAgent.ts`.
- IPC modules commonly log warnings with `src/main/logger.ts` and return empty arrays, null, false, or structured failure objects for recoverable failures.

## Cross-Cutting Concerns

**Logging:** Main uses `src/main/logger.ts`; renderer uses `src/renderer/lib/logger.ts`; terminal scrollback logging is handled by `src/main/ipc/terminalLogger.ts`.

**Validation:** IPC channel names are centralized in `src/shared/ipc-channels.ts`; filesystem and terminal paths validate through `src/main/ipc/pathValidation.ts`; workspace roots validate through `src/main/workspaceRoots.ts`.

**Authentication:** Agent provider auth lives in `src/agent/main/authManager.ts` and IPC handlers in `src/agent/main/ipcAuth.ts`; credentials flow to pi auth files managed by the agent subsystem.

**Persistence:** Settings and boot snapshots live in `src/main/store.ts`; project workspace state lives in `src/main/projectWorkspaceStore.ts`; session restore/autosave lives in `src/renderer/lib/session.ts`; layouts use IPC channels from `src/shared/ipc-channels.ts`.

**Security:** BrowserWindow options, CSP, and webview hardening are configured in `src/main/index.ts` and `src/main/webSecurity.ts`; path grants and trusted roots are enforced by `src/main/ipc/pathValidation.ts` and `src/main/grantedPathStore.ts`.

---

*Architecture analysis: 2026-05-28*
*Update when major patterns change*
