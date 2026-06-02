// =============================================================================
// Test setup — runs before every .test.tsx / .test.ts under this config.
// Installs a permissive electronAPI stub so the drag dispatcher can call
// crossWindowDragStart / dragDetach / etc. without exploding. Tests that care
// about specific calls should spy on the relevant method via vi.spyOn(window.electronAPI, ...).
// =============================================================================

import { beforeEach, vi } from 'vitest'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// jsdom doesn't implement getBoundingClientRect layout. The harness assigns
// rects manually via setBoundingClientRectFor() in harness.tsx, but elements
// that don't have an explicit rect should at least return a zeroed object.
if (typeof window !== 'undefined') {
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    configurable: true,
    value: vi.fn(() => ({
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      drawImage: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 0 })),
    })),
  })

  if (!HTMLElement.prototype.getBoundingClientRect) {
    HTMLElement.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON() { return {} } } as DOMRect
    }
  }

  // jsdom lacks elementFromPoint; the harness installs a real one in setupDom().
  if (!document.elementFromPoint) {
    ;(document as Document).elementFromPoint = () => null
  }

  // window.innerWidth / innerHeight are read by useDragOp.cursorInsideWindow().
  // jsdom defaults to 1024×768; that's fine for tests.

  const stub = createElectronAPIStub()
  Object.defineProperty(window, 'electronAPI', {
    value: stub,
    writable: true,
    configurable: true,
  })

  beforeEach(() => {
    resetElectronAPIStub(stub)
  })
}

function createElectronAPIStub() {
  // Only the methods commitDrop / useDragOp / crossWindow can call during a test.
  // onCrossWindowDragUpdate / onDragEnd take a handler and return an unsubscribe.
  // Tests that drive remote drags grab the registered handler off the stub.
  return {
    isE2E: false,
    crossWindowDragStart: vi.fn().mockResolvedValue(undefined),
    crossWindowDragCancel: vi.fn().mockResolvedValue(undefined),
    crossWindowDragMove: vi.fn().mockResolvedValue(undefined),
    crossWindowDragResolve: vi.fn().mockResolvedValue({ claimed: false }),
    crossWindowDragDrop: vi.fn(),
    dragDetach: vi.fn().mockResolvedValue(null),
    isMainWindowFullscreen: vi.fn().mockReturnValue(false),
    onCrossWindowDragUpdate: vi.fn(() => () => {}),
    onDragEnd: vi.fn(() => () => {}),
  } as unknown as Window['electronAPI']
}

type ElectronAPIMocks = {
  crossWindowDragStart: ReturnType<typeof vi.fn>
  crossWindowDragCancel: ReturnType<typeof vi.fn>
  crossWindowDragMove: ReturnType<typeof vi.fn>
  crossWindowDragResolve: ReturnType<typeof vi.fn>
  crossWindowDragDrop: ReturnType<typeof vi.fn>
  dragDetach: ReturnType<typeof vi.fn>
  isMainWindowFullscreen: ReturnType<typeof vi.fn>
  onCrossWindowDragUpdate: ReturnType<typeof vi.fn>
  onDragEnd: ReturnType<typeof vi.fn>
}

function resetElectronAPIStub(stub: Window['electronAPI']) {
  const mocks = stub as unknown as ElectronAPIMocks
  mocks.crossWindowDragStart.mockReset().mockResolvedValue(undefined)
  mocks.crossWindowDragCancel.mockReset().mockResolvedValue(undefined)
  mocks.crossWindowDragMove.mockReset().mockResolvedValue(undefined)
  mocks.crossWindowDragResolve.mockReset().mockResolvedValue({ claimed: false })
  mocks.crossWindowDragDrop.mockReset()
  mocks.dragDetach.mockReset().mockResolvedValue(null)
  mocks.isMainWindowFullscreen.mockReset().mockReturnValue(false)
  mocks.onCrossWindowDragUpdate.mockReset().mockReturnValue(() => {})
  mocks.onDragEnd.mockReset().mockReturnValue(() => {})
}
