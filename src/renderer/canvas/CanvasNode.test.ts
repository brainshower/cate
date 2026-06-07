import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('CanvasNode inactive chrome CSS', () => {
  it('does not disable every tab-bar button because FlashQuery title actions live there', () => {
    const source = readFileSync(new URL('./CanvasNode.tsx', import.meta.url), 'utf8')

    expect(source).not.toContain('[data-node-id][data-node-active="false"] .dock-tab-bar button')
    expect(source).toContain('[data-node-id][data-node-active="false"] .dock-tab-bar [data-node-chrome-button]')
    expect(source).toContain('[data-node-id][data-node-active="false"] .dock-tab-bar [data-node-chrome-controls]')
    expect(source).toContain('[data-node-id][data-node-active="false"] .dock-tab-bar [data-tab-close-button]')
  })
})
