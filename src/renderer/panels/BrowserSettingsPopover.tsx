import { useState } from 'react'
import { Trash } from '@phosphor-icons/react'
import { useSettingsStore } from '../stores/settingsStore'
import type { BrowserClearDataResult } from '../../shared/types'

interface BrowserSettingsPopoverProps {
  workspaceId?: string
  onClearBrowsingData?: () => void
}

export function BrowserSettingsPopover({ workspaceId, onClearBrowsingData }: BrowserSettingsPopoverProps) {
  const browserShowBookmarksBar = useSettingsStore((s) => s.browserShowBookmarksBar)
  const setSetting = useSettingsStore((s) => s.setSetting)
  const [confirmingClear, setConfirmingClear] = useState(false)
  const [clearStatus, setClearStatus] = useState<string | null>(null)
  const [isClearing, setIsClearing] = useState(false)

  const handleConfirmClear = async (): Promise<void> => {
    if (!workspaceId) {
      setClearStatus('Clear failed: workspace unavailable')
      setConfirmingClear(false)
      return
    }

    setIsClearing(true)
    setClearStatus(null)
    let result: BrowserClearDataResult
    try {
      result = await window.electronAPI.browserClearData(workspaceId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setClearStatus(`Clear failed: ${message || 'unknown error'}`)
      setConfirmingClear(false)
      setIsClearing(false)
      return
    }

    setConfirmingClear(false)
    setIsClearing(false)
    setClearStatus(result.ok ? 'Browsing data cleared' : `Clear failed: ${result.error}`)
  }

  return (
    <div
      role="dialog"
      aria-label="Browser quick settings"
      className="absolute right-2 top-12 z-40 w-72 rounded-md border border-subtle bg-surface-2 shadow-2xl p-2"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="switch"
        aria-checked={browserShowBookmarksBar}
        aria-label="Show bookmarks bar"
        onClick={() => setSetting('browserShowBookmarksBar', !browserShowBookmarksBar)}
        className="w-full flex items-center justify-between gap-3 px-2.5 py-2 rounded-md text-left text-sm text-primary hover:bg-hover"
      >
        <span>Show bookmarks bar</span>
        <span
          aria-hidden="true"
          className={`relative w-9 h-5 rounded-full transition-colors ${
            browserShowBookmarksBar ? 'bg-focus-blue' : 'bg-surface-6'
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              browserShowBookmarksBar ? 'translate-x-[18px]' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>

      <div className="h-px bg-subtle my-1" />

      <button
        type="button"
        onClick={() => {
          onClearBrowsingData?.()
          setClearStatus(null)
          setConfirmingClear(true)
        }}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm text-primary hover:bg-hover"
      >
        <Trash size={14} className="text-muted" />
        <span>Clear browsing data...</span>
      </button>

      {confirmingClear && (
        <div
          role="alertdialog"
          aria-label="Clear browsing data?"
          className="mt-2 rounded-md border border-subtle bg-surface-3 p-3"
        >
          <p className="text-sm font-medium text-primary">Clear browsing data?</p>
          <p className="mt-1 text-xs text-secondary">
            Cookies, site data, history, and bookmarks for this workspace will be cleared.
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setConfirmingClear(false)}
              className="px-2.5 py-1.5 rounded-md text-xs text-primary hover:bg-hover"
              disabled={isClearing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmClear()}
              className="px-2.5 py-1.5 rounded-md text-xs text-white bg-red-600 hover:bg-red-500 disabled:opacity-60"
              disabled={isClearing}
            >
              {isClearing ? 'Clearing...' : 'Clear data'}
            </button>
          </div>
        </div>
      )}

      {clearStatus && (
        <p className="mt-2 px-2.5 text-xs text-secondary" role="status">
          {clearStatus}
        </p>
      )}
    </div>
  )
}
