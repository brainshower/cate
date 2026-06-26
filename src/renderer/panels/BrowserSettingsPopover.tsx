import { Trash } from '@phosphor-icons/react'
import { useSettingsStore } from '../stores/settingsStore'

interface BrowserSettingsPopoverProps {
  onClearBrowsingData: () => void
}

export function BrowserSettingsPopover({ onClearBrowsingData }: BrowserSettingsPopoverProps) {
  const browserShowBookmarksBar = useSettingsStore((s) => s.browserShowBookmarksBar)
  const setSetting = useSettingsStore((s) => s.setSetting)

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
        onClick={onClearBrowsingData}
        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm text-primary hover:bg-hover"
      >
        <Trash size={14} className="text-muted" />
        <span>Clear browsing data...</span>
      </button>
    </div>
  )
}
