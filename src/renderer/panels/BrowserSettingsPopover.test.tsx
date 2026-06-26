import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      browserClearData: vi.fn(async () => ({
        ok: true,
        workspaceId: 'workspace-a',
        partition: 'persist:browser-ws-workspace-a',
        cleared: {
          electronStorage: true,
          history: true,
          bookmarks: true,
        },
      })),
    },
  })
})

afterEach(() => {
  cleanup()
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

  it('T-U-024 cancellation does not call clear-data IPC', () => {
    render(<BrowserSettingsPopover onClearBrowsingData={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear browsing data...' }))
    expect(screen.getByRole('alertdialog', { name: 'Clear browsing data?' })).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(window.electronAPI.browserClearData).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog', { name: 'Clear browsing data?' })).toBeNull()
  })

  it('confirmation clears the current workspace and displays success', async () => {
    render(<BrowserSettingsPopover workspaceId="workspace-a" />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear browsing data...' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear data' }))

    expect(window.electronAPI.browserClearData).toHaveBeenCalledWith('workspace-a')
    expect(await screen.findByText('Browsing data cleared')).toBeTruthy()
  })

  it('confirmation displays failure details', async () => {
    vi.mocked(window.electronAPI.browserClearData).mockResolvedValueOnce({
      ok: false,
      workspaceId: 'workspace-a',
      partition: 'persist:browser-ws-workspace-a',
      error: 'clear failed',
      cleared: {
        electronStorage: false,
        history: false,
        bookmarks: false,
      },
    })
    render(<BrowserSettingsPopover workspaceId="workspace-a" />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear browsing data...' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear data' }))

    expect(await screen.findByText('Clear failed: clear failed')).toBeTruthy()
  })
})
