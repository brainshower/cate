---
phase: 04-vault-panel-shared-chip
verified: 2026-05-29T16:24:41Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open Cate and inspect the FlashQuery Vault panel header and five states in a real renderer."
    expected: "Header, chip, refresh affordance, no-connection, connecting, disconnected, empty-vault, and populated tree states match the product mockup intent with no clipping, overlap, or visually broken controls."
    why_human: "Visual fit, truncation quality, and desktop-panel polish cannot be fully verified by grep or jsdom tests."
  - test: "Exercise the panel against a real or fixture FlashQuery connection: create/open the panel, receive live/disconnected status, expand a folder, open a document in dock and canvas, and refresh."
    expected: "The end-to-end flow works from the user's perspective without exposing create-new-vault-document actions."
    why_human: "The automated tests mock Electron and FlashQuery APIs; real renderer IPC timing and user flow completion need UAT."
---

# Phase 4: Vault Panel + Shared Chip Verification Report

**Phase Goal:** Give users a dedicated FlashQuery vault panel that matches Cate's file-tree behavior and introduces the reusable status chip.
**Verified:** 2026-05-29T16:24:41Z
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | `flashqueryVault` is registered in shared panel definitions, renderer registry, and app-store panel creation. | VERIFIED | `PanelType`, `PANEL_DEFINITIONS.flashqueryVault`, `PANEL_REGISTRY.flashqueryVault`, and `createFlashQueryVault` are implemented in `src/shared/types.ts`, `src/shared/panels.ts`, `src/renderer/panels/registry.ts`, and `src/renderer/stores/appStore.ts`. |
| 2 | The chip renders connecting/live/disconnected/unknown states and only disconnected retry is actionable. | VERIFIED | `src/renderer/components/Chip.tsx` switches all states with unknown fallback; disconnected renders a button and fires `onRetry`, other states render inert surfaces. |
| 3 | The vault panel renders all five product states. | VERIFIED | `FlashQueryVaultPanel.tsx` handles no connection, disconnected, live empty, live populated, and connecting/default skeleton states with required copy. |
| 4 | Document-row interactions match local file-tree conventions and no create-new-document affordance exists. | VERIFIED | Document click selects, double-click opens dock editor, right-click uses native `showContextMenu` with exactly Open/Open on Canvas, folder right-click returns before menu, and source scan found no vault create affordance in the panel. |
| 5 | The chip primitive is reusable outside the vault panel. | VERIFIED | `Chip` and `ConnectionStatus` are exported from shared renderer component path `src/renderer/components/Chip.tsx`, not panel-local code. |
| 6 | The panel has locked FlashQuery Vault label, brand color, sizing, and canvas support. | VERIFIED | `PANEL_DEFINITIONS.flashqueryVault` has label `FlashQuery Vault`, colors `#5AD8B8` / `#4a9080`, `text-teal-400`, 320x500 default, file-explorer minimum, and `canLiveOnCanvas: true`. |
| 7 | Renderer code can build canonical `flashquery://` editor URIs without importing main-process modules. | VERIFIED | `buildVaultUri` / `parseVaultUri` live in `src/shared/flashqueryUri.ts`; `src/main/flashquery/uri.ts` is only a compatibility re-export; the panel imports from shared. |
| 8 | User can manually retry a disconnected FlashQuery connection from renderer UI. | VERIFIED | `flashqueryRetry` is declared in `ElectronAPI`, exposed in preload, registered as `flashquery:retry`, validated in main IPC, and called by panel retry button/chip. |
| 9 | Phase 4 empty/disconnected actions can open future connection dialog state without implementing the dialog. | VERIFIED | `uiStore` exposes `showFlashQueryConnectionDialog` and setter; panel actions call `setShowFlashQueryConnectionDialog(true)`; no dialog component or workspace menu entry was added. |
| 10 | User can browse root and lazy-loaded folder entries from `flashquery:listVault`. | VERIFIED | Panel calls `window.electronAPI.flashqueryListVault(workspaceId)` for root and `flashqueryListVault(workspaceId, vaultPath)` for first folder expansion, with loading indicators and stale-response guards. |
| 11 | Refresh reloads the root listing without resetting valid expansion/selection or closing editors. | VERIFIED | `loadRoot` debounces in-flight requests, prunes only missing vault paths, preserves still-present selected/expanded paths, and does not mutate editor panels. |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `src/renderer/components/Chip.tsx` | Reusable connection-status chip primitive | VERIFIED | Exists, substantive, exported, and consumed by vault panel. |
| `src/renderer/components/Chip.test.tsx` | T-I-015..021 and T-U-103 coverage | VERIFIED | Covers labels, unknown fallback, retry gating, tooltip, and forbidden neutral classes. |
| `package.json` / `package-lock.json` | React Testing Library dev dependencies | VERIFIED | `@testing-library/react` and `@testing-library/dom` are dev dependencies only. |
| `src/shared/types.ts` | `flashqueryVault` panel type and size map | VERIFIED | `PanelType` and `PANEL_CANVAS_DROP_SIZES.flashqueryVault` present. |
| `src/shared/panels.ts` | `PANEL_DEFINITIONS.flashqueryVault` | VERIFIED | Locked metadata implemented. |
| `src/renderer/panels/registry.ts` | Lazy renderer registry entry | VERIFIED | Uses Phosphor `Vault`, lazy `FlashQueryVaultPanel`, and app-store factory. |
| `src/renderer/stores/appStore.ts` | `createFlashQueryVault` factory | VERIFIED | Creates panel state, delegates placement, rolls back on placement failure. |
| `src/shared/flashqueryUri.ts` | Renderer-safe URI helpers | VERIFIED | Dependency-free `buildVaultUri` / `parseVaultUri`. |
| `src/main/flashquery/uri.ts` | Main compatibility re-export | VERIFIED | No local implementation; re-exports shared helper. |
| `src/shared/ipc-channels.ts` | `FLASHQUERY_RETRY` channel | VERIFIED | `flashquery:retry` constant present. |
| `src/shared/electron-api.d.ts` | `flashqueryRetry(workspaceId)` contract | VERIFIED | Typed renderer API present. |
| `src/preload/index.ts` | Retry preload bridge | VERIFIED | Invokes `FLASHQUERY_RETRY`. |
| `src/main/ipc/flashquery.ts` | Main retry handler | VERIFIED | Validates workspace ID and delegates to `FlashQueryClientManager.retry`. |
| `src/renderer/stores/uiStore.ts` | Dialog visibility hook | VERIFIED | Boolean state and setter present only. |
| `src/renderer/panels/FlashQueryVaultPanel.tsx` | Header, states, tree, interactions, refresh | VERIFIED | Substantive implementation wired to app store, UI store, shared URI, and typed preload APIs. |
| `src/renderer/panels/FlashQueryVaultPanel.test.tsx` | T-I-022..049 and T-U-102 coverage | VERIFIED | Covers header/states, row interactions, refresh, and design-token guard. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `Chip.tsx` | `Chip.test.tsx` | RTL assertions | VERIFIED | Tests cover state rendering, click behavior, hover tooltip, and neutral-class guard. |
| `registry.ts` | `appStore.ts` | `createFlashQueryVault(workspaceId, canvasPoint, placement) || null` | VERIFIED | Registry delegates with exact argument order; test asserts delegation. |
| `main/flashquery/uri.ts` | `shared/flashqueryUri.ts` | Compatibility re-export | VERIFIED | Re-export present and compatibility tests pass. |
| `preload/index.ts` | `main/ipc/flashquery.ts` | `FLASHQUERY_RETRY` invoke/handle | VERIFIED | Preload invokes the channel; main registers handler; IPC tests assert delegation and validation. |
| `FlashQueryVaultPanel.tsx` | `uiStore.ts` | `setShowFlashQueryConnectionDialog(true)` | VERIFIED | Panel no-connection and edit actions open the future dialog state. |
| `FlashQueryVaultPanel.tsx` | `window.electronAPI.flashqueryListVault` | Root and folder list calls | VERIFIED | Root load and lazy folder load call the typed preload API. |
| `FlashQueryVaultPanel.tsx` | `window.electronAPI.flashqueryRetry` | Retry button and disconnected chip | VERIFIED | Retry callback calls `flashqueryRetry(workspaceId)`. |
| `FlashQueryVaultPanel.tsx` | `src/shared/flashqueryUri.ts` | `buildVaultUri(workspaceId, entry.vaultPath)` | VERIFIED | Document open actions use shared URI helper, not main-process imports or manual URI concatenation. |

Note: `gsd-sdk query verify.key-links` produced false negatives for several plan regexes because of escaping/whitespace and one invalid regex pattern. Manual source and test checks above verified the links.

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `FlashQueryVaultPanel.tsx` | `connection` | `useAppStore(...workspace.flashqueryConnection)` | Yes | FLOWING |
| `FlashQueryVaultPanel.tsx` | `status` | `window.electronAPI.onFlashQueryStatus`, workspace-filtered | Yes | FLOWING |
| `FlashQueryVaultPanel.tsx` | `rootEntries` | `window.electronAPI.flashqueryListVault(workspaceId)` | Yes | FLOWING |
| `FlashQueryVaultPanel.tsx` | `childrenByPath` | `window.electronAPI.flashqueryListVault(workspaceId, vaultPath)` | Yes | FLOWING |
| `Chip.tsx` | `state` | Props from vault panel status mapping or external consumers | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Phase 4 focused tests pass | `npx -p node@22 npm test -- src/renderer/components/Chip.test.tsx src/shared/panels.test.ts src/renderer/panels/registry.test.ts src/renderer/stores/appStore.test.ts src/shared/flashqueryUri.test.ts src/main/flashquery/uri.test.ts src/main/ipc/flashquery.test.ts src/renderer/stores/uiStore.test.ts src/renderer/panels/FlashQueryVaultPanel.test.tsx` | 9 files / 72 tests passed | PASS |
| TypeScript project compiles | `npx -p node@22 npm run typecheck` | `tsc --noEmit` passed | PASS |
| Forbidden stock neutral classes absent from Phase 4 UI files | `grep -R "gray\\|slate\\|zinc" ... | grep -v "forbidden" | grep -v "stock neutral" && exit 1 || exit 0` | Exit 0 | PASS |
| React Testing Library dependencies are dev-only | `node -e "const p=require('./package.json'); ..."` | Both packages found in `devDependencies`; none in runtime dependencies | PASS |

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| Conventional probes | `find scripts -path '*/tests/probe-*.sh' -type f` | No probes found; phase is UI/component work | SKIPPED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| REQ-014 | 04-02 | Panel type registration | SATISFIED | Shared definition, renderer registry, and app-store factory implemented and tested. |
| REQ-015 | 04-04 | Panel header chrome | SATISFIED | Header renders Vault icon, FlashQuery Vault label, host context, chip, and refresh affordance. Visual polish remains human UAT. |
| REQ-016 | 04-04 | Vault tree rendering | SATISFIED | Root and lazy folder tree rendering implemented from `flashqueryListVault`; tests cover folder/document rows and loading. |
| REQ-017 | 04-03, 04-04 | Vault row interactions and canonical URI opening | SATISFIED | Shared URI helper, document select/open/context-menu behavior, and canvas/dock open paths implemented and tested. |
| REQ-018 | 04-04 | Refresh action | SATISFIED | Root reload, duplicate suppression, selection/expansion preservation/pruning, and editor non-mutation tested. |
| REQ-019 | 04-03, 04-04 | Panel states | SATISFIED | No connection, connecting, disconnected, empty vault, and populated states implemented and tested. |
| REQ-024 | 04-01 | Chip states and extensible API | SATISFIED | `ConnectionStatus` union plus default unknown fallback implemented and tested. |
| REQ-025 | 04-01, 04-03 | Chip interaction and manual retry | SATISFIED | Only disconnected chip is clickable; retry bridge reaches main manager retry. |
| REQ-026 | 04-01 | Shared chip primitive location | SATISFIED | `Chip.tsx` lives under `src/renderer/components/` and is imported by vault panel. |
| REQ-040 | 04-04 | No vault document creation | SATISFIED | Panel source exposes only Open/Open on Canvas document actions; folder right-click has no menu; no create affordance in Phase 4 panel code. |

No orphaned Phase 4 requirement IDs found. The PLAN frontmatter accounts for every user-provided Phase 4 ID.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `src/shared/types.ts` | 85, 1172 | `placeholder` in pre-existing shared types | INFO | Existing domain/type naming, not a Phase 4 stub. |
| `src/renderer/stores/appStore.ts` | multiple | `return null as unknown as string` factory sentinel | INFO | Existing panel factory failure pattern mirrored by `createFlashQueryVault`; not a stub. |
| `src/shared/flashqueryUri.ts` | 15, 25, 30, 33 | `return null` parse-failure handling | INFO | Expected parser error contract. |

No unreferenced `TBD`, `FIXME`, or `XXX` debt markers found in Phase 4 modified files. No Phase 5 full dialog/workspace menu or Phase 6 editor badge/read-save behavior was introduced; only the Phase 4-approved UI-store dialog visibility hook and `flashquery://` editor creation were added.

### Human Verification Required

### 1. Visual Panel UAT

**Test:** Open Cate and inspect the FlashQuery Vault panel header and five states in a real renderer.
**Expected:** Header, chip, refresh affordance, no-connection, connecting, disconnected, empty-vault, and populated tree states match the product mockup intent with no clipping, overlap, or visually broken controls.
**Why human:** Visual fit, truncation quality, and desktop-panel polish cannot be fully verified by grep or jsdom tests.

### 2. End-To-End User Flow UAT

**Test:** Exercise the panel against a real or fixture FlashQuery connection: create/open the panel, receive live/disconnected status, expand a folder, open a document in dock and canvas, and refresh.
**Expected:** The end-to-end flow works from the user's perspective without exposing create-new-vault-document actions.
**Why human:** The automated tests mock Electron and FlashQuery APIs; real renderer IPC timing and user flow completion need UAT.

### Gaps Summary

No automated implementation gaps found. Status is `human_needed` only because UI visual quality and real renderer user-flow completion require human UAT under the verification rules.

---

_Verified: 2026-05-29T16:24:41Z_
_Verifier: the agent (gsd-verifier)_
