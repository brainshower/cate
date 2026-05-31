# Phase 7: Cross-Cutting + Regression - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning
**Source:** Product requirements and test plan supplied for Phase 7 planning

<domain>
## Phase Boundary

Phase 7 proves the completed v1 Cate FlashQuery workflow after Phases 1-6:

- Existing Cate Electron smoke and drag/panel E2E coverage still passes unchanged.
- FlashQuery connection metadata and bearer-token access survive a Cate restart.
- Cate does not eagerly probe FlashQuery on restart; the manager reconnects lazily on first vault-panel use.
- The full v1 workflow is covered through Playwright/Electron E2E against a stubbed FlashQuery HTTP MCP server: configure, browse, open, edit, save, reopen, open-on-canvas, disconnect, retry, refresh, empty-vault, and multi-level navigation.
- Design-token and visual-fidelity checks confirm the vault panel, chip, dialog, workspace menu entry, and editor vault badge conform to Cate's UI spec and existing design-token model.

No new product surface should be invented in this phase. It is a regression, E2E harness, persistence, and design-verification phase.
</domain>

<decisions>
## Implementation Decisions

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

- T-E-008 covers the full happy path: configure connection via dialog, status live, populated vault panel, double-click document, editor opens with vault badge, edit body, save, reopen, and verify the edit persists.
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
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product requirements and verification

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — authoritative REQ-043, REQ-044, REQ-045 definitions and v1 invariants.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — authoritative T-E-001..011 and T-M-001..007 verification matrix.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — UI Spec.md` — visual reference for T-M-002..007 when manual design checks are executed.

### Cate planning context

- `.planning/ROADMAP.md` — Phase 7 goal, requirements, test IDs, and planned plan slices.
- `.planning/REQUIREMENTS.md` — condensed milestone requirements and source-document index.
- `.planning/STATE.md` — completed Phase 1-6 decisions that Phase 7 must not regress.
- `.planning/phases/06-editor-uri-awareness-vault-badge/06-VERIFICATION.md` — latest completed phase verification baseline.

### Existing E2E and implementation anchors

- `e2e/fixtures/electron-app.ts` — current Playwright/Electron launch and helper patterns.
- `e2e/smoke.spec.ts` — existing smoke regression spec.
- `e2e/drag-detach.spec.ts`, `e2e/drag-move.spec.ts`, `e2e/drag-canvas-into-canvas.spec.ts`, `e2e/drag-split.spec.ts` — existing drag/panel regression specs.
- `src/main/flashquery/clientManager.ts` and `src/main/flashquery/clientManager.test.ts` — manager lazy-connect, probe, retry, list/read/write behavior to exercise from E2E.
- `src/main/ipc/flashquery.ts` and `src/preload/index.ts` — renderer-to-main FlashQuery API surface used by E2E.
- `src/renderer/panels/FlashQueryVaultPanel.tsx`, `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`, `src/renderer/components/Chip.tsx`, `src/renderer/components/VaultBadge.tsx`, and `src/renderer/sidebar/WorkspaceTab.tsx` — UI surfaces covered by design-token and manual checks.
</canonical_refs>

<specifics>
## Specific Ideas

- Preserve the existing Playwright convention: tests live in `e2e/*.spec.ts`, helpers live under `e2e/fixtures/`, and Electron launches through `launchApp()`.
- Add E2E helper APIs only if needed to make the tests deterministic; avoid turning the E2E harness into a product API.
- Prefer assertions that prove externally visible behavior: request counts on the stub server, visible chip/dialog/panel text, editor body content, workspace/session persistence after restart, and saved document state in the stub.
- Capture manual visual/design-token evidence in a markdown artifact such as `07-UAT.md` or `07-DESIGN-CHECKS.md`, with each T-M ID explicitly checked.
- Run the existing E2E regression specs as part of verification, not just the new FlashQuery specs.
</specifics>

<deferred>
## Deferred Ideas

- Automated visual regression infrastructure such as Percy or Chromatic is out of scope for v1.
- New FlashQuery document creation, rename/delete/archive/tag/move operations, frontmatter editing, conflict detection, live vault notifications, OAuth, OS-keychain storage, and stdio transport remain out of scope.
- Fixing unrelated flaky Cate E2E behavior is out of scope unless it blocks proving REQ-043; if a pre-existing failure appears, capture it with evidence instead of weakening the regression suite.
</deferred>

---

*Phase: 07-cross-cutting-regression*
*Context gathered: 2026-05-29 from product requirements and test plan*
