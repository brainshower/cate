import React from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

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
  }) => unknown) => selector({
    workspaces: [{
      id: 'workspace-1',
      flashqueryConnection: { transport: 'http', url: 'https://fq.local:3100/mcp' },
      worktrees: [],
      panels: {},
    }],
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
})
