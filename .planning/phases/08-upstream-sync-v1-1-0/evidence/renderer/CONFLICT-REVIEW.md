# Renderer And Harness Conflict Review

- `e2e/fixtures/electron-app.ts`: adopted upstream `perf` launch option and preserved isolated `userDataDir`, env override, and `ELECTRON_RUN_AS_NODE` handling. Evidence: T-E-001..T-E-005 pending full E2E, `editor-and-dialog.log`.
- `src/renderer/lib/e2eHarness.ts`: preserved FlashQuery E2E helpers and added upstream terminal PTY helpers. Evidence: T-E-001..T-E-005 pending full E2E; production gating covered by T-U-007.
- `src/renderer/panels/EditorPanel.tsx`: adopted upstream active theme/reveal/perf hooks and preserved FlashQuery vault URI read/save handling. Evidence: T-U-006, T-U-013, `editor-and-dialog.log`.
- `src/renderer/docking/DockTabBar.tsx`: adopted upstream middle-click and worktree title styling while preserving `VaultBadge` and wider vault tabs. Evidence: T-U-012, T-A-005/T-A-009 pending visual evidence, `editor-and-dialog.log`.
- `src/renderer/ui/CommandPalette.tsx`: adopted upstream reload workspace command and preserved New FlashQuery Vault command. Evidence: T-U-017, `unit-all.log`.
- `src/main/ipc/git.test.ts`: adopted upstream branch rename comment and retained `git branch -M main`; supports T-M-003 upstream git smoke.
