# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-30) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Upstream Sync** — Phase 8 (completed 2026-06-01)
- ◆ **v1.1 Mainline Handoff** — Phase 9 (planned)

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

## Planned Milestone: v1.1 Mainline Handoff

**Goal:** Review and merge the verified `sync/upstream-v1.1.0` branch into the fork's mainline without weakening the upstream-sync requirements, then run a post-merge smoke/provenance pass and close the planning state for v1.1.

**Canonical source docs for every downstream agent:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

### Phase 9: Upstream Sync Mainline Handoff

**Goal:** Convert the already-verified upstream-sync migration branch into a mainline-ready repository state, preserving the Phase 8 evidence chain and re-checking product-doc gates after the branch handoff.

**Requirements:** REQ-021, REQ-023, REQ-024, REQ-026
**Tests:** T-A-002, T-A-003, T-A-004, T-A-010, T-A-012..T-A-015, T-E-001..T-E-005
**Status:** Planned

**Success criteria:**

- Downstream implementation agents read the upstream-sync requirements and test plan before deciding any merge, verification, or documentation question.
- The `sync/upstream-v1.1.0` branch is reviewed against Phase 8 evidence before any mainline handoff step.
- Mainline handoff preserves `v1.1.0` ancestry, behind-count 0, sync-ledger documentation, and `.planning/` tracking.
- Post-handoff build, typecheck, unit/E2E smoke, and product acceptance checks are rerun or explicitly justified from fresh evidence.
- Planning state is updated only after the post-handoff gates pass.

**Plans:**

- [ ] `09-01-PLAN.md` — Handoff preflight and fast-forward.
- [ ] `09-02-PLAN.md` — Post-handoff verification.
- [ ] `09-03-PLAN.md` — Provenance gates and planning closeout.

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
| 9. Upstream Sync Mainline Handoff           | v1.1      | 0/3            | Planned  | —          |

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- REQ-020 through REQ-023 are active upstream-sync requirements covering removed-file resolution, `.planning/` tracking, visual evidence, and the future-sync runbook.
- Phases 8 and 9 were created from the upstream sync requirements and test plan referenced above; downstream agents should treat those product docs as mandatory first reads.
