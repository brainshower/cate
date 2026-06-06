import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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
import { FlashQueryEditorTitleActions } from '../components/FlashQueryEditorTitleActions'
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
    expect(document.querySelector('[data-tab-panel-id="editor-1"]')?.className).toContain('max-w-[360px]')
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

  it('keeps FlashQuery editor action buttons out of the tab pill', () => {
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

    const tab = document.querySelector('[data-tab-panel-id="editor-1"]')
    expect(tab?.querySelector('[aria-label="Copy vault path or reference"]')).toBeNull()
    expect(tab?.querySelector('[aria-label="Refresh from vault"]')).toBeNull()
    expect(tab?.querySelector('[aria-label="Open frontmatter"]')).toBeNull()
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

describe('FlashQueryEditorTitleActions', () => {
  it('T-U-007 renders FlashQuery body actions and calls the frontmatter store action', () => {
    const panel: PanelState = {
      id: 'editor-1',
      type: 'editor',
      title: 'Plan.md',
      isDirty: false,
      filePath: 'flashquery://workspace-1/Docs/Plan.md',
    }

    render(<FlashQueryEditorTitleActions panel={panel} workspaceId="workspace-1" />)

    expect(screen.getByLabelText('Copy vault path or reference')).toBeTruthy()
    expect(screen.getByLabelText('Refresh from vault')).toBeTruthy()
    screen.getByLabelText('Open frontmatter').click()

    expect(openFlashQueryFrontmatterEditorSpy).toHaveBeenCalledWith('workspace-1', 'editor-1')
  })

  it('shows visible hover tooltips for FlashQuery title actions', () => {
    const panel: PanelState = {
      id: 'editor-1',
      type: 'editor',
      title: 'Plan.md',
      isDirty: false,
      filePath: 'flashquery://workspace-1/Docs/Plan.md',
    }

    render(<FlashQueryEditorTitleActions panel={panel} workspaceId="workspace-1" />)

    fireEvent.mouseEnter(screen.getByLabelText('Refresh from vault'))
    expect(screen.getByRole('tooltip', { name: 'Reload this document from FlashQuery' })).toBeTruthy()

    fireEvent.mouseLeave(screen.getByLabelText('Refresh from vault'))
    fireEvent.mouseEnter(screen.getByLabelText('Open frontmatter'))
    expect(screen.getByRole('tooltip', { name: "Open this document's frontmatter" })).toBeTruthy()

    fireEvent.mouseLeave(screen.getByLabelText('Open frontmatter'))
    fireEvent.mouseEnter(screen.getByLabelText('Copy vault path or reference'))
    expect(screen.getByRole('tooltip', { name: 'Copy the FlashQuery vault path' })).toBeTruthy()
  })

  it('T-U-012 dispatches copy and refresh title actions to the mounted editor panel', () => {
    const panel: PanelState = {
      id: 'editor-1',
      type: 'editor',
      title: 'Plan.md',
      isDirty: false,
      filePath: 'flashquery://workspace-1/Docs/Plan.md',
    }
    const events: unknown[] = []
    const listener = (event: Event) => events.push((event as CustomEvent).detail)
    window.addEventListener('flashquery-editor-title-action', listener)

    render(<FlashQueryEditorTitleActions panel={panel} workspaceId="workspace-1" />)

    screen.getByLabelText('Copy vault path or reference').click()
    screen.getByLabelText('Refresh from vault').click()
    window.removeEventListener('flashquery-editor-title-action', listener)

    expect(events).toEqual([
      { panelId: 'editor-1', action: 'copy-reference' },
      { panelId: 'editor-1', action: 'refresh-from-vault' },
    ])
  })

  it('T-U-007 hides Open frontmatter for frontmatter, local-file, terminal, and vault panels', () => {
    const panels: PanelState[] = [
      {
        id: 'frontmatter',
        type: 'editor',
        title: 'Plan.md Frontmatter',
        isDirty: false,
        filePath: 'flashquery://workspace-1/Docs/Plan.md?part=frontmatter',
      },
      {
        id: 'local',
        type: 'editor',
        title: 'Plan.md',
        isDirty: false,
        filePath: '/workspace/Docs/Plan.md',
      },
      {
        id: 'terminal',
        type: 'terminal',
        title: 'Terminal 1',
        isDirty: false,
      },
      {
        id: 'vault',
        type: 'flashqueryVault',
        title: 'FlashQuery Vault',
        isDirty: false,
      },
    ]

    const { rerender } = render(<FlashQueryEditorTitleActions panel={panels[0]} workspaceId="workspace-1" />)
    expect(screen.queryByLabelText('Open frontmatter')).toBeNull()

    for (const panel of panels.slice(1)) {
      rerender(<FlashQueryEditorTitleActions panel={panel} workspaceId="workspace-1" />)
      expect(screen.queryByLabelText('Open frontmatter')).toBeNull()
    }
  })
})
