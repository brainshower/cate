// =============================================================================
// Panel type definitions for the renderer
// =============================================================================

import type { PanelType } from '../../shared/types'
import { PANEL_DEFINITIONS } from '../../shared/panels'
import type { SemanticConnectionsProvider } from '../lib/semanticConnections'

// -----------------------------------------------------------------------------
// Base panel props
// -----------------------------------------------------------------------------

export interface PanelProps {
  panelId: string
  workspaceId: string
  nodeId?: string
}

// -----------------------------------------------------------------------------
// Panel-specific props
// -----------------------------------------------------------------------------

export interface TerminalPanelProps extends PanelProps {
  initialInput?: string
}

export interface EditorPanelProps extends PanelProps {
  filePath?: string
}

export interface BrowserPanelProps extends PanelProps {
  url?: string
}

export interface OutlinePanelProps extends PanelProps {
  sourceEditorPanelId?: string
}

export interface SemanticConnectionsPanelProps extends PanelProps {
  sourceEditorPanelId?: string
  sourceFilePath?: string
  provider?: SemanticConnectionsProvider
  createEditorForOpen?: (workspaceId: string, filePath: string, options?: { sourceEditorPanelId?: string; markdownPreview?: boolean }) => string
  setEditorPreviewForOpen?: (workspaceId: string, panelId: string, preview: boolean) => void
}

// -----------------------------------------------------------------------------
// Panel display helpers
// -----------------------------------------------------------------------------

/** Returns a brand color hex string for the given panel type. */
export function panelColor(type: PanelType): string {
  return PANEL_DEFINITIONS[type].brandColor
}
