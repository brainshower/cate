// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { applyAppFontSize, clampAppFontSize } from './appFontSize'

describe('app font size scaling', () => {
  it('applies the app font size to the root element', () => {
    const root = document.createElement('html')

    applyAppFontSize(19, root)

    expect(root.style.fontSize).toBe('19px')
  })

  it('clamps invalid and extreme values to the supported range', () => {
    expect(clampAppFontSize(Number.NaN)).toBe(16)
    expect(clampAppFontSize(4)).toBe(12)
    expect(clampAppFontSize(99)).toBe(24)
    expect(clampAppFontSize(18.4)).toBe(18)
  })
})
