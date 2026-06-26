import { describe, expect, it } from 'vitest'
import { browserPartitionForWorkspace } from './browserPartition'

describe('browserPartitionForWorkspace', () => {
  it('T-U-001 returns the workspace partition without panel identity', () => {
    expect(browserPartitionForWorkspace('abc')).toBe('persist:browser-ws-abc')
    expect(browserPartitionForWorkspace('abc')).not.toContain('panel')
  })

  it('T-U-002 produces distinct partitions for distinct workspaces', () => {
    expect(browserPartitionForWorkspace('workspace-a')).toBe('persist:browser-ws-workspace-a')
    expect(browserPartitionForWorkspace('workspace-b')).toBe('persist:browser-ws-workspace-b')
    expect(browserPartitionForWorkspace('workspace-a')).not.toBe(browserPartitionForWorkspace('workspace-b'))
  })

  it('T-U-029 rejects empty workspace ids instead of returning an empty suffix', () => {
    expect(() => browserPartitionForWorkspace('')).toThrow('Browser workspaceId is required')
    expect(() => browserPartitionForWorkspace('   ')).toThrow('Browser workspaceId is required')
  })
})
