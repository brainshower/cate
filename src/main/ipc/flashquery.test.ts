import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_STATUS,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'

const handleMock = vi.fn()

vi.mock('electron', () => ({
  ipcMain: { handle: handleMock },
}))

describe('FlashQuery IPC handlers', () => {
  beforeEach(() => {
    vi.resetModules()
    handleMock.mockClear()
  })

  it('T-U-040 registers renderer-to-main FlashQuery invoke channels exactly once', async () => {
    const { registerHandlers } = await import('./flashquery')

    registerHandlers()

    expect(handleMock).toHaveBeenCalledTimes(4)
    expect(handleMock.mock.calls.map(([channel]) => channel)).toEqual([
      FLASHQUERY_SET_CONNECTION,
      FLASHQUERY_LIST_VAULT,
      FLASHQUERY_GET_DOCUMENT,
      FLASHQUERY_WRITE_DOCUMENT,
    ])
    expect(handleMock.mock.calls.map(([, handler]) => handler)).toEqual([
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
    ])
    expect(handleMock.mock.calls.map(([channel]) => channel)).not.toContain(FLASHQUERY_STATUS)
  })

  it('declares the exact Phase 3 FlashQuery channel strings', () => {
    expect(FLASHQUERY_SET_CONNECTION).toBe('flashquery:setConnection')
    expect(FLASHQUERY_LIST_VAULT).toBe('flashquery:listVault')
    expect(FLASHQUERY_GET_DOCUMENT).toBe('flashquery:getDocument')
    expect(FLASHQUERY_WRITE_DOCUMENT).toBe('flashquery:writeDocument')
    expect(FLASHQUERY_STATUS).toBe('flashquery:status')
  })
})
