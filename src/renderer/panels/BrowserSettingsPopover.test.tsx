import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserSettingsPopover } from './BrowserSettingsPopover'

const setSetting = vi.fn()

vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: {
    browserShowBookmarksBar: boolean
    setSetting: typeof setSetting
  }) => unknown) => selector({
    browserShowBookmarksBar: false,
    setSetting,
  }),
}))

beforeEach(() => {
  setSetting.mockClear()
})

describe('BrowserSettingsPopover', () => {
  it('T-U-020 toggles bookmarks-bar visibility and exposes no homepage/search controls', () => {
    render(<BrowserSettingsPopover onClearBrowsingData={vi.fn()} />)

    expect(screen.getByRole('switch', { name: 'Show bookmarks bar' }).getAttribute('aria-checked')).toBe('false')
    expect(screen.getByRole('button', { name: 'Clear browsing data...' })).toBeTruthy()
    expect(screen.queryByText(/homepage/i)).toBeNull()
    expect(screen.queryByText(/search engine/i)).toBeNull()
    expect(screen.queryByText(/proxy/i)).toBeNull()
    expect(screen.queryByText(/autocomplete/i)).toBeNull()
    expect(screen.queryByText(/start page/i)).toBeNull()

    fireEvent.click(screen.getByRole('switch', { name: 'Show bookmarks bar' }))
    expect(setSetting).toHaveBeenCalledWith('browserShowBookmarksBar', true)
  })
})
