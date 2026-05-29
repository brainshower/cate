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

type ElectronApiMock = {
  flashquerySetConnection: ReturnType<typeof vi.fn>
  flashqueryProbe: ReturnType<typeof vi.fn>
}

const workspaceId = 'workspace-1'
const setupTokenHelper = 'A bearer token issued by FlashQuery. Stored locally with this workspace.'
const editTokenHelper = 'A bearer token is already stored for this workspace. Leave this field blank to keep it, or enter a new value to replace it. Use "Remove connection" to clear it entirely.'

function setElectronApi(api: ElectronApiMock) {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    value: api as unknown as Window['electronAPI'],
  })
}

function makeElectronApi(): ElectronApiMock {
  return {
    flashquerySetConnection: vi.fn().mockResolvedValue(undefined),
    flashqueryProbe: vi.fn().mockResolvedValue({ ok: true, version: '1.2.3', instanceId: 'instance-abcdef' }),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function seedWorkspace(
  name = 'Workspace',
  flashqueryConnection?: { transport: 'http'; url: string },
  id = workspaceId,
) {
  useAppStore.setState({
    selectedWorkspaceId: workspaceId,
    workspaces: [{
      id,
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
  useUIStore.setState({
    showFlashQueryConnectionDialog: false,
    flashqueryConnectionDialogWorkspaceId: null,
  })
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
    expect(screen.getByText(setupTokenHelper)).toBeTruthy()
    expect(screen.queryByText(editTokenHelper)).toBeNull()

    fireEvent.click(screen.getByLabelText('Show bearer token'))
    expect(tokenInput.getAttribute('type')).toBe('text')
    expect(screen.getByLabelText('Hide bearer token')).toBeTruthy()

    fireEvent.click(screen.getByLabelText('Hide bearer token'))
    expect(tokenInput.getAttribute('type')).toBe('password')
  })

  it('renders edit-mode token disclosure and binds it to the token input', () => {
    seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    const tokenInput = screen.getByLabelText('Bearer token')
    const helper = screen.getByText(editTokenHelper)

    expect(helper).toBeTruthy()
    expect(screen.queryByText(setupTokenHelper)).toBeNull()
    expect(helper.id).toBe('flashquery-token-helper')
    expect(tokenInput.getAttribute('aria-describedby')).toBe(helper.id)
  })

  it('T-I-060 and T-I-061 prepopulates edit mode URL without sending the token back to renderer', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    const { rerender } = renderDialog()

    await waitFor(() => {
      expect(screen.getByLabelText('FlashQuery URL')).toHaveProperty('value', 'https://flashquery.local')
      expect(screen.getByLabelText('Bearer token')).toHaveProperty('value', '')
    })
    expect('flashqueryGetConnectionSecret' in api).toBe(false)

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

  it('ignores late probe results after the form changes', async () => {
    const api = makeElectronApi()
    const pendingProbe = deferred<{ ok: true; version: string; instanceId: string }>()
    api.flashqueryProbe.mockReturnValueOnce(pendingProbe.promise)
    setElectronApi(api)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://old.flashquery.local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))
    expect(screen.getByText('Testing...')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://new.flashquery.local' } })
    pendingProbe.resolve({ ok: true, version: '9.9.9', instanceId: 'stale-instance' })

    await waitFor(() => {
      expect(screen.queryByText('Testing...')).toBeNull()
      expect(screen.queryByText('Connected to FlashQuery v9.9.9 (instance stale-in)')).toBeNull()
    })
  })

  it('T-I-067 saves the current values through setConnection and closes on success', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://flashquery.local' } })
    fireEvent.change(screen.getByLabelText('Bearer token'), { target: { value: 'save-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(api.flashquerySetConnection).toHaveBeenCalledWith(workspaceId, {
        transport: 'http',
        url: 'https://flashquery.local',
        auth: { type: 'bearer', token: 'save-token' },
      })
      expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)
    })
  })

  it('leaves the existing edit-mode token unchanged when saving a blank token field', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    expect(screen.getByText(editTokenHelper)).toBeTruthy()
    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://new.flashquery.local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(api.flashquerySetConnection).toHaveBeenCalledWith(workspaceId, {
        transport: 'http',
        url: 'https://new.flashquery.local',
        preserveExistingToken: true,
      })
    })
  })

  it('omits auth when saving a whitespace-only bearer token', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://flashquery.local' } })
    fireEvent.change(screen.getByLabelText('Bearer token'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(api.flashquerySetConnection).toHaveBeenCalledWith(workspaceId, {
        transport: 'http',
        url: 'https://flashquery.local',
      })
    })
  })

  it('renders Phosphor leading icons for Test connection and Remove connection controls', () => {
    seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    expect(screen.getByRole('button', { name: 'Test connection' }).querySelector('svg')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Remove connection' }).querySelector('svg')).toBeTruthy()
  })

  it('T-I-068 and T-I-069 blocks invalid saves and keeps save failures open with a one-line error', async () => {
    const api = makeElectronApi()
    api.flashquerySetConnection.mockRejectedValueOnce(new Error('Token rejected\nsecret-token'))
    setElectronApi(api)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    renderDialog()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'ftp://flashquery.local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Enter a valid http:// or https:// URL.')).toBeTruthy()
    expect(api.flashquerySetConnection).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://flashquery.local' } })
    fireEvent.change(screen.getByLabelText('Bearer token'), { target: { value: 'secret-token' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Token rejected')).toBeTruthy()
    expect(screen.queryByText('secret-token')).toBeNull()
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(true)
  })

  it('T-I-070 cancel closes without write IPC and discards local edits on reopen', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    const { rerender } = renderDialog()

    fireEvent.change(screen.getByLabelText('FlashQuery URL'), { target: { value: 'https://unsaved.local' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)
    expect(api.flashquerySetConnection).not.toHaveBeenCalled()

    useUIStore.setState({ showFlashQueryConnectionDialog: true })
    rerender(<FlashQueryConnectionDialog />)

    await waitFor(() => {
      expect(screen.getByLabelText('FlashQuery URL')).toHaveProperty('value', 'https://flashquery.local')
    })
  })

  it('T-I-071 through T-I-074 handles disabled remove, confirmation, yes/no, and reset on reopen', async () => {
    const api = makeElectronApi()
    setElectronApi(api)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })

    const { rerender } = renderDialog()

    const disabledRemove = screen.getByRole('button', { name: 'Remove connection' })
    expect(disabledRemove).toHaveProperty('disabled', true)
    expect(disabledRemove.getAttribute('title')).toBe('Currently no connection to remove.')

    seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
    useUIStore.setState({ showFlashQueryConnectionDialog: false })
    rerender(<FlashQueryConnectionDialog />)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })
    rerender(<FlashQueryConnectionDialog />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remove connection' }))
    expect(screen.getByText('Really remove?')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText('Really remove?')).toBeNull()
    expect(api.flashquerySetConnection).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Remove connection' }))
    useUIStore.setState({ showFlashQueryConnectionDialog: false })
    rerender(<FlashQueryConnectionDialog />)
    useUIStore.setState({ showFlashQueryConnectionDialog: true })
    rerender(<FlashQueryConnectionDialog />)
    expect(screen.queryByText('Really remove?')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Remove connection' }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))

    await waitFor(() => {
      expect(api.flashquerySetConnection).toHaveBeenCalledWith(workspaceId, null)
      expect(useUIStore.getState().showFlashQueryConnectionDialog).toBe(false)
    })
  })

  it('auto-dismisses the remove confirmation after roughly three seconds', async () => {
    vi.useFakeTimers()
    try {
      seedWorkspace('Cate Workspace', { transport: 'http', url: 'https://flashquery.local' })
      useUIStore.setState({ showFlashQueryConnectionDialog: true })

      renderDialog()

      fireEvent.click(screen.getByRole('button', { name: 'Remove connection' }))
      expect(screen.getByText('Really remove?')).toBeTruthy()

      await vi.advanceTimersByTimeAsync(2900)
      expect(screen.getByText('Really remove?')).toBeTruthy()

      await vi.advanceTimersByTimeAsync(100)
      expect(screen.queryByText('Really remove?')).toBeNull()
      expect(screen.getByRole('button', { name: 'Remove connection' })).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('targets an explicitly opened workspace instead of the selected workspace', () => {
    useAppStore.setState({
      selectedWorkspaceId: workspaceId,
      workspaces: [
        {
          id: workspaceId,
          name: 'Selected Workspace',
          color: '#5AD8B8',
          rootPath: '/selected',
          panels: {},
          canvasNodes: {},
          regions: {},
          zoomLevel: 1,
          viewportOffset: { x: 0, y: 0 },
          focusedNodeId: null,
          flashqueryConnection: { transport: 'http', url: 'https://selected.flashquery.local' },
        },
        {
          id: 'workspace-2',
          name: 'Target Workspace',
          color: '#5AD8B8',
          rootPath: '/target',
          panels: {},
          canvasNodes: {},
          regions: {},
          zoomLevel: 1,
          viewportOffset: { x: 0, y: 0 },
          focusedNodeId: null,
          flashqueryConnection: { transport: 'http', url: 'https://target.flashquery.local' },
        },
      ],
    })
    useUIStore.getState().setShowFlashQueryConnectionDialog(true, 'workspace-2')

    renderDialog()

    expect(screen.getByText('For workspace: Target Workspace')).toBeTruthy()
    expect(screen.getByLabelText('FlashQuery URL')).toHaveProperty('value', 'https://target.flashquery.local')
    expect(useAppStore.getState().selectedWorkspaceId).toBe(workspaceId)
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
