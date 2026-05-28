# Requirements: Cate FlashQuery Integration

**Defined:** 2026-05-28
**Core Value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.

## v1 Requirements

Requirements for the initial FlashQuery integration milestone. Each maps to roadmap phases.

### Configuration And Health

- [ ] **FQCFG-01**: User can configure a FlashQuery HTTP endpoint for a specific Cate workspace.
- [ ] **FQCFG-02**: User can provide, update, and remove FlashQuery authentication material without exposing raw secrets to renderer state or logs.
- [ ] **FQCFG-03**: User can view a workspace-scoped FlashQuery status showing reachable, authenticated, ready, degraded, or offline states.
- [ ] **FQCFG-04**: User sees actionable diagnostics for invalid endpoint, unsupported protocol, auth failure, token expiry, missing tool surface, schema/readiness failure, timeout, and offline server.
- [ ] **FQCFG-05**: Cate starts and restores workspaces normally when FlashQuery is unconfigured, offline, or misconfigured.

### Retrieval And Opening

- [ ] **FQRET-01**: User can search FlashQuery memories from Cate with query text and basic filters.
- [ ] **FQRET-02**: User can search FlashQuery vault documents from Cate with query text and basic filters.
- [ ] **FQRET-03**: User can inspect exact memory or document results after search without unsafe HTML rendering.
- [ ] **FQRET-04**: Search results show provenance metadata such as result type, ID or path, tags, modified time when available, and source action.
- [ ] **FQRET-05**: User can open an allowed FlashQuery vault document result in Cate's existing editor or document panel.
- [ ] **FQRET-06**: Cate blocks or asks for an explicit grant before opening vault document paths outside the trusted workspace roots.
- [ ] **FQRET-07**: Search and fetch requests have bounded result counts, timeouts, cancellation or stale-result protection, and structured error states.

### Capture To FlashQuery

- [ ] **FQSAVE-01**: User can save manually entered text or a selected text snippet to FlashQuery as a memory.
- [ ] **FQSAVE-02**: User can create a new FlashQuery vault document from manually entered text, a selected snippet, or selected agent output.
- [ ] **FQSAVE-03**: Save flows show a confirmation preview with destination, source metadata, editable title/tags where relevant, and the exact content to be written.
- [ ] **FQSAVE-04**: Save flows surface success, duplicate/conflict, partial failure, validation failure, and retryable network/auth errors without creating hidden duplicate writes.
- [ ] **FQSAVE-05**: Cate does not directly edit FlashQuery frontmatter IDs, database rows, scanner state, or migration state.

### Agent Context

- [ ] **FQAGENT-01**: User can attach selected FlashQuery memory or document context to a specific Cate Pi agent chat.
- [ ] **FQAGENT-02**: Attached context is visible in the agent UI with provenance before or when it is sent to the agent.
- [ ] **FQAGENT-03**: Agent context routing is scoped by workspace and live agent key, not by global state alone.
- [ ] **FQAGENT-04**: User can remove or decline FlashQuery context before it affects an agent request.
- [ ] **FQAGENT-05**: Restored sessions do not silently reinject stale FlashQuery context into new agent runs.

### Security And Reliability

- [ ] **FQSEC-01**: All renderer-originated FlashQuery IPC payloads are runtime-validated before main-process work begins.
- [ ] **FQSEC-02**: Renderer-visible errors and logs redact tokens, raw auth secrets, database URLs, and sensitive headers.
- [ ] **FQSEC-03**: FlashQuery networking, token refresh, search, fetch, and save operations run through main-process services instead of renderer-side direct calls.
- [ ] **FQSEC-04**: FlashQuery integration has unit tests for config validation, auth redaction, status classification, result normalization, stale-result handling, and save payload construction.
- [ ] **FQSEC-05**: FlashQuery integration has renderer or E2E coverage for configure/status, search/open, save confirmation, and agent context attachment happy paths.

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Workflow Polish

- **FQPOL-01**: User can run FlashQuery actions from Cate's command palette.
- **FQPOL-02**: User can pin FlashQuery result cards onto the spatial canvas.
- **FQPOL-03**: User can browse the FlashQuery vault by directory using FlashQuery vault-listing tools.
- **FQPOL-04**: User can review a context packet history per agent chat.
- **FQPOL-05**: User can save from panel-specific adapters for terminal output, editor selections, browser notes, Git diffs, and document panels.

### Advanced FlashQuery Surfaces

- **FQADV-01**: User can apply or edit tags for existing FlashQuery memories and documents from Cate.
- **FQADV-02**: User can use plugin-specific FlashQuery record workflows once a concrete plugin use case exists.
- **FQADV-03**: User can run FlashQuery maintenance diagnostics with guidance that delegates repair to FlashQuery.
- **FQADV-04**: User can optionally use FlashQuery `call_model` for explicit non-Pi delegated workflows.
- **FQADV-05**: User can receive automatic context suggestions based on active workspace state, with explicit approval before attachment.

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| General MCP host for arbitrary servers | Expands auth, permissions, lifecycle, and tool approval beyond the FlashQuery-specific milestone. |
| Cate-owned FlashQuery setup, migrations, scanner, repair, or database access | FlashQuery owns runtime, schema, storage, and vault identity semantics. |
| Replacing Cate's Pi agent runtime with FlashQuery `call_model` | Cate already has provider auth, sessions, tools, and UI built around Pi; replacement is a separate product rewrite. |
| Silent automatic memory writes | Creates noisy memories, privacy surprises, and unreviewable durable state. |
| Silent automatic agent context injection | Makes agent behavior hard to audit and can route stale/wrong context into sessions. |
| Obsidian-style vault editor rebuild | Existing Cate editor/document panels are enough for v1; graph/backlink/editor ecosystems are outside scope. |
| Bulk destructive archive/remove/copy/move UI | High-trust destructive workflows should wait until read/search/save primitives are proven. |
| Generic plugin record CRUD UI | Relational plugin records need concrete plugin-specific workflows before a Cate surface. |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FQCFG-01 | Phase 1 | Pending |
| FQCFG-02 | Phase 1 | Pending |
| FQCFG-03 | Phase 1 | Pending |
| FQCFG-04 | Phase 1 | Pending |
| FQCFG-05 | Phase 1 | Pending |
| FQSEC-01 | Phase 1 | Pending |
| FQSEC-02 | Phase 1 | Pending |
| FQSEC-03 | Phase 1 | Pending |
| FQRET-01 | Phase 2 | Pending |
| FQRET-02 | Phase 2 | Pending |
| FQRET-03 | Phase 2 | Pending |
| FQRET-04 | Phase 2 | Pending |
| FQRET-05 | Phase 2 | Pending |
| FQRET-06 | Phase 2 | Pending |
| FQRET-07 | Phase 2 | Pending |
| FQSAVE-01 | Phase 3 | Pending |
| FQSAVE-02 | Phase 3 | Pending |
| FQSAVE-03 | Phase 3 | Pending |
| FQSAVE-04 | Phase 3 | Pending |
| FQSAVE-05 | Phase 3 | Pending |
| FQAGENT-01 | Phase 4 | Pending |
| FQAGENT-02 | Phase 4 | Pending |
| FQAGENT-03 | Phase 4 | Pending |
| FQAGENT-04 | Phase 4 | Pending |
| FQAGENT-05 | Phase 4 | Pending |
| FQSEC-04 | Phase 5 | Pending |
| FQSEC-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-05-28*
*Last updated: 2026-05-28 after initial definition*
