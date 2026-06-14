# Phase 22 UI Spec: Document Outline Source Mode

**Source:** Derived from the supplied Document Outline requirements and test plan.
**Status:** Locked for Phase 22 implementation.

## Surface

The Outline is a Cate panel, not a standalone sidebar system. It opens in the existing right dock zone and participates in the normal dock tab/split behavior.

## Toolbar Control

- Location: `EditorPanel.tsx`, top-right editor toolbar, adjacent to the existing Preview button.
- Visibility: regular editor mode only; hidden in diff mode.
- State: muted when no associated Outline is open; blue-highlighted when the associated Outline is open.
- Labeling: title/accessible label identifies the action as toggling the document outline.
- Behavior: click opens or reuses the Outline in `{ target: 'dock', zone: 'right' }`; click again closes only the associated Outline panel.

## Panel Layout

- Header: compact Cate panel chrome with Outline identity.
- Search input: pinned below the header; includes a clear button only when text is present.
- Depth control: options H1-H2, H1-H3, H1-H4, H1-H5, H1-H6; default H1-H3.
- Body: scrollable heading list.
- Empty state: safe, quiet empty state when no active editor/model exists or no headings match.

## Heading Rows

- Indentation: L1 14px, L2 28px, L3 42px, L4 56px, L5 70px, L6 84px.
- Typography: L1 stronger than L2; L4-L6 smaller.
- Border: 2px transparent left border; accent color when active or search-focused.
- Hover: subtle Cate-compatible hover background.
- Long headings: truncate or wrap according to existing Cate panel conventions without overlapping controls.

## Visual States

- Active cursor heading: subtle blue background plus accent left border.
- Search match row: warm yellow background.
- Search substring: darker yellow highlight span over the exact matched text.
- Search focus from Enter-cycle: blue background, white text, and accent left border.
- These states must remain visually distinct in light and dark themes.

## Non-Interference

Do not add Document Chat UI. Do not add Graph Explorer unified selection UI. Do not change the current Preview/Source toggle semantics. Preserve editor save, dirty-state, model-cache, and dispose behavior.
