# Phase 8 Verification: Upstream Sync to `v1.1.0`

**Status:** Passed  
**Completed:** 2026-06-01  
**Branch:** `sync/upstream-v1.1.0`  
**Merge commit:** `318214f` (`Merge upstream v1.1.0 (tag, 5b6549d) into fork`)

## Plan Status

| Plan | Status | Evidence |
|------|--------|----------|
| 8.1 Baseline and branch setup | Pass | `evidence/baseline/`, `evidence/UPSTREAM-REF.md`, `evidence/MERGE-STATE.md` |
| 8.2 Build/dependency/packaging | Pass | `evidence/build/` |
| 8.3 Shared contracts/security | Pass | `evidence/contracts/` |
| 8.4 Renderer/E2E harness | Pass | `evidence/renderer/` |
| 8.5 Upstream features/visuals | Pass | `evidence/visual/` |
| 8.6 Verification/runbook/provenance | Pass | `evidence/final/`, `docs/UPSTREAM-SYNC.md` |

## Test IDs

| Range | Status | Notes |
|-------|--------|-------|
| T-A-001..T-A-004 | Pass | Baseline, install, build, and typecheck evidence captured. |
| T-A-005..T-A-009 | Pass | Light/dark visual screenshots captured for FlashQuery surfaces. |
| T-A-010 | Pass | Product flow covered by full FlashQuery E2E suite and final matrix. |
| T-A-011 | Pass | Electron smoke passes after clearing inherited `ELECTRON_RUN_AS_NODE`. |
| T-A-012..T-A-015 | Pass | Provenance, `.planning`, ignore, and merge-history gates pass. |
| T-U-001..T-U-017 | Pass | Targeted contract/renderer tests plus full unit suite pass. |
| T-E-001..T-E-005 | Pass | Full `npm run test:e2e` passes, including FlashQuery happy path, browse, disconnect, persistence, and stub lifecycle. |
| T-M-001..T-M-005 | Pass | Upstream terminal/editor/file/git/provider/removal smoke covered by build/typecheck/unit/E2E/Electron smoke and conflict notes. |

## Gap Closure Addendum

- T-A-012 central-file conflict review was re-checked against the full enumerated set. Added missing notes for `src/shared/types.ts`, `src/renderer/sidebar/Sidebar.tsx`, and `src/main/index.ts`.
- T-U-002 is now backed by `src/shared/ipc-channels.test.ts`, which asserts the exact FlashQuery IPC channel set and verifies no non-FlashQuery export collides with it.
- T-U-008 is now backed by `src/renderer/lib/__fixtures__/premerge-workspace.json` and `src/renderer/lib/session.test.ts`, covering current deserialization of a pre-merge-style workspace with sanitized FlashQuery metadata.
- T-U-017 is now backed by the `T-U-017 opens a FlashQuery Vault from the command palette` Playwright case in `e2e/flashquery-happy-path.spec.ts`.
- T-M-004 now has an explicit retention justification for `src/main/templates/skillTemplate.ts` and accepted-removal note for `src/renderer/canvas/BulkActionChip.tsx`.

## Final Matrix

| Command | Status |
|---------|--------|
| `npm run build` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | Pass |
| `npm run test:e2e` | Pass |
| `npm run test:smoke:electron` | Pass |

## Provenance

- `git merge-base --is-ancestor v1.1.0 HEAD`: pass.
- `git merge-base HEAD v1.1.0`: `5b6549d661a8427c829f60e15c4de9e71d49ac4d`.
- `git rev-list --count HEAD..v1.1.0`: `0`.
- Latest merge commit message includes `v1.1.0` and `5b6549d`.

## Process Gates

- `.planning/` tracked-file count: 141.
- `.gitignore` does not include a broad `.claude/` ignore; only `.claude/settings.local.json` is ignored.
- `docs/UPSTREAM-SYNC.md` contains protected surfaces, conflict hotspots, verification matrix, and sync ledger.

## Remaining Follow-Ups

None for Phase 8 merge readiness.
