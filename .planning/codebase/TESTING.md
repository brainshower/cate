# Testing Patterns

**Analysis Date:** 2026-05-28

## Test Framework

**Runner:**
- Vitest `^3.2.4` for unit and renderer integration tests.
- Vitest config: `vitest.config.ts` in the project root.
- Playwright `^1.60.0` for Electron E2E tests.
- Playwright config: `playwright.config.ts` in the project root.

**Assertion Library:**
- Vitest built-in `expect` for unit tests: `toBe`, `toEqual`, `toThrow`, `toMatchObject`, `resolves`, `rejects`, `toBeCloseTo`.
- Playwright test runner `expect` for E2E tests.

**Run Commands:**
```bash
npm test                              # Run all Vitest tests
npm run test:unit                     # Alias for Vitest unit suite
npm test -- src/main/ipc/git.test.ts  # Run a single Vitest file
npm run test:e2e                      # Run Playwright Electron E2E suite
npm run test:e2e:debug                # Run E2E suite in Playwright debug mode
npm run typecheck                     # Type-check without emitting
```

## Test File Organization

**Location:**
- Keep most Vitest tests colocated with source files: `src/main/analytics.test.ts`, `src/main/ipc/pathValidation.test.ts`, `src/renderer/drag/geometry.test.ts`.
- Use `src/renderer/drag/__tests__/` for multi-file drag integration harness tests and scenario suites: `src/renderer/drag/__tests__/scenarios.test.tsx`, `src/renderer/drag/__tests__/harness.tsx`.
- Put full Electron E2E specs in `e2e/` with shared helpers in `e2e/fixtures/electron-app.ts`.

**Naming:**
- Use `moduleName.test.ts` for pure TypeScript and node-environment tests.
- Use `ComponentOrScenario.test.tsx` for React/jsdom tests.
- Use `feature-flow.spec.ts` for Playwright E2E specs.

**Structure:**
```text
src/
  main/
    ipc/
      pathValidation.ts
      pathValidation.test.ts
      git.ts
      git.test.ts
  renderer/
    drag/
      geometry.ts
      geometry.test.ts
      __tests__/
        setup.ts
        harness.tsx
        scenarios.test.tsx
    sidebar/
      WorkspaceTab.tsx
      WorkspaceTab.test.tsx
e2e/
  fixtures/
    electron-app.ts
  smoke.spec.ts
  drag-move.spec.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

describe('pathValidation', () => {
  let rootDir: string

  beforeEach(async () => {
    rootDir = await fs.mkdtemp(path.join(process.cwd(), 'cate-root-'))
    addAllowedRoot(rootDir)
  })

  afterEach(async () => {
    for (const root of Array.from(getAllowedRoots())) removeAllowedRoot(root)
    await fs.rm(rootDir, { recursive: true, force: true })
    vi.useRealTimers()
  })

  test('allows creation inside trusted roots', async () => {
    const safePath = await validatePathForCreation(path.join(rootDir, 'file.txt'))
    expect(safePath).toContain(path.join(rootDir, 'file.txt'))
  })
})
```

**Patterns:**
- Use `describe` blocks by module or behavior: `describe('createBranch')` in `src/main/ipc/git.test.ts`, `describe('shouldSendNotification')` in `src/renderer/lib/osNotifications.test.ts`.
- Use nested `describe` blocks for reducer/action families and larger behavior matrices: `src/renderer/drag/runtime.test.ts`, `src/renderer/drag/commit.test.ts`.
- Use `beforeEach` for fresh temp directories, fake timers, mocked store state, and launched Electron apps.
- Use `afterEach` for removing temp directories, unmounting React roots, clearing module state, closing Electron apps, and restoring real timers.
- Prefer behavior names over implementation names in test titles: `returns false when the master switch is off` in `src/renderer/lib/osNotifications.test.ts`.
- Number high-value regression scenarios when preserving an explicit scenario matrix: `src/renderer/drag/__tests__/scenarios.test.tsx`.

## Mocking

**Framework:**
- Use Vitest `vi` for mocks, spies, fake timers, and import-time module replacement.
- `vitest.config.ts` sets `restoreMocks: true`; still clean up module-level state explicitly when the source module owns globals.

**Patterns:**
```typescript
import { describe, expect, test, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getVersion: () => '0.0.0-test', getLocale: () => 'en', isPackaged: false, getPath: () => '/tmp' },
  ipcMain: { on: vi.fn() },
  net: { request: vi.fn() },
}))

vi.mock('./logger', () => ({
  default: { warn: () => {}, info: () => {}, error: () => {}, debug: () => {} },
}))

const { decideUpdateAction } = await import('./analytics')
```

**What to Mock:**
- Mock Electron modules in node/jsdom tests: `src/main/analytics.test.ts`, `src/main/ipc/git.test.ts`, `src/main/ipc/terminal.test.ts`.
- Mock renderer modules with heavy import-time side effects such as xterm and electron-log: `src/renderer/drag/__tests__/scenarios.test.tsx`, `src/renderer/lib/terminalRegistry.test.ts`.
- Mock IPC bridges through `window.electronAPI` in `src/renderer/drag/__tests__/setup.ts`.
- Use `vi.useFakeTimers()` for timing behavior: `src/main/ipc/pathValidation.test.ts`, `src/renderer/lib/agentScreenDetector.test.ts`, `src/renderer/hooks/notificationDebouncer.test.ts`.
- Use temp directories and real `simple-git` for filesystem/git behavior where the external dependency is the behavior under test: `src/main/ipc/git.test.ts`.

**What NOT to Mock:**
- Do not mock pure math and reducer modules; assert directly against outputs: `src/renderer/lib/coordinates.test.ts`, `src/renderer/drag/geometry.test.ts`, `src/main/dragLogic.test.ts`.
- Do not bypass the drag harness with back-channel calls when testing user-visible drag behavior; `src/renderer/drag/__tests__/harness.tsx` drives real DOM events through `useDragOp`.
- Do not mock Playwright's Electron app in E2E specs; launch through `launchApp()` in `e2e/fixtures/electron-app.ts`.

## Fixtures and Factories

**Test Data:**
```typescript
scene = renderDragScene({
  canvases: [{ panelId: 'c1', rect: { x: 0, y: 0, w: 1000, h: 800 } }],
  nodes: [{ canvasPanelId: 'c1', nodeId: 'n1', origin: { x: 100, y: 100 }, size: { width: 200, height: 150 } }],
})
```

**Location:**
- Drag integration fixtures live in `src/renderer/drag/__tests__/harness.tsx`.
- Shared jsdom setup lives in `src/renderer/drag/__tests__/setup.ts` and is loaded for all Vitest tests via `vitest.config.ts`.
- E2E launch and interaction helpers live in `e2e/fixtures/electron-app.ts`.
- Small fixtures should stay in the test file when they are local to one module, such as notification settings in `src/renderer/lib/osNotifications.test.ts`.

## Coverage

**Requirements:**
- No coverage threshold or coverage script is configured in `package.json` or `vitest.config.ts`.
- Coverage is not enforced by the current test configuration.

**Configuration:**
- Vitest includes `src/**/*.test.ts` and `src/**/*.test.tsx`.
- Vitest uses `environmentMatchGlobs` so `*.test.tsx` runs in `jsdom` and `*.test.ts` runs in `node`.
- Playwright uses `testDir: './e2e'`, `fullyParallel: false`, `workers: 1`, and the `electron` project in `playwright.config.ts`.

**View Coverage:**
```bash
npx vitest run --coverage             # Ad hoc coverage if coverage provider is installed/configured
```

## Test Types

**Unit Tests:**
- Scope single pure functions, reducers, and validation helpers.
- Prefer direct input/output assertions: `src/renderer/drag/geometry.test.ts`, `src/renderer/lib/coordinates.test.ts`, `src/main/dragLogic.test.ts`.
- Use `.rejects.toThrow` and `.toThrow` for error paths: `src/main/ipc/pathValidation.test.ts`.

**Integration Tests:**
- Use Vitest with jsdom for renderer interactions and real React trees: `src/renderer/drag/__tests__/scenarios.test.tsx`, `src/renderer/sidebar/WorkspaceTab.test.tsx`.
- Use real filesystem or git repos when validating native behavior at module boundaries: `src/main/ipc/git.test.ts`, `src/agent/main/nodeShim.test.ts`.
- Mock only the native or heavyweight boundary needed to keep tests deterministic.

**E2E Tests:**
- Use Playwright with Electron in `e2e/`.
- Launch the app through `launchApp()` in `e2e/fixtures/electron-app.ts`; each spec uses an isolated `userData` path via `CATE_E2E=1`.
- Drive app state through `window.__cateE2E` helpers when setting up scenarios, then assert DOM state or app state: `e2e/smoke.spec.ts`, `e2e/drag-move.spec.ts`.

## Common Patterns

**Async Testing:**
```typescript
test('creates a branch from current HEAD when no start point is provided', async () => {
  await createBranch(repoDir, 'feature/head')
  const git = simpleGit(repoDir)
  const current = await git.revparse(['--abbrev-ref', 'HEAD'])
  expect(current.trim()).toBe('feature/head')
})
```

**Error Testing:**
```typescript
expect(() => validatePath(targetPath, 1)).toThrow(/outside allowed directories/)
await expect(validatePathStrict(targetPath, 1)).rejects.toThrow(/outside allowed directories/)
await expect(validatePathForCreation(targetPath, 1)).rejects.toThrow(/outside allowed directories/)
```

**React/jsdom Testing:**
```typescript
scene = renderDragScene({
  canvases: [{ panelId: 'c1', rect: { x: 0, y: 0, w: 1000, h: 800 } }],
  nodes: [{ canvasPanelId: 'c1', nodeId: 'n1', origin: { x: 100, y: 100 }, size: { width: 200, height: 150 } }],
})
scene.mouse.downOnNode('n1')
scene.mouse.moveBy({ x: 20, y: 20 })
expect(scene.drag().isDragging).toBe(true)
```

**Playwright E2E Testing:**
```typescript
test.beforeEach(async () => {
  ;({ electronApp: app, mainWindow: page } = await launchApp())
})

test.afterEach(async () => closeApp(app))

test('a canvas is mounted', async () => {
  const panelId = await page.evaluate(() => window.__cateE2E!.activeCanvasPanelId())
  expect(panelId).toBeTruthy()
})
```

**Snapshot Testing:**
- Snapshot testing is not used in the current repo.

---

*Testing analysis: 2026-05-28*
*Update when test patterns change*
