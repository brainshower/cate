import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(process.cwd(), 'src/renderer/shells/PanelWindowShell.tsx'), 'utf8')

describe('PanelWindowShell vault badge wiring', () => {
  it('renders VaultBadge in detached editor title chrome from displayPanel filePath', () => {
    expect(source).toContain("import { VaultBadge } from '../components/VaultBadge'")
    expect(source).toContain("import { FlashQueryEditorTitleActions } from '../components/FlashQueryEditorTitleActions'")
    expect(source).toContain("displayPanel.type === 'editor'")
    expect(source).toContain('<FlashQueryEditorTitleActions panel={displayPanel} workspaceId={workspaceId} compact />')
    expect(source).toContain('<VaultBadge filePath={displayPanel.filePath} connectionUrl={connectionUrl} />')
  })

  it('keeps detached shell badge copy free of revision, conflict, and version UI', () => {
    expect(source).not.toContain('rev 42')
    expect(source).not.toContain('version_token')
    expect(source).not.toContain('expected_version')
    expect(source).not.toContain('if_match')
    expect(source).not.toMatch(/conflict|stale/i)
  })
})
