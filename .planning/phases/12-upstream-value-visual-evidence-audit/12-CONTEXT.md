# Phase 12: Upstream Value + Visual Evidence Audit - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Product upstream-sync requirements/test plan, upstream-sync gap analysis, and Cate `.planning/` state

<domain>
## Phase Boundary

Phase 12 audits and hardens the upstream-value and visual-evidence slice that the upstream-sync gap analysis named as "Phase 12." The actual `v1.1.0` merge shipped in Phase 8, the mainline handoff shipped in Phase 9, the shared-contract audit shipped in Phase 10, and the renderer-behavior audit shipped in Phase 11. This phase must not start another upstream merge or replay already-closed work.

The goal is to prove the final post-handoff `main` tree still satisfies the upstream-sync requirements for unified theming, light/dark visual evidence, upstream packaging/build/terminal/file-exclusion/workspace-reload/editor fixes, removed-file decisions, and cumulative regression gates. If proof is stale or incomplete, close the narrowest evidence or test gap.

</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Docs

- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` before making behavior, scope, smoke, visual, or remediation decisions.
- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` before making verification, test-ID, evidence, or pass/fail decisions.
- Downstream agents SHOULD read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Gaps.md` for the historical Phase 12 scope and prior Phase 8-11 gap context.
- If product docs and local planning artifacts disagree, the requirements document controls behavior and the test plan controls verification IDs and acceptance.

### Phase Shape

- Phase 12 is a post-handoff audit/remediation phase.
- Code changes are allowed only when the audit finds a real theming, upstream-value, removed-file, visual-evidence, smoke, or test coverage gap.
- Prefer proof, focused tests, refreshed screenshots, evidence notes, and closeout artifacts over broad refactors.
- Do not pull unreleased upstream commits, re-run the `v1.1.0` merge, change FlashQuery MCP server contracts, implement a browser-based harness, redesign FlashQuery UI, or perform release/version bump work.

### Phase 11 Gap-Fix Context

- Commit `9ea8768` closed Phase 11 renderer-behavior gap-analysis findings by adding behavioral coverage for `T-U-011`, `T-U-012`, and `T-U-015`.
- `src/renderer/sidebar/Sidebar.tsx` now exports `VIEW_META` and `SidebarViewContent` so `FlashQueryVaultPanel.test.tsx` can prove the `flashqueryVault` icon/title and mount path directly.
- `src/renderer/docking/DockTabBar.test.tsx` now renders a `flashquery://` editor tab and asserts `VaultBadge` plus the widened vault-editor tab treatment.
- `src/renderer/sidebar/WorkspaceTab.test.tsx` now verifies a listed `flashqueryVault` panel can focus the dock stack.
- Phase 11 verification now qualifies `REQ-013`: the FlashQuery preservation half passed in Phase 11, while the upstream editor-fix coexistence smoke (`T-M-002`, upstream commits `063b61d` and `0822786`) remains explicit Phase 12 scope.
- Phase 12 visual/smoke agents MUST read the updated Phase 11 evidence before deciding whether screenshot, sidebar, dock-tab, or editor-smoke proof is current enough.

### Requirements In Scope

- REQ-003 adopt the upstream agent/provider refactor fully while preserving FlashQuery panel behavior.
- REQ-004 adopt upstream unified theming and re-fit FlashQuery surfaces to tokens where clean.
- REQ-018 retain upstream packaging/build, terminal/performance, file-exclusion, workspace reload, and editor fixes.
- REQ-020 resolve upstream file removals deliberately with no dangling imports.
- REQ-022 capture automated visual evidence for FlashQuery theme-affected surfaces in light and dark themes.
- REQ-024 full verification matrix passes.
- REQ-025 cumulative regression exit gate does not regress earlier green tests.

### Tests In Scope

- T-A-002 cumulative exit gate.
- T-A-003 deterministic install/build proof.
- T-A-005 through T-A-009 light/dark visual evidence.
- T-A-011 packaged-app smoke if packaging/Electron dependencies changed during Phase 12.
- T-M-001 through T-M-005 upstream terminal/editor/file-git/removed-file/agent-provider smoke.
- Supporting gates: `npm run build`, `npm run typecheck`, focused tests for touched code, `npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts`, and either full `npm run test:e2e` or a documented scoped rationale.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read the product docs before planning or implementing.**

### Product Source Of Truth

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` - authoritative behavior, invariants, and requirement IDs.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` - authoritative verification layers, test IDs, visual-evidence requirements, smoke scope, and pass criteria.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Gaps.md` - historical Phase 12 scope and prior gap-resolution context.

### Local Planning References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-05-PLAN.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-05-SUMMARY.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-06-PLAN.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-UAT.md`
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/visual/REVIEW.md`
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/visual/visual-evidence.log`
- `.planning/phases/08-upstream-sync-v1-1-0/evidence/contracts/CONFLICT-REVIEW.md`
- `.planning/phases/11-renderer-behavior-audit/11-VERIFICATION.md`
- `.planning/phases/11-renderer-behavior-audit/11-UAT.md`
- `.planning/phases/11-renderer-behavior-audit/evidence/renderer/NOTES.md`
- `.planning/phases/11-renderer-behavior-audit/evidence/final/NOTES.md`
- `docs/UPSTREAM-SYNC.md`

</canonical_refs>

<specifics>
## Specific Ideas

- Phase 12 should re-run or refresh `e2e/flashquery-visual-evidence.spec.ts` so T-A-005..T-A-009 are current on the post-Phase-11 tree.
- Phase 12 should treat `9ea8768` Phase 11 gap fixes as the current renderer baseline, especially the direct `T-U-011`, `T-U-012`, and `T-U-015` component coverage.
- Phase 12 should explicitly close the `REQ-013` carry-forward by recording `T-M-002` upstream editor-fix coexistence smoke, not by relying only on Phase 11 editor URI/save proof.
- Phase 12 should create fresh evidence notes under `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/`, `evidence/upstream-smoke/`, and `evidence/final/`.
- Phase 12 should explicitly re-check removed-file state for `src/main/templates/skillTemplate.ts` and `src/renderer/canvas/BulkActionChip.tsx`; either retained/removed state is acceptable only with a documented rationale and no dangling imports.
- Phase 12 should not mark T-A-011 required unless packaging/Electron dependencies or packaging config changed during this phase; if unchanged, record the conditional non-run rationale.

</specifics>

<deferred>
## Deferred Ideas

- Final product acceptance, provenance, runbook, `.planning/` tracking, and release readiness beyond this audit slice remain Phase 13-style work unless Phase 12 uncovers a direct blocker.
- New FlashQuery features and release/version bump work remain out of scope.

</deferred>

---

*Phase: 12-upstream-value-visual-evidence-audit*
*Context gathered: 2026-06-01 via product-doc and planning-artifact review*
