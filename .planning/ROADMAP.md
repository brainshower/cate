# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-31) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Release Readiness + Provenance Closeout** — Phases 8-13 (shipped 2026-06-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 FlashQuery Milestone 2** — Phases 14-21 (completed 2026-06-06) — [archive](milestones/v1.2-ROADMAP.md)
- ✅ **v1.3 Document Outline** — Phases 22-23 (shipped 2026-06-16) — [archive](milestones/v1.3-ROADMAP.md)
- ✅ **v1.4 Semantic Connections Inspector** — Phases 24-25 (completed 2026-06-17)
- ◆ **v1.5 Browser Uplift** — Phase 26 (planning 2026-06-26)

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

v1.5 Browser Uplift is active. The milestone is intentionally planned as one GSD phase because the supplied requirements are cohesive, all browser changes share the same IPC/preload/state boundary, and the owner requested one phase if possible. The source spec's four implementation phases remain preserved as ordered sub-slices within Phase 26.

### Phase 26: Browser Uplift

**Goal:** Implement the Browser Uplift end to end: workspace-scoped durable browser sessions, per-workspace history/bookmarks, browser affordances, main-frame/crash/shortcut robustness, modular screenshot IPC, workspace cleanup, clear-data controls, portal bridge preservation, FlashQuery isolation, and full supplied test coverage.

**GSD progress:** Executing — 7/10 plans complete.

**Plans:** 7/10 plans executed

Plans:
**Wave 1**

- [x] 26-01-PLAN.md — Workspace partition threading and partition E2E.

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 26-02-PLAN.md — Load-error helper and portal bridge regression.

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 26-03-PLAN.md — Capture IPC relocation and screenshot contract tests.

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 26-04-PLAN.md — Main browser state store plus browser IPC/preload contracts.

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 26-05-PLAN.md — Renderer browser store plus bookmarks bar/star.

**Wave 6** *(blocked on Wave 5 completion)*

- [x] 26-06-PLAN.md — Browser menu/popover plus settings schema/UI.

**Wave 7** *(blocked on Wave 6 completion)*

- [x] 26-07-PLAN.md — Workspace cleanup plus clear-data IPC/UI.

**Wave 8** *(blocked on Wave 7 completion)*

- [ ] 26-08-PLAN.md — Crash overlay plus scoped shortcut forwarding.

**Wave 9** *(blocked on Wave 8 completion)*

- [ ] 26-09-PLAN.md — FlashQuery isolation contract tests.

**Wave 10** *(blocked on Wave 9 completion)*

- [ ] 26-10-PLAN.md — System verification/evidence and manual T-M-001.

**Source slices included:**

- Requirements Section 8.3 Phase 1: Browser Foundation
- Requirements Section 8.4 Phase 2: Browser State and Affordances
- Requirements Section 8.5 Phase 3: Workspace Safety and Controls
- Requirements Section 8.6 Phase 4: System Verification

**Requirements:** REQ-001 through REQ-012.

**Success criteria:**

1. Browser panels mount only with real workspace IDs and use `persist:browser-ws-${workspaceId}` across canvas, dock, detached panel, detached dock, same-workspace multi-window, and brand-new workspace flows.
2. Browser state persists and isolates per workspace: history, bookmarks, bookmark bar UI, star toggle, and renderer store refreshes are all keyed by `workspaceId`.
3. Browser UX is robust: subresource failures do not mask pages, main-frame failures show the load-error overlay, non-clean renderer crashes show reload recovery, and only browser-scoped shortcuts are forwarded to focused webviews.
4. Browser menu/settings affordances match the resolved product choices: the in-panel popover has bookmarks-bar and clear-data controls only, homepage/search stay in the Settings-window Browser panel, and clear-data takes effect on next navigation/reload rather than forcing live panels.
5. Screenshot capture moves out of `src/main/index.ts` into a focused browser/capture IPC module while preserving `{ filePath, dataUrl }`, webview guest ownership validation, Desktop PNG behavior, and no proxy/extraction handler registration.
6. Workspace removal and clear-data delete only the target workspace browser state/partition and never alter FlashQuery credentials, connection metadata, vault documents, indexes, or MCP sessions.
7. Fork-only portal orchestration remains functional: `portalRegistry.register()` / `unregister()` still best-effort bridge to `orchRegisterPortalWc`, and popup parent resolution smoke coverage stays green.
8. Full supplied coverage is implemented or explicitly recorded with evidence: unit `T-U-001..T-U-031`, integration `T-I-001..T-I-006`, E2E `T-E-001..T-E-021`, and manual `T-M-001`.

**Internal execution order:**

1. Browser Foundation: partition helper/mount threading, load-error helper, capture IPC module, portal bridge regression tests.
2. Browser State and Affordances: per-workspace browser state store, renderer browser store, bookmarks bar/star toggle, menu/settings controls.
3. Workspace Safety and Controls: workspace cleanup hook, clear-data IPC/popover flow, crash overlay, shortcut forwarding, FlashQuery isolation tests.
4. System Verification: Playwright browser-uplift spec, existing FlashQuery persistence smoke, manual real-site login persistence check, and final evidence cleanup.

**Required test coverage during the phase:**

- Partition/session scope: `T-U-001`, `T-U-002`, `T-U-029`, `T-E-001`, `T-E-002`, `T-E-003`, `T-E-020`, `T-E-021`, `T-M-001`
- Browser state/bookmarks/settings: `T-U-005` through `T-U-008`, `T-U-017` through `T-U-021`, `T-U-030`, `T-U-031`, `T-E-005`, `T-E-006`, `T-E-012`, `T-E-013`, `T-E-014`
- Navigation/crash/shortcuts: `T-U-009` through `T-U-016`, `T-E-007` through `T-E-011`
- Cleanup/clear-data/FlashQuery isolation: `T-U-003`, `T-U-004`, `T-U-022` through `T-U-024`, `T-U-027`, `T-U-028`, `T-I-001` through `T-I-003`, `T-E-004`, `T-E-015`, `T-E-018`, `T-E-019`
- Capture/portal contracts: `T-U-025`, `T-U-026`, `T-I-004` through `T-I-006`, `T-E-016`, `T-E-017`

**Execution constraint:** Tests must land with the sub-slice they verify. Do not implement all browser behavior first and postpone coverage to the system-verification sub-slice.

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- v1.3 preserves product `REQ-###` IDs from the Document Outline requirements document so supplied test IDs remain directly traceable.
- Document Chat remains excluded from v1.4; Graph Explorer selection behavior is limited to the SC Inspector preview/Outline/panel synchronization described in the v1.4 requirements.
- v1.4 preserves product `REQ-###` IDs from the Semantic Connections Inspector requirements document and requires supplied tests to be implemented with the feature slices they verify.
- v1.5 preserves product `REQ-###` IDs from the Browser Uplift requirements document and groups the source spec's four implementation phases into one GSD phase as requested.
