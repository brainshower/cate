# Architecture Research

**Domain:** Brownfield Electron IDE integration with FlashQuery local-first MCP/data layer
**Researched:** 2026-05-28
**Confidence:** HIGH

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              Cate Renderer                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────┐   │
│  │ FlashQuery Panel │  │ Agent Panel       │  │ Existing Panels          │   │
│  │ search/status/UI │  │ explicit context  │  │ editor/document/git/etc. │   │
│  └────────┬─────────┘  └────────┬─────────┘  └───────────┬──────────────┘   │
│           │                     │                        │                  │
│  ┌────────▼─────────────────────▼────────────────────────▼───────────────┐   │
│  │ Workspace/panel stores: UI state, selected result ids, open panels     │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
├──────────────────────────────────┼───────────────────────────────────────────┤
│                              Preload Bridge                                  │
│  window.electronAPI.flashquery: typed, narrow IPC facade only                │
├──────────────────────────────────┼───────────────────────────────────────────┤
│                            Electron Main Process                             │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌────────────────────┐   │
│  │ flashquery IPC      │  │ FlashQuery service   │  │ Workspace manager  │   │
│  │ validation/results  │  │ connection/tool API  │  │ root/trust source  │   │
│  └──────────┬──────────┘  └──────────┬──────────┘  └─────────┬──────────┘   │
│             │                        │                       │              │
│  ┌──────────▼────────────────────────▼───────────────────────▼──────────┐   │
│  │ Workspace-scoped config/status cache and optional result normalizers  │   │
│  └──────────────────────────────┬───────────────────────────────────────┘   │
├──────────────────────────────────┼───────────────────────────────────────────┤
│                              FlashQuery Runtime                              │
│  MCP HTTP/stdio server -> tools -> Supabase/Postgres + local markdown vault  │
└──────────────────────────────────────────────────────────────────────────────┘
```

Cate should integrate FlashQuery as a workspace-scoped main-process capability, not as renderer-side networking, not as a replacement for the Pi agent runtime, and not as a generic arbitrary MCP host. The renderer owns presentation and user intent; preload exposes a small `flashquery` API; main validates payloads, resolves workspace configuration, performs FlashQuery calls, and returns serializable result envelopes. FlashQuery remains the source of truth for memories, documents, vault scanning, schema verification, authentication semantics, and tool behavior.

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| FlashQuery panel | Let users configure/check connection, search memories/documents, inspect safe result metadata, and open results into existing panels | New renderer panel registered through `src/shared/panels.ts`, `src/shared/types.ts`, and `src/renderer/panels/registry.ts` |
| FlashQuery renderer store | Hold transient query text, filters, selected result ids, loading/error state, and last status per workspace | Dedicated Zustand store or panel-local state; persist only UI/session metadata through existing session flows |
| Preload FlashQuery API | Expose minimal renderer-to-main methods without Node/Electron access | Add `flashqueryGetStatus`, `flashquerySaveConfig`, `flashquerySearch`, `flashquerySaveMemory`, `flashqueryCreateDocument`, and `flashqueryOpenDocument` wrappers in `src/preload/index.ts` |
| Main FlashQuery IPC module | Validate all renderer payloads, bind requests to a workspace id, enforce path and URL rules, and return structured failures | New `src/main/ipc/flashquery.ts` registered in deferred handlers unless status is required before first paint |
| Main FlashQuery service | Own connection clients, token handling, timeout/retry policy, tool response parsing, and normalized domain results | New `src/main/flashquery/service.ts` plus `src/main/flashquery/types.ts`; no React imports |
| Workspace configuration store | Persist workspace-scoped FlashQuery connection metadata and preferences | Extend project workspace state or add focused main-side config storage; store secrets only through the safest existing credential mechanism available |
| Agent integration adapter | Make user-approved FlashQuery context available to Pi agent prompts without changing agent identity/session routing | Renderer or main adapter that appends explicit context blocks to `AGENT_PROMPT`; no hidden session mutation |
| Existing editor/document panels | Open vault markdown files and document results using existing panel routes | Main resolves a FlashQuery document result to a validated local path, then renderer creates an `editor` or `document` panel |

## Recommended Project Structure

```
src/
├── main/
│   ├── flashquery/
│   │   ├── service.ts              # Workspace-scoped FlashQuery client and tool calls
│   │   ├── config.ts               # Connection config load/save and redaction
│   │   ├── schemas.ts              # Runtime validation for IPC payloads/results
│   │   └── result-normalizers.ts   # Convert MCP text payloads to Cate-safe DTOs
│   └── ipc/
│       └── flashquery.ts           # ipcMain handlers and workspace boundary checks
├── preload/
│   └── index.ts                    # Add grouped window.electronAPI.flashquery methods
├── shared/
│   ├── flashquery.ts               # Serializable DTOs, errors, status/result types
│   ├── ipc-channels.ts             # flashquery:* channel constants
│   ├── panels.ts                   # FlashQuery panel metadata
│   └── types.ts                    # Add 'flashquery' PanelType only
└── renderer/
    ├── panels/
    │   └── FlashQueryPanel.tsx     # Search/status/save UI
    ├── stores/
    │   └── flashqueryStore.ts      # Query/UI state if panel-local state is insufficient
    └── lib/
        └── flashqueryActions.ts    # Open result/save selection helpers
```

### Structure Rationale

- **`src/main/flashquery/`:** Keeps protocol, config, auth, timeout, and result parsing out of `src/main/index.ts`, which is already a concentration risk.
- **`src/main/ipc/flashquery.ts`:** Matches Cate's existing domain IPC module pattern and gives security reviewers one place to inspect renderer-originated FlashQuery actions.
- **`src/shared/flashquery.ts`:** Prevents leaking FlashQuery runtime classes, MCP SDK objects, or raw tool responses across process boundaries.
- **`src/renderer/panels/FlashQueryPanel.tsx`:** Fits Cate's panel model; FlashQuery becomes another workspace tool on the canvas/dock instead of a separate application shell.
- **`src/renderer/lib/flashqueryActions.ts`:** Keeps cross-panel behavior, such as opening vault documents or saving selected editor text, reusable without spreading FlashQuery switches across panels.

## Architectural Patterns

### Pattern 1: Narrow IPC Facade With Runtime Validation

**What:** Define explicit `flashquery:*` IPC channels and validate every payload in main before calling FlashQuery.
**When to use:** Every renderer-originated FlashQuery operation, especially config writes, saves, vault path opens, and agent context requests.
**Trade-offs:** Adds small schema boilerplate, but materially reduces the risk from Cate's already broad preload bridge.

**Example:**

```typescript
// shared/ipc-channels.ts
export const FLASHQUERY_SEARCH = 'flashquery:search'

// preload/index.ts
flashquerySearch(input: FlashQuerySearchInput): Promise<FlashQuerySearchResult> {
  return ipcRenderer.invoke(FLASHQUERY_SEARCH, input)
}

// main/ipc/flashquery.ts
ipcMain.handle(FLASHQUERY_SEARCH, async (event, raw) => {
  const input = FlashQuerySearchInputSchema.parse(raw)
  const workspace = requireKnownWorkspace(input.workspaceId)
  return flashqueryService.search(workspace, input)
})
```

### Pattern 2: Workspace-Scoped Connection Context

**What:** Resolve FlashQuery config from the active Cate workspace, then pass a normalized context object to the service.
**When to use:** Status checks, searches, saves, document opens, and agent context lookup.
**Trade-offs:** More config plumbing than a single global setting, but it preserves Cate's project/worktree model and lets different workspaces target different FlashQuery instances/vaults.

**Example:**

```typescript
type FlashQueryWorkspaceContext = {
  workspaceId: string
  workspaceRoot: string
  endpoint: string
  authTokenRef?: string
  vaultPath?: string
}
```

### Pattern 3: Explicit Agent Context Injection

**What:** Search or select FlashQuery context first, then inject it into a Pi agent prompt as an auditable user-visible context block.
**When to use:** Initial milestone agent augmentation.
**Trade-offs:** Less automatic than background retrieval-augmented generation, but it avoids surprising agent behavior and does not disturb `agentKey`, session files, or Pi RPC session routing.

**Example:**

```typescript
const prompt = [
  userPrompt,
  selectedContext.length > 0 ? formatFlashQueryContext(selectedContext) : '',
].filter(Boolean).join('\n\n')

await window.electronAPI.agentPrompt(agentKey, prompt)
```

### Pattern 4: Existing Panel Reuse For FlashQuery Artifacts

**What:** FlashQuery result actions create existing `editor`, `document`, or `browser` panels rather than bespoke viewers.
**When to use:** Opening vault markdown documents, local files, or documentation URLs returned by search.
**Trade-offs:** Reuse limits custom preview polish at first, but it preserves Cate's drag/dock/session behavior and avoids duplicating unsafe document rendering paths.

## Data Flow

### Request Flow

```
User searches in FlashQuery panel
    ↓
Renderer validates obvious UI state and calls window.electronAPI.flashquery.search
    ↓
Preload invokes flashquery:search with serializable input
    ↓
Main IPC validates input, resolves workspace, checks config/status
    ↓
FlashQuery service calls configured FlashQuery MCP/HTTP endpoint with timeout
    ↓
FlashQuery authenticates, runs tool handler, queries Supabase/vault
    ↓
Main normalizes text/JSON MCP response into safe result DTOs
    ↓
Renderer store/panel displays results and offers open/save/context actions
```

### State Management

```
Main workspace manager/config store
    ↓ (status/config IPC)
Renderer FlashQuery panel/store
    ↓ (user actions)
Main FlashQuery IPC/service
    ↓
FlashQuery runtime and user-owned data stores
```

### Key Data Flows

1. **Connection setup:** Renderer submits endpoint/token/vault preference for a workspace; main validates shape, persists redacted metadata and secret reference, then returns status. Do not write raw config from renderer to disk.
2. **Status check:** Renderer asks for workspace status; main performs a bounded health/tool-list check and returns `reachable`, `authenticated`, `schemaReady`, `vaultReady`, and user-actionable error codes.
3. **Search memories/documents:** Renderer sends query/filter/page options; main calls FlashQuery search tools and returns normalized results with IDs, titles, snippets, tags, timestamps, and optional safe local path metadata.
4. **Open result:** Renderer asks to open a result; main resolves/validates the vault path against configured vault/workspace grants; renderer creates an existing editor/document panel with the validated path.
5. **Save context:** Renderer sends explicit selected text, note, source panel metadata, and tags; main validates payload size and calls FlashQuery memory/document tools. The response includes created IDs and paths.
6. **Agent context:** Renderer builds a visible context attachment from selected search results or an explicit retrieval action, then sends it through the existing agent prompt path. Main-side agent sessions remain keyed by current `agentKey`.

## Suggested Build Order

| Order | Slice | Why First/Next | Main Deliverables |
|-------|-------|----------------|-------------------|
| 1 | Shared contracts and main service skeleton | Establishes security boundary before UI depends on it | `shared/flashquery.ts`, `flashquery:*` channels, schemas, service interface, mocked unit tests |
| 2 | Workspace-scoped config and status | Users need safe setup and diagnosis before search/save | Config load/save, redaction, status check, settings UI entry or panel setup state |
| 3 | Read/search panel | Lowest-risk useful workflow; no writes to vault/database from Cate | FlashQuery panel, search memories/documents, normalized results, error states |
| 4 | Open results in existing panels | Proves panel integration without new content renderers | Validated path resolution and editor/document panel creation |
| 5 | Explicit save flows | Adds write capability after read/status behavior is testable | Save selected text/agent output as memory or vault document with size/type validation |
| 6 | Agent context augmentation | Builds on search/save and preserves existing Pi runtime | User-approved context attachments into `AGENT_PROMPT`; no hidden background injection |
| 7 | Hardening and E2E | Cross-process integration needs regression protection | IPC validation tests, renderer tests, Electron smoke for setup/search/open/save |

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single local workspace | Main-process service with short-lived requests and renderer-local result state is enough |
| Many workspaces/panels | Add per-workspace status cache, request deduplication, cancellation, and result pagination |
| Large vaults/high query volume | Push search/ranking to FlashQuery; avoid Cate-side indexing; stream or page results and cap snippets |
| Multiple FlashQuery instances | Keep connection pools keyed by workspace id and endpoint; surface instance identity/status clearly |

### Scaling Priorities

1. **First bottleneck:** Long FlashQuery calls tying up perceived UI responsiveness. Fix with request timeouts, cancellation, loading states, and no first-paint registration dependency.
2. **Second bottleneck:** Large search result payloads bloating renderer/session state. Fix with pagination, result ids, snippets, and non-persistence of full result bodies.
3. **Third bottleneck:** Many workspace status probes. Fix with TTL caching and user-triggered refresh.

## Anti-Patterns

### Anti-Pattern 1: Calling FlashQuery Directly From Renderer

**What people do:** Fetch FlashQuery HTTP endpoints or spawn tools from React components.
**Why it's wrong:** It bypasses Cate's Electron security model, exposes tokens to compromised renderer code, and weakens path/workspace validation.
**Do this instead:** Route all FlashQuery operations through typed preload methods and main-process handlers.

### Anti-Pattern 2: Making Cate A Generic MCP Host In This Milestone

**What people do:** Build arbitrary MCP server discovery, arbitrary tool invocation, and generic tool UI.
**Why it's wrong:** The project scope is FlashQuery-specific, and a generic MCP host has a larger permission, auth, and UX problem.
**Do this instead:** Implement a FlashQuery-specific service with explicit operations for status, search, save, open, and context.

### Anti-Pattern 3: Hidden Automatic Agent Retrieval

**What people do:** Automatically inject FlashQuery search results into every agent turn.
**Why it's wrong:** It makes agent behavior hard to audit, may leak unrelated workspace knowledge, and risks confusing Pi session identity.
**Do this instead:** Start with explicit user-selected context attachments and visible retrieval actions.

### Anti-Pattern 4: Treating Vault Paths As Workspace Paths Without Validation

**What people do:** Open any local path returned by FlashQuery directly in an editor/document panel.
**Why it's wrong:** Cate already identifies filesystem trust boundaries as fragile; FlashQuery vaults may be outside the active workspace.
**Do this instead:** Validate paths through main, require configured vault roots or grants, and return safe open failures when trust is missing.

### Anti-Pattern 5: Duplicating FlashQuery Storage Or Scanner Logic

**What people do:** Reimplement memory indexing, document identity, vault scanning, schema checks, or plugin propagation in Cate.
**Why it's wrong:** FlashQuery owns these semantics; duplication will drift and can corrupt user data expectations.
**Do this instead:** Treat FlashQuery as the runtime/source of truth and display its results.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| FlashQuery MCP HTTP runtime | Main-process service client with bearer token support, timeout, and normalized DTOs | Preferred initial path because Cate can remain a desktop client without spawning FlashQuery |
| FlashQuery stdio runtime | Optional later adapter owned by main process | Only add if user workflows require Cate to launch/manage FlashQuery; never expose process handles to renderer |
| Supabase/Postgres | Indirect through FlashQuery only | Cate should not query FlashQuery tables directly; avoids schema coupling |
| Local vault | Indirect through FlashQuery for writes/search; direct open only after main validates configured vault path | Avoid symlink/path-grant mistakes and preserve FlashQuery document identity semantics |
| Pi agent runtime | Existing `AGENT_*` IPC path with explicit prompt/context augmentation | Do not replace AgentManager or session files |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Renderer FlashQuery panel to preload | `window.electronAPI.flashquery.*` | No raw Electron, Node, tokens, or filesystem access in renderer |
| Preload to main IPC | `flashquery:*` constants | Keep grouped and small; return structured `{ ok, data/error }` envelopes |
| Main IPC to FlashQuery service | Direct TypeScript calls with validated DTOs | IPC module handles event/window/workspace concerns; service handles protocol concerns |
| FlashQuery service to workspace manager | Read workspace root/id and config | Main remains source of truth for trusted workspace metadata |
| FlashQuery result to editor/document panel | Renderer panel creation after main path validation | Reuse existing panel registry and session mechanics |
| FlashQuery context to agent panel | Explicit renderer action into existing `AGENT_PROMPT` flow | Preserve `agentKey` and current session routing |

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Cate process and panel boundaries | HIGH | Verified from Cate planning architecture, structure, shared types, IPC channels, and preload implementation |
| FlashQuery runtime ownership | HIGH | Verified from FlashQuery architecture documentation: MCP server owns tools, storage, vault, config, auth, and scanner behavior |
| Recommended main/preload integration | HIGH | Matches Cate's existing IPC pattern and directly addresses documented security concerns |
| Agent integration sequencing | MEDIUM-HIGH | Existing agent architecture is clear, but exact Pi prompt/context affordances need implementation-level inspection during that phase |
| Credential storage details | MEDIUM | Cate has known auth storage concerns; final mechanism should be validated against current auth/store implementation during phase planning |

## Sources

- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/PROJECT.md`
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/ARCHITECTURE.md`
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/STRUCTURE.md`
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/CONCERNS.md`
- `/Users/matt/Documents/Claude/Projects/Cate/cate/src/shared/types.ts`
- `/Users/matt/Documents/Claude/Projects/Cate/cate/src/shared/ipc-channels.ts`
- `/Users/matt/Documents/Claude/Projects/Cate/cate/src/preload/index.ts`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/docs/ARCHITECTURE.md`
- `/Users/matt/.Codex/get-shit-done/templates/research-project/ARCHITECTURE.md`

---
*Architecture research for: Cate FlashQuery Integration*
*Researched: 2026-05-28*
