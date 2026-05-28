# Technology Stack

**Analysis Date:** 2026-05-28

## Languages

**Primary:**
- TypeScript 5.9.3 - Main process, preload bridge, renderer UI, agent integration, shared types, tests, and build config in `src/`, `electron.vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, and `tailwind.config.ts`.
- TSX / React JSX - Renderer and agent-panel components in `src/renderer/**/*.tsx` and `src/agent/renderer/**/*.tsx`.

**Secondary:**
- JavaScript / Node ESM scripts - Utility scripts in `scripts/generate-icons.js`, `scripts/run-electron-smoke.mjs`, and `scripts/sentry-test.mjs`.
- YAML - GitHub Actions and Electron Builder configuration in `.github/workflows/ci.yml`, `.github/workflows/release.yml`, and `electron-builder.yml`.
- CSS / Tailwind - Renderer styling in `src/renderer/styles/`, Tailwind tokens in `tailwind.config.ts`, and PostCSS setup in `postcss.config.js`.

## Runtime

**Environment:**
- Node.js 20.x or 22.x - `.nvmrc` pins `20`, and `package.json` enforces `>=20 <23`.
- Electron 41.2.0 - Desktop runtime for the main process, preload bridge, renderer windows, webviews, native shell integration, and packaged app distribution.
- Chromium renderer - React UI runs inside Electron renderer processes loaded from `index.html` through `electron-vite`.
- Native Node modules - `node-pty` requires native compilation/prebuild compatibility; `README.md` requires Python 3 and a C++ toolchain for source builds.

**Package Manager:**
- npm >= 9 - Source setup and CI use `npm install`; `README.md` documents npm >= 9.
- Lockfile: `package-lock.json` present, lockfileVersion 3.
- Package manager field: not specified in `package.json`; use npm to match the lockfile and workflows.

## Frameworks

**Core:**
- Electron 41.2.0 - Desktop app shell, main process, IPC, BrowserWindow/webview support, native menus, shell access, and packaging entry point via `src/main/index.ts`.
- React 18.3.1 + React DOM 18.3.1 - Renderer application and agent panel UI in `src/renderer/main.tsx`, `src/renderer/App.tsx`, and `src/agent/renderer/AgentPanel.tsx`.
- electron-vite 5.0.0 + Vite 7.3.2 - Main/preload/renderer bundling configured in `electron.vite.config.ts`.
- @earendil-works Pi stack - Embedded coding-agent runtime through `@earendil-works/pi-coding-agent`, `@earendil-works/pi-ai`, and `@earendil-works/pi-agent-core` in `src/agent/main/agentManager.ts` and `src/agent/main/authManager.ts`.

**Testing:**
- Vitest 3.2.4 - Unit and jsdom tests configured in `vitest.config.ts`; test files are co-located under `src/**/*.test.ts` and `src/**/*.test.tsx`.
- jsdom 29.1.1 - DOM runtime for TSX tests selected by `environmentMatchGlobs` in `vitest.config.ts`.
- Playwright 1.60.0 / @playwright/test 1.60.0 - Electron E2E tests configured in `playwright.config.ts` and stored in `e2e/`.
- Electron smoke harness - `npm run test:smoke:electron` runs `scripts/run-electron-smoke.mjs`.

**Build/Dev:**
- TypeScript compiler 5.9.3 - Strict typechecking via `npm run typecheck` and `tsconfig.json`.
- @vitejs/plugin-react 4.7.0 - React transform for renderer and Vitest in `electron.vite.config.ts` and `vitest.config.ts`.
- electron-builder 26.8.1 - Platform packages configured in `electron-builder.yml`.
- Tailwind CSS 3.4.19 + PostCSS 8.5.9 + autoprefixer 10.4.27 - Renderer styling pipeline in `tailwind.config.ts` and `postcss.config.js`.
- @electron/rebuild 4.0.3 - Native dependency rebuild support for Electron-compatible modules.

## Key Dependencies

**Critical:**
- `@earendil-works/pi-coding-agent` 0.75.4 - Spawns the Pi RPC coding-agent subprocess from `src/agent/main/agentManager.ts`.
- `@earendil-works/pi-ai` 0.75.5 - Provides OAuth providers, provider discovery, and environment-key lookup in `src/agent/main/authManager.ts`.
- `node-pty` 1.1.0 - Native PTY backend for terminal panels in `src/main/ipc/terminal.ts`.
- `monaco-editor` 0.52.2 - Code editor and worker runtime for editor panels in `src/renderer/panels/EditorPanel.tsx` and `src/renderer/workers/editorService.worker.ts`.
- `zustand` 5.0.12 - Renderer and agent state stores in `src/renderer/stores/`, `src/renderer/drag/store.ts`, and `src/agent/renderer/agentStore.ts`.
- `@sentry/electron` 5.12.0 - Main and renderer crash/error reporting in `src/main/sentry.ts` and `src/renderer/lib/sentry.ts`.
- `electron-updater` 6.8.3 - Native update checks/download/install flow in `src/main/auto-updater.ts`.

**Infrastructure:**
- `electron-store` 10.1.0 - User settings, recent projects, and saved layouts in `src/main/store.ts`.
- `electron-log` 5.4.3 - Main and renderer logging in `src/main/logger.ts` and `src/renderer/lib/logger.ts`.
- `simple-git` 3.35.2 - Git status, diff, branch, fetch/pull/push, and worktree operations in `src/main/ipc/git.ts`.
- `chokidar` 4.0.3 - Shared filesystem watcher pool in `src/main/ipc/filesystem.ts`.
- `@xterm/xterm` 5.5.0 with fit/search/webgl addons - Terminal rendering in `src/renderer/lib/terminalRegistry.ts`.
- `pdfjs-dist` 5.7.284 and `mammoth` 1.12.0 - PDF and DOCX document panels in `src/renderer/panels/DocumentPanel.tsx`.

## Configuration

**Environment:**
- `SENTRY_DSN` - Optional runtime/build-time Sentry DSN read by `src/main/sentry.ts`; `electron.vite.config.ts` inlines it as `__SENTRY_DSN__`; package scripts provide a default DSN for packaged builds.
- `DEV_FORCE_DIALOG` - Development-only feedback dialog trigger used by `src/main/analytics.ts` and `npm run dev:dialog`.
- `CATE_E2E` - E2E isolation flag used by `src/preload/index.ts`, `src/main/index.ts`, and `e2e/fixtures/electron-app.ts`.
- `CATE_SMOKE_TEST` - Electron smoke-test flag set by `scripts/run-electron-smoke.mjs` and read by `src/main/index.ts`.
- `ELECTRON_RENDERER_URL` - electron-vite development renderer URL consumed by `src/main/index.ts` and `src/main/webSecurity.ts`.
- AI provider credentials - Optional environment variables detected by `src/agent/main/authManager.ts`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `ZAI_API_KEY`, `MINIMAX_API_KEY`, `CEREBRAS_API_KEY`, `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `HF_TOKEN`, `CLOUDFLARE_API_KEY`, and `AI_GATEWAY_API_KEY`.
- Release signing/publishing credentials - GitHub Actions release job uses `GH_TOKEN`, `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` in `.github/workflows/release.yml`.
- `.env` files: none detected at repo root during analysis.

**Build:**
- `package.json` - Scripts, engines, dependency ranges, app metadata, and main entry.
- `package-lock.json` - Resolved npm dependency graph.
- `electron.vite.config.ts` - Main/preload/renderer build targets, Sentry define injection, React plugin, PostCSS, and Pi package bundling exceptions.
- `electron-builder.yml` - App ID, product name, output directory, asar unpack rules, extra resources, GitHub publish provider, and macOS/Windows/Linux targets.
- `tsconfig.json` and `tsconfig.node.json` - Strict TypeScript options and path aliases: `@shared/*`, `@renderer/*`, and `@main/*`.
- `tailwind.config.ts` and `postcss.config.js` - Tailwind content roots, theme tokens, dark mode, PostCSS plugins.
- `vitest.config.ts` and `playwright.config.ts` - Unit/jsdom and Electron E2E test configuration.

## Platform Requirements

**Development:**
- macOS, Linux, or Windows with Node.js 20 or 22 LTS; Node 23+ is excluded by `package.json` and `README.md`.
- Python 3 and C++ build tools are required for native dependencies such as `node-pty`; platform-specific prerequisites are documented in `README.md`.
- Use `npm install`, `npm run dev`, `npm run typecheck`, `npm test`, and `npm run test:e2e` from the repo root.
- Git is required for source-control features implemented through `simple-git` in `src/main/ipc/git.ts`.

**Production:**
- Distributed as an Electron desktop app through `electron-builder`.
- macOS targets: DMG and ZIP for x64 and arm64, hardened runtime and notarization configured in `electron-builder.yml`.
- Windows targets: NSIS installer and ZIP for x64 in `electron-builder.yml`.
- Linux targets: AppImage, DEB, and tar.gz for x64 in `electron-builder.yml`.
- Release CI builds and uploads artifacts from `release/` through `.github/workflows/release.yml`.

---

*Stack analysis: 2026-05-28*
*Update after major dependency changes*
