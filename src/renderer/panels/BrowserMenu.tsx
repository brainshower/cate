import { useEffect, useRef, useState } from 'react'
import { BookmarkSimple, Check, DotsThree, Gear, Trash } from '@phosphor-icons/react'
import { useSettingsStore } from '../stores/settingsStore'
import { useUIStore } from '../stores/uiStore'
import { BrowserSettingsPopover } from './BrowserSettingsPopover'

interface BrowserMenuProps {
  onClearBrowsingData: () => void
}

export function BrowserMenu({ onClearBrowsingData }: BrowserMenuProps) {
  const browserShowBookmarksBar = useSettingsStore((s) => s.browserShowBookmarksBar)
  const setSetting = useSettingsStore((s) => s.setSetting)
  const openSettings = useUIStore((s) => s.openSettings)
  const [open, setOpen] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open && !popoverOpen) return
    const onDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
        setPopoverOpen(false)
      }
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setPopoverOpen(false)
      }
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, popoverOpen])

  const itemClass = 'w-full flex items-center gap-2.5 px-3 h-8 text-sm text-primary hover:bg-hover transition-colors text-left'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value)
          setPopoverOpen(false)
        }}
        className="w-7 h-7 flex items-center justify-center rounded-full border border-subtle bg-surface-5 hover:bg-hover text-primary transition-colors"
        title="Browser menu"
        aria-label="Browser menu"
        aria-expanded={open}
      >
        <DotsThree size={13} weight="bold" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-40 w-56 rounded-md border border-subtle bg-surface-2 shadow-2xl py-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={browserShowBookmarksBar}
            className={itemClass}
            onClick={() => {
              setSetting('browserShowBookmarksBar', !browserShowBookmarksBar)
              setOpen(false)
            }}
          >
            <BookmarkSimple size={14} className="text-muted" />
            <span className="flex-1">Show bookmarks bar</span>
            {browserShowBookmarksBar && <Check size={14} className="text-accent" />}
          </button>
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false)
              setPopoverOpen(true)
            }}
          >
            <Trash size={14} className="text-muted" />
            <span>Clear browsing data...</span>
          </button>
          <div className="my-1 border-t border-subtle" />
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false)
              setPopoverOpen(false)
              openSettings('Browser')
            }}
          >
            <Gear size={14} className="text-muted" />
            <span>Browser settings</span>
          </button>
        </div>
      )}

      {popoverOpen && (
        <BrowserSettingsPopover onClearBrowsingData={onClearBrowsingData} />
      )}
    </div>
  )
}
