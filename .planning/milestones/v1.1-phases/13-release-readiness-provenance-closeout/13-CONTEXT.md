# Phase 13: Release Readiness + Provenance Closeout - Context

**Gathered:** 2026-06-01
**Status:** Ready for planning
**Source:** Product upstream-sync requirements/test plan, completed Phase 8-12 evidence, and Cate `.planning/` state

<domain>
## Phase Boundary

Phase 13 is the final post-handoff release-readiness and provenance closeout pass for the completed `v1.1.0` upstream sync. It does not start another upstream merge, replay Phase 8-12 audits, pull unreleased upstream commits, or cut a product release. It proves that the final mainline state is ready to hand to the next release workflow by reconciling product acceptance, process/provenance gates, runbook completeness, `.planning/` tracking, and the final cumulative command matrix.

</domain>

<decisions>
## Implementation Decisions

### Mandatory Source Docs

- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` before making behavior, scope, provenance, acceptance, or remediation decisions.
- Downstream agents MUST read `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` before making verification, test-ID, evidence, or pass/fail decisions.
- If product docs and local planning artifacts disagree, the requirements document controls behavior and the test plan controls verification IDs and acceptance.

### Phase Shape

- Phase 13 is a post-handoff audit/remediation phase on the current mainline tree.
- Prefer evidence, targeted notes, and focused remediation over broad refactors.
- Code changes are allowed only when the acceptance/provenance audit finds a real gap in the shipped upstream-sync obligations.
- Do not perform release/version bump work, publish artifacts, rewrite upstream history, squash/rebase the upstream sync, or alter FlashQuery MCP server contracts.

### Phase 12 Gap-Fix Baseline

- Commit `a8b21fe` (`fix(phase12): close upstream value evidence gaps`) is the current Phase 12 baseline for Phase 13 planning.
- Commit `2d7a5cd` (`Gate FlashQuery E2E status listener`) updates that baseline by gating the deterministic visual-status event listener behind `window.electronAPI.isE2E`; Phase 13 agents should treat the status-injection helper as E2E-only, not a production renderer API.
- Commit `6f74e44` (`Correct file exclusion evidence citation`) updates the Phase 12 T-M-003 evidence: file exclusions are read main-side through `getSettingSync('fileExclusions')` and honored by filesystem explorer/search/watch paths; Phase 13 should cite the corrected evidence, not the older bridge wording.
- The Phase 12 gap fix added focused live/connecting/disconnected status-chip screenshots in both themes for T-A-008.
- The visual E2E now dispatches `cate:e2e-flashquery-status` to render deterministic status-chip states inside the real `FlashQueryVaultPanel`, but only when `window.electronAPI.isE2E` is true.
- Phase 12 verification now includes REQ-003 and T-M-005 static/headless smoke evidence for upstream agent/provider UI refactor retention and FlashQuery panel non-regression.
- Phase 12 T-M-001, T-M-002, T-M-003, and T-M-005 are accepted as static/headless smoke evidence; Phase 13 T-A-010 must not silently convert those into observed manual UI smoke.
- Running the full E2E suite in Phase 13 may refresh visual evidence files. `e2e/flashquery-visual-evidence.spec.ts` now writes Phase 13-owned evidence under `.planning/phases/13-release-readiness-provenance-closeout/evidence/visual/` and refreshes the Phase 12 evidence directory for continuity. Treat refreshes as expected and record them in Phase 13 notes if they occur.

### Requirements In Scope

- REQ-021 keeps `.planning/` tracked and avoids broad `.claude/` ignore changes.
- REQ-022 keeps visual evidence complete and reviewed for vault badge, sidebar vault view, connection dialog, status chip, and editor tabs in light and dark themes.
- REQ-023 keeps `docs/UPSTREAM-SYNC.md` tracked and complete with runbook, protected-surface inventory, and append-only sync ledger.
- REQ-024 proves the full verification matrix passes.
- REQ-025 proves cumulative regression gates did not regress previously green behavior.
- REQ-026 proves upstream-sync provenance via real merge ancestry, advanced merge-base, behind-count 0, and ledger entry.
- Supporting acceptance coverage for REQ-011 through REQ-016 is handled through T-A-010 product acceptance smoke.

### Tests In Scope

- T-A-002 cumulative exit gate.
- T-A-005 through T-A-009 visual evidence and recorded review for the final Phase 13 tree.
- T-A-010 product acceptance checklist.
- T-A-011 packaged-app smoke remains conditional and not required when Phase 13 makes no packaging/Electron dependency changes.
- T-A-012 conflict-hunk review record.
- T-A-013 `.planning/` tracking intact.
- T-A-014 future-sync runbook + surface inventory.
- T-A-015 upstream-sync provenance.
- T-E-001 through T-E-005 as acceptance-supporting Electron evidence.
- Final commands: `npm run build`, `npm run typecheck`, `npm test`, and `npm run test:e2e`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read the product docs before planning or implementing.**

### Product Source Of Truth

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Requirements.md` - authoritative behavior, invariants, and requirement IDs.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Upstream Sync Report (30-May-2026)/Upstream Sync Test Plan.md` - authoritative verification layers, test IDs, evidence requirements, and pass criteria.

### Local Planning References

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/08-upstream-sync-v1-1-0/08-VERIFICATION.md`
- `.planning/phases/09-upstream-sync-mainline-handoff/09-VERIFICATION.md`
- `.planning/phases/10-shared-contracts-audit/10-VERIFICATION.md`
- `.planning/phases/11-renderer-behavior-audit/11-VERIFICATION.md`
- `.planning/phases/12-upstream-value-visual-evidence-audit/12-VERIFICATION.md`
- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/final/`
- `.planning/phases/12-upstream-value-visual-evidence-audit/evidence/visual/REVIEW.md`
- `e2e/flashquery-visual-evidence.spec.ts`
- `src/renderer/panels/FlashQueryVaultPanel.tsx`
- `docs/UPSTREAM-SYNC.md`
- `.gitignore`

</canonical_refs>

<specifics>
## Specific Ideas

- Phase 13 should write evidence under `.planning/phases/13-release-readiness-provenance-closeout/evidence/acceptance/`, `evidence/provenance/`, and `evidence/final/`.
- Phase 13 should use Phase 12 evidence as the current visual/upstream-smoke baseline, not older Phase 8 screenshots unless explicitly labeled as supporting history.
- Phase 13 should treat the focused Phase 12 status-chip captures as the current T-A-008 baseline and should mention them if final E2E refreshes those files.
- Phase 13 should preserve the distinction between static/headless smoke evidence and manual UI smoke when writing T-A-010 acceptance rows.
- Phase 13 should include the `window.electronAPI.isE2E` gate when summarizing the status-chip visual helper, because it prevents the Phase 12 evidence hook from becoming a normal production listener.
- Phase 13 should use the corrected T-M-003 file-exclusion evidence citation from Phase 12 when reconciling upstream-value supporting history.
- T-A-010 should be recorded as a manual/product acceptance checklist that references concrete E2E logs where automation covers the step.
- T-A-012 through T-A-015 should be rechecked on the current tree, even if Phase 9 already passed them, because Phase 13 is the final closeout pass.
- Final closeout should update planning state only after acceptance, provenance, and final command evidence pass.

</specifics>

<deferred>
## Deferred Ideas

- Release/version bump, package publication, and user-facing release notes are deferred to a separate release workflow.
- Future upstream tags beyond `v1.1.0` remain out of scope.

</deferred>

---

*Phase: 13-release-readiness-provenance-closeout*
*Context gathered: 2026-06-01 via product-doc and planning-artifact review*
