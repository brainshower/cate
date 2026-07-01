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

## Milestone: v1.3 — Document Outline

**Shipped:** 2026-06-16
**Phases:** 2 | **Plans:** 8 | **Requirements:** 22

### What Was Built

- A registered `outline` panel type wired through shared panel metadata, renderer registry, app-store creation, and right-dock placement.
- An editor toolbar Outline toggle adjacent to Preview, hidden in diff mode and associated with the source editor panel for precise close behavior.
- A pure heading parser for Markdown, HTML headings, and code comment section markers with inline Markdown stripping, depth filtering, setext support, and frontmatter skipping.
- A React Outline panel that binds to the active Monaco editor, tracks active heading state, live-updates on editor/model changes, supports search highlighting, clear, and Enter-to-cycle behavior.
- Markdown preview heading IDs using a shared slug helper with deterministic duplicate suffixes.
- Outline navigation that routes to source-mode Monaco or Markdown preview depending on current editor state, with hardened duplicate-heading occurrence targeting.

### What Worked

- The two-phase split was the right size: Phase 22 delivered the panel, parser, source navigation, and search; Phase 23 then added preview IDs, preview routing, and final hardening.
- Keeping parser and slug logic pure made the hardest edge cases cheap to verify: duplicates, inline formatting, setext headings, frontmatter, and depth filtering.
- The post-phase gap document was useful when treated as historical evidence rather than current truth. Resolved gaps could be rechecked quickly against HEAD.
- Product-owner clarification corrected the audit result without touching stable code. Source-mode persistent highlight and current preview timing are accepted behavior, not defects.

### What Was Inefficient

- Older phase prose and tests still described a 1.5s standalone flash cleanup after the accepted behavior shifted toward persistent selected-heading styling. That wording caused a false audit gap.
- The first milestone audit over-weighted artifact wording before reconciling it with current code and product intent.
- Preview highlight timing proved hard to improve through agent iteration; accepting the current behavior avoided more churn on a usable interaction.

### Patterns Established

- For audit conflicts, current code plus explicit product clarification outranks stale phase wording.
- Duplicate preview routing must compute occurrence indexes from full-depth source heading order, not the currently visible Outline depth.
- Source-mode Outline target highlight should persist until natural user editing clears it.
- Preview-mode Outline target highlight is allowed to appear quickly before/during scroll and keep the current lifecycle.

### Key Lessons

1. Milestone audits should inspect actual code and tests, then classify old gap docs as historical claims to verify, not final truth.
2. When a behavior is intentionally accepted after failed improvement attempts, record that clarification in the audit artifact immediately.
3. A test that asserts persistent highlight behavior is not wrong if the product intent now favors persistence; the requirement language needs to move with the intent.
4. Depth-filtered UI state can diverge from rendered Markdown preview IDs; preview routing should use the rendered/full source heading sequence.

### Cost Observations

- Model mix: primary work used high-capability coding agents, with focused verifier/audit passes for phase and milestone checks.
- Sessions: multiple sessions from 2026-06-14 through 2026-06-16.
- Notable: The final close-out cost was dominated by resolving documentation drift around REQ-018, not by code changes.

---

## Milestone: v1.5 — Browser Uplift

**Shipped:** 2026-06-30
**Phases:** 1 | **Plans:** 10 | **Tasks:** 18

### What Was Built

- Workspace-scoped durable Electron browser partitions with fail-closed BrowserPanel mounting across main, canvas, docked, and detached browser surfaces.
- Main-frame-only load-error handling, reloadable crash recovery, and focused-webview browser shortcut forwarding.
- Modular screenshot capture IPC preserving Desktop PNG output, `{ filePath, dataUrl }`, guest ownership checks, and screenshot drag/drop usability.
- Workspace-keyed browser history, bookmarks, bookmarks bar, star toggle, browser menu/settings controls, and scoped clear-data behavior.
- Workspace removal cleanup and clear-data paths that leave FlashQuery credentials, connection metadata, vault documents, indexes, and MCP sessions untouched.
- Browser Uplift E2E plus FlashQuery persistence regression coverage, with a deterministic fake-auth restart/isolation path standing in for automated persistence checks.

### What Worked

- One GSD phase was the right shape for this milestone because the browser work shared one IPC/preload/state boundary.
- Tests landing with each source slice kept the final verification wave from becoming a catch-up phase.
- The post-phase gap analysis paid for itself: it found real issues after apparent completion and kept the final milestone from shipping with hidden traceability drift.
- Keeping homepage/search controls in the Settings window and clear-data non-reloading avoided duplicate browser configuration surfaces and surprising live-panel behavior.

### What Was Inefficient

- `STATE.md` and `ROADMAP.md` lagged behind after 26-10 landed, so the repo looked 90% complete even though automated verification had passed.
- No canonical `v1.5-MILESTONE-AUDIT.md` was produced before closeout; the product gap analysis became the practical audit evidence instead.
- `T-M-001` is intentionally human-only, but leaving it in the same success-criteria row as automated coverage made the completion state look ambiguous.
- The screenshot drop issue was pre-existing, but it surfaced on a Phase 26-touched surface and had to be diagnosed during closeout.

### Patterns Established

- Browser state uses `workspaceId` as a scope key while remaining separate from FlashQuery state and credentials.
- Browser shortcut forwarding should route by guest `webContentsId`, with focus as a secondary guard rather than the primary identity check.
- Browser screenshots can preserve Desktop file output while carrying an in-memory data URL through drag/drop to avoid widening filesystem trust roots.
- Post-phase gap docs should be treated as first-class closeout artifacts when they enumerate requirements, fixes, and auditor verification.

### Key Lessons

1. A milestone can be implementation-complete and still not closeout-complete until gap analysis, metadata, and manual evidence are reconciled.
2. For Electron browser work, local deterministic E2E fixtures are essential, but they do not replace human checks for real third-party login persistence.
3. Workspace scoping must be visible in tests, not merely implied by store shape or panel props.
4. If a test ID is listed in requirements traceability, a matching test name should exist; truthful traceability matters as much as behavior.

### Cost Observations

- Model mix: high-capability coding agents for implementation and gap remediation; focused audit/debug passes for closeout evidence.
- Sessions: concentrated on 2026-06-26, with milestone archive completed 2026-06-30.
- Notable: The final closeout cost came from reconciling generated planning state with the real gap-check result, not from production code changes.

---

## Milestone: v1.6 — Graph Intelligence Monaco Side Panel

**Shipped:** 2026-07-01
**Phases:** 2 | **Plans:** 7 | **Tasks:** 19

### What Was Built

- Graph-aware FlashQuery document connection contracts carrying relation metadata, graph summaries, source chunks, target health fields, optional scores, and credential-safe diagnostics across shared/main/preload/renderer boundaries.
- A typed `query_graph` Electron bridge with provider mode derivation, preview chunk mapping, progressive node metadata backfill, and edge metadata overlay support.
- Whole-document graph triage in the Semantic Connections panel: Summary, attention rows, graph-enhanced sections, grouped typed connections, Top-N/filter scoping, and source-section navigation.
- Section selection detail with status notes, ordered string claims, claim-linked active edges, General connections, expandable edge rows, readable qualifier/metadata prose, and preserved target-opening routes.
- Renderer-local text filtering over loaded graph data, with separate filter/config dock chrome state and stable pre-filter connection counts.
- Deterministic Electron graph/inspector coverage that proves the completed workflow without live FlashQuery credentials.

### What Worked

- The two-phase grouping matched the product source phases well: Phase 27 established the contract and whole-document surface, while Phase 28 deepened section detail, filtering, chrome, and E2E.
- Preserving the product `REQ-###` and test IDs made the gap analysis and milestone audit much easier to reconcile against code and test evidence.
- The graph provider boundary absorbed partial/malformed data cleanly. Node/edge enrichment could degrade per chunk or edge without blanking useful base `get_document` rows.
- The post-audit tech-debt cleanup was worth doing before archive: Node enforcement, lint, skipped tests, Nyquist metadata, and build warnings all ended in a clean closeout state.

### What Was Inefficient

- Phase 27 left a stale HUMAN-UAT/VERIFICATION human-needed artifact even after the final milestone audit and E2E evidence superseded it. Closeout had to normalize that artifact before archive.
- Temporary phase-specific npm scripts (`test:phase27:ids`, `test:phase28:ids`) helped during gap closeout but cluttered package scripts and were removed once normal suites became authoritative.
- Build warning cleanup exposed several mixed static/dynamic import boundaries late in closeout. The actual fix was small, but it required care around store/filesystem/sentry cycles.

### Patterns Established

- Use deterministic renderer/Electron graph fixtures for Cate-side graph workflows; live FlashQuery graph generation remains outside Cate milestone verification.
- Keep optional graph enrichment as additive overlay data. Base document connections should remain useful when node or edge metadata is missing or malformed.
- Use small neutral state modules when a store needs cleanup access to hook-owned module state; avoid importing React hook modules into stores.
- Sidebar-mounted panel components can reuse the lazy panel registry component instead of statically importing the same panel and defeating chunk splitting.

### Key Lessons

1. Milestone audits can supersede earlier human-needed artifacts, but the source artifact should be updated so closeout tooling does not keep reporting stale work.
2. Normal full-suite commands should become authoritative after temporary traceability guards have served their purpose.
3. Vite mixed import warnings are usually a real architecture smell: either the lazy boundary is illusory, or a cycle-sensitive callback boundary is needed.
4. Graph UI should treat structured data as progressive: preserve valid rows, redact diagnostics, and make optional metadata enrich rather than gate rendering.

### Cost Observations

- Model mix: high-capability coding/audit agents for implementation, gap remediation, and repo-wide tech-debt cleanup.
- Sessions: concentrated from 2026-06-30 through 2026-07-01.
- Notable: Final closeout included a full repo hygiene sweep, so archive readiness required more than feature verification: lint/type/unit/E2E/build all ended green under Node 20 with no skipped tests and no build warnings.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Plans | Tasks | Key Change |
|-----------|----------|--------|-------|-------|------------|
| v1.0 | multi-session over 2 days | 7 | 23 | 61 | First milestone in this project; established the /gsd workflow chain end-to-end, the post-execution gap-and-resolution Gaps.md pattern, and the retroactive close-out discipline. |
| v1.3 | multiple sessions over 3 days | 2 | 8 | n/a | Document Outline shipped as a focused two-phase feature; audit process learned to reconcile stale artifact wording with current code and explicit product clarification. |
| v1.5 | concentrated implementation plus gap closeout | 1 | 10 | 18 | Browser Uplift proved one phase can work when sub-slices share a boundary; post-phase gap analysis became the decisive closeout artifact. |
| v1.6 | concentrated implementation plus tech-debt closeout | 2 | 7 | 19 | Graph Intelligence proved source phases can be bundled into two vertical GSD phases while preserving product REQ/test traceability and ending with full-suite/no-warning hygiene. |

### Cumulative Quality

| Milestone | Source files added | Test files added | LOC added (src/) | E2E specs added | Notable |
|-----------|--------------------|--------------------|------------------|------------------|---------|
| v1.0 | 18 net new FlashQuery-touching files (51 src/ touched total) | 9 new test files | ~6,800 | 4 (`flashquery-happy-path`, `flashquery-disconnect`, `flashquery-persistence`, `flashquery-vault-browse`) + 1 fixture (`flashquery-server.spec.ts`) | Full v1 user journey covered E2E; integration audit returned WIRED across all 8 cross-cutting flows |
| v1.3 | focused Outline/editor/preview files | focused parser, registry, OutlinePanel, and EditorPanel tests | n/a | 0 | 22/22 requirements satisfied; focused integration run passed 92 tests after audit clarification. |
| v1.5 | focused browser, IPC, settings, and E2E harness files | browser partition/state/menu/panel/capture/security tests | n/a | Browser Uplift spec + FlashQuery persistence smoke | Automated verification passed after gap remediation; `T-M-001` remains human-only manual-pending evidence. |
| v1.6 | semantic connection provider/panel, FlashQuery IPC, graph helpers, and E2E harness files | graph contract/provider/panel/main/preload tests plus repo hygiene tests | n/a | Graph Semantic Connections E2E + inspector coverage | 23/23 requirements satisfied; lint, typecheck, unit, E2E, and build passed under Node 20 with 0 skipped tests and no Vite warnings. |

### Recurring Themes (to watch in v1.1+)

- **Documentation discipline at phase exit.** Will v1.1 phases produce VERIFICATION + VALIDATION + traceability checkbox flips contemporaneously, or will they drift again?
- **Live-app testing as first-class verification.** Did v1.0's hard-won lesson translate into v1.1's plan ("budget for in-app testing in each plan's Verification gate")?
- **Renderer-safety audits of `src/shared/`.** Did v1.1 ship anything in `src/shared/` that depends on Node globals?
- **Debt closure.** Did Debt-01 (REQ-035.3 spec drift) and Debt-02 (T-M-002..007 visual-fidelity) get addressed?

---
*Living document — appended to at each milestone completion.*
