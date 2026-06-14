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

describe('Vault Search shared panel definition', () => {
  it('registers flashqueryVaultSearch as a panel type without casts', () => {
    const panelType: PanelType = 'flashqueryVaultSearch'

    expect(PANEL_DEFINITIONS[panelType].type).toBe('flashqueryVaultSearch')
  })

  it('uses the locked Vault Search identity and file-explorer-like sizing', () => {
    expect(PANEL_DEFINITIONS.flashqueryVaultSearch).toMatchObject({
      type: 'flashqueryVaultSearch',
      label: 'Vault Search',
      brandColor: '#5AD8B8',
      switcherColor: '#5AD8B8',
      mutedColor: '#4a9080',
      tintClass: 'text-teal-400',
      defaultSize: { width: 420, height: 560 },
      minimumSize: PANEL_DEFINITIONS.fileExplorer.minimumSize,
      canLiveOnCanvas: true,
    })
    expect(PANEL_CANVAS_DROP_SIZES.flashqueryVaultSearch).toEqual({ width: 360, height: 500 })
  })
})

describe('Document Outline shared panel definition', () => {
  it('T-U-001 registers outline as a panel type without casts', () => {
    const panelType: PanelType = 'outline'

    expect(PANEL_DEFINITIONS[panelType].type).toBe('outline')
  })

  it('T-U-002 locks Outline metadata, sizing, tint, ghost SVG, and canvas eligibility', () => {
    expect(PANEL_DEFINITIONS.outline).toMatchObject({
      type: 'outline',
      label: 'Outline',
      brandColor: '#4A9EFF',
      switcherColor: '#007AFF',
      mutedColor: '#4a7ab0',
      tintClass: 'text-sky-400',
      defaultSize: { width: 260, height: 500 },
      minimumSize: PANEL_DEFINITIONS.fileExplorer.minimumSize,
      canLiveOnCanvas: true,
    })
    expect(PANEL_DEFINITIONS.outline.defaultSize.width).toBeGreaterThanOrEqual(240)
    expect(PANEL_DEFINITIONS.outline.defaultSize.width).toBeLessThanOrEqual(300)
    expect(PANEL_DEFINITIONS.outline.minimumSize.width).toBeGreaterThanOrEqual(PANEL_DEFINITIONS.fileExplorer.minimumSize.width)
    expect(PANEL_DEFINITIONS.outline.ghostSvg).toContain('rgb(74,158,255)')
    expect(PANEL_DEFINITIONS.outline.ghostSvg).toContain('<line')
  })

  it('T-U-003 derives Outline canvas drop size from the shared panel table', () => {
    expect(PANEL_CANVAS_DROP_SIZES.outline).toEqual({ width: 260, height: 460 })
  })
})
