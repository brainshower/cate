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

Status: blocked.

Blocked reason: automated Electron/Playwright and component tests can verify renderer menu selection and `navigator.clipboard` contents, but this session did not include a human-operated native macOS Cate runtime with pasted clipboard values from the OS clipboard after using the real app menus. T-M-004 must not be marked passed without those pasted values.

Required manual steps:

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

## Traceability Summary

| Requirement | Automated IDs | Manual IDs | Result |
| --- | --- | --- | --- |
| REQ-018 | T-U-006, T-U-020, T-E-004 | none | automated evidence passed |
| REQ-019 | T-U-011, T-U-012, T-E-003 | T-M-004 | automated evidence passed; native macOS clipboard evidence blocked |

## Sign-Off

- REQ-018: passed automated UAT evidence.
- REQ-019: passed automated UAT evidence; blocked manual T-M-004 native clipboard sign-off pending human pasted values.
