# Feature Research

**Domain:** Brownfield FlashQuery integration for Cate's spatial desktop IDE
**Researched:** 2026-05-28
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Workspace-scoped FlashQuery connection settings | Cate is workspace-oriented and users may use different FlashQuery instances, vaults, or auth tokens per project. | MEDIUM | Store only connection metadata and UI preferences in Cate. Do not copy FlashQuery config or secrets into renderer state. |
| Connection health and readiness check | Users need to know whether FlashQuery is reachable, authenticated, and usable before search/save/agent flows fail. | MEDIUM | Surface transport URL, auth state, tool availability, and actionable errors for offline server, bad token, missing schema, unsupported transport, or filtered tool surface. |
| FlashQuery search panel or command surface | The core value is retrieving FlashQuery memories and vault documents without leaving the IDE. | MEDIUM | Use FlashQuery `search` for documents and memories. Support query, entity type filters, tags, archived toggle, and result metadata. |
| Open document search results in existing Cate panels | Cate already has editor and document panels; users expect results to become usable workspace artifacts, not dead preview rows. | LOW | Resolve document result paths or identifiers through safe main-process IPC, then open in existing editor/document panels when the vault path is allowed or explicitly granted. |
| Exact result fetch after search | Search results are summaries. Users need to inspect full memory content or document body/headings. | LOW | Use `get_document` and `get_memory` by exact ID/path returned by search. Keep previews plain text and avoid unsafe HTML insertion. |
| Explicit save selected context to memory | Durable AI/workspace memory is a primary FlashQuery capability. | MEDIUM | Let users save selected text, current file snippet, terminal output snippet, note text, or agent response through `write_memory`. Require user confirmation and editable tags/title/source metadata. |
| Explicit create/update vault document flow | FlashQuery documents are markdown files in the user's vault; users expect to capture richer notes than short memories. | MEDIUM | Use `write_document` create/update. Prefer creating new notes first; defer complex section editing unless needed for a concrete workflow. |
| Auditable agent context attachment | The integration must help Cate's Pi agent use FlashQuery context predictably without silently changing agent behavior. | HIGH | Provide a user-visible "attach FlashQuery context" step that inserts selected results or a generated context block into the agent prompt/session. Show what was attached and where it came from. |
| Graceful error handling and recovery | Brownfield desktop integrations must not corrupt workspace/session state when external services are offline or misconfigured. | MEDIUM | Return structured IPC results, preserve Cate layout/session state, and provide retry/reconfigure actions. Never block Cate startup on FlashQuery availability. |
| Minimal IPC and preload contract for FlashQuery actions | Cate's renderer cannot directly call Node/Electron APIs; privileged network/auth/path work belongs behind typed preload APIs. | MEDIUM | Add focused IPC channels for config, health, search, fetch, save, and context attachment. Validate payloads with serializable contracts. |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Spatial knowledge canvas results | FlashQuery results become arranged workspace objects alongside code, terminals, browser docs, Git, and agents. | MEDIUM | Add result cards or lightweight panels that can be pinned, grouped, docked, or opened into full editor/document panels. |
| Workspace-aware context bundle for agents | Cate can turn visible workspace state plus selected FlashQuery knowledge into a clear agent input artifact. | HIGH | Start with manual selection and preview. Later automate suggestions based on active file, open panels, branch, or task. |
| Save from any panel into FlashQuery | Users can capture knowledge where it appears: editor selection, terminal command output, browser note, markdown scratch, Git diff, or agent answer. | HIGH | Implement incrementally. v1 should support text selection/manual note/agent output; broader panel adapters can follow. |
| Result provenance and source affordances | Developers need to trust retrieved knowledge. Showing source path, memory ID, tags, modified time, and match source makes context auditable. | LOW | Use metadata from FlashQuery `search`, `get_document`, and `get_memory`. Include copy ID/path and open source actions. |
| Command palette integration | Cate users already use command palette/navigation overlays; FlashQuery commands should feel native. | MEDIUM | Add commands for configure, health check, search, save selection, attach context, and open recent FQ result. |
| Vault directory browse as a spatial entry point | Some users explore knowledge by folder, not query. | MEDIUM | Use `list_vault` for document browse. Add after search because semantic recall is the higher-value first workflow. |
| Context packet history per agent session | Lets users review or reattach prior FlashQuery context without guessing what was sent. | MEDIUM | Store UI/session metadata in Cate, not copied document bodies long term unless the user explicitly saves a note. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| General-purpose MCP host inside Cate | It would make Cate an all-in-one AI tool router. | The milestone is FlashQuery-specific; arbitrary MCP hosting expands auth, permissions, lifecycle, and tool approval scope dramatically. | Build a narrow FlashQuery client surface with explicit supported actions. |
| Replacing FlashQuery setup, migrations, scanner, or CLI in Cate | Users want one app to configure everything. | FlashQuery owns runtime, storage, schema verification, vault scanning, locks, and setup. Duplicating this creates drift and data-loss risk. | Link to FlashQuery setup guidance and show health/config diagnostics in Cate. |
| Replacing Cate's Pi agent runtime with FlashQuery `call_model` | FlashQuery can delegate model calls, so it may look like a drop-in agent backend. | Cate already has a Pi agent subsystem with auth, sessions, provider settings, and UI expectations. Replacing it is a separate product rewrite. | Augment Pi prompts with explicit FlashQuery context. Defer `call_model` experiments. |
| Silent automatic memory writes | Capturing everything sounds useful. | It creates noisy memories, privacy surprises, and hard-to-debug retrieval pollution. | Require explicit save actions with editable content, tags, and source metadata. |
| Silent automatic agent context injection | It promises smarter agents with less work. | Users cannot audit why the agent knows something, stale context may be injected, and session restore identity can become confusing. | Use visible context preview and attach controls; later add suggestions that still require approval. |
| Obsidian-style vault editor rebuilt in Cate | FlashQuery documents are markdown, so a full knowledge editor may seem natural. | Cate already has editor/document panels; rebuilding backlinks/graph/plugins is outside this milestone. | Open vault markdown in existing editor/markdown preview panels. |
| Direct renderer calls to FlashQuery or filesystem | Faster to implement from React. | Violates Cate's Electron security model and bypasses workspace trust/path validation. | All privileged work goes through typed preload APIs and main-process handlers. |
| Bulk destructive document/memory management in v1 | Archive/remove tools exist and admins may want cleanup. | Delete/archive workflows carry high trust and recovery requirements and do not validate core integration value. | Defer archive/remove/copy/move UI; expose read/search/save first. |
| Full plugin record CRUD UI | FlashQuery supports relational plugin records. | Generic schema-driven CRUD would become a separate app platform and distract from memory/document workflows. | Defer records to plugin-specific Cate workflows after core integration proves useful. |

## Feature Dependencies

```
Workspace-scoped connection settings
    └──requires──> Typed preload/main IPC contract
                       └──requires──> Shared serializable FlashQuery types

Connection health and readiness check
    └──requires──> Workspace-scoped connection settings

Search panel / command surface
    └──requires──> Connection health and readiness check
                       └──requires──> FlashQuery search client

Open document results in existing panels
    └──requires──> Search panel / command surface
                       └──requires──> Workspace/vault path validation

Exact result fetch after search
    └──requires──> Search panel / command surface

Explicit save to memory / document
    └──requires──> Connection health and readiness check
                       └──requires──> User-confirmed capture UI

Auditable agent context attachment
    └──requires──> Search panel / exact fetch
                       └──requires──> Agent panel integration point

Spatial knowledge canvas results
    └──enhances──> Search panel / open result workflows

Silent automatic writes ──conflicts──> Auditable explicit save
Silent automatic context injection ──conflicts──> Auditable agent context attachment
General MCP host ──conflicts──> Narrow FlashQuery-specific milestone
```

### Dependency Notes

- **Connection settings must precede every workflow:** Search, save, and agent context need the same workspace-scoped endpoint/auth/tool availability baseline.
- **Health check should ship before search/save UI:** It reduces support ambiguity and prevents every feature from needing its own first-run troubleshooting flow.
- **Search should precede agent context:** Agent context attachment is only trustworthy if users can inspect and choose retrieved memories/documents first.
- **Open result depends on path validation:** FlashQuery document paths are vault-relative, while Cate file access is workspace-root constrained. The main process must mediate safe opening.
- **Save flows require explicit confirmation:** Memories and vault documents affect future retrieval. Users need a review step before durable writes.
- **Agent context attachment should be a visible artifact:** The user should see source IDs/paths/tags and content preview before it enters a Pi chat.
- **Automation should come after manual primitives:** Once configure/search/fetch/save/attach are reliable, Cate can suggest context automatically without making v1 unpredictable.

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [ ] Workspace-scoped FlashQuery settings - essential foundation for brownfield multi-workspace use.
- [ ] Connection health/readiness UI - essential for diagnosing offline/auth/schema/tool-surface failures.
- [ ] FlashQuery search for documents and memories - core retrieval value inside Cate.
- [ ] Exact document/memory fetch and safe previews - makes search results inspectable and auditable.
- [ ] Open document results in existing editor/document panels - connects FlashQuery knowledge to Cate's spatial workflow.
- [ ] Explicit save selected/manual text to memory - validates durable capture from the IDE.
- [ ] Explicit create new vault document from note/selection/agent output - validates document capture without requiring Obsidian-specific UI.
- [ ] Attach selected FlashQuery context to Pi agent with visible provenance - validates the AI workflow integration without replacing the agent runtime.
- [ ] Robust error and empty-state handling - prevents external FlashQuery failures from degrading Cate's existing IDE.

### Add After Validation (v1.x)

Features to add once core is working.

- [ ] Command palette actions for FlashQuery workflows - add once the underlying flows are stable.
- [ ] Pinned spatial result cards - add after users confirm search/open behavior is useful.
- [ ] Save adapters for terminal/browser/Git/editor-specific context - add panel by panel based on usage.
- [ ] Vault directory browser using `list_vault` - add when users need folder-first navigation.
- [ ] Context packet history per agent panel/session - add after the attach model is validated.
- [ ] Tag editing for documents/memories via `apply_tags` - add when organization workflows appear in practice.
- [ ] Config import/discovery helpers - add if manual endpoint/token setup is a recurring friction point.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] FlashQuery `call_model` workflows in Cate - defer because Cate already has Pi agent model/provider/session infrastructure.
- [ ] Plugin record search/CRUD surfaces - defer until specific record-backed workflows exist.
- [ ] Maintenance tools for vault sync/repair/status - defer to admin/diagnostic phase; normal read/write tools should cover v1.
- [ ] Archive/remove/copy/move document and memory management UI - defer due to destructive/high-trust semantics.
- [ ] Automated context suggestions from active workspace state - defer until manual attach creates clear usage patterns.
- [ ] Cross-workspace knowledge dashboards - defer until per-workspace connection and search are reliable.
- [ ] General MCP host/tool router - explicitly outside this milestone.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Workspace-scoped connection settings | HIGH | MEDIUM | P1 |
| Connection health/readiness UI | HIGH | MEDIUM | P1 |
| FlashQuery document/memory search | HIGH | MEDIUM | P1 |
| Exact result fetch and safe previews | HIGH | LOW | P1 |
| Open document results in existing panels | HIGH | LOW | P1 |
| Explicit save selected/manual text to memory | HIGH | MEDIUM | P1 |
| Explicit create vault document | HIGH | MEDIUM | P1 |
| Auditable agent context attachment | HIGH | HIGH | P1 |
| Command palette integration | MEDIUM | MEDIUM | P2 |
| Spatial pinned result cards | MEDIUM | MEDIUM | P2 |
| Save adapters for all panel types | MEDIUM | HIGH | P2 |
| Vault directory browser | MEDIUM | MEDIUM | P2 |
| Context packet history | MEDIUM | MEDIUM | P2 |
| Tag editing via `apply_tags` | MEDIUM | LOW | P2 |
| `call_model` delegated model workflows | MEDIUM | HIGH | P3 |
| Plugin record CRUD/search UI | MEDIUM | HIGH | P3 |
| Maintenance/admin tools | LOW | MEDIUM | P3 |
| Archive/remove/copy/move UI | LOW | HIGH | P3 |
| General MCP host | LOW | HIGH | Avoid |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration
- Avoid: Do not build for this milestone

## Competitor Feature Analysis

| Feature | MCP-capable coding clients | Obsidian-style knowledge tools | Our Approach |
|---------|----------------------------|--------------------------------|--------------|
| Persistent AI memory search | Usually available through tools, but not spatially integrated with IDE panels. | Strong document browsing/editing, weaker direct coding workspace context. | Search FlashQuery from inside Cate and open results beside code, terminals, browser docs, Git, and agent panels. |
| Durable capture from work session | Often agent/tool-call driven and easy to make invisible. | Manual note capture is strong but disconnected from agent sessions. | User-confirmed save from selected Cate context into FlashQuery memory or markdown documents. |
| Agent context usage | Tool calls may be hidden in transcript or host-specific. | Context must usually be copied into chat manually. | Visible attach flow with source provenance before content enters Cate's Pi agent session. |
| Spatial organization of knowledge | Most clients are linear chat/sidebar workflows. | Canvas plugins exist, but usually outside the live IDE surface. | Use Cate's existing infinite canvas, dock, and panel model for result inspection and workspace placement. |
| Runtime/setup ownership | Clients often hide server lifecycle or expect external config. | Knowledge tools usually own their own storage/runtime. | Keep FlashQuery runtime ownership in FlashQuery; Cate provides connection, diagnostics, and workflow UI. |

## Sources

- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/PROJECT.md` - project scope, requirements, out-of-scope boundaries, constraints.
- `/Users/matt/Documents/Claude/Projects/Cate/cate/README.md` - existing Cate features, user workflows, architecture, and security posture.
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/ARCHITECTURE.md` - process boundaries, panel/store/agent architecture, anti-patterns.
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/STRUCTURE.md` - file organization and likely integration points.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/README.md` - FlashQuery runtime, local-first model, deployment/transport setup, core capabilities.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/docs/FlashQuery MCP Tool Guide.md` - current host-visible MCP tools and semantics for search, documents, memories, vault browsing, records, LLM, and tool exposure.

---
*Feature research for: Cate FlashQuery integration*
*Researched: 2026-05-28*
