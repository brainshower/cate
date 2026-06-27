---
slug: screenshot-drop-denied
status: resolved
trigger: "Screenshot drag-and-drop into Cate surfaces fails — the browser-panel screenshot button writes a PNG to the Desktop (REQ-010/§7.6, app.getPath('desktop')), but dropping that screenshot onto a Cate surface (canvas/terminal/editor) triggers fs:stat + fs:readBinary on the Desktop path, which Cate's allowed-directory path guard denies."
created: 2026-06-26
updated: 2026-06-26
---

# Debug Session: screenshot-drop-denied

## Symptoms

- **Expected behavior:** Dropping a browser-panel screenshot (taken via the screenshot button) onto a Cate surface (canvas node, TerminalPanel, editor, or other drop target that accepts `application/cate-file`) ingests the image successfully.
- **Actual behavior:** The drop fails. The main process logs `Access denied: path "/Users/matt/Desktop/screenshot-2026-06-26T23-51-37.png" is outside allowed directories` from BOTH the `fs:stat` and `fs:readBinary` IPC handlers (readBinary fires 2×).
- **Error messages:**
  - `[fs:stat] Error: Access denied: path "/Users/matt/Desktop/screenshot-…png" is outside allowed directories`
  - `[fs:readBinary] Error: Access denied: path "/Users/matt/Desktop/screenshot-…png" is outside allowed directories` (twice)
  - Thrown from `validatePath` → `validatePathStrict` in `dist/main/index.js` (source: `src/main/index.ts`), invoked by the `fs:stat` / `fs:readBinary` ipcMain handlers.
- **Timeline:** Observed 2026-06-26 ~20:51 during a dev run while manually testing the Phase 26 Browser Uplift. Unknown whether pre-existing or a Phase 26 regression — a key question for this investigation.
- **Reproduction:**
  1. Open a browser panel, navigate to any page.
  2. Click the screenshot button → `window.electronAPI.webviewScreenshot(wcId)` writes `screenshot-<ts>.png` to `app.getPath('desktop')` and returns `{ filePath, dataUrl }`. The capture itself succeeds (file is created on Desktop).
  3. Drag the resulting 5-second thumbnail (`handleScreenshotDragStart`, BrowserPanel.tsx ~line 186) onto a Cate drop surface (canvas/terminal/editor).
  4. The drop handler reads the dragged file path back via `fs:stat` + `fs:readBinary`, which the allowed-directory guard rejects because the Desktop is outside Cate's allowed roots.

## Key code locations (starting points, verified)

- `src/renderer/panels/BrowserPanel.tsx` — `handleScreenshot` (line 165), `handleScreenshotDragStart` (line 186): sets drag data `application/cate-file` = `screenshot.filePath` (Desktop path), `text/uri-list`, `text/plain`; uses `dataUrl` for the drag image.
- `src/main/ipc/capture.ts` — `WEBVIEW_SCREENSHOT` handler (line 27): writes Desktop PNG, returns `{ filePath, dataUrl }` (REQ-010 / INV-04 / §7.6).
- `src/main/ipc/pathValidation.ts` — `validatePath` (line 141), `validatePathStrict` (line 166), `isWithinAllowedRoots` (line 37), `allowedRoots` Set (line 10).
- `src/renderer/canvas/Canvas.tsx` — `handleFileDrop` (line 208): calls `window.electronAPI.fsStat(filePath)` (line 265), then `openFileAsPanel(wsId, filePath, pos)` (line 273).
- `src/renderer/lib/fileRouting.ts` — `openFileAsPanel` (line 29): routes `.png` → `store.createDocument(...)` which mounts `DocumentPanel`.
- `src/renderer/panels/DocumentPanel.tsx` — `useEffect` (line 285): calls `window.electronAPI.fsReadBinary(filePath)` (line 296) — fires twice due to React strict mode or two render cycles.
- `src/main/ipc/filesystem.ts` — `FS_STAT` handler (line 633): calls `validatePathStrict(filePath)` with NO `ownerWindowId`. `FS_READ_BINARY` handler (line 575): calls `validatePathStrict(filePath, win?.id)`.

## Evidence

- timestamp: 2026-06-26T20:51:40 — `fs:stat` and `fs:readBinary` denied for `/Users/matt/Desktop/screenshot-2026-06-26T23-51-37.png` (live dev-run log). Capture succeeded (file written to Desktop); failure is on read-back during drop ingest.

- timestamp: 2026-06-26T21:30:00 — Confirmed full call chain: BrowserPanel.tsx:186 handleScreenshotDragStart sets `application/cate-file` = `screenshot.filePath` (Desktop path). Canvas.tsx:236 handleFileDrop reads it via `e.dataTransfer.getData('application/cate-file')`. Canvas.tsx:265 calls `window.electronAPI.fsStat(filePath)` — FIRST denial. fileRouting.ts:38 detects `.png` extension → `store.createDocument()`. DocumentPanel.tsx:296 calls `window.electronAPI.fsReadBinary(filePath)` — SECOND and THIRD denials.

- timestamp: 2026-06-26T21:30:01 — Confirmed allowed-roots logic: `pathValidation.ts` line 10 `allowedRoots` Set. `isWithinAllowedRoots` (line 37) allows: (a) `os.tmpdir()` and subtrees, (b) paths registered in `allowedRoots`. The only callers of `addAllowedRoot` are: `workspaceManager.ts:145` (workspace rootPath on create/update), `workspaceManager.ts:203` (same), `git.ts:431/467/490` (worktree paths), `installSubagents.ts:89` (home dir for agents), and `index.ts:1253` ONLY when `disableTrustScoping()` is true (dev-only flag). `app.getPath('desktop')` is NEVER added.

- timestamp: 2026-06-26T21:30:02 — Confirmed Desktop-write behavior in capture.ts: line 48 `const filePath = path.join(app.getPath('desktop'), fileName)`. This was IDENTICAL in the pre-Phase-26 handler in `src/main/index.ts` (removed by commit d917c25, feat(26-03)). The diff of d917c25 shows the Desktop write was a pure copy-paste; the behavior was NOT changed.

- timestamp: 2026-06-26T21:30:03 — Confirmed BrowserPanel.tsx screenshot drag was ALREADY using `application/cate-file` = `screenshot.filePath` (Desktop path) in the pre-Phase-26 baseline (commit 966b3c4). Line 175: `e.dataTransfer.setData('application/cate-file', screenshot.filePath)`. This code exists verbatim in the baseline.

- timestamp: 2026-06-26T21:30:04 — Confirmed Canvas.tsx drop also called `fsStat` in the baseline (966b3c4). However, the baseline Canvas did NOT call `openFileAsPanel` for image files — instead it called `readImageAsDataUrl` for magic-byte detection and then `addImageAnnotation` (canvas drawing) for images. That code path did NOT trigger DocumentPanel and thus did NOT call `fsReadBinary`. Commit 9a792d4 (feat: add native document rendering panel, 2026-05-25) replaced the image-special-case with `openFileAsPanel` which now routes PNGs through DocumentPanel → `fsReadBinary`.

- timestamp: 2026-06-26T21:30:05 — The `fs:stat` denial was pre-existing (baseline 966b3c4 already called `fsStat` on the Desktop path in handleFileDrop). The `fs:readBinary` failures are a regression introduced by commit 9a792d4 which replaced the image annotation path (no readBinary) with `openFileAsPanel` (creates DocumentPanel which calls readBinary). Phase 26 did NOT introduce this regression; it predates Phase 26.

## Current Focus

hypothesis: CONFIRMED. The Desktop path is never in `allowedRoots`. `fsStat` on the Desktop path has been failing since pre-Phase-26. `fsReadBinary` failures were introduced by commit 9a792d4 (May 25, 2026 — "add native document rendering panel"). Phase 26 (capture relocation, d917c25) preserved the Desktop-write behavior verbatim and did not introduce the drop failure.

next_action: N/A — diagnosis complete, goal is find_root_cause_only.

## Eliminated

- hypothesis: Phase 26 browser uplift introduced the regression
  evidence: BrowserPanel.tsx handleScreenshotDragStart with `application/cate-file` = Desktop path was already in 966b3c4 baseline. Canvas.tsx fsStat on dropped path was already in 966b3c4. The capture relocation (d917c25) was a pure code-move. The only behavioral change that worsened the failure was 9a792d4 (pre-Phase-26) which added DocumentPanel/readBinary.
  timestamp: 2026-06-26T21:30:05

- hypothesis: The path guard could be bypassed via grantFileAccess
  evidence: grantFileAccess requires a native dialog interaction (Save-As or Open-File). Screenshots written programmatically by the WEBVIEW_SCREENSHOT handler never go through those dialogs, so no grant is ever registered for the Desktop path.
  timestamp: 2026-06-26T21:30:06

## Resolution

root_cause: |
  The WEBVIEW_SCREENSHOT IPC handler (src/main/ipc/capture.ts:48) always writes the PNG to
  `app.getPath('desktop')`, which is NEVER added to pathValidation's `allowedRoots` Set.
  When the user drags the screenshot thumbnail onto the canvas, handleScreenshotDragStart
  (BrowserPanel.tsx:191) encodes the Desktop file path in the `application/cate-file` drag
  data transfer slot. Canvas.tsx handleFileDrop (line 265) reads that path and calls
  `window.electronAPI.fsStat(filePath)` — denied by `validatePathStrict` because Desktop
  is not in allowedRoots. Then `openFileAsPanel` (fileRouting.ts:38) detects `.png` →
  `createDocument` → mounts DocumentPanel, which calls `window.electronAPI.fsReadBinary(filePath)`
  (DocumentPanel.tsx:296) — also denied.

  Root cause in two parts:
  1. The screenshot writer always targets `app.getPath('desktop')`, a directory that is
     categorically excluded from allowedRoots (only workspace rootPaths, worktree paths,
     tmpdir, and the dev-only home-dir flag are ever added).
  2. The Canvas drop handler tries to ingest the screenshot via a filesystem round-trip
     through `fsStat` + `fsReadBinary`, both of which go through `validatePathStrict`.
     The in-memory `dataUrl` already available in the BrowserPanel state (and encoded in
     the drag transfer) is ignored entirely after the drag starts.

fix: |
  Option A — ingest the dropped screenshot from its in-memory data URL instead of
  re-reading the Desktop file, removing the filesystem round-trip entirely.
  - BrowserPanel.tsx handleScreenshotDragStart: also set drag MIME
    `application/cate-dataurl` = screenshot.dataUrl.
  - Canvas.tsx handleFileDrop: when `application/cate-dataurl` is present, create an
    image Document panel from the data URL (keeping filePath for title / Show in
    Finder) and return before any fsStat/openFileAsPanel path.
  - appStore.createDocument: new optional `inlineDataUrl` param, stored on PanelState.
  - PanelState.inlineDataUrl (types.ts): live-only field, NOT serialized into the
    session snapshot (session.ts picks fields explicitly), so no session bloat.
  - DocumentPanel.tsx: when inlineDataUrl is set, decode it to bytes (dataUrlToBytes)
    and render directly, skipping fsReadBinary.
  No security-boundary widening; REQ-010 contract ({ filePath, dataUrl } + Desktop PNG) intact.
verification: |
  npm run typecheck — PASS (clean). Static only per user instruction; manual drop
  re-test pending a dev relaunch. Caveat: inlineDataUrl is intentionally not persisted,
  so a screenshot Document panel left open across an app restart will fall back to
  fsReadBinary on the Desktop path and show the graceful "Failed to load / Show in
  Finder" state — acceptable for an ephemeral screenshot.
files_changed:
  - src/shared/types.ts
  - src/renderer/stores/appStore.ts
  - src/renderer/panels/BrowserPanel.tsx
  - src/renderer/canvas/Canvas.tsx
  - src/renderer/panels/DocumentPanel.tsx
