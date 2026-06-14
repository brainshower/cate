# Roadmap: Cate FlashQuery Integration

## Milestones

- ✅ **v1.0 Vault Connect, Read, Edit** — Phases 1-7 (shipped 2026-05-31) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Release Readiness + Provenance Closeout** — Phases 8-13 (shipped 2026-06-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 FlashQuery Milestone 2** — Phases 14-21 (completed 2026-06-06) — [archive](milestones/v1.2-ROADMAP.md)
- 🔄 **v1.3 Document Outline** — Phases 22-23 (active)

## Phases

<details>
<summary>✅ v1.0 Vault Connect, Read, Edit (Phases 1-7) — SHIPPED 2026-05-31</summary>

See archived roadmap for full phase details: [milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md)

</details>

<details>
<summary>✅ v1.1 Release Readiness + Provenance Closeout (Phases 8-13) — SHIPPED 2026-06-02</summary>

See archived roadmap for full phase details: [milestones/v1.1-ROADMAP.md](milestones/v1.1-ROADMAP.md)

</details>

<details>
<summary>✅ v1.2 FlashQuery Milestone 2 (Phases 14-21) — COMPLETED 2026-06-06</summary>

See archived roadmap for full phase details: [milestones/v1.2-ROADMAP.md](milestones/v1.2-ROADMAP.md)

</details>

<details open>
<summary>🔄 v1.3 Document Outline (Phases 22-23) — ACTIVE</summary>

Milestone goal: ship a first-class Document Outline panel for active Monaco editors with source-mode navigation, search, and Markdown-preview scroll routing.

Canonical source docs:

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Monaco Extension Testing/Outline-Chat/Document Outline Test Plan.md`

### Phase 22: Outline Foundation and Source Navigation

**Goal:** Register the Outline panel, bind it to the active Monaco editor, and ship the full source-mode Outline experience with parser, rendering, search, and dock toolbar integration.

**Requirements:** REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-020, REQ-021, REQ-022

**Bundled test coverage:**

- Unit: T-U-001 through T-U-014.
- Integration/component: T-I-001 through T-I-022, plus T-I-031 through T-I-035 for cleanup and live-update behavior.
- Acceptance/manual: T-A-001 through T-A-004, T-A-006, T-A-007, and T-M-001 through T-M-004 for source-mode visual and layout checks.

**Success criteria:**

1. `outline` is added to shared panel types, `PANEL_DEFINITIONS`, `PANEL_REGISTRY`, and app-store creation with focused registry/shared tests.
2. Editor panels render an Outline toggle next to Preview, hidden in diff mode, with correct muted/on visual state and right-dock open/close behavior.
3. A pure heading parser covers Markdown, HTML headings, and code section markers with depth filtering and inline-format stripping.
4. Outline binds to the active editor/model, rebinds on focus or model change, and shows a safe empty state when no editor is available.
5. Outline renders level-indented rows, tracks active cursor heading, jumps Monaco in source mode, and live-updates on debounced content/language/model changes.
6. Search supports case-insensitive highlighting, clear, Enter-to-cycle, wrapping, and visually distinct active/search states.
7. Outline state is per panel instance, theme-compatible, and does not regress existing editor save, dirty-state, model-cache, dispose, Preview toggle, Chat, or Graph Explorer behavior.

**Status:** Pending

### Phase 23: Preview Routing and Final Hardening

**Goal:** Add Markdown preview heading IDs and route Outline navigation through preview scroll targets with standalone blue flash, then verify the full Outline workflow end to end.

**Requirements:** REQ-017, REQ-018, REQ-019

**Bundled test coverage:**

- Unit: T-U-015 and T-U-016.
- Integration/component: T-I-023 through T-I-030.
- Acceptance/manual: T-A-005 plus a final rerun or review of Phase 22 acceptance/manual checks where preview routing can affect layout or interaction.

**Success criteria:**

1. Markdown preview headings receive deterministic IDs from a shared slug helper using the required regex and duplicate suffix behavior.
2. Preview scroll accepts Outline heading text, strips Markdown inline formatting, finds the matching rendered heading, scrolls smoothly, and applies/removes the 1.5s blue flash.
3. Outline clicks and Enter-to-cycle route to preview when `markdownPreview` is active and continue to route to Monaco source when preview is inactive.
4. Preview routing does not dispatch Graph Explorer `preview-section-select` events or implement unified selection behavior.
5. Duplicate headings, no-target headings, preview toggling, and source/preview transitions degrade safely without losing Outline state unnecessarily.
6. Final focused verification proves all 22 requirements are mapped, tested, and non-regressive.

**Status:** Pending

**Coverage:** 2 phases, 22/22 requirements mapped.

</details>

## Current Status

Active milestone: v1.3 Document Outline. Phase 22 is next.

## Notes

- Roadmap phases exist only when the project owner explicitly creates a milestone.
- v1.3 preserves product `REQ-###` IDs from the Document Outline requirements document so supplied test IDs remain directly traceable.
- Document Chat and Graph Explorer unified selection behavior are excluded from this milestone.
