// =============================================================================
// ProjectListPanel — Dockable panel wrapping the ProjectList workspace list.
// =============================================================================

import React from 'react'
import { ProjectList } from '../sidebar/ProjectList'
import type { PanelProps } from './types'

export default function ProjectListPanel({ panelId: _panelId, workspaceId: _workspaceId }: PanelProps) {
  return (
    <div className="w-full h-full overflow-auto bg-surface-4">
      <ProjectList />
    </div>
  )
}
