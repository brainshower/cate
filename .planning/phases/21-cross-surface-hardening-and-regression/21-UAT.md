---
phase: 21-cross-surface-hardening-and-regression
status: blocked
created: 2026-06-04
requirements: [REQ-020]
tests: [T-E-001, T-E-002, T-E-003, T-E-004, T-E-005, T-E-006, T-E-006b, T-E-007, T-M-001, T-M-002, T-M-003, T-M-004]
---

# Phase 21 UAT: Cross-Surface Hardening and Regression

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md`
  - REQ-020 and inherited refresh, frontmatter, search, Pi extension, diagnostics, mention, and clipboard invariants.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md`
  - T-E-001 through T-E-007, T-E-006b, and T-M-001 through T-M-004.

## Automated E2E Evidence

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| T-E-001 | REQ-001, REQ-002, REQ-003, REQ-020 | `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts` | passed: editor clean/dirty refresh, not-found failure preservation, disconnected retry batch passed |
| T-E-002 | REQ-004, REQ-005, REQ-006, REQ-007, REQ-020 | same command | passed: frontmatter open/save/invalid YAML/managed-field behavior passed |
| T-E-003 | REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-019, REQ-020 | same command | passed: grouped search, pagination, semantic disabled state, copy path/reference, memory inspector, disconnect/reconnect recovery passed |
| T-E-004 | REQ-018, REQ-020 | same command | passed: Pi `@` reference insertion, cache replacement, disconnect clearing, reconnect repopulation, no footer/chip additions passed |
| T-E-005 | REQ-013, REQ-014, REQ-020 | `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts e2e/flashquery-pi-diagnostics.spec.ts e2e/flashquery-pi-macro-trace.spec.ts` | passed: bundled extension installs and fixture registry fetch occurs at Agent startup |
| T-E-006 | REQ-015, REQ-016, REQ-017 | same command | passed: ToolCard diagnostics render through normal Pi tool messages with no new chat message type |
| T-E-006b | REQ-016, REQ-017 | same command | passed: `call_macro` real response envelope renders `call_macro · 3 steps`, expanded trace rows, and live `partialText` forwarding |
| T-E-007 | REQ-003, REQ-012, REQ-018, REQ-020 | `npm run test:e2e -- e2e/flashquery-disconnect.spec.ts` as part of the focused batch | passed: disconnected controls/errors, cache clearing, retry, and successful reload after reconnect |

Supporting fixture evidence:

- `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` passed 6/6 tests.
- The fixture now supports `setConnected(false)`, `list_vault_index`, frontmatter reads/writes, object write payload inspection, list-all search, document/memory grouped results, registry tools, and not-found/disconnect simulation.
- `npm test -- e2e/fixtures/flashquery-server.spec.ts` is not a valid repo command because `npm test` includes only `src/**/*.test.ts(x)`; the fixture spec is a Playwright spec.

Build evidence:

- `npm run build` passed before the focused Electron E2E runs.

## Manual / Real-Integration Evidence

| ID | Requirement | Status | Evidence or Blocker |
| --- | --- | --- | --- |
| T-M-001 | REQ-013, REQ-014, REQ-020 | blocked | Requires real FlashQuery HTTP MCP endpoint plus configured native Pi provider. Current automated substitutes passed: `T-U-015`, `T-E-005`, and Phase 21 focused Pi extension E2E. Still requires human confirmation that native and brokered eligible tools register, stale tools disappear or reject after workspace switch, and FlashQuery is absent from ProvidersView. |
| T-M-002 | REQ-016 | blocked | Automated real-envelope regression is passed through `T-E-006b`, but this is not a replacement for the live check. Still requires real host-model `call_macro`, progress-emitting macro, live progress observation, final trace confirmation, `needs_user_input`, and disconnected macro behavior. |
| T-M-003 | REQ-015, REQ-017 | blocked | Mocked ToolCard/diagnostics E2E passed through `T-E-006`, but live host-model `call_model` with document refs was not run. Still requires configured Pi provider, live FlashQuery runtime, purpose/model resolution, injected refs, messages payload, cost/tokens/latency, and server-side FlashQuery tool-loop diagnostics. |
| T-M-004 | REQ-019 | blocked | Automated component/E2E clipboard assertions passed, but native macOS pasted clipboard values were not captured by a human. Still requires pasted values for vault tree, search row, and editor title `Copy vault path` / `Copy as reference`, exactly `Docs/Plan.md` and `{{ref:Docs/Plan.md}}`, with no section anchors or markdown links. |

## Phase 21 Cross-Surface Matrix

| Surface | Automated Evidence | Status |
| --- | --- | --- |
| Editor refresh | T-E-001, T-U-021 editor assertions | passed |
| Frontmatter save | T-E-002, T-U-021 editor/frontmatter assertions | passed |
| Vault Search | T-E-003, T-U-021 search assertions | passed |
| Pi `@` cache | T-E-004, T-U-021 agent store/input assertions | passed |
| Clipboard reference actions | T-E-003 plus component assertions; T-M-004 remains native-only | automated passed; manual blocked |
| Pi extension tools | T-E-005, T-U-015 lifecycle assertions | automated passed; manual T-M-001 blocked |
| ToolCard diagnostics | T-E-006 and T-E-006b | automated passed; manual T-M-002/T-M-003 blocked |
| Broad disconnect/reconnect | T-E-007 and focused search/mention/disconnect specs | passed |

## Visual Evidence

Visual evidence notes are recorded in `.planning/phases/21-cross-surface-hardening-and-regression/evidence/visual/NOTES.md`.

- `npm run test:e2e -- e2e/flashquery-visual-evidence.spec.ts` passed.
- Captured full-page FlashQuery surfaces plus live/connecting/disconnected status-chip screenshots in dark and light themes.
- The Milestone 2 UI Spec was reviewed for editor refresh/frontmatter, Vault Search, Pi ToolCard, Pi `@` mention, and clipboard surfaces.
- Screenshot-specific coverage for Vault Search, expanded ToolCard, Pi `@` mention, and clipboard-menu states remains limited by the existing visual evidence flow; those surfaces are covered behaviorally by focused unit/component/E2E evidence and manual blockers where required.

## Final Verification

Final closeout evidence is recorded in `.planning/phases/21-cross-surface-hardening-and-regression/21-VERIFICATION.md`.

- Focused unit/component suites passed.
- Focused E2E suites for `T-E-001` through `T-E-007` plus `T-E-006b` passed.
- `npm run typecheck`, `npm test`, `npm run test:e2e`, and `npm run preflight` passed.
- Phase status remains `needs-review` because `T-M-001`, `T-M-002`, `T-M-003`, and `T-M-004` are still blocked pending live/manual evidence or owner acceptance.

## Sign-Off

Automated Phase 21 E2E evidence is passed for `T-E-001` through `T-E-007` plus `T-E-006b`. Manual/live checks remain blocked with exact prerequisites and must not be marked passed without human-observed evidence.
