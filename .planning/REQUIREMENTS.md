# Requirements: Cate FlashQuery Integration v1 - Vault Connect, Read, Edit

**Defined:** 2026-05-28
**Milestone:** v1.0 Vault Connect, Read, Edit
**Status:** Approved for milestone planning

## Source Documents

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — UI Spec.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Vault Connect, Read, Edit.md`

## Core Value

Cate should let a developer connect a workspace to FlashQuery, browse the FlashQuery vault, open an existing markdown document in Cate's editor, edit it, and save it back, without making Cate responsible for FlashQuery setup, storage, schema, or runtime ownership.

## Milestone Requirements

### Connection Foundation

- [ ] **REQ-001: Workspace connection schema.** `WorkspaceInfo` supports optional workspace-scoped `flashqueryConnection` metadata for HTTP transport, URL, and bearer auth type without requiring every workspace to be configured.
- [ ] **REQ-002: Bearer-token storage abstraction.** Main-process helpers store, retrieve, and clear per-workspace bearer tokens without exposing raw secrets to renderer state or logs.
- [ ] **REQ-003: FlashQueryClientManager lifecycle.** A main-process manager owns per-workspace clients, lazily constructs clients on first use, disposes clients when workspaces/configs change, and supports subscription cleanup.
- [ ] **REQ-004: Connection probe via `GET /mcp/info`.** The manager probes `<url>/mcp/info`, extracts version and instance ID on success, and captures failures for status reporting.
- [x] **REQ-005: Reconnection strategy.** Failed probes or transport disconnects transition through `connecting`, `live`, and `disconnected` states with exponential-backoff retry and manual retry support.
- [x] **REQ-006: Generic subscribe interface.** The manager exposes workspace-scoped event subscriptions, initially for status and shaped to allow future vault-change events.

### IPC Surface

- [ ] **REQ-007: `flashquery:setConnection` IPC.** Renderer can set or clear a workspace connection through typed IPC that validates URL/transport, persists metadata, stores/clears tokens, disposes prior clients, and broadcasts status.
- [ ] **REQ-008: `flashquery:listVault` IPC.** Renderer can list root or folder entries as `{ name, type, vaultPath, title? }`; disconnected/unconfigured workspaces return an empty array without throwing.
- [ ] **REQ-009: `flashquery:getDocument` IPC.** Renderer can fetch an existing vault document body by vault path; the call requests body-only content and returns body plus metadata needed by the editor.
- [ ] **REQ-010: `flashquery:writeDocument` IPC.** Renderer can update an existing vault document body; writes use update mode only and return structured success/failure.
- [x] **REQ-011: `flashquery:status` broadcast.** Manager status transitions are broadcast to renderer windows with workspace ID, status, and error text when disconnected.

### Vault URI Contract

- [ ] **REQ-012: Vault URI shape.** Vault-backed editor documents use `flashquery://<workspaceId>/<vault-path>` as the canonical URI shape.
- [ ] **REQ-013: URI helpers and round-trip invariant.** Shared helpers build and parse vault URIs, preserve folder separators, round-trip special characters, and return null for non-FlashQuery URIs.

### Vault Panel And Shared Chip

- [x] **REQ-014: Panel type registration.** Cate registers a `flashqueryVault` panel definition, renderer registry entry, and app-store factory.
- [x] **REQ-015: Panel header chrome.** The vault panel header shows FlashQuery Vault identity, host context, refresh affordance, and the connection-status chip.
- [x] **REQ-016: Vault tree rendering.** The panel renders folder and document rows from `flashquery:listVault`, with lazy folder expansion and local expansion state.
- [x] **REQ-017: Vault row interactions.** Document-row click, double-click, right-click, open, open-on-canvas, and multi-select behavior match Cate's local file-tree conventions.
- [x] **REQ-018: Refresh action.** Refresh reloads the root vault listing, preserves valid expansion/selection state, indicates loading, and does not close open editors.
- [x] **REQ-019: Panel states.** The panel renders populated, no-connection, connecting, disconnected, and empty-vault states with the product-specified actions.
- [ ] **REQ-024: Three-state chip with extensible prop API.** A reusable chip represents connecting, live, disconnected, and unknown/future states.
- [ ] **REQ-025: Chip interaction.** The disconnected chip supports manual retry and surfaces useful hover/error information; live/connecting states are non-retry actions.
- [ ] **REQ-026: Shared chip primitive location.** The chip lives in a reusable renderer component location for the vault panel and editor badge.

### Editor URI-Awareness

- [ ] **REQ-027: Editor recognizes `flashquery://` scheme.** `EditorPanel` identifies vault URIs without confusing them with local file paths.
- [ ] **REQ-028: Read routing by URI scheme.** Vault editors read via `flashquery:getDocument`; local-file editor behavior remains unchanged.
- [ ] **REQ-029: Save routing by URI scheme.** Saving a vault editor writes through `flashquery:writeDocument`; local-file save behavior remains unchanged.
- [ ] **REQ-030: Git diff mode gated off for vault URIs.** Vault editors never attempt local Git diff path logic.
- [ ] **REQ-031: Unsaved-buffer model matches Cate's local-file convention.** Vault documents use the same dirty/confirm-close model, but unsaved vault body content is not persisted into workspace session state.
- [ ] **REQ-032: Vault badge in editor title bar.** Vault editors show a reusable chip-style badge with host context.
- [ ] **REQ-033: Vault badge hover tooltip.** The badge tooltip shows the full vault-relative path and enough context to identify the source.

### Settings Dialog And Workspace Menu

- [x] **REQ-034: `FlashQueryConnectionDialog` component.** A modal dialog manages first-time setup and edit mode for a workspace connection.
- [x] **REQ-035: Dialog input fields.** The dialog includes URL and bearer-token inputs with validation, reveal/hide behavior, helper text, and prepopulation in edit mode.
- [x] **REQ-036: Test-connection inline action.** The dialog can probe the currently-entered URL/token without persisting them and show success/failure inline.
- [x] **REQ-037: Dialog save, cancel, and remove behavior.** Save validates and persists, cancel closes without writes, and remove clears config/token after confirmation.
- [x] **REQ-038: `useUIStore` slice for dialog visibility.** Renderer UI state can open/close the FlashQuery connection dialog predictably.
- [x] **REQ-039: Workspace context menu addition.** Workspace context menu includes a FlashQuery Connection entry in the product-specified position.

### Guardrails And Cross-Cutting Requirements

- [x] **REQ-040: No vault doc creation.** v1 exposes no create-new-vault-document affordance and never calls FlashQuery write APIs in create mode.
- [ ] **REQ-041: Frontmatter not exposed.** Reads and writes operate on document body only; frontmatter, headings, tags, and title editing stay outside v1.
- [ ] **REQ-042: No conflict detection.** v1 does not send expected-version/if-match data and uses last-write-wins semantics while leaving conflict detection for a later milestone.
- [ ] **REQ-043: No regression of existing Cate panels.** Existing editor, terminal, browser, Git, workspace, layout, and panel tests continue to pass unchanged.
- [ ] **REQ-044: Connection persists across Cate restart.** Workspace connection metadata and token are available after restart, but the manager does not eagerly probe on startup.
- [ ] **REQ-045: Cate design-token discipline.** New UI follows Cate's design tokens, spacing, interaction, and visual conventions rather than introducing stock/default styling.

## Reserved Requirement IDs

REQ-020 through REQ-023 are intentionally vacant in the source product docs. Keep the gap so cross-document references remain stable.

## Out Of Scope

- Creating new vault documents.
- Renaming, deleting, archiving, tagging, or moving vault documents.
- AI/palette/comment-thread integration.
- Pi extension or agent integration.
- Brokered tool execution through Cate.
- Live vault change notifications.
- Vault-only Cate workspaces.
- Cate acting as a bridge/proxy for other clients.
- Conflict detection beyond v1 last-write-wins behavior.
- Stdio FlashQuery transport, unless it becomes trivial and explicitly approved later.
- OS keychain integration; v1 uses the specified storage abstraction and can be upgraded later.
- OAuth, refresh-token rotation, or hosted account flows.
- Frontmatter editing or frontmatter exposure in Cate.

## Verification Sources

The companion Test Plan is authoritative for verification IDs. It defines:

- Unit coverage: `T-U-001..104`
- Integration/component coverage: `T-I-001..098`
- Electron E2E coverage: `T-E-001..011`
- Manual/design coverage: `T-M-001..007`

Every defined requirement has at least one listed test-plan reference. Manual visual checks cover design fidelity where Cate does not yet have visual-regression infrastructure.

## Traceability

| Requirement IDs | Phase | Status |
|-----------------|-------|--------|
| REQ-001, REQ-002, REQ-003, REQ-013 | Phase 1: Foundation | Planned |
| REQ-004, REQ-005, REQ-006, REQ-011 | Phase 2: Connection layer | In Progress |
| REQ-007, REQ-008, REQ-009, REQ-010, REQ-012 | Phase 3: IPC surface | Planned |
| REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-024, REQ-025, REQ-026, REQ-040 | Phase 4: Vault panel + shared chip | Planned |
| REQ-034, REQ-035, REQ-036, REQ-037, REQ-038, REQ-039 | Phase 5: Settings dialog + workspace menu entry | Complete |
| REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-041, REQ-042 | Phase 6: Editor URI-awareness + vault badge | Planned |
| REQ-043, REQ-044, REQ-045 | Phase 7: Cross-cutting + regression | Planned |

**Coverage:**

- Defined milestone requirements: 41
- Reserved IDs: 4
- Mapped to milestone phases: 41
- Unmapped defined requirements: 0

---
*Requirements defined: 2026-05-28 from product milestone docs*
