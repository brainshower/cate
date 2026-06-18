# Settings Width And Pi Font Size Debug

- Status: resolved
- Trigger: Settings modal becomes cramped when App font size increases; Editor/Pi font controls need clearer sections.
- Symptom: Settings card uses fixed w-[520px], while app font scaling increases control/text footprint.
- Current hypothesis: widen the Settings card with rem-based responsive sizing and add a persisted piFontSize setting consumed by Pi chat surfaces.
- Evidence: SettingsWindow fixed width class w-[520px]; AppearanceSettings has editor/preview/app font rows without Editor or Pi subsection; ChatThread/AgentChatInput hard-code Pi text sizes.

## Plan

1. Add regression tests for Settings width/sections and Pi message font sizing.
2. Add piFontSize to shared settings defaults/schema/store flow.
3. Widen Settings card and group Appearance font controls into Editor and Pi subsections.
4. Apply Pi font size to chat messages and composer.
5. Run focused tests and typecheck.

## Resolution

- Replaced the fixed 520px Settings dialog with a wider responsive `48rem` width capped at `92vw`.
- Added `Editor` and `Pi` subsections under Appearance settings.
- Added persisted `piFontSize` setting with a default matching the previous assistant chat size.
- Applied `piFontSize` to Pi user/assistant chat text, Markdown relative text, and the composer textarea.

## Verification

- `npx vitest run src/renderer/settings/SettingsWindow.test.tsx src/renderer/settings/AppearanceSettings.test.tsx src/agent/renderer/ChatThread.test.tsx --pool=forks --poolOptions.forks.singleFork=true --testTimeout=5000 --teardownTimeout=1000`
- `npm run typecheck`
