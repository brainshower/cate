# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-30) — [archive](milestones/v1.0-ROADMAP.md)

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

### Next Milestone

No active milestone. Run `/gsd:new-milestone` to plan the next milestone.

Candidate themes surfaced during v1.0 close-out testing (see `.planning/PROJECT.md` "Current State" → "Next Milestone Goals"):

- Reload-from-FlashQuery affordance for vault editor docs.
- "Live vault notifications" subscription (server-push for vault changes).
- New-vault-document creation flow.
- Conflict detection / expected-version round-trip (defers REQ-042 invariant).
- Visual-fidelity capture for T-M-002..T-M-007 (close Debt-02).
- Spec amendment workflow for REQ-035.3 / REQ-037.1 (close Debt-01).
- Renderer Sentry gating on DSN (silence sentry-ipc:// DevTools noise).

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

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- REQ-020 through REQ-023 are intentionally reserved/vacant in the source product docs.
