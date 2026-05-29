# Phase 2: Connection Layer - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-29
**Phase:** 2-Connection Layer
**Areas discussed:** Source authority, Phase boundary, Probe/state/retry contract, Subscription events, Test obligations

---

## Source Authority

| Option | Description | Selected |
|--------|-------------|----------|
| External product docs first | Use the user-provided requirements and test plan as the first source for downstream agents. | ✓ |
| Local planning docs only | Use `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md` only. | |

**User's choice:** External product docs first.
**Notes:** User explicitly provided the requirements and test-plan paths and asked that downstream agents refer to those docs first before bringing questions back.

---

## Phase Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Manager-side connection layer only | Implement REQ-004, REQ-005, REQ-006, and manager-side REQ-011. | ✓ |
| Include Phase 3 IPC wiring | Also add renderer IPC channels and broadcast wiring. | |

**User's choice:** Manager-side connection layer only, per roadmap and product test-plan traceability.
**Notes:** Phase 3 owns IPC surface and renderer broadcast wiring. Phase 2 produces the manager-side status events that Phase 3 will expose.

---

## Probe/state/retry Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Follow product contract exactly | Probe `GET /mcp/info` without auth, model connecting/live/disconnected, retry 2s doubling to 60s, support manual retry. | ✓ |
| Let implementation choose status/retry details | Leave timing and payload details flexible. | |

**User's choice:** Follow product contract exactly.
**Notes:** Requirements and tests already lock the state names, probe auth omission, metadata extraction, error behavior, retry timing, manual retry, and reset semantics.

---

## Subscription Events

| Option | Description | Selected |
|--------|-------------|----------|
| Preserve and extend Phase 1 manager subscription shape | Keep workspace/event scoped subscribe/unsubscribe and emit status events. | ✓ |
| Replace with a new event API | Rework the subscription model before Phase 3. | |

**User's choice:** Preserve and extend Phase 1 manager subscription shape.
**Notes:** Phase 1 established workspace-scoped subscribe/unsubscribe. Phase 2 should add status event production without creating vault-change events yet.

---

## Test Obligations

| Option | Description | Selected |
|--------|-------------|----------|
| Implement all T-U-021 through T-U-039 | Cover probe, state, retry, manual retry, dispose cleanup, and subscriber isolation in `clientManager.test.ts`. | ✓ |
| Defer some tests to IPC/UI phases | Leave part of the manager behavior uncovered until later. | |

**User's choice:** Implement all T-U-021 through T-U-039.
**Notes:** Renderer-side REQ-011 integration tests remain Phase 3, but manager-side REQ-011 tests T-U-038 and T-U-039 belong here.

---

## the agent's Discretion

- Exact manager method names for initiating a probe/manual retry, provided Phase 3 can call them cleanly.
- Internal state shape for connection metadata, retry timers, and subscriber collections.
- URL normalization helper placement, provided `/mcp/info` construction is deterministic and tested.

## Deferred Ideas

- Phase 3: `flashquery:*` IPC handlers, preload API, renderer-window status broadcast wiring.
- Later phases: vault panel, chip UI, settings dialog, editor URI routing, E2E harness, visual checks.
- Future/out of scope: SSE vault notifications, conflict detection, OAuth, keychain storage, stdio transport, vault document creation.
