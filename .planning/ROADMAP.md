# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-30) — [archive](milestones/v1.0-ROADMAP.md)
- ◆ **v1.1 Upstream Sync** — Phase 8 (planned 2026-06-01)

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

## Active Milestone: v1.1 Upstream Sync

**Goal:** Merge upstream Cate stable tag `v1.1.0` into the FlashQuery fork with a real two-parent merge, preserve all FlashQuery v1 behavior/security/E2E guarantees, adopt upstream fixes and architecture changes, and leave a future-sync runbook for the next merge.

**Canonical source docs for every downstream agent:**

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md`

### Phase 8: Upstream Sync to `v1.1.0`

**Goal:** Execute and verify the controlled upstream sync migration in the sequence defined by the product requirements and test plan.

**Requirements:** REQ-001..REQ-026
**Tests:** T-A-001..T-A-015, T-U-001..T-U-017, T-E-001..T-E-005, T-M-001..T-M-005
**Status:** Planned

**Success criteria:**

- Baseline output for build, typecheck, unit, and E2E is captured before merge.
- Upstream `v1.1.0` is merged as a real two-parent merge with provenance recorded.
- FlashQuery token, IPC, session, write-payload, sidebar, editor, dialog, panel, command palette, and E2E harness invariants are preserved.
- Upstream build/packaging, theming, terminal/perf, agent/provider, file-exclusion, workspace-reload, and editor fixes are adopted.
- Full automated matrix, visual evidence, product smoke, conflict-review notes, `.planning/` tracking, and future-sync runbook gates pass.

**Plans:**

- [ ] `08-01-PLAN.md` — Baseline and branch setup.
- [ ] `08-02-PLAN.md` — Build, dependency, and packaging migration.
- [ ] `08-03-PLAN.md` — Shared contracts and security invariants.
- [ ] `08-04-PLAN.md` — Renderer behavior and E2E harness preservation.
- [ ] `08-05-PLAN.md` — Upstream feature compatibility, theming, and visual evidence.
- [ ] `08-06-PLAN.md` — Verification, runbook, provenance, and release readiness.

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
| 8. Upstream Sync to v1.1.0                  | v1.1      | 0/6            | Planned  | —          |

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- REQ-020 through REQ-023 are intentionally reserved/vacant in the source product docs.
- Phase 8 was created from the upstream sync requirements and test plan referenced above; downstream agents should treat those product docs as mandatory first reads.
