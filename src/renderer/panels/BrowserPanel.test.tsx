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
const onBrowserShortcut = vi.fn()
let browserShortcutCallbacks: Array<(action: unknown) => void> = []
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
    bookmarksForWorkspace: (workspaceId: string) => unknown[]
  }) => unknown) => selector({
    isBookmarked: () => isBookmarked,
    recordVisit,
    addBookmark,
    removeBookmark,
    refreshWorkspace,
    bookmarksForWorkspace: () => [],
  }),
}))

beforeEach(() => {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: {
      onBrowserShortcut,
      webviewScreenshot: vi.fn(),
      nativeFileDrag: vi.fn(),
    },
  })
  updatePanelTitle.mockClear()
  updatePanelUrl.mockClear()
  recordVisit.mockClear()
  addBookmark.mockClear()
  removeBookmark.mockClear()
  refreshWorkspace.mockClear()
  onBrowserShortcut.mockReset()
  browserShortcutCallbacks = []
  onBrowserShortcut.mockImplementation((callback: (action: unknown) => void) => {
    browserShortcutCallbacks.push(callback)
    return () => {
      browserShortcutCallbacks = browserShortcutCallbacks.filter((registered) => registered !== callback)
    }
  })
  isBookmarked = false
})

afterEach(() => {
  cleanup()
  delete (window as unknown as { electronAPI?: unknown }).electronAPI
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

describe('BrowserPanel crash recovery', () => {
  it('T-U-012 shows a distinct crash overlay for non-clean render-process-gone events', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="about:blank" />,
    )

    const webview = container.querySelector('webview')
    expect(webview).not.toBeNull()

    act(() => {
      webview?.dispatchEvent(Object.assign(new Event('render-process-gone'), {
        reason: 'crashed',
      }))
    })

    expect(screen.getByText('Page crashed')).toBeTruthy()
    expect(screen.getByText('The browser page stopped unexpectedly.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy()
    expect(screen.queryByText('Failed to load page')).toBeNull()
  })

  it('T-U-013 ignores clean render-process-gone exits', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="about:blank" />,
    )

    const webview = container.querySelector('webview')
    expect(webview).not.toBeNull()

    act(() => {
      webview?.dispatchEvent(Object.assign(new Event('render-process-gone'), {
        reason: 'clean-exit',
      }))
    })

    expect(screen.queryByText('Page crashed')).toBeNull()
  })

  it('clears the crash overlay before reloading', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="about:blank" />,
    )

    const webview = container.querySelector('webview') as (Element & { reload?: () => void }) | null
    const reload = vi.fn()
    Object.assign(webview ?? {}, { reload })

    act(() => {
      webview?.dispatchEvent(Object.assign(new Event('crashed'), {
        reason: 'oom',
      }))
    })

    fireEvent.click(screen.getByRole('button', { name: 'Reload page' }))

    expect(reload).toHaveBeenCalled()
    expect(screen.queryByText('Page crashed')).toBeNull()
  })
})

describe('BrowserPanel browser shortcut handling', () => {
  it('T-U-016 maps forwarded commands to browser actions only for the focused owning webview', () => {
    const { container } = render(
      <>
        <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="https://example.test/one" />
        <BrowserPanel panelId="panel-2" workspaceId="workspace-1" nodeId="node-2" url="https://example.test/two" />
      </>,
    )

    const webviews = container.querySelectorAll('webview') as NodeListOf<Element & {
      reload?: () => void
      goBack?: () => void
      goForward?: () => void
    }>
    const first = webviews[0]
    const second = webviews[1]
    const firstReload = vi.fn()
    const firstBack = vi.fn()
    const firstForward = vi.fn()
    const secondReload = vi.fn()
    Object.assign(first, { reload: firstReload, goBack: firstBack, goForward: firstForward })
    Object.assign(second, { reload: secondReload })

    const inputs = screen.getAllByPlaceholderText('Enter URL or search...')
    const firstInput = inputs[0] as HTMLInputElement

    act(() => {
      first.dispatchEvent(new Event('focus'))
      for (const callback of browserShortcutCallbacks) callback('reload')
      for (const callback of browserShortcutCallbacks) callback('back')
      for (const callback of browserShortcutCallbacks) callback('forward')
      for (const callback of browserShortcutCallbacks) callback('focus-url')
    })

    expect(firstReload).toHaveBeenCalledTimes(1)
    expect(firstBack).toHaveBeenCalledTimes(1)
    expect(firstForward).toHaveBeenCalledTimes(1)
    expect(secondReload).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(firstInput)
    expect(firstInput.selectionStart).toBe(0)
    expect(firstInput.selectionEnd).toBe(firstInput.value.length)
  })

  it('ignores unsupported forwarded browser commands', () => {
    const { container } = render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="https://example.test/one" />,
    )

    const webview = container.querySelector('webview') as Element & { reload?: () => void }
    const reload = vi.fn()
    Object.assign(webview, { reload })

    act(() => {
      webview.dispatchEvent(new Event('focus'))
      for (const callback of browserShortcutCallbacks) callback('new-tab')
      for (const callback of browserShortcutCallbacks) callback('close-tab')
    })

    expect(reload).not.toHaveBeenCalled()
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

describe('BrowserPanel menu integration', () => {
  it('shows the browser menu without removing navigation, screenshot, star, or bookmarks behavior', () => {
    render(
      <BrowserPanel panelId="panel-1" workspaceId="workspace-1" nodeId="node-1" url="https://example.test/page" />,
    )

    expect(screen.getByRole('button', { name: 'Back' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Forward' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add bookmark' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Screenshot' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Browser menu' })).toBeTruthy()
  })
})
