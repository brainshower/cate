# Roadmap: Cate FlashQuery Integration

## Overview

This roadmap adds FlashQuery to Cate as a workspace-aware local-first knowledge workflow, not as a replacement for Cate's existing IDE or Pi agent runtime. The build starts with the security and connection boundary, proves read-only retrieval and safe document opening, adds explicit durable capture, then attaches selected FlashQuery context to agent chats with visible provenance. The final phase hardens the workflow with tests, native entry points, and performance/reliability checks.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Connection Boundary And Health** - Workspace-scoped config, main-process FlashQuery service, token handling, validation, and status UI
- [ ] **Phase 2: Search, Fetch, And Safe Open** - Read-only memory/document retrieval with safe previews and vault document opening
- [ ] **Phase 3: Explicit Capture To Memory And Documents** - User-confirmed save flows for memories and vault documents
- [ ] **Phase 4: Auditable Agent Context Attachment** - Visible FlashQuery context packets for specific Pi agent chats
- [ ] **Phase 5: Native Workflow Polish And Hardening** - Tests, command palette hooks, reliability checks, and product polish

## Phase Details

### Phase 1: Connection Boundary And Health
**Goal**: Cate can store, validate, and diagnose a workspace-scoped FlashQuery connection without weakening the renderer/main security boundary.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: [FQCFG-01, FQCFG-02, FQCFG-03, FQCFG-04, FQCFG-05, FQSEC-01, FQSEC-02, FQSEC-03]
**Success Criteria** (what must be TRUE):
  1. User can configure and clear a FlashQuery HTTP endpoint for one workspace without editing project files.
  2. User can provide authentication material and renderer-visible state never contains raw tokens or secrets.
  3. User can refresh status and see reachable/authenticated/ready/degraded/offline classifications with actionable error messages.
  4. Cate launches and restores workspaces normally when FlashQuery is absent, offline, or misconfigured.
  5. All new FlashQuery IPC payloads are runtime validated and sensitive values are redacted in returned errors/log paths.
**Plans**: 3 plans

Plans:
- [ ] 01-01: Define shared FlashQuery contracts, IPC channels, preload facade, and workspace config storage.
- [ ] 01-02: Implement main-process FlashQuery service skeleton with endpoint validation, auth/token handling, health/tool discovery, timeout, and redaction behavior.
- [ ] 01-03: Add workspace settings/status UI and focused tests for config validation, status classification, startup resilience, and redaction.

### Phase 2: Search, Fetch, And Safe Open
**Goal**: User can retrieve FlashQuery memories/documents from Cate, inspect results safely, and open allowed vault documents in existing panels.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: [FQRET-01, FQRET-02, FQRET-03, FQRET-04, FQRET-05, FQRET-06, FQRET-07]
**Success Criteria** (what must be TRUE):
  1. User can search FlashQuery memories and documents from a Cate surface with bounded result counts and loading/error states.
  2. User can inspect exact memory/document content as escaped/plain safe preview content.
  3. Search result rows show useful provenance including type, ID or path, tags, and modified/source metadata when available.
  4. User can open allowed vault markdown/document results in existing Cate panels.
  5. Cate blocks or asks for a grant before opening vault paths outside trusted roots, and stale/canceled search responses cannot overwrite newer results.
**Plans**: 3 plans

Plans:
- [ ] 02-01: Implement read-only MCP tool wrappers and result normalization for memory/document search and fetch.
- [ ] 02-02: Build FlashQuery search UI with filters, provenance, previews, cancellation, and structured empty/error states.
- [ ] 02-03: Wire safe document-open behavior through existing Cate panel creation and path/grant validation.

### Phase 3: Explicit Capture To Memory And Documents
**Goal**: User can intentionally save selected or manually entered workspace context into FlashQuery with preview, provenance, and reliable outcomes.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: [FQSAVE-01, FQSAVE-02, FQSAVE-03, FQSAVE-04, FQSAVE-05]
**Success Criteria** (what must be TRUE):
  1. User can save manual text or a selected snippet as a FlashQuery memory after reviewing a confirmation preview.
  2. User can create a new FlashQuery vault document from manual text, selected text, or selected agent output after reviewing title/tags/source metadata.
  3. Save results clearly distinguish success, duplicate/conflict, validation failure, auth/network failure, and partial failure.
  4. Failed or retried saves do not create hidden duplicate writes.
  5. Cate delegates identity, frontmatter, scanner, schema, and database behavior to FlashQuery instead of editing those directly.
**Plans**: 3 plans

Plans:
- [ ] 03-01: Add capture-source DTOs and payload builders for manual notes, selected text snippets, and selected agent output.
- [ ] 03-02: Build memory/document save confirmation UI with editable metadata and explicit cancel/submit paths.
- [ ] 03-03: Implement write tool wrappers, outcome normalization, conflict/partial-failure messaging, and save-flow tests.

### Phase 4: Auditable Agent Context Attachment
**Goal**: User can attach selected FlashQuery context to a specific Cate Pi agent chat with visible provenance and correct workspace/session routing.
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: [FQAGENT-01, FQAGENT-02, FQAGENT-03, FQAGENT-04, FQAGENT-05]
**Success Criteria** (what must be TRUE):
  1. User can select FlashQuery memory/document results and attach them to a specific live Pi agent chat.
  2. The agent UI shows attached context with source ID/path/tags before or as it is sent.
  3. Context is routed by workspace and live `agentKey`, not by global state or session filename alone.
  4. User can remove or decline context before it affects an agent request.
  5. Restored sessions show prior context provenance when relevant but never silently reinject stale context into a new run.
**Plans**: 3 plans

Plans:
- [ ] 04-01: Map the existing Pi agent prompt/session flow and add a minimal context packet model keyed by workspace and `agentKey`.
- [ ] 04-02: Build agent UI affordances for selecting, previewing, attaching, and removing FlashQuery context.
- [ ] 04-03: Wire context packet delivery into agent requests and add multi-agent/workspace restore tests.

### Phase 5: Native Workflow Polish And Hardening
**Goal**: FlashQuery feels native in Cate and has enough automated coverage to support future implementation phases safely.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: [FQSEC-04, FQSEC-05]
**Success Criteria** (what must be TRUE):
  1. Unit tests cover config validation, auth redaction, status classification, result normalization, stale-result handling, and save payload construction.
  2. Renderer or E2E tests cover configure/status, search/open, save confirmation, and agent context attachment happy paths.
  3. Command palette or equivalent native entry points exist for the core FlashQuery workflows that already shipped.
  4. Search/fetch/save operations have measured or tested timeout/cancellation behavior and do not block core workspace/terminal startup flows.
  5. Documentation or in-app copy clearly distinguishes Cate's FlashQuery client role from FlashQuery setup/repair/runtime ownership.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Expand automated unit, renderer, and Electron smoke coverage around the completed FlashQuery workflows.
- [ ] 05-02: Add command palette/native entry points, final UX polish, and documentation guardrails.

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Connection Boundary And Health | 0/3 | Not started | - |
| 2. Search, Fetch, And Safe Open | 0/3 | Not started | - |
| 3. Explicit Capture To Memory And Documents | 0/3 | Not started | - |
| 4. Auditable Agent Context Attachment | 0/3 | Not started | - |
| 5. Native Workflow Polish And Hardening | 0/2 | Not started | - |
