import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/logger', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

import { FlashQueryConnectionDialog } from './FlashQueryConnectionDialog'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'

type ElectronApiMock = Pick<Window['electronAPI'], 'flashquerySetConnection'>

const workspaceId = 'workspace-1'

function setElectronApi(api: ElectronApiMock) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api,
  })
}

function makeElectronApi(): ElectronApiMock {
  return {
    flashquerySetConnection: vi.fn().mockResolvedValue(undefined),
  }
}

function seedWorkspace(name = 'Workspace') {
  useAppStore.setState({
    selectedWorkspaceId: workspaceId,
    workspaces: [{
      id: workspaceId,
      name,
      color: '#5AD8B8',
      rootPath: '/workspace',
      panels: {},
      canvasNodes: {},
      regions: {},
      zoomLevel: 1,
      viewportOffset: { x: 0, y: 0 },
      focusedNodeId: null,
    }],
  })
}

function renderDialog() {
  return render(<FlashQueryConnectionDialog />)
}

beforeEach(() => {
  setElectronApi(makeElectronApi())
  seedWorkspace()
  useUIStore.setState({ showFlashQueryConnectionDialog: false })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FlashQueryConnectionDialog shell', () => {
  it('renders nothing while closed', () => {
    const { container } = renderDialog()

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(container.firstChild).toBeNull()
  })

  it('renders accessible title, workspace subtitle, close control, and URL focus target while open', () => {
    seedWorkspace('Cate Workspace')
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    const dialog = screen.getByRole('dialog', { name: 'FlashQuery Connection' })
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('FlashQuery Connection')).toBeTruthy()
    expect(screen.getByText('For workspace: Cate Workspace')).toBeTruthy()
    expect(screen.getByLabelText('Close FlashQuery connection dialog')).toBeTruthy()
    expect(screen.getByLabelText('FlashQuery URL')).toBe(document.activeElement)
  })

  it('closes with Escape, overlay click, and close button without calling FlashQuery IPC', () => {
    const api = makeElectronApi()
    setElectronApi(api)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    const { rerender } = renderDialog()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)

    useUIStore.setState({ showFlashQueryConnectionDialog: true })
    rerender(<FlashQueryConnectionDialog />)
    fireEvent.click(screen.getByTestId('flashquery-connection-overlay'))
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)

    useUIStore.setState({ showFlashQueryConnectionDialog: true })
    rerender(<FlashQueryConnectionDialog />)
    fireEvent.click(screen.getByLabelText('Close FlashQuery connection dialog'))
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)

    expect(api.flashquerySetConnection).not.toHaveBeenCalled()
  })

  it('keeps Tab and Shift+Tab focus inside the dialog controls', () => {
    useUIStore.setState({ showFlashQueryConnectionDialog: true })
    renderDialog()

    const urlInput = screen.getByLabelText('FlashQuery URL')
    const closeButton = screen.getByLabelText('Close FlashQuery connection dialog')

    closeButton.focus()
    fireEvent.keyDown(closeButton, { key: 'Tab' })
    expect(document.activeElement).toBe(urlInput)

    fireEvent.keyDown(urlInput, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(closeButton)
  })

  it('does not render stock neutral Tailwind color classes', () => {
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    const { container } = renderDialog()

    expect(container.innerHTML).not.toMatch(/\b(?:text|bg|border)-(?:zinc|gray|slate)-/)
  })
})
