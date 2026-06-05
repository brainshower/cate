---
phase: 20-pi-mentions-and-clipboard-utilities
status: blocked
created: 2026-06-04
requirements: [REQ-018, REQ-019]
tests: [T-U-006, T-U-011, T-U-012, T-U-020, T-E-003, T-E-004, T-M-004]
---

# Phase 20 UAT: Pi Mentions and Clipboard Utilities

## Source Documents Read

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md`
  - REQ-018: Pi `@` Mention Vault Reference Autocomplete.
  - REQ-019: Clipboard Utility for Vault Paths and References.
  - REQ-020 cache/degradation acceptance relevant to disconnect clearing.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md`
  - T-U-006, T-U-011, T-U-012, T-U-020, T-E-003, T-E-004, T-M-004.

## Automated Evidence

| ID | Requirement | Evidence | Status |
| --- | --- | --- | --- |
| T-U-006 | REQ-018 | `npm test -- src/main/flashquery/clientManager.test.ts src/main/ipc/flashquery.test.ts src/agent/renderer/agentStore.test.ts` | passed in Plan 20-01 |
| T-U-020 | REQ-018 | `npm test -- src/agent/renderer/AgentChatInput.atMention.test.tsx` | passed in Plan 20-02 and Plan 20-04 |
| T-U-011 | REQ-019 | `npm test -- src/renderer/panels/FlashQueryVaultSearchPanel.test.tsx` | passed in Plan 20-03 |
| T-U-012 | REQ-019 | `npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` | passed in Plan 20-03 |
| T-E-003 | REQ-019 | `npm run test:e2e -- e2e/flashquery-vault-search.spec.ts` | passed in Plan 20-04 |
| T-E-004 | REQ-018 | `npm run build` and `npm run test:e2e -- e2e/flashquery-pi-mentions.spec.ts` | passed in Plan 20-04 |

Full-suite validation:

- `npm run build` - passed.
- `npm run typecheck` - passed.
- `npm test` - passed: 81 files, 749 tests passed, 3 skipped.
- `npm run test:e2e` - passed: 46 tests passed, 2 skipped.

## T-E-004 Coverage Notes

- Fixture vault-index data includes `Alpha/Plan.md`, `Beta/Plan.md`, and `Gamma/Notes.md`.
- The E2E opens Pi chat, types `@plan`, verifies filename-only filtering and full-path sorting, and accepts `Alpha/Plan.md`.
- Accepted output is the literal whole-document reference `{{ref:Alpha/Plan.md}}`.
- Fixture rebinding replaces cache data with `New/Brief.md` and `New/Zeta.md`; old workspace/cache entries are not offered.
- Simulated FlashQuery disconnect clears the vault-index cache and prevents stale reference insertion.
- Reconnect plus refresh repopulates the cache.
- The test asserts no reference chip, document-reference UI, or footer-pill UI is added.

## T-E-003 Clipboard Coverage Notes

- Search document row `Copy as reference` writes `{{ref:Docs/Plan.md}}`.
- Search document row `Copy vault path` writes `Docs/Plan.md`.
- Search document row menu includes both `copy-path` and `copy-reference`.
- Memory row right-click does not consume the queued document copy action or alter the clipboard; memory behavior remains inspector expansion via double-click.

## T-M-004 Native macOS Clipboard Verification

Status: passed by automated native clipboard E2E.

Automated evidence added on 2026-06-04:

- `npm run test:e2e -- e2e/flashquery-native-clipboard.spec.ts` passed.
- The new `T-M-004 native clipboard contains exact FlashQuery vault paths and references` E2E opens Cate with the FlashQuery fixture, invokes the real vault tree, Vault Search row, and FlashQuery editor title clipboard actions through the same menu action path, and reads Electron's main-process native clipboard.
- Verified copied values:
  - Vault tree `Copy vault path` -> `Docs/Plan.md`
  - Vault tree `Copy as reference` -> `{{ref:Docs/Plan.md}}`
  - Search row `Copy vault path` -> `Docs/Plan.md`
  - Search row `Copy as reference` -> `{{ref:Docs/Plan.md}}`
  - Editor title `Copy vault path` -> `Docs/Plan.md`
  - Editor title `Copy as reference` -> `{{ref:Docs/Plan.md}}`
- The test also asserts the values do not contain `flashquery://`, `%20`, section anchors, block-reference markers, or markdown-link syntax.

This replaces the prior manual blocker with deterministic native clipboard coverage. It does not prove a human pasted into an external macOS app, but it verifies the OS clipboard value Cate writes.

Legacy manual steps, no longer required for Phase 20 automation:

1. Open Cate on macOS with a workspace connected to FlashQuery fixture or live FlashQuery.
2. From a vault tree document row, choose `Copy vault path`; paste into a plain text target.
   - Expected pasted value: `Docs/Plan.md`.
3. From the same vault tree document row, choose `Copy as reference`; paste into a plain text target.
   - Expected pasted value: `{{ref:Docs/Plan.md}}`.
4. From a search document row, choose `Copy vault path`; paste into a plain text target.
   - Expected pasted value: `Docs/Plan.md`.
5. From the same search document row, choose `Copy as reference`; paste into a plain text target.
   - Expected pasted value: `{{ref:Docs/Plan.md}}`.
6. From a FlashQuery editor title Clipboard menu, choose `Copy vault path`; paste into a plain text target.
   - Expected pasted value: `Docs/Plan.md`.
7. From the same FlashQuery editor title Clipboard menu, choose `Copy as reference`; paste into a plain text target.
   - Expected pasted value: `{{ref:Docs/Plan.md}}`.

Negative checks for every pasted value:

- Must not contain `flashquery://`.
- Must not contain `%20` for spaces; paths must be decoded.
- Must not contain a section-anchor variant.
- Must not contain a block-reference variant.
- Must not contain markdown-link syntax.

## Gap 5 / CF-01 Closeout — `call_macro` Trace Table (REQ-016 #8 / REQ-017 #4)

This item was carried in from Phase 19 (Gap 4 / CF-01) and fixed in the Phase 20
gap clean-up (commit `62ee09e`): the renderer now parses the **real** FlashQuery
`call_macro` response envelope (trace as a JSON string inside `content[0].text`)
via `parseCallMacroEnvelope`, so the completed trace step table populates against
a live server.

### Automated coverage added (closes the structural risk)

| ID | Layer | Evidence | Status |
| --- | --- | --- | --- |
| T-U-019 (updated) | Component | `src/agent/renderer/ChatThread.test.tsx` — macro fixture rewritten to the real `{ content: [{ text: JSON.stringify({ task_id, result, trace }) }] }` shape | **executed, passed** |
| T-E-006 (migrated) | E2E | `e2e/flashquery-pi-diagnostics.spec.ts` — macro fixture migrated off the fabricated top-level `details.result.trace` to the real envelope shape | **executed, passed** |
| T-E-006b (new) | E2E | `e2e/flashquery-pi-macro-trace.spec.ts` — drives a `call_macro` through the real envelope (no fabricated trace), asserts `call_macro · 3 steps`, expanded trace rows, and live-progress `partialText` forwarding | **executed, passed** |

> Executed in this session and confirmed green:
> - `vitest run src/agent/renderer/ChatThread.test.tsx src/agent/renderer/agentStore.test.ts src/agent/renderer/AgentChatInput.atMention.test.tsx` → 23/23 passed.
> - `npm run build` (required — `dist/` was stale relative to the gap-fix commit, and the Electron E2E runs the built app), then `playwright test e2e/flashquery-pi-macro-trace.spec.ts e2e/flashquery-pi-diagnostics.spec.ts` → 2/2 passed.
> - Ran on Node v24.7.0; the `>=20 <23` `engines` constraint is advisory (not `engine-strict`), so the runners execute normally. `tsc --noEmit` exit 0.

### Remaining manual check — T-M-002 (live macro), status: blocked

The genuinely-live behaviors cannot be proven deterministically and remain a
human check (Test Plan §6.1): a real host model deciding to invoke `call_macro`,
a real server emitting throttled `notifications/progress`, and `needs_user_input`.

Required manual steps (against real FlashQuery + a configured native Pi provider):

1. Open Cate on macOS, connect a workspace to FlashQuery, and ensure a macro with
   a multi-step trace exists (e.g. one that loads a doc, calls a model, writes a doc).
2. In Pi chat, prompt the host model to run that macro (so it calls `call_macro`).
3. While running: confirm the ToolCard shows a spinner + the most-recent progress
   message text only — no fabricated per-step checkmarks, counts, or elapsed times.
4. On completion: expand the ToolCard and confirm the trace step table is populated
   from the live envelope (Type / Tool / Message columns per step).
5. Negative: disconnect FlashQuery and invoke a macro; confirm the tool result is
   exactly `FlashQuery is not connected.`
6. Optional: trigger a `needs_user_input` macro and confirm it surfaces as a
   tool-result message (no pause/resume protocol in Milestone 2).

Expected: live progress shows a single rolling message; the completed table lists
each trace step. Record observations here and flip to passed when run.

## Traceability Summary

| Requirement | Automated IDs | Manual IDs | Result |
| --- | --- | --- | --- |
| REQ-018 | T-U-006, T-U-020, T-E-004 | none | automated evidence passed |
| REQ-019 | T-U-011, T-U-012, T-E-003, T-M-004 automated native clipboard E2E | none | automated evidence passed |
| REQ-016 / REQ-017 (Gap 5 / CF-01) | T-U-019, T-E-006, T-E-006b | T-M-002 | structural defect closed + automated regression added; live macro run blocked pending human |

## Sign-Off

- REQ-018: passed automated UAT evidence.
- REQ-019: passed automated UAT evidence, including native clipboard E2E coverage for `T-M-004`.
- Gap 5 / CF-01 (REQ-016 #8 / REQ-017 #4): structural defect closed (commit `62ee09e`) with real-envelope automated coverage (T-U-019 updated, T-E-006 migrated, T-E-006b added); blocked manual T-M-002 live-macro sign-off pending human run.
