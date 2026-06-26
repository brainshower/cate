# Requirements: v1.5 Browser Uplift

## Source Documents

- Requirements: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Requirements.md`
- Test plan: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Browser Capture and Control/Browser Uplift - Test Plan.md`
- Production codebase: `/Users/matt/Documents/Claude/Projects/Cate/cate`
- FlashQuery contract reference: `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery`
- Upstream Cate reference: `upstream/main` at v1.3.2 / `538db77`, especially commit `edb7e79`

## Milestone Goal

Bring Cate's forked in-app browser up to the relevant upstream v1.3.2 browser capabilities while preserving this fork's FlashQuery integration boundaries. Browser sessions become durable and workspace-scoped, practical browser affordances are added, screenshot capture moves into a modular IPC home, and future page capture/control hooks remain clean without implementing extraction, tabs, proxying, or MCP browser control in this tier.

## Scope Guardrails

- Browser session partitions, history, bookmarks, and clear-data behavior are scoped by Cate `workspaceId`.
- Browser state and FlashQuery state remain separate stores even when both use the same workspace ID.
- FlashQuery bearer tokens stay in main-process credential storage and are never copied into renderer state, browser cookies, browser partitions, history, bookmarks, screenshots, or settings.
- Existing FlashQuery IPC channel names, preload method names, connection metadata, vault documents, indexes, and MCP sessions must remain unchanged by browser work.
- Upstream browser features are adapted selectively. Tabs, start page/autocomplete, per-panel proxy support, DOM extraction, Readability/Turndown, PDF/DOCX extraction, browser-to-vault writes, and `cate_browser` MCP control are out of scope.
- Tests from the supplied plan must land alongside the feature behavior they verify; do not defer all coverage to a final catch-up step.

## Active Requirements

### Session, State, and Workspace Scope

- [x] **REQ-001:** Browser webviews use a durable per-workspace Electron partition exactly `persist:browser-ws-${workspaceId}`, never `panelId`, and fail closed rather than mounting with an empty or missing workspace ID across canvas, dock, detached panel, and detached dock mount sites.
- [ ] **REQ-002:** Removing a workspace cleans only that workspace's browser partition plus persisted browser history/bookmarks, co-located with existing main-side workspace teardown.
- [ ] **REQ-003:** Browser history and bookmarks persist per workspace, ignore non-recordable sentinel URLs, and are queried in the renderer by `workspaceId` rather than through one global active workspace.

### Browser UX and Navigation Robustness

- [ ] **REQ-004:** Browser load-error UI appears only for top-level/main-frame failures and ignores `ERR_ABORTED` plus subresource failures.
- [ ] **REQ-005:** Browser webview crashes show a recoverable reload overlay for non-clean renderer exits and do not show it for clean exits.
- [ ] **REQ-006:** Focused browser panels receive only scoped browser shortcuts for reload, address focus, back, and forward while Cate app shortcuts such as new browser, close panel, and close window keep their existing meanings.

### Bookmarks and Settings UI

- [ ] **REQ-007:** Browser panels provide a per-workspace bookmarks bar and star toggle backed by workspace-scoped bookmark persistence.
- [ ] **REQ-008:** Browser menu/settings UI exposes bookmarks-bar controls and scoped clear-data behavior while keeping homepage/search controls in the existing Settings-window Browser panel as the single source of truth.
- [ ] **REQ-009:** Clear browsing data requires confirmation, clears only the current workspace's browser partition/history/bookmarks, preserves other workspaces and all FlashQuery state, and does not force-reload live panels.

### IPC, Contracts, and Integration Boundaries

- [ ] **REQ-010:** Screenshot capture is relocated into a modular browser/capture IPC home while preserving the existing `{ filePath, dataUrl }` screenshot contract and avoiding upstream proxy/extraction handlers.
- [ ] **REQ-011:** Fork-only portal orchestration behavior remains functional, including `portalRegistry` calls to `orchRegisterPortalWc` / main-process popup parent resolution.
- [ ] **REQ-012:** Browser navigation, history, bookmarks, screenshots, and clear-data operations do not mutate or depend on FlashQuery credentials, connection metadata, vault documents, indexes, or MCP sessions.

## Future Requirements

- Page capture/extraction and browser-control MCP integration for the broader Browser Capture and Control tier.
- FlashQuery history ingestion from per-workspace browser history.
- Global-bookmarks promotion model.
- Proxy partition composition built on top of the partition helper.
- Migration of old per-panel cookies into new per-workspace browser partitions.

## Out of Scope

| Feature | Reason |
|---|---|
| In-panel tabs | Cate's existing multiple panels/windows model remains the multi-page workflow for this tier. |
| Start page and URL autocomplete UI | History is stored for future use but not surfaced through those upstream views in v1.5. |
| Per-panel proxy support | Upstream `browserProxy.ts`, `BROWSER_SET_PROXY`, and proxy UI are explicitly excluded. |
| DOM extraction, Readability/Turndown, PDF/DOCX extraction, and browser-to-vault writes | Deferred to separate Browser Capture and Control work. |
| `cate_browser` MCP server or MCP browser-control tools | This milestone is a Cate browser uplift, not an MCP control surface. |
| FlashQuery server changes | v1.5 preserves FlashQuery behavior and contracts rather than changing FlashQuery. |
| Cookie migration from old per-panel partitions | Not included; new durability applies through the workspace-scoped partition model. |

## Traceability

| Requirement | GSD phase | Source slice | Primary test coverage | Status |
|---|---:|---|---|---|
| REQ-001 | Phase 26 | Browser Foundation | `T-U-001`, `T-U-002`, `T-U-029`, `T-E-001`, `T-E-002`, `T-E-003`, `T-E-020`, `T-E-021`, `T-M-001` | Complete in 26-01 |
| REQ-002 | Phase 26 | Workspace Safety and Controls | `T-U-003`, `T-U-004`, `T-I-001`, `T-E-004` | Pending |
| REQ-003 | Phase 26 | Browser State and Affordances | `T-U-005`, `T-U-006`, `T-U-007`, `T-U-008`, `T-U-030`, `T-E-005`, `T-E-006` | Pending |
| REQ-004 | Phase 26 | Browser Foundation | `T-U-009`, `T-U-010`, `T-U-011`, `T-E-007`, `T-E-008` | Pending |
| REQ-005 | Phase 26 | Workspace Safety and Controls | `T-U-012`, `T-U-013`, `T-E-009` | Pending |
| REQ-006 | Phase 26 | Workspace Safety and Controls | `T-U-014`, `T-U-015`, `T-U-016`, `T-E-010`, `T-E-011` | Pending |
| REQ-007 | Phase 26 | Browser State and Affordances | `T-U-017`, `T-U-018`, `T-U-030`, `T-E-012`, `T-E-013` | Pending |
| REQ-008 | Phase 26 | Browser State and Affordances | `T-U-019`, `T-U-020`, `T-U-021`, `T-U-031`, `T-E-014` | Pending |
| REQ-009 | Phase 26 | Workspace Safety and Controls | `T-U-022`, `T-U-023`, `T-U-024`, `T-I-002`, `T-I-003`, `T-E-015` | Pending |
| REQ-010 | Phase 26 | Browser Foundation | `T-I-004`, `T-I-005`, `T-I-006`, `T-E-016` | Pending |
| REQ-011 | Phase 26 | Browser Foundation | `T-U-025`, `T-U-026`, `T-E-017` | Pending |
| REQ-012 | Phase 26 | Workspace Safety and Controls | `T-U-027`, `T-U-028`, `T-E-018`, `T-E-019` | Pending |

**Coverage:**

- Active requirements: 12 total
- Mapped to phases: 12
- Unmapped: 0

---
*Requirements defined: 2026-06-26*
*Last updated: 2026-06-26 after v1.5 Browser Uplift milestone planning*
