# Cate FlashQuery Integration

## What This Is

Cate is a spatial desktop IDE with an infinite canvas for code, terminals, browsers, documents, Git, and AI agent panels. This fork uses Cate as the desktop surface for FlashQuery-related workflows: connecting a workspace to a FlashQuery instance, making memories and documents visible inside the IDE, and giving in-app agents a durable local-first data layer they can use across sessions.

The project is brownfield. Cate already has a mature Electron/React shell, workspace model, file/editor/terminal/browser panels, Git tooling, and an embedded Pi agent subsystem. The new work should extend those surfaces instead of replacing them.

## Core Value

Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.

## Current State

**Shipped:** v1.0 Vault Connect, Read, Edit (2026-05-30).

A Cate workspace can connect to a separately-running FlashQuery HTTP MCP server, browse the vault from a dedicated panel or the left sidebar, open existing markdown documents in Monaco, edit them, and save them back. Connection metadata persists across restart without eager probing; bearer tokens are isolated to a main-process credential helper; the full read/save round-trip runs through narrow typed IPC.

**Codebase impact:** ~6,800 lines of TypeScript added across 51 src/ files over 7 phases, 23 plans, 61 tasks. Total src/ TypeScript footprint is now ~62k LOC. FlashQuery integration surface is concentrated in `src/main/flashquery/`, `src/main/ipc/flashquery.ts`, `src/shared/flashqueryUri.ts`, `src/renderer/panels/FlashQueryVaultPanel.tsx`, `src/renderer/dialogs/FlashQueryConnectionDialog.tsx`, `src/renderer/components/{Chip,VaultBadge}.tsx`, plus narrow extensions to `EditorPanel.tsx`, `DockTabBar.tsx`, `CommandPalette.tsx`, `Sidebar.tsx`, and `WorkspaceTab.tsx`.

**Test surface:** 5 FlashQuery E2E specs (Playwright + Electron + MCP stub server) + 23 unit/component test files covering chip, badge, dialog, panel, IPC handlers, manager, URI helpers, workspace manager, credentials store. Full suite (typecheck + unit + E2E) passes green under Node 22.

**Active tech debt** (carried forward, tracked in `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Gaps.md`):
- **Debt-01:** REQ-035.3 / REQ-037.1 spec contradiction with §11.5 token-flow rule.
- **Debt-02:** T-M-002..T-M-007 PDF-level visual-fidelity capture deferred.

**Next Milestone Goals (provisional, awaiting `/gsd:new-milestone`):**

Strong candidates surfaced during the v1.0 close-out testing session:

- Reload-from-FlashQuery affordance on vault editor docs.
- "Live vault notifications" subscription (server-push for vault changes).
- New-vault-document creation flow.
- Conflict detection / expected-version round-trip (defers REQ-042 invariant).
- Visual-fidelity capture for T-M-002..T-M-007 (close Debt-02).
- Spec amendment workflow for REQ-035.3 / REQ-037.1 (close Debt-01).
- Renderer Sentry gating on DSN (silence sentry-ipc:// DevTools noise).
- Replace transaction-pooler-as-DATABASE_URL diagnostic on the FlashQuery server side (separate codebase follow-up).

## Requirements

### Validated

- ✓ User can arrange project tools on an infinite canvas with docked, floating, and detached panels — existing
- ✓ User can open and persist multiple project workspaces with restored panels, layouts, terminals, and editor state — existing
- ✓ User can edit files, view documents, run terminals, inspect Git state, and browse URLs from workspace-scoped panels — existing
- ✓ User can run embedded Pi agent chats inside workspace-aware agent panels — existing
- ✓ User can manage AI provider authentication and Pi extensions from the agent panel settings UI — existing
- ✓ Main, preload, renderer, and shared contracts are separated through Electron IPC and `window.electronAPI` — existing
- ✓ User can see manager-side FlashQuery connection status transitions for a configured workspace — v1.0 (Phase 2)
- ✓ User can recover manager-side from offline, hung, or failing FlashQuery probes through bounded retry, manual retry, and disposal cleanup — v1.0 (Phase 2)
- ✓ User can configure a FlashQuery HTTP connection for a Cate workspace without editing files by hand — v1.0 (Phase 5)
- ✓ User can browse the configured FlashQuery vault from a dedicated Cate panel — v1.0 (Phase 4)
- ✓ User can open an existing FlashQuery vault markdown document in Cate's existing editor — v1.0 (Phase 6)
- ✓ User can edit and save an existing vault document back through FlashQuery — v1.0 (Phase 6)
- ✓ User can restart Cate and keep the workspace's FlashQuery connection metadata and bearer token available without eager startup probing — v1.0 (Phase 7)
- ✓ User can recover from missing config, auth failures, and write failures without corrupting local workspace state — v1.0 (Phase 7, +Test Connection bearer validation post-milestone in `9820189`)
- ✓ User can launch the FlashQuery Vault panel from the Command Palette and the left sidebar, not just from the canvas panel registry — v1.0 (post-milestone in `6445909` + `71659cd`)

### Active

Empty. v1.1 requirements TBD — see "Next Milestone Goals" under "Current State" for candidates.

### Out of Scope

- Replacing FlashQuery's CLI, setup script, database migrations, vault scanner, or MCP server — FlashQuery remains the source of truth for its own runtime and storage.
- Implementing Cate as a general MCP host for arbitrary third-party MCP servers — v1 was FlashQuery-specific; v1.1 may revisit.
- Building a hosted/cloud FlashQuery account system in Cate — the user owns their local or self-hosted FlashQuery instance.
- Replacing Cate's existing Pi agent runtime with FlashQuery `call_model` — initial integration augments the current agent workflow, not rewrite it.
- Rebuilding Obsidian-style editing inside Cate — FlashQuery vault documents can open in existing editor/document panels.
- Creating new vault documents — v1 explicit scope guardrail; may move to Active in v1.1.
- Renaming, deleting, archiving, tagging, or moving vault documents — v1 scope guardrail.
- AI/palette/comment-thread integration with vault docs — v1 scope.
- Conflict detection beyond v1 last-write-wins behavior — v1 scope, candidate for v1.1.
- Stdio FlashQuery transport — v1 chose HTTP only; trivial to add later if needed.
- OS keychain integration; v1 uses electron-store and can be upgraded later.
- OAuth, refresh-token rotation, or hosted account flows.
- Frontmatter editing or frontmatter exposure in Cate.

## Context

Cate is an Electron 41 desktop application with a React 18 renderer, strict TypeScript, electron-vite build tooling, Zustand stores, `node-pty` terminals, Monaco editors, hardened webview browser panels, and an embedded Pi coding-agent runtime. Runtime code is split across `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`, and `src/agent/`.

The codebase map in `.planning/codebase/` is the baseline reference for this brownfield project. Important integration points include:

- `src/main/index.ts` for app lifecycle and IPC registration, though new work should prefer focused modules under `src/main/ipc/`.
- `src/preload/index.ts`, `src/shared/ipc-channels.ts`, and `src/shared/electron-api.d.ts` for renderer-to-main API contracts.
- `src/renderer/panels/registry.ts` and `src/shared/panels.ts` for adding or exposing panel types.
- `src/renderer/sidebar/Sidebar.tsx` and `src/renderer/stores/uiStore.ts` for left/right sidebar view registration (used by FlashQuery Vault as of v1.0).
- `src/renderer/stores/appStore.ts`, `src/renderer/stores/settingsStore.ts`, and workspace/session types in `src/shared/types.ts` for workspace-scoped state.
- `src/main/flashquery/clientManager.ts` for the FlashQuery MCP client lifecycle (probe, retry, disposal, subscription).
- `src/main/flashquery/credentials.ts` for bearer-token I/O isolated to main process.
- `src/main/ipc/flashquery.ts` for the typed IPC handlers (setConnection, listVault, getDocument, writeDocument, probe, retry, status broadcast).
- `src/agent/main/agentManager.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/renderer/AgentPanel.tsx`, and `src/agent/renderer/agentStore.ts` for agent workflow integration.

FlashQuery is a local-first MCP/data layer that manages memories, markdown vault documents, relational plugin records, vector search, and delegated model calls. It runs as a Node.js server and stores data in user-owned Supabase/Postgres plus a local markdown vault. Cate consumes FlashQuery through a narrow, explicit integration surface that respects Cate's Electron security boundary and FlashQuery's ownership of data.

**v1.0 lessons learned:**

- The Electron renderer + Vite + Monaco lazy-reopt + Sentry combination can interact in subtle ways. The renderer Sentry init unconditionally attaches `fetch` breadcrumbs that fail with `sentry-ipc://` URL-scheme errors when main hasn't registered the protocol handler (because DSN is unset). Cleanup follow-up tracked.
- `src/shared/` files run in BOTH main and renderer contexts. Renderer-eval-time `process.platform` references are unsafe and must be guarded (`typeof process !== 'undefined'`). The same goes for any other Node-only globals.
- URI handling needs explicit pass-through for any `scheme://` value in path utilities that otherwise root-join unknown strings. v1.0 surfaced one such bug in `toAbsolutePath` (now guarded for `flashquery://`, `file://`, `http://`, `https://`).
- Visual layout regressions from new chrome (badges, chips, tab metadata) need real-app inspection to catch; jsdom and token-grep alone won't surface flex-shrink / max-width / overflow issues. v1.0 surfaced three vault-editor-tab layout regressions (Gaps 9/10/11) that only appeared in the running app.
- FlashQuery's `DATABASE_URL` must be a direct connection or session-mode pooler, not a transaction-mode pooler. Cate v1.0 testing surfaced a real FlashQuery server bug where the startup check failed to reliably reject transaction poolers; tracked as a FlashQuery follow-up (separate codebase).

Known codebase concerns that affect ongoing work:

- The preload bridge is broad; new privileged APIs need runtime validation and minimal payloads.
- `src/main/index.ts` is already large; new FlashQuery work should avoid further concentrating unrelated logic there.
- Filesystem trust boundaries are security-sensitive; vault file opening must use existing path validation and workspace grants.
- Agent sessions are multiplexed by agent key and session file; FlashQuery context injection must not confuse panel identity or session restore.
- Browser/file/document panels process user-controlled content; FlashQuery result previews should avoid unsafe HTML insertion.

## Constraints

- **Tech stack**: Use the existing Electron, React, TypeScript, Zustand, IPC, and Vitest/Playwright stack — avoid adding a separate web backend or UI framework.
- **Security**: Renderer code must not call Node/Electron APIs directly; all privileged FlashQuery work must go through typed preload APIs and main-process validation. Bearer tokens stay in main; renderer can submit a token to main but main never returns it (post-Phase-5-Gap-4 invariant).
- **Local-first**: FlashQuery data remains in the user's configured FlashQuery instance and vault; Cate stores only connection metadata, user preferences, and UI/session state.
- **Workspace scoping**: Connection and context behavior should be workspace-aware so different Cate projects can use different FlashQuery instances or vaults.
- **Transport**: Prefer FlashQuery's host-visible MCP/HTTP surface; stdio remains explicitly out of scope for v1.0.
- **Compatibility**: Do not break existing Cate agent, terminal, editor, browser, Git, workspace, or layout behavior. v1.0 acceptably modified two stale pre-v1 drag E2E assertions (Plan 07-02, see audit close-out for record).
- **Testing**: Focused unit tests for config, IPC validation, and pure helpers; renderer tests for UI state; Electron smoke/E2E coverage for at least the happy-path workflow plus regression-suite-pass-unmodified baseline.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as a brownfield extension of Cate, not a rebuild | Cate already has the canvas, panel, workspace, and agent surfaces needed for FlashQuery workflows | ✓ Good — v1.0 |
| Keep FlashQuery runtime ownership outside Cate | FlashQuery already owns setup, storage, scanning, auth, and MCP tool semantics; duplicating those in Cate would create drift | ✓ Good — v1.0 |
| Make integration workspace-scoped | Cate is project/workspace-oriented and FlashQuery instances/vaults can differ by project | ✓ Good — v1.0 |
| Start with read/search and explicit save flows before deeper agent automation | Observable user value arrives quickly while limiting security and session-complexity risk | ✓ Good — v1.0 |
| Create phases only from explicit milestones | The project owner wants codebase/project context first and will define milestones before any phase plan exists | ✓ Good — v1.0 |
| Phase 1 as inert foundation code | Metadata, credentials, URI helpers, and manager lifecycle in place without FlashQuery IPC, UI, network probes, MCP clients, or runtime ownership | ✓ Good — Phase 01 |
| Phase 2 manager-side only | The connection manager owns HTTP `/mcp/info` probing, status transitions, retry, disposal, and subscriptions; IPC/preload/renderer broadcasts are Phase 3 scope | ✓ Good — Phase 02 |
| Keep `GET /mcp/info` public (no bearer auth) | Reachability probes shouldn't depend on token validity; allows graceful disconnection-with-token-on-file | ✓ Good — Phase 07 Plan 07-01 |
| Keep vault documents in the existing editor | `flashquery://` is treated as an editor `filePath`, with read/save routed through FlashQuery IPC and local editor behavior preserved | ✓ Good — Phase 06 |
| Show vault source as quiet title chrome | Vault-backed editor tabs/windows show an inert shared-chip badge and decoded path tooltip rather than a separate status bar or conflict surface | ✓ Good (with three layout regressions surfaced and fixed in close-out: Gaps 9, 10, 11) — Phase 06 |
| Renderer never receives bearer token from main (post-Gap-4) | §11.5 token-boundary invariant; preserve via `preserveExistingToken: true` save hint when dialog is in edit mode with blank token field | ✓ Good (spec drift carried as Debt-01) — Phase 05 |
| Sidebar mount of FlashQuery Vault as additive scope expansion | Match local File Explorer convention; canvas/dock mount retained for power users | ✓ Good — post-milestone `71659cd` |
| Test Connection probes URL+token (not just URL) | UX trap during live testing — user typed correct token, server logged wrong token; Test Connection said success either way | ✓ Good — post-milestone `9820189` (Gap 7) |
| Treat T-M-002..T-M-007 visual-fidelity capture as deferred debt | Visual-regression infrastructure (Percy/Chromatic) out of scope for v1; live testing surfaced Gaps 9/10/11 that the deferred check would have caught | ⚠️ Revisit in v1.1 — Debt-02 |
| Treat REQ-035.3 / REQ-037.1 spec contradiction with §11.5 as deferred debt | Implementation chose the right invariant; spec wording lags | ⚠️ Revisit in v1.1 — Debt-01 |

## Planning Preference

Do not create roadmap phases automatically for this project. Codebase mapping, research, candidate requirements, and project context are useful before a milestone exists, but execution phases should only appear after the project owner explicitly creates a milestone or asks for phase planning.

## Evolution

This document evolves at milestone boundaries and, once explicitly created, phase transitions.

**After each explicit phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-30 after shipping v1.0 Vault Connect, Read, Edit*
