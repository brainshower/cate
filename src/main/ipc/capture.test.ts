import { beforeEach, describe, expect, test, vi } from 'vitest'
import {
  CAPTURE_PAGE,
  NATIVE_FILE_DRAG,
  WEBVIEW_SCREENSHOT,
} from '../../shared/ipc-channels'

const handlers = new Map<string, (...args: unknown[]) => unknown>()
const writeFile = vi.fn()
const appGetPath = vi.fn()
const browserWindowFromWebContents = vi.fn()
const webContentsFromId = vi.fn()
const nativeImageCreateFromPath = vi.fn()
const nativeImageCreateEmpty = vi.fn()
const logWarn = vi.fn()

vi.mock('electron', () => ({
  app: {
    getPath: appGetPath,
  },
  BrowserWindow: {
    fromWebContents: browserWindowFromWebContents,
  },
  ipcMain: {
    handle: (channel: string, fn: (...args: unknown[]) => unknown) => {
      handlers.set(channel, fn)
    },
  },
  nativeImage: {
    createFromPath: nativeImageCreateFromPath,
    createEmpty: nativeImageCreateEmpty,
  },
  webContents: {
    fromId: webContentsFromId,
  },
}))

vi.mock('fs', () => ({
  default: {
    promises: {
      writeFile,
    },
  },
}))

vi.mock('../logger', () => ({
  default: {
    error: vi.fn(),
    warn: logWarn,
  },
}))

vi.mock('./pathValidation', () => ({
  validatePath: (filePath: string) => filePath,
}))

const { registerCaptureHandlers } = await import('./capture')

describe('registerCaptureHandlers', () => {
  beforeEach(() => {
    handlers.clear()
    vi.clearAllMocks()
    appGetPath.mockReturnValue('/Users/cate/Desktop')
  })

  test('T-I-004 authorized webview screenshot writes PNG and returns filePath/dataUrl', async () => {
    registerCaptureHandlers()
    const screenshot = handlers.get(WEBVIEW_SCREENSHOT)
    expect(screenshot).toBeDefined()

    const sender = { id: 10 }
    const callerWin = { id: 1, isDestroyed: () => false }
    const image = {
      isEmpty: () => false,
      toPNG: vi.fn(() => Buffer.from('png')),
      toDataURL: vi.fn(() => 'data:image/png;base64,cate'),
    }
    const target = {
      id: 20,
      isDestroyed: () => false,
      hostWebContents: sender,
      capturePage: vi.fn(async () => image),
    }

    browserWindowFromWebContents.mockImplementation((wc: unknown) => {
      if (wc === sender) return callerWin
      return null
    })
    webContentsFromId.mockReturnValue(target)

    const result = await screenshot!({ sender }, 20)

    expect(target.capturePage).toHaveBeenCalledTimes(1)
    expect(writeFile).toHaveBeenCalledTimes(1)
    const [filePath, png] = writeFile.mock.calls[0]
    expect(filePath).toMatch(/^\/Users\/cate\/Desktop\/screenshot-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.png$/)
    expect(png).toEqual(Buffer.from('png'))
    expect(result).toEqual({ filePath, dataUrl: 'data:image/png;base64,cate' })
  })

  test('T-I-005 unauthorized webContentsId is denied without capture', async () => {
    registerCaptureHandlers()
    const screenshot = handlers.get(WEBVIEW_SCREENSHOT)
    expect(screenshot).toBeDefined()

    const sender = { id: 10 }
    const callerWin = { id: 1, isDestroyed: () => false }
    const targetWin = { id: 2, isDestroyed: () => false }
    const target = {
      id: 20,
      isDestroyed: () => false,
      hostWebContents: { id: 99 },
      capturePage: vi.fn(),
    }

    browserWindowFromWebContents.mockImplementation((wc: unknown) => {
      if (wc === sender) return callerWin
      if (wc === target) return targetWin
      return null
    })
    webContentsFromId.mockReturnValue(target)

    const result = await screenshot!({ sender }, 20)

    expect(result).toBeNull()
    expect(target.capturePage).not.toHaveBeenCalled()
    expect(writeFile).not.toHaveBeenCalled()
    expect(logWarn).toHaveBeenCalledWith(expect.stringContaining('Denied'))
  })

  test('T-I-006 registration does not include proxy or extraction handlers', () => {
    registerCaptureHandlers()

    expect([...handlers.keys()].sort()).toEqual([
      CAPTURE_PAGE,
      NATIVE_FILE_DRAG,
      WEBVIEW_SCREENSHOT,
    ].sort())
    expect([...handlers.keys()].join('\n')).not.toMatch(/proxy|extract|readability|turndown|pdf|docx|cate_browser|vault/i)
  })
})
