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
| T-E-001 | REQ-001, REQ-002, REQ-003, REQ-020 | `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts` | passed: editor clean/dirty refresh, not-found failure preservation, and editor-open disconnected refresh preservation passed |
| T-E-002 | REQ-004, REQ-005, REQ-006, REQ-007, REQ-020 | same command | passed: frontmatter open/save/invalid YAML/managed-field behavior and disconnected save preservation passed |
| T-E-003 | REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-019, REQ-020 | same command | passed: grouped search, pagination, semantic disabled state, copy path/reference, memory inspector, disconnect/reconnect recovery passed |
| T-E-004 | REQ-018, REQ-020 | same command | passed: Pi `@` reference insertion, cache replacement, disconnect clearing, reconnect repopulation, no footer/chip additions passed |
| T-E-005 | REQ-013, REQ-014, REQ-020 | `npm run test:e2e -- e2e/flashquery-pi-extension.spec.ts e2e/flashquery-pi-diagnostics.spec.ts e2e/flashquery-pi-macro-trace.spec.ts` | passed: bundled extension installs and fixture registry fetch occurs at Agent startup |
| T-E-006 / T-M-003 deterministic companion | REQ-015, REQ-016, REQ-017 | same command | passed: ToolCard diagnostics render through normal Pi tool messages with no new chat message type; deterministic companion preserves `call_model` refs, `return_messages`, provider/model diagnostics, messages payload, tokens, latency, and server-side tool-loop data |
| T-E-006b / T-M-002 deterministic companion | REQ-016, REQ-017 | same command | passed: `call_macro` real response envelope renders `call_macro · 3 steps`, expanded trace rows, and live `partialText` forwarding; deterministic companion preserves `needs_user_input` payload data and renders the disconnected `call_macro` result exactly |
| T-E-007 | REQ-003, REQ-012, REQ-018, REQ-020 | `npm run test:e2e -- e2e/flashquery-editor-refresh-frontmatter.spec.ts e2e/flashquery-vault-search.spec.ts e2e/flashquery-pi-mentions.spec.ts e2e/flashquery-disconnect.spec.ts` | passed: editor refresh/frontmatter disconnected errors and preservation, search disconnect/reconnect, Pi mention cache clearing/repopulate, status-chip retry, and successful reload after reconnect |

Supporting fixture evidence:

- `npm run test:e2e -- e2e/fixtures/flashquery-server.spec.ts` passed 6/6 tests.
- The fixture now supports `setAvailable(false)`, frontmatter reads/writes, object write payload inspection, `search` list-all vault-index enumeration, document/memory grouped results, registry tools, and not-found/disconnect simulation. It intentionally does not expose a fictional `list_vault_index` MCP tool; Cate's vault-index path is represented by the real `search({ list_all: true, entity_types: ['documents'] })` contract.
- `npm test -- e2e/fixtures/flashquery-server.spec.ts` is not a valid repo command because `npm test` includes only `src/**/*.test.ts(x)`; the fixture spec is a Playwright spec.

Build evidence:

- `npm run build` passed before the focused Electron E2E runs.

## Manual / Real-Integration Evidence

| ID | Requirement | Status | Evidence or Blocker |
| --- | --- | --- | --- |
| T-M-001 | REQ-013, REQ-014, REQ-020 | blocked | Requires real FlashQuery HTTP MCP endpoint plus configured native Pi provider. Current automated substitutes passed: `T-U-015`, `T-E-005`, and Phase 21 focused Pi extension E2E. Still requires human confirmation that native and brokered eligible tools register, stale tools disappear or reject after workspace switch, and FlashQuery is absent from ProvidersView. |
| T-M-002 | REQ-016 | partially automated / live blocked | Deterministic companion passed on 2026-06-06: `e2e/flashquery-pi-macro-trace.spec.ts` preserves a real-shaped `needs_user_input` envelope in tool message data and renders the disconnected `call_macro` result exactly. Still requires real host-model `call_macro`, progress-emitting macro, live progress observation, final trace confirmation, and provider/runtime user-input behavior. |
| T-M-003 | REQ-015, REQ-017 | partially automated / live blocked | Deterministic companion passed on 2026-06-06: `e2e/flashquery-pi-diagnostics.spec.ts` preserves refs, `return_messages`, provider/model diagnostics, messages payload, tokens, latency, and server-side tool-loop data. Still requires configured Pi provider, live FlashQuery runtime, real host-model `call_model` selection, and live provider diagnostics. |
| T-M-004 | REQ-019 | passed by automated native clipboard E2E | `npm run test:e2e -- e2e/flashquery-native-clipboard.spec.ts` passed on 2026-06-04. The test invokes vault tree, search row, and FlashQuery editor title copy actions and reads Electron's native clipboard, verifying exact `Docs/Plan.md` and `{{ref:Docs/Plan.md}}` values with no URI, encoding, anchor, block-ref, or markdown-link variants. |

## Phase 21 Cross-Surface Matrix

| Surface | Automated Evidence | Status |
| --- | --- | --- |
| Editor refresh | T-E-001 plus T-E-007 editor-open disconnect case, T-U-021 editor assertions | passed |
| Frontmatter save | T-E-002 plus T-E-007 editor-open disconnect case, T-U-021 editor/frontmatter assertions | passed |
| Vault Search | T-E-003, T-U-021 search assertions | passed |
| Pi `@` cache | T-E-004, T-U-021 agent store/input assertions | passed |
| Clipboard reference actions | T-E-003 plus component assertions; T-M-004 native clipboard E2E | automated passed |
| Pi extension tools | T-E-005, T-U-015 lifecycle assertions | automated passed; manual T-M-001 blocked |
| ToolCard diagnostics | T-E-006 and T-E-006b plus deterministic T-M-002/T-M-003 companions | automated passed; live provider/manual remainders for T-M-002/T-M-003 blocked |
| Broad disconnect/reconnect | T-E-007 distributed across editor, search, mention-cache, and status-chip specs | passed |

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
- Phase status remains `needs-review` because `T-M-001` and the live/provider remainders of `T-M-002` and `T-M-003` are still blocked pending live/manual evidence or owner acceptance. `T-M-002` and `T-M-003` deterministic companions are automated, and `T-M-004` is covered by automated native clipboard E2E.

## Sign-Off

Automated Phase 21 E2E evidence is passed for `T-E-001` through `T-E-007`, `T-E-006b`, deterministic companions for `T-M-002`/`T-M-003`, and `T-M-004`. Manual/live check `T-M-001` and the live/provider remainders for `T-M-002`/`T-M-003` remain blocked with exact prerequisites and must not be marked fully passed without human/live evidence.
