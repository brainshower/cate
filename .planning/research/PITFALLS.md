# Pitfalls Research

**Domain:** Brownfield Electron integration of FlashQuery connectivity, local vault/document workflows, and Pi agent context
**Researched:** 2026-05-28
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Treating FlashQuery as Cate-owned infrastructure

**What goes wrong:**
Cate duplicates FlashQuery setup, schema migration, scanner, vault write semantics, or MCP tool behavior inside the desktop app. The two systems drift: Cate says a connection is healthy while FlashQuery would fail `doctor`, Cate writes markdown that FlashQuery later re-identifies, or Cate tries to repair database/vault state it does not own.

**Why it happens:**
The desktop UX pressure is to make setup feel integrated, but FlashQuery already owns config loading, schema verification, vault scanning, backup, token issuance, and tool semantics. Brownfield integrations often overreach by turning a client into a second implementation.

**How to avoid:**
Keep Cate as a client and UI surface. Store workspace-scoped connection metadata, tokens, and UI/session preferences only. Use FlashQuery health/tool responses as source of truth. For setup and repair, deep-link to documented FlashQuery commands or surface command output, but do not reimplement migrations, scanner recovery, or vault identity rules in Cate.

**Warning signs:**
New Cate code imports Supabase clients for FlashQuery tables, writes `fqc_*` frontmatter manually, edits `flashquery.yml` or `.env` without delegating validation, or contains duplicate versions of FlashQuery tool schemas.

**Phase to address:**
Phase 1: Connection model and health checks. This phase must establish the boundary: Cate configures, probes, and calls FlashQuery; FlashQuery owns runtime and storage.

**Tests:**
Unit-test connection config parsing so Cate rejects invalid metadata without mutating FlashQuery files. Add mocked health-check tests where FlashQuery reports schema, auth, vault, or embedding failures and Cate surfaces them without attempting repair. Add an Electron smoke test proving missing/offline FlashQuery does not corrupt workspace session state.

---

### Pitfall 2: Expanding the renderer-to-main privileged API without runtime validation

**What goes wrong:**
FlashQuery operations are exposed through broad `window.electronAPI` methods that accept raw renderer payloads. A renderer bug, compromised dependency, unsafe document preview, or browser-panel issue can send crafted connection URLs, file paths, auth tokens, or agent-context payloads into main-process handlers.

**Why it happens:**
Cate already has a broad preload bridge and many handlers rely on TypeScript declarations rather than central runtime validation. FlashQuery integration naturally wants new APIs for connection testing, search, document opening, save flows, and agent context injection, increasing the attack surface.

**How to avoid:**
Create a focused FlashQuery IPC module under `src/main/ipc/` with Zod or equivalent schemas at every main-process boundary. Expose narrow preload methods grouped by capability: config, health, search, save, and agent-context read injection. Redact tokens in all responses and logs. Do not expose raw generic MCP calls to the renderer unless there is a separate allowlist and payload validator.

**Warning signs:**
New channels are added directly to `src/main/index.ts`, handlers accept `unknown` or untyped `any`, renderer-provided URLs are passed into `fetch` without normalization, or errors include bearer tokens, Basic auth values, full vault paths, or database URLs.

**Phase to address:**
Phase 1: Connection model and health checks. All later phases inherit this IPC surface, so validation must be present before search, save, or agent integration expands usage.

**Tests:**
Add node-environment Vitest tests for each FlashQuery IPC handler with malformed payloads, unsupported protocols, oversized strings, token-bearing errors, and wrong workspace IDs. Add preload contract tests for exposed method shape. Add logger/redaction tests that assert auth headers, raw secrets, and database URLs never appear in renderer-visible errors.

---

### Pitfall 3: Weak HTTP auth and token lifecycle handling

**What goes wrong:**
Cate connects to FlashQuery HTTP transport without enforcing auth expectations, stores raw `MCP_AUTH_SECRET` where renderer code can read it, treats expired tokens as permanent connection failure, or silently falls back to unauthenticated requests. If FlashQuery is bound beyond localhost, this can expose MCP tools and user data.

**Why it happens:**
FlashQuery supports stdio with local trust and HTTP with optional bearer token auth. HTTP without `auth_secret` is allowed but warned by FlashQuery, and legacy raw-secret bearer compatibility exists. A desktop client can easily blur "local dev" and "safe enough" unless it models transport/auth state explicitly.

**How to avoid:**
Model transport, endpoint, auth mode, token expiry, and last health status explicitly per workspace. Prefer bearer access tokens obtained from `POST /token`; treat the raw signing secret as a secret used only to obtain tokens, not as a normal bearer credential. Warn clearly when HTTP auth is disabled, especially for non-loopback hosts. Store secrets through main-process-only storage and never pass them into React state.

**Warning signs:**
Connection tests succeed against `http://0.0.0.0`, LAN IPs, or remote hosts without auth; renderer devtools can inspect tokens; token expiry produces "server offline"; or retry code logs `Authorization` headers.

**Phase to address:**
Phase 1: Connection model and health checks. Phase 2: Search/read flows should consume the established token manager rather than adding their own request logic.

**Tests:**
Unit-test endpoint classification for loopback, LAN, and remote hosts. Mock `POST /token` success, expiry, refresh failure, legacy raw-secret rejection, and unauthenticated-server warning paths. Add IPC tests proving renderer-visible config returns redacted auth status only. Add E2E smoke coverage for expired token recovery without workspace state loss.

---

### Pitfall 4: Vault path trust bypasses and symlink escapes

**What goes wrong:**
Search results or document references from FlashQuery open files outside allowed Cate workspace roots, follow symlinks, grant broad filesystem access, or render user-controlled markdown/HTML unsafely. A vault result becomes a privileged file open rather than a user-approved document workflow.

**Why it happens:**
FlashQuery vaults are local folders and may be outside the active Cate workspace. Cate's filesystem boundary is already fragile: grants, allowed roots, symlink checks, and creation paths are split across handlers. Integrating vault documents tempts direct path opens from search results.

**How to avoid:**
Treat vault paths as untrusted until validated in main. Require explicit workspace-scoped vault grants before opening local files outside the workspace root. Use existing `validatePathStrict(...)` for existing reads and `validatePathForCreation(...)` for writes. Resolve realpaths and reject symlink escapes. Prefer opening vault markdown in existing editor/document panels as files, not injecting arbitrary rendered HTML into browser/document surfaces.

**Warning signs:**
Renderer code calls `openPanel({ path })` directly from FlashQuery search JSON; vault roots are added globally rather than per workspace/window; path validation uses lexical prefix checks; tests do not include symlinks or paths outside the workspace.

**Phase to address:**
Phase 2: Search and open results. Phase 3: Save context to memory/documents must reuse the same vault trust model before enabling writes.

**Tests:**
Extend path-validation tests with vault roots, per-window owner IDs, symlinks, `..` traversal, deleted/recreated paths, and workspace-vs-vault grants. Add renderer tests proving search-result previews escape HTML and do not use `dangerouslySetInnerHTML`. Add E2E coverage for opening an allowed vault document and rejecting an ungranted external vault path.

---

### Pitfall 5: Unsafe save flows that create duplicate, stale, or unreviewable knowledge

**What goes wrong:**
Cate lets users or agents save arbitrary selections, terminal output, browser content, or agent responses into FlashQuery with weak metadata. Memories become noisy and hard to search; vault documents lack provenance; repeated saves duplicate content; users cannot tell what was captured or undo it.

**Why it happens:**
"Save to memory" feels simple in UI, but FlashQuery writes have durable effects across tools and sessions. Brownfield IDE contexts are messy: selections, file paths, terminal scrollback, browser pages, and agent messages each need different provenance and consent.

**How to avoid:**
Start with explicit save flows that preview content, destination, tags, source panel, workspace, timestamp, and privacy-sensitive fields. Require user confirmation for browser content, terminal output, and agent-generated summaries. Let FlashQuery assign document identity and run its normal write/scanner path. Add idempotency hints or client-side duplicate warnings where possible.

**Warning signs:**
Auto-save runs after every agent message, save dialogs do not show destination or source, tags are freeform with no validation, document titles are generated without collision handling, or tests assert only that an API call was made.

**Phase to address:**
Phase 3: Explicit save-to-memory and save-to-document workflows. Do not introduce automatic agent memory before this phase has reviewable provenance.

**Tests:**
Unit-test payload builders for memory/document saves from editor selection, agent output, and notes. Renderer-test preview and confirmation states, cancellation, duplicate-title warnings, and sensitive-field redaction. Mock FlashQuery failures after partial save attempts and assert Cate shows exact outcome without retry loops that create duplicates.

---

### Pitfall 6: Agent context injection that confuses identity, consent, and auditability

**What goes wrong:**
FlashQuery context is injected into the wrong Pi agent session, stale context persists after workspace switch, or agents receive hidden context users cannot inspect. Tool approvals may route to the wrong `agentKey`, and session replay becomes misleading because the visible transcript does not match the prompt context.

**Why it happens:**
Cate's agent subsystem multiplexes live Pi processes by generated agent keys while also tracking session files and renderer store slices. FlashQuery context adds another dimension: workspace, connection, search query, result IDs, selected snippets, and possibly vault documents.

**How to avoid:**
Treat context injection as an explicit, auditable attachment to a specific `agentKey` and workspace. Store the FlashQuery result IDs/snippets attached to a message or run, not as hidden global agent state. Keep automatic retrieval opt-in until explicit search/save flows are stable. Never make FlashQuery context a server-side session cache in Cate; MCP is stateless and project context should be per call.

**Warning signs:**
Agent context is stored in a global Zustand slice without workspace and agent key; session restore rehydrates context silently; a panel delete leaves context behind; or a background retriever appends prompt text without a visible transcript marker.

**Phase to address:**
Phase 4: Agent context integration. This should come after connection, search/open, and explicit save flows so the context objects and trust model already exist.

**Tests:**
Add mocked Pi RPC tests for multiple agent keys, deleted sessions, workspace switching, and concurrent chats. Renderer-test visible context attachments and removal. Add integration tests proving context is routed by `agentKey`, not session filename alone, and that restored sessions do not silently reinject old FlashQuery context.

---

### Pitfall 7: Blocking the Electron main process with search, health, or scan-like work

**What goes wrong:**
Cate UI becomes sluggish while FlashQuery health checks, large search responses, vault document reads, token refreshes, or retry loops run in the main process. Existing terminal, filesystem watcher, session autosave, and drag/window behavior become harder to diagnose because the new integration shares the same bottleneck.

**Why it happens:**
Cate's main process already handles filesystem search, terminal polling, git operations, screenshots, updater, analytics, auth, and agent IPC. FlashQuery calls can be network-bound or return large payloads, and naive handlers may lack cancellation, timeouts, and pagination.

**How to avoid:**
Use short timeouts, request cancellation, bounded result limits, pagination, and main-process event-loop delay checks for FlashQuery calls. Keep health checks lightweight and cache only safe status metadata. Do not run `flashquery scan`, backup, or setup tasks synchronously from the UI path.

**Warning signs:**
Search has no limit parameter, health checks run on every render, retry loops use unbounded exponential backoff, result previews include full document bodies, or Electron tests become flaky around terminal/window operations after FlashQuery integration.

**Phase to address:**
Phase 2: Search/read flows. Phase 3: Save flows should inherit the same timeout/cancellation utilities.

**Tests:**
Unit-test timeout and abort behavior with fake timers. Add mocked large-result tests proving payloads are capped. Add renderer tests for loading, partial failure, and cancellation states. Add an Electron smoke test that search failure/timeout does not block terminal creation or workspace switching.

---

### Pitfall 8: Misrepresenting FlashQuery document identity and propagation state

**What goes wrong:**
Cate caches vault file paths or frontmatter IDs as stable forever. After external edits, Obsidian changes, file moves, or frontmatter stripping, Cate opens stale references, shows duplicate results, or saves context against a document identity FlashQuery later remaps.

**Why it happens:**
FlashQuery document identity is intentionally resolved through content hash, frontmatter `fqc_id`, path lookup, and generated IDs. Propagation handles many changes, but some external edits require a scan to recover references. A desktop UI can over-trust path strings and under-surface "needs scan" state.

**How to avoid:**
Use FlashQuery-returned IDs and current result metadata as display references, but re-resolve before opening or writing. Surface scanner/propagation warnings from health or tool responses when available. Never edit `fqc_id` directly from Cate. Offer an explicit "run scan in FlashQuery" guidance path rather than silently reconciling identity.

**Warning signs:**
Cate stores only absolute paths in session state, assumes `fqc_id` equals file path, modifies frontmatter IDs, or has no UI state for "document may have moved/changed".

**Phase to address:**
Phase 2: Search/open results for read-side resolution. Phase 3: Save flows for write-side preflight and conflict messaging.

**Tests:**
Mock FlashQuery search results where a document path changes between search and open. Unit-test re-resolution and stale-result messaging. Add save-flow tests for "identity changed before write" and "scan recommended" responses. Add fixture markdown with stripped frontmatter to verify Cate does not attempt its own repair.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Adding FlashQuery handlers directly in `src/main/index.ts` | Fast wiring | Makes security review and lifecycle bugs harder in an already large main module | Never; create `src/main/ipc/flashquery.ts` or smaller modules |
| Exposing a generic `callMcpTool(name, args)` renderer API | Avoids adding per-feature methods | Turns renderer into a broad privileged MCP client and weakens validation | Only in internal test harnesses, never product UI |
| Storing bearer tokens in renderer state | Simplifies fetch code | Token exposure through devtools, logs, screenshots, and compromised renderer dependencies | Never |
| Opening vault paths as normal workspace files without grants | Smooth UX | Bypasses Cate's filesystem trust boundary and window-scoped grants | Never outside explicitly granted roots |
| Auto-injecting context into agents before visible search/save exists | Impressive demo | Hidden prompts, wrong-session routing, hard-to-debug agent behavior | Never before Phase 4 |
| Caching FlashQuery search result bodies in session JSON | Faster restore | Bloats `.cate/session.json`, stores stale/sensitive data, slows autosave | Only cache small redacted display metadata |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| FlashQuery HTTP MCP | Treating any 401/403 as "offline" | Distinguish unreachable, auth failed, token expired, schema not ready, and unsupported transport |
| FlashQuery token endpoint | Using raw `MCP_AUTH_SECRET` as long-lived bearer everywhere | Use it only to obtain/refresh bearer tokens; store it main-process-only if stored at all |
| FlashQuery stdio | Assuming stdio can be safely launched like a background service from Cate | Keep stdio as later/optional; initial integration should prefer explicit host-visible HTTP with clear lifecycle |
| FlashQuery vault | Trusting returned file paths directly | Revalidate realpath and workspace/vault grants in main before open/write |
| Pi agent runtime | Mapping context by session filename | Route by live `agentKey`; treat session file as metadata |
| Cate browser/document panels | Rendering FlashQuery result snippets as HTML | Render as escaped text/markdown through safe existing surfaces |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Health checks on every render or panel focus | UI jitter, repeated auth failures, noisy logs | Debounce, cache status briefly, trigger explicit refresh | Multiple FlashQuery panels or frequent workspace switches |
| Full-document result payloads | Slow search UI, large IPC payloads, session bloat | Request summaries/snippets first; lazy-load full documents | Vaults with large markdown/docs or many results |
| No cancellation for search | Late results overwrite newer queries | Abort previous request per query/panel and ignore stale sequence IDs | Fast typing or flaky network/local service |
| Synchronous retry loops in main | Terminal, drag, and session operations lag | Use timeouts, bounded retries, and async status state | Offline FlashQuery or expired tokens |
| Persisting result bodies in Cate sessions | Slow autosave and sensitive local state | Persist IDs, query, and small display metadata only | Large workspaces with many panels |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| HTTP transport without auth on non-loopback hosts | Unauthorized MCP tool calls and data access | Warn/block by default unless user explicitly accepts risk |
| Token leakage to renderer/logs | Credential disclosure through devtools, crash logs, or screenshots | Keep secrets in main; redact auth headers and URLs |
| Vault path grants applied globally | One workspace can read another workspace's vault files | Scope grants by workspace/window and validate on every open |
| Unsafe preview rendering | XSS-like renderer compromise through markdown/DOCX/HTML snippets | Escape snippets; avoid raw HTML; sanitize document-derived HTML |
| Agent hidden context | User cannot audit what data influenced model output | Visible context attachments with source IDs and removal |
| Generic MCP renderer bridge | Renderer can invoke write/delete/maintain tools unexpectedly | Tool allowlists and feature-specific IPC methods |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Collapsing all failures into "Cannot connect" | Users cannot fix auth, schema, vault, or offline problems | Show precise status categories and next action |
| Auto-saving context without preview | Users lose trust in memory quality and privacy | Explicit review with source, destination, tags, and content |
| Search results that cannot be opened safely | Search feels broken despite finding data | Show grant prompt or "open in existing editor" path |
| Invisible agent context retrieval | Agent answers become surprising and hard to reproduce | Show attached FlashQuery context per run/message |
| No stale-result messaging | Users see broken links after external edits | Re-resolve on open and explain when scan/retry is needed |
| Treating FlashQuery setup as a Cate wizard | Cate becomes responsible for external runtime failures | Provide connection setup, health feedback, and command guidance |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Connection setup:** Often missing auth-expiry handling, non-loopback warnings, and redacted error paths. Verify mocked 401, expired token, offline server, and unauthenticated HTTP cases.
- [ ] **Search UI:** Often missing cancellation, result caps, stale-result handling, and safe snippet rendering. Verify fast typing, large results, and malicious snippets.
- [ ] **Open vault document:** Often missing realpath validation, symlink tests, and workspace/vault grants. Verify outside-root, symlink, deleted-file, and ungranted-vault paths.
- [ ] **Save memory/document:** Often missing preview, provenance metadata, duplicate handling, and partial-failure behavior. Verify cancel, retry, duplicate title, and FlashQuery write errors.
- [ ] **Agent context:** Often missing visible attachments, per-agent routing, and restore semantics. Verify two simultaneous agents, workspace switch, session delete, and app restart.
- [ ] **Logging/telemetry:** Often missing token/database URL redaction. Verify logs, renderer errors, Sentry breadcrumbs, and analytics payloads never include secrets or content.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cate duplicated FlashQuery storage behavior | HIGH | Remove duplicate logic, migrate any Cate-owned metadata back to FlashQuery-compatible writes, run `flashquery scan`, add boundary tests |
| Token leaked to renderer/logs | HIGH | Rotate `MCP_AUTH_SECRET`, restart FlashQuery, clear/redact logs if possible, audit crash reports, add regression tests |
| Vault grant too broad | HIGH | Revoke persisted grants, audit opened paths, narrow grant scope by workspace/window, add symlink/outside-root tests |
| Duplicate/noisy memories | MEDIUM | Use FlashQuery search/admin workflows to identify duplicates, add save preview/idempotency, disable auto-save until fixed |
| Wrong agent received context | MEDIUM | Mark affected transcript/run as unreliable, clear hidden context state, add `agentKey` routing tests |
| Main-process blocking | MEDIUM | Add timeouts/cancellation/result caps, move heavy work out of UI path, add smoke/perf regression tests |
| Stale document identity | LOW to MEDIUM | Re-run FlashQuery scan, re-resolve result before open/write, clear stale cached result metadata |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Treating FlashQuery as Cate-owned infrastructure | Phase 1: Connection model and health checks | Cate never writes FlashQuery schema/config/vault identity directly; mocked health failures are surfaced only |
| Broad unvalidated IPC | Phase 1: Connection model and health checks | Every FlashQuery IPC handler has runtime schema tests and redaction tests |
| Weak HTTP auth/token lifecycle | Phase 1: Connection model and health checks | Auth state distinguishes offline, expired, rejected, and unauthenticated modes |
| Vault path trust bypasses | Phase 2: Search and open results | Realpath, symlink, grant, and escaped-preview tests pass |
| Unsafe save flows | Phase 3: Explicit save workflows | Preview/cancel/provenance/partial-failure tests pass before writes are enabled |
| Agent context identity confusion | Phase 4: Agent context integration | Multi-agent routing and session-restore tests prove context attaches to the right `agentKey` visibly |
| Main-process blocking | Phase 2: Search and open results | Timeout/cancellation tests and Electron smoke test show FlashQuery failures do not block core app actions |
| Stale document identity | Phase 2 and Phase 3 | Re-resolution tests cover moved files, stripped frontmatter, and scan-recommended responses |

## Sources

- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/PROJECT.md` - Cate FlashQuery Integration project scope and constraints.
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/CONCERNS.md` - Cate security, fragility, performance, and test-gap audit.
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/TESTING.md` - Cate Vitest, Playwright, mocking, fixture, and E2E testing patterns.
- `/Users/matt/Documents/Claude/Projects/Cate/cate/.planning/codebase/INTEGRATIONS.md` - Cate external integrations, storage, auth, monitoring, and deployment context.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/docs/ARCHITECTURE.md` - FlashQuery storage, MCP, deployment, vault identity, propagation, and known limitations.
- `/Users/matt/Documents/Claude/Projects/FlashQuery/flashquery/docs/SECURITY-TOKENS.md` - FlashQuery HTTP bearer token authentication and security guidance.

---
*Pitfalls research for: Cate FlashQuery Integration*
*Researched: 2026-05-28*
