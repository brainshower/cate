import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('CanvasPanel node dock registry lifecycle', () => {
  it('registers the per-node dock store in an effect setup so dev StrictMode cleanup does not orphan visible nodes', () => {
    const source = readFileSync('src/renderer/panels/CanvasPanel.tsx', 'utf8')
    const memoStart = source.indexOf('const dockStoreApi = useMemo')
    const effectStart = source.indexOf('useEffect(() => {\n    registerNodeDockStore')

    expect(memoStart).toBeGreaterThanOrEqual(0)
    expect(effectStart).toBeGreaterThan(memoStart)

    const memoBlock = source.slice(memoStart, effectStart)
    const lifecycleBlock = source.slice(effectStart, source.indexOf('// ------------------------------------------------------------------', effectStart))

    expect(memoBlock).not.toContain('registerNodeDockStore(')
    expect(lifecycleBlock).toContain('registerNodeDockStore(canvasPanelId, nodeId, dockStoreApi)')
    expect(lifecycleBlock).toContain('unregisterNodeDockStore(canvasPanelId, nodeId)')
  })

  it('keeps canvas-node dock stacks width-contained so child panel controls cannot overflow', () => {
    const dockStackSource = readFileSync('src/renderer/docking/DockTabStack.tsx', 'utf8')
    const rootClass = 'className="flex flex-col h-full w-full min-h-0 min-w-0 overflow-hidden relative"'
    const contentClass = 'className="flex-1 min-h-0 min-w-0 w-full overflow-hidden"'

    expect(dockStackSource).toContain(rootClass)
    expect(dockStackSource).toContain(contentClass)
  })

  it('reserves real width for global sidebars on center-edge dock stacks', () => {
    const dockStackSource = readFileSync('src/renderer/docking/DockTabStack.tsx', 'utf8')
    const dockZoneSource = readFileSync('src/renderer/docking/DockZone.tsx', 'utf8')

    expect(dockStackSource).toContain('function getCenterEdgeStyle')
    expect(dockStackSource).toContain('width: `calc(100% - ${leftInset} - ${rightInset})`')
    expect(dockStackSource).toContain("rightEdge ? 'var(--cate-right-sidebar-width, 0px)' : '0px'")
    expect(dockStackSource).toContain("style={centerContentEdgeStyle}")
    expect(dockZoneSource).toContain('viewportLeftEdge = true')
    expect(dockZoneSource).toContain('viewportRightEdge = true')
    expect(dockZoneSource).toContain('renderNode(zone.layout, viewportLeftEdge, viewportRightEdge)')
  })
})
