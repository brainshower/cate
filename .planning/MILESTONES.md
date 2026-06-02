# Milestones

## v1.1 Upstream Sync / Release Readiness + Provenance Closeout (Completed: 2026-06-02)

**Phases completed:** 6 phases, 20 plans

**Goal:** Merge upstream Cate stable tag `v1.1.0` into the FlashQuery fork while preserving FlashQuery v1 behavior, security guarantees, E2E coverage, and planning history; hand off the verified sync to mainline; complete post-handoff shared-contract, renderer-behavior, upstream-value, visual-evidence, release-readiness, and provenance closeout audits without claiming publication.

**Canonical source docs:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

**Phase plans:**

- `.planning/phases/08-upstream-sync-v1-1-0/` — Upstream sync to `v1.1.0`
- `.planning/phases/09-upstream-sync-mainline-handoff/` — Mainline handoff
- `.planning/phases/10-shared-contracts-audit/` — Shared contracts audit
- `.planning/phases/11-renderer-behavior-audit/` — Renderer behavior audit
- `.planning/phases/12-upstream-value-visual-evidence-audit/` — Upstream value + visual evidence audit
- `.planning/phases/13-release-readiness-provenance-closeout/` — Release readiness + provenance closeout

**Key accomplishments:**

- Upstream `v1.1.0` merged as a real two-parent merge with merge-base `5b6549d`, behind-count 0, and sync-ledger provenance.
- FlashQuery token, IPC, preload, session, write-payload, sidebar, editor, dialog, panel, command-palette, and E2E harness invariants preserved after the merge and mainline handoff.
- Upstream build/packaging, theming, terminal/performance, agent/provider, file-exclusion, workspace-reload, and editor fixes retained or explicitly dispositioned.
- Shared contracts, renderer workflows, upstream-value capture, visual evidence, removed-file decisions, product acceptance, runbook completeness, `.planning/` tracking, and process/provenance gates all verified.
- Final build, typecheck, unit, full E2E, and focused upstream-value smoke evidence passed before closeout.

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
