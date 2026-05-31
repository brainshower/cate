# Phase 2: Connection Layer - Context

**Gathered:** 2026-05-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 2 extends the Phase 1 `FlashQueryClientManager` skeleton into the connection-status layer for a configured workspace. After this phase, the manager can probe a separately-running FlashQuery HTTP MCP server through `GET /mcp/info`, model workspace-scoped `connecting`, `live`, and `disconnected` states, capture version/instance metadata on success, capture error context on failure, retry failed probes with bounded exponential backoff, support manual retry, cancel timers on dispose, and notify subscribers of status transitions.

This phase is manager-side only. It does not add renderer IPC handlers, preload APIs, vault listing, document read/write, UI panels, settings dialogs, editor routing, or renderer-window broadcasts. Phase 3 owns the typed `flashquery:*` IPC surface and renderer broadcast wiring.

</domain>

<decisions>
## Implementation Decisions

### Source Authority
- **D-01:** Downstream agents MUST read the external product requirements and test plan before planning or implementing Phase 2. These docs are the primary source for REQ-004, REQ-005, REQ-006, REQ-011 manager-side behavior, and T-U-021 through T-U-039.
- **D-02:** If `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, or this context appears ambiguous, agents must re-read the external requirements and test-plan docs before asking the user.
- **D-03:** No additional user discussion is needed before planning Phase 2. The product docs lock the WHAT, behavior states, retry bounds, status payload expectations, and tests.

### Scope Boundaries
- **D-04:** Implement only REQ-004, REQ-005, REQ-006, and manager-side REQ-011 in Phase 2.
- **D-05:** Keep Phase 2 inside `src/main/flashquery/clientManager.ts` and its focused tests unless the existing implementation requires a small local type/helper adjustment. Do not add `flashquery:*` IPC channels or preload methods in this phase.
- **D-06:** Preserve Phase 1's lazy behavior: Cate startup and manager construction must not eagerly probe FlashQuery. A probe starts only when manager behavior for a configured workspace requires connection activity.
- **D-07:** Keep FlashQuery runtime ownership outside Cate. Cate probes and later calls the configured HTTP MCP endpoint; it must not start FlashQuery, configure Supabase, inspect the vault directly, or duplicate FlashQuery storage behavior.

### Probe Behavior
- **D-08:** The first connection probe for a configured workspace must issue `GET <flashqueryConnection.url>/mcp/info`.
- **D-09:** The `/mcp/info` probe must omit `Authorization`; bearer credentials are for later MCP calls, not the public info probe.
- **D-10:** A successful `200 OK` JSON response must extract at least `version` and `instance_id` and transition the workspace status to `live`.
- **D-11:** Non-200 responses, malformed/invalid info payloads, and network-level failures must transition the workspace status to `disconnected` with useful error text.
- **D-12:** Tests must prove bearer tokens are not sent on the probe. If Phase 2 introduces a placeholder for later POST/MCP calls, it must keep token use out of `/mcp/info` and leave real tool calls to later phases.

### State Machine And Retry
- **D-13:** Model exactly these v1 connection states: `connecting`, `live`, and `disconnected`. Later/future states may be tolerated defensively, but v1 production behavior should emit only these three.
- **D-14:** A configured workspace's initial active connection attempt should broadcast or expose `connecting` while the probe is in flight.
- **D-15:** Failed probes schedule exponential-backoff retry starting at 2 seconds, doubling on repeated failures, and capping at 60 seconds.
- **D-16:** A successful probe after failure resets the backoff to the initial value.
- **D-17:** Manual retry while disconnected must clear any pending backoff timer, immediately attempt a probe, and transition to `connecting` while in flight.
- **D-18:** `dispose(workspaceId)` must cancel retry timers, release per-workspace state, and prevent disposed workspaces from receiving late retry/status events.

### Subscription Events
- **D-19:** Preserve the Phase 1 subscribe/unsubscribe contract and make status transitions observable through `subscribe(workspaceId, 'status', handler)`.
- **D-20:** Status subscribers are isolated by workspace ID and event type. A transition in one workspace must not notify another workspace's subscribers.
- **D-21:** Multiple subscribers for the same `(workspaceId, 'status')` receive every status transition until they unsubscribe.
- **D-22:** Future event types such as `vault-changed` may be registered without crashing, but Phase 2 must not emit vault-change events.
- **D-23:** Disconnected status payloads include an `error` field. `connecting` and `live` status payloads omit `error`.

### Testing
- **D-24:** Phase 2 must cover Test Plan T-U-021 through T-U-039 in `src/main/flashquery/clientManager.test.ts`.
- **D-25:** Use mocked `fetch` and Vitest fake timers for probe and retry behavior. Tests should assert probe URLs, absence of `Authorization`, state transitions, retry delays, manual retry timer clearing, successful reset, dispose cleanup, subscriber isolation, and disconnected/live/connecting payload shapes.
- **D-26:** Verification should include the focused client-manager test file and `npm run typecheck`. If changes touch Phase 1 helpers, rerun the relevant Phase 1 tests too.

### the agent's Discretion
- The planner/researcher may choose the exact public method names for initiating a probe/manual retry as long as the manager remains clean for Phase 3 IPC handlers to call.
- The planner/researcher may choose the internal state shape for connection metadata, retry timers, and subscribers as long as the observable REQ/T-U behavior is satisfied.
- The planner/researcher may decide whether to normalize trailing slashes in configured URLs inside the manager or through a small helper, provided `GET /mcp/info` is constructed deterministically and tested.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product Specs
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Requirements.md` — Primary requirements source. Read Spec §6.1.4, §6.1.5, §6.1.6, §6.2.5, §8.3, and §11 before planning or implementation.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery-product/Product/Cate/Initial connection to FQ/Cate-FlashQuery Integration v1 — Test Plan.md` — Primary test source. Read Test Plan §4.2, §5.1, §5.2, and §8.1 for T-U-021 through T-U-039.

### Local Planning Artifacts
- `.planning/PROJECT.md` — Milestone goal, project constraints, source-of-truth directory, brownfield integration context, and Phase 1 decision carry-forward.
- `.planning/REQUIREMENTS.md` — Local milestone requirement summary and traceability table.
- `.planning/ROADMAP.md` — Phase 2 boundary, success criteria, and plan breakdown.
- `.planning/STATE.md` — Confirms Phase 1 complete and Phase 2 next.
- `.planning/phases/01-foundation/01-CONTEXT.md` — Locked Phase 1 decisions and source-authority pattern.
- `.planning/phases/01-foundation/01-01-SUMMARY.md` — Workspace metadata and sanitizer work that Phase 2 depends on.
- `.planning/phases/01-foundation/01-02-SUMMARY.md` — Credential helper boundary and token-storage constraints.
- `.planning/phases/01-foundation/01-03-SUMMARY.md` — URI helper and inert `FlashQueryClientManager` skeleton created for Phase 2 extension.

### Codebase Maps
- `.planning/codebase/ARCHITECTURE.md` — Electron layering, main/preload/renderer separation, shared contracts, workspace metadata sync, and IPC boundary patterns.
- `.planning/codebase/INTEGRATIONS.md` — Existing integration/storage patterns, current `electron-store` use, and external service posture.
- `.planning/codebase/TESTING.md` — Vitest test locations, mocking patterns, fake timer guidance, and focused run commands.
- `.planning/codebase/CONCERNS.md` — Main-process concentration, preload surface risk, and security-sensitive boundaries to avoid expanding in Phase 2.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/main/flashquery/clientManager.ts` — Phase 1 manager skeleton. Extend this file with probe/status/retry behavior rather than creating a parallel manager.
- `src/main/flashquery/clientManager.test.ts` — Existing no-network lifecycle/subscription tests. Extend here for T-U-021 through T-U-039.
- `src/main/flashquery/credentials.ts` — Main-process token helper. Phase 2 may use it only when preparing later authenticated calls; `/mcp/info` itself must not send bearer auth.
- `src/shared/types.ts` — Provides `WorkspaceInfo`, `FlashQueryConnection`, and sanitizer/type guard behavior for configured workspace metadata.

### Established Patterns
- Main-process FlashQuery behavior belongs under `src/main/flashquery/`, not in renderer code and not directly in `src/main/index.ts`.
- Renderer, preload, and IPC surfaces remain untouched until Phase 3.
- Tests should mock external boundaries with `vi`, including `global.fetch`, and use fake timers for retry/backoff behavior.
- Recoverable connection failures should become structured status/error state rather than thrown failures that would crash callers.

### Integration Points
- Phase 3 IPC handlers will call into this manager for connection status, manual retry, and later vault operations, so public manager methods should be small and stable.
- Phase 3 renderer broadcast wiring depends on manager-side status event production from Phase 2.
- Later UI phases depend on disconnected statuses carrying useful error text and live/connecting statuses omitting stale error fields.

</code_context>

<specifics>
## Specific Ideas

- User specifically directed that downstream agents should refer first to the external requirements and test-plan docs before asking implementation questions.
- Product-doc test IDs for this phase are T-U-021 through T-U-039.
- Phase 2 should remain a narrow unit-testable manager extension; this is what keeps later IPC/UI work from mixing network state-machine concerns into renderer code.

</specifics>

<deferred>
## Deferred Ideas

- `flashquery:setConnection`, `flashquery:listVault`, `flashquery:getDocument`, `flashquery:writeDocument`, preload APIs, and renderer-window `flashquery:status` broadcast wiring belong to Phase 3.
- Vault panel, status chip UI, settings dialog, workspace context-menu entry, editor URI routing, E2E harness, and visual/design checks belong to later roadmap phases.
- Live vault-change notifications, SSE subscription, conflict detection, OAuth, refresh-token rotation, keychain migration, stdio transport, and vault document creation remain outside v1 or outside this phase per the product docs.

</deferred>

---

*Phase: 2-Connection Layer*
*Context gathered: 2026-05-29*
