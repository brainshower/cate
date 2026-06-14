# Phase 23: Preview Routing and Final Hardening - Patterns

## Pattern Map

| Role | Files | Existing Pattern To Reuse |
|---|---|---|
| Heading parsing and inline stripping | `src/renderer/lib/parseDocumentHeadings.ts`, `src/renderer/lib/parseDocumentHeadings.test.ts` | Extend the existing pure utility style. Keep helpers free of React/Electron/Zustand and prove behavior with node Vitest tests. |
| Markdown preview rendering | `src/renderer/panels/EditorPanel.tsx`, `src/renderer/panels/EditorPanel.test.tsx` | Reuse the existing local `MarkdownPreview` component and `ReactMarkdown` `components` override map for h1-h6. |
| Preview state source | `src/shared/types.ts`, `src/renderer/stores/appStore.ts`, `src/renderer/panels/EditorPanel.tsx` | Continue using `PanelState.markdownPreview` as the state of truth for Preview/Source mode. |
| Outline navigation | `src/renderer/panels/OutlinePanel.tsx`, `src/renderer/panels/OutlinePanel.test.tsx` | Preserve current source-mode `revealLineInCenter`, `setPosition`, and `focus` behavior; branch only when preview mode is active. |
| Active editor bridge | `src/renderer/lib/activeEditorRegistry.ts` | Extend the Phase 22 adapter narrowly if Outline needs preview mode and preview-scroll callback access. Keep cleanup/dispose behavior intact. |
| jsdom verification | `src/renderer/panels/EditorPanel.test.tsx`, `src/renderer/panels/OutlinePanel.test.tsx` | Mock DOM scrolling, Monaco editor calls, timers, and app-store state using existing test conventions. |

## Data Flow

Markdown source content is rendered by `MarkdownPreview` inside `EditorPanel.tsx`. Phase 23 adds deterministic heading IDs to the rendered preview headings. The same slug helper is used by preview rendering and preview-scroll lookup.

Outline navigation flow:

1. `OutlinePanel` keeps parsed headings from the active editor model, as implemented in Phase 22.
2. On row click or Enter-to-cycle, Outline checks whether the active editor panel is in Markdown preview mode.
3. If preview is inactive, Outline keeps the existing Monaco source navigation behavior.
4. If preview is active, Outline calls the preview scroll API with the parsed heading text.
5. The preview scroll API strips inline Markdown formatting, computes the slug, finds the matching heading element, calls smooth `scrollIntoView`, applies blue flash, and removes it after 1.5 seconds.

## Implementation Guidance

- Use `slugifyHeading` or an equivalent exact name consistently across preview render and tests.
- Lock the regex semantics from REQ-017: `/[^\w\s-]/g`, whitespace collapse to `-`, trim leading/trailing hyphens.
- Duplicate heading ID behavior is render-order based: first heading gets the base slug, next duplicate gets `-1`, then `-2`.
- Do not dispatch `preview-section-select`.
- Do not add Document Chat, Graph Explorer selection, or Electron IPC.
- Keep test names or comments traceable to T-U-015, T-U-016, and T-I-023 through T-I-030.

## Verification Pattern

Run focused commands first, then typecheck:

```bash
npx -p node@22 npm test -- src/renderer/lib/parseDocumentHeadings.test.ts
npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/panels/OutlinePanel.test.tsx
npx -p node@22 npm run typecheck
```
