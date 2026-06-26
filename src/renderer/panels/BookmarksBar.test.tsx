import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserBookmark } from '../../shared/types'
import { BookmarksBar } from './BookmarksBar'

afterEach(() => {
  cleanup()
})

describe('BookmarksBar', () => {
  it('T-U-018 renders only supplied workspace bookmarks and navigates on click', () => {
    const navigate = vi.fn()
    const bookmarks: BrowserBookmark[] = [
      { url: 'https://workspace-a.test/page', title: 'Workspace A Page', addedAt: 1 },
    ]

    render(<BookmarksBar bookmarks={bookmarks} onNavigate={navigate} />)

    expect(screen.getByRole('button', { name: 'Workspace A Page' })).toBeTruthy()
    expect(screen.queryByText('Workspace B Page')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Workspace A Page' }))
    expect(navigate).toHaveBeenCalledWith('https://workspace-a.test/page')
  })

  it('renders nothing when the supplied workspace has no bookmarks', () => {
    const { container } = render(<BookmarksBar bookmarks={[]} onNavigate={vi.fn()} />)

    expect(container.firstChild).toBeNull()
  })
})
