import { describe, expect, it } from 'vitest'
import { pageLoadErrorFrom } from './browserLoadError'

describe('pageLoadErrorFrom', () => {
  it('T-U-009 returns null for ERR_ABORTED', () => {
    expect(pageLoadErrorFrom({
      errorCode: -3,
      errorDescription: 'ERR_ABORTED',
      isMainFrame: true,
    })).toBeNull()
  })

  it('T-U-010 returns null for subframe failures', () => {
    expect(pageLoadErrorFrom({
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      isMainFrame: false,
    })).toBeNull()
  })

  it('T-U-011 returns descriptions for main-frame failures and treats missing isMainFrame as main-frame', () => {
    expect(pageLoadErrorFrom({
      errorCode: -105,
      errorDescription: 'ERR_NAME_NOT_RESOLVED',
      isMainFrame: true,
    })).toBe('ERR_NAME_NOT_RESOLVED')

    expect(pageLoadErrorFrom({
      errorCode: -2,
      errorDescription: 'ERR_FAILED',
    })).toBe('ERR_FAILED')

    expect(pageLoadErrorFrom({
      errorCode: -2,
    })).toBe('Failed to load page')
  })
})
