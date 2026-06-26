import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BrowserPanel from './BrowserPanel'

vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: { browserHomepage: string; browserSearchEngine: 'google' }) => unknown) =>
    selector({ browserHomepage: 'about:blank', browserSearchEngine: 'google' }),
}))

vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: { updatePanelTitle: () => void; updatePanelUrl: () => void }) => unknown) =>
    selector({ updatePanelTitle: vi.fn(), updatePanelUrl: vi.fn() }),
}))

vi.mock('../stores/CanvasStoreContext', () => ({
  useCanvasStoreContext: () => false,
}))

vi.mock('../lib/portalRegistry', () => ({
  portalRegistry: {
    register: vi.fn(),
    unregister: vi.fn(),
  },
}))

afterEach(() => {
  cleanup()
})

describe('BrowserPanel workspace partition mount', () => {
  it('uses the workspace-scoped durable partition for the webview', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="about:blank" />,
    )

    const webview = container.querySelector('webview')
    expect(webview).not.toBeNull()
    expect(webview?.getAttribute('partition')).toBe('persist:browser-ws-workspace-1')
    expect(webview?.getAttribute('partition')).not.toContain('panel-1')
  })

  it('T-U-029 fails closed and does not mount a webview when workspaceId is blank', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="   " nodeId="node-1" url="about:blank" />,
    )

    expect(container.querySelector('webview')).toBeNull()
    expect(screen.getByText('Browser workspace unavailable')).toBeTruthy()
  })
})
