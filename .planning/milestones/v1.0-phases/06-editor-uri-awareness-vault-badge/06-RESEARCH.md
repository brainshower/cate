# Phase 6: Editor URI-Awareness + Vault Badge - Research

**Researched:** 2026-05-29  
**Domain:** Electron/React renderer editor routing, Monaco model URI identity, FlashQuery preload IPC, shared chip UI  
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Phase 6 is bounded to editor behavior only: URI detection, read routing, save routing, dirty-state parity, diff guardrails, badge rendering, badge tooltip, and associated focused tests. Do not add vault creation, frontmatter UI, conflict/staleness UI, version-token persistence, rename/delete/move/tag/archive, live notification behavior, or new FlashQuery IPC handlers. Renderer code must consume the existing Phase 3 preload API; it must not instantiate MCP clients, call Node APIs directly, or use filesystem IPC for `flashquery://` documents. Local-file editor reads, saves, diff mode, dirty state, close-confirm behavior, Monaco model lifecycle, and title behavior are the regression baseline. [VERIFIED: `.planning/phases/06-editor-uri-awareness-vault-badge/06-CONTEXT.md`]

Use canonical `flashquery://<workspaceId>/<vault-path>` URIs and import `parseVaultUri` / `buildVaultUri` from the renderer-safe shared helper, not from main-process code. Keep the model cache keyed by the full `filePath` string. Vault Monaco models must use `monaco.Uri.parse(filePath)`; local files must keep `monaco.Uri.file(filePath)`. Vault reads call `window.electronAPI.flashqueryGetDocument(workspaceId, vaultPath)` and use `body`; vault saves call `window.electronAPI.flashqueryWriteDocument(workspaceId, vaultPath, model.getValue())`. [VERIFIED: `.planning/phases/06-editor-uri-awareness-vault-badge/06-CONTEXT.md`]

Successful vault saves clear dirty state like local saves. Failed vault saves leave dirty state intact and must show a user-visible failure. Saving while disconnected still attempts IPC. Vault editors must not populate `PanelState.unsavedContent`; close-confirm must reuse the existing native `DIALOG_CONFIRM_UNSAVED` flow. Git diff mode is local-file-only; vault URI + `diffMode` must render standard editor mode, log a warning, and avoid local relative-path/git IPC work. [VERIFIED: `.planning/phases/06-editor-uri-awareness-vault-badge/06-CONTEXT.md`]

Vault editors render a non-clickable `Vault · <host>` title badge using a teal Phosphor `Vault` icon and the Phase 4 `Chip` primitive or a directly parameterized primitive from the same file. Hover shows the decoded vault-relative path from `parseVaultUri(filePath).vaultPath`. The editor presents body only, does not parse frontmatter, does not retain/send `version_token`, and does not send `frontmatter`, `title`, `tags`, `expected_version`, or `if_match`. [VERIFIED: `.planning/phases/06-editor-uri-awareness-vault-badge/06-CONTEXT.md`]

### the agent's Discretion

The planner may decide whether small `EditorPanel`-local helpers are useful, provided canonical URI parsing remains delegated to shared FlashQuery URI helpers. The planner may choose the smallest existing Cate-style save-error surface that is user-visible and testable. The planner may split Phase 6 into the three roadmap plans or smaller test-first slices, provided every Phase 6 requirement ID appears in plan frontmatter. [VERIFIED: `.planning/phases/06-editor-uri-awareness-vault-badge/06-CONTEXT.md`]

### Deferred Ideas (OUT OF SCOPE)

Full Electron E2E happy path, restart behavior, existing E2E regression, and manual/design checklist belong to Phase 7. Vault document creation, rename/delete/archive/tag/move, frontmatter editing, conflict detection, live vault notifications, OAuth, token refresh, keychain migration, stdio transport, agent integration, and brokered tool execution remain outside v1 or future work. [VERIFIED: `.planning/phases/06-editor-uri-awareness-vault-badge/06-CONTEXT.md`]
</user_constraints>

## Mandatory Source Guardrail

Plan tasks that touch implementation or tests must read the external requirements doc first, especially Spec §6.6, §6.8.2, §6.8.3, and Phase 6 §8.8. Those sections define REQ-027..033, REQ-041, and REQ-042: vault URI recognition, body-only reads, update-only saves, dirty behavior, diff gating, badge/tooltip, frontmatter invisibility, and no conflict detection. [CITED: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md`]

Plan tasks that touch tests must read the external test plan first, especially §4.6 and T-I-079..098. The required Phase 6 test home is `src/renderer/panels/EditorPanel.test.tsx`; no such file exists yet, so the plan should create it. [CITED: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md`] [VERIFIED: codebase grep]

Project constraints from `AGENTS.md`: keep the existing Electron/React/TypeScript/Zustand/IPC/Vitest/Playwright stack; renderer code must not call privileged APIs directly; FlashQuery data remains in the configured instance/vault; connection behavior is workspace-scoped; existing Cate panels and workflows must not regress. [VERIFIED: `AGENTS.md`]

## Existing Editor Architecture

`EditorPanel.tsx` currently owns the model cache, file read path, save path, dirty-state writes, markdown preview content reads, and diff-mode setup. The model cache is `Map<string, ITextModel>` plus refcounts at lines 124-160, so the cache can already key vault models by the full URI string. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`]

Read/model creation is in the regular-editor effect at lines 565-609. Today it always builds `fileUri = monaco.Uri.file(filePath)`, checks `modelCache.get(filePath)`, falls back to `monaco.editor.getModel(fileUri)`, reads via `window.electronAPI.fsReadFile(filePath)`, and creates the model with `monaco.editor.createModel(content, language, fileUri)`. The Phase 6 branch belongs here: parse once, use `monaco.Uri.parse(filePath)` and `flashqueryGetDocument(...).body` for vault URIs, otherwise preserve this local path. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`] [VERIFIED: Context7 `/microsoft/monaco-editor`]

Save is the `save` callback at lines 381-449. Today it returns early for `diffMode`, uses Save-As for missing `filePath`, writes via `window.electronAPI.fsWriteFile(targetPath, content)`, clears dirty state, updates title, and handles initial Save-As panel state. The Phase 6 branch should happen after `targetPath` is known and before local `fsWriteFile`, with failed vault writes returning `false` while preserving dirty state. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`]

Dirty state is handled at lines 630-653. The first content change sets `isDirtyRef.current = true`, calls `setPanelDirty(workspaceId, panelId, true)`, and appends `•` to the title from `filePathRef.current.split('/').pop()`. Scratch persistence only runs when `!filePathRef.current`, so vault editors naturally avoid `unsavedContent` as long as `filePathRef.current` remains the `flashquery://` URI. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`]

Diff mode is the first branch in the mount effect at lines 465-534. It currently treats any `filePath` plus `rootPath` as a local file, computes a relative path, reads via `fsReadFile`, and calls `gitDiffStaged` or `gitDiff`. Vault URI gating must happen before `createDiffEditor` and before the relative-path calculation. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`]

Close-confirm is not implemented inside `EditorPanel`; dirty editor closure is mediated by `confirmCloseDirtyPanels()`, which filters dirty editor panels and calls `window.electronAPI.confirmUnsavedChanges`, then invokes `saveEditor(panelId)` when the user chooses Save. This means Phase 6 should preserve editor registration via `registerEditorSave(panelId, save)` and make vault `save()` work through that existing path. [VERIFIED: `src/renderer/lib/confirmCloseDirty.ts`] [VERIFIED: `src/renderer/panels/EditorPanel.tsx`]

The visible title/tab chrome is not rendered in `EditorPanel.tsx`. Dock tabs render title text in `DockTabBar.tsx` lines 250-252; detached panel windows render title text in `PanelWindowShell.tsx` line 198; canvas nodes pass trailing controls through `CanvasNode.tsx` lines 355-405. The planner should explicitly decide whether the badge is added to the shared title chrome using panel metadata, or whether `EditorPanel` gets an internal overlay/title row; the spec says "title bar", and the current codebase title bar lives outside `EditorPanel`. [VERIFIED: codebase grep]

## FlashQuery Contracts Available

Renderer-safe URI parsing lives in `src/shared/flashqueryUri.ts`. `buildVaultUri(workspaceId, vaultPath)` returns `flashquery://<encoded-workspace>/<encoded-path-segments>`, and `parseVaultUri(uri)` returns `{ workspaceId, vaultPath } | null`. Renderer imports should use `../../shared/flashqueryUri` from `EditorPanel.tsx`; `src/main/flashquery/uri.ts` is only a compatibility re-export. [VERIFIED: `src/shared/flashqueryUri.ts`] [VERIFIED: `src/main/flashquery/uri.ts`]

The preload methods already available are `flashqueryGetDocument(workspaceId, vaultPath): Promise<FlashQueryDocumentBody>` and `flashqueryWriteDocument(workspaceId, vaultPath, content): Promise<FlashQueryWriteResult>`. Supporting methods include `flashquerySetConnection`, `flashqueryProbe`, `flashqueryGetConnectionSecret`, `flashqueryListVault`, `flashqueryRetry`, and `onFlashQueryStatus`. [VERIFIED: `src/preload/index.ts`] [VERIFIED: `src/shared/electron-api.d.ts`]

Shared types define `FlashQueryDocumentBody` as `{ body: string; version_token?: string; modified?: string }` and `FlashQueryWriteResult` as `{ success: true; modified: string } | { success: false; error: string }`. `WorkspaceInfo.flashqueryConnection?.url` is available in renderer state and can provide the badge host. [VERIFIED: `src/shared/types.ts`]

Phase 3 implemented domain-shaped manager methods and pinned the boundary: `get_document` uses `include: ['body']`, and `write_document` uses `mode: 'update'`, `identifier`, and `content` only. Phase 6 should not change main-process FlashQuery code unless a regression test exposes a contract mismatch. [VERIFIED: `.planning/phases/03-ipc-surface/03-03-SUMMARY.md`]

`FlashQueryVaultPanel` already opens vault documents through `createEditor(workspaceId, buildVaultUri(workspaceId, entry.vaultPath), ..., placement)` at lines 292-303. Therefore Phase 6 can treat incoming vault editors as normal editor panels with a `flashquery://` `filePath`. [VERIFIED: `src/renderer/panels/FlashQueryVaultPanel.tsx`]

## Chip/Badge Reuse Pattern

The reusable chip primitive exists at `src/renderer/components/Chip.tsx`; it exports `Chip` and `ConnectionStatus`. Its current props are status-specific: `state` plus optional `onRetry`. Its surface style is inline and matches the required pill: min height 22, border radius 999, translucent background, translucent border, and 11 px system font. [VERIFIED: `src/renderer/components/Chip.tsx`]

Because the current `Chip` API only renders connection states, a vault title badge should either extend `Chip` with a non-status/custom-content mode or extract a shared surface primitive from the same file. Duplicating chip styles inside `EditorPanel` would violate REQ-032. [VERIFIED: `src/renderer/components/Chip.tsx`] [CITED: external Requirements Spec §6.6.6]

`@phosphor-icons/react` is already the icon library in the renderer registry and vault panel, and the `Vault` icon is already imported in `src/renderer/panels/registry.ts`. Use the same package for the badge icon. [VERIFIED: `src/renderer/panels/registry.ts`] [VERIFIED: `AGENTS.md`]

The existing chip tooltip is immediate-on-hover and only for disconnected status. REQ-033 asks for the full decoded vault path after 500 ms or Cate's standard delay; there is no broad shared tooltip primitive, so a small local hover timer in the badge/chip component is reasonable if it uses the same surface classes (`rounded-md border border-subtle bg-surface-4 px-2 py-1 text-left shadow-2xl`). [VERIFIED: `src/renderer/components/Chip.tsx`] [CITED: external Requirements Spec §6.6.7]

## Test Strategy for T-I-079..098

Create `src/renderer/panels/EditorPanel.test.tsx` with React Testing Library, matching the Phase 4 renderer-test pattern. Mock `../lib/logger`, `monaco-editor`, `window.electronAPI`, and enough `ResizeObserver` behavior to mount the component deterministically. [VERIFIED: `src/renderer/components/Chip.test.tsx`] [VERIFIED: `src/renderer/panels/FlashQueryVaultPanel.test.tsx`]

For T-I-079..087, test the read/save branch from the user-visible component boundary: vault mount calls `flashqueryGetDocument` and not `fsReadFile`; local mount calls `fsReadFile`; vault save calls `flashqueryWriteDocument(workspaceId, vaultPath, content)` and does not include extra arguments; local save calls `fsWriteFile`; success clears dirty; failure leaves dirty and renders/logs a visible error; disconnected status does not prevent the IPC attempt. [CITED: external Test Plan §4.6.1]

For T-I-081..082, use the Monaco mock to preserve URI identity: assert the model cache key is the full URI string through observable behavior, and assert `monaco.editor.getModel(monaco.Uri.parse(vaultUri))` can retrieve the cached model. Monaco docs identify models by URI, and Cate already relies on `createModel(..., uri)` plus `getModel(uri)`. [VERIFIED: Context7 `/microsoft/monaco-editor`] [VERIFIED: `src/renderer/panels/EditorPanel.tsx`]

For T-I-088..090, assert vault URI plus `diffMode` creates a standard editor rather than a diff editor, logs a warning, and does not call `gitDiff`, `gitDiffStaged`, or local `fsReadFile` for diff setup. Keep a local-path `diffMode` regression asserting existing diff editor calls still happen. [CITED: external Test Plan §4.6.2]

For T-I-091..093, drive a model content change through the mocked editor callback, then assert panel dirty state/title marker behavior through `useAppStore`. Assert `unsavedContent` remains undefined for vault panels. For close-confirm reuse, prefer testing `confirmCloseDirtyPanels()` with a dirty vault editor and registered save handler rather than introducing brittle DOM close-button coupling. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`] [VERIFIED: `src/renderer/lib/confirmCloseDirty.ts`]

For T-I-094..098, include badge rendering tests at the actual chrome layer selected by the planner. If the badge lands in `DockTabBar`, test `DockTabBar` with an editor panel whose `filePath` is a vault URI and workspace connection URL is set. If the badge lands in `EditorPanel`, test `EditorPanel` directly but note that this is an internal overlay, not existing Cate title chrome. Assert local editors have no badge, tooltip text is the decoded vault path, and chip reuse is proven by component identity or shared chip-surface styles from `Chip.tsx`. [VERIFIED: codebase grep] [CITED: external Test Plan §4.6.4]

Avoid brittle overreach: do not automate Phase 7 E2E journey here; do not assert exact pixel positions; do not test FlashQuery MCP internals again; do not assert `version_token` behavior in renderer except that the editor ignores it. Main-process body-only/no-conflict contracts are already covered by Phase 3 tests, with Phase 6 only guarding against new renderer payload fields. [VERIFIED: `.planning/phases/03-ipc-surface/03-03-SUMMARY.md`] [CITED: external Test Plan §4.6.5-4.6.6]

## Implementation Risks and Guardrails

Do not use `monaco.Uri.file(filePath)` for vault URIs. It would turn a `flashquery://...` logical URI into a file-scheme path-like URI and break the model identity required by REQ-027. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`] [VERIFIED: Context7 `/microsoft/monaco-editor`]

Do not let `diffMode` short-circuit vault saves forever. Today `save()` returns `false` for any `diffMode`; the vault diff guard should normalize vault editors to standard mode or compute an effective diff mode (`diffMode` only when not vault) so Cmd+S works for vault documents. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`]

Do not update vault panel titles with raw encoded URI segments. Current dirty-title code uses `filePathRef.current.split('/').pop()`, which will preserve percent-encoding. Use `parseVaultUri(filePath).vaultPath` and basename from the decoded path for vault title updates. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`] [VERIFIED: `src/shared/flashqueryUri.ts`]

Do not populate `PanelState.unsavedContent` for vault editors. The existing scratch path is guarded by `!filePathRef.current`; preserve that invariant and avoid adding any vault autosave/session content persistence. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`] [CITED: external Requirements Spec §6.6.5]

Do not parse frontmatter in renderer code, and do not retain/send `version_token`. The editor should use `FlashQueryDocumentBody.body` only and call `flashqueryWriteDocument` with only the three preload arguments. [VERIFIED: `src/shared/electron-api.d.ts`] [CITED: external Requirements Spec §6.8.2-6.8.3]

Do not implement a renderer-side disconnected save block. REQ-029 requires the save path to attempt IPC even when status is disconnected. [CITED: external Requirements Spec §6.6.3]

Preserve local-file regressions: local read via `fsReadFile`, local save via `fsWriteFile`, local diff via `gitDiff`/`gitDiffStaged`, markdown preview behavior, model warm-cache reuse, Save-As for untitled files, and close-confirm through registered editor save handlers. [VERIFIED: `src/renderer/panels/EditorPanel.tsx`] [VERIFIED: `src/renderer/lib/confirmCloseDirty.ts`]

## Recommended Plan Split

1. **6.1 Editor URI routing:** add vault URI classification helpers in/near `EditorPanel`, import `parseVaultUri` from `src/shared/flashqueryUri.ts`, route model URI/read creation, preserve local reads, add Monaco URI/cache tests T-I-079..082. [VERIFIED: `.planning/ROADMAP.md`]

2. **6.2 Save and dirty-state behavior:** route vault saves through `flashqueryWriteDocument`, handle `{ success: false }` and thrown failures without clearing dirty state, preserve local save/Save-As, keep disconnected saves as IPC attempts, and add T-I-083..087 plus dirty/unsaved/close-confirm tests T-I-091..093. [VERIFIED: `.planning/ROADMAP.md`]

3. **6.3 Badge and guardrails:** gate vault diff mode before local path/git work, add the title badge at the selected chrome boundary using the Chip primitive/shared surface, add tooltip path display, and add T-I-088..090 and T-I-094..098. Also run the existing Phase 3 manager tests that pin body-only/no-conflict write contracts. [VERIFIED: `.planning/ROADMAP.md`]

If the planner keeps badge work in `EditorPanel.tsx` only, include an explicit acceptance note that Cate's existing title chrome is outside `EditorPanel`; otherwise route badge data through `PanelState.filePath` into `DockTabBar` / detached title chrome. [VERIFIED: codebase grep]

## Verification Commands

Cate requires Node `>=20 <23`; the local default `node` is v24.7.0, so downstream agents should use Node 22 unless their shell is already on Node 20/22. [VERIFIED: `package.json`] [VERIFIED: local `node --version`]

Focused commands:

```bash
npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx
npx -p node@22 npm test -- --grep "EditorPanel.*vault"
npx -p node@22 npm test -- --grep "EditorPanel.*flashquery"
npx -p node@22 npm test -- --grep "vault.*badge"
npx -p node@22 npm run typecheck
```

Regression commands when touching shared chip/title chrome or FlashQuery contracts:

```bash
npx -p node@22 npm test -- src/renderer/components/Chip.test.tsx
npx -p node@22 npm test -- src/renderer/panels/FlashQueryVaultPanel.test.tsx
npx -p node@22 npm test -- src/main/flashquery/clientManager.test.ts
```

## Sources

### Primary

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — Spec §6.6, §6.8.2, §6.8.3, Phase 6 §8.8.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — Test Plan §4.6 and T-I-079..098.
- `AGENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/phases/06-editor-uri-awareness-vault-badge/06-CONTEXT.md`.
- Phase context/summaries for Phases 3-5 listed in the prompt.
- Code: `src/renderer/panels/EditorPanel.tsx`, `src/shared/flashqueryUri.ts`, `src/preload/index.ts`, `src/shared/electron-api.d.ts`, `src/shared/types.ts`, `src/renderer/components/Chip.tsx`, `src/renderer/panels/FlashQueryVaultPanel.tsx`, `src/renderer/docking/DockTabBar.tsx`, `src/renderer/shells/PanelWindowShell.tsx`, `src/renderer/lib/confirmCloseDirty.ts`.
- Context7 `/microsoft/monaco-editor` — model URI identity and `createModel(..., uri)` / `getModel(uri)` behavior.

### Confidence Breakdown

- Editor architecture: HIGH — verified directly against current source.
- FlashQuery contracts: HIGH — verified against preload/types and Phase 3 implementation summary.
- Badge placement: MEDIUM — existing title chrome is outside `EditorPanel`, so planner must choose the exact implementation boundary.
- Test strategy: HIGH — derived from the mandatory test plan and current test infrastructure.

