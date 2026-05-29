import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Chip, ChipSurface, chipSurfaceStyle } from './Chip'

afterEach(() => {
  cleanup()
})

describe('Chip', () => {
  it('renders the connecting state with a spinner and exact label', () => {
    const { container } = render(<Chip state={{ kind: 'connecting' }} />)

    expect(screen.getByText('Connecting…')).toBeTruthy()
    expect(container.querySelector('[data-chip-spinner]')).toBeTruthy()
  })

  it('renders the live state with a green dot and exact label', () => {
    const { container } = render(<Chip state={{ kind: 'live' }} />)

    expect(screen.getByText('Live')).toBeTruthy()
    expect(container.querySelector('[data-chip-dot]')).toHaveProperty('style.backgroundColor', 'rgb(52, 199, 89)')
  })

  it('renders the disconnected state with a red dot and exact label', () => {
    const { container } = render(<Chip state={{ kind: 'disconnected', error: 'offline' }} />)

    expect(screen.getByText('Disconnected')).toBeTruthy()
    expect(container.querySelector('[data-chip-dot]')).toHaveProperty('style.backgroundColor', 'rgb(255, 69, 58)')
    expect(screen.getByText('Disconnected').className).toContain('text-red-400')
  })

  it('renders an unknown fallback for future states without throwing', () => {
    expect(() => render(<Chip state={{ kind: 'auth-failed' } as any} />)).not.toThrow()

    expect(screen.getByText('Unknown')).toBeTruthy()
  })

  it('only makes the disconnected state clickable and fires retry', () => {
    const onRetry = vi.fn()
    render(<Chip state={{ kind: 'disconnected', error: 'offline' }} onRetry={onRetry} />)

    const chip = screen.getByRole('button', { name: 'Disconnected' })
    expect(chip).toHaveProperty('style.cursor', 'pointer')

    fireEvent.click(chip)

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('shows the disconnected tooltip with error and retry hint on hover', () => {
    render(<Chip state={{ kind: 'disconnected', error: 'Server is offline' }} onRetry={() => {}} />)

    expect(screen.queryByText('Server is offline')).toBeNull()

    const chip = screen.getByRole('button', { name: 'Disconnected' })
    const restingBackground = chip.style.background

    fireEvent.mouseEnter(chip)

    expect(screen.getByText('Server is offline')).toBeTruthy()
    expect(screen.getByText('Click to retry')).toBeTruthy()
    expect(chip.style.background).not.toBe(restingBackground)
  })

  it('does not fire retry for live or connecting clicks', () => {
    const onRetry = vi.fn()
    const { rerender } = render(<Chip state={{ kind: 'live' }} onRetry={onRetry} />)

    fireEvent.click(screen.getByText('Live'))

    rerender(<Chip state={{ kind: 'connecting' }} onRetry={onRetry} />)
    fireEvent.click(screen.getByText('Connecting…'))

    expect(onRetry).not.toHaveBeenCalled()
  })

  it('does not render forbidden stock neutral Tailwind classes', () => {
    const rendered = [
      render(<Chip state={{ kind: 'connecting' }} />).container.innerHTML,
      render(<Chip state={{ kind: 'live' }} />).container.innerHTML,
      render(<Chip state={{ kind: 'disconnected', error: 'offline' }} />).container.innerHTML,
      render(<Chip state={{ kind: 'unknown' }} />).container.innerHTML,
    ].join('\n')
    const sourceClasses = [
      'text-primary',
      'text-secondary',
      'text-muted',
      'bg-hover',
    ].join(' ')

    const forbiddenStockNeutralPattern = /\b(?:gray|slate|zinc)\b/

    expect(`${rendered}\n${sourceClasses}`).not.toMatch(forbiddenStockNeutralPattern)
  })

  it('exports the shared ChipSurface primitive for non-status badges', () => {
    render(<ChipSurface data-testid="custom-chip">Custom</ChipSurface>)

    const surface = screen.getByTestId('custom-chip')
    expect(surface.textContent).toBe('Custom')
    expect(surface.style.minHeight).toBe(`${chipSurfaceStyle.minHeight}px`)
    expect(surface.style.borderRadius).toBe(`${chipSurfaceStyle.borderRadius}px`)
  })
})
