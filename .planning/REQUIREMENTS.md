# Requirements: Cate FlashQuery Integration v1.2

**Defined:** 2026-06-03
**Milestone:** v1.2 FlashQuery Milestone 2
**Core Value:** Cate should let a developer use FlashQuery knowledge from inside the same spatial workspace where they already code, inspect files, run terminals, and collaborate with AI agents.

## Source Documents

- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Requirements.md`
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Continued FQ integration (milestone 2)/Milestone 2 Test Plan.md`

The product requirements document is the source of truth for detailed acceptance criteria. This GSD requirements file preserves the product `REQ-###` IDs for direct traceability to `T-U-###`, `T-E-###`, and `T-M-###` test IDs.

## v1.2 Requirements

### Editor Refresh

- [x] **REQ-001**: User can manually refresh clean open FlashQuery body editor tabs from the latest vault document content.
- [x] **REQ-002**: User must confirm dirty FlashQuery body refresh through `Save and refresh`, `Discard and refresh`, or `Cancel` without introducing merge/diff behavior.
- [x] **REQ-003**: User can attempt refresh while FlashQuery is disconnected, unreachable, failing, or missing the document without corrupting current editor content or dirty state.

### Shared Contracts and Frontmatter

- [x] **REQ-004**: Cate widens FlashQuery document IPC contracts for body/frontmatter reads and object writes while preserving existing body-only string writes.
- [x] **REQ-005**: User can open frontmatter editor tabs represented by `flashquery://<workspace>/<vaultPath>?part=frontmatter`, placed as sibling editor panels.
- [x] **REQ-006**: User can edit body and frontmatter as independent Monaco editor models with separate language mode, dirty state, save behavior, undo stack, view state, and errors.
- [x] **REQ-007**: User can edit opaque YAML frontmatter while invalid YAML blocks save and FlashQuery-managed fields are filtered before writeback.

### Vault Search

- [x] **REQ-008**: User can open a dedicated `FlashQueryVaultSearchPanel` registered through Cate's existing panel registry with required panel chrome.
- [x] **REQ-009**: User-triggered vault search calls `flashquery:search` with explicit query, mode, entity type, limit, and archived-inclusion semantics.
- [x] **REQ-010**: User can read grouped document and memory search results with idle, empty, highlight, and show-more pagination states.
- [x] **REQ-011**: User can select, open, reveal, copy, keyboard-navigate, and inspect search result rows according to document and memory result type.
- [x] **REQ-012**: User sees safe in-flight, disconnected, and recovery states for vault search without stale successful results being mistaken for current results.

### Pi Extension and Tools

- [ ] **REQ-013**: Cate installs and initializes a bundled `src/agent/extensions/cate-flashquery/` Pi extension with workspace-scoped FlashQuery credentials.
- [ ] **REQ-014**: User can access all eligible current FlashQuery MCP tools as Pi tools, including native and brokered tools, while FlashQuery is not registered as a Pi provider.
- [ ] **REQ-015**: User can invoke `call_model` as a Pi tool with discovery-enriched descriptions, per-conversation trace metadata, `return_messages: true`, reference hydration, and preserved diagnostics.
- [ ] **REQ-016**: User can invoke `call_macro` as a Pi tool with source confirmation rules, interactive/progress defaults, filtered progress notifications, completed trace rendering, and disconnected errors.
- [ ] **REQ-017**: User can inspect FlashQuery tool calls through Cate's normal Pi `ToolCard` system, with richer structured details for `call_model` and `call_macro`.

### References, Clipboard, and Degradation

- [ ] **REQ-018**: User can type `@` in Pi chat to autocomplete FlashQuery vault documents and insert literal `{{ref:<fullPath>}}` references from a workspace-scoped vault-index cache.
- [ ] **REQ-019**: User can copy vault paths and whole-document references from vault tree rows, search document rows, and FlashQuery editor title actions.
- [ ] **REQ-020**: User gets consistent disconnected, reconnecting, and workspace-switch behavior across refresh, frontmatter save, search, vault-index cache, clipboard reference actions, and Pi extension tools.

## Deferred Requirements

### Future FlashQuery/Cate Integration

- Live vault notifications and push-driven cache invalidation.
- New vault document creation.
- Rename, delete, archive, tag, or move vault documents.
- Conflict detection or expected-version merge flows beyond Milestone 2 dirty-refresh confirmation.
- Rich document-centric AI surfaces, selection palettes, conversation-as-document, synthetic teams, and comment-thread integration.
- Multi-vault-per-workspace UI.
- OAuth, keychain, refresh-token, hosted account, or Pi global `auth.json` credential flows.
- User-facing model or purpose picker for `call_model`.
- Memory view/edit surfaces beyond search results and read-only result inspection.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Replacing FlashQuery runtime, storage, migrations, scanner, CLI, or MCP server | FlashQuery remains the source of truth for runtime and data ownership. |
| Cate as a general MCP host for arbitrary third-party servers | Milestone 2 exposes FlashQuery-brokered eligible tools through the bundled Pi extension only. |
| FlashQuery as a Pi provider or ProvidersView entry | Users configure native Pi LLM providers; FlashQuery enters Pi through tools only. |
| Cate-level Run Macro button or host-side macro launcher | `call_macro` is invoked by the host model only in this milestone. |
| YAML comment, key order, or quoting preservation | Frontmatter writes are object-based and do not promise textual YAML fidelity. |
| Section anchors or markdown-link reference variants | Milestone 2 uses whole-document `{{ref:path.md}}` references only. |
| Automatic invalidation for externally introduced vault changes | Vault-index cache refreshes on explicit lifecycle triggers; push invalidation waits for FlashQuery notifications. |
| FlashQuery roadmap RM-1 through RM-5 as Cate work | The roadmap companion doc is traceability context, not Cate implementation scope. |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REQ-004 | Phase 14 | Complete |
| REQ-001 | Phase 15 | Complete |
| REQ-002 | Phase 15 | Complete |
| REQ-003 | Phase 15 | Complete |
| REQ-005 | Phase 15 | Complete |
| REQ-006 | Phase 15 | Complete |
| REQ-007 | Phase 15 | Complete |
| REQ-008 | Phase 16 | Complete |
| REQ-009 | Phase 16 | Complete |
| REQ-010 | Phase 16 | Complete |
| REQ-011 | Phase 16 | Complete |
| REQ-012 | Phase 16 | Complete |
| REQ-013 | Phase 17 | Pending |
| REQ-014 | Phase 17 | Pending |
| REQ-015 | Phase 18 | Pending |
| REQ-016 | Phase 18 | Pending |
| REQ-017 | Phase 19 | Pending |
| REQ-018 | Phase 20 | Pending |
| REQ-019 | Phase 20 | Pending |
| REQ-020 | Phase 21 | Pending |

**Coverage:**
- v1.2 requirements: 20 total
- Mapped to phases: 20
- Unmapped: 0

---
*Requirements defined: 2026-06-03*
*Last updated: 2026-06-03 after creating v1.2 FlashQuery Milestone 2 planning*
