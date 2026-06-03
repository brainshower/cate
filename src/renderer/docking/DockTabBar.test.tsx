import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const { openFlashQueryFrontmatterEditorSpy } = vi.hoisted(() => ({
  openFlashQueryFrontmatterEditorSpy: vi.fn(),
}))

vi.mock('../hooks/useAgentPanelInfo', () => ({
  useAgentInfoByPanel: () => ({}),
}))
vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: {
    workspaces: Array<{
      id: string
      flashqueryConnection?: { transport: 'http'; url: string }
      worktrees?: unknown[]
      panels: Record<string, unknown>
    }>
    openFlashQueryFrontmatterEditor: ReturnType<typeof vi.fn>
  }) => unknown) => selector({
    workspaces: [{
      id: 'workspace-1',
      flashqueryConnection: { transport: 'http', url: 'https://fq.local:3100/mcp' },
      worktrees: [],
      panels: {},
    }],
    openFlashQueryFrontmatterEditor: openFlashQueryFrontmatterEditorSpy,
  }),
}))
vi.mock('../panels/registry', () => {
  const Icon = () => React.createElement('span', { 'data-testid': 'panel-icon' })
  const registry = {
    editor: { icon: Icon, tintClass: 'text-editor' },
    terminal: { icon: Icon, tintClass: 'text-terminal' },
    flashqueryVault: { icon: Icon, tintClass: 'text-vault' },
  }
  return {
    PANEL_REGISTRY: registry,
    getPanelDef: (type: keyof typeof registry) => registry[type] ?? registry.editor,
  }
})
vi.mock('../drag', () => ({
  useDragStore: {
    getState: () => ({ isDragging: false }),
  },
  useTabSourceVisibility: () => ({ hidden: false }),
}))

import { DockTabBar } from './DockTabBar'
import type { DockTabStack, PanelState } from '../../shared/types'

afterEach(() => {
  cleanup()
  openFlashQueryFrontmatterEditorSpy.mockReset()
})

describe('DockTabBar vault badge wiring', () => {
  it('T-U-012 renders VaultBadge in flashquery editor tab chrome with vault tab width treatment', () => {
    const stack: DockTabStack = { type: 'tabs', id: 'stack-1', panelIds: ['editor-1'], activeIndex: 0 }
    const panel: PanelState = {
      id: 'editor-1',
      type: 'editor',
      title: 'Plan.md',
      isDirty: false,
      filePath: 'flashquery://workspace-1/Docs/Plan.md',
    }

    render(
      <DockTabBar
        stack={stack}
        workspaceId="workspace-1"
        getPanel={(panelId) => panelId === panel.id ? panel : undefined}
        getPanelTitle={() => 'Plan.md'}
        onClosePanel={vi.fn()}
        onTabClick={vi.fn()}
        onTabMouseDown={vi.fn()}
        onTabContextMenu={vi.fn()}
        renameId={null}
        renameValue=""
        renameInputRef={{ current: null }}
        setRenameValue={vi.fn()}
        setRenameId={vi.fn()}
        commitRename={vi.fn()}
        beginRename={vi.fn()}
        springLoadTimer={{ current: null }}
        setActiveTab={vi.fn()}
        showTabPlaceholder={false}
      />,
    )

    expect(screen.getByTestId('vault-badge')).toBeTruthy()
    expect(screen.getByText('· fq.local:3100')).toBeTruthy()
    expect(document.querySelector('[data-tab-panel-id="editor-1"]')?.className).toContain('max-w-[280px]')
  })

  it('keeps badge chrome free of revision, conflict, and version UI copy', () => {
    const stack: DockTabStack = { type: 'tabs', id: 'stack-1', panelIds: ['editor-1'], activeIndex: 0 }
    const panel: PanelState = {
      id: 'editor-1',
      type: 'editor',
      title: 'Plan.md',
      isDirty: false,
      filePath: 'flashquery://workspace-1/Docs/Plan.md',
    }

    render(
      <DockTabBar
        stack={stack}
        workspaceId="workspace-1"
        getPanel={() => panel}
        getPanelTitle={() => 'Plan.md'}
        onClosePanel={vi.fn()}
        onTabClick={vi.fn()}
        onTabMouseDown={vi.fn()}
        onTabContextMenu={vi.fn()}
        renameId={null}
        renameValue=""
        renameInputRef={{ current: null }}
        setRenameValue={vi.fn()}
        setRenameId={vi.fn()}
        commitRename={vi.fn()}
        beginRename={vi.fn()}
        springLoadTimer={{ current: null }}
        setActiveTab={vi.fn()}
        showTabPlaceholder={false}
      />,
    )

    const copy = document.body.textContent ?? ''
    expect(copy).not.toMatch(/rev 42|version_token|expected_version|if_match|conflict|stale/i)
  })

  it('T-U-007 renders Open frontmatter for active FlashQuery body tabs and calls the store action', () => {
    const stack: DockTabStack = { type: 'tabs', id: 'stack-1', panelIds: ['editor-1'], activeIndex: 0 }
    const panel: PanelState = {
      id: 'editor-1',
      type: 'editor',
      title: 'Plan.md',
      isDirty: false,
      filePath: 'flashquery://workspace-1/Docs/Plan.md',
    }

    render(
      <DockTabBar
        stack={stack}
        workspaceId="workspace-1"
        getPanel={() => panel}
        getPanelTitle={() => 'Plan.md'}
        onClosePanel={vi.fn()}
        onTabClick={vi.fn()}
        onTabMouseDown={vi.fn()}
        onTabContextMenu={vi.fn()}
        renameId={null}
        renameValue=""
        renameInputRef={{ current: null }}
        setRenameValue={vi.fn()}
        setRenameId={vi.fn()}
        commitRename={vi.fn()}
        beginRename={vi.fn()}
        springLoadTimer={{ current: null }}
        setActiveTab={vi.fn()}
        showTabPlaceholder={false}
      />,
    )

    screen.getByLabelText('Open frontmatter').click()

    expect(openFlashQueryFrontmatterEditorSpy).toHaveBeenCalledWith('workspace-1', 'editor-1')
  })

  it('T-U-007 hides Open frontmatter for frontmatter, local-file, terminal, and vault tabs', () => {
    const panels: Record<string, PanelState> = {
      frontmatter: {
        id: 'frontmatter',
        type: 'editor',
        title: 'Plan.md Frontmatter',
        isDirty: false,
        filePath: 'flashquery://workspace-1/Docs/Plan.md?part=frontmatter',
      },
      local: {
        id: 'local',
        type: 'editor',
        title: 'Plan.md',
        isDirty: false,
        filePath: '/workspace/Docs/Plan.md',
      },
      terminal: {
        id: 'terminal',
        type: 'terminal',
        title: 'Terminal 1',
        isDirty: false,
      },
      vault: {
        id: 'vault',
        type: 'flashqueryVault',
        title: 'FlashQuery Vault',
        isDirty: false,
      },
    }
    const stack: DockTabStack = {
      type: 'tabs',
      id: 'stack-1',
      panelIds: Object.keys(panels),
      activeIndex: 0,
    }

    const { rerender } = render(
      <DockTabBar
        stack={stack}
        workspaceId="workspace-1"
        getPanel={(panelId) => panels[panelId]}
        getPanelTitle={(panelId) => panels[panelId].title}
        onClosePanel={vi.fn()}
        onTabClick={vi.fn()}
        onTabMouseDown={vi.fn()}
        onTabContextMenu={vi.fn()}
        renameId={null}
        renameValue=""
        renameInputRef={{ current: null }}
        setRenameValue={vi.fn()}
        setRenameId={vi.fn()}
        commitRename={vi.fn()}
        beginRename={vi.fn()}
        springLoadTimer={{ current: null }}
        setActiveTab={vi.fn()}
        showTabPlaceholder={false}
      />,
    )

    expect(screen.queryByLabelText('Open frontmatter')).toBeNull()

    for (const activeIndex of [1, 2, 3]) {
      rerender(
        <DockTabBar
          stack={{ ...stack, activeIndex }}
          workspaceId="workspace-1"
          getPanel={(panelId) => panels[panelId]}
          getPanelTitle={(panelId) => panels[panelId].title}
          onClosePanel={vi.fn()}
          onTabClick={vi.fn()}
          onTabMouseDown={vi.fn()}
          onTabContextMenu={vi.fn()}
          renameId={null}
          renameValue=""
          renameInputRef={{ current: null }}
          setRenameValue={vi.fn()}
          setRenameId={vi.fn()}
          commitRename={vi.fn()}
          beginRename={vi.fn()}
          springLoadTimer={{ current: null }}
          setActiveTab={vi.fn()}
          showTabPlaceholder={false}
        />,
      )
      expect(screen.queryByLabelText('Open frontmatter')).toBeNull()
    }
  })
})
