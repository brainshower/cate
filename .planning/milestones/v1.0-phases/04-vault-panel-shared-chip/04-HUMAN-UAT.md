---
status: complete
phase: 04-vault-panel-shared-chip
source:
  - 04-VERIFICATION.md
started: 2026-05-29T16:26:41Z
updated: 2026-05-30T05:45:00Z
---

# Phase 04 Human UAT

## Current Test

[testing complete]

## Tests

### 1. Visual Panel UAT

expected: |
  Open Cate and inspect the FlashQuery Vault panel header and five states in a real renderer.
  Header, chip, refresh affordance, no-connection, connecting, disconnected, empty-vault,
  and populated tree states match the product mockup intent with no clipping, overlap,
  or visually broken controls.

result: pass

evidence: |
  Exercised during the 2026-05-30 milestone v1.0 close-out testing session. Live inspection
  in the running dev process (`npm run dev`) walked the panel through:

  - **No-connection state:** Plug icon + "No FlashQuery connection configured for this workspace"
    copy + "Open workspace settings" button rendered as designed.
  - **Connecting / live states:** Chip showed "Live" against a live `localhost:3100` FlashQuery
    server; transitions verified clean.
  - **Disconnected state:** Triggered by setting the stub server unavailable; chip transitioned
    to "Disconnected" button with retry; error tooltip surfaced.
  - **Empty-vault state:** Seeded empty stub vault; "This vault has no documents yet." copy
    rendered without any create affordance.
  - **Populated state:** Browsed the real vault tree (Archive, Captures, Meta, Product, Reference,
    Research, Roadmap, Trash root folders) with lazy expansion, indentation, icons, hover, and
    selection.

  The session surfaced three real visual defects, all RESOLVED on `main`:

  - **Gap 9** — vault editor tab close X rendered outside the pill (`a3829fb` fix:
    `min-w-0` on `ChipSurface`, `truncate` on host span).
  - **Gap 10** — vault editor tab filename hidden behind the badge (`8221e0b` fix:
    `max-w-[120px]` cap on `VaultBadge` `ChipSurface`).
  - **Gap 11** — vault editor tab too narrow to fit filename + badge + X (`7caa565` fix:
    conditional `max-w-[280px]` for vault editor tabs in `DockTabBar.tsx`).

  After those three fixes landed, the running app inspection showed clean visual fit, no
  clipping, no overlap, and no broken controls across all five states.

### 2. End-to-End User Flow UAT

expected: |
  Exercise the panel against a real or fixture FlashQuery connection: create/open the panel,
  receive live/disconnected status, expand a folder, open a document in dock and canvas,
  and refresh. The flow works from the user's perspective without exposing
  create-new-vault-document actions.

result: pass

evidence: |
  Exercised during the 2026-05-30 milestone v1.0 close-out testing session against a real
  FlashQuery HTTP MCP server at `localhost:3100`:

  - **Configure connection** via workspace right-click → FlashQuery Connection... → entered URL
    and bearer token from `.env` (`MCP_AUTH_SECRET`) → Save. (Surfaced and resolved Gap 7:
    Test Connection now authenticates the bearer, commit `9820189`.)
  - **Status transition** to live observed on first vault panel mount; chip header showed
    "Live" with `localhost:3100`.
  - **Open vault panel** via Cmd+K → "New FlashQuery Vault" (Command Palette entry added
    post-milestone in `6445909` to resolve Gap 6 — pre-fix there was no UI launcher outside
    the E2E harness). Also tested the post-milestone sidebar-mounted vault view (commit
    `71659cd`).
  - **Expand folder** by clicking Roadmap → Tech Debt → Codebase Audit (23-May-2026).
    Lazy children loaded, indentation rendered cleanly.
  - **Open document** by double-clicking `Findings.md` → Monaco editor mounted in dock; vault
    badge rendered `Vault · localhost:3100` with U+00B7 separator. Repeated for a second doc
    (`scratch1.md`) in a side tab.
  - **Open on Canvas** verified via right-click vault row → "Open on Canvas" → editor placed
    on canvas.
  - **Refresh** verified by clicking the refresh affordance in panel header → tree reloaded,
    selection and expansion preserved.
  - **Edit + Cmd+S round-trip** verified: typed in Monaco, dirty dot appeared, pressed Cmd+S,
    `flashquery:writeDocument` IPC fired, FlashQuery server processed the write (after the
    user fixed an unrelated server-side `DATABASE_URL` config issue from port 6543 →  port
    5432), dirty cleared, document reopen showed persisted body.
  - **No create-new-vault-document affordance** observed anywhere — context menu on document
    rows showed exactly "Open" / "Open on Canvas"; folder context menu was inert; no menu
    entry, button, or keyboard shortcut produced a create action.

  All session findings on the Cate side were either valid defects (RESOLVED on `main` per Gaps
  6-11 commits listed in Gap 1) or unrelated server-side issues parked as FlashQuery server
  follow-ups (`Gaps.md` records these).

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None remaining. All visual and end-to-end defects discovered during this UAT were RESOLVED
on `main` in commits `9f4f3bd`, `6445909`, `9820189`, `a3829fb`, `8221e0b`, `7caa565`, plus
the scope-expansion sidebar feature `71659cd`. Documented in detail in `Gaps.md` (Phase 7
Gap 6 through Gap 11), each with full Auditor Verification sections confirming RESOLVED.
