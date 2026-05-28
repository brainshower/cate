# Cate FlashQuery Integration

## What This Is

Cate is a spatial desktop IDE with an infinite canvas for code, terminals, browsers, documents, Git, and AI agent panels. This fork uses Cate as the desktop surface for FlashQuery-related workflows: connecting a workspace to a FlashQuery instance, making memories and documents visible inside the IDE, and giving in-app agents a durable local-first data layer they can use across sessions.

The project is brownfield. Cate already has a mature Electron/React shell, workspace model, file/editor/terminal/browser panels, Git tooling, and an embedded Pi agent subsystem. The new work should extend those surfaces instead of replacing them.

## Core Value

Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.

## Current Milestone: v1.0 Vault Connect, Read, Edit

**Goal:** Prove a Cate workspace can connect to a separately-running FlashQuery HTTP MCP server, browse its vault, open an existing markdown document in Cate's editor, edit it, and save it back.

**Source of truth:** `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ`

**Target features:**

- Per-workspace FlashQuery HTTP connection config with bearer-token storage behind a main-process abstraction.
- Main-process `FlashQueryClientManager` with lazy connection, probe/status, retry, disposal, and subscription behavior.
- Typed `flashquery:*` IPC surface for setting connections, listing vault entries, reading documents, writing documents, probing, and broadcasting status.
- `flashquery://<workspaceId>/<vault-path>` URI helpers and editor read/save routing.
- `flashqueryVault` panel with vault tree, status chip, refresh, open, and open-on-canvas interactions.
- FlashQuery connection dialog and workspace context-menu entry.
- Editor vault badge and tooltip for vault-backed documents.
- Test coverage matching the product test plan, with no regression of existing Cate panels.

## Requirements

### Validated

- ✓ User can arrange project tools on an infinite canvas with docked, floating, and detached panels - existing
- ✓ User can open and persist multiple project workspaces with restored panels, layouts, terminals, and editor state - existing
- ✓ User can edit files, view documents, run terminals, inspect Git state, and browse URLs from workspace-scoped panels - existing
- ✓ User can run embedded Pi agent chats inside workspace-aware agent panels - existing
- ✓ User can manage AI provider authentication and Pi extensions from the agent panel settings UI - existing
- ✓ Main, preload, renderer, and shared contracts are separated through Electron IPC and `window.electronAPI` - existing

### Active

- [ ] User can configure a FlashQuery HTTP connection for a Cate workspace without editing files by hand.
- [ ] User can see whether the configured FlashQuery instance is connecting, live, or disconnected for the current workspace.
- [ ] User can browse the configured FlashQuery vault from a dedicated Cate panel.
- [ ] User can open an existing FlashQuery vault markdown document in Cate's existing editor.
- [ ] User can edit and save an existing vault document back through FlashQuery.
- [ ] User can restart Cate and keep the workspace's FlashQuery connection metadata available without eager startup probing.
- [ ] User can recover from missing config, offline servers, auth failures, and write failures without corrupting local workspace state.

### Out of Scope

- Replacing FlashQuery's CLI, setup script, database migrations, vault scanner, or MCP server - FlashQuery remains the source of truth for its own runtime and storage.
- Implementing Cate as a general MCP host for arbitrary third-party MCP servers - this milestone is FlashQuery-specific.
- Building a hosted/cloud FlashQuery account system in Cate - the user owns their local or self-hosted FlashQuery instance.
- Replacing Cate's existing Pi agent runtime with FlashQuery `call_model` - initial integration should augment the current agent workflow, not rewrite it.
- Rebuilding Obsidian-style editing inside Cate - FlashQuery vault documents can open in existing editor/document panels.

## Context

Cate is an Electron 41 desktop application with a React 18 renderer, strict TypeScript, electron-vite build tooling, Zustand stores, `node-pty` terminals, Monaco editors, hardened webview browser panels, and an embedded Pi coding-agent runtime. Runtime code is split across `src/main/`, `src/preload/`, `src/renderer/`, `src/shared/`, and `src/agent/`.

The codebase map in `.planning/codebase/` is the baseline reference for this brownfield project. Important integration points include:

- `src/main/index.ts` for app lifecycle and IPC registration, though new work should prefer focused modules under `src/main/ipc/`.
- `src/preload/index.ts`, `src/shared/ipc-channels.ts`, and `src/shared/electron-api.d.ts` for renderer-to-main API contracts.
- `src/renderer/panels/registry.ts` and `src/shared/panels.ts` for adding or exposing panel types.
- `src/renderer/stores/appStore.ts`, `src/renderer/stores/settingsStore.ts`, and workspace/session types in `src/shared/types.ts` for workspace-scoped state.
- `src/agent/main/agentManager.ts`, `src/agent/main/ipcAgent.ts`, `src/agent/renderer/AgentPanel.tsx`, and `src/agent/renderer/agentStore.ts` for agent workflow integration.

FlashQuery is a local-first MCP/data layer that manages memories, markdown vault documents, relational plugin records, vector search, and delegated model calls. It runs as a Node.js server and stores data in user-owned Supabase/Postgres plus a local markdown vault. Cate should consume FlashQuery through a narrow, explicit integration surface that respects Cate's Electron security boundary and FlashQuery's ownership of data.

Known codebase concerns that affect this project:

- The preload bridge is broad; new privileged APIs need runtime validation and minimal payloads.
- `src/main/index.ts` is already large; new FlashQuery work should avoid further concentrating unrelated logic there.
- Filesystem trust boundaries are security-sensitive; vault file opening must use existing path validation and workspace grants.
- Agent sessions are multiplexed by agent key and session file; FlashQuery context injection must not confuse panel identity or session restore.
- Browser/file/document panels process user-controlled content; FlashQuery result previews should avoid unsafe HTML insertion.

## Constraints

- **Tech stack**: Use the existing Electron, React, TypeScript, Zustand, IPC, and Vitest/Playwright stack - avoid adding a separate web backend or UI framework.
- **Security**: Renderer code must not call Node/Electron APIs directly; all privileged FlashQuery work must go through typed preload APIs and main-process validation.
- **Local-first**: FlashQuery data remains in the user's configured FlashQuery instance and vault; Cate stores only connection metadata, user preferences, and UI/session state.
- **Workspace scoping**: Connection and context behavior should be workspace-aware so different Cate projects can use different FlashQuery instances or vaults.
- **Transport**: Prefer FlashQuery's host-visible MCP/HTTP surface for integration planning, with room to support stdio later only if needed.
- **Compatibility**: Do not break existing Cate agent, terminal, editor, browser, Git, workspace, or layout behavior.
- **Testing**: Add focused unit tests for config, IPC validation, and pure helpers; add renderer tests for UI state; add Electron smoke/E2E coverage for at least the happy-path workflow once UI exists.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Treat this as a brownfield extension of Cate, not a rebuild | Cate already has the canvas, panel, workspace, and agent surfaces needed for FlashQuery workflows | - Pending |
| Keep FlashQuery runtime ownership outside Cate | FlashQuery already owns setup, storage, scanning, auth, and MCP tool semantics; duplicating those in Cate would create drift | - Pending |
| Make integration workspace-scoped | Cate is project/workspace-oriented and FlashQuery instances/vaults can differ by project | - Pending |
| Start with read/search and explicit save flows before deeper agent automation | Observable user value arrives quickly while limiting security and session-complexity risk | - Pending |
| Create phases only from explicit milestones | The project owner wants codebase/project context first and will define milestones before any phase plan exists | - Pending |

## Planning Preference

Do not create roadmap phases automatically for this project. Codebase mapping, research, candidate requirements, and project context are useful before a milestone exists, but execution phases should only appear after the project owner explicitly creates a milestone or asks for phase planning.

## Evolution

This document evolves at milestone boundaries and, once explicitly created, phase transitions.

**After each explicit phase transition** (via `$gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `$gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-28 after starting milestone v1.0*
