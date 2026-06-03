# Phase 14: Shared FlashQuery Contracts and IPC - Patterns

## Pattern Map

| Role | Files | Existing Pattern To Reuse |
|------|-------|---------------------------|
| Channel constants | `src/shared/ipc-channels.ts`, `src/shared/ipc-channels.test.ts` | Export uppercase constants with exact string values; tests collect all `flashquery:` values and assert no collisions. |
| Shared types | `src/shared/types.ts`, `src/shared/types.test.ts` | Define exported interfaces near the existing FlashQuery block; keep guards/sanitizers close to related types. |
| URI helper | `src/shared/flashqueryUri.ts`, `src/shared/flashqueryUri.test.ts`, `src/main/flashquery/uri.ts` | Shared helper owns implementation; main re-exports it. Tests cover encoded path segments and malformed escapes. |
| Preload bridge | `src/preload/index.ts` | Preload methods invoke shared channel constants with arguments in typed order; no business logic in preload. |
| Typed API | `src/shared/electron-api.d.ts` | Renderer API declarations import shared types from `./types` and mirror preload method signatures. |
| Main IPC validation | `src/main/ipc/flashquery.ts`, `src/main/ipc/flashquery.test.ts` | Small local validators throw `Error`; handlers catch where a safe result shape is required; tests use mocked `FlashQueryClientManager`. |
| MCP client normalization | `src/main/flashquery/clientManager.ts`, `src/main/flashquery/clientManager.test.ts` | Methods call `callJsonTool`, validate error envelopes, normalize server payloads, and redact connection tokens in thrown/returned errors. |

## Data Flow

Renderer code calls `window.electronAPI.flashquery*` methods from the preload bridge. Preload forwards raw arguments to main IPC. Main IPC validates renderer-controlled input and delegates to `FlashQueryClientManager`. The manager owns MCP tool names, request argument mapping, JSON parsing, response normalization, connection state, retry behavior, and token-safe errors.

## Implementation Guidance

- Keep privileged FlashQuery credentials in main only.
- Add new shared types before widening preload/main signatures so TypeScript guides the rest of the work.
- Preserve legacy body-only calls by making new options/payload parameters optional or union-typed.
- For tests, prefer updating existing focused test files over creating broad integration-style tests.
- Do not introduce renderer UI state in Phase 14.
