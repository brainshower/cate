import { describe, expect, it } from 'vitest'
import {
  peekPendingFlashQuerySearchReveal,
  setPendingFlashQuerySearchReveal,
  takePendingFlashQuerySearchReveal,
} from './flashquerySearchReveal'

describe('flashquerySearchReveal', () => {
  it('stores and consumes one pending reveal path per workspace', () => {
    setPendingFlashQuerySearchReveal('workspace-1', 'Docs/Plan.md')
    setPendingFlashQuerySearchReveal('workspace-2', 'Docs/Other.md')

    expect(peekPendingFlashQuerySearchReveal('workspace-1')).toBe('Docs/Plan.md')
    expect(takePendingFlashQuerySearchReveal('workspace-1')).toBe('Docs/Plan.md')
    expect(takePendingFlashQuerySearchReveal('workspace-1')).toBeUndefined()
    expect(takePendingFlashQuerySearchReveal('workspace-2')).toBe('Docs/Other.md')
  })
})
