---
phase: 28
slug: selection-detail-local-filter-chrome-polish-and-e2e-hardenin
status: verified
threats_open: 0
asvs_level: 2
block_on: open
created: 2026-07-01
updated: 2026-07-01
---

# Phase 28 — Security

Per-phase security audit for the authored plan-time threat models in `28-01-PLAN.md` through `28-04-PLAN.md`.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Renderer -> preload FlashQuery API | Renderer requests graph metadata through typed `window.electronAPI.flashqueryQueryGraph`; credentials remain outside renderer. | Graph metadata request/response; credential-sensitive boundary |
| FlashQuery graph metadata -> renderer UI | Optional node/edge metadata becomes whitelisted prose, status notes, claim refs, or redacted diagnostics. | Untrusted graph metadata |
| Filter input -> renderer state | User filter text stays local to the renderer and loaded result data. | User-entered local text |
| Panel -> dock chrome store | Renderer publishes non-sensitive counts and UI state to local Zustand chrome state. | UI-only state |
| E2E fixture -> app shell | Test graph data enters through deterministic local harness paths, not live services. | Synthetic test data |

## Threat Verification

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-28-01-01 | Information Disclosure | `semanticConnectionsProvider.ts` edge overlay | mitigate | closed | `createFlashQuerySemanticConnectionsProvider()` uses injected/default typed `FlashQueryQueryGraphFn` at `src/renderer/lib/semanticConnectionsProvider.ts:837`; default preload access is `window.electronAPI.flashqueryQueryGraph` at `src/renderer/lib/semanticConnectionsProvider.ts:859`; node and edge diagnostic branches call `redactedDiagnosticMessage()` at `src/renderer/lib/semanticConnectionsProvider.ts:612` and `src/renderer/lib/semanticConnectionsProvider.ts:663`; tests assert bearer redaction at `src/renderer/lib/semanticConnectionsProvider.test.ts:741`. |
| T-28-01-02 | Denial of Service | edge metadata overlay | mitigate | closed | Per-chunk edge overlay catches failures and preserves base rows at `src/renderer/lib/semanticConnectionsProvider.ts:641`; diagnostics append after merge at `src/renderer/lib/semanticConnectionsProvider.ts:680`; tests preserve rows on partial edge failure at `src/renderer/lib/semanticConnectionsProvider.test.ts:797`. |
| T-28-01-03 | Tampering | claim refs and metadata | mitigate | closed | Edge overlay accepts only numeric claim ref arrays and known metadata keys at `src/renderer/lib/semanticConnectionsProvider.ts:527` and `src/renderer/lib/semanticConnectionsProvider.ts:547`; invalid claim refs route to General connections at `src/renderer/lib/semanticConnections.ts:341`; tests cover invalid refs and stale/deleted filtering at `src/renderer/lib/semanticConnections.test.ts:250` and `src/renderer/lib/semanticConnections.test.ts:284`. |
| T-28-01-04 | Information Disclosure | selection external refs/status notes | accept | closed | Accepted risk A-28-01-04 documents that loaded graph metadata is intentionally user-visible; no credential-bearing fields were added. |
| T-28-01-SC | Tampering | npm installs | accept | closed | Accepted risk A-28-01-SC documents no package installation for Plan 28-01; implementation files and summaries show no added dependencies. |
| T-28-02-01 | Information Disclosure | expanded edge metadata | mitigate | closed | Metadata prose is limited to qualifiers and `severity`, `strength`, `dependency_type` at `src/renderer/lib/semanticConnections.ts:242`; unsupported structures are ignored at `src/renderer/lib/semanticConnections.ts:248`; tests assert no raw debug/JSON rendering at `src/renderer/panels/SemanticConnectionsPanel.test.tsx:1088`. |
| T-28-02-02 | Spoofing | target opening controls | mitigate | closed | Open controls use visible target labels and require path/heading/chunk metadata at `src/renderer/panels/SemanticConnectionsPanel.tsx:171` and `src/renderer/panels/SemanticConnectionsPanel.tsx:443`; routing stays in `handleOpenConnection()` at `src/renderer/panels/SemanticConnectionsPanel.tsx:957`; same-document and cross-document tests cover the existing route at `src/renderer/panels/SemanticConnectionsPanel.test.tsx:1135` and `src/renderer/panels/SemanticConnectionsPanel.test.tsx:1461`. |
| T-28-02-03 | Denial of Service | expanded row rendering | mitigate | closed | `scEdgeMetadataProse()` ignores non-object and unsupported metadata without throwing at `src/renderer/lib/semanticConnections.ts:257`; tests cover malformed metadata at `src/renderer/lib/semanticConnections.test.ts:183`. |
| T-28-02-04 | Elevation of Privilege | renderer target actions | mitigate | closed | `SemanticConnectionsPanel.tsx` imports renderer routing helpers only and no Electron/Node modules; target opening uses `openFileAsPanel()`/preview registries at `src/renderer/panels/SemanticConnectionsPanel.tsx:38` and `src/renderer/panels/SemanticConnectionsPanel.tsx:957`. |
| T-28-02-SC | Tampering | npm installs | accept | closed | Accepted risk A-28-02-SC documents no package installation for Plan 28-02; implementation files and summaries show no added dependencies. |
| T-28-03-01 | Information Disclosure | filter input | mitigate | closed | Filter text is component-local React state at `src/renderer/panels/SemanticConnectionsPanel.tsx:913`; filtering uses pure helpers at `src/renderer/panels/SemanticConnectionsPanel.tsx:1064`; tests assert no provider, FlashQuery, queryGraph, search, or network calls while typing at `src/renderer/panels/SemanticConnectionsPanel.test.tsx:1247`. |
| T-28-03-02 | Denial of Service | filter matching | mitigate | closed | Matching is synchronous substring logic over loaded arrays at `src/renderer/lib/semanticConnections.ts:273`; panel uses `useMemo()` derived filters at `src/renderer/panels/SemanticConnectionsPanel.tsx:1057`; tests cover local-only no-reload behavior at `src/renderer/panels/SemanticConnectionsPanel.test.tsx:1196` and E2E counters at `e2e/semantic-connections-graph.spec.ts:96`. |
| T-28-03-03 | Tampering | chrome state | mitigate | closed | Chrome state stores separate `filterOpen`/`filterActive` and `configOpen`/`configActive` fields at `src/renderer/stores/semanticConnectionsChromeStore.ts:3`; panel publishes pre-filter count and clears state on unmount at `src/renderer/panels/SemanticConnectionsPanel.tsx:1131`; tests cover separation/count/cleanup at `src/renderer/panels/SemanticConnectionsPanel.test.tsx:1320`. |
| T-28-03-04 | Information Disclosure | renderer process | mitigate | closed | Provider path remains typed preload/injected API only at `src/renderer/lib/semanticConnectionsProvider.ts:837`; no Electron/Node credential APIs are imported into the renderer panel; filter tests assert no FlashQuery API calls on local filter text at `src/renderer/panels/SemanticConnectionsPanel.test.tsx:1247`. |
| T-28-03-SC | Tampering | npm installs | accept | closed | Accepted risk A-28-03-SC documents no package installation for Plan 28-03; implementation files and summaries show no added dependencies. |
| T-28-04-01 | Information Disclosure | E2E fixtures | mitigate | closed | E2E uses renderer harness synthetic graph scenarios via `window.__cateE2E`, not live FlashQuery credentials, at `src/renderer/lib/e2eHarness.ts:24` and `e2e/semantic-connections-graph.spec.ts:37`; synthetic fixture data is inline at `src/renderer/lib/e2eHarness.ts:203`. |
| T-28-04-02 | Tampering | fixture response shape | mitigate | closed | Renderer harness graph fixture returns typed graph result shape at `src/renderer/lib/e2eHarness.ts:203`; harness unit test asserts typed mode, graph summary, node metadata, cached result, and getDocument/queryGraph counters at `src/renderer/lib/e2eHarness.test.tsx:76`. |
| T-28-04-03 | Denial of Service | unavailable/no-vault E2E | mitigate | closed | Harness simulates unavailable/no-vault errors at `src/renderer/lib/e2eHarness.ts:428`; panel renders recoverable retry states at `src/renderer/panels/SemanticConnectionsPanel.tsx:1349`; E2E verifies recovery back to graph view at `e2e/semantic-connections-graph.spec.ts:145`. |
| T-28-04-04 | Repudiation | final regression evidence | mitigate | closed | `28-04-SUMMARY.md` records exact commands, pass/fail results, Node version, and lint blocker at `.planning/phases/28-selection-detail-local-filter-chrome-polish-and-e2e-hardenin/28-04-SUMMARY.md:110`. |
| T-28-04-SC | Tampering | npm installs | accept | closed | Accepted risk A-28-04-SC documents no package installation for Plan 28-04; implementation files and summaries show no added dependencies. |

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| A-28-01-04 | T-28-01-04 | Selection external refs and status notes are already part of the loaded graph result and are intentionally rendered to the user; no credential-bearing fields were added. | plan disposition | 2026-07-01 |
| A-28-01-SC | T-28-01-SC | Plan 28-01 installed no new packages, so supply-chain risk is unchanged for this plan. | plan disposition | 2026-07-01 |
| A-28-02-SC | T-28-02-SC | Plan 28-02 installed no new packages, so supply-chain risk is unchanged for this plan. | plan disposition | 2026-07-01 |
| A-28-03-SC | T-28-03-SC | Plan 28-03 installed no new packages, so supply-chain risk is unchanged for this plan. | plan disposition | 2026-07-01 |
| A-28-04-SC | T-28-04-SC | Plan 28-04 installed no new packages, so supply-chain risk is unchanged for this plan. | plan disposition | 2026-07-01 |

## Threat Flags

No unregistered threat flags. All four Phase 28 summaries contain `## Threat Flags` with `None`.

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-01 | 20 | 20 | 0 | Codex security audit |

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-01
