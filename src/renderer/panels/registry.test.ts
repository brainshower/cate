import { describe, expect, it, vi } from 'vitest'
import { Vault } from '@phosphor-icons/react'

const createFlashQueryVault = vi.fn()

vi.mock('../stores/appStore', () => ({
  useAppStore: {
    getState: () => ({ createFlashQueryVault }),
  },
}))

describe('PANEL_REGISTRY flashqueryVault entry', () => {
  it('registers the FlashQuery Vault renderer metadata', async () => {
    const { PANEL_REGISTRY } = await import('./registry')

    expect(PANEL_REGISTRY.flashqueryVault.type).toBe('flashqueryVault')
    expect(PANEL_REGISTRY.flashqueryVault.label).toBe('FlashQuery Vault')
    expect(PANEL_REGISTRY.flashqueryVault.icon).toBe(Vault)
  })

  it('lazy-loads FlashQueryVaultPanel', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const lazyPayload = PANEL_REGISTRY.flashqueryVault.Component as unknown as {
      _payload: { _result: () => Promise<unknown> }
    }

    const module = await lazyPayload._payload._result()

    expect(module).toHaveProperty('default')
  })

  it('delegates creation to appStore.createFlashQueryVault with exact argument order', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    const canvasPoint = { x: 20, y: 30 }
    const placement = { target: 'canvas' as const, position: canvasPoint }
    createFlashQueryVault.mockReturnValueOnce('panel-1')

    expect(PANEL_REGISTRY.flashqueryVault.create({
      workspaceId: 'workspace-1',
      canvasPoint,
      placement,
    })).toBe('panel-1')

    expect(createFlashQueryVault).toHaveBeenCalledWith('workspace-1', canvasPoint, placement)
  })

  it('returns null when app-store creation fails', async () => {
    const { PANEL_REGISTRY } = await import('./registry')
    createFlashQueryVault.mockReturnValueOnce('')

    expect(PANEL_REGISTRY.flashqueryVault.create({ workspaceId: 'workspace-1' })).toBeNull()
  })
})
