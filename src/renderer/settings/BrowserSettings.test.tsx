// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { useSettingsStore } from '../stores/settingsStore'
import { BrowserSettings } from './BrowserSettings'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

afterEach(() => {
  cleanup()
  useSettingsStore.setState({ ...DEFAULT_SETTINGS, _loaded: false })
})

describe('BrowserSettings', () => {
  it('T-U-031 keeps homepage/search in Settings and surfaces browserShowBookmarksBar', () => {
    const setSetting = vi.spyOn(useSettingsStore.getState(), 'setSetting')

    render(<BrowserSettings />)

    expect(screen.getByText('Homepage')).toBeTruthy()
    expect(screen.getByText('Search engine')).toBeTruthy()
    expect(screen.getByText('Show bookmarks bar')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Show bookmarks bar' }))
    expect(setSetting).toHaveBeenCalledWith('browserShowBookmarksBar', false)
  })
})
