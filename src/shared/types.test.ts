import { describe, expect, it } from 'vitest'
import { isFlashQueryConnection, sanitizeFlashQueryConnection } from './types'
import type { FlashQueryConnection, WorkspaceInfo } from './types'

describe('FlashQueryConnection', () => {
  it('accepts the HTTP transport with optional bearer auth', () => {
    const connection: FlashQueryConnection = {
      transport: 'http',
      url: 'http://127.0.0.1:3210/mcp',
      auth: { type: 'bearer', token: 'test-token' },
    }

    expect(isFlashQueryConnection(connection)).toBe(true)
    expect(sanitizeFlashQueryConnection(connection)).toEqual({
      transport: 'http',
      url: 'http://127.0.0.1:3210/mcp',
    })
  })

  it('is optional on WorkspaceInfo', () => {
    const workspace: WorkspaceInfo = {
      id: 'workspace-1',
      name: 'Cate',
      color: '',
      rootPath: '/tmp/cate',
    }

    expect(workspace.flashqueryConnection).toBeUndefined()
  })

  it('treats malformed persisted connection data as absent', () => {
    expect(sanitizeFlashQueryConnection({ transport: 'stdio', url: 'x' })).toBeUndefined()
    expect(sanitizeFlashQueryConnection({ transport: 'http' })).toBeUndefined()
    expect(sanitizeFlashQueryConnection({ transport: 'http', url: 'x', auth: { type: 'basic' } })).toBeUndefined()
  })
})
