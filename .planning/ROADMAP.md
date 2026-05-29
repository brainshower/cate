# Roadmap: v1.0 Vault Connect, Read, Edit

**Milestone:** v1.0 Vault Connect, Read, Edit
**Created:** 2026-05-28
**Status:** In progress

## Milestone Goal

Prove a Cate workspace can connect to a separately-running FlashQuery HTTP MCP server, browse its vault, open an existing markdown document in Cate's editor, edit it, and save it back.

## Phase Overview

| Phase | Name | Depends On | Key REQs | Test Plan Refs |
|-------|------|------------|----------|----------------|
| 1 | Foundation | None | REQ-001, REQ-002, REQ-003, REQ-013 | Test Plan §4.1 |
| 2 | Connection layer | 3/3 | Complete   | 2026-05-29 |
| 3 | IPC surface | 3/3 | Complete   | 2026-05-29 |
| 4 | Vault panel + shared chip | 2/4 | In Progress|  |
| 5 | Settings dialog + workspace menu entry | Phase 3 | REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039 | Test Plan §4.5 |
| 6 | Editor URI-awareness + vault badge | Phase 3 + Phase 4 | REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-041, REQ-042 | Test Plan §4.6 |
| 7 | Cross-cutting + regression | All | REQ-043, REQ-044, REQ-045 | Test Plan §4.7 |

## Phase 1: Foundation ✅ Complete

**Goal:** Establish the data, credential, URI, and manager skeleton needed before any FlashQuery network behavior lands.

**Requirements:** REQ-001, REQ-002, REQ-003, REQ-013
**Tests:** T-U-001..020
**Completed:** 2026-05-29

**Success criteria:**

- Workspace connection metadata is optional, persists, restores, and tolerates malformed stored values.
- Bearer-token helper functions round-trip, clear, isolate by workspace, and surface write failures.
- `FlashQueryClientManager` constructs without eager connections and can dispose workspace state.
- `flashquery://` URI helpers satisfy the round-trip invariant for special characters and folder separators.

**Plans:**

- [x] **1.1 Workspace connection model.** Add connection types/schema to workspace shared types and persistence handling.
- [x] **1.2 Credential abstraction.** Implement main-process token get/set/clear helpers and redaction-safe tests.
- [x] **1.3 URI helpers and manager skeleton.** Add vault URI helpers plus the initial manager lifecycle and subscribe/unsubscribe shell.

## Phase 2: Connection Layer

**Goal:** Wire the manager to FlashQuery's HTTP MCP readiness surface with robust status transitions and retry behavior.

**Requirements:** REQ-004, REQ-005, REQ-006, REQ-011
**Tests:** T-U-021..039

**Success criteria:**

- First connection probes `GET /mcp/info`, omitting bearer auth from the probe request.
- Successful probes transition to `live` and capture version/instance metadata.
- Failures transition to `disconnected` with error context and schedule exponential backoff.
- Manual retry clears backoff, immediately probes, and broadcasts status transitions to subscribers.

**Plans:** 3/3 plans complete

- [x] `02-01-PLAN.md` — Probe transport: implement the HTTP probe path and response/error classification.
- [x] `02-02-PLAN.md` — State machine and retry: implement connection states, exponential backoff, manual retry, and disposal cleanup.
- [x] `02-03-PLAN.md` — Subscription events: finalize status event production and cross-workspace subscriber isolation.

## Phase 3: IPC Surface

**Goal:** Expose the narrow typed renderer-to-main FlashQuery API that UI and editor work can safely consume.

**Requirements:** REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012
**Tests:** T-U-040..050, T-I-001..014, T-U-099..101

**Success criteria:**

- `flashquery:setConnection` validates, persists/clears config, stores/clears token, and disposes stale clients.
- `flashquery:listVault`, `flashquery:getDocument`, and `flashquery:writeDocument` marshal calls through the manager with safe return shapes.
- Write calls use update-only semantics and never include frontmatter, tags, title, expected-version, or create mode.
- Status broadcasts reach renderer windows with the expected payload.

**Plans:**

- [ ] **3.1 IPC channel contract.** Add shared channel names, preload API types, runtime validation, and registration.
- [ ] **3.2 Connection and probe handlers.** Implement set/clear connection and test-probe handler behavior.
- [ ] **3.3 Vault list/read/write handlers.** Implement vault browse, body-only read, update-only write, and broadcast integration tests.

## Phase 4: Vault Panel + Shared Chip

**Goal:** Give users a dedicated FlashQuery vault panel that matches Cate's file-tree behavior and introduces the reusable status chip.

**Requirements:** REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-024, REQ-025, REQ-026, REQ-040
**Tests:** T-U-051..054, T-I-015..049, T-U-102..103

**Success criteria:**

- `flashqueryVault` is registered in shared panel definitions, renderer registry, and app-store panel creation.
- The chip renders connecting/live/disconnected/unknown states and only disconnected retry is actionable.
- The vault panel renders all five product states with the specified empty, connecting, disconnected, empty-vault, and populated behavior.
- Document-row interactions match local file-tree conventions and never expose create-new-document affordances.

**Plans:** 2/4 plans executed

- [x] `04-01-PLAN.md` — Shared chip primitive and React Testing Library setup.
- [ ] `04-02-PLAN.md` — Panel registration and app-store factory.
- [x] `04-03-PLAN.md` — Narrow renderer hooks for manual retry and future settings dialog open state.
- [ ] `04-04-PLAN.md` — FlashQueryVaultPanel header, five states, lazy tree, row/context-menu behavior, refresh, and tests.

## Phase 5: Settings Dialog + Workspace Menu Entry

**Goal:** Let users configure, test, save, and remove a workspace's FlashQuery connection from Cate UI.

**Requirements:** REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039
**Tests:** T-U-055, T-I-050..078, T-U-104

**Success criteria:**

- `FlashQueryConnectionDialog` supports first-time setup and edit mode with URL/token fields.
- Test connection probes current form values without persisting them.
- Save, cancel, and remove flows update state only through the IPC surface.
- Workspace context menu contains the FlashQuery Connection entry in the specified position and opens the dialog.

**Plans:**

- [ ] **5.1 Dialog state and shell.** Add UI-store visibility state and modal scaffolding.
- [ ] **5.2 Form behavior.** Implement URL/token fields, reveal toggle, validation, prepopulation, probe, save, cancel, and remove flows.
- [ ] **5.3 Workspace menu wiring.** Add the context-menu item and tests for position, action, and native-menu behavior.

## Phase 6: Editor URI-Awareness + Vault Badge

**Goal:** Extend the existing editor so vault documents behave like editable documents while preserving local-file behavior.

**Requirements:** REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-041, REQ-042
**Tests:** T-I-079..098

**Success criteria:**

- Mounting a `flashquery://` editor reads via FlashQuery while local files still read via filesystem APIs.
- Saving a vault editor writes through FlashQuery, clears dirty state on success, and leaves dirty state on failure.
- Vault URIs do not trigger local Git diff behavior or local path assumptions.
- Vault badge reuses the shared chip primitive and tooltip shows the full vault-relative path.

**Plans:**

- [ ] **6.1 Editor URI routing.** Add URI detection, read routing, Monaco model cache behavior, and local-file regression tests.
- [ ] **6.2 Save and dirty-state behavior.** Route vault saves to FlashQuery, handle failure states, and preserve local-save behavior.
- [ ] **6.3 Badge and guardrails.** Add vault badge/tooltip, disable vault diff mode, verify body-only/no-conflict semantics.

## Phase 7: Cross-Cutting + Regression

**Goal:** Prove the full v1 workflow, restart behavior, existing Cate panel health, and UI design discipline.

**Requirements:** REQ-043, REQ-044, REQ-045
**Tests:** T-E-001..011, T-M-001..007

**Success criteria:**

- Existing Electron smoke and drag/panel E2E tests pass unchanged.
- Connection persists across Cate restart and does not eagerly probe before first use.
- End-to-end happy path covers configure, browse, open, edit, save, open-on-canvas, disconnect, and retry behavior against a stubbed FlashQuery server.
- Manual/design checks confirm vault panel, chip, dialog, workspace menu, and editor badge match the UI spec and Cate design tokens.

**Plans:**

- [ ] **7.1 Existing E2E regression.** Run and preserve existing smoke/drag/panel coverage.
- [ ] **7.2 FlashQuery E2E harness.** Add stubbed FlashQuery server coverage for happy path, restart, browsing, open-on-canvas, disconnect, and retry.
- [ ] **7.3 Design and release checks.** Complete manual visual/design-token checklist and final milestone verification.

## Notes

- Roadmap phases exist only because the project owner explicitly created milestone v1.0.
- REQ-020 through REQ-023 are intentionally reserved/vacant in the source product docs.
- Phase 4 includes a product-doc human-review note around creating `src/renderer/components/` if Cate does not already have it.
