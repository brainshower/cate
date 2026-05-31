# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Vault Connect, Read, Edit

**Shipped:** 2026-05-30
**Phases:** 7 | **Plans:** 23 | **Tasks:** 61 | **Sessions:** multiple over 2 days

### What Was Built

- **Foundation (Phase 1):** Per-workspace `flashqueryConnection` metadata, main-process bearer-token helpers, FlashQuery vault URI parser/builder, and inert `FlashQueryClientManager` skeleton — no eager network.
- **Connection Layer (Phase 2):** `GET /mcp/info` public probe (no bearer), connecting/live/disconnected state machine, exponential backoff retry, manual retry, dispose-safe cleanup, generic subscription surface (`status` + future `vault-changed` / `tools-changed`).
- **IPC Surface (Phase 3):** Typed `flashquery:setConnection / listVault / getDocument / writeDocument / probe / retry / status` channels with preload bridges and main-process validation. Body-only reads, update-only writes.
- **Vault Panel + Shared Chip (Phase 4):** Registered `flashqueryVault` panel type, lazy folder tree, five panel states, refresh affordance, single-mount-per-workspace context-menu invariant (Open + Open on Canvas only), reusable `Chip` primitive used by both panel header and editor badge.
- **Settings Dialog + Workspace Menu (Phase 5):** First-time-setup and edit-mode dialog with URL/token fields, reveal/hide, dry-run probe, save, cancel, remove. Workspace right-click context menu entry. Bearer token boundary tightened post-Gap-4 (renderer → main only; `preserveExistingToken: true` for blank-edit save).
- **Editor URI-Awareness + Vault Badge (Phase 6):** `EditorPanel` recognizes `flashquery://` URIs, routes reads through `flashquery:getDocument`, saves through `flashquery:writeDocument`, gates Git diff mode off, renders inert `Vault · <host>` badge with U+00B7 separator and decoded path tooltip. Vault unsaved buffers stay in Monaco memory only.
- **Cross-Cutting + Regression (Phase 7):** Deterministic FlashQuery MCP stub server (`e2e/fixtures/flashquery-server.ts`) with caller-provided bearer validation, restart-capable `launchApp({ userDataDir })`, four FlashQuery E2E specs (`happy-path`, `disconnect`, `persistence`, `vault-browse`), automated design-token enforcement, manual T-M-001 design-token review (T-M-002..007 deferred per Debt-02). Final full-suite green under Node 22.
- **Post-milestone scope expansion:** FlashQuery Vault as a first-class left-sidebar view (`71659cd`) alongside the existing panel-type registration.

### What Worked

- **The /gsd workflow chain.** `discuss-phase → plan-phase → execute-phase → verify-phase → audit-milestone → complete-milestone` was disciplined enough to surface the late documentation drift (missing VERIFICATION.md, stale traceability table, deferred human UAT) at the right time — during audit, not after release.
- **Living `Gaps.md` document** with per-gap `Auditor Verification` sections. Made it possible to write a gap, fix it, audit the fix, and trace the lineage in one place without scattering context across PR descriptions.
- **Phase-level test files surviving across phases.** `clientManager.test.ts` started in Phase 1 (10 tests) and grew to 37 tests through Phase 2/3/4 without restructuring. Same pattern for `flashquery.test.ts` (IPC) and `FlashQueryVaultPanel.test.tsx`. Single per-area test file beats per-plan splinters.
- **Body-only / update-only contract enforcement at the manager boundary.** Phase 3 wrote write/read with explicit allow-lists (`include: ['body']`, `mode: 'update'`, only `identifier` + `content`). Phase 6 inherited this without needing to re-litigate. Negative-grep test pattern (assert that a forbidden field never appears in the constructed payload) caught Phase 7 Gap 7 (Test Connection didn't authenticate) early when extended to the new auth probe.
- **Live testing as the visual-regression substitute.** v1.0 chose not to add Percy/Chromatic. The 2026-05-30 close-out testing session in the real Electron window surfaced three vault-tab layout regressions (Gaps 9/10/11) in ~15 minutes — faster than building visual-regression infra would have taken, and produced concrete fix-on-the-spot commits.
- **Reusable `ChipSurface`** powered both the panel-header status chip AND the editor vault badge. Phase 4's chip primitive was inherited by Phase 6's badge without modification — exactly the goal of a shared component.

### What Was Inefficient

- **Documentation drift at phase exit.** Five phases shipped without authoring `VERIFICATION.md` / `VALIDATION.md` per the workflow template. Phases 1 and 3 had no VERIFICATION; Phase 4 had `status: human_needed` that never closed; Phase 7's VALIDATION sat in `status: draft` despite Wave 0 shipping. All caught and closed during milestone audit close-out, but it took ~1 hour of retroactive consolidation that wouldn't have been needed if each phase exit had touched the standard artifacts.
- **Traceability table in `REQUIREMENTS.md` never updated as phases shipped.** All 41 REQs ended up `[x]` correctly only because the audit close-out flipped them in bulk. A simple `[x]`-update-on-phase-complete habit would have saved the bulk flip.
- **Tools assumed cross-platform compatibility.** `src/shared/pathUtils.ts` had `process.platform === 'win32'` in shared code that ran in both main AND renderer. Renderer doesn't have Node's `process` — the bug stayed latent until Monaco's first-use lazy reoptimization forced a renderer reload during testing. Should have been caught by a renderer-side test or a static check; only surfaced via live use.
- **Test Connection UX trap from inheriting public-probe semantics.** Phase 7 Plan 07-01 correctly made the manager's lazy-reconnect probe public (no bearer). Applying the same to the dialog's `flashquery:probe` IPC was a sensible code reuse decision but produced a misleading "Connected" indicator when the user typed a wrong token. Cost ~10 minutes of cross-process log triage during live testing to disambiguate "is the token wrong" from "is the URL wrong" before the diagnosis landed.
- **`createFlashQueryVault` had no production UI launcher** until post-milestone Gap 6 (`6445909`). The E2E happy-path test bypassed every potential UI entry point via the harness, so the missing launcher wasn't visible until live use. **Lesson:** if a panel type exists, at least one production UI surface should mount it; the harness should NOT be the only invoker.
- **Vite + Monaco lazy reoptimization triggered a session-restore crash via the `pathUtils` bug.** Workflow combines fine independently — but discovering this only via live testing means E2E specs should include "force-reload after Monaco first use" coverage in future milestones touching session restore.

### Patterns Established

- **Auditor Verification sub-section in Gaps.md.** Every gap gets an audit by a second LLM that independently verifies the fix against current source. Catches the failure mode where the dev agent says "fixed" but actually left a hole.
- **Sentinel `panelId` for sidebar-mounted panel components.** When a panel component is mounted in a context that doesn't have a real registered panelId (like the left sidebar), use a stable string sentinel (`"sidebar-flashquery-vault"`) and verify the component doesn't read `panelId`. Document the contract inline.
- **Per-phase `audit_source: retroactive` in VERIFICATION/VALIDATION frontmatter.** When a milestone-close audit authors these artifacts retroactively, declare it so future readers don't mistake them for contemporaneous documents.
- **`MANUAL-DEFERRED` status** for visual-fidelity tests that should have been done but were deferred due to lacking visual-regression infrastructure. Captures the gap honestly without false `PASS` claims.
- **Debt entries with bounded rationale.** [[debt-01]] and [[debt-02]] in Gaps.md follow a structure: status / where / why / ramifications / mitigations / when-to-revisit. Lets future-LLMs understand the intentional shipped-with-debt decision without re-questioning it.
- **`buildVaultUri` / `parseVaultUri` in `src/shared/`, not `src/main/`.** Phase 4 moved canonical implementation to shared with a main re-export shim. Renderer can now build URIs without importing main code. Pattern for any future URI / data-shape helper that crosses the main/renderer boundary.

### Key Lessons

1. **Live test the milestone before declaring it shipped.** Automated tests caught a lot, but three visual regressions (Gaps 9/10/11), one UX trap (Gap 7), one missing UI surface (Gap 6), and two latent code bugs (Gap 8a/8b) only appeared in live use. Budget for live-app testing as a first-class verification step, not as an afterthought.
2. **Documentation artifacts ship at phase exit, not at milestone close.** Five phases left the standard VERIFICATION/VALIDATION files behind, requiring ~1 hour of retroactive consolidation at milestone close. The fix is process discipline at phase exit, not better tooling at milestone close.
3. **Shared code has multiple runtime contexts.** Anything in `src/shared/` runs in BOTH main and renderer. Audit any Node-global reference (`process`, `Buffer`, `__dirname`) for runtime safety. Add a renderer-side test where it matters.
4. **Single-source-of-truth IPC contracts pay off.** Body-only / update-only / no-frontmatter / no-version-token invariants enforced once at the manager boundary held through all 6 downstream consumers (dialog, panel, editor, sidebar, command palette, e2e harness). Worth the upfront effort.
5. **A vault panel is just a file explorer with a different backend.** Cate already had a sidebar view registry, file explorer, workspace tabs, dock tabs, editor URI handling. The FlashQuery integration was largely "make these existing surfaces work for a second URI scheme." Future integrations (other MCP servers, other data sources) should follow the same pattern: extend, don't replace.
6. **The `gsd-sdk` `audit-open` heuristic can false-positive.** Phase 5 UAT (`status: passed`, 5/5 tests, 0 pending) got flagged anyway. Acknowledged in STATE.md Deferred Items for tool-team review. Don't treat tool-reported gaps as ground truth without inspection.

### Cost Observations

- **Model mix:** Most milestone work was driven by Claude Opus 4.7 (primary developer); subagents (gsd-integration-checker, etc.) used the project-default `balanced` profile.
- **Sessions:** Multiple sessions over ~2 calendar days of execution time (2026-05-28 → 2026-05-30) plus ~3 hours of milestone close-out work on 2026-05-30.
- **Notable:** The audit close-out hour (retroactive VERIFICATION + VALIDATION authoring, HUMAN-UAT update, milestone audit, full close-out workflow) was unusually expensive *because* of the documentation drift surfaced. With the lesson now incorporated into process discipline, future milestones should close faster.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Plans | Tasks | Key Change |
|-----------|----------|--------|-------|-------|------------|
| v1.0 | multi-session over 2 days | 7 | 23 | 61 | First milestone in this project; established the /gsd workflow chain end-to-end, the post-execution gap-and-resolution Gaps.md pattern, and the retroactive close-out discipline. |

### Cumulative Quality

| Milestone | Source files added | Test files added | LOC added (src/) | E2E specs added | Notable |
|-----------|--------------------|--------------------|------------------|------------------|---------|
| v1.0 | 18 net new FlashQuery-touching files (51 src/ touched total) | 9 new test files | ~6,800 | 4 (`flashquery-happy-path`, `flashquery-disconnect`, `flashquery-persistence`, `flashquery-vault-browse`) + 1 fixture (`flashquery-server.spec.ts`) | Full v1 user journey covered E2E; integration audit returned WIRED across all 8 cross-cutting flows |

### Recurring Themes (to watch in v1.1+)

- **Documentation discipline at phase exit.** Will v1.1 phases produce VERIFICATION + VALIDATION + traceability checkbox flips contemporaneously, or will they drift again?
- **Live-app testing as first-class verification.** Did v1.0's hard-won lesson translate into v1.1's plan ("budget for in-app testing in each plan's Verification gate")?
- **Renderer-safety audits of `src/shared/`.** Did v1.1 ship anything in `src/shared/` that depends on Node globals?
- **Debt closure.** Did Debt-01 (REQ-035.3 spec drift) and Debt-02 (T-M-002..007 visual-fidelity) get addressed?

---
*Living document — appended to at each milestone completion.*
