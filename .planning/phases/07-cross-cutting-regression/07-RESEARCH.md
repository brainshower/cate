# Phase 7: Cross-Cutting + Regression - Research

**Researched:** 2026-05-29  
**Domain:** Electron/Playwright regression, FlashQuery HTTP MCP E2E harness, restart persistence, design-token verification  
**Confidence:** HIGH for codebase/test anchors; MEDIUM for exact MCP stub implementation details because SDK server setup was verified but not prototyped

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Downstream source-of-truth rule

- All downstream agents implementing or verifying Phase 7 MUST read the supplied product docs before making scope decisions:
  - `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md`
  - `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md`
- If a question is answered by those docs, downstream agents should follow the docs rather than infer new behavior from partial code context.
- If those docs and local implementation conflict, downstream agents should stop and surface the exact conflict before changing product scope.

### Regression coverage

- REQ-043 is satisfied only if existing E2E specs pass without weakening or deleting existing tests.
- Existing regression specs are `e2e/smoke.spec.ts`, `e2e/drag-detach.spec.ts`, `e2e/drag-move.spec.ts`, `e2e/drag-canvas-into-canvas.spec.ts`, and `e2e/drag-split.spec.ts`.
- Local editor, file explorer, terminal, browser, Git, agent, document, workspace, layout, command, and drag behavior must remain additive-only relative to the FlashQuery integration.

### Restart and lazy-probe behavior

- REQ-044 requires a Playwright/Electron persistence spec that configures a workspace connection, closes Cate, reopens Cate, verifies persisted connection metadata and token availability, and proves no eager `/mcp/info` probe occurs until vault use.
- The restart test must distinguish "connection metadata persisted" from "manager eagerly connected"; eager probing on startup is a failure.
- The fresh vault-panel mount after restart should be the event that triggers `flashquery:listVault`, lazy client creation, and the first probe/status transition.

### FlashQuery E2E stub

- Phase 7 should introduce a local test fixture for a stub FlashQuery HTTP MCP server that is started by Playwright tests on a free port.
- The stub must implement enough of the v1 protocol to cover `GET /mcp/info` and the MCP tool calls Cate exercises through its main-process manager: vault listing, document read, and document write.
- The stub must support configurable server-up/server-down behavior for disconnected-state and retry coverage.
- The stub must keep in-memory document state so T-E-008 can edit, save, reopen, and verify persisted body content within the test run.

### End-to-end workflow coverage

- T-E-008 covers the full happy path: configure connection via dialog, status live, populated vault panel, double-click document, editor opens with vault badge, edit body, save, and verify the edit persists.
- T-E-009 covers right-clicking a document row and choosing Open on Canvas.
- T-E-010 covers disconnected chip/panel state, error surfacing, and retry after the stub server comes back.
- T-E-011 covers vault tree expansion, refresh preserving valid expansion, empty-vault state, and multi-level navigation.

### Design-token and manual visual checks

- REQ-045 requires code review or automated assertions that new visual code uses Cate semantic token classes such as `bg-surface-N`, `text-primary`, `text-secondary`, `text-muted`, and `bg-hover`.
- Stock Tailwind color classes such as `bg-zinc-*`, `text-gray-*`, `text-slate-*`, and similar surface/text styling remain forbidden except the allowed `flashqueryVault` panel-definition `tintClass`.
- Manual visual checks T-M-002 through T-M-007 should be captured as a durable checklist artifact in this phase directory so final verification can cite the evidence.

### the agent's Discretion

- Exact helper names, test fixture file names, and Playwright locator strategy are left to the implementation agent, provided every T-E and T-M test ID remains traceable.
- Downstream agents may add E2E harness helpers under `e2e/fixtures/` when that keeps specs readable and avoids duplicating Electron setup.
- Downstream agents may add source-level test IDs or comments only when they improve traceability without cluttering production code.

### Deferred Ideas (OUT OF SCOPE)

- Automated visual regression infrastructure such as Percy or Chromatic is out of scope for v1.
- New FlashQuery document creation, rename/delete/archive/tag/move operations, frontmatter editing, conflict detection, live vault notifications, OAuth, OS-keychain storage, and stdio transport remain out of scope.
- Fixing unrelated flaky Cate E2E behavior is out of scope unless it blocks proving REQ-043; if a pre-existing failure appears, capture it with evidence instead of weakening the regression suite.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REQ-043 | Existing Cate panels and E2E smoke/drag behavior must pass unchanged. [CITED: Requirements.md:809-819] | Preserve existing `e2e/smoke.spec.ts`, `e2e/drag-detach.spec.ts`, `e2e/drag-move.spec.ts`, `e2e/drag-canvas-into-canvas.spec.ts`, and `e2e/drag-split.spec.ts`; run them as the regression gate. [CITED: Test Plan.md:500-510] [VERIFIED: codebase rg] |
| REQ-044 | Workspace connection metadata and token must survive restart, but manager must not probe eagerly on startup. [CITED: Requirements.md:823-833] | Add `e2e/flashquery-persistence.spec.ts` with a reused userData/root workspace across two launches and stub `/mcp/info` request-count assertions. [CITED: Test Plan.md:512-519] [VERIFIED: codebase rg] |
| REQ-045 | FlashQuery UI must follow Cate semantic tokens and avoid stock neutral color utilities. [CITED: Requirements.md:835-846] | Verify existing T-U-102..104 tests and add a durable manual checklist for T-M-001..007. [CITED: Test Plan.md:521-552] [VERIFIED: codebase rg] |
</phase_requirements>

## Summary

Phase 7 should be planned as an E2E harness and verification phase, not as new product surface. [CITED: 07-CONTEXT.md:7-18] The current Cate implementation already contains the main FlashQuery manager, typed preload IPC, vault panel, connection dialog, chip, vault badge, and component-level design-token tests; Phase 7 needs to prove those pieces together through Playwright/Electron and preserve the existing regression suite. [VERIFIED: codebase rg]

The primary technical work is a deterministic local FlashQuery stub fixture under `e2e/fixtures/`, plus Playwright specs for persistence/lazy probe, happy path, disconnect/retry, and vault browsing. [CITED: Test Plan.md:512-541] The stub should expose `GET /mcp/info`, count requests, support temporary down/up behavior, and answer MCP `list_vault`, `get_document`, and `write_document` calls with in-memory state. [CITED: 07-CONTEXT.md:44-49]

**Primary recommendation:** Use the existing Playwright/Electron harness and add a reusable `e2e/fixtures/flashquery-server.ts` stub plus four FlashQuery specs; do not add packages, UI frameworks, visual-regression services, or non-v1 vault operations. [VERIFIED: AGENTS.md:12-20] [CITED: Test Plan.md:538-552]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Existing Cate regression | Playwright E2E harness | Electron renderer/main | Existing regression specs launch the full app via `launchApp()` and assert mounted canvas/drag behavior. [VERIFIED: e2e/fixtures/electron-app.ts:17-30; e2e/smoke.spec.ts:13-35] |
| FlashQuery HTTP stub | Test process | Main-process MCP client | The stub is a test-only external dependency that the main-process `FlashQueryClientManager` talks to over HTTP. [VERIFIED: src/main/flashquery/clientManager.ts:374-385] |
| Connection persistence | Renderer session saver + main project state + electron-store credentials | Main IPC | Workspace metadata is serialized into `.cate/workspace.json`, while bearer tokens go through `src/main/flashquery/credentials.ts`. [VERIFIED: src/renderer/lib/session.ts:318-329; src/main/projectWorkspaceStore.ts:104-117; src/main/flashquery/credentials.ts:22-35] |
| Lazy reconnect proof | Main-process manager | Renderer vault panel | The manager creates MCP clients only during `listVault/getDocument/writeDocument`; the vault panel calls `flashqueryListVault` after status becomes live. [VERIFIED: src/main/flashquery/clientManager.ts:392-435; src/renderer/panels/FlashQueryVaultPanel.tsx:367-370] |
| Full v1 workflow UI | Renderer | Main IPC + stub | Dialog, vault panel, editor, badge, and chip are renderer surfaces that route privileged work through preload/main IPC. [VERIFIED: src/preload/index.ts:900-932; AGENTS.md:14-20] |
| Design-token verification | Renderer component tests/manual checklist | Planning artifact | Existing component tests include forbidden-neutral checks; manual visual evidence must be captured in the phase directory. [VERIFIED: src/renderer/panels/FlashQueryVaultPanel.test.tsx:499-504; src/renderer/components/Chip.test.tsx:79-96] [CITED: 07-CONTEXT.md:58-62] |

## Project Constraints (from AGENTS.md)

- Use the existing Electron, React, TypeScript, Zustand, IPC, Vitest, and Playwright stack; do not add a separate web backend or UI framework. [VERIFIED: AGENTS.md:12-20]
- Renderer code must not call Node/Electron APIs directly; privileged FlashQuery work goes through typed preload APIs and main-process validation. [VERIFIED: AGENTS.md:14-16]
- FlashQuery data remains in the configured FlashQuery instance/vault; Cate stores connection metadata, preferences, UI/session state, and credential abstraction data only. [VERIFIED: AGENTS.md:16-18]
- Connection behavior must be workspace-aware. [VERIFIED: AGENTS.md:17]
- Prefer FlashQuery's host-visible MCP/HTTP surface; stdio remains future-only unless explicitly needed. [VERIFIED: AGENTS.md:18]
- Existing Cate agent, terminal, editor, browser, Git, workspace, and layout behavior must not regress. [VERIFIED: AGENTS.md:19]
- Tests should use focused unit coverage, renderer tests for UI state, and Electron smoke/E2E for integrated workflows. [VERIFIED: AGENTS.md:20]
- Runtime is Node 20.x or 22.x; the repo's current shell reports Node v24.7.0, which is outside `package.json` engines `>=20 <23`. [VERIFIED: package.json:20-22; env probe]

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Playwright / `@playwright/test` | 1.60.0 | Electron E2E specs under `e2e/`. [VERIFIED: npm ls] | Existing Cate E2E uses `_electron.launch`, `firstWindow`, and `ElectronApplication.close`; Playwright documents `_electron` for Electron automation. [VERIFIED: e2e/fixtures/electron-app.ts:7-35] [CITED: Context7 /microsoft/playwright] |
| Electron | 41.2.0 | Desktop runtime under test. [VERIFIED: npm ls] | Cate's app launches from the project root in Playwright with `CATE_E2E=1`. [VERIFIED: e2e/fixtures/electron-app.ts:17-30] |
| `@modelcontextprotocol/sdk` | 1.29.0 | MCP Streamable HTTP client and optional test stub server transport. [VERIFIED: npm ls] | Current manager imports `Client` and `StreamableHTTPClientTransport`; SDK docs show `Client.connect(transport)` and `client.callTool`. [VERIFIED: src/main/flashquery/clientManager.ts:1-2] [CITED: Context7 /modelcontextprotocol/typescript-sdk] |
| Vitest | 3.2.4 | Unit/component design-token invariant tests. [VERIFIED: npm ls] | Existing T-U-102..104 live in colocated TSX/component tests. [VERIFIED: codebase rg] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node `http` | built-in | Local free-port FlashQuery stub. [VERIFIED: Node stdlib; codebase package uses Node] | Use for `GET /mcp/info`, up/down toggles, request counting, and routing `/mcp`. [CITED: 07-CONTEXT.md:44-49] |
| React Testing Library | 16.3.2 | Existing component invariant checks. [VERIFIED: npm ls/package.json] | Re-run/extend T-U-102..104 only if Phase 7 finds a missing invariant. [CITED: Test Plan.md:527-530] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Test-only local stub | Real FlashQuery instance | Real instance raises environment/secrets/flakiness cost; product test plan requires a stubbed local HTTP MCP server. [CITED: Test Plan.md:2.3, 4.7.4] |
| Manual JSON-RPC MCP responses | SDK `McpServer` + `StreamableHTTPServerTransport` | SDK server is closer to protocol but may need more fixture setup; current installed SDK exports server streamable transport types. [VERIFIED: node_modules @modelcontextprotocol/sdk] |
| Visual regression SaaS | Percy/Chromatic | Explicitly out of scope for v1. [CITED: 07-CONTEXT.md:109-114] |

**Installation:** No new external packages should be installed. [VERIFIED: package.json:44-90]  
**Version verification:** `npm ls @playwright/test playwright electron vitest typescript @modelcontextprotocol/sdk --depth=0` confirmed local versions. [VERIFIED: npm ls]

## Package Legitimacy Audit

No external package installation is recommended for Phase 7, so the package legitimacy gate is not applicable. [VERIFIED: package.json:44-90] If a planner introduces any new package, it must run slopcheck plus registry verification before install. [CITED: GSD package legitimacy protocol]

## Architecture Patterns

### System Architecture Diagram

```text
Playwright spec
  -> start FlashQuery stub on free port
  -> launch Cate with CATE_E2E=1
  -> renderer UI actions (dialog / vault panel / editor)
  -> preload window.electronAPI.flashquery*
  -> main src/main/ipc/flashquery.ts
  -> FlashQueryClientManager
  -> GET /mcp/info and POST /mcp on stub
  -> status broadcasts back to renderer
  -> assertions on visible UI, request counts, persisted files, and stub document state
```

This flow matches Cate's process boundary: renderer calls the preload facade, main owns IPC validation and FlashQuery I/O, and Playwright drives the user-visible app. [VERIFIED: AGENTS.md:14-16; src/preload/index.ts:900-932; src/main/ipc/flashquery.ts:238-260]

### Recommended Project Structure

```text
e2e/
├── fixtures/
│   ├── electron-app.ts              # extend launch options for reusable userData/root if needed
│   └── flashquery-server.ts         # local stub, request counts, document state, up/down controls
├── flashquery-persistence.spec.ts   # T-E-006, T-E-007
├── flashquery-happy-path.spec.ts    # T-E-008, T-E-009
├── flashquery-disconnect.spec.ts    # T-E-010
└── flashquery-vault-browse.spec.ts  # T-E-011

.planning/phases/07-cross-cutting-regression/
└── 07-DESIGN-CHECKS.md              # T-M-001..007 durable evidence
```

The structure follows existing Cate convention: specs in `e2e/*.spec.ts` and helpers under `e2e/fixtures/`. [VERIFIED: e2e/fixtures/electron-app.ts; e2e/smoke.spec.ts] [CITED: 07-CONTEXT.md:99-106]

### Pattern 1: Extend Launch Isolation for Restart Tests

**What:** Add optional `launchApp({ userDataDir?, env? })` support so a persistence spec can reuse the same Electron `userData` across two app launches. [VERIFIED: e2e/fixtures/electron-app.ts:17-30]  
**When to use:** T-E-006/T-E-007 need one test to close and reopen Cate while preserving the same app data; the current main process creates a fresh temp `userData` on every `CATE_E2E=1` launch. [VERIFIED: src/main/index.ts:1082-1089]  
**Implementation note:** The current main code does not expose an override for the E2E `userData` path; planning should include a small, test-only env hook such as `CATE_E2E_USER_DATA_DIR` in main or another deterministic persistence path. [VERIFIED: src/main/index.ts:1082-1089]

### Pattern 2: Stub Server Request Counters as Assertions

**What:** The stub should count `GET /mcp/info` separately from `POST /mcp` and expose counts to tests through the fixture object. [CITED: 07-CONTEXT.md:38-49]  
**When to use:** T-E-007 must prove no eager startup probe and first probe only after vault-panel use. [CITED: Test Plan.md:518-519]  
**Warning:** There is a product/code conflict around auth headers on `/mcp/info`; see Open Questions. [CITED: Requirements.md:243-254] [VERIFIED: src/main/flashquery/clientManager.ts:217-226]

### Pattern 3: Prefer User-Visible Assertions, Use Harness Only for Setup/Inspection

**What:** Drive the dialog, vault panel, row context menu, editor body, and save shortcut through Playwright locators; use `window.__cateE2E` for deterministic setup/inspection only. [CITED: 07-CONTEXT.md:99-106] [VERIFIED: src/renderer/lib/e2eHarness.ts:1-11]  
**When to use:** Seeding/opening a vault panel may need a small harness helper, but T-E-008..011 should assert visible UI and stub state, not internal store state alone. [CITED: Test Plan.md:538-541]

### Pattern 4: Durable Manual Evidence

**What:** Create `07-DESIGN-CHECKS.md` or `07-UAT.md` with rows for T-M-001..007, screenshots or notes, run environment, and pass/fail evidence. [CITED: 07-CONTEXT.md:58-62]  
**When to use:** Visual fidelity checks are manual in v1 because visual-regression infrastructure is out of scope. [CITED: Test Plan.md:651]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Electron launching/window lifecycle | Custom child_process Electron launcher | Existing `launchApp()` using Playwright `_electron.launch`. [VERIFIED: e2e/fixtures/electron-app.ts:17-30] | Keeps parity with existing E2E regression specs. [VERIFIED: e2e/smoke.spec.ts:8-11] |
| Production FlashQuery transport | Renderer-side HTTP/MCP client | Main-process `FlashQueryClientManager` through preload IPC. [VERIFIED: src/preload/index.ts:900-932; src/main/ipc/flashquery.ts:204-235] | Required by AGENTS security boundary. [VERIFIED: AGENTS.md:14-16] |
| Visual regression service | Percy/Chromatic/screenshots baseline infra | Manual checklist artifact plus existing token tests. [CITED: 07-CONTEXT.md:109-114] | Visual-regression infra is out of scope. [CITED: Test Plan.md:651] |
| New vault operations | Create/rename/delete/tag/move UI or stub paths | Existing v1 list/read/update-only write paths. [CITED: Requirements.md:60-70] | v1 explicitly excludes those operations. [CITED: Requirements.md:60-70] |

**Key insight:** The phase's risk is integration proof and determinism, not missing UI primitives. [VERIFIED: codebase rg] Plan thin test helpers and high-signal assertions instead of broad source refactors. [CITED: 07-CONTEXT.md:99-106]

## Common Pitfalls

### Pitfall 1: Restart Test Accidentally Uses Fresh E2E State

**What goes wrong:** The second launch uses a new temp `userData`, so a persistence test proves nothing. [VERIFIED: src/main/index.ts:1082-1089]  
**Why it happens:** `CATE_E2E=1` currently calls `fs.mkdtempSync(...)` on every app launch. [VERIFIED: src/main/index.ts:1082-1089]  
**How to avoid:** Add an explicit test-only userData override or preserve root project `.cate` plus credential store intentionally, then assert both metadata and token availability. [CITED: Requirements.md:823-833]  
**Warning signs:** `/mcp/info` count is zero because the workspace never restored, or dialog opens as first-time setup after restart. [CITED: Test Plan.md:518-519]

### Pitfall 2: Eager Probe Hidden by Dialog Save

**What goes wrong:** The save flow probes immediately, and the restart assertion mistakes that probe for post-restart behavior. [VERIFIED: src/main/ipc/flashquery.ts:110-142]  
**Why it happens:** `flashquery:setConnection` currently calls `flashQueryClientManager.connect()` after persisting. [VERIFIED: src/main/ipc/flashquery.ts:140-142]  
**How to avoid:** Reset stub request counters after first app close and before second launch; assert zero `/mcp/info` until opening/using the vault panel. [CITED: 07-CONTEXT.md:38-42]  
**Warning signs:** Request count is already nonzero before any post-restart vault-panel action. [CITED: Test Plan.md:518-519]

### Pitfall 3: MCP Stub Shape Too Shallow

**What goes wrong:** Stub responds to `/mcp/info` but not the SDK transport's initialize/tool-call protocol, so `client.connect()` or `callTool()` fails before UI behavior can be tested. [VERIFIED: src/main/flashquery/clientManager.ts:374-385]  
**Why it happens:** Cate uses the MCP SDK `StreamableHTTPClientTransport`, not raw `fetch` for tool calls. [VERIFIED: src/main/flashquery/clientManager.ts:1-2, 374-385]  
**How to avoid:** Either implement enough JSON-RPC for SDK initialize/tools/call or use the installed SDK server transport in the fixture. SDK docs show Streamable HTTP client/server usage. [CITED: Context7 /modelcontextprotocol/typescript-sdk]  
**Warning signs:** `/mcp/info` passes but vault panel stays disconnected with malformed/transport errors. [VERIFIED: src/main/flashquery/clientManager.ts:137-145]

### Pitfall 4: Product/Auth Probe Conflict

**What goes wrong:** The stub enforces no `Authorization` on `/mcp/info` per product docs, but current local code sends the bearer token when present. [CITED: Requirements.md:243-254] [VERIFIED: src/main/flashquery/clientManager.ts:217-226; src/main/ipc/flashquery.ts:156-165]  
**Why it happens:** Earlier implementation/test state drifted from the product invariant. [VERIFIED: src/main/flashquery/clientManager.test.ts auth cases]  
**How to avoid:** Planner should add a checkpoint to resolve whether Phase 7 fixes the probe behavior or makes the stub permissive while documenting the conflict. [CITED: 07-CONTEXT.md:24-30]  
**Warning signs:** T-E-008 fails only when a bearer token is configured. [CITED: Test Plan.md:538]

### Pitfall 5: Manual Checks Not Durable

**What goes wrong:** T-M-002..007 are performed informally and cannot be cited by verification. [CITED: 07-CONTEXT.md:58-62]  
**Why it happens:** There is no visual-regression framework in v1. [CITED: Test Plan.md:651]  
**How to avoid:** Plan an explicit markdown artifact with each T-M ID, viewport, evidence, and reviewer result. [CITED: 07-CONTEXT.md:58-62]

## Code Examples

### Existing Electron Launch Pattern

```ts
// Source: e2e/fixtures/electron-app.ts [VERIFIED: codebase]
const electronApp = await electron.launch({
  args: ['.'],
  cwd: REPO_ROOT,
  env: {
    ...process.env,
    CATE_E2E: '1',
    NODE_ENV: 'production',
  },
})
const mainWindow = await electronApp.firstWindow()
await mainWindow.waitForFunction(() => window.__cateE2E?.ready === true)
```

### Current FlashQuery Tool Call Shape

```ts
// Source: src/main/flashquery/clientManager.ts [VERIFIED: codebase]
await this.callJsonTool(client, 'list_vault', {
  path: vaultPath && vaultPath.length > 0 ? vaultPath : '/',
  include: ['tracking'],
})

await this.callJsonTool(client, 'get_document', {
  identifiers: vaultPath,
  include: ['body'],
})

await this.callJsonTool(client, 'write_document', {
  mode: 'update',
  identifier: vaultPath,
  content,
})
```

### SDK Streamable HTTP Server Option

```ts
// Source: Context7 /modelcontextprotocol/typescript-sdk [CITED]
const server = new McpServer({ name: 'flashquery-e2e-stub', version: '1.0.0' })
const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
await server.connect(transport)
await transport.handleRequest(req, res, parsedBody)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad hoc UI-only component tests for FlashQuery | Full Playwright/Electron workflow against local HTTP stub | Phase 7 per product plan. [CITED: Test Plan.md:498-552] | Proves main/preload/renderer integration and restart behavior. [CITED: Requirements.md:823-833] |
| Fresh E2E app per spec only | Persistence spec needs controlled reused state across two launches | Phase 7 requirement. [CITED: Test Plan.md:518-519] | Planner must extend the test harness or main E2E env handling. [VERIFIED: src/main/index.ts:1082-1089] |
| Manual visual review as conversation | Durable checklist artifact under phase directory | Phase 7 context. [CITED: 07-CONTEXT.md:58-62] | Verification can cite evidence. [CITED: 07-CONTEXT.md:58-62] |

**Deprecated/outdated:** Adding visual-regression infrastructure for v1 is out of scope. [CITED: 07-CONTEXT.md:109-114]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A test-only `CATE_E2E_USER_DATA_DIR`-style override is acceptable if scoped to E2E mode. [ASSUMED] | Architecture Patterns | If unacceptable, persistence tests need another state-preservation mechanism. |

## Open Questions

1. **Should Phase 7 fix `/mcp/info` auth behavior or make the stub permissive?**
   - What we know: product docs require no `Authorization` header on `/mcp/info`, while current manager/dialog probe code includes it when a token is present. [CITED: Requirements.md:243-254] [VERIFIED: src/main/flashquery/clientManager.ts:217-226; src/main/ipc/flashquery.ts:156-165]
   - What's unclear: whether Phase 7 should include the correction despite being a regression/proof phase. [CITED: 07-CONTEXT.md:18]
   - Recommendation: Planner should add a checkpoint before hard-coding stub auth assertions; if product docs remain authoritative, include a small bug-fix task and update affected tests. [CITED: 07-CONTEXT.md:24-30]

2. **Where should reusable restart state be rooted?**
   - What we know: current E2E mode creates a fresh tmp `userData` per launch. [VERIFIED: src/main/index.ts:1082-1089]
   - What's unclear: whether to preserve Electron `userData`, project `.cate`, or both through a helper. [VERIFIED: src/main/projectWorkspaceStore.ts:90-117; src/main/flashquery/credentials.ts:22-35]
   - Recommendation: Preserve both an explicit temp workspace root and explicit E2E userData dir for T-E-006/T-E-007. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | npm scripts, Playwright, Electron build | Available but wrong major | v24.7.0 | Use Node 20/22 per `.nvmrc`/engines before running phase tests. [VERIFIED: env probe; package.json:20-22] |
| npm | package scripts | yes | 11.5.1 | none. [VERIFIED: env probe] |
| Playwright | E2E | yes | 1.60.0 | none. [VERIFIED: env probe; npm ls] |
| Vitest | token tests | yes | 3.2.4 | none. [VERIFIED: env probe; npm ls] |
| TypeScript | typecheck | yes | 5.9.3 | none. [VERIFIED: env probe; npm ls] |
| Version manager (`nvm`/`fnm`/`volta`) | Node 20/22 switching | not found in this shell | — | Use whatever local Node 20/22 mechanism the user normally uses, or invoke a known Node 22 binary if available. [VERIFIED: env probe] |

**Missing dependencies with no fallback:** Node 20/22 is not active in this shell; running `npm test` under Node 24 may violate project engines. [VERIFIED: env probe; package.json:20-22]

**Missing dependencies with fallback:** none beyond Node version switching. [VERIFIED: env probe]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 and Playwright 1.60.0. [VERIFIED: npm ls] |
| Config file | `vitest.config.ts`, `playwright.config.ts`. [VERIFIED: codebase rg] |
| Quick run command | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/Chip.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` after switching to Node 20/22. [VERIFIED: package.json:31-35] |
| Full suite command | `npm run typecheck && npm test && npm run test:e2e` after switching to Node 20/22. [VERIFIED: package.json:31-35] |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| REQ-043 | Existing smoke/drag E2E pass unchanged. [CITED: Test Plan.md:500-510] | E2E | `npm run test:e2e -- e2e/smoke.spec.ts e2e/drag-detach.spec.ts e2e/drag-move.spec.ts e2e/drag-canvas-into-canvas.spec.ts e2e/drag-split.spec.ts` | yes. [VERIFIED: codebase rg] |
| REQ-044 | Connection/token survive restart and no eager probe occurs. [CITED: Test Plan.md:512-519] | E2E | `npm run test:e2e -- e2e/flashquery-persistence.spec.ts` | no, Wave 0. [VERIFIED: find e2e] |
| REQ-045 | Token discipline automated plus manual visual checklist. [CITED: Test Plan.md:521-552] | Unit/manual | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/components/Chip.test.tsx src/renderer/dialogs/FlashQueryConnectionDialog.test.tsx` | component tests yes; checklist no. [VERIFIED: codebase rg] |
| T-E-008/T-E-009 | Configure, browse, edit/save/reopen, open-on-canvas. [CITED: Test Plan.md:538-539] | E2E | `npm run test:e2e -- e2e/flashquery-happy-path.spec.ts` | no, Wave 0. [VERIFIED: find e2e] |
| T-E-010 | Disconnected state and retry after server returns. [CITED: Test Plan.md:540] | E2E | `npm run test:e2e -- e2e/flashquery-disconnect.spec.ts` | no, Wave 0. [VERIFIED: find e2e] |
| T-E-011 | Expansion, refresh, empty vault, multi-level navigation. [CITED: Test Plan.md:541] | E2E | `npm run test:e2e -- e2e/flashquery-vault-browse.spec.ts` | no, Wave 0. [VERIFIED: find e2e] |

### Sampling Rate

- **Per task commit:** focused Playwright spec or component test touched by the task, plus `npm run typecheck`. [VERIFIED: package.json:31-35]
- **Per wave merge:** `npm run test:e2e -- e2e/flashquery-*.spec.ts` plus existing regression specs. [CITED: Test Plan.md:500-541]
- **Phase gate:** `npm run typecheck && npm test && npm run test:e2e`, under Node 20/22. [VERIFIED: package.json:31-35; package.json:20-22]

### Wave 0 Gaps

- [ ] `e2e/fixtures/flashquery-server.ts` — local HTTP MCP stub for T-E-006..011. [CITED: 07-CONTEXT.md:44-49]
- [ ] `e2e/flashquery-persistence.spec.ts` — covers T-E-006/T-E-007. [CITED: Test Plan.md:518-519]
- [ ] `e2e/flashquery-happy-path.spec.ts` — covers T-E-008/T-E-009. [CITED: Test Plan.md:538-539]
- [ ] `e2e/flashquery-disconnect.spec.ts` — covers T-E-010. [CITED: Test Plan.md:540]
- [ ] `e2e/flashquery-vault-browse.spec.ts` — covers T-E-011. [CITED: Test Plan.md:541]
- [ ] `.planning/phases/07-cross-cutting-regression/07-DESIGN-CHECKS.md` or `07-UAT.md` — durable T-M-001..007 evidence. [CITED: 07-CONTEXT.md:58-62]
- [ ] Optional `launchApp` E2E userData override support — needed for true restart persistence. [VERIFIED: e2e/fixtures/electron-app.ts:17-30; src/main/index.ts:1082-1089]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Bearer token stays in main/electron-store path and is not exposed through renderer state. [VERIFIED: src/main/flashquery/credentials.ts:22-35; AGENTS.md:14-16] |
| V3 Session Management | no | No server-side Cate session state; MCP integration remains stateless from renderer perspective. [VERIFIED: AGENTS.md "Do NOT implement server-side session state"] |
| V4 Access Control | yes | Renderer must use typed preload APIs; main validates workspaceId/url/path arguments. [VERIFIED: src/preload/index.ts:900-932; src/main/ipc/flashquery.ts:190-235] |
| V5 Input Validation | yes | URL validation and string guards exist in FlashQuery IPC/dialog code. [VERIFIED: src/main/ipc/flashquery.ts:46-63; src/renderer/dialogs/FlashQueryConnectionDialog.tsx:21-28] |
| V6 Cryptography | no new crypto | Do not add token crypto/keychain changes in Phase 7. [CITED: 07-CONTEXT.md:109-114] |

### Known Threat Patterns for Electron/FlashQuery E2E

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Renderer bypasses preload to call Node/network directly | Elevation of privilege | Keep test helpers in E2E mode only and keep production FlashQuery I/O in main. [VERIFIED: AGENTS.md:14-16] |
| Token leaks into logs/test output | Information disclosure | Assert errors are redacted and keep stub tokens synthetic. [VERIFIED: src/main/flashquery/clientManager.ts:361-368] |
| Stub server reused across tests with stale docs/counts | Tampering/test flake | Reset in-memory documents and request counters per test. [CITED: Test Plan.md:3.3] |

## Sources

### Primary (HIGH confidence)

- `/Users/matt/Documents/Claude/Projects/Cate/cate/AGENTS.md` - project stack, boundaries, and testing constraints. [VERIFIED]
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/phases/07-cross-cutting-regression/07-CONTEXT.md` - Phase 7 scope and locked decisions. [CITED]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` - REQ-043, REQ-044, REQ-045 and invariants. [CITED]
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` - T-E-001..011, T-M-001..007, T-U-102..104. [CITED]
- Cate source files inspected: `e2e/fixtures/electron-app.ts`, existing `e2e/*.spec.ts`, `src/main/flashquery/clientManager.ts`, `src/main/ipc/flashquery.ts`, `src/preload/index.ts`, `src/renderer/panels/FlashQueryVaultPanel.tsx`, `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`, `src/renderer/components/Chip.tsx`, `src/renderer/components/VaultBadge.tsx`, `src/renderer/lib/session.ts`, `src/main/projectWorkspaceStore.ts`, `src/main/index.ts`. [VERIFIED]
- Context7 `/microsoft/playwright` - Electron automation docs. [CITED]
- Context7 `/modelcontextprotocol/typescript-sdk` - Streamable HTTP client/server docs. [CITED]

### Secondary (MEDIUM confidence)

- Local `node_modules/@modelcontextprotocol/sdk/dist/esm/server/streamableHttp.d.ts` - confirms installed SDK exports server transport types. [VERIFIED: codebase local dependency]

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - local package versions and existing code verified. [VERIFIED: npm ls; package.json]
- Architecture: HIGH - process boundaries and implementation anchors verified in source. [VERIFIED: codebase rg]
- Pitfalls: MEDIUM - restart and stub risks are directly evidenced; exact final stub shape should be validated while implementing. [VERIFIED: codebase rg] [CITED: Context7 /modelcontextprotocol/typescript-sdk]

**Research date:** 2026-05-29  
**Valid until:** 2026-06-05 for package/API details; phase scope remains valid until product docs change.
