import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BrowserMenu } from './BrowserMenu'

const setSetting = vi.fn()
const openSettings = vi.fn()

vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: {
    browserShowBookmarksBar: boolean
    setSetting: typeof setSetting
  }) => unknown) => selector({
    browserShowBookmarksBar: true,
    setSetting,
  }),
}))

vi.mock('../stores/uiStore', () => ({
  useUIStore: (selector: (state: { openSettings: typeof openSettings }) => unknown) =>
    selector({ openSettings }),
}))

beforeEach(() => {
  setSetting.mockClear()
  openSettings.mockClear()
})

describe('BrowserMenu', () => {
  it('T-U-019 excludes New Tab and exposes Settings/bookmarks-bar controls', async () => {
    render(<BrowserMenu onClearBrowsingData={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Browser menu' }))

    expect(screen.queryByText(/new tab/i)).toBeNull()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Show bookmarks bar' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Clear browsing data...' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Browser settings' })).toBeTruthy()

    fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Show bookmarks bar' }))
    expect(setSetting).toHaveBeenCalledWith('browserShowBookmarksBar', false)

    fireEvent.click(screen.getByRole('button', { name: 'Browser menu' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Browser settings' }))
    await waitFor(() => expect(openSettings).toHaveBeenCalledWith('Browser'))
  })
})
