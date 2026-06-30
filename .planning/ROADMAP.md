# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-31) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Release Readiness + Provenance Closeout** — Phases 8-13 (shipped 2026-06-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 FlashQuery Milestone 2** — Phases 14-21 (completed 2026-06-06) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Document Outline** — Phases 22-23 (shipped 2026-06-16) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Semantic Connections Inspector** — Phases 24-25 (completed 2026-06-17)
- ✅ **v1.5 Browser Uplift** — Phase 26 (shipped 2026-06-30) — [archive](milestones/v1.5-ROADMAP.md)

## Phases

<details>
<summary>✅ v1.0 Vault Connect, Read, Edit (Phases 1-7) — SHIPPED 2026-05-31</summary>

See archived roadmap for full phase details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Release Readiness + Provenance Closeout (Phases 8-13) — SHIPPED 2026-06-02</summary>

See archived roadmap for full phase details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 FlashQuery Milestone 2 (Phases 14-21) — COMPLETED 2026-06-06</summary>

See archived roadmap for full phase details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details>
<summary>✅ v1.3 Document Outline (Phases 22-23) — SHIPPED 2026-06-16</summary>

See archived roadmap for full phase details: [milestones/v1.3-ROADMAP.md](milestones/v1.3-ROADMAP.md)

</details>

## Current Status

v1.5 Browser Uplift is complete and archived. Phase 26 shipped workspace-scoped durable browser partitions, browser history/bookmarks/settings affordances, scoped clear-data and workspace cleanup, crash/load-error/shortcut robustness, modular screenshot IPC, portal bridge preservation, FlashQuery isolation regressions, and full automated Browser Uplift verification.

Post-phase gap analysis is recorded in `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Gaps.md`. All known implementation and traceability gaps found there were resolved before closeout. The human-only real-site login persistence check `T-M-001` remains recorded as manual-pending evidence in `.planning/phases/26-browser-uplift/26-MANUAL-EVIDENCE.md`; deterministic local fake-auth restart/isolation E2E covers the automated persistence path.

Next milestone requirements have not been defined yet. Start with `/gsd-new-milestone`.

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- v1.3 preserves product `REQ-###` IDs from the Document Outline requirements document so supplied test IDs remain directly traceable.
- Document Chat remains excluded from v1.4; Graph Explorer selection behavior is limited to the SC Inspector preview/Outline/panel synchronization described in the v1.4 requirements.
- v1.4 preserves product `REQ-###` IDs from the Semantic Connections Inspector requirements document and requires supplied tests to be implemented with the feature slices they verify.
- v1.5 preserves product `REQ-###` IDs from the Browser Uplift requirements document and groups the source spec's four implementation phases into one GSD phase as requested.
