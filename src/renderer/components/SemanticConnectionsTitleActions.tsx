import { SlidersHorizontal } from '@phosphor-icons/react'
import { useSemanticConnectionsChromeStore } from '../stores/semanticConnectionsChromeStore'

interface SemanticConnectionsTitleActionsProps {
  panelId: string
  compact?: boolean
}

export function SemanticConnectionsTitleActions({
  panelId,
  compact,
}: SemanticConnectionsTitleActionsProps) {
  const chrome = useSemanticConnectionsChromeStore((state) => state.panels[panelId])
  const count = chrome?.connectionCount ?? 0
  const countLabel = `${count} ${count === 1 ? 'connection' : 'connections'}`

  return (
    <>
      <span
        className={`inline-flex items-center justify-center rounded border border-teal-400/30 bg-teal-400/10 font-mono text-teal-200 ${compact ? 'h-[18px] min-w-[18px] px-1 text-[10px]' : 'h-[22px] min-w-[22px] px-1.5 text-[11px]'}`}
        aria-label={`Connection count: ${countLabel}`}
        title={countLabel}
      >
        {count}
      </span>
      <button
        data-node-chrome-button
        className={`relative flex items-center justify-center rounded text-secondary hover:text-primary hover:bg-hover cursor-pointer ${compact ? 'w-[18px] h-[18px]' : 'w-[22px] h-[22px]'}`}
        aria-label="Configure semantic connections"
        aria-expanded={chrome?.configOpen ?? false}
        title="Configure semantic connections"
        onClick={() => chrome?.toggleConfig()}
      >
        <SlidersHorizontal size={compact ? 12 : 14} />
        {chrome?.configActive && (
          <span
            data-testid="semantic-config-indicator"
            className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-teal-300"
          />
        )}
      </button>
    </>
  )
}
