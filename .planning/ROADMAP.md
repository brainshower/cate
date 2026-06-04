# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-30) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Release Readiness + Provenance Closeout** — Phases 8-13 (shipped 2026-06-02) — [archive](milestones/v1.1-ROADMAP.md)
- 🔄 **v1.2 FlashQuery Milestone 2** — Phases 14-21 (active)

## Phases

<details>
<summary>✅ v1.0 Vault Connect, Read, Edit (Phases 1-7) — SHIPPED 2026-05-30</summary>

- [x] Phase 1: Foundation (3/3 plans) — completed 2026-05-29
- [x] Phase 2: Connection Layer (3/3 plans) — completed 2026-05-29
- [x] Phase 3: IPC Surface (3/3 plans) — completed 2026-05-29
- [x] Phase 4: Vault Panel + Shared Chip (4/4 plans) — completed 2026-05-29
- [x] Phase 5: Settings Dialog + Workspace Menu Entry (3/3 plans) — completed 2026-05-29
- [x] Phase 6: Editor URI-Awareness + Vault Badge (4/4 plans) — completed 2026-05-29
- [x] Phase 7: Cross-Cutting + Regression (3/3 plans) — completed 2026-05-30

Total: 7 phases, 23 plans, 61 tasks, 41/41 requirements. ~6,800 LOC added across 51 src/ files.

See archived roadmap for full phase details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Release Readiness + Provenance Closeout (Phases 8-13) — SHIPPED 2026-06-02</summary>

- [x] Phase 8: Upstream Sync to `v1.1.0` (6/6 plans) — completed 2026-06-01
- [x] Phase 9: Upstream Sync Mainline Handoff (3/3 plans) — completed 2026-06-01
- [x] Phase 10: Shared Contracts Audit (3/3 plans) — completed 2026-06-01
- [x] Phase 11: Renderer Behavior Audit (3/3 plans) — completed 2026-06-01
- [x] Phase 12: Upstream Value + Visual Evidence Audit (3/3 plans) — completed 2026-06-01
- [x] Phase 13: Release Readiness + Provenance Closeout (3/3 plans) — completed 2026-06-02

Total: 6 phases, 21 plans, 31 tasks, 26/26 upstream-sync requirements. This milestone merged upstream Cate `v1.1.0`, preserved FlashQuery behavior/security/E2E guarantees, completed post-handoff shared-contract/renderer/upstream-value/visual-evidence audits, added diagnostic lint/preflight policy, and archived release-readiness/provenance evidence.

See archived roadmap for full phase details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details open>
<summary>🔄 v1.2 FlashQuery Milestone 2 (Phases 14-21) — ACTIVE</summary>

Milestone goal: continue Cate's FlashQuery integration with richer vault editor controls, vault search, and Pi agent access to FlashQuery tools and document references.

Canonical source docs:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md`

### Phase 14: Shared FlashQuery Contracts and IPC

**Goal:** Establish widened FlashQuery document, search, and vault-index contracts across shared types, preload, main IPC, and client manager without breaking v1 body-only behavior.

**Requirements:** REQ-004

**Success criteria:**
1. `flashquery:getDocument` supports body/frontmatter include options and normalizes body/frontmatter/version responses.
2. `flashquery:writeDocument` accepts legacy string writes and object payload writes with validated body/frontmatter/tags fields.
3. `flashquery:search` and `flashquery:list-vault-index` contracts exist in channel constants, preload API, Electron API typings, and main handlers.
4. Search and vault-index validation covers modes, entity types, limits, empty semantic dispatch, disconnected state, and safe error responses.
5. Targeted coverage includes T-U-001, T-U-002, T-U-003, T-U-004, T-U-005, and T-U-006.

**Status:** Complete

### Phase 15: Editor Refresh and Frontmatter Panels

**Goal:** Add refresh and independent frontmatter editing to existing FlashQuery editor surfaces while preserving body editor conventions.

**Requirements:** REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007

**Success criteria:**
1. Clean body refresh preserves Monaco cursor/scroll view state and ignores repeated in-flight clicks.
2. Dirty refresh presents the required `Unsaved changes` modal with save/discard/cancel paths.
3. Disconnected, not-found, and request-failure refreshes preserve current content and dirty state.
4. Frontmatter opens as a separate `?part=frontmatter` YAML editor placed as a sibling dock or adjacent canvas panel.
5. Body and frontmatter editors keep independent dirty state, save errors, undo stacks, view state, and save payloads.
6. Invalid YAML blocks save and FlashQuery-managed fields are filtered before frontmatter writes.
7. Targeted coverage includes T-U-001, T-U-007, T-U-008, T-U-009, T-E-001, and T-E-002.

**Status:** Complete

### Phase 16: Vault Search Panel

**Goal:** Ship a dedicated FlashQuery Vault Search panel with grouped document/memory results and document action workflows.

**Requirements:** REQ-008, REQ-009, REQ-010, REQ-011, REQ-012

**Success criteria:**
1. `FlashQueryVaultSearchPanel` is registered through the existing panel registry with required header, connection chip, input, clear action, and Search button.
2. Search dispatch is explicit on button/Enter only; mode/filter changes do not auto-run; filesystem/mixed empty query uses list-all; semantic empty query is disabled with the required tooltip.
3. Results render Vault and Memories groups, idle/no-result/both-off states, case-insensitive highlighting, and show-more pagination.
4. Document rows support select, double-click open, native context menu, reveal, keyboard open, and canvas-open.
5. Memory rows support select and double-click read-only inspector without a formal context menu.
6. In-flight and disconnected search states disable duplicate dispatch and avoid presenting stale results as current.
7. Targeted coverage includes T-U-005, T-U-010, T-U-011, T-E-003, and T-E-007.

**Status:** In Progress

### Phase 17: FlashQuery Pi Extension Bootstrap

**Goal:** Install a bundled Cate FlashQuery Pi extension and register eligible FlashQuery tools with workspace-aware lifecycle handling.

**Requirements:** REQ-013, REQ-014

**Success criteria:**
1. `src/agent/extensions/cate-flashquery/` and `installFlashQueryExtension.ts` follow existing bundled extension patterns.
2. `AgentManager.create()` installs the FlashQuery extension without disrupting current extension installs.
3. Extension initialization receives Cate-provided workspace-scoped FlashQuery credentials without writing to Pi global `auth.json`.
4. Tool registration includes only `hostEligible: true` and `status: current` tools, including FlashQuery-native and brokered MCP tools.
5. Workspace switch reconnects the FlashQuery MCP client, refreshes registry/model/purpose metadata, unregisters stale tools, and leaves in-flight old-workspace calls to complete.
6. FlashQuery is absent from ProvidersView and is not registered as a Pi provider.
7. Targeted coverage includes T-U-013, T-U-014, T-U-015, T-E-005, and T-M-001.

**Status:** Complete

### Phase 18: `call_model`, `call_macro`, and Diagnostics Data

**Goal:** Implement FlashQuery model and macro tool behavior, trace metadata, progress handling, and diagnostics capture for Pi tool events.

**Requirements:** REQ-015, REQ-016

**Plans:** 3 plans

Plans:
- [x] 18-01-PLAN.md — Specialize `call_model` descriptions, trace IDs, refs, and diagnostics.
- [ ] 18-02-PLAN.md — Specialize `call_macro` confirmation, defaults, progress, and result handling.
- [ ] 18-03-PLAN.md — Preserve diagnostics in agent state/session replay and record mocked/manual evidence.

**Success criteria:**
1. `call_model` descriptions use discovered purposes/models or `Available purposes: loading...`, then update after discovery.
2. `call_model` sends `return_messages: true`, mints/reuses the required trace ID format, hydrates refs, and blocks unresolved refs with the exact system message.
3. `call_model` in-flight rendering uses Pi's standard tool-in-flight indicator only and does not fabricate progress.
4. `call_macro` applies source/source_ref confirmation rules, defaults `interactive: true` and `progress: 'milestones'`, filters `notifications/progress` by progress token, and returns disconnected errors.
5. Live macro progress shows spinner plus the latest progress message only; completed trace details are preserved from the result envelope.
6. Agent store events preserve structured FlashQuery details without breaking standard text extraction or existing subagent details.
7. Targeted coverage includes T-U-016, T-U-017, T-U-018, T-E-006, T-M-002, and T-M-003.

**Status:** Pending

### Phase 19: Pi ToolCard Observability Rendering

**Goal:** Render FlashQuery tool diagnostics through existing Pi ToolCards, with richer details for `call_model` and `call_macro`.

**Requirements:** REQ-017

**Success criteria:**
1. No new chat message type or standalone FlashQuery chat chrome is introduced.
2. `call_model` collapsed summaries use the required resolver/name/iteration/FQ-call/tokens/cost/latency format when data is available.
3. `call_model` expanded view includes resolution chain, injected refs, server-side tool loop, cost, template params, and collapsible messages payload.
4. `call_macro` expanded view renders completed trace arrays as structured step tables.
5. Other FlashQuery tools continue to use standard ToolCard rendering.
6. Missing or partial diagnostics degrade gracefully without layout breakage.
7. Targeted coverage includes T-U-019, T-E-006, and T-M-003.

**Status:** Pending

### Phase 20: Pi `@` Mentions and Clipboard Utilities

**Goal:** Add literal FlashQuery document reference autocomplete and whole-document path/reference copy actions across vault surfaces.

**Requirements:** REQ-018, REQ-019

**Success criteria:**
1. Agent chat input detects active `@` segments near the existing slash popover pattern and shows the dropdown through the existing portal pattern.
2. Vault-index cache populates on workspace connect/switch/reconnect and refreshes after vault tree refresh, successful document writes, and extension-dispatched mutating document tools.
3. Cache clears on disconnect, uses whole-response replacement, and handles concurrent refreshes with last-fetch-wins behavior.
4. Autocomplete filters filename-only case-insensitively, sorts by full path, supports keyboard accept/dismiss behavior, inserts literal `{{ref:<fullPath>}}`, and keeps no-match literal `@` behavior.
5. No new chat footer buttons/pills or rich-input chips are added.
6. Vault tree, search rows, and FlashQuery editor title actions copy forward-slash vault paths and whole-document references only.
7. Targeted coverage includes T-U-006, T-U-011, T-U-012, T-U-020, T-E-004, and T-M-004.

**Status:** Pending

### Phase 21: Cross-Surface Hardening and Regression

**Goal:** Prove Milestone 2 behavior across disconnected, reconnecting, workspace-switch, stale-cache, in-flight, visual, and regression scenarios.

**Requirements:** REQ-020

**Success criteria:**
1. Refresh, frontmatter save, search, `@` cache loading, clipboard reference actions, and Pi extension tools fail visibly rather than silently when FlashQuery is disconnected.
2. Reconnect refreshes connection-scoped caches and re-enables affected controls.
3. Workspace switch clears stale workspace data before loading new workspace data and discards superseded in-flight cache responses.
4. FlashQuery errors surface as inline UI errors or Pi tool/system messages appropriate to the surface.
5. E2E fixtures cover frontmatter, search, vault index, disconnect, and write payload assertions.
6. Milestone UI polish is checked against the Milestone 2 UI Spec where applicable.
7. Final verification runs targeted suites, `npm run typecheck`, and `npm run preflight` where practical, with skipped portions explicitly recorded.

**Status:** Pending

**Coverage:** 8 phases, 20/20 requirements mapped.

</details>

## Current Status

Active milestone: v1.2 FlashQuery Milestone 2. Phase 17 is complete and ready for verification; next implementation phase is Phase 18.

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- v1.1 canonical upstream-sync requirements and test-plan evidence are archived in [milestones/v1.1-REQUIREMENTS.md](milestones/v1.1-REQUIREMENTS.md), [milestones/v1.1-MILESTONE-AUDIT.md](milestones/v1.1-MILESTONE-AUDIT.md), and [milestones/v1.1-phases/](milestones/v1.1-phases/).
- v1.2 preserves product `REQ-###` IDs from the Milestone 2 requirements document so supplied test IDs remain directly traceable.
