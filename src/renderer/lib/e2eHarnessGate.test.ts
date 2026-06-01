import { describe, expect, it, vi } from 'vitest'
import { installE2EHarnessIfEnabled } from './e2eHarnessGate'

describe('E2E harness production gate', () => {
  it('T-U-007 leaves window.__cateE2E uninstalled when isE2E is false', async () => {
    const loadHarness = vi.fn(async () => ({
      installE2EHarness: vi.fn(),
    }))

    installE2EHarnessIfEnabled({ isE2E: false }, loadHarness)
    await Promise.resolve()

    expect(loadHarness).not.toHaveBeenCalled()
  })

  it('T-U-007 installs window.__cateE2E only when isE2E is true', async () => {
    const installE2EHarness = vi.fn()
    const loadHarness = vi.fn(async () => ({ installE2EHarness }))

    installE2EHarnessIfEnabled({ isE2E: true }, loadHarness)
    await Promise.resolve()
    await Promise.resolve()

    expect(loadHarness).toHaveBeenCalledTimes(1)
    expect(installE2EHarness).toHaveBeenCalledTimes(1)
  })
})
