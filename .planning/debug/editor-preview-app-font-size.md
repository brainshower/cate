---
status: resolved
trigger: "In Cate, Editor Font Size applies to Monaco source editing but not markdown preview, and the rest of the app can be tiny on 4K screens. Add separate Preview Font Size and app-wide font size settings."
created: "2026-06-10T17:30:33Z"
updated: "2026-06-10T17:35:29Z"
---

# Debug Session: Editor Preview And App Font Size

## Symptoms

- expected_behavior: "Users can independently enlarge Monaco editor text, markdown preview text, and the general application UI for high-resolution screens."
- actual_behavior: "Editor Font Size only changes Monaco. Markdown preview remains hard-coded around 13px, and the app shell/sidebar text remains small."
- error_messages: "No runtime error reported."
- timeline: "Reported on 2026-06-10 while testing Cate on high-resolution displays."
- reproduction: "Increase Settings > Appearance > Editor font size, open a markdown file, toggle Preview markdown, and observe preview text and app chrome do not scale with editor text."

## Current Focus

- hypothesis: "MarkdownPreview hard-codes Tailwind pixel font classes, and the app has no root font-size setting even though many UI text utilities are rem-based."
- test: "npx vitest run src/renderer/panels/EditorPanel.test.tsx src/renderer/lib/appFontSize.test.ts; npm run typecheck"
- expecting: "Markdown preview body/headings/code/table text derive from Preview font size, and App font size applies to the html root font-size for rem-based UI scaling."
- next_action: "complete"
- reasoning_checkpoint: ""
- tdd_checkpoint: "red confirmed; green verified"

## Evidence

- timestamp: "2026-06-10T17:28:40Z"
  observation: "EditorPanel subscribes to settingsStore.editorFontSize and applies it only to Monaco editor instances."
  supports: "Existing setting is source-editor-specific."
- timestamp: "2026-06-10T17:29:10Z"
  observation: "MarkdownPreview uses fixed classes such as text-[13px], h3 text-[15px], code/table text-[12px]."
  supports: "Preview text cannot follow the editor setting or any user preference."
- timestamp: "2026-06-10T17:29:50Z"
  observation: "Many app UI classes use rem-based Tailwind sizes such as text-sm/text-xs, while some specialized controls use explicit px classes or inline fontSize."
  supports: "A root html font-size setting can scale much of the app without broad component rewrites, but will not affect every pixel-fixed element."
- timestamp: "2026-06-10T17:31:36Z"
  observation: "Focused preview test failed before implementation because markdown preview had no data-testid/style hook and rendered with fixed text-[13px] classes."
  supports: "Preview sizing was not connected to settings."
- timestamp: "2026-06-10T17:35:06Z"
  observation: "Focused EditorPanel suite and appFontSize helper tests passed after implementation."
  supports: "Preview and root app font sizing behavior is covered."
- timestamp: "2026-06-10T17:35:29Z"
  observation: "TypeScript typecheck passed."
  supports: "The new AppSettings keys and renderer usage are type-safe."

## Eliminated

- hypothesis: "Changing Editor Font Size should also drive markdown preview."
  reason: "User explicitly needs separate controls for source editor and rendered markdown preview; keeping separate settings avoids coupling code-editing and reading sizes."

## Resolution

- root_cause: "Editor preview markdown used fixed pixel Tailwind font classes and did not read settings. Cate also had no app-level root font-size setting, so rem-based UI text could not be scaled for high-resolution screens."
- fix: "Added appFontSize and previewFontSize settings with defaults and persistence schema entries; added Appearance controls; applied appFontSize to document.documentElement; made MarkdownPreview body/headings/code/pre/table sizes derive from previewFontSize."
- verification: "npx vitest run src/renderer/panels/EditorPanel.test.tsx src/renderer/lib/appFontSize.test.ts; npm run typecheck"
- files_changed: "src/shared/types.ts; src/main/store.ts; src/renderer/settings/AppearanceSettings.tsx; src/renderer/App.tsx; src/renderer/lib/appFontSize.ts; src/renderer/lib/appFontSize.test.ts; src/renderer/panels/EditorPanel.tsx; src/renderer/panels/EditorPanel.test.tsx"
