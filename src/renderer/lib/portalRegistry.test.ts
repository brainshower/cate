// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { portalRegistry, type PortalWebview } from './portalRegistry'

function webviewWithId(webContentsId: number): PortalWebview {
  return {
    getWebContentsId: () => webContentsId,
    getURL: () => 'https://example.test',
    getTitle: () => 'Example',
    loadURL: vi.fn(),
  }
}

describe('portalRegistry bridge preservation', () => {
  afterEach(() => {
    portalRegistry.unregister('panel-1')
    delete (window as any).electronAPI
    vi.restoreAllMocks()
  })

  it('T-U-025 register sends alive true with panel and webContents ids when the bridge exists', () => {
    const orchRegisterPortalWc = vi.fn()
    ;(window as any).electronAPI = { orchRegisterPortalWc }

    portalRegistry.register('panel-1', webviewWithId(42))

    expect(orchRegisterPortalWc).toHaveBeenCalledWith({
      panelId: 'panel-1',
      webContentsId: 42,
      alive: true,
    })
  })

  it('T-U-026 unregister sends alive false and remains best-effort on bridge errors', () => {
    const orchRegisterPortalWc = vi.fn()
      .mockImplementationOnce(() => undefined)
      .mockImplementationOnce(() => {
        throw new Error('bridge unavailable')
      })
    ;(window as any).electronAPI = { orchRegisterPortalWc }

    expect(() => {
      portalRegistry.register('panel-1', webviewWithId(42))
      portalRegistry.unregister('panel-1')
    }).not.toThrow()

    expect(orchRegisterPortalWc).toHaveBeenNthCalledWith(2, {
      panelId: 'panel-1',
      webContentsId: 42,
      alive: false,
    })
    expect(portalRegistry.get('panel-1')).toBeNull()
  })

  it('register and unregister remain best-effort when the bridge is missing', () => {
    const webview = webviewWithId(42)

    expect(() => {
      portalRegistry.register('panel-1', webview)
      portalRegistry.unregister('panel-1')
    }).not.toThrow()

    expect(portalRegistry.get('panel-1')).toBeNull()
  })
})
