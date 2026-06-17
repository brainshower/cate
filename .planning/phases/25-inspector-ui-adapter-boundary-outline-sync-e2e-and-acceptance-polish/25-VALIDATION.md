---
phase: 25-inspector-ui-adapter-boundary-outline-sync-e2e-and-acceptance-polish
status: completed
date: 2026-06-17
---

# Phase 25 Validation

## Validation Strategy

Phase 25 validation checks product-doc requirements for REQ-010 through REQ-012 and REQ-019 through REQ-037, plus end-to-end closeout of Phase 24 SC Inspector foundations. It also checks the supplied test-plan coverage split for `T-U-011`, `T-U-012`, `T-I-009` through `T-I-026`, `T-I-030`, `T-I-036` through `T-I-043`, `T-E-001` through `T-E-010`, and `T-M-001` through `T-M-006`.

## Automated Coverage Matrix

| Coverage Area | Required IDs | Planned Evidence |
|---|---|---|
| SC panel UI, embeddings-only cards, config, cards, score pies | T-I-009, T-I-010, T-I-011, T-I-012, T-I-013, T-I-030, T-E-003, T-E-005, T-E-008 | Component tests plus E2E visible interaction tests |
| Exception states and loading/supersession | T-I-014 through T-I-026, T-E-009, T-E-010 | Component/integration state-transition tests plus E2E source-to-preview and empty-to-loaded flows |
| Adapter boundary, mapping, diagnostics, cache/stale | T-U-011, T-U-012, T-I-040 through T-I-043 | Provider/mapping unit tests and panel integration tests |
| Outline sync | T-I-036 through T-I-039, T-E-004, T-E-006 | Outline component tests and Electron preview/Outline sync tests |
| Dock/main/canvas/open/keyboard acceptance | T-E-001, T-E-002, T-E-007, T-E-008 | Electron E2E tests using real visible UI |
| Manual acceptance | T-M-001 through T-M-006 | `25-MANUAL-ACCEPTANCE.md` or final summary notes |

## Phase Completion Gate

Before Phase 25 is considered complete:

- All four plan summaries must exist.
- The phase summary must state that downstream agents read the two product docs.
- `npm run typecheck` must pass under Node 20 or 22.
- Focused unit/component tests for SC panel, provider, Outline, and existing Phase 24 touchpoints must pass.
- Required Semantic Connections E2E specs must pass after build.
- Manual acceptance notes must cover `T-M-001` through `T-M-006`.

## Planned Closeout Commands

- `npx -p node@22 npm test -- src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/OutlinePanel.test.tsx`
- `npx -p node@22 npm test -- src/renderer/panels/EditorPanel.test.tsx src/renderer/docking/DockSplitContainer.test.tsx`
- `npx -p node@22 npm run build`
- `npx -p node@22 npm run test:e2e -- e2e/semantic-connections-preview-selection.spec.ts e2e/semantic-connections-inspector.spec.ts`
- `npx -p node@22 npm run typecheck`

## Completed Closeout Evidence

Completed on 2026-06-17 by plan 25-04.

- `npx -p node@22 npm test -- src/renderer/panels/SemanticConnectionsPanel.test.tsx src/renderer/lib/semanticConnectionsProvider.test.ts src/renderer/panels/OutlinePanel.test.tsx src/renderer/panels/EditorPanel.test.tsx` - Passed, 4 files / 107 tests.
- `npx -p node@22 npm run build` - Passed, Electron/Vite production build completed.
- `npx -p node@22 npm run test:e2e -- e2e/semantic-connections-preview-selection.spec.ts e2e/semantic-connections-inspector.spec.ts` - Passed, 9 Electron tests covering `T-E-001` through `T-E-010`.
- `npx -p node@22 npm run typecheck` - Passed, `tsc --noEmit`.
- `25-MANUAL-ACCEPTANCE.md` - Completed with `T-M-001` through `T-M-006` pass notes and residual-risk notes.
