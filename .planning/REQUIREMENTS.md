# Requirements: v1.1 Upstream Sync to Cate `v1.1.0`

**Defined:** 2026-06-01
**Milestone:** v1.1 Upstream Sync
**Status:** Completed

## Canonical Source Documents

Downstream planning, execution, QA, and review agents MUST read these documents before making implementation decisions:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

The product requirements document is the source of truth for behavior and invariants. The test plan is the source of truth for verification IDs, evidence, and pass/fail criteria.

## Milestone Goal

Merge upstream Cate stable tag `v1.1.0` into the FlashQuery fork with a real two-parent merge, preserving all FlashQuery v1 behavior, security guarantees, session compatibility, E2E coverage, and GSD planning history while adopting upstream's build, theming, terminal/performance, agent/provider, file-exclusion, workspace-reload, and editor fixes.

## Requirement Summary

### Merge Mechanics

- **REQ-001:** Execute on an isolated migration branch and capture baseline command output before the merge.
- **REQ-002:** Merge the stable `v1.1.0` tag only; do not pull unreleased upstream `main` commits.
- **REQ-026:** Preserve upstream provenance with a real merge commit, advanced merge-base, behind-count 0, and a sync ledger.
- **REQ-020:** Resolve upstream file removals deliberately with no dangling imports.

### Security And Contract Invariants

- **REQ-005:** Bearer tokens never leave main, logs, renderer state, or persisted workspace/session files.
- **REQ-006:** `/mcp/info` remains unauthenticated; private MCP calls remain bearer-authenticated and 401-specific.
- **REQ-007:** Vault writes remain body-only with no create flags, frontmatter, or expected-version payloads from the renderer.
- **REQ-008:** FlashQuery IPC channel strings remain exact and collision-free.
- **REQ-009:** Pre-merge session/workspace files continue to load with sanitized FlashQuery connection metadata.
- **REQ-010:** E2E-only preload/renderer bridges remain gated by `CATE_E2E`.

### FlashQuery Surface Preservation

- **REQ-011:** FlashQuery Vault remains a mounted, discoverable left-sidebar view.
- **REQ-012:** `createFlashQueryVault()` and the `flashqueryVault` panel type survive upstream `appStore` dedup.
- **REQ-013:** Vault editor read/write/save/dirty behavior coexists with upstream editor fixes.
- **REQ-014:** Vault badge and dock tab layout remain usable under upstream tabs/theming.
- **REQ-015:** "New FlashQuery Vault" remains discoverable and functional in the command palette.
- **REQ-016:** Connection dialog probe/test/save/remove flows remain functional.
- **REQ-017:** FlashQuery E2E harness capabilities are merged additively, not overwritten.

### Upstream Value Capture

- **REQ-003:** Adopt upstream agent/provider refactor fully.
- **REQ-004:** Adopt upstream unified theming and re-fit FlashQuery surfaces to tokens where clean.
- **REQ-018:** Retain upstream packaging/build, terminal/performance, file-exclusion, and workspace reload fixes.

### Verification And Process

- **REQ-019:** Record conflict-review notes for every central conflict file.
- **REQ-021:** Keep `.planning/` tracked and avoid broad `.claude/` ignore changes.
- **REQ-022:** Capture automated visual evidence for FlashQuery theme-affected surfaces in light and dark themes.
- **REQ-023:** Deliver `docs/UPSTREAM-SYNC.md` with runbook, protected-surface inventory, and sync ledger.
- **REQ-024:** Full verification matrix passes on the migration branch.
- **REQ-025:** Each migration phase passes a cumulative regression exit gate.

## Phase Traceability

| Requirement IDs | Phase | Status |
|-----------------|-------|--------|
| REQ-001, REQ-002 | Phase 8 Plan 8.1: Baseline and branch setup | Complete |
| REQ-001, REQ-018, REQ-024, REQ-025 | Phase 8 Plan 8.2: Build/dependency/packaging migration | Complete |
| REQ-005, REQ-006, REQ-008, REQ-009, REQ-010, REQ-019, REQ-024, REQ-025 | Phase 8 Plan 8.3: Shared contracts | Complete |
| REQ-003, REQ-007, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-019, REQ-024, REQ-025 | Phase 8 Plan 8.4: Renderer behavior | Complete |
| REQ-003, REQ-004, REQ-018, REQ-020, REQ-022, REQ-024, REQ-025 | Phase 8 Plan 8.5: Upstream feature compatibility | Complete |
| REQ-019, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026 | Phase 8 Plan 8.6: Verification and release readiness | Complete |

## Out Of Scope

- New FlashQuery product features beyond preserving v1 behavior through the upstream merge.
- Pulling unreleased upstream `main` commits beyond `v1.1.0`.
- Implementing a browser-based test harness.
- Changing FlashQuery MCP server contracts.
- Cutting a product release or bumping the app version beyond what the merge itself requires.

---

*Requirements derived from the upstream sync product specification and test plan on 2026-06-01.*
