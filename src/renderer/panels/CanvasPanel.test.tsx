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
})
