// @vitest-environment jsdom
import React from 'react'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NodeResizeOverlay } from './NodeResizeOverlay'

afterEach(() => cleanup())

describe('NodeResizeOverlay geometry', () => {
  it('keeps top corner hotspots outside the node interior so titlebar controls remain clickable', () => {
    const { container } = render(<NodeResizeOverlay onResizeStart={vi.fn()} />)

    const topRight = container.querySelector<HTMLElement>('[data-resize-overlay="topRight"]')
    const topLeft = container.querySelector<HTMLElement>('[data-resize-overlay="topLeft"]')

    expect(topRight?.style.top).toBe('-8px')
    expect(topRight?.style.height).toBe('8px')
    expect(topLeft?.style.top).toBe('-8px')
    expect(topLeft?.style.height).toBe('8px')
  })
})
