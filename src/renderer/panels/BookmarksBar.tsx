import { Globe } from '@phosphor-icons/react'
import type { BrowserBookmark } from '../../shared/types'

interface BookmarksBarProps {
  bookmarks: BrowserBookmark[]
  onNavigate: (url: string) => void
}

export function BookmarksBar({ bookmarks, onNavigate }: BookmarksBarProps): JSX.Element | null {
  if (bookmarks.length === 0) return null

  return (
    <div className="h-8 flex items-center gap-1 px-2 bg-surface-4 border-b border-subtle overflow-x-auto shrink-0">
      {bookmarks.map((bookmark) => {
        const label = bookmark.title || bookmark.url
        return (
          <button
            key={bookmark.url}
            type="button"
            onClick={() => onNavigate(bookmark.url)}
            className="h-6 max-w-[180px] flex items-center gap-1.5 px-2 rounded text-xs text-secondary hover:bg-hover transition-colors shrink-0"
            title={label}
            aria-label={label}
          >
            <Globe size={12} className="text-muted shrink-0" />
            <span className="truncate">{label}</span>
          </button>
        )
      })}
    </div>
  )
}
