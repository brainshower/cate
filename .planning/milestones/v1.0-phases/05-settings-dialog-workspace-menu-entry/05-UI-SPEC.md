---
phase: 05
slug: settings-dialog-workspace-menu-entry
status: draft
shadcn_initialized: false
preset: none
created: 2026-05-29
---

# Phase 05 - UI Design Contract

> Visual and interaction contract for Phase 5: Settings Dialog + Workspace Menu Entry.

## Mandatory Source Guardrail

Every downstream planner, executor, checker, and auditor that touches Phase 5 implementation or tests MUST read these two external product documents first, before local plans or code:

1. `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md`
2. `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md`

Use Requirements Spec section 6.7 as the canonical product source for REQ-034 through REQ-039. Use Test Plan section 4.5 as the canonical verification source for T-U-055 and T-I-050 through T-I-078. If anything is ambiguous, re-read those two documents before asking the user.

## Scope And Surfaces

| Surface | Contract |
|---------|----------|
| `FlashQueryConnectionDialog` | Dense Cate desktop modal for first-time setup and edit/remove of the selected workspace's FlashQuery HTTP connection. |
| Dialog form | URL field, bearer-token field with reveal toggle, inline dry-run test action, save/cancel/remove footer actions. |
| Dialog mounting | Mounted in the existing root modal section beside `SavedLayoutsDialog`; controlled by `useUIStore.showFlashQueryConnectionDialog`. |
| Workspace context menu | Native OS context-menu entry opened from `WorkspaceTab`; no React-rendered custom menu. |

Out of scope: editor URI routing, vault badge, full E2E happy path, visual signoff execution, vault document creation, frontmatter editing, conflict detection, OAuth, keychain storage, stdio transport, and any new standalone settings page.

## Design System

| Property | Value |
|----------|-------|
| Tool | Cate manual token system; no shadcn and no new UI framework. |
| Preset | Not applicable. |
| Component library | Existing React components only; mirror `SavedLayoutsDialog.tsx` chrome and behavior. |
| Icon library | `@phosphor-icons/react`: `Lightning`, `Eye`, `EyeSlash`, `CheckCircle`, `XCircle`, `X`. |
| Font | System stack from `globals.css`: `-apple-system`, `BlinkMacSystemFont`, `SF Pro Text`, `Helvetica Neue`, sans-serif. |

Use semantic Cate utility classes from `src/renderer/styles/globals.css`: `text-primary`, `text-secondary`, `text-muted`, `bg-surface-*`, `bg-hover`, `bg-hover-strong`, `border-subtle`, `border-strong`, `border-focus`, `placeholder:text-muted`.

Do not use rendered stock Tailwind neutral palette classes for dialog surfaces or text: no `zinc`, `gray`, or `slate` classes in Phase 5 UI output. T-U-104 must enforce this for the dialog.

## Layout Contract

| Element | Contract |
|---------|----------|
| Overlay | Match `SavedLayoutsDialog`: fixed full-screen overlay, `z-50`, `bg-black/40`, click outside closes. |
| Dialog shell | Width `520px` to `640px`; max width `calc(100vw - 32px)`; rounded Cate modal chrome; `bg-surface-4/85` or `bg-surface-1`; `border border-subtle` or existing dialog border treatment; backdrop blur allowed because existing dialog uses it. |
| Header | Horizontal title bar, 20px left/right padding, 16px top/bottom padding, bottom border `border-subtle`. |
| Header icon | `Lightning` size 20, teal, visually anchored left of title block. |
| Title block | Title on first line, subtitle directly below. |
| Body | 20px horizontal padding, 16px to 20px vertical padding, vertical stack. |
| Footer | Left-aligned remove action; right-aligned Cancel and Save. Footer separated from body by `border-t border-subtle`. |
| Touch/click targets | Icon-only close and reveal buttons: 28px minimum. Primary/secondary footer buttons: 32px minimum height. |

Dialog content must stay within the shell at desktop and narrow widths. Long workspace names, URLs, tokens, and errors must truncate or wrap without overlapping controls.

## Spacing Scale

Declared values use Cate/Tailwind multiples of 4:

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon/text micro-gaps, inline confirmation gap. |
| sm | 8px | Field helper gap, button icon gap, compact row gap. |
| md | 16px | Field-to-field spacing, body vertical rhythm. |
| lg | 24px | Header/footer horizontal rhythm when matching existing dialog scale. |
| xl | 32px | Minimum edge-safe mobile/narrow dialog inset. |
| 2xl | 48px | Not used inside this dense dialog. |
| 3xl | 64px | Not used in Phase 5. |

Exceptions: close/reveal icon buttons may use 28px square hit areas to match Cate compact desktop controls; all other interactive targets should be at least 32px tall.

## Typography

Use exactly these sizes and two weights:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Helper / caption | 11px | 400 | 1.4 |
| Label / button / field | 12px | 400 or 600 | 1.4 |
| Body / input value | 13px | 400 | 1.5 |
| Dialog title | 16px | 600 | 1.2 |

No viewport-scaled type. Letter spacing is `0` except existing all-caps section labels elsewhere in Cate; this dialog does not need all-caps labels.

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `bg-surface-4/85` or `bg-surface-1` | Modal shell and main body background. |
| Secondary (30%) | `bg-surface-5`, `bg-surface-3`, `border-subtle`, `bg-hover` | Inputs, secondary buttons, hover/focus rows, footer/header separation. |
| Accent (10%) | `#5AD8B8` / teal Phosphor tint | Lightning icon, Save button background, success identity adjacency only. |
| Destructive | Muted red utility treatment such as `text-red-400`, `bg-red-600/10` | Remove connection, failed test result, save failure. |
| Success | Green utility treatment such as `text-green-400`, `bg-green-600/10` | Successful test result only. |

Accent reserved for: `Lightning` glyph, primary `Save` button, and FlashQuery identity highlight. Do not apply teal to every interactive element. Secondary buttons use semantic neutral surface tokens.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Dialog title | `FlashQuery Connection` |
| Dialog subtitle | `For workspace: <workspace name>` |
| URL label | `FlashQuery URL` |
| URL placeholder | `https://fq.example.com` or `http://localhost:3100` |
| URL helper | `The HTTP base URL where FlashQuery's MCP server is listening.` |
| URL invalid error | `Enter a valid http:// or https:// URL.` |
| Token label | `Bearer token` |
| Token helper | `A bearer token issued by FlashQuery. Stored locally with this workspace.` |
| Test CTA | `Test connection` |
| Test probing state | `Testing...` |
| Test success | `Connected to FlashQuery v<version> (instance <instance_id_short>)` |
| Test failure | One-line error reason returned by probe. |
| Primary CTA | `Save` |
| Secondary CTA | `Cancel` |
| Remove action | `Remove connection` |
| Disabled remove tooltip | `Currently no connection to remove.` |
| Remove confirmation | `Really remove?` with adjacent `Yes` and `No` controls. |
| Save failure | One-line problem summary from IPC error; keep dialog open. |
| Workspace menu label | `FlashQuery Connection...` |

There is no empty-state illustration or marketing explanation. First-time setup is represented by empty URL/token fields and a disabled remove action.

## Component And Interaction States

### Dialog Closed

- `showFlashQueryConnectionDialog === false` renders nothing for `FlashQueryConnectionDialog`.
- No overlay exists, no keyboard listener remains active, and no form state persists.
- Covered by T-I-051.

### Dialog Open

- `showFlashQueryConnectionDialog === true` renders the overlay and modal.
- On each open, local form state re-initializes from the selected `WorkspaceInfo.flashqueryConnection` plus token read through main/preload; previous unsaved edits are discarded.
- Header shows `Lightning`, `FlashQuery Connection`, `For workspace: <workspace name>`, and an `X` close button.
- Initial focus goes to the URL field.
- Covered by T-I-050, T-I-052, T-I-060, T-I-061, T-I-074.

### First-Time Setup Mode

- URL and token fields are empty.
- Test result area is empty.
- Remove connection button is disabled.
- Hover/focus on disabled remove exposes tooltip: `Currently no connection to remove.`
- Covered by T-I-061 and T-I-071.

### Edit Mode

- URL is prefilled from `WorkspaceInfo.flashqueryConnection.url`.
- Token is prefilled only through the approved main/preload token read path; do not put token into app store, workspace metadata, logs, or test snapshots.
- Remove connection is enabled.
- Covered by T-I-060, T-I-072, T-I-073, T-I-074.

### URL Field

- Blur validates with `new URL(value)` plus protocol check for `http:` or `https:`.
- Invalid blur renders inline error below helper text and marks field with `border-focus` only on focus and destructive text/error below; do not use browser-native validation bubbles.
- Save repeats the same validation before dispatch.
- Invalid URL blocks Test connection and Save dispatches.
- Covered by T-I-056, T-I-059, T-I-068.

### Bearer Token Field

- Default input `type="password"`.
- Reveal toggle is an icon button inside the right edge of the field.
- When masked, show `Eye`; when visible, show `EyeSlash`.
- Toggle changes only input visibility and accessible label; it does not persist token state.
- Covered by T-I-057 and T-I-058.

### Test Connection

- Button sits below the token field, before footer actions.
- Clicking clears any existing result and dispatches dry-run probe with current field values.
- Probe MUST NOT call `flashquery:setConnection` and MUST NOT persist URL/token.
- While probing, disable Test connection and show `Testing...`.
- Success renders `CheckCircle` plus success copy in green treatment.
- Failure renders `XCircle` plus one-line error reason in red treatment.
- Result area is empty on first open and clears between attempts.
- Covered by T-I-062 through T-I-066.

### Save

- Save is the only primary action, teal `#5AD8B8`, visible focus ring, right side of footer.
- Save validates URL, then dispatches `flashquery:setConnection(workspaceId, { transport: 'http', url, auth: { type: 'bearer', token } })`.
- On success, close the dialog and discard local form state.
- On failure, render a one-line error in the dialog and keep it open.
- Covered by T-I-067 through T-I-069.

### Cancel, X, Escape, Click-Outside

- Cancel, close `X`, Escape, and overlay click all close without dispatching `flashquery:setConnection`, probe, token write, or any persistence IPC.
- All four paths discard unsaved field edits.
- `X` uses Phosphor `X` and standard compact icon button treatment.
- Covered by T-I-053, T-I-054, T-I-055, T-I-070.

### Remove Disabled And Confirmation

- First-time setup: disabled remove action with tooltip `Currently no connection to remove.`
- Edit mode first click: replace remove button content with inline confirmation `Really remove?` and adjacent `Yes` / `No`.
- Confirmation remains for about 3 seconds or until user chooses.
- `No` restores the normal remove action and dispatches nothing.
- `Yes` dispatches `flashquery:setConnection(workspaceId, null)` and closes on success.
- Covered by T-I-071 through T-I-073.

## Workspace Context Menu Contract

- Rendering layer is native OS menu through `window.electronAPI.showContextMenu(items)`.
- Do not add a custom React dropdown, popover, portal, or menu library for this workspace menu.
- Add `{ id: 'flashquery-connection', label: 'FlashQuery Connection...' }`.
- Placement is locked:
  1. `copy-cwd`
  2. separator
  3. `flashquery-connection`
  4. separator
  5. `duplicate`
- The item is always present whenever a workspace context menu opens.
- Selecting it runs `useUIStore.getState().setShowFlashQueryConnectionDialog(true)`.
- It must not select, duplicate, close, or mutate the workspace.
- Covered by T-I-075 through T-I-078 and manual check T-M-006.

## Accessibility And Keyboard

- Dialog uses `role="dialog"` and `aria-modal="true"`.
- Dialog has an accessible name from `FlashQuery Connection`.
- Subtitle remains visible text; use `aria-describedby` if wiring is straightforward.
- Initial focus goes to the URL input.
- Escape closes and prevents propagation while dialog is open.
- Tab order: URL, token, reveal toggle, Test connection, Remove/confirmation controls, Cancel, Save, X. If implementation follows existing close-button-first DOM order, tests must still confirm all controls are keyboard reachable.
- Focus ring must be visible on buttons and fields using `border-focus`, `focus-visible:ring`, or existing Cate focus treatment.
- Icon-only buttons have accessible labels: `Show bearer token`, `Hide bearer token`, `Close FlashQuery connection dialog`.
- Test result messages should be announced with `aria-live="polite"`.
- Error text should be programmatically associated with the field or action where practical.

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable; Cate uses manual tokens and no `components.json`. |
| third-party | none | no third-party registry allowed for this phase. |

## Test Mapping

| Test ID | Contract Area |
|---------|---------------|
| T-U-055 | UI-store `showFlashQueryConnectionDialog` setter. |
| T-I-050..055 | Dialog render, title/header, Escape, click-outside, X close. |
| T-I-056..061 | URL/token fields, reveal toggle, invalid URL, setup/edit prepopulation. |
| T-I-062..066 | Test connection dispatch/result/no-persistence/clearing behavior. |
| T-I-067..074 | Save, invalid save, save failure, cancel, remove disabled/confirm/clear, reopen reset. |
| T-I-075..078 | Native workspace context-menu item presence, order, action, no custom dropdown. |
| T-U-104 | Dialog rendered output contains no stock Tailwind neutral color classes. |
| T-M-005 | Manual visual fidelity: connection settings dialog passed and failed states. |
| T-M-006 | Manual visual fidelity: workspace context-menu entry order and native rendering. |

## Downstream Implementation Notes

- Reuse existing `showFlashQueryConnectionDialog` state; do not duplicate UI-store state.
- If dry-run probe or token prepopulation APIs are missing, add narrow main/preload IPC methods. Renderer must not call FlashQuery over `fetch` directly.
- Keep token only in dialog-local state and clear it on close/open transitions.
- Use `flashquery:setConnection` only for Save and confirmed Remove. Test connection must use a dry-run probe path.
- Use `new URL()` plus protocol check for URL validation.
- Mount `FlashQueryConnectionDialog` beside `SavedLayoutsDialog` in the root modal section.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
