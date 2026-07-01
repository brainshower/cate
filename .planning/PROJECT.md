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

**Shipped:** v1.1 Release Readiness + Provenance Closeout (2026-06-02).

The upstream Cate `v1.1.0` sync is complete and archived under `.planning/milestones/v1.1-*`. The fork preserved FlashQuery v1.0 behavior/security/E2E guarantees, completed post-handoff audits, and recorded provenance/runbook evidence for future upstream syncs.

**Shipped:** v1.2 FlashQuery Milestone 2 (2026-06-06).

Cate now has richer FlashQuery vault editor controls, separate frontmatter editing, vault search, bundled Pi FlashQuery tool access, literal document-reference autocomplete, clipboard utilities, and cross-surface disconnected/reconnect hardening. The milestone audit passed with 20/20 requirements satisfied and deterministic substitutes accepted for the remaining live Pi/FlashQuery manual evidence.

**Shipped:** v1.3 Document Outline (2026-06-16).

Cate now has a first-class Document Outline panel for active Monaco editors. The Outline panel can be opened from the editor toolbar into the right dock, parses Markdown/HTML/code-section headings, supports active-heading tracking, search filtering, Enter cycling, source-mode navigation, and Markdown preview routing with deterministic heading IDs and duplicate-heading handling. The v1.3 audit passed with notes after product clarification accepted the current source and preview highlight lifecycle.

Canonical source docs for this milestone:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md`

**Shipped:** v1.5 Browser Uplift (2026-06-30).

Cate's forked in-app browser now has workspace-scoped durable browser partitions, per-workspace history/bookmarks/settings affordances, scoped clear-data and workspace removal cleanup, main-frame-only load errors, crash recovery, focused-webview shortcut forwarding, modular screenshot IPC, portal bridge preservation, and FlashQuery isolation regression coverage. The post-phase Browser Uplift gap analysis resolved the known implementation and traceability gaps before closeout. `T-M-001` real-site login persistence remains explicitly recorded as human-only manual-pending evidence.

Canonical source docs for this milestone:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`

**Shipped:** v1.6 Graph Intelligence Monaco Side Panel (2026-07-01).

Cate's Semantic Connections side panel now consumes FlashQuery typed graph data while preserving embeddings-only fallback behavior. It supports graph-aware contracts, `query_graph` IPC/preload/provider enrichment, whole-document graph triage, section selection detail with claims and edge metadata, renderer-local filtering, dock chrome state, and deterministic Electron regression coverage.

Canonical source docs for this milestone:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Graph Explorer/Graph Intelligence Monaco Side Panel Test Plan.md`

## Next Milestone Goals

No active next milestone is defined yet. Use `/gsd-new-milestone` to define fresh requirements and roadmap scope.

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
- ✓ User can open a Document Outline panel for the active editor from the editor toolbar and host it in the right dock zone — v1.3
- ✓ User can navigate source-mode Monaco content through parsed Markdown, HTML, and code-section headings — v1.3
- ✓ User can filter and cycle Outline headings while preserving spatial context and active-heading state — v1.3
- ✓ User can use the same Outline navigation while Markdown preview is active, scrolling to preview heading IDs with the accepted highlight lifecycle — v1.3
- ✓ User gets stable cleanup, theme-compatible rendering, no-editor empty state, duplicate-heading handling, and no regressions to existing editor/preview behavior — v1.3
- ✓ Browser panels use stable per-workspace durable Electron partitions and never fall back to panel IDs or empty workspace suffixes — v1.5
- ✓ Browser history, bookmarks, bookmark bar state, and clear-data behavior persist per workspace with renderer selectors keyed by `workspaceId` — v1.5
- ✓ Browser chrome includes main-frame-only load errors, crash recovery, focused-webview shortcut forwarding, star/bookmark affordances, menu/settings controls, and scoped clear-data — v1.5
- ✓ Screenshot capture lives in modular IPC while preserving `{ filePath, dataUrl }`, Desktop PNG behavior, ownership validation, and screenshot drag/drop usability — v1.5
- ✓ Browser operations preserve FlashQuery credentials, connection metadata, vault/index state, MCP sessions, and existing FlashQuery IPC/preload contracts — v1.5
- ✓ User can preserve embeddings-only Semantic Connections behavior while adding typed and mixed graph-intelligence modes — v1.6
- ✓ User can receive normalized FlashQuery `get_document` graph fields and use typed `query_graph` main/preload/renderer boundaries without leaking credentials — v1.6
- ✓ User can inspect whole-document graph intelligence inside the existing Semantic Connections panel with native dock sizing, attention surfacing, section navigation, grouped typed connections, and tested chrome state — v1.6
- ✓ User can inspect section-level graph intelligence with status notes, claims, claim-linked edges, qualifier prose, expandable details, and covered target-opening regressions — v1.6
- ✓ User can locally filter loaded graph data and rely on integrated Electron regression coverage without triggering FlashQuery or network calls from the filter — v1.6

### Active

(None — next milestone requirements have not been defined.)

### Out of Scope

- Replacing FlashQuery's CLI, setup script, database migrations, vault scanner, or MCP server — FlashQuery remains the source of truth for its own runtime and storage.
- Implementing Cate as a general MCP host for arbitrary third-party MCP servers — Milestone 2 exposes only FlashQuery-brokered eligible tools through the bundled Pi extension.
- Building a hosted/cloud FlashQuery account system in Cate — the user owns their local or self-hosted FlashQuery instance.
- Replacing Cate's existing Pi agent runtime or registering FlashQuery as a Pi provider — Milestone 2 augments current Pi workflows through tools only.
- Rebuilding Obsidian-style editing inside Cate — FlashQuery vault documents can open in existing editor/document panels.
- Creating new vault documents — Milestone 2 adds refresh, frontmatter, search, references, and tool access, not document creation.
- Renaming, deleting, archiving, tagging, or moving vault documents — v1 scope guardrail.
- Document-centric AI surfaces, selection palettes, conversation-as-document, synthetic teams, and comment-thread integration with vault docs.
- Conflict detection or merge/diff flows beyond explicit dirty-refresh confirmation.
- Stdio FlashQuery transport — v1 chose HTTP only; trivial to add later if needed.
- OS keychain integration; v1 uses electron-store and can be upgraded later.
- OAuth, refresh-token rotation, or hosted account flows.
- Cate-level "Run Macro" button or host-side macro launcher — macro execution is only via host-model `call_macro`.
- User-facing model or purpose picker for `call_model`.
- Memory view/edit surfaces beyond search results and read-only result inspection.
- Multi-vault-per-workspace UI.
- Preserving YAML comments, key order, and quoting on frontmatter writes.
- FlashQuery roadmap work items RM-1 through RM-5; they are traceability context, not Cate implementation scope.
- Document Chat from the Outline-Chat research guide — separate future devspec.
- Broader Graph Explorer unified selection work beyond the SC Inspector preview/Outline/panel synchronization described in v1.4.
- Replacing Cate's existing Markdown preview toggle or building a separate web UI.
- FlashQuery server-side implementation of a connection-query API for the Semantic Connections Inspector — v1.4 defines the Cate adapter boundary only.
- Graph-store, typed-edge classification, typed-edge persistence, and typed graph edge UI as required runtime data.
- Spatial Graph Explorer Map view and source-mode Monaco line decorations for semantic connections.
- In-panel browser tabs, start page, URL autocomplete UI, per-panel proxy support, DOM/Readability/Turndown/PDF/DOCX extraction, vault writes from captured browser content, and a `cate_browser` MCP server — all deferred beyond v1.5.
- FlashQuery server changes, FlashQuery history ingestion, and migration of old per-panel browser cookies — not included in Browser Uplift.

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
| Treat upstream sync product docs as source of truth for Phase 8 | The migration has a purpose-built requirements spec and paired test plan with resolved decisions and traceability | Planned — Phase 08 |
| Keep Phase 8 as migration-only scope | Avoids mixing upstream sync risk with new FlashQuery feature work | Planned — Phase 08 |
| Treat Milestone 2 product requirements/test plan as source of truth for v1.2 | The feature milestone has explicit REQ/T-U/T-E/T-M coverage and scoped source priorities | Planned — v1.2 |
| Keep FlashQuery out of Pi Providers in Milestone 2 | Users must configure a native Pi LLM provider; FlashQuery enters Pi through eligible tools and brokered MCP tools only | Planned — v1.2 |
| Use literal whole-document references for Pi `@` mentions | Keeps chat input simple and defers rich chips, anchors, and automatic external vault invalidation | Planned — v1.2 |
| Treat Document Outline requirements/test plan as source of truth for v1.3 | The Outline spec has explicit REQ-001..REQ-022 coverage and test IDs for unit, integration, acceptance, and manual checks | ✓ Good — v1.3 |
| Execute Document Outline in two bundled phases | Foundation/source-mode behavior should land with its tests before preview routing and final hardening | ✓ Good — v1.3 |
| Keep Graph Explorer selection behavior out of Document Outline v1.3 | The Outline spec explicitly uses standalone preview scroll behavior; unified section selection comes later | ✓ Good — v1.3 |
| Accept current Outline highlight lifecycle for v1.3 | Source-mode persistence is desirable until editing; preview-mode timing is acceptable after attempted delayed-render alternatives did not improve the experience | ✓ Good — v1.3 |
| Treat Semantic Connections Inspector requirements/test plan as source of truth for v1.4 | The spec defines an embeddings-only launch, Cate/FlashQuery boundary, and complete REQ/test traceability | Planned — v1.4 |
| Execute Semantic Connections Inspector in two GSD phases | Owner requested source phases 1-3 in the first GSD phase and source phases 4-7 in the second | Planned — v1.4 |
| Require tests to land with the feature slices they verify | Avoids final test catch-up and keeps each feature group verified before the next slice starts | Planned — v1.4 |
| Keep FlashQuery connection-query backend out of v1.4 | Cate can define the adapter and UI contract while backend work remains a separate FlashQuery milestone | Planned — v1.4 |
| Launch SC Inspector as embeddings-only | FlashQuery has no typed graph edge store today; typed fields remain optional for future upgrade | Planned — v1.4 |
| Treat Browser Uplift requirements/test plan as source of truth for v1.5 | The product docs pin upstream v1.3.2 browser capabilities, fork-specific FlashQuery boundaries, and direct REQ/test traceability. | ✓ Good — v1.5 |
| Execute Browser Uplift in one GSD phase | Owner requested one phase if possible; the source spec's four internal implementation phases can be preserved as sub-slices inside Phase 26. | ✓ Good — v1.5 |
| Keep browser state workspace-scoped and separate from FlashQuery state | The same `workspaceId` scopes browser convenience state and FlashQuery connection state, but the stores and security boundaries must remain separate. | ✓ Good — v1.5 |
| Exclude upstream tabs, start page/autocomplete, proxy, extraction, and browser MCP control | Browser Uplift is a durability and affordance uplift, not the broader Browser Capture and Control tier. | ✓ Good — v1.5 |
| Use Option A for browser popover and clear-data behavior | Homepage/search stay in the existing Settings-window browser panel; clear-data does not force-reload live webviews and takes effect on next navigation/reload. | ✓ Good — v1.5 |
| Run post-phase gap analysis before closeout | The gap pass found shortcut scoping, portal smoke, traceability, visit-count, and screenshot-drop issues after implementation looked complete. | ✓ Good — v1.5 |
| Treat Graph Intelligence Monaco Side Panel requirements/test plan as source of truth for v1.6 | The product docs define FlashQuery graph-data assumptions, deferred claim-basis scope, REQ/test traceability, and the five source implementation phases. | ✓ Good — v1.6 |
| Execute Graph Intelligence in two GSD phases | Phase 27 bundles source phases 1-2 so the data contract and whole-document graph view land together with their tests; Phase 28 bundles source phases 3-5 for selection detail, filter/chrome polish, E2E, and regression hardening. | ✓ Good — v1.6 |
| Preserve product `REQ-###` and test IDs | The supplied Test Plan already maps REQ IDs to unit/component/IPC/E2E/acceptance tests; keeping those IDs avoids traceability drift. | ✓ Good — v1.6 |
| Use `query_graph` for v1 node and edge metadata in Cate | FlashQuery v1 exposes node analysis and edge metadata through `query_graph`, while `get_document` supplies connection overlays and graph summary. | ✓ Good — v1.6 |
| Keep claim basis tags and per-claim question text deferred | FlashQuery v1 produces `key_claims` as `string[]`; per-claim basis/question typing requires a future structured-claims pipeline. | ✓ Good — v1.6 |

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
*Last updated: 2026-07-01 after v1.6 Graph Intelligence Monaco Side Panel milestone archive*
