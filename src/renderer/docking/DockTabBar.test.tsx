import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/renderer/docking/DockTabBar.tsx'), 'utf8')

describe('DockTabBar vault badge wiring', () => {
  it('T-I-094 wires VaultBadge into editor tab title chrome from panel filePath', () => {
    expect(source).toContain("import { VaultBadge } from '../components/VaultBadge'")
    expect(source).toContain("panel?.type === 'editor'")
    expect(source).toContain('<VaultBadge filePath={panel.filePath} connectionUrl={connectionUrl} />')
  })

  it('T-I-096 keeps local editors on the same conditional path with no standalone badge fallback', () => {
    expect(source).not.toContain('rev 42')
    expect(source).not.toContain('version_token')
    expect(source).not.toContain('expected_version')
    expect(source).not.toContain('if_match')
    expect(source).not.toMatch(/conflict|stale/i)
  })
})
