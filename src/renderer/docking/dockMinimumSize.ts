import { PANEL_DEFINITIONS } from '../../shared/panels'
import type { DockLayoutNode, DockSplitNode, PanelState, Size } from '../../shared/types'

export type DockPanelLookup = Record<string, Pick<PanelState, 'type'> | undefined>

export function calculateEffectiveMinimumSize(
  node: DockLayoutNode,
  panels: DockPanelLookup,
): Size {
  if (node.type === 'tabs') {
    return node.panelIds.reduce<Size>((minimum, panelId) => {
      const panel = panels[panelId]
      if (!panel) return minimum
      const panelMinimum = PANEL_DEFINITIONS[panel.type].minimumSize
      return {
        width: Math.max(minimum.width, panelMinimum.width),
        height: Math.max(minimum.height, panelMinimum.height),
      }
    }, { width: 0, height: 0 })
  }

  const childMinimums = node.children.map((child) => calculateEffectiveMinimumSize(child, panels))
  if (node.direction === 'horizontal') {
    return {
      width: childMinimums.reduce((sum, minimum) => sum + minimum.width, 0),
      height: childMinimums.reduce((max, minimum) => Math.max(max, minimum.height), 0),
    }
  }

  return {
    width: childMinimums.reduce((max, minimum) => Math.max(max, minimum.width), 0),
    height: childMinimums.reduce((sum, minimum) => sum + minimum.height, 0),
  }
}

export function resizeAdjacentSplitRatios(
  node: DockSplitNode,
  index: number,
  delta: number,
  containerSize: number,
  panels: DockPanelLookup,
): number[] {
  if (containerSize <= 0) return node.ratios

  const currentRatios = node.ratios
  const a = currentRatios[index]
  const b = currentRatios[index + 1]
  if (a == null || b == null) return currentRatios

  const isHorizontal = node.direction === 'horizontal'
  const childAMinimum = calculateEffectiveMinimumSize(node.children[index], panels)
  const childBMinimum = calculateEffectiveMinimumSize(node.children[index + 1], panels)
  const childAMinimumPixels = isHorizontal ? childAMinimum.width : childAMinimum.height
  const childBMinimumPixels = isHorizontal ? childBMinimum.width : childBMinimum.height
  const minRatio = 0.1
  const minA = Math.max(minRatio, childAMinimumPixels / containerSize)
  const minB = Math.max(minRatio, childBMinimumPixels / containerSize)
  const pairTotal = a + b
  const lowerBound = Math.min(minA, pairTotal)
  const upperBound = Math.max(lowerBound, pairTotal - minB)
  const ratioDelta = delta / containerSize
  const nextA = Math.max(lowerBound, Math.min(upperBound, a + ratioDelta))
  const clampedDelta = nextA - a
  const newRatios = [...currentRatios]
  newRatios[index] = a + clampedDelta
  newRatios[index + 1] = b - clampedDelta
  return newRatios
}
