import { beforeEach, describe, expect, it } from 'vitest'
import { useUIStore } from './uiStore'

describe('useUIStore FlashQuery connection dialog state', () => {
  beforeEach(() => {
    useUIStore.getState().setShowFlashQueryConnectionDialog(false)
  })

  it('defaults the FlashQuery connection dialog to closed', () => {
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)
  })

  it('opens and closes the FlashQuery connection dialog state', () => {
    useUIStore.getState().setShowFlashQueryConnectionDialog(true)
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)

    useUIStore.getState().setShowFlashQueryConnectionDialog(false)
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)
  })

  it('can target a workspace without changing the selected workspace', () => {
    useUIStore.getState().setShowFlashQueryConnectionDialog(true, 'workspace-2')

    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
    expect(useUIStore.getState().flashqueryConnectionDialogWorkspaceId).toBe('workspace-2')

    useUIStore.getState().setShowFlashQueryConnectionDialog(false)
    expect(useUIStore.getState().flashqueryConnectionDialogWorkspaceId).toBeNull()
  })
})
