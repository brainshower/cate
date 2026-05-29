import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

type ElectronApiMock = Pick<
  Window['electronAPI'],
  'flashquerySetConnection' | 'flashqueryProbe' | 'flashqueryGetConnectionSecret'
>

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
    flashqueryProbe: vi.fn().mockResolvedValue({ ok: true, version: '1.2.3', instanceId: 'instance-abcdef' }),
    flashqueryGetConnectionSecret: vi.fn().mockResolvedValue(null),
  }
}

function seedWorkspace(
  name = 'Workspace',
  flashqueryConnection?: { transport: 'http'; url: string },
) {
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
      flashqueryConnection,
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

  it('T-I-056 renders URL copy, helper text, placeholder, and associated invalid URL error', async () => {
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    const input = screen.getByLabelText('FlashQuery URL')
    expect(input.getAttribute('placeholder')).toBe('https://fq.example.com or http://localhost:3100')
    expect(screen.getByText("The HTTP base URL where FlashQuery's MCP server is listening.")).toBeTruthy()

    fireEvent.change(input, { target: { value: 'ftp://flashquery.local' } })
    fireEvent.blur(input)

    const error = await screen.findByText('Enter a valid http:// or https:// URL.')
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toContain(error.id)
  })

  it('T-I-057 and T-I-058 renders bearer token as password and toggles visibility with accessible labels', () => {
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    const tokenInput = screen.getByLabelText('Bearer token')
    expect(tokenInput.getAttribute('type')).toBe('password')
    expect(screen.getByText('A bearer token issued by FlashQuery. Stored locally with this workspace.')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Show bearer token'))
    expect(tokenInput.getAttribute('type')).toBe('text')
    expect(screen.getByLabelText('Hide bearer token')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Hide bearer token'))
    expect(tokenInput.getAttribute('type')).toBe('password')
  })

  it('T-I-060 and T-I-061 prepopulates edit mode from workspace URL/token and leaves setup mode empty', async () => {
    const api = makeElectronApi()
    api.flashqueryGetConnectionSecret.mockResolvedValueOnce('stored-token')
    setElectronApi(api)
    seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    const { rerender } = renderDialog()

    await waitFor(() => {
      expect(screen.getByLabelText('FlashQuery URL')).toHaveProperty('value', 'https://flashquery.local')
      expect(screen.getByLabelText('Bearer token')).toHaveProperty('value', 'stored-token')
    })
    expect(api.flashqueryGetConnectionSecret).toHaveBeenCalledWith(workspaceId)

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://unsaved.local' } })
    useUIStore.setState({ showFlashQueryConnectionDialog: false })
    rerender(<FlashQueryConnectionDialog />)

    seedWorkspace('Cate Workspace')
    useUIStore.setState({ showFlashQueryConnectionDialog: true })
    rerender(<FlashQueryConnectionDialog />)

    await waitFor(() => {
      expect(screen.getByLabelText('FlashQuery URL')).toHaveProperty('value', '')
      expect(screen.getByLabelText('Bearer token')).toHaveProperty('value', '')
    })
  })

  it('T-I-059 and T-I-062 through T-I-066 probes current form values without saving and renders live results', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'not-a-url' } })
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(await screen.findByText('Enter a valid http:// or https:// URL.')).toBeTruthy()
    expect(api.flashqueryProbe).not.toHaveBeenCalled()
    expect(api.flashquerySetConnection).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://flashquery.local' } })
    fireEvent.change(screen.getByLabelText('Bearer token'), { target: { value: 'current-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))

    expect(screen.getByText('Testing...')).toBeTruthy()
    await screen.findByText('Connected to FlashQuery v1.2.3 (instance instance)')
    const status = screen.getByText('Connected to FlashQuery v1.2.3 (instance instance)').closest('[aria-live]')
    expect(status?.getAttribute('aria-live')).toBe('polite')
    expect(api.flashqueryProbe).toHaveBeenCalledWith(workspaceId, {
      transport: 'http',
      url: 'https://flashquery.local',
      auth: { type: 'bearer', token: 'current-token' },
    })
    expect(api.flashquerySetConnection).not.toHaveBeenCalled()

    api.flashqueryProbe.mockResolvedValueOnce({ ok: false, error: 'Auth failed' })
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(screen.queryByText('Connected to FlashQuery v1.2.3 (instance instance)')).toBeNull()
    expect(await screen.findByText('Auth failed')).toBeTruthy()
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
