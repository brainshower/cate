import { describe, expect, it, vi } from 'vitest'
import { FlashQueryClientManager } from './clientManager'

describe('FlashQueryClientManager', () => {
  it('constructs without eager network work', () => {
    const originalFetch = globalThis.fetch
    const fetchSpy = vi.fn()
    Object.defineProperty(globalThis, 'fetch', { value: fetchSpy, configurable: true })

    new FlashQueryClientManager()

    expect(fetchSpy).not.toHaveBeenCalled()
    Object.defineProperty(globalThis, 'fetch', { value: originalFetch, configurable: true })
  })

  it('allows status, vault-changed, tools-changed, and future subscriptions without side effects', () => {
    const manager = new FlashQueryClientManager()
    const statusHandler = vi.fn()
    const vaultHandler = vi.fn()
    const toolsHandler = vi.fn()
    const futureHandler = vi.fn()

    const unsubscribeStatus = manager.subscribe('workspace-1', 'status', statusHandler)
    const unsubscribeVault = manager.subscribe('workspace-1', 'vault-changed', vaultHandler)
    const unsubscribeTools = manager.subscribe('workspace-1', 'tools-changed', toolsHandler)
    const unsubscribeFuture = manager.subscribe<{ changed: boolean }>('workspace-1', 'custom-event', futureHandler)

    const states = (manager as unknown as { workspaceStates: Map<string, { subscribers: Map<string, Set<unknown>> }> }).workspaceStates
    expect(states.get('workspace-1')?.subscribers.get('status')?.size).toBe(1)
    expect(states.get('workspace-1')?.subscribers.get('vault-changed')?.size).toBe(1)
    expect(states.get('workspace-1')?.subscribers.get('tools-changed')?.size).toBe(1)
    expect(states.get('workspace-1')?.subscribers.get('custom-event')?.size).toBe(1)

    unsubscribeStatus()
    unsubscribeVault()
    unsubscribeTools()
    unsubscribeFuture()

    expect(states.get('workspace-1')?.subscribers.get('status')?.size).toBe(0)
    expect(states.get('workspace-1')?.subscribers.get('vault-changed')?.size).toBe(0)
    expect(states.get('workspace-1')?.subscribers.get('tools-changed')?.size).toBe(0)
    expect(states.get('workspace-1')?.subscribers.get('custom-event')?.size).toBe(0)
  })

  it('scopes state by workspace and releases it on dispose', () => {
    const manager = new FlashQueryClientManager()

    manager.subscribe('workspace-1', 'status', vi.fn())
    manager.subscribe('workspace-2', 'status', vi.fn())
    manager.dispose('workspace-1')
    manager.dispose('workspace-1')

    const states = (manager as unknown as { workspaceStates: Map<string, unknown> }).workspaceStates
    expect(states.has('workspace-1')).toBe(false)
    expect(states.has('workspace-2')).toBe(true)
  })
})
