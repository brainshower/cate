---
status: resolved
trigger: "FlashQuery editor actions for frontmatter access, copy ref, and refresh from vault appear inside the editor content when the editor is viewed on Cate canvas; expected placement is in the editor title bar per Design 3 - Editor title-bar action row."
created: "2026-06-06T00:00:00-03:00"
updated: "2026-06-06T14:22:00-03:00"
---

# Debug Session: Canvas Editor Actions Titlebar

## Symptoms

- expected_behavior: "FlashQuery editor actions should render as compact title-bar action icons, before the vault badge and close control, matching Product/Cate/Continued FQ integration (milestone 2)/Designs/Design 3 - Editor title-bar action row."
- actual_behavior: "When the editor is viewed in Cate's canvas, the frontmatter access, copy ref, and refresh from vault buttons sit inside the editor window content."
- error_messages: "None reported."
- timeline: "Reported during review of Cate canvas editor UI on 2026-06-06; prior working state unknown."
- reproduction: "Open a FlashQuery vault document editor on the Cate canvas and inspect the editor window chrome/content boundary."

## Current Focus

- hypothesis: "Confirmed: EditorPanel rendered FlashQuery editor actions as absolute-positioned content controls, while title chrome only rendered VaultBadge and a partial frontmatter action."
- test: "Moved FlashQuery editor actions into shared title chrome and verified DockTabBar, PanelWindowShell, and EditorPanel behavior with focused tests."
- expecting: "Canvas mini-dock tabs and detached editor windows render compact title actions before the vault badge; EditorPanel no longer renders frontmatter/copy/refresh controls inside Monaco content."
- next_action: "None; fix applied and verified."
- reasoning_checkpoint: ""
- tdd_checkpoint: ""

## Evidence

- timestamp: "2026-06-06T00:00:00-03:00"
  observation: "Design HTML shows .titlebar > .actions containing Refresh, Edit frontmatter, Copy reference, Run Macro, Vault badge, and Close controls."
  source: "Product/Cate/Continued FQ integration (milestone 2)/Designs/Design 3 - Editor title-bar action row/Vault Editor Title Bar - M2 Actions-print - Standalone.html"
- timestamp: "2026-06-06T00:00:00-03:00"
  observation: "rg found EditorPanel.tsx rendering Refresh from vault text button around line 953; DockTabBar.tsx renders Open frontmatter in tab chrome."
  source: "src/renderer/panels/EditorPanel.tsx, src/renderer/docking/DockTabBar.tsx"
- timestamp: "2026-06-06T14:22:00-03:00"
  observation: "Cate EditorPanel owned all FlashQuery copy/refresh behavior and rendered controls in editor content; DockTabBar is the relevant title chrome host for canvas editor mini-docks."
  source: "src/renderer/panels/EditorPanel.tsx, src/renderer/docking/DockTabBar.tsx"
- timestamp: "2026-06-06T14:22:00-03:00"
  observation: "FlashQueryEditorTitleActions is rendered from DockTabBar before VaultBadge, while EditorPanel listens for panel-scoped title-action events and no longer renders the action row in content."
  source: "src/renderer/components/FlashQueryEditorTitleActions.tsx, src/renderer/panels/EditorPanel.tsx"

## Eliminated

None.

## Resolution

- root_cause: "FlashQuery editor actions were implemented inside EditorPanel content as an absolute overlay even though shared title chrome existed. Canvas-hosted editors expose DockTabBar chrome plus the same EditorPanel body, so the duplicate controls appeared over the Monaco editor body."
- fix: "Kept FlashQuery editor actions in title chrome, aligned their order to refresh/frontmatter/copy before the vault badge, routed copy/refresh to the mounted EditorPanel through panel-scoped events, and removed the content action row from EditorPanel."
- verification: "npx vitest run src/renderer/panels/EditorPanel.test.tsx src/renderer/docking/DockTabBar.test.tsx; npx vitest run src/renderer/shells/PanelWindowShell.test.tsx; npm run typecheck"
- files_changed: "src/renderer/components/FlashQueryEditorTitleActions.tsx; src/renderer/docking/DockTabBar.tsx; src/renderer/shells/PanelWindowShell.tsx; src/renderer/panels/EditorPanel.tsx; src/renderer/panels/EditorPanel.test.tsx; src/renderer/docking/DockTabBar.test.tsx; src/renderer/shells/PanelWindowShell.test.tsx"
