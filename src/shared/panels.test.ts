import { describe, expect, it } from 'vitest'
import { PANEL_CANVAS_DROP_SIZES, type PanelType } from './types'
import { PANEL_DEFINITIONS } from './panels'

describe('FlashQuery Vault shared panel definition', () => {
  it('registers flashqueryVault as a panel type without casts', () => {
    const panelType: PanelType = 'flashqueryVault'

    expect(PANEL_DEFINITIONS[panelType].type).toBe('flashqueryVault')
  })

  it('uses the locked FlashQuery Vault identity fields', () => {
    expect(PANEL_DEFINITIONS.flashqueryVault).toMatchObject({
      type: 'flashqueryVault',
      label: 'FlashQuery Vault',
      brandColor: '#5AD8B8',
      switcherColor: '#5AD8B8',
      mutedColor: '#4a9080',
      tintClass: 'text-teal-400',
      canLiveOnCanvas: true,
    })
  })

  it('uses file-explorer-like sizing with the product default width', () => {
    expect(PANEL_DEFINITIONS.flashqueryVault.defaultSize).toEqual({ width: 320, height: 500 })
    expect(PANEL_DEFINITIONS.flashqueryVault.minimumSize).toEqual(PANEL_DEFINITIONS.fileExplorer.minimumSize)
    expect(PANEL_CANVAS_DROP_SIZES.flashqueryVault).toEqual({ width: 280, height: 440 })
  })

  it('provides a teal vault-themed ghost SVG', () => {
    expect(PANEL_DEFINITIONS.flashqueryVault.ghostSvg).toContain('rgb(90,216,184)')
    expect(PANEL_DEFINITIONS.flashqueryVault.ghostSvg).toContain('<path')
  })
})
