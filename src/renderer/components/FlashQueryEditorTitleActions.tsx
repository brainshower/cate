import { ArrowClockwise, Clipboard, FileText } from '@phosphor-icons/react'
import { useState, type MouseEvent, type ReactNode } from 'react'
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

interface ActionButtonProps {
  label: string
  tooltip: string
  className: string
  children: ReactNode
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

function ActionButton({ label, tooltip, className, children, onClick }: ActionButtonProps) {
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null)
  const tooltipId = `flashquery-action-tooltip-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <button
      type="button"
      aria-label={label}
      aria-describedby={tooltipRect ? tooltipId : undefined}
      title={tooltip}
      className={`${className} relative`}
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={(e) => setTooltipRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setTooltipRect(null)}
      onFocus={(e) => setTooltipRect(e.currentTarget.getBoundingClientRect())}
      onBlur={() => setTooltipRect(null)}
    >
      {children}
      {tooltipRect && (
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[9999] rounded-md border border-subtle bg-surface-4 px-2 py-1 text-muted shadow-2xl"
          style={{
            top: tooltipRect.bottom + 6,
            left: tooltipRect.left + (tooltipRect.width / 2),
            transform: 'translateX(-50%)',
            fontSize: 10,
            lineHeight: 1.35,
            whiteSpace: 'nowrap',
          }}
        >
          {tooltip}
        </span>
      )}
    </button>
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
        <ActionButton
          label="Refresh from vault"
          tooltip="Reload this document from FlashQuery"
          className={buttonClass}
          onClick={(e) => {
            e.stopPropagation()
            dispatchEditorAction(panel.id, 'refresh-from-vault')
          }}
        >
          <ArrowClockwise size={iconSize} />
        </ActionButton>
      )}
      {vaultUri.part === 'body' && (
        <ActionButton
          label="Open frontmatter"
          tooltip="Open this document's frontmatter"
          className={buttonClass}
          onClick={(e) => {
            e.stopPropagation()
            openFlashQueryFrontmatterEditor(workspaceId, panel.id)
          }}
        >
          <FileText size={iconSize} />
        </ActionButton>
      )}
      <ActionButton
        label="Copy vault path or reference"
        tooltip="Copy the FlashQuery vault path"
        className={buttonClass}
        onClick={(e) => {
          e.stopPropagation()
          dispatchEditorAction(panel.id, 'copy-reference')
        }}
      >
        <Clipboard size={iconSize} />
      </ActionButton>
    </>
  )
}
