# Phase 21: Cross-Surface Hardening and Regression - Context

**Gathered:** 2026-06-04
**Status:** Ready for planning
**Source:** Product-doc express path from user-supplied Milestone 2 requirements and test plan

<domain>
## Phase Boundary

Phase 21 implements `REQ-020` and closes the v1.2 FlashQuery Milestone 2 regression surface. It proves that refresh, frontmatter save, vault search, Pi `@` mention cache loading, clipboard reference actions, and Pi extension tools handle disconnected, reconnecting, workspace-switch, stale-cache, in-flight, error, visual, and final verification states consistently.

This phase is primarily hardening, evidence, and closeout work. It may fix defects discovered by the matrix, but it must not expand product scope beyond Milestone 2. New document-centric AI surfaces, FlashQuery-as-provider flows, Cate macro launchers, rich reference chips, and push-driven vault invalidation remain out of scope.
</domain>

<decisions>
## Implementation Decisions

### Source Priority
- D-01: Downstream research, planning, implementation, verification, review, and closeout agents MUST read the product requirements and test plan listed in `<canonical_refs>` before answering scope questions, editing code, deciding acceptance coverage, or evaluating completion.
- D-02: The Milestone 2 requirements document is the product source of truth for `REQ-020` behavior and for cross-surface invariants inherited from `REQ-001` through `REQ-019`.
- D-03: The Milestone 2 test plan is the source of truth for targeted test IDs, manual checks, and final preflight expectations.
- D-04: Cate `.planning/ROADMAP.md` maps Phase 21 to `REQ-020`; prior phase summaries describe current implementation and known evidence blockers.

### Cross-Surface Behavior
- D-05: Disconnected FlashQuery surfaces must fail visibly, not silently succeed.
- D-06: Reconnect must re-enable controls and refresh connection-scoped caches where the product docs require it.
- D-07: Workspace switch must clear stale workspace data before loading replacement data.
- D-08: Superseded in-flight vault-index/cache refreshes must not repopulate stale data after a later fetch, clear, disconnect, or workspace switch.
- D-09: FlashQuery transport, validation, or tool errors must surface in the right UI layer: inline renderer errors for editor/search/cache surfaces, and Pi tool/system messages for agent-tool surfaces.
- D-10: Clipboard actions must not pretend to require a live FlashQuery round-trip if the already-open document path is locally known, but disabled or unavailable workspace states must still be explicit and tested per current implementation behavior.

### Evidence And Closeout
- D-11: Phase 21 must reconcile existing automated E2E files instead of creating a duplicate mega-suite unless the existing structure cannot express a required assertion.
- D-12: `e2e/fixtures/flashquery-server.ts` is the deterministic fixture owner for frontmatter, search, vault index, disconnect, registry, and write-payload assertions.
- D-13: `T-E-001` through `T-E-007` should remain traceable in test titles or nearby assertions.
- D-14: `T-U-021` must explicitly cover shared connection-state behavior for disabled/error states, stale vault-index clearing, loading state, last-fetch-wins, and workspace-switch refetching.
- D-15: `T-M-001`, `T-M-002`, `T-M-003`, and `T-M-004` must be recorded honestly as passed with concrete evidence or blocked with exact missing prerequisites. Blocked manual checks are acceptable only when the blocker is explicit.
- D-16: Final closeout must run targeted suites, `npm run typecheck`, and `npm run preflight` where practical. If `preflight` or real integration checks cannot run locally, record the skipped or blocked portion.
- D-17: Evidence and UAT docs must not include bearer tokens, provider keys, handoff files, request headers, endpoint secrets, cookies, or raw credential-bearing diagnostics.
- D-18: Milestone UI polish must be checked against the Milestone 2 UI Spec where applicable without inventing new visual language outside Cate's existing panel and Pi ToolCard conventions.

### the agent's Discretion
- D-19: The exact grouping of additional component tests versus E2E assertions is at the implementation agent's discretion, provided every Phase 21 success criterion and linked test ID is covered.
- D-20: Defect fixes discovered during hardening may be implemented in the smallest owning module, but unrelated refactors and new product flows should be deferred.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Source Of Truth
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md` - Defines `REQ-020`, security/workspace/product invariants, cross-surface degradation behavior, and Milestone 2 out-of-scope boundaries.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md` - Defines `T-U-015`, `T-U-021`, `T-E-001` through `T-E-007`, `T-M-001` through `T-M-004`, `npm run typecheck`, and `npm run preflight` expectations.

### Cate Planning Context
- `.planning/ROADMAP.md` - Phase 21 goal, `REQ-020` mapping, and success criteria.
- `.planning/REQUIREMENTS.md` - v1.2 requirement traceability preserving product `REQ-###` IDs.
- `.planning/STATE.md` - Current milestone state and latest handoff notes.
- `.planning/phases/17-flashquery-pi-extension-bootstrap/17-03-SUMMARY.md` - Workspace-generation lifecycle, stale-tool handling, and blocked `T-M-001` evidence.
- `.planning/phases/18-call-model-call-macro-and-diagnostics-data/18-03-SUMMARY.md` - `call_model`/`call_macro` diagnostics preservation and manual evidence conventions.
- `.planning/phases/19-pi-toolcard-observability-rendering/19-02-SUMMARY.md` - `T-E-006` ToolCard E2E evidence and blocked/passed `T-M-003` status conventions.
- `.planning/phases/20-pi-mentions-and-clipboard-utilities/20-04-SUMMARY.md` - `T-E-004` mention E2E evidence, `T-E-003` clipboard preservation, and blocked `T-M-004` native clipboard verification.

### Expected Code And Test Areas
- `src/agent/extensions/cate-flashquery/lifecycle.ts` and `src/agent/extensions/cate-flashquery/lifecycle.test.ts` - Workspace rebind, metadata refresh, stale tool ownership, and `T-U-015`.
- `src/agent/renderer/agentStore.ts`, `src/agent/renderer/agentStore.test.ts`, `src/agent/renderer/AgentPanel.tsx`, and `src/agent/renderer/AgentChatInput.atMention.test.tsx` - Vault-index cache, disconnect/reconnect/switch behavior, and `@` mention state.
- `src/renderer/panels/EditorPanel.tsx` and `src/renderer/panels/EditorPanel.test.tsx` - Refresh/frontmatter disconnected, not-found, invalid YAML, write failure, and dirty-state behavior.
- `src/renderer/panels/FlashQueryVaultSearchPanel.tsx` and `src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` - Search disconnected, in-flight, stale-result, clipboard, pagination, and result rendering behavior.
- `src/renderer/panels/FlashQueryVaultPanel.tsx` and `src/renderer/panels/FlashQueryVaultPanel.test.tsx` - Vault tree refresh, copy actions, and cache refresh triggers.
- `src/shared/flashqueryUri.ts`, `src/main/flashquery/clientManager.ts`, `src/main/ipc/flashquery.ts`, `src/preload/index.ts`, and `src/shared/electron-api.d.ts` - Shared contracts that must remain compatible during hardening.
- `e2e/fixtures/flashquery-server.ts` - Deterministic fixture for document body/frontmatter, search, vault index, registry, disconnect, write payload assertions, and error injection.
- `e2e/flashquery-editor-refresh-frontmatter.spec.ts` - `T-E-001` and `T-E-002`.
- `e2e/flashquery-vault-search.spec.ts` - `T-E-003` and search portions of `T-E-007`.
- `e2e/flashquery-pi-mentions.spec.ts` - `T-E-004` and mention-cache portions of `T-E-007`.
- `e2e/flashquery-pi-extension.spec.ts` - `T-E-005`.
- `e2e/flashquery-pi-diagnostics.spec.ts` - `T-E-006`.
- `e2e/flashquery-disconnect.spec.ts` - Legacy disconnect/retry coverage to reconcile with `T-E-007`.
- `e2e/flashquery-visual-evidence.spec.ts` and evidence folders under `.planning/phases/*/evidence/visual/` - Existing visual-evidence conventions.
</canonical_refs>

<specifics>
## Specific Ideas

- Add or extend `T-U-021` where the connection-state behavior is easiest to prove deterministically: `agentStore`, `AgentPanel`, search panel, editor panel, and extension lifecycle tests.
- Keep E2E coverage distributed by surface but add one Phase 21 matrix/UAT doc that maps every required state to the test that proves it.
- The final closeout plan should produce `21-UAT.md` and `21-VERIFICATION.md`; these docs should name any blocked manual checks rather than burying them in prose.
- Existing Phase 20 summary says `T-M-004` is blocked pending human native macOS clipboard verification. Phase 21 should either close it with pasted values or keep it blocked with exact prerequisites.
- Existing Phase 17 summary says live `T-M-001` needs a real FlashQuery HTTP MCP endpoint and configured Pi provider. Phase 21 should revisit this and record the result honestly.
</specifics>

<deferred>
## Deferred Ideas

- Push-notification-driven vault cache invalidation remains deferred until FlashQuery push notifications exist.
- A Cate-level macro launcher, FlashQuery Pi provider, rich-input document chips, document-centric AI palettes, and synthetic teams remain out of scope.
- Full live brokered MCP coverage beyond the product test plan's manual checks remains outside automated Phase 21 scope.
</deferred>

---

*Phase: 21-cross-surface-hardening-and-regression*
*Context gathered: 2026-06-04 via product-doc express path*
