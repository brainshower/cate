import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BrowserPanel from './BrowserPanel'
import { portalRegistry } from '../lib/portalRegistry'

const updatePanelTitle = vi.fn()
const updatePanelUrl = vi.fn()
const recordVisit = vi.fn()
const addBookmark = vi.fn()
const removeBookmark = vi.fn()
const refreshWorkspace = vi.fn()
let isBookmarked = false

vi.mock('../stores/settingsStore', () => ({
  useSettingsStore: (selector: (state: { browserHomepage: string; browserSearchEngine: 'google' }) => unknown) =>
    selector({ browserHomepage: 'about:blank', browserSearchEngine: 'google' }),
}))

vi.mock('../stores/appStore', () => ({
  useAppStore: (selector: (state: { updatePanelTitle: () => void; updatePanelUrl: () => void }) => unknown) =>
    selector({ updatePanelTitle, updatePanelUrl }),
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

vi.mock('../stores/browserStore', () => ({
  initializeBrowserStoreSubscriptions: vi.fn(),
  useBrowserStore: (selector: (state: {
    isBookmarked: (workspaceId: string, url: string) => boolean
    recordVisit: (workspaceId: string, url: string, title?: string) => Promise<unknown>
    addBookmark: (workspaceId: string, url: string, title?: string) => Promise<unknown>
    removeBookmark: (workspaceId: string, url: string) => Promise<unknown>
    refreshWorkspace: (workspaceId: string) => Promise<unknown>
  }) => unknown) => selector({
    isBookmarked: () => isBookmarked,
    recordVisit,
    addBookmark,
    removeBookmark,
    refreshWorkspace,
  }),
}))

beforeEach(() => {
  updatePanelTitle.mockClear()
  updatePanelUrl.mockClear()
  recordVisit.mockClear()
  addBookmark.mockClear()
  removeBookmark.mockClear()
  refreshWorkspace.mockClear()
  isBookmarked = false
})

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

describe('BrowserPanel load-error handling', () => {
  it('ignores subresource did-fail-load events', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="about:blank" />,
    )

    const webview = container.querySelector('webview')
    expect(webview).not.toBeNull()

    act(() => {
      webview?.dispatchEvent(Object.assign(new Event('did-fail-load'), {
        errorCode: -105,
        errorDescription: 'ERR_NAME_NOT_RESOLVED',
        isMainFrame: false,
      }))
    })

    expect(screen.queryByText('Failed to load page')).toBeNull()
  })

  it('shows the failed-load overlay for main-frame did-fail-load events', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="about:blank" />,
    )

    const webview = container.querySelector('webview')
    expect(webview).not.toBeNull()

    act(() => {
      webview?.dispatchEvent(Object.assign(new Event('did-fail-load'), {
        errorCode: -105,
        errorDescription: 'ERR_NAME_NOT_RESOLVED',
        isMainFrame: true,
      }))
    })

    expect(screen.getByText('Failed to load page')).toBeTruthy()
    expect(screen.getByText('ERR_NAME_NOT_RESOLVED')).toBeTruthy()
  })
})

describe('BrowserPanel portal registration', () => {
  it('registers the browser webview with portalRegistry on dom-ready', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="about:blank" />,
    )

    const webview = container.querySelector('webview')
    expect(webview).not.toBeNull()

    act(() => {
      webview?.dispatchEvent(new Event('dom-ready'))
    })

    expect(portalRegistry.register).toHaveBeenCalledWith('panel-1', webview)
  })
})

describe('BrowserPanel history and bookmark controls', () => {
  it('records visits for the panel workspace on navigation and title events', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="https://example.test/initial" />,
    )

    const webview = container.querySelector('webview') as any
    webview.getURL = () => 'https://example.test/current'
    webview.getTitle = () => 'Current Title'
    webview.canGoBack = () => false
    webview.canGoForward = () => false

    act(() => {
      webview.dispatchEvent(Object.assign(new Event('did-navigate'), {
        url: 'https://example.test/current',
      }))
      webview.dispatchEvent(Object.assign(new Event('page-title-updated'), {
        title: 'Current Title',
      }))
    })

    expect(recordVisit).toHaveBeenCalledWith('workspace-1', 'https://example.test/current', 'https://example.test/current')
    expect(recordVisit).toHaveBeenCalledWith('workspace-1', 'https://example.test/current', 'Current Title')
  })

  it('T-U-017 star toggle adds and removes bookmarks for the panel workspace', () => {
    const { rerender } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="https://example.test/page" />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Add bookmark' }))
    expect(addBookmark).toHaveBeenCalledWith('workspace-1', 'https://example.test/page', 'https://example.test/page')

    isBookmarked = true
    rerender(<BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="https://example.test/page" />)
    fireEvent.click(screen.getByRole('button', { name: 'Remove bookmark' }))

    expect(removeBookmark).toHaveBeenCalledWith('workspace-1', 'https://example.test/page')
  })
})
