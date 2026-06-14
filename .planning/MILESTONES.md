# Milestones

## v1.2 FlashQuery Milestone 2 (Completed: 2026-06-06)

**Phases completed:** 8 phases, 25 plans, 20 requirements

**Key accomplishments:**

- Manual refresh for clean and dirty FlashQuery vault body editor tabs with safe disconnected/error behavior.
- Separate FlashQuery frontmatter editor tabs with independent Monaco YAML state and managed-field filtering.
- Dedicated FlashQuery Vault Search panel with document/memory results, pagination, and row actions.
- Bundled Cate FlashQuery Pi extension with eligible tool registration, `call_model`, `call_macro`, and diagnostics rendering.
- Pi chat `@` mention autocomplete for literal `{{ref:path.md}}` document references plus cross-surface copy utilities.
- Consistent disconnected, reconnecting, workspace-switch, stale-cache, in-flight, and regression behavior across Milestone 2 surfaces.
- Milestone audit passed with 20/20 requirements satisfied; deterministic substitutes accepted for remaining live Pi/FlashQuery manual evidence.

---

## v1.1 Release Readiness + Provenance Closeout (Shipped: 2026-06-02)

**Phases completed:** 6 phases, 21 plans, 31 tasks

**Key accomplishments:**

- Fast-forward-only mainline handoff with Phase 8 evidence and upstream merge provenance preserved
- Fresh post-handoff regression matrix with unit, E2E, gap-closure, and product acceptance evidence
- Provenance-gated v1.1 handoff closeout with final verification, ROADMAP, and STATE updates
- FlashQuery shared IPC/preload contract audit with production-negative E2E helper coverage
- FlashQuery token, auth, session, and supporting body-only write proof for post-handoff mainline
- Final shared-contract audit gate with archived build, typecheck, unit, persistence E2E, and full FlashQuery E2E evidence
- Current FlashQuery theme-token audit with refreshed light/dark screenshots for the vault badge, sidebar vault view, connection dialog, status chip, and vault editor tab.
- Upstream smoke evidence with current removed-file decisions, build proof, and explicit T-A-011 non-run rationale.
- Final upstream-value and visual-evidence closeout with green build, typecheck, unit, and full Electron E2E logs.
- T-A-010 product acceptance evidence mapped to current E2E coverage and Phase 12/13 visual/supporting baselines
- Current HEAD provenance, runbook completeness, `.planning/` tracking, and conflict-review gates recorded for final closeout
- Final release-readiness evidence matrix with green build/typecheck/unit/E2E logs, UAT, verification, and closed planning state

---

## v1.0 Vault Connect, Read, Edit (Shipped: 2026-05-31)

**Phases completed:** 7 phases, 23 plans, 61 tasks

**Key accomplishments:**

- Optional per-workspace FlashQuery HTTP connection metadata now survives Cate workspace, project, session, and renderer-sync paths.
- Main-process FlashQuery bearer-token I/O is isolated behind `getWorkspaceToken` and `setWorkspaceToken`.
- Pure FlashQuery vault URI helpers and an inert workspace-scoped client manager skeleton are ready for later connection work.
- FlashQuery manager now performs explicit unauthenticated `/mcp/info` probes and reports safe workspace-scoped status payloads.
- FlashQuery manager retry state now handles transient outages with bounded backoff, manual retry, and dispose-safe cleanup.
- FlashQuery manager subscriptions now deliver typed event payloads directly with coverage for same-workspace delivery, unsubscribe, event-type isolation, and payload shape.
- FlashQuery IPC contract with shared channel constants, typed preload bridge, and main-process registration shell
- FlashQuery connection mutation IPC with URL validation, manager lifecycle reset, and renderer status fanout
- FlashQuery vault browsing and body-only document editing IPC backed by official MCP Streamable HTTP tool calls
- Reusable FlashQuery connection-status chip with RTL coverage and approved component-test dependencies
- FlashQuery Vault panel registered across shared metadata, renderer registry, and Zustand panel creation
- Renderer-safe FlashQuery URI helpers, manual retry IPC, and future connection-dialog visibility state
- FlashQuery Vault panel with connection states, lazy browsing, document open actions, and guarded refresh behavior
- Root-mounted FlashQuery connection dialog shell with workspace identity, close paths, and focus containment
- Workspace-scoped FlashQuery connection form with token-safe prepopulation, dry-run probe, save, cancel, and remove flows
- Native workspace context-menu entry opens the FlashQuery connection dialog through existing UI-store state.
- FlashQuery vault URI editor reads now load body content through preload IPC with Monaco model identity preserved by full URI.
- Vault-backed editor saves now use FlashQuery write IPC while keeping Cate's dirty-state and close-confirm conventions.
- FlashQuery vault documents now bypass local Git diff mode and render as standard editable documents.
- Editor title chrome now displays an inert FlashQuery Vault badge with host copy and decoded path tooltip.
- FlashQuery public info probes now omit bearer auth while MCP POST transport remains authenticated
- Deterministic FlashQuery MCP stub plus restart, lazy reconnect, workflow, retry, browse, and Open on Canvas E2E coverage
- Design-token invariants, durable manual visual evidence, and final Phase 7 verification for the FlashQuery v1 milestone

---
