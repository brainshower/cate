---
status: fixing
trigger: "FlashQuery vault root-level empty folder delete does not disappear, and vault mutations do not always immediately refresh list_vault results."
created: 2026-06-10
updated: 2026-06-10
---

## Symptoms

- Expected behavior: Removing an empty top-level vault folder removes it from the sidebar immediately.
- Actual behavior: The top-level folder can remain visible after removal.
- Error messages: none reported in UI.
- Timeline: observed after adding FlashQuery vault context menu create/rename/delete operations.
- Reproduction: create a root folder, create/remove contents beneath it, remove the empty root folder, then observe the sidebar contents.

## Current Focus

- hypothesis: Cate skips the post-mutation root `list_vault` when a root load is already in flight, leaving root-level mutations stale; additionally, Cate treats per-path `manage_directory` conflicts as successful because FlashQuery returns them inside `results`.
- test: Add renderer tests for root-level delete refresh and forced mutation refresh during an in-flight root load; add main-process test for `manage_directory` conflict parsing.
- expecting: Mutation refresh forces a fresh root list and stale in-flight lists cannot overwrite it; directory conflicts surface as `success: false`.
- next_action: run focused tests and typecheck

## Evidence

- Root-level delete calls `refreshAfterVaultMutation('')`, which only reloads root.
- `loadRoot()` returned early when `rootLoadingRef.current` was true.
- FlashQuery `manage_directory` returns ordered result objects, with per-path conflicts represented as `{ error, message, identifier }` inside `results`, while Cate only checked top-level `error`.

## Eliminated

## Resolution

- root_cause: Mutation refresh reused `loadRoot()` without forcing a new request, so root-level changes could remain stale when another root load was already in flight. Cate also treated `manage_directory` ordered per-path conflicts as success because it only checked top-level error envelopes.
- fix: Force root `list_vault` after successful vault mutations, keep stale in-flight root listings from overwriting newer mutation refreshes, and parse per-path `manage_directory` errors as `success: false`.
- verification:
  - `npm test -- src/main/flashquery/clientManager.test.ts src/renderer/panels/FlashQueryVaultPanel.test.tsx` passed: 82 tests.
  - `npm run typecheck` passed.
- files_changed:
  - `src/renderer/panels/FlashQueryVaultPanel.tsx`
  - `src/renderer/panels/FlashQueryVaultPanel.test.tsx`
  - `src/main/flashquery/clientManager.ts`
  - `src/main/flashquery/clientManager.test.ts`
