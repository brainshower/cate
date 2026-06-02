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
| REQ-021, REQ-023, REQ-026 | Phase 9 Plan 9.1: Handoff preflight and fast-forward | Planned |
| REQ-024 | Phase 9 Plan 9.2: Post-handoff verification | Planned |
| REQ-021, REQ-023, REQ-026 | Phase 9 Plan 9.3: Provenance gates and planning closeout | Planned |
| REQ-005, REQ-006, REQ-008, REQ-009, REQ-010, REQ-019, REQ-024, REQ-025 | Phase 10 Plans 10.1..10.3: Shared-contracts post-handoff audit | Planned |
| REQ-004, REQ-018, REQ-020, REQ-022, REQ-024, REQ-025 | Phase 12 Plans 12.1..12.3: Upstream value and visual-evidence post-handoff audit | Planned |
| REQ-021, REQ-023, REQ-024, REQ-025, REQ-026 | Phase 13 Plans 13.1..13.3: Release-readiness and provenance closeout | Planned |

## Out Of Scope

- New FlashQuery product features beyond preserving v1 behavior through the upstream merge.
- Pulling unreleased upstream `main` commits beyond `v1.1.0`.
- Implementing a browser-based test harness.
- Changing FlashQuery MCP server contracts.
- Cutting a product release or bumping the app version beyond what the merge itself requires.

## Phase 9 Handoff Addendum

Phase 9 does not add new product requirements beyond the upstream-sync specification. It exists to make the already-verified `sync/upstream-v1.1.0` branch safe to hand off to the mainline by re-reading the canonical source docs, preserving Phase 8 evidence, checking the same process/provenance gates after handoff, and closing planning state only after fresh verification.

Downstream agents MUST continue to treat the two canonical source documents at the top of this file as the first source of truth for handoff and verification questions.

## Phase 10 Shared Contracts Audit Addendum

Phase 10 does not repeat the upstream merge. It preserves the original upstream-sync gap-analysis intent for "Phase 10: Shared Contracts" as a post-handoff audit/remediation pass on `main`.

Downstream implementation, QA, and review agents MUST read the two canonical source documents at the top of this file before deciding scope, code changes, test coverage, or acceptance criteria. If those documents and local planning artifacts disagree, the product requirements document controls behavior and the paired test plan controls verification IDs and pass/fail criteria.

Phase 10 is limited to REQ-005, REQ-006, REQ-008, REQ-009, REQ-010, REQ-019, REQ-024, and REQ-025 plus their mapped tests T-U-001 through T-U-009, T-E-004, T-A-002, T-A-004, and T-A-012. New product features, a second upstream merge, unreleased upstream `main` commits, and app/package release work remain out of scope.

## Phase 12 Upstream Value + Visual Evidence Audit Addendum

Phase 12 does not repeat the upstream merge. It preserves the original upstream-sync gap-analysis intent for "Phase 12" as a post-handoff audit/remediation pass on `main` covering upstream value capture, removed-file decisions, and visual evidence.

Downstream implementation, QA, and review agents MUST read the two canonical source documents at the top of this file before deciding scope, code changes, test coverage, smoke coverage, visual evidence, or acceptance criteria. If those documents and local planning artifacts disagree, the product requirements document controls behavior and the paired test plan controls verification IDs and pass/fail criteria.

Phase 12 is limited to REQ-004, REQ-018, REQ-020, REQ-022, REQ-024, and REQ-025 plus their mapped tests T-A-002, T-A-003, T-A-005 through T-A-009, T-A-011, and T-M-001 through T-M-004. New FlashQuery product features, a second upstream merge, unreleased upstream `main` commits, browser-harness work, and release/version bump work remain out of scope.

## Phase 13 Release Readiness + Provenance Closeout Addendum

Phase 13 does not repeat the upstream merge and does not cut a product release. It preserves the original upstream-sync final verification/release-readiness intent as a post-handoff closeout pass on the current mainline tree.

Downstream implementation, QA, and review agents MUST read the two canonical source documents at the top of this file before deciding scope, code changes, test coverage, product acceptance status, process-gate status, provenance status, or closeout criteria. If those documents and local planning artifacts disagree, the product requirements document controls behavior and the paired test plan controls verification IDs and pass/fail criteria.

Phase 13 is limited to REQ-021, REQ-023, REQ-024, REQ-025, and REQ-026 plus their mapped tests T-A-002, T-A-010, T-A-012 through T-A-015, and T-E-001 through T-E-005. New FlashQuery product features, a second upstream merge, unreleased upstream `main` commits, release/version bump work, and publication work remain out of scope.

---

*Requirements derived from the upstream sync product specification and test plan on 2026-06-01.*
