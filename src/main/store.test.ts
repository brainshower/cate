import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../shared/types'
import { validateSettingValue } from './store'

describe('settings schema', () => {
  it('T-U-021 accepts browserShowBookmarksBar and rejects the wrong type', () => {
    expect(DEFAULT_SETTINGS.browserShowBookmarksBar).toBe(true)
    expect(validateSettingValue('browserShowBookmarksBar', false)).toBe(true)
    expect(validateSettingValue('browserShowBookmarksBar', 'false')).toBe(false)
  })
})
