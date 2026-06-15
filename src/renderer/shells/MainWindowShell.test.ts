import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('MainWindowShell global dock geometry', () => {
  it('keeps the docked right sidebar beside the editor and outside the Cate right toolbar', () => {
    const shellSource = readFileSync('src/renderer/shells/MainWindowShell.tsx', 'utf8')

    expect(shellSource).toContain('viewportRightEdge={!rightVisible}')
    expect(shellSource).toContain("marginRight: 'var(--cate-right-sidebar-width, 0px)'")
    expect(shellSource).toContain('viewportLeftEdge={false}')
    expect(shellSource).toContain('viewportRightEdge')
  })
})
