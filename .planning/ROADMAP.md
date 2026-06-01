# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-30) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Upstream Sync** — Phase 8 (completed 2026-06-01)
- ✅ **v1.1 Mainline Handoff** — Phase 9 (completed 2026-06-01)
- ✅ **v1.1 Shared Contracts Audit** — Phase 10 (completed 2026-06-01)
- ✅ **v1.1 Renderer Behavior Audit** — Phase 11 (completed 2026-06-01)
- ✅ **v1.1 Upstream Value + Visual Evidence Audit** — Phase 12 (completed 2026-06-01)

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

## Completed Milestone: v1.1 Upstream Sync

**Goal:** Merge upstream Cate stable tag `v1.1.0` into the FlashQuery fork with a real two-parent merge, preserve all FlashQuery v1 behavior/security/E2E guarantees, adopt upstream fixes and architecture changes, and leave a future-sync runbook for the next merge.

**Canonical source docs for every downstream agent:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

### Phase 8: Upstream Sync to `v1.1.0`

**Goal:** Execute and verify the controlled upstream sync migration in the sequence defined by the product requirements and test plan.

**Requirements:** REQ-001..REQ-026
**Tests:** T-A-001..T-A-015, T-U-001..T-U-017, T-E-001..T-E-005, T-M-001..T-M-005
**Status:** Complete

**Success criteria:**

- Baseline output for build, typecheck, unit, and E2E is captured before merge.
- Upstream `v1.1.0` is merged as a real two-parent merge with provenance recorded.
- FlashQuery token, IPC, session, write-payload, sidebar, editor, dialog, panel, command palette, and E2E harness invariants are preserved.
- Upstream build/packaging, theming, terminal/perf, agent/provider, file-exclusion, workspace-reload, and editor fixes are adopted.
- Full automated matrix, visual evidence, product smoke, conflict-review notes, `.planning/` tracking, and future-sync runbook gates pass.

**Plans:**

- [x] `08-01-PLAN.md` — Baseline and branch setup.
- [x] `08-02-PLAN.md` — Build, dependency, and packaging migration.
- [x] `08-03-PLAN.md` — Shared contracts and security invariants.
- [x] `08-04-PLAN.md` — Renderer behavior and E2E harness preservation.
- [x] `08-05-PLAN.md` — Upstream feature compatibility, theming, and visual evidence.
- [x] `08-06-PLAN.md` — Verification, runbook, provenance, and release readiness.

## Completed Milestone: v1.1 Mainline Handoff

**Goal:** Review and merge the verified `sync/upstream-v1.1.0` branch into the fork's mainline without weakening the upstream-sync requirements, then run a post-merge smoke/provenance pass and close the planning state for v1.1.

**Canonical source docs for every downstream agent:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

### Phase 9: Upstream Sync Mainline Handoff

**Goal:** Convert the already-verified upstream-sync migration branch into a mainline-ready repository state, preserving the Phase 8 evidence chain and re-checking product-doc gates after the branch handoff.

**Requirements:** REQ-021, REQ-023, REQ-024, REQ-026
**Tests:** T-A-002, T-A-003, T-A-004, T-A-010, T-A-012..T-A-015, T-E-001..T-E-005
**Status:** Complete

**Success criteria:**

- Downstream implementation agents read the upstream-sync requirements and test plan before deciding any merge, verification, or documentation question.
- The `sync/upstream-v1.1.0` branch is reviewed against Phase 8 evidence before any mainline handoff step.
- Mainline handoff preserves `v1.1.0` ancestry, behind-count 0, sync-ledger documentation, and `.planning/` tracking.
- Post-handoff build, typecheck, unit/E2E smoke, and product acceptance checks are rerun or explicitly justified from fresh evidence.
- Planning state is updated only after the post-handoff gates pass.

**Plans:**

- [x] `09-01-PLAN.md` — Handoff preflight and fast-forward.
- [x] `09-02-PLAN.md` — Post-handoff verification.
- [x] `09-03-PLAN.md` — Provenance gates and planning closeout.

## Completed Milestone: v1.1 Shared Contracts Audit

**Goal:** Re-audit the post-handoff `main` branch against the upstream-sync shared-contract requirements, harden any missing assertions, and preserve FlashQuery token, IPC, preload, session, and E2E-gating invariants after the v1.1 merge landed on main.

**Canonical source docs for every downstream agent:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

Downstream implementation, QA, and review agents MUST read both documents before deciding scope, code changes, test coverage, or acceptance criteria for this phase.

### Phase 10: Shared Contracts Audit

**Goal:** Treat the original upstream-sync Phase 10 "Shared Contracts" scope as a post-handoff audit/remediation pass: prove the final mainline tree still satisfies the shared IPC/type/preload/session invariants and close any gaps with targeted tests or documentation.

**Requirements:** REQ-005, REQ-006, REQ-008, REQ-009, REQ-010, REQ-019, REQ-024, REQ-025
**Tests:** T-U-001..T-U-009, T-E-004, T-A-002, T-A-004, T-A-012
**Status:** Complete

**Success criteria:**

- The seven `flashquery:*` IPC channel strings remain exact and collision-free in the post-handoff mainline tree.
- FlashQuery renderer/preload API types still expose the expected methods without widening privileged payloads.
- Bearer tokens remain main-process only: not returned to renderer, logged, or persisted to workspace/session files.
- `/mcp/info` remains unauthenticated while private MCP calls remain bearer-authenticated and 401-specific.
- Pre-merge workspace/session fixtures still load with sanitized FlashQuery metadata.
- E2E-only preload and renderer harness surfaces remain gated by `CATE_E2E`.
- Central contract conflict-review evidence remains present and references the relevant test IDs.
- Build, typecheck, unit tests, and focused E2E persistence coverage pass or any non-run is explicitly justified.

**Plans:**

- [x] `10-01-PLAN.md` — Contract inventory and proof audit.
- [x] `10-02-PLAN.md` — Security/session assertion hardening.
- [x] `10-03-PLAN.md` — Evidence, cumulative gate, and closeout.

## Completed Milestone: v1.1 Renderer Behavior Audit

**Goal:** Re-audit the post-handoff `main` branch against the upstream-sync renderer-behavior requirements, harden any missing proof around appStore, editor, sidebar, dock tab, command palette, connection dialog, and E2E harness behavior, and leave evidence that downstream agents followed the product docs first.

**Canonical source docs for every downstream agent:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

Downstream implementation, QA, and review agents MUST read both documents before deciding scope, code changes, test coverage, or acceptance criteria for this phase.

### Phase 11: Renderer Behavior Audit

**Goal:** Treat the original upstream-sync Phase 11 "Renderer Behavior" scope as a post-handoff audit/remediation pass: prove the final mainline tree still satisfies FlashQuery renderer workflow, discoverability, editor save, command palette, connection dialog, and E2E harness invariants.

**Requirements:** REQ-003, REQ-007, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-019, REQ-024, REQ-025
**Tests:** T-U-010..T-U-017, T-E-001..T-E-005, T-A-002, T-A-012
**Status:** Complete

**Success criteria:**

- `createFlashQueryVault(workspaceId)` and the `flashqueryVault` panel type remain intact after upstream appStore/provider refactors.
- FlashQuery sidebar, workspace tab, dock tab badge, command palette, editor vault URI save path, and connection dialog behavior remain discoverable and functional.
- FlashQuery E2E harness capabilities remain additive and real Electron flows pass for happy path, vault browse, disconnect/retry, persistence, and stub-server lifecycle.
- Renderer/harness central-file conflict-review evidence is complete or receives a Phase 11 addendum.
- Build, typecheck, unit tests, and E2E coverage pass or any non-run is explicitly justified without closing the phase prematurely.

**Plans:**

- [x] `11-01-PLAN.md` — Renderer surface proof audit.
- [x] `11-02-PLAN.md` — E2E harness and workflow proof audit.
- [x] `11-03-PLAN.md` — Evidence, cumulative gate, and closeout.

## Completed Milestone: v1.1 Upstream Value + Visual Evidence Audit

**Goal:** Re-audit the post-handoff `main` branch against the upstream-sync upstream-value and visual-evidence requirements, harden any missing proof around theming, automated screenshots, upstream feature smoke, removed-file decisions, and cumulative verification, and leave evidence that downstream agents followed the product docs first.

**Canonical source docs for every downstream agent:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

Downstream implementation, QA, and review agents MUST read both documents before deciding scope, code changes, test coverage, smoke coverage, visual evidence, or acceptance criteria for this phase.

### Phase 12: Upstream Value + Visual Evidence Audit

**Goal:** Treat the original upstream-sync Phase 12 "theming, upstream feature smoke, removed-file decisions, and light/dark visual evidence" scope as a post-handoff audit/remediation pass: prove the final mainline tree still satisfies upstream value capture and visual proof requirements, close any narrow gaps with targeted tests/evidence, and preserve the cumulative regression gate.

**Requirements:** REQ-004, REQ-018, REQ-020, REQ-022, REQ-024, REQ-025
**Tests:** T-A-002, T-A-003, T-A-005..T-A-009, T-A-011, T-M-001..T-M-004
**Status:** Complete

**Success criteria:**

- The upstream unified theming adoption remains present and FlashQuery theme-affected surfaces have current light/dark automated screenshot evidence.
- Vault badge, sidebar vault view, connection dialog, status chip, and editor tabs with vault badge satisfy the visual evidence obligations in the upstream-sync test plan.
- Upstream packaging/build, terminal/performance, file-exclusion, workspace reload, and editor fixes remain adopted or receive explicit evidence-backed notes.
- Removed upstream files `src/main/templates/skillTemplate.ts` and `src/renderer/canvas/BulkActionChip.tsx` have deliberate current-state decisions with no dangling imports.
- Build, typecheck, unit tests, relevant E2E/visual evidence, and upstream feature smoke pass or any non-run is explicitly justified without closing the phase prematurely.

**Plans:**

- [x] `12-01-PLAN.md` — Theme token and visual evidence audit.
- [x] `12-02-PLAN.md` — Upstream feature smoke and removed-file decision audit.
- [x] `12-03-PLAN.md` — Evidence, cumulative gate, and closeout.

## Progress

| Phase                                       | Milestone | Plans Complete | Status   | Completed  |
|---------------------------------------------|-----------|----------------|----------|------------|
| 1. Foundation                               | v1.0      | 3/3            | Complete | 2026-05-29 |
| 2. Connection Layer                         | v1.0      | 3/3            | Complete | 2026-05-29 |
| 3. IPC Surface                              | v1.0      | 3/3            | Complete | 2026-05-29 |
| 4. Vault Panel + Shared Chip                | v1.0      | 4/4            | Complete | 2026-05-29 |
| 5. Settings Dialog + Workspace Menu Entry   | v1.0      | 3/3            | Complete | 2026-05-29 |
| 6. Editor URI-Awareness + Vault Badge       | v1.0      | 4/4            | Complete | 2026-05-29 |
| 7. Cross-Cutting + Regression               | v1.0      | 3/3            | Complete | 2026-05-30 |
| 8. Upstream Sync to v1.1.0                  | v1.1      | 6/6            | Complete | 2026-06-01 |
| 9. Upstream Sync Mainline Handoff           | v1.1      | 3/3            | Complete | 2026-06-01 |
| 10. Shared Contracts Audit                  | v1.1      | 3/3 | Complete   | 2026-06-01 |
| 11. Renderer Behavior Audit                 | v1.1      | 3/3 | Complete   | 2026-06-01 |
| 12. Upstream Value + Visual Evidence Audit  | v1.1      | 3/3 | Complete   | 2026-06-01 |

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- REQ-020 through REQ-023 are active upstream-sync requirements covering removed-file resolution, `.planning/` tracking, visual evidence, and the future-sync runbook.
- Phases 8 and 9 were created from the upstream sync requirements and test plan referenced above; downstream agents should treat those product docs as mandatory first reads.
- Phase 10 exists because the upstream-sync gap analysis originally identified "Shared Contracts" as Phase 10; after the actual Phase 8/9 compression, this is scoped as a post-handoff audit/remediation phase rather than a second merge.
- Phase 11 exists because the upstream-sync gap analysis originally identified "Renderer Behavior" as Phase 11; after the actual Phase 8/9 compression, this is scoped as a post-handoff audit/remediation phase rather than another merge.
- Phase 12 exists because the upstream-sync gap analysis originally identified "theming, upstream feature smoke, removed-file decisions, and light/dark visual evidence" as Phase 12; after the actual Phase 8/9 compression, this is scoped as a post-handoff audit/remediation phase rather than another merge.
