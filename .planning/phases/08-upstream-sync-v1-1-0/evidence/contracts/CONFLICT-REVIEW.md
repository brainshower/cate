# Contract Conflict Review

- `src/shared/ipc-channels.ts`: adopted upstream performance channel `PERF_GET`; preserved exact FlashQuery channels `flashquery:setConnection`, `flashquery:probe`, `flashquery:retry`, `flashquery:listVault`, `flashquery:getDocument`, `flashquery:writeDocument`, `flashquery:status`. Evidence: T-U-001, T-U-002, T-U-005, `flashquery-ipc.log`, `typecheck.log`.
- `src/shared/electron-api.d.ts`: adopted upstream `PerfSnapshot` type surface; preserved FlashQuery typed preload methods and status broadcast types. Evidence: T-U-003, T-U-007, `typecheck.log`.
- `src/preload/index.ts`: adopted upstream perf IPC import; preserved FlashQuery bridge channel imports and CATE_E2E-gated helper surfaces. Evidence: T-U-003, T-U-007, `typecheck.log`.
- `src/renderer/lib/session.ts`: adopted upstream project-file reload helper; moved FlashQuery sanitization into `projectFilesToSnapshot()` and restore path. Evidence: T-U-004, T-U-008, T-U-009, `shared-types.log`, `unit-all.log`.
- `src/renderer/stores/appStore.ts`: adopted upstream duplicate-workspace/id reuse guard while preserving sanitized `flashqueryConnection` creation. Evidence: T-U-010, T-U-004, `shared-types.log`, `unit-all.log`.
