// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SettingsWindow } from './SettingsWindow'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('SettingsWindow', () => {
  it('uses a wider responsive dialog so scaled app fonts still have room', () => {
    render(<SettingsWindow isOpen onClose={vi.fn()} />)

    const className = screen.getByTestId('settings-dialog').className
    expect(className).toContain('w-[48rem]')
    expect(className).toContain('max-w-[92vw]')
  })
})
