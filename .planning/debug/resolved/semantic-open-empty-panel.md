---
status: resolved
trigger: "Semantic connection open icon opens an empty tab titled Panel instead of the referenced document editor"
created: 2026-06-17
updated: 2026-06-17
---

## Symptoms

- Expected behavior: clicking a semantic connection card's external-link icon opens the referenced document in a full Monaco editor, in both docked and canvas graph modes.
- Actual behavior: clicking the icon opens a new blank tab/window titled "Panel" or titled like the target file, but no document editor content loads.
- Error messages: none reported.
- Timeline: reproduced after prior UI routing fixes.
- Reproduction: open Semantic Connections, hover a card, click the external-link icon for another FlashQuery document.

## Current Focus

- hypothesis: Detached shells need to own newly opened editor panels locally, and FlashQuery cross-document matches must not be treated as in-document just because the heading maps to the source preview.
- test: Focused E2E coverage clicks the semantic card open icon from main dock, main canvas, and a detached canvas dock window, then asserts the referenced document loads in Monaco.
- expecting: All focused E2E cases pass and server-backed document text is visible.
- next_action: complete

## Evidence

- 2026-06-17: User reports the action currently opens an empty "Panel" in both Canvas and non-Canvas modes.
- 2026-06-17: Existing unit tests only verify the open routing call shape, not that Electron renders a loaded editor.
- 2026-06-17: Main-window E2E cases opened a real editor, so the first missing coverage was detached shell behavior.
- 2026-06-17: Detached canvas/dock-window E2E reproduced the broken route until the shell open callback and provider in-document flag were fixed.

## Eliminated

## Resolution

- root_cause: Detached dock/panel windows render from local panel maps, but Semantic Connections fell back to app-store `openFileAsPanel`, so opened editors were not owned by the shell that needed to render them. The FlashQuery provider also marked cross-document matches as `inDocument` when their headings mapped to source preview headings, causing some target opens to short-circuit as same-document jumps.
- fix: Added shell-injected editor open callbacks for detached dock and panel windows, shared editor panel construction, and changed provider-created FlashQuery matches to remain external document targets. Added E2E harness support for detaching panels with child panel snapshots and FlashQuery stub semantic chunk metadata.
- verification: `npm run typecheck`; `npm run build`; `npm test -- src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/SemanticConnectionsPanel.test.tsx`; `npx playwright test e2e/semantic-connections-inspector.spec.ts -g "semantic connection open icon opens referenced"`.
- files_changed: src/renderer/shells/DockWindowShell.tsx, src/renderer/shells/PanelWindowShell.tsx, src/renderer/panels/registry.ts, src/renderer/lib/editorPanelFactory.ts, src/renderer/lib/semanticConnectionsProvider.ts, src/renderer/lib/e2eHarness.ts, e2e/fixtures/flashquery-server.ts, e2e/semantic-connections-inspector.spec.ts
