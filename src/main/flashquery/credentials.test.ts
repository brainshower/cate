import { beforeEach, describe, expect, it, vi } from 'vitest'

const storeMock = vi.hoisted(() => ({
  values: new Map<string, unknown>(),
  failWrites: false,
}))

vi.mock('electron-store', () => ({
  default: class MockStore {
    get(key: string, defaultValue?: unknown): unknown {
      return storeMock.values.has(key) ? storeMock.values.get(key) : defaultValue
    }

    set(key: string, value: unknown): void {
      if (storeMock.failWrites) throw new Error('write failed')
      storeMock.values.set(key, value)
    }

    delete(key: string): void {
      if (storeMock.failWrites) throw new Error('delete failed')
      storeMock.values.delete(key)
    }
  },
}))

describe('FlashQuery credentials', () => {
  beforeEach(() => {
    storeMock.values.clear()
    storeMock.failWrites = false
  })

  it('stores and retrieves a workspace token', async () => {
    const { getWorkspaceToken, setWorkspaceToken } = await import('./credentials')

    await setWorkspaceToken('workspace-1', 'test-token-secret')

    await expect(getWorkspaceToken('workspace-1')).resolves.toBe('test-token-secret')
  })

  it('returns null for missing workspace tokens', async () => {
    const { getWorkspaceToken } = await import('./credentials')

    await expect(getWorkspaceToken('workspace-missing')).resolves.toBeNull()
  })

  it('deletes a token when set to null', async () => {
    const { getWorkspaceToken, setWorkspaceToken } = await import('./credentials')

    await setWorkspaceToken('workspace-1', 'test-token-secret')
    await setWorkspaceToken('workspace-1', null)

    await expect(getWorkspaceToken('workspace-1')).resolves.toBeNull()
  })

  it('keeps tokens isolated by workspace ID', async () => {
    const { getWorkspaceToken, setWorkspaceToken } = await import('./credentials')

    await setWorkspaceToken('workspace-alpha', 'test-token-alpha')
    await setWorkspaceToken('workspace-beta', 'test-token-beta')

    await expect(getWorkspaceToken('workspace-alpha')).resolves.toBe('test-token-alpha')
    await expect(getWorkspaceToken('workspace-beta')).resolves.toBe('test-token-beta')
  })

  it('propagates write failures', async () => {
    const { setWorkspaceToken } = await import('./credentials')

    storeMock.failWrites = true

    await expect(setWorkspaceToken('workspace-1', 'test-token-secret')).rejects.toThrow('write failed')
  })
})
