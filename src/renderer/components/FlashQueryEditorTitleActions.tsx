import { ArrowClockwise, Clipboard, FileText } from '@phosphor-icons/react'
import type { PanelState } from '../../shared/types'
import { parseVaultUri } from '../../shared/flashqueryUri'
import { useAppStore } from '../stores/appStore'

export const FLASHQUERY_EDITOR_TITLE_ACTION_EVENT = 'flashquery-editor-title-action'

export type FlashQueryEditorTitleAction = 'copy-reference' | 'refresh-from-vault'

export interface FlashQueryEditorTitleActionDetail {
  panelId: string
  action: FlashQueryEditorTitleAction
}

interface FlashQueryEditorTitleActionsProps {
  panel: PanelState
  workspaceId?: string
  compact?: boolean
}

function dispatchEditorAction(panelId: string, action: FlashQueryEditorTitleAction) {
  window.dispatchEvent(
    new CustomEvent<FlashQueryEditorTitleActionDetail>(
      FLASHQUERY_EDITOR_TITLE_ACTION_EVENT,
      { detail: { panelId, action } },
    ),
  )
}

export function FlashQueryEditorTitleActions({
  panel,
  workspaceId,
  compact = false,
}: FlashQueryEditorTitleActionsProps) {
  const vaultUri = panel.type === 'editor' && panel.filePath ? parseVaultUri(panel.filePath) : null
  const openFlashQueryFrontmatterEditor = useAppStore((s) => s.openFlashQueryFrontmatterEditor)
  if (!vaultUri || !workspaceId) return null

  const iconSize = compact ? 12 : 13
  const buttonClass = compact
    ? 'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-hover hover:text-primary'
    : 'flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-hover hover:text-primary'

  return (
    <>
      {vaultUri.part === 'body' && (
        <button
          type="button"
          aria-label="Refresh from vault"
          title="Refresh from vault"
          className={buttonClass}
          onClick={(e) => {
            e.stopPropagation()
            dispatchEditorAction(panel.id, 'refresh-from-vault')
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ArrowClockwise size={iconSize} />
        </button>
      )}
      {vaultUri.part === 'body' && (
        <button
          type="button"
          aria-label="Open frontmatter"
          title="Open frontmatter"
          className={buttonClass}
          onClick={(e) => {
            e.stopPropagation()
            openFlashQueryFrontmatterEditor(workspaceId, panel.id)
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <FileText size={iconSize} />
        </button>
      )}
      <button
        type="button"
        aria-label="Copy vault path or reference"
        title="Copy vault path or reference"
        className={buttonClass}
        onClick={(e) => {
          e.stopPropagation()
          dispatchEditorAction(panel.id, 'copy-reference')
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <Clipboard size={iconSize} />
      </button>
    </>
  )
}
