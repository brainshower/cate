// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import { useShortcutStore } from './shortcutStore'

function setNavigatorPlatform(platform: string): void {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

function keyEvent(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return new KeyboardEvent('keydown', { key, ...init })
}

describe('shortcutStore.matchEvent', () => {
  beforeEach(() => {
    useShortcutStore.getState().resetAll()
  })

  it('maps command shortcuts to Cmd on macOS', () => {
    setNavigatorPlatform('MacIntel')

    expect(useShortcutStore.getState().matchEvent(keyEvent('k', { metaKey: true }))).toBe('commandPalette')
    expect(useShortcutStore.getState().matchEvent(keyEvent('k', { ctrlKey: true }))).toBeNull()
  })

  it('maps command shortcuts to Ctrl on Windows and Linux', () => {
    for (const platform of ['Win32', 'Linux x86_64']) {
      setNavigatorPlatform(platform)

      expect(useShortcutStore.getState().matchEvent(keyEvent('k', { ctrlKey: true }))).toBe('commandPalette')
      expect(useShortcutStore.getState().matchEvent(keyEvent('k', { metaKey: true }))).toBeNull()
    }
  })

  it('keeps control-only shortcuts available on non-macOS platforms', () => {
    setNavigatorPlatform('Linux x86_64')

    expect(useShortcutStore.getState().matchEvent(keyEvent(' ', { ctrlKey: true }))).toBe('nodeSwitcher')
  })
})
