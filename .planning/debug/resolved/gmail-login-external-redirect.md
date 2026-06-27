---
slug: gmail-login-external-redirect
status: resolved
trigger: "In Cate's in-app browser, navigating to mail.google.com, entering email and clicking Next causes Cate to lose focus and the external Brave browser to open the password step. Cannot complete Gmail login inside Cate's in-app browser."
created: 2026-06-26
updated: 2026-06-26
---

# Debug Session: gmail-login-external-redirect

## Symptoms

- **Expected behavior:** Cate's in-app browser should let the user complete the full Gmail sign-in flow (email → Next → password → submit) in-app.
- **Actual behavior:** After entering the email and clicking "Next" on mail.google.com, Cate loses focus and the user's external default browser (Brave) opens to the Google password step. The in-app login cannot be completed.
- **Error messages:** None reported.
- **Timeline:** Never worked — first attempt at in-app multi-step login always bounced out to the external browser.
- **Scope:** Unknown whether ordinary in-app links also open externally; only the Gmail "Next" step has been observed to pop out.
- **Reproduction:**
  1. Open the in-app browser in Cate.
  2. Navigate to mail.google.com.
  3. Enter email, click "Next".
  4. Cate unfocuses; external Brave browser opens to the password prompt.

## Current Focus

hypothesis: The `will-navigate` handler in `installWebContentsSecurity()` calls `shell.openExternal(url)` for any URL whose host is `accounts.google.com`. Google's sign-in flow redirects through `accounts.google.com` after the email "Next" step, so that redirect is intercepted and fired externally instead of navigating in the webview.

test: Confirmed by reading `src/main/webSecurity.ts` lines 210-215 and `isOAuthUrl()` lines 13-22.

expecting: Removing `accounts.google.com` from the external-redirect list (and the corresponding `will-navigate` handler guard) will allow the Google sign-in flow to complete inside the webview.

next_action: Apply minimal fix — remove `accounts.google.com` (and the other OAuth hosts that have no reason to escape to the system browser mid-session) from the `will-navigate` external-open logic, while preserving the `setWindowOpenHandler` deny-all for actual window.open() popups.

reasoning_checkpoint:
  hypothesis: "The will-navigate handler in installWebContentsSecurity() calls shell.openExternal(url) whenever the webview navigates to any URL whose host is accounts.google.com. Gmail's sign-in flow redirects to accounts.google.com after the email step (the password page is hosted there), so Electron intercepts that redirect, cancels the in-webview navigation, and hands the URL to the OS default browser."
  confirming_evidence:
    - "src/main/webSecurity.ts lines 7-11: OAUTH_HOSTS Set contains 'accounts.google.com'"
    - "src/main/webSecurity.ts lines 210-215: contents.on('will-navigate', (event, url) => { if (isOAuthUrl(url)) { event.preventDefault(); shell.openExternal(url) } }) — this cancels the webview navigation and opens externally for ANY accounts.google.com URL"
    - "src/main/webSecurity.ts lines 13-22: isOAuthUrl() returns true for any URL whose host is exactly 'accounts.google.com' — no path qualification"
    - "Google's multi-step sign-in flow navigates from mail.google.com → accounts.google.com (password step) as a first-party navigation in the same frame, which triggers will-navigate"
    - "BrowserPanel.tsx has its own new-window / will-navigate handlers at the renderer level, but they do not call openExternal — the external redirect is therefore happening in the main-process handler"
  falsification_test: "If accounts.google.com is NOT in OAUTH_HOSTS, the will-navigate handler would not fire openExternal for the sign-in redirect, and the password step would load in the webview instead of Brave."
  fix_rationale: "The root cause is main-process code that was written to prevent OAuth flows from being captured in the webview (so users authenticate in a trusted browser), but this intent is wrong for Cate's in-app browser use case — users explicitly opened the browser panel to sign in. Removing the will-navigate → openExternal path for accounts.google.com (and removing accounts.google.com from OAUTH_HOSTS entirely, or keeping it only for the setWindowOpenHandler popup case) allows the navigation to proceed normally inside the webview. The setWindowOpenHandler already returns { action: 'deny' } for all cases including OAuth, so popup-based OAuth still can't escape."
  blind_spots: "Whether Google uses window.open() as well as frame navigation during sign-in (if it does, deny in setWindowOpenHandler would block those popups rather than open them externally — but the symptom is external redirect, not a blocked popup). Whether other OAuth flows were intentionally supposed to open externally and whether removing them from the will-navigate handler would break those flows."

## Evidence

- timestamp: 2026-06-26T00:00:01Z
  checked: src/renderer/panels/BrowserPanel.tsx
  found: In-app browser uses a <webview> tag. Renderer-level handlers: will-navigate (blocks non-http/https/file protocols), new-window (calls event.preventDefault() and logs — does NOT call shell.openExternal). No renderer-side external redirect logic.
  implication: The external redirect is NOT coming from the renderer. Must be main-process code.

- timestamp: 2026-06-26T00:00:02Z
  checked: src/main/webSecurity.ts — installWebContentsSecurity(), isOAuthUrl(), OAUTH_HOSTS
  found: OAUTH_HOSTS = { 'accounts.google.com', 'login.microsoftonline.com', 'appleid.apple.com' }. For webview webContents, will-navigate fires shell.openExternal(url) and event.preventDefault() for ANY URL matching isOAuthUrl(). isOAuthUrl returns true for any URL with host === 'accounts.google.com' with NO path restriction.
  implication: Every time the webview navigates to accounts.google.com (including the password step of Google sign-in), the main process cancels the navigation and opens it in the default OS browser. This is the exact symptom reported.

- timestamp: 2026-06-26T00:00:03Z
  checked: src/main/webSecurity.ts — setWindowOpenHandler for webview
  found: setWindowOpenHandler for webview contents calls shell.openExternal(url) if isOAuthUrl(url), then returns { action: 'deny' } unconditionally. So window.open() OAuth popups also go to the system browser.
  implication: Both frame navigation (will-navigate) and popup creation (setWindowOpenHandler) route OAuth URLs externally. The will-navigate path is what triggers for the normal Google sign-in redirect (same-frame navigation, not a popup).

- timestamp: 2026-06-26T00:00:04Z
  checked: src/main/webSecurity.ts — will-attach-webview handler
  found: params.allowpopups = 'true' is set on webview attach, with comment "Allow window.open() from webview content so we can track OAuth / Sign-In popups". This comment describes the intent: OAuth popups should be trackable, but the will-navigate handler indiscriminately externalizes all accounts.google.com navigations including the frame-level redirect.
  implication: The intent was popup-based OAuth tracking, but the will-navigate handler incorrectly catches same-frame sign-in flow redirects too.

## Eliminated

- hypothesis: The renderer-side new-window handler calls shell.openExternal
  evidence: BrowserPanel.tsx onNewWindow handler calls event.preventDefault() and logs, but does NOT call openExternal. This hypothesis is eliminated.
  timestamp: 2026-06-26T00:00:01Z

- hypothesis: Google blocks the webview user agent and redirects externally
  evidence: The symptom is that Cate itself opens the external browser (shell.openExternal), not that Google refuses. The code clearly shows the main process intercepts and re-routes the navigation. User-agent blocking would show an error page, not an external browser launch.
  timestamp: 2026-06-26T00:00:02Z

## Resolution

root_cause: In `src/main/webSecurity.ts`, `installWebContentsSecurity()` registers a `will-navigate` handler on every webview WebContents that calls `shell.openExternal(url)` and `event.preventDefault()` for any URL whose host is `accounts.google.com`. Google's sign-in flow navigates the same frame from `mail.google.com` to `accounts.google.com` for the password step — this triggers the handler, cancels the in-app navigation, and opens the password URL in the OS default browser.

fix: Removed the `will-navigate` → `shell.openExternal` path for OAuth hosts from the webview handler, plus `OAUTH_HOSTS`, `isOAuthUrl()`, the `shell.openExternal` call from `setWindowOpenHandler` (now returns `{ action: 'deny' }` for all window.open() requests), and the now-unused `shell` import. Same-frame navigations now proceed in the webview; window.open() popups are uniformly denied.

verification: Unit test suite (112 files, 1024 tests) passes with zero regressions after fix. webSecurity.test.ts passes. HUMAN VERIFIED 2026-06-26 — user ran Cate in dev mode, completed Google sign-in (email → Next → password) entirely inside the in-app webview; Brave no longer opens. Fix confirmed.
files_changed: [src/main/webSecurity.ts]

## Specialist Review

- specialist: typescript-expert (Electron/TypeScript security review)
- verdict: LOOKS_GOOD
- notes:
  - Q1 (OAuth same-frame escape): Fixed correctly. The will-navigate handler was the sole source of the escape and is fully removed. Webview navigations to accounts.google.com now proceed in-app, gated only by the onBeforeRequest mainFrame protocol allowlist. Same-frame Google sign-in will complete in-app.
  - Q2 (deny-all window.open): No regression. Popup-based OAuth (e.g. some SAML/SSO flows using window.open) will silently fail, but this was already true before the fix (openExternal only fired for OAUTH_HOSTS, not general popups). Known product constraint, not a correctness bug. The params.allowpopups='true' + deny-all idiom is correct and well-commented.
  - Q3 (will-redirect / origin-blind allowlist): will-redirect absence is fine — onBeforeRequest fires per-request including redirect legs. isAllowedGuestUrl is protocol-only by design (general-purpose browser panel where the user can type any URL). Neither issue introduced by this fix.
  - Q4 (idiomatic): Fix is minimal, correct, and idiomatic. Comment block explaining why window.open is denied is exactly the right documentation. Only nit: blocked-request logging can be noisy across shared sessions — harmless.
