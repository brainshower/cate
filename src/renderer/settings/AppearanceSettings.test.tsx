// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppearanceSettings } from './AppearanceSettings'
import { DEFAULT_SETTINGS } from '../../shared/types'
import { useSettingsStore } from '../stores/settingsStore'

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

describe('AppearanceSettings', () => {
  it('groups font controls into Editor and Pi subsections', () => {
    render(<AppearanceSettings />)

    expect(screen.getByText('Editor')).toBeTruthy()
    expect(screen.getByText('Editor font size')).toBeTruthy()
    expect(screen.getByText('Preview font size')).toBeTruthy()
    expect(screen.getByText('Pi')).toBeTruthy()
    expect(screen.getByText('Chat font size')).toBeTruthy()
  })
})
