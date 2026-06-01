import { describe, expect, it } from 'vitest'
import { isFlashQueryConnection, sanitizeFlashQueryConnection } from './types'
import type { FlashQueryConnection, ProjectWorkspaceFile, SessionSnapshot, WorkspaceInfo, WorkspaceState } from './types'

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

  it('T-U-009 keeps FlashQuery connection metadata on workspace and session shapes without persisting tokens', () => {
    const connection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local/mcp',
      auth: { type: 'bearer', token: 'raw-secret-token' },
    }
    const workspaceInfo: WorkspaceInfo = {
      id: 'workspace-1',
      name: 'Cate',
      color: '#5AD8B8',
      rootPath: '/repo',
      flashqueryConnection: connection,
    }
    const workspaceState: WorkspaceState = {
      id: 'workspace-1',
      name: 'Cate',
      color: '#5AD8B8',
      rootPath: '/repo',
      flashqueryConnection: connection,
      panels: {},
      canvasNodes: {},
      regions: {},
      zoomLevel: 1,
      viewportOffset: { x: 0, y: 0 },
      focusedNodeId: null,
    }
    const sessionSnapshot: SessionSnapshot = {
      workspaceId: 'workspace-1',
      workspaceName: 'Cate',
      rootPath: '/repo',
      flashqueryConnection: connection,
      viewportOffset: { x: 0, y: 0 },
      zoomLevel: 1,
      nodes: [],
    }
    const projectWorkspaceFile: ProjectWorkspaceFile = {
      version: 1,
      workspaceId: 'workspace-1',
      name: 'Cate',
      color: '#5AD8B8',
      flashqueryConnection: sanitizeFlashQueryConnection(connection),
      canvas: {
        nodes: [],
        regions: [],
        zoomLevel: 1,
        viewportOffset: { x: 0, y: 0 },
      },
    }

    expect(workspaceInfo.flashqueryConnection).toBe(connection)
    expect(workspaceState.flashqueryConnection).toBe(connection)
    expect(sessionSnapshot.flashqueryConnection).toBe(connection)
    expect(projectWorkspaceFile.flashqueryConnection).toEqual({
      transport: 'http',
      url: 'https://flashquery.local/mcp',
    })
    expect(JSON.stringify(projectWorkspaceFile)).not.toContain('raw-secret-token')
    expect(JSON.stringify(projectWorkspaceFile)).not.toContain('"auth"')
  })
})
