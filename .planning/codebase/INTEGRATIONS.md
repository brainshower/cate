# External Integrations

**Analysis Date:** 2026-05-28

## APIs & External Services

**AI Provider APIs:**
- Pi coding-agent provider layer - Cate delegates model calls to the embedded Pi agent stack rather than calling model APIs directly.
  - SDK/Client: `@earendil-works/pi-coding-agent` 0.75.4 in `src/agent/main/agentManager.ts`; `@earendil-works/pi-ai` 0.75.5 in `src/agent/main/authManager.ts`.
  - Auth: OAuth credentials and API keys are written to `~/.pi/agent/auth.json` by `src/agent/main/authManager.ts`; API-key providers can also be detected from environment variables.
  - Providers: OpenAI, Anthropic, OpenAI Codex, GitHub Copilot, OpenRouter, Google Gemini, Groq, xAI, Mistral, DeepSeek, Moonshot/Kimi, z.ai, MiniMax, Cerebras, Together, Fireworks, HuggingFace, Cloudflare Workers AI, and Vercel AI Gateway.
  - Runtime path: Cate spawns Pi as an RPC subprocess from `src/agent/main/agentManager.ts`; model/provider selection is passed to `RpcClient`.

**Pi Extension Marketplace:**
- `https://pi.dev/packages` - Live marketplace catalog for Pi extensions.
  - Integration method: HTML fetch/scrape with `fetch` in `src/agent/main/marketplace.ts`.
  - Auth: none detected.
  - Install path: `src/agent/main/marketplace.ts` shells out to the Pi CLI with `pi install npm:<name>` or `pi remove npm:<name>`.
  - Local storage: installed extension metadata is read from `~/.pi/agent/extensions`, `~/.pi/agent/npm/node_modules`, and `~/.pi/agent/settings.json`.

**GitHub Releases API:**
- GitHub - Update discovery and release-page routing for `0-AI-UG/cate`.
  - SDK/Client: `electron-updater` 6.8.3 plus fallback `fetch` to `https://api.github.com/repos/0-AI-UG/cate/releases/latest` in `src/main/auto-updater.ts`.
  - Auth: no runtime token for update checks; release CI uses `GITHUB_TOKEN`/`GH_TOKEN` in `.github/workflows/release.yml`.
  - Endpoints used: latest release API; manual fallback opens GitHub release URLs through Electron `shell.openExternal`.
  - Rate limits: unauthenticated GitHub API limits apply to runtime fallback checks.

**Product Analytics:**
- `https://analytics.cero-ai.com/api/app-events` - Anonymous app events, update events, link clicks, and post-update feedback.
  - Integration method: Electron `net.request` POST in `src/main/analytics.ts`.
  - Auth: none detected.
  - User control: `usageAnalyticsEnabled` setting read through `src/main/store.ts`.
  - Offline behavior: failed events are buffered under Electron `userData` as `pending-events.jsonl` by `src/main/analytics.ts`.

**Crash/Error Reporting:**
- Sentry-compatible endpoint - Main, renderer, and native crash/error reporting.
  - SDK/Client: `@sentry/electron` in `src/main/sentry.ts` and `src/renderer/lib/sentry.ts`.
  - Auth: DSN from `SENTRY_DSN` runtime env var or build-time `__SENTRY_DSN__` injected by `electron.vite.config.ts`.
  - User control: `crashReportingEnabled` setting read and live-toggled through `src/main/store.ts`.
  - Data handling: `src/main/sentry.ts` disables default PII, scrubs home paths, and strips browser-panel URLs to origins in breadcrumbs.

**Feedback / Promotional Links:**
- GitHub repo API - Star count lookup for post-update feedback UI.
  - Integration method: renderer `fetch` to `https://api.github.com/repos/0-AI-UG/cate` in `src/renderer/dialogs/PostUpdateFeedbackDialog.tsx`.
  - Auth: none detected.
- Product Hunt and newsletter links - External browser routing for feedback dialog CTAs.
  - Integration method: renderer calls `trackLinkClick` and `openExternalUrl`; main validates HTTP(S) and uses `shell.openExternal` in `src/main/analytics.ts`.
  - Auth: none detected.

**Embedded Browser Panels:**
- User-provided HTTP(S), localhost, and file URLs - Browser panels can navigate to arbitrary URLs or search-engine queries.
  - Integration method: Electron `<webview>` in `src/renderer/panels/BrowserPanel.tsx`.
  - Defaults: `https://www.google.com` initial homepage fallback in `src/renderer/panels/BrowserPanel.tsx`.
  - Search providers: Google, DuckDuckGo, Bing, and Brave search URL templates in `src/shared/types.ts`.
  - Security: webview hardening and CSP are enforced from main-process code in `src/main/index.ts` and `src/main/webSecurity.ts`.

## Data Storage

**Databases:**
- Not detected - No Supabase, PostgreSQL, SQLite, Prisma, Drizzle, or other database client is present in `package.json`.

**File Storage:**
- Local filesystem - Workspaces, editor files, documents, terminal sessions, and screenshots are local-only.
  - SDK/Client: Node `fs`/`fs/promises` and Electron IPC handlers in `src/main/ipc/filesystem.ts`, `src/main/store.ts`, and `src/main/jsonFileStore.ts`.
  - Auth: OS user permissions.
  - Scope: workspace roots are validated before filesystem, terminal, and Git operations through path-validation handlers in `src/main/ipc/pathValidation.ts`.
- Electron userData - Settings, boot snapshot, analytics state, pending analytics queue, and persisted layout/session data.
  - Client: `electron-store` in `src/main/store.ts`; JSON file helpers in `src/main/jsonFileStore.ts`.
  - Files: `config.json`, `boot.json`, `analytics-state.json`, and `pending-events.jsonl` under Electron `userData`.
- Pi agent files - AI credentials, sessions, settings, and extension packages under `~/.pi/agent`.
  - Client: direct filesystem access in `src/agent/main/authManager.ts`, `src/agent/main/marketplace.ts`, `src/agent/main/installSubagents.ts`, and `src/agent/main/installPlanMode.ts`.
  - Auth file: `~/.pi/agent/auth.json`, written with directory mode `0700` and file mode `0600` when supported.

**Caching:**
- In-memory marketplace cache - `src/agent/main/marketplace.ts` caches Pi marketplace pages for 10 minutes.
- In-memory app state - workspace/session/window registries and stores live in process memory; no Redis or external cache detected.

## Authentication & Identity

**Auth Provider:**
- Pi AI provider auth - Custom wrapper around `@earendil-works/pi-ai` providers in `src/agent/main/authManager.ts`.
  - Implementation: `getOAuthProviders()`, `getOAuthProvider()`, and provider login callbacks from `@earendil-works/pi-ai/oauth`.
  - Token storage: OAuth credentials and API keys are stored in `~/.pi/agent/auth.json`.
  - Session management: OAuth flow state is in-memory in `AuthManager`; completed credentials are persisted for Pi to read.
  - Renderer IPC: provider listing, status, OAuth start, prompt replies, API-key save, and delete are exposed through `src/preload/index.ts` and channel constants in `src/shared/ipc-channels.ts`.

**OAuth Integrations:**
- OAuth providers exposed by `@earendil-works/pi-ai` - Includes providers such as Anthropic, OpenAI Codex, and GitHub Copilot according to the provider catalog used by `src/agent/main/authManager.ts`.
  - Credentials: provider-specific OAuth credentials persisted in `~/.pi/agent/auth.json`.
  - Flow: `src/agent/main/authManager.ts` opens external auth/device URLs through Electron `shell.openExternal`, handles manual code prompts, and forwards OAuth flow events to the renderer.
  - Callback server: provider descriptors include `usesCallbackServer`; Cate surfaces this metadata from `getOAuthProviders()`.

**API-Key Integrations:**
- AI API-key providers - API keys are accepted for OpenAI, Anthropic, OpenRouter, Google Gemini, Groq, xAI, Mistral, DeepSeek, Moonshot/Kimi, z.ai, MiniMax, Cerebras, Together, Fireworks, HuggingFace, Cloudflare Workers AI, and Vercel AI Gateway.
  - Credentials: `src/agent/main/authManager.ts` stores keys in `~/.pi/agent/auth.json` or detects provider env vars.
  - Env vars: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `XAI_API_KEY`, `MISTRAL_API_KEY`, `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `ZAI_API_KEY`, `MINIMAX_API_KEY`, `CEREBRAS_API_KEY`, `TOGETHER_API_KEY`, `FIREWORKS_API_KEY`, `HF_TOKEN`, `CLOUDFLARE_API_KEY`, and `AI_GATEWAY_API_KEY`.

## Monitoring & Observability

**Error Tracking:**
- Sentry-compatible crash reporting - Optional and user-toggleable.
  - DSN: `SENTRY_DSN` env var or build-time `__SENTRY_DSN__`.
  - SDK: `@sentry/electron` configured in `src/main/sentry.ts`; renderer bridge initialized in `src/renderer/lib/sentry.ts`.
  - Release tracking: `cate@${app.getVersion()}` in `src/main/sentry.ts`.

**Analytics:**
- Cero analytics endpoint - Anonymous product telemetry.
  - Token: none detected.
  - Events tracked: `app_start`, `app_install`, `app_updated`, update button events, manual release opening, feedback submit/dismiss, and promo link clicks in `src/main/analytics.ts`.
  - Privacy: `src/main/analytics.ts` comments and payload construction exclude file paths, project names, workspace contents, hostname, IP-derived IDs, and user account info.

**Logs:**
- electron-log - Main and renderer logs persisted locally.
  - Integration: `src/main/logger.ts` initializes file logging and renderer IPC logging; `src/renderer/lib/logger.ts` forwards renderer logs.
  - Storage: Electron log path for Cate, with 5 MB file rotation configured in `src/main/logger.ts`.
  - External log shipping: not detected.

## CI/CD & Deployment

**Hosting:**
- GitHub Releases - Public release artifacts are uploaded to `0-AI-UG/cate`.
  - Deployment: tag pushes matching `v*` trigger `.github/workflows/release.yml`.
  - Artifacts: `electron-builder` outputs to `release/` as configured by `electron-builder.yml`.
  - Auto-update provider: `electron-builder.yml` uses GitHub publish provider with owner `0-AI-UG` and repo `cate`.

**CI Pipeline:**
- GitHub Actions - Cross-platform build, typecheck, unit tests, smoke tests, and release packaging.
  - Workflows: `.github/workflows/ci.yml` and `.github/workflows/release.yml`.
  - CI OS matrix: macOS, Ubuntu, and Windows in `.github/workflows/ci.yml`.
  - Release OS matrix: macOS, Ubuntu, and Windows in `.github/workflows/release.yml`.
  - Secrets: GitHub release workflow uses `GITHUB_TOKEN`, `MAC_CERTS`, `MAC_CERTS_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`.

## Environment Configuration

**Development:**
- Required env vars: none for the core desktop app; AI provider keys are optional and can be entered through the UI or supplied as environment variables.
- Secrets location: no repo-local `.env` files detected; Pi credentials are stored in `~/.pi/agent/auth.json`; release/signing secrets live in GitHub Actions secrets.
- Mock/stub services: Vitest tests mock external modules where needed; E2E launches set `CATE_E2E=1` through `e2e/fixtures/electron-app.ts`.
- Optional env vars: `SENTRY_DSN`, `DEV_FORCE_DIALOG`, `CATE_E2E`, `CATE_SMOKE_TEST`, and `ELECTRON_RENDERER_URL`.

**Staging:**
- Environment-specific differences: Not detected.
- Data: Not detected.

**Production:**
- Secrets management: packaged scripts bake `SENTRY_DSN` through `electron.vite.config.ts`; release signing and GitHub upload secrets are GitHub Actions secrets in `.github/workflows/release.yml`.
- Updates: `electron-updater` and GitHub release fallback in `src/main/auto-updater.ts`.
- Data: user-local Electron `userData`, workspace files, and `~/.pi/agent` files.

## Webhooks & Callbacks

**Incoming:**
- OAuth callback server - Provider-specific callback handling is managed by `@earendil-works/pi-ai` providers invoked from `src/agent/main/authManager.ts`.
  - Verification: delegated to `@earendil-works/pi-ai`.
  - Events: OAuth authorization/device/manual-code completion.
- External webhooks: Not detected.

**Outgoing:**
- Analytics events - `src/main/analytics.ts` posts app events to `https://analytics.cero-ai.com/api/app-events`.
  - Retry logic: failed sends are buffered in `pending-events.jsonl` and flushed on later successful sends.
- Sentry envelopes - `src/main/sentry.ts`, `src/renderer/lib/sentry.ts`, and `scripts/sentry-test.mjs` send Sentry-compatible error events.
  - Retry logic: handled by Sentry SDK where applicable; `scripts/sentry-test.mjs` exits nonzero on failed test sends.
- GitHub release checks - `src/main/auto-updater.ts` checks for updates on app launch, every 15 minutes, and on manual requests.
  - Retry logic: native `electron-updater` failures fall back to GitHub Releases API version discovery.
- Pi marketplace fetches - `src/agent/main/marketplace.ts` fetches the Pi packages page with timeout and one retry.
  - Retry logic: two attempts, then returns an empty catalog payload.

---

*Integration audit: 2026-05-28*
*Update when adding/removing external services*
