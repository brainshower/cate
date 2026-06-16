// =============================================================================
// DockSplitContainer — flex container with children at specified ratios.
// Renders split layout nodes recursively.
// =============================================================================

import React, { useCallback, useRef } from 'react'
import type { DockSplitNode } from '../../shared/types'
import { useAppStore } from '../stores/appStore'
import { useDockStoreContext } from '../stores/DockStoreContext'
import DockResizeHandle from './DockResizeHandle'
import { resizeAdjacentSplitRatios } from './dockMinimumSize'

interface DockSplitContainerProps {
  node: DockSplitNode
  renderNode: (
    node: import('../../shared/types').DockLayoutNode,
    leftEdge: boolean,
    rightEdge: boolean,
  ) => React.ReactNode
  /** True if this split's left edge sits on the viewport's left edge. */
  leftEdge?: boolean
  /** True if this split's right edge sits on the viewport's right edge. */
  rightEdge?: boolean
}

export default function DockSplitContainer({
  node,
  renderNode,
  leftEdge = false,
  rightEdge = false,
}: DockSplitContainerProps) {
  const setSplitRatio = useDockStoreContext((s) => s.setSplitRatio)
  const panels = useAppStore((s) => {
    const workspaceId = s.selectedWorkspaceId
    return s.workspaces.find((workspace) => workspace.id === workspaceId)?.panels ?? {}
  })
  const isHorizontal = node.direction === 'horizontal'
  const containerRef = useRef<HTMLDivElement>(null)

  // Use a ref to avoid stale closure: the drag handler in DockResizeHandle
  // captures onResize at mousedown time, so node.ratios in a useCallback
  // dependency would go stale during the drag, causing wobble.
  const ratiosRef = useRef(node.ratios)
  ratiosRef.current = node.ratios

  const handleResize = useCallback(
    (index: number, delta: number) => {
      const container = containerRef.current
      if (!container) return
      const containerSize = isHorizontal ? container.offsetWidth : container.offsetHeight
      if (containerSize <= 0) return

      const currentRatios = ratiosRef.current
      const newRatios = resizeAdjacentSplitRatios(
        { ...node, ratios: currentRatios },
        index,
        delta,
        containerSize,
        panels,
      )

      setSplitRatio(node.id, newRatios)
    },
    [node, isHorizontal, panels, setSplitRatio],
  )

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full min-h-0 min-w-0 ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      {node.children.map((child, i) => {
        // Vertical splits stack top/bottom, so every child still touches the
        // viewport's left/right edges. Horizontal splits only let the first
        // child touch the left edge and the last touch the right edge.
        const childLeftEdge = isHorizontal ? leftEdge && i === 0 : leftEdge
        const childRightEdge = isHorizontal
          ? rightEdge && i === node.children.length - 1
          : rightEdge
        return (
        <React.Fragment key={child.type === 'tabs' ? child.id : child.id}>
          <div
            style={{
              [isHorizontal ? 'width' : 'height']: `${node.ratios[i] * 100}%`,
            }}
            className="min-h-0 min-w-0 overflow-hidden"
          >
            {renderNode(child, childLeftEdge, childRightEdge)}
          </div>
          {i < node.children.length - 1 && (
            <DockResizeHandle
              direction={isHorizontal ? 'horizontal' : 'vertical'}
              onResize={(delta) => handleResize(i, delta)}
            />
          )}
        </React.Fragment>
        )
      })}
    </div>
  )
}
