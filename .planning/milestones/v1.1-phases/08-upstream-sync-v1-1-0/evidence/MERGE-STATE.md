# Merge State Evidence

timestamp: 2026-06-01T16:31:00Z
merge command: git merge --no-ff v1.1.0
MERGE_HEAD: 5b6549d661a8427c829f60e15c4de9e71d49ac4d

git status --short:
A  .claude/scheduled_tasks.lock
M  .github/workflows/release.yml
M  .gitignore
M  CHANGELOG.md
M  README.de.md
M  README.fr.md
M  README.md
M  README.zh-CN.md
UU e2e/fixtures/electron-app.ts
A  e2e/perf-stress.spec.ts
M  electron-builder.yml
M  electron.vite.config.ts
UU package-lock.json
M  package.json
A  scripts/perf-sample.sh
A  skills/cate-theme/SKILL.md
A  skills/cate-theme/examples/midnight-ember.cate-theme.json
A  skills/cate-theme/examples/paper-light.cate-theme.json
A  skills/cate-theme/theme.schema.json
A  src/agent/main/agentDir.ts
M  src/agent/main/agentManager.ts
M  src/agent/main/authManager.ts
M  src/agent/main/installPlanMode.ts
M  src/agent/main/installSubagents.ts
M  src/agent/main/ipcAgent.ts
M  src/agent/main/marketplace.ts
M  src/agent/main/sessionFiles.ts
A  src/agent/renderer/AgentChatInput.tsx
M  src/agent/renderer/AgentPanel.tsx
A  src/agent/renderer/AgentSettingsView.tsx
A  src/agent/renderer/AgentSidebar.tsx
M  src/agent/renderer/ChatThread.tsx
A  src/agent/renderer/ModelPicker.tsx
M  src/agent/renderer/ProvidersView.tsx
M  src/agent/renderer/agentModelPrefs.ts
M  src/main/index.ts
A  src/main/installThemeSkill.ts
A  src/main/ipc/fileExclusions.test.ts
A  src/main/ipc/filesystem.test.ts
M  src/main/ipc/filesystem.ts
M  src/main/ipc/git-monitor.ts
UU src/main/ipc/git.test.ts
M  src/main/ipc/git.ts
M  src/main/ipc/shell.ts
M  src/main/ipc/terminal.ts
M  src/main/ipc/terminalLogger.ts
M  src/main/menu.ts
A  src/main/perf/perfMonitor.ts
M  src/main/projectWorkspaceStore.ts
M  src/main/store.ts
M  src/main/templates/skillTemplate.ts
M  src/main/windowRegistry.ts
UU src/preload/index.ts
M  src/renderer/App.tsx
D  src/renderer/canvas/BulkActionChip.tsx
M  src/renderer/canvas/Canvas.tsx
M  src/renderer/canvas/CanvasNode.tsx
M  src/renderer/canvas/CanvasRegionComponent.tsx
M  src/renderer/canvas/CanvasToolbar.tsx
M  src/renderer/canvas/NodeResizeOverlay.tsx
M  src/renderer/canvas/useCanvasNodeStyle.ts
M  src/renderer/canvas/useNodeResizeCursor.ts
M  src/renderer/docking/DockResizeHandle.tsx
UU src/renderer/docking/DockTabBar.tsx
M  src/renderer/docking/useDockTabActions.ts
M  src/renderer/hooks/useCanvasInteraction.ts
M  src/renderer/hooks/useNodeResize.ts
M  src/renderer/hooks/useShortcuts.ts
UU src/renderer/lib/e2eHarness.ts
A  src/renderer/lib/editorReveal.test.ts
A  src/renderer/lib/editorReveal.ts
A  src/renderer/lib/importExternalEntries.ts
A  src/renderer/lib/mouse.test.ts
A  src/renderer/lib/mouse.ts
A  src/renderer/lib/perf/perfClient.ts
UU src/renderer/lib/session.ts
A  src/renderer/lib/terminalFileLinkProvider.ts
A  src/renderer/lib/terminalFileLinks.test.ts
A  src/renderer/lib/terminalFileLinks.ts
A  src/renderer/lib/terminalKeymap.test.ts
A  src/renderer/lib/terminalKeymap.ts
A  src/renderer/lib/terminalLinks.test.ts
A  src/renderer/lib/terminalLinks.ts
M  src/renderer/lib/terminalRegistry.test.ts
M  src/renderer/lib/terminalRegistry.ts
D  src/renderer/lib/terminalUrlAutoOpen.ts
A  src/renderer/lib/terminalUrlOpen.ts
M  src/renderer/lib/themeManager.ts
A  src/renderer/lib/wheelIntent.test.ts
A  src/renderer/lib/wheelIntent.ts
A  src/renderer/lib/worktreeTitleStyle.ts
M  src/renderer/main.tsx
M  src/renderer/panels/BrowserPanel.tsx
M  src/renderer/panels/CanvasPanel.tsx
UU src/renderer/panels/EditorPanel.tsx
M  src/renderer/panels/TerminalPanel.tsx
D  src/renderer/panels/TerminalUrlPrompt.tsx
M  src/renderer/panels/types.ts
M  src/renderer/settings/AppearanceSettings.tsx
M  src/renderer/settings/BrowserSettings.tsx
A  src/renderer/settings/FileExplorerSettings.tsx
M  src/renderer/settings/SettingsComponents.tsx
M  src/renderer/settings/SettingsWindow.tsx
M  src/renderer/settings/TerminalSettings.tsx
M  src/renderer/shells/DockWindowShell.tsx
M  src/renderer/shells/PanelWindowShell.tsx
M  src/renderer/sidebar/FileExplorer.tsx
M  src/renderer/sidebar/FileTreeNode.tsx
M  src/renderer/sidebar/ParallelWorkTab.tsx
M  src/renderer/sidebar/ProjectList.tsx
M  src/renderer/sidebar/Sidebar.tsx
M  src/renderer/sidebar/SidebarSectionHeader.tsx
M  src/renderer/sidebar/WorkspaceTab.tsx
UU src/renderer/stores/appStore.ts
M  src/renderer/stores/canvasStore.test.ts
M  src/renderer/stores/canvasStore.ts
M  src/renderer/stores/settingsStore.ts
M  src/renderer/stores/shortcutStore.ts
M  src/renderer/stores/statusStore.ts
M  src/renderer/stores/uiStore.ts
D  src/renderer/stores/urlPromptStore.ts
M  src/renderer/styles/globals.css
UU src/renderer/ui/CommandPalette.tsx
A  src/renderer/ui/PerfHud.tsx
D  src/renderer/ui/ShortcutHintBadge.tsx
D  src/renderer/ui/ShortcutHintOverlay.tsx
M  src/shared/colors.ts
UU src/shared/electron-api.d.ts
UU src/shared/ipc-channels.ts
A  src/shared/theme.test.ts
A  src/shared/theme.ts
A  src/shared/themes/base.ts
A  src/shared/themes/darkCold.ts
A  src/shared/themes/darkWarm.ts
A  src/shared/themes/dracula.ts
A  src/shared/themes/index.ts
A  src/shared/themes/lightSubtle.ts
A  src/shared/themes/nord.ts
A  src/shared/themes/solarizedDark.ts
A  src/shared/themes/tokyoNight.ts
M  src/shared/types.ts
M  tailwind.config.ts
?? .planning/phases/08-upstream-sync-v1-1-0/evidence/

unmerged files:
e2e/fixtures/electron-app.ts
package-lock.json
src/main/ipc/git.test.ts
src/preload/index.ts
src/renderer/docking/DockTabBar.tsx
src/renderer/lib/e2eHarness.ts
src/renderer/lib/session.ts
src/renderer/panels/EditorPanel.tsx
src/renderer/stores/appStore.ts
src/renderer/ui/CommandPalette.tsx
src/shared/electron-api.d.ts
src/shared/ipc-channels.ts
