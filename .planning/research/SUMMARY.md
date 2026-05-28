# Project Research Summary

**Project:** Cate FlashQuery Integration
**Domain:** Workspace-scoped FlashQuery connectivity inside a brownfield Electron desktop IDE
**Researched:** 2026-05-28
**Confidence:** HIGH

## Executive Summary

Cate is a spatial Electron IDE that already has the right shell for FlashQuery workflows: workspace-scoped panels, editors, terminals, browser/document surfaces, Git tooling, and embedded Pi agent chats. Experts should build this as a narrow brownfield extension of Cate, not as a rebuild, a hosted backend, or a general MCP host. FlashQuery remains the runtime and source of truth for memories, vault documents, schema verification, scanning, auth semantics, and MCP tool behavior.

The recommended approach is to add a main-process FlashQuery service behind a typed preload/IPC facade. Cate should store only workspace-scoped connection metadata, encrypted secrets, UI preferences, and small session metadata. The initial transport should be FlashQuery's HTTP MCP surface through `@modelcontextprotocol/sdk`, with plain `fetch` only for health/info/token endpoints. Renderer code owns UI and user intent; main owns token handling, URL/path validation, MCP calls, result normalization, and safe file-opening decisions.

The primary risks are boundary mistakes: leaking tokens into renderer state or logs, broad unvalidated IPC, trusting vault paths as workspace paths, silently injecting context into the wrong agent session, and duplicating FlashQuery storage behavior. Mitigate these by making Phase 1 establish the security/config boundary, by delaying writes and agent automation until search/open flows are proven, and by requiring visible provenance and confirmation for every durable save or agent context attachment.

## Key Findings

### Recommended Stack

Use Cate's existing Electron 41, React 18, strict TypeScript, Zustand, Electron IPC/preload, electron-store, Vitest, and Playwright stack. Add only `@modelcontextprotocol/sdk` and `zod`. Do not add Supabase, Postgres, a web backend, a new UI runtime, or a bundled FlashQuery runtime to Cate for this milestone.

**Core technologies:**
- Electron main process: owns FlashQuery auth, transport, health checks, MCP calls, path validation, and result normalization.
- React 18: renders workspace settings, status, search, save, and agent-context controls in Cate's existing UI model.
- TypeScript strict mode: keeps shared DTOs aligned across main, preload, renderer, and agent integration.
- `@modelcontextprotocol/sdk@^1.29.0`: provides MCP `Client`, `StreamableHTTPClientTransport`, stdio fallback support, `listTools`, and `callTool`.
- Electron IPC + preload bridge: exposes a minimal `window.electronAPI.flashquery` surface instead of renderer-side networking.
- Zustand: stores transient renderer UI state only, never secrets or authoritative connection state.
- `electron-store` + Electron `safeStorage`: persists workspace metadata and encrypted auth material in userData, outside project/session files.
- `zod`: validates all IPC payloads, persisted config shapes, and normalized response envelopes.

### Expected Features

The MVP must validate the core loop: configure FlashQuery for a workspace, prove the connection is healthy, retrieve knowledge, open useful results, save selected context, and attach selected knowledge to Pi agents with visible provenance.

**Must have (table stakes):**
- Workspace-scoped FlashQuery connection settings.
- Connection health/readiness UI covering reachability, auth, schema/tool availability, and actionable failure states.
- Search for FlashQuery memories and vault documents with filters and result metadata.
- Exact memory/document fetch after search for inspectable safe previews.
- Safe open of document results in existing Cate editor/document panels.
- Explicit save selected/manual text to FlashQuery memory.
- Explicit create/update vault document flow for richer captured notes.
- Auditable agent context attachment to Pi chats with visible source IDs/paths/tags.
- Graceful error handling that never blocks Cate startup or corrupts workspace/session state.

**Should have (competitive):**
- Spatial result cards or pinned knowledge panels once search/open proves useful.
- Command palette actions for configure, status, search, save, attach, and recent results.
- Save adapters from specific panels such as editor, terminal, browser, Git, and agent output.
- Vault directory browse using `list_vault`.
- Context packet history per agent session.
- Provenance affordances such as copy ID/path, modified time, source, tags, and open source.

**Defer (v2+):**
- General-purpose MCP host or arbitrary tool router.
- Replacing Cate's Pi runtime with FlashQuery `call_model`.
- FlashQuery setup, migrations, scanner, repair, or admin ownership inside Cate.
- Plugin record CRUD/search surfaces.
- Bulk destructive archive/remove/copy/move management UI.
- Silent automatic memory writes or hidden automatic context injection.
- Cross-workspace knowledge dashboards and fully automated context suggestions.

### Architecture Approach

Build a workspace-scoped FlashQuery client surface in Cate's main process. Renderer components request actions through typed preload methods; main validates inputs, resolves the current workspace and FlashQuery config, performs health/MCP calls, normalizes responses, and returns serializable `{ ok, data/error }` results. FlashQuery owns data semantics and storage. Cate owns UI composition, safe opening into existing panels, and explicit user-approved context handoff to Pi.

**Major components:**
1. FlashQuery shared contracts: serializable config, status, search result, save input, document ref, and agent context DTOs.
2. Main FlashQuery service: MCP session/client lifecycle, token handling, timeouts, tool discovery, tool calls, and response normalization.
3. Main IPC module: Zod validation, workspace binding, URL/path rules, redaction, and structured errors.
4. Config store: workspace-scoped metadata plus main-process-only encrypted secrets.
5. Preload API: narrow grouped `window.electronAPI.flashquery.*` methods.
6. FlashQuery panel/settings UI: configure, status, search, preview, open, save, and attach actions.
7. Agent adapter: explicit context blocks routed to the correct workspace and `agentKey`.

### Critical Pitfalls

1. **Treating FlashQuery as Cate-owned infrastructure** - Cate must not duplicate setup, schema migration, scanner, vault identity, or Supabase access. Use FlashQuery health/tool responses as source of truth.
2. **Broad unvalidated IPC** - every renderer-originated FlashQuery action needs Zod validation, workspace binding, redaction, and feature-specific handlers. Do not expose generic `callMcpTool` to product UI.
3. **Weak HTTP auth/token lifecycle** - model endpoint, auth mode, bearer token expiry, raw secret use, and unauthenticated HTTP warnings explicitly. Keep secrets main-process-only.
4. **Vault path trust bypasses** - revalidate realpaths, symlinks, workspace/vault grants, and stale document references in main before opening or writing.
5. **Unsafe durable saves** - require preview, destination, source metadata, tags, cancellation, duplicate/conflict handling, and clear partial-failure outcomes before enabling writes.
6. **Agent context identity confusion** - attach context visibly to a specific workspace and `agentKey`; never maintain hidden global agent context.
7. **Main-process blocking** - use timeouts, cancellation, pagination/result caps, status caching, and no startup dependency on FlashQuery availability.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Connection Boundary And Health
**Rationale:** Every workflow depends on safe workspace-scoped config, token storage, IPC validation, and status classification.
**Delivers:** Shared DTOs, `flashquery:*` IPC channels, preload facade, main service skeleton, config store, encrypted token handling, health/info/token probes, redacted errors, and minimal settings/status UI.
**Addresses:** Workspace connection settings, health/readiness check, graceful error handling, minimal IPC contract.
**Avoids:** Cate-owned FlashQuery infrastructure, broad unvalidated IPC, weak auth lifecycle, startup blocking.

### Phase 2: Search, Fetch, And Safe Open
**Rationale:** Read-only retrieval proves core value before Cate writes durable knowledge or changes agent behavior.
**Delivers:** FlashQuery search panel/command surface, memory/document filters, result metadata, exact fetch, safe previews, stale-result handling, path grant flow, and opening allowed documents in existing editor/document panels.
**Uses:** MCP SDK `listTools`/`callTool`, main result normalizers, renderer store/panel state.
**Implements:** FlashQuery panel, result DTOs, main path validation, request timeout/cancellation.
**Avoids:** Vault path trust bypasses, unsafe preview rendering, large payload/session bloat, stale document identity mistakes.

### Phase 3: Explicit Save To Memory And Documents
**Rationale:** Writes should come after connection and read/open behavior are testable, because FlashQuery writes affect future retrieval across tools.
**Delivers:** Save selected/manual text to memory, create new vault document from note/selection/agent output, confirmation UI, provenance metadata, tag/title validation, duplicate/conflict messaging, and partial-failure handling.
**Addresses:** Explicit memory save, explicit document creation/update, durable capture from workspace context.
**Avoids:** Unsafe save flows, noisy duplicate memories, direct frontmatter/schema edits, hidden auto-save.

### Phase 4: Auditable Agent Context Attachment
**Rationale:** Agent context depends on trustworthy retrieval objects and should not disturb Cate's existing Pi runtime or session identity.
**Delivers:** Select/search FlashQuery context, preview attachments, source provenance, prompt/context block formatting, attach/remove controls, correct routing to workspace and `agentKey`, and restore semantics that do not silently reinject stale context.
**Addresses:** Auditable agent context attachment, workspace-aware context bundles.
**Avoids:** Hidden automatic retrieval, wrong-agent routing, confusing session replay, server-side session state in Cate.

### Phase 5: Native Workflow Polish And Hardening
**Rationale:** Once primitives are stable, Cate can make workflows feel native without expanding core risk.
**Delivers:** Command palette actions, optional spatial result cards, context packet history, vault browse, panel-specific save adapters, broader E2E smoke coverage, performance checks, and regression tests.
**Addresses:** Differentiators after validation.
**Avoids:** Premature general MCP host, overbuilt Obsidian clone, generic CRUD/admin tooling.

### Phase Ordering Rationale

- Config, auth, validation, and health must come first because every later feature inherits this security and lifecycle boundary.
- Search/fetch/open should precede writes because it is the lowest-risk useful workflow and establishes result identity, path trust, and UI patterns.
- Save flows should precede agent automation because users need confidence in durable memory/document provenance before those artifacts influence model prompts.
- Agent context belongs after retrieval and save primitives so attachments can be explicit, inspectable, and correctly scoped.
- Differentiators belong last because command palette, spatial cards, adapters, and history are valuable only once the core contract is reliable.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Research exact MCP SDK client import paths, FlashQuery `/token` behavior, auth-expiry responses, and Cate's safest existing credential storage conventions.
- **Phase 2:** Research Cate's current filesystem grant/realpath validation helpers and panel-opening APIs before implementing vault document opens.
- **Phase 4:** Research current Pi agent prompt/session flow and `agentKey` routing before injecting context.

Phases with standard patterns (skip research-phase unless code has drifted):
- **Phase 3:** Save preview/confirmation, Zod validation, and MCP `callTool` wrappers are standard once Phase 1 and Phase 2 contracts exist.
- **Phase 5:** Command palette entries, panel registration, renderer stores, and Playwright smoke tests follow existing Cate patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on Cate package/codebase references, FlashQuery docs/source references, and MCP SDK documentation. Only future MCP package split naming is medium risk. |
| Features | HIGH | Based on project requirements, Cate workspace UX, FlashQuery tool capabilities, and clear dependency mapping. |
| Architecture | HIGH | Aligns with Cate's existing main/preload/renderer split, panel registry, Zustand state, and Pi agent boundaries. |
| Pitfalls | HIGH | Based on known Cate security concerns, FlashQuery auth/storage docs, Electron trust boundaries, and brownfield integration risks. |

**Overall confidence:** HIGH

### Gaps to Address

- MCP SDK/package drift: verify current import paths and transport APIs during Phase 1 implementation.
- Credential storage details: confirm whether Cate already wraps `safeStorage` or if FlashQuery should add a focused helper.
- FlashQuery result schemas: normalize defensively because MCP text payloads may vary across tool versions.
- Vault grants: inspect current Cate path validation helpers before deciding the exact outside-workspace grant UX.
- Agent prompt insertion point: confirm the least invasive Pi integration point before Phase 4.
- E2E fixture strategy: create mocked/local FlashQuery fixtures so CI does not depend on a real Supabase-backed instance.

## Sources

### Primary (HIGH confidence)
- `.planning/PROJECT.md` - project scope, active requirements, constraints, and out-of-scope decisions.
- `.planning/research/STACK.md` - recommended technologies, versions, install guidance, integration approach, and sources.
- `.planning/research/FEATURES.md` - table stakes, differentiators, anti-features, dependencies, MVP definition, and prioritization.
- `.planning/research/ARCHITECTURE.md` - component boundaries, data flow, build order, scaling concerns, anti-patterns, and integration points.
- `.planning/research/PITFALLS.md` - critical risks, tests, phase mapping, security mistakes, performance traps, and recovery strategies.

### Secondary (MEDIUM confidence)
- Cate `.planning/codebase/*` reports - existing architecture, stack, integrations, concerns, and testing patterns summarized by prior research agents.
- FlashQuery README and docs - runtime, transport, storage, auth, tool, and security behavior summarized by prior research agents.
- Context7 `/modelcontextprotocol/typescript-sdk` - MCP SDK client and transport capabilities summarized in stack research.

### Tertiary (LOW confidence)
- None identified.

---
*Research completed: 2026-05-28*
*Ready for roadmap: yes*
