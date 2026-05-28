# Coding Conventions

**Analysis Date:** 2026-05-28

## Naming Patterns

**Files:**
- Use `PascalCase.tsx` for React components and UI surfaces: `src/renderer/canvas/CanvasToolbar.tsx`, `src/renderer/sidebar/FileTreeNode.tsx`, `src/renderer/settings/ShortcutRecorder.tsx`.
- Use `camelCase.ts` for utilities, stores, hooks, and main-process modules: `src/main/pathValidation.ts`, `src/renderer/drag/grabOffset.ts`, `src/renderer/stores/canvasStore.ts`.
- Keep test files next to the code they cover with `.test.ts` or `.test.tsx`: `src/main/ipc/pathValidation.test.ts`, `src/renderer/drag/geometry.test.ts`, `src/renderer/sidebar/WorkspaceTab.test.tsx`.
- Use `*.spec.ts` only for Playwright E2E tests in `e2e/`: `e2e/smoke.spec.ts`, `e2e/drag-move.spec.ts`.
- Use `index.ts` only as a true entry point or package boundary, not as a general barrel: `src/preload/index.ts`, `src/main/index.ts`, `src/renderer/main.tsx`, `src/agent/extensions/cate-plan-mode/index.ts`.

**Functions:**
- Use `camelCase` for functions and hooks: `validatePathStrict` in `src/main/ipc/pathValidation.ts`, `cursorToCanvasOrigin` in `src/renderer/drag/geometry.ts`, `useCanvasStoreApi` in `src/renderer/stores/CanvasStoreContext.tsx`.
- React hooks must use the `useThing` prefix and live near their domain: `src/renderer/drag/useDragOp.ts`, `src/renderer/hooks/useNodeResize.ts`, `src/renderer/canvas/useCanvasNodeStyle.ts`.
- Event callbacks and local UI callbacks use action names such as `onNewTerminal`, `onZoomToFit`, and small wrapper helpers such as `pick` in `src/renderer/canvas/CanvasToolbar.tsx`.
- Test helper factories and drivers use direct imperative names: `launchApp`, `closeApp`, `dragMouse`, `seedTerminal` in `e2e/fixtures/electron-app.ts`.

**Variables:**
- Use `camelCase` for locals and state selectors: `menuOpen`, `menuRef`, `zoomText` in `src/renderer/canvas/CanvasToolbar.tsx`.
- Use `UPPER_SNAKE_CASE` for exported constants and IPC channel names: `TERMINAL_CREATE`, `GIT_STATUS`, `AGENT_CREATE` in `src/shared/ipc-channels.ts`.
- Use `PascalCase` for React component identifiers, including local components: `ToolbarButton`, `MenuItem`, `CanvasToolbar` in `src/renderer/canvas/CanvasToolbar.tsx`.
- Avoid underscore private prefixes. Prefer module-private variables such as `allowedRoots`, `scopedWriteAllowances`, and `persistentFileGrants` in `src/main/ipc/pathValidation.ts`.

**Types:**
- Use `PascalCase` for interfaces and type aliases with no `I` prefix: `CanvasStoreState`, `CanvasStoreActions`, `CanvasHistoryEntry` in `src/renderer/stores/canvasStore.ts`.
- Use explicit exported interfaces for structured props and public contracts: `CanvasToolbarProps` in `src/renderer/canvas/CanvasToolbar.tsx`, `LaunchResult` in `e2e/fixtures/electron-app.ts`.
- Use discriminated unions and literal types for domain state where possible: `PanelType`, `CateWindowType`, `DockLayoutNode`, and drag-state types in `src/shared/types.ts` and `src/renderer/drag/types.ts`.
- Prefer `import type` for type-only imports: `src/renderer/drag/geometry.ts`, `src/renderer/stores/canvasStore.ts`, `e2e/smoke.spec.ts`.

## Code Style

**Formatting:**
- No formatter config is present. Match the existing style used in `src/main/logger.ts`, `src/renderer/canvas/CanvasToolbar.tsx`, and `vitest.config.ts`.
- Use TypeScript with strict mode from `tsconfig.json`; run `npm run typecheck` before broad changes.
- Use single quotes for strings and imports.
- Omit semicolons in normal TypeScript/TSX code.
- Use 2-space indentation in JSX and object literals.
- Allow trailing commas in multiline parameters, imports, arrays, and objects: `registerScopedWriteAllowance` in `src/main/ipc/pathValidation.ts`, type imports in `src/renderer/stores/canvasStore.ts`.
- Keep JSX utility classes inline with Tailwind strings when components are small and localized: `src/renderer/canvas/CanvasToolbar.tsx`.
- Use numeric separators for large constants and timing values: `60_000` in `src/main/ipc/pathValidation.ts`, `timeout: 60_000` in `playwright.config.ts`.

**Linting:**
- No ESLint, Prettier, or Biome config is detected in the repo root.
- Available quality commands are `npm run typecheck`, `npm test`, and `npm run test:e2e` from `package.json`.
- Treat `tsconfig.json` strictness as the primary static correctness gate.

## Import Organization

**Order:**
1. External packages: `react`, `electron`, `vitest`, `zustand`, `@phosphor-icons/react`.
2. Node built-ins, usually with `node:` in tests and some IPC modules: `node:fs/promises`, `node:path`, `node:os`.
3. Internal shared aliases when used: `@shared/*`, `@renderer/*`, `@main/*` from `tsconfig.json`; `vitest.config.ts` currently configures `@shared`.
4. Relative domain imports: sibling and parent modules such as `../stores/uiStore`, `./Minimap`, `../../shared/types`.
5. Type-only imports with `import type`, either grouped with value imports or separated when clearer.

**Grouping:**
- Blank lines are not consistently required between import groups. Follow the surrounding file.
- Keep import order readable by dependency distance rather than strict alphabetization.
- For tests that mock import-time side effects, place `vi.mock(...)` before dynamic imports of the module under test: `src/main/analytics.test.ts`, `src/main/ipc/git.test.ts`.

**Path Aliases:**
- `@shared/*` maps to `src/shared/*` in `tsconfig.json` and `vitest.config.ts`.
- `@renderer/*` maps to `src/renderer/*` in `tsconfig.json`.
- `@main/*` maps to `src/main/*` in `tsconfig.json`.
- Existing source mostly uses relative imports; prefer the local convention in the edited directory unless an alias already appears nearby.

## Error Handling

**Patterns:**
- Main-process IPC handlers catch errors at the boundary, log with the IPC channel name, and return safe fallback values where the renderer expects data: `src/main/ipc/git.ts`, `src/main/index.ts`.
- Validation helpers throw `Error` with user-actionable messages for denied paths or invalid state: `validatePath`, `validatePathStrict`, and `validatePathForCreation` in `src/main/ipc/pathValidation.ts`.
- Best-effort cleanup uses narrow empty catches only where failure is intentionally ignored: `closeApp` in `e2e/fixtures/electron-app.ts`, stream EIO guards in `src/main/logger.ts`, window cleanup in `src/main/index.ts`.
- Async operations use `async`/`await`; avoid `.then()` chains unless interacting with APIs where a compact continuation is already established.

**Error Types:**
- Use plain `Error` for validation and invariant failures unless the surrounding module defines a richer domain type.
- Include the failed operation or path in error messages, as in `normalizeCreationTarget` and `validatePathStrict` in `src/main/ipc/pathValidation.ts`.
- Preserve operational context in logs with prefixes such as `[auto-updater]`, `[DIALOG_SAVE_FILE]`, and IPC channel constants in `src/main/auto-updater.ts` and `src/main/index.ts`.

## Logging

**Framework:**
- Main process logging uses `electron-log/main` through the default export in `src/main/logger.ts`.
- Renderer logging uses `electron-log/renderer` through renderer-side logger modules such as `src/renderer/lib/logger.ts`.
- Sentry is initialized and flushed through `src/main/sentry.ts` and renderer Sentry support in `src/renderer/lib/sentry.ts`.

**Patterns:**
- Import `log` from the local logger module, not directly from `electron-log`, for production code.
- Use levels `debug`, `info`, `warn`, and `error`; file transport persists `info+`, while console debug is development-only in `src/main/logger.ts`.
- Log state transitions and external/native boundaries: update checks in `src/main/auto-updater.ts`, startup and shutdown in `src/main/index.ts`, git IPC errors in `src/main/ipc/git.ts`.
- Do not use `console.log` for app logging. Console use is limited to scripts such as `scripts/generate-icons.js` and `scripts/sentry-test.mjs`.

## Comments

**When to Comment:**
- Use block banner comments to orient substantial modules: `src/main/ipc/pathValidation.ts`, `src/renderer/drag/geometry.ts`, `src/renderer/drag/__tests__/harness.tsx`.
- Comment security, coordinate-system, IPC, and timing decisions where the reason is not obvious.
- Keep inline comments focused on invariants and edge cases, such as symlink handling in `src/main/ipc/pathValidation.ts` and drag regression notes in `src/renderer/drag/__tests__/scenarios.test.tsx`.

**JSDoc/TSDoc:**
- Use JSDoc for exported helpers where callers need contract details: `grantFileAccess`, `validatePathStrict`, `validatePathForCreation`, and `validateCwd` in `src/main/ipc/pathValidation.ts`.
- React components generally do not use JSDoc; keep prop interfaces self-describing.

**TODO Comments:**
- No enforced TODO format is detected. When adding TODOs, include the concrete missing behavior and preferably a tracking issue or phase reference.

## Function Design

**Size:**
- Prefer pure helper functions for reusable logic and keep UI components composed from small local helpers: `ToolbarButton` and `MenuItem` in `src/renderer/canvas/CanvasToolbar.tsx`.
- For large state stores, group actions by behavior in interfaces and comments: `CanvasStoreState` and `CanvasStoreActions` in `src/renderer/stores/canvasStore.ts`.
- Extract cross-cutting math and decisions into pure modules with direct tests: `src/renderer/lib/coordinates.ts`, `src/renderer/drag/geometry.ts`, `src/main/dragLogic.ts`.

**Parameters:**
- Use positional parameters for small pure helpers with stable signatures: `cursorToCanvasOrigin` in `src/renderer/drag/geometry.ts`.
- Use options objects for test helpers and extensible APIs: `dragMouse` in `e2e/fixtures/electron-app.ts`, `downOnNode` in `src/renderer/drag/__tests__/harness.tsx`.
- Type callback props explicitly in component prop interfaces: `CanvasToolbarProps` in `src/renderer/canvas/CanvasToolbar.tsx`.

**Return Values:**
- Return normalized domain values rather than mutating caller-owned objects in pure helpers: `ghostScreenRect` in `src/renderer/drag/geometry.ts`.
- Return `null` for expected absence in lookup helpers: `getNodeRect`, `getNodeOrigin`, and `firstNodeInfo` in `e2e/fixtures/electron-app.ts`.
- Throw for invalid security-sensitive inputs at validation boundaries: `src/main/ipc/pathValidation.ts`.

## Module Design

**Exports:**
- Prefer named exports for utilities, stores, handlers, and test helpers: `src/main/ipc/pathValidation.ts`, `src/renderer/drag/geometry.ts`, `e2e/fixtures/electron-app.ts`.
- Use default exports for singleton logger instances and top-level React components where already established: `src/main/logger.ts`, `src/renderer/canvas/CanvasToolbar.tsx`.
- Keep module-private state inside the module that owns it: path grants in `src/main/ipc/pathValidation.ts`, registered drag rects in `src/renderer/drag/__tests__/harness.tsx`.

**Barrel Files:**
- General barrel files are not a dominant pattern. Add imports from concrete modules unless the directory already exposes an intentional entry point.
- Preserve process boundaries: main-process code belongs in `src/main/`, preload bridge code in `src/preload/`, renderer UI/state in `src/renderer/`, and shared contracts/constants in `src/shared/`.

---

*Convention analysis: 2026-05-28*
*Update when patterns change*
