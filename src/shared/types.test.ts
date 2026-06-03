import { describe, expect, it } from 'vitest'
import { FLASHQUERY_MANAGED_FRONTMATTER_FIELDS, isFlashQueryConnection, normalizeFlashQueryConnectionUrl, sanitizeFlashQueryConnection } from './types'
import type {
  FlashQueryConnection,
  FlashQueryDocumentBody,
  FlashQueryDocumentPart,
  FlashQueryDocumentSearchResult,
  FlashQueryFrontmatter,
  FlashQueryGetDocumentOptions,
  FlashQueryMemorySearchResult,
  FlashQuerySearchEntityType,
  FlashQuerySearchMode,
  FlashQuerySearchParams,
  FlashQuerySearchResponse,
  FlashQueryVaultIndexEntry,
  FlashQueryWritePayload,
  ProjectWorkspaceFile,
  SessionSnapshot,
  WorkspaceInfo,
  WorkspaceState,
} from './types'

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
      url: 'http://127.0.0.1:3210',
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

  it('normalizes FlashQuery connection URLs for shared workspace persistence', () => {
    expect(normalizeFlashQueryConnectionUrl('https://flashquery.local/mcp/')).toBe('https://flashquery.local')
    expect(sanitizeFlashQueryConnection({ transport: 'http', url: 'https://flashquery.local/mcp/' })).toEqual({
      transport: 'http',
      url: 'https://flashquery.local',
    })
  })

  it('rejects unsafe FlashQuery connection URL shapes during shared sanitization', () => {
    expect(sanitizeFlashQueryConnection({ transport: 'http', url: 'https://user:pass@flashquery.local' })).toBeUndefined()
    expect(sanitizeFlashQueryConnection({ transport: 'http', url: 'https://flashquery.local?token=bad' })).toBeUndefined()
    expect(sanitizeFlashQueryConnection({ transport: 'http', url: 'https://flashquery.local#fragment' })).toBeUndefined()
  })

  it('T-U-009 keeps FlashQuery connection metadata on workspace and session shapes without persisting tokens', () => {
    const connection: FlashQueryConnection = {
      transport: 'http',
      url: 'https://flashquery.local',
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
      url: 'https://flashquery.local',
    })
    expect(JSON.stringify(projectWorkspaceFile)).not.toContain('raw-secret-token')
    expect(JSON.stringify(projectWorkspaceFile)).not.toContain('"auth"')
  })

  it('T-U-002 exports widened FlashQuery document, search, write, and vault-index contracts', () => {
    const part: FlashQueryDocumentPart = 'frontmatter'
    const getOptions: FlashQueryGetDocumentOptions = { include: ['body', part] }
    const frontmatter: FlashQueryFrontmatter = { title: 'Plan' }
    const document: FlashQueryDocumentBody = {
      body: '# Body',
      frontmatter,
      version_token: 'v1',
      modified: '2026-06-03T00:00:00Z',
    }
    const legacyWrite: FlashQueryWritePayload = 'body'
    const objectWrite: FlashQueryWritePayload = { content: 'body', frontmatter, tags: ['project'] }
    const mode: FlashQuerySearchMode = 'mixed'
    const entityType: FlashQuerySearchEntityType = 'documents'
    const searchParams: FlashQuerySearchParams = {
      query: 'plan',
      mode,
      entity_types: [entityType, 'memories'],
      limit: 50,
    }
    const documentResult: FlashQueryDocumentSearchResult = { filename: 'Plan.md', fullPath: 'Docs/Plan.md' }
    const memoryResult: FlashQueryMemorySearchResult = { id: 'memory-1', text: 'Remember the plan' }
    const searchResponse: FlashQuerySearchResponse = {
      documents: [documentResult],
      memories: [memoryResult],
      total_documents: 1,
      total_memories: 1,
    }
    const vaultIndexEntry: FlashQueryVaultIndexEntry = { filename: 'Plan.md', fullPath: 'Docs/Plan.md' }

    expect(getOptions.include).toEqual(['body', 'frontmatter'])
    expect(document.body).toBe('# Body')
    expect(document.frontmatter).toEqual({ title: 'Plan' })
    expect(legacyWrite).toBe('body')
    expect(objectWrite).toEqual({ content: 'body', frontmatter, tags: ['project'] })
    expect(searchParams).toEqual({ query: 'plan', mode: 'mixed', entity_types: ['documents', 'memories'], limit: 50 })
    expect(searchResponse.documents[0]).toBe(documentResult)
    expect(searchResponse.memories[0]).toBe(memoryResult)
    expect(vaultIndexEntry).toEqual({ filename: 'Plan.md', fullPath: 'Docs/Plan.md' })
  })

  it('T-U-004 declares FlashQuery-managed frontmatter fields for write filtering', () => {
    expect(FLASHQUERY_MANAGED_FRONTMATTER_FIELDS).toEqual(expect.arrayContaining([
      'fq_id',
      'fq_created',
      'fq_updated',
      'fq_archived_at',
      'fq_instance',
      'fq_owner',
      'fq_type',
    ]))
  })
})
