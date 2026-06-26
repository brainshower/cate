import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { on: vi.fn() },
  session: { fromPartition: vi.fn() },
  shell: { openExternal: vi.fn() },
}))

import { classifyWebviewShortcut } from './webSecurity'

const keyDown = (input: Partial<Electron.Input>): Electron.Input => ({
  type: 'keyDown',
  key: '',
  code: '',
  control: false,
  meta: false,
  shift: false,
  alt: false,
  isAutoRepeat: false,
  ...input,
} as Electron.Input)

describe('classifyWebviewShortcut', () => {
  it('T-U-014 allows only reload, focus URL, back, and forward shortcuts', () => {
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyR', key: 'r', meta: true }))).toBe('reload')
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyL', key: 'l', control: true }))).toBe('focus-url')
    expect(classifyWebviewShortcut(keyDown({ code: 'BracketLeft', key: '[', meta: true }))).toBe('back')
    expect(classifyWebviewShortcut(keyDown({ code: 'BracketRight', key: ']', control: true }))).toBe('forward')
  })

  it('T-U-015 rejects app-management and unrelated shortcuts', () => {
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyT', key: 't', meta: true }))).toBeNull()
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyW', key: 'w', control: true }))).toBeNull()
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyB', key: 'b', meta: true, shift: true }))).toBeNull()
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyL', key: 'l', meta: true, shift: true }))).toBeNull()
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyK', key: 'k', meta: true }))).toBeNull()
    expect(classifyWebviewShortcut(keyDown({ code: 'KeyR', key: 'r' }))).toBeNull()
  })
})
