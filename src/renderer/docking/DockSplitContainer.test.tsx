import { describe, expect, it } from 'vitest'
import type { DockLayoutNode, DockSplitNode, PanelState } from '../../shared/types'
import {
  calculateEffectiveMinimumSize,
  resizeAdjacentSplitRatios,
} from './dockMinimumSize'

const panel = (id: string, type: PanelState['type']): PanelState => ({
  id,
  type,
  title: id,
  isDirty: false,
})

const stack = (id: string, panelIds: string[]): DockLayoutNode => ({
  type: 'tabs',
  id,
  panelIds,
  activeIndex: 0,
})

const split = (
  id: string,
  direction: 'horizontal' | 'vertical',
  children: DockLayoutNode[],
  ratios: number[],
): DockSplitNode => ({
  type: 'split',
  id,
  direction,
  children,
  ratios,
})

describe('DockSplitContainer minimum-size calculations', () => {
  const panels: Record<string, PanelState> = {
    editor: panel('editor', 'editor'),
    git: panel('git', 'git'),
    browser: panel('browser', 'browser'),
    outline: panel('outline', 'outline'),
    connections: panel('connections', 'semantic-connections'),
    terminal: panel('terminal', 'terminal'),
  }

  it('T-U-013 derives a single tab stack minimum from its hosted panel definition', () => {
    expect(calculateEffectiveMinimumSize(stack('stack-1', ['connections']), panels)).toEqual({
      width: 330,
      height: 200,
    })
  })

  it('T-U-013 uses the maximum panel minimums for mixed tab stacks', () => {
    expect(calculateEffectiveMinimumSize(stack('stack-1', ['connections', 'browser', 'git']), panels)).toEqual({
      width: 400,
      height: 300,
    })
  })

  it('T-U-013 recursively aggregates nested split minimums by axis', () => {
    const nested = split('root', 'horizontal', [
      stack('left', ['connections']),
      split('right', 'vertical', [
        stack('top', ['browser']),
        stack('bottom', ['terminal']),
      ], [0.5, 0.5]),
    ], [0.4, 0.6])

    expect(calculateEffectiveMinimumSize(nested, panels)).toEqual({
      width: 730,
      height: 500,
    })
  })

  it('T-U-014 preserves adjacent-ratio transfer using the actual clamped pixel delta', () => {
    const layout = split('root', 'horizontal', [
      stack('left', ['connections']),
      stack('right', ['browser']),
    ], [0.5, 0.5])

    const ratios = resizeAdjacentSplitRatios(layout, 0, -300, 1000, panels)

    expect(ratios[0]).toBeCloseTo(0.33)
    expect(ratios[1]).toBeCloseTo(0.67)
  })

  it('T-I-027 prevents horizontal resize from shrinking Semantic Connections below 330px', () => {
    const layout = split('root', 'horizontal', [
      stack('left', ['connections']),
      stack('right', ['browser']),
    ], [0.5, 0.5])

    const ratios = resizeAdjacentSplitRatios(layout, 0, -500, 1000, panels)

    expect(ratios[0] * 1000).toBeCloseTo(330)
    expect(ratios[1] * 1000).toBeCloseTo(670)
  })

  it('T-I-028 enforces panel-specific minimum heights in vertical splits', () => {
    const layout = split('root', 'vertical', [
      stack('top', ['git']),
      stack('bottom', ['editor']),
    ], [0.6, 0.4])

    const ratios = resizeAdjacentSplitRatios(layout, 0, 400, 900, panels)

    expect(ratios[0] * 900).toBe(650)
    expect(ratios[1] * 900).toBe(250)
  })

  it('T-I-029 enforces nested descendant minimums while resizing adjacent children', () => {
    const layout = split('root', 'horizontal', [
      split('left', 'vertical', [
        stack('left-top', ['connections']),
        stack('left-bottom', ['git']),
      ], [0.5, 0.5]),
      stack('right', ['browser']),
    ], [0.55, 0.45])

    const ratios = resizeAdjacentSplitRatios(layout, 0, -500, 1200, panels)

    expect(ratios[0] * 1200).toBe(350)
    expect(ratios[1] * 1200).toBe(850)
  })
})
