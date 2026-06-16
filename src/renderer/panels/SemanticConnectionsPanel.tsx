import type { SemanticConnectionsPanelProps } from './types'
import { usePreviewSelectionStore } from '../stores/previewSelectionStore'

export default function SemanticConnectionsPanel({ panelId }: SemanticConnectionsPanelProps) {
  const activeChunkId = usePreviewSelectionStore((state) => state.activeChunkId)

  return (
    <section
      className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-surface-2 text-primary"
      data-panel-id={panelId}
      data-testid="semantic-connections-panel"
    >
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-subtle px-3">
        <span className="text-[11px] font-medium uppercase tracking-normal text-muted">Scope</span>
        <button
          type="button"
          className="min-w-0 truncate text-left text-xs text-secondary hover:text-primary"
          onClick={() => usePreviewSelectionStore.getState().clearSelection()}
        >
          {activeChunkId ? `Section ${activeChunkId}` : 'Whole document'}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-center px-4 text-sm text-secondary">
        <p className="max-w-[28rem] leading-relaxed">
          Similarity results will appear here when embeddings are available for the active Markdown preview.
        </p>
      </div>
    </section>
  )
}
