import React from 'react'

interface FlashQueryRefreshConfirmDialogProps {
  open: boolean
  fileName: string
  onSaveAndRefresh: () => void
  onDiscardAndRefresh: () => void
  onCancel: () => void
}

export function FlashQueryRefreshConfirmDialog({
  open,
  fileName,
  onSaveAndRefresh,
  onDiscardAndRefresh,
  onCancel,
}: FlashQueryRefreshConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashquery-refresh-confirm-title"
        className="w-[420px] max-w-full rounded-lg border border-subtle bg-surface-4 p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="flashquery-refresh-confirm-title" className="text-sm font-semibold text-primary">
          Unsaved changes
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-secondary">
          {fileName} has unsaved edits. Refreshing from the vault will replace the editor contents.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded bg-surface-5 px-3 py-1.5 text-xs text-secondary hover:bg-hover hover:text-primary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-surface-5 px-3 py-1.5 text-xs text-secondary hover:bg-hover hover:text-primary"
            onClick={onDiscardAndRefresh}
          >
            Discard and refresh
          </button>
          <button
            type="button"
            className="rounded bg-focus px-3 py-1.5 text-xs font-medium text-white hover:brightness-110"
            onClick={onSaveAndRefresh}
          >
            Save and refresh
          </button>
        </div>
      </div>
    </div>
  )
}
