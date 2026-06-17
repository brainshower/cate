import { describe, expect, it, vi } from 'vitest'
import {
  buildSemanticConnectionsResult,
  createCachedSemanticConnectionsProvider,
  mapFlashQueryChunksToPreview,
  type FlashQuerySemanticConnection,
} from './semanticConnectionsProvider'

const markdown = [
  '# Plan',
  '',
  'Intro',
  '',
  '## Scope',
  '',
  'First scope',
  '',
  '### Details',
  '',
  'Nested details',
  '',
  '## Scope',
  '',
  'Second scope',
].join('\n')

const flashqueryConnections: FlashQuerySemanticConnection[] = [
  {
    id: 'conn-1',
    score: 0.91,
    target: {
      flashqueryChunkId: '11111111-1111-4111-8111-111111111111',
      documentId: 'doc-1',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingPath: ['Plan', 'Scope'],
      headingText: 'Scope',
      snippet: 'First scope neighbor',
      sourceStartLine: 5,
      sourceEndLine: 7,
    },
  },
  {
    id: 'conn-2',
    score: 0.84,
    target: {
      flashqueryChunkId: '22222222-2222-4222-8222-222222222222',
      documentId: 'doc-1',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingPath: ['Plan', 'Scope', 'Details'],
      headingText: 'Details',
      snippet: 'Nested details neighbor',
      sourceStartLine: 9,
      sourceEndLine: 11,
    },
  },
  {
    id: 'conn-3',
    score: 0.72,
    target: {
      flashqueryChunkId: '33333333-3333-4333-8333-333333333333',
      documentId: 'doc-1',
      documentPath: '/workspace/Plan.md',
      documentTitle: 'Plan',
      headingPath: ['Plan', 'Scope'],
      headingText: 'Scope',
      snippet: 'Second scope neighbor',
      sourceStartLine: 13,
      sourceEndLine: 15,
    },
  },
]

describe('semantic connections provider boundary', () => {
  it('T-U-011 maps FlashQuery heading path and duplicate occurrence metadata to preview chunk IDs', () => {
    const mapped = mapFlashQueryChunksToPreview({
      markdown,
      targets: flashqueryConnections.map((connection) => connection.target),
    })

    expect(mapped.chunkMap['11111111-1111-4111-8111-111111111111']?.previewChunkId).toBe('scope')
    expect(mapped.chunkMap['22222222-2222-4222-8222-222222222222']?.previewChunkId).toBe('details')
    expect(mapped.chunkMap['33333333-3333-4333-8333-333333333333']?.previewChunkId).toBe('scope-1')
    expect(mapped.chunkMap.scope).toBeUndefined()
    expect(mapped.diagnostics).toEqual([])
  })

  it('T-U-012 reports diagnostics instead of throwing on unmapped chunks', () => {
    const mapped = mapFlashQueryChunksToPreview({
      markdown,
      targets: [
        {
          flashqueryChunkId: '44444444-4444-4444-8444-444444444444',
          documentPath: '/workspace/Plan.md',
          documentTitle: 'Plan',
          headingPath: ['Plan', 'Missing'],
          headingText: 'Missing',
          snippet: 'Missing section',
        },
      ],
    })

    expect(mapped.chunkMap['44444444-4444-4444-8444-444444444444']?.previewChunkId).toBeNull()
    expect(mapped.diagnostics).toHaveLength(1)
    expect(mapped.diagnostics[0]).toContain('44444444-4444-4444-8444-444444444444')
  })

  it('T-I-040 builds the provider result shape consumed by the panel', () => {
    const result = buildSemanticConnectionsResult({
      markdown,
      mode: 'embeddings-only',
      connections: flashqueryConnections,
    })

    expect(result).toMatchObject({
      mode: 'embeddings-only',
      diagnostics: [],
      chunkOrder: ['plan', 'scope', 'details', 'scope-1'],
    })
    expect(result.overall.map((connection) => connection.id)).toEqual(['conn-1', 'conn-2', 'conn-3'])
    expect(result.byChunkId.scope.map((connection) => connection.id)).toEqual(['conn-1'])
    expect(result.byChunkId.details.map((connection) => connection.id)).toEqual(['conn-2'])
    expect(result.byChunkId['scope-1'].map((connection) => connection.id)).toEqual(['conn-3'])
    expect(result.chunkMap['11111111-1111-4111-8111-111111111111']).toMatchObject({
      previewChunkId: 'scope',
      headingPath: ['Plan', 'Scope'],
    })
  })

  it('T-I-041 keeps embeddings-only fixtures free of null or empty rel/dir values', () => {
    const result = buildSemanticConnectionsResult({
      markdown,
      mode: 'embeddings-only',
      connections: flashqueryConnections,
    })

    for (const connection of result.overall) {
      expect('rel' in connection).toBe(false)
      expect('dir' in connection).toBe(false)
    }
  })

  it('T-I-042 caches by editor document and content hash, then invalidates material content changes', async () => {
    const backend = {
      loadDocumentConnections: vi.fn()
        .mockResolvedValueOnce(buildSemanticConnectionsResult({
          markdown,
          mode: 'embeddings-only',
          connections: [flashqueryConnections[0]],
        }))
        .mockResolvedValueOnce(buildSemanticConnectionsResult({
          markdown: `${markdown}\n\nFresh line`,
          mode: 'embeddings-only',
          connections: [flashqueryConnections[1]],
        })),
    }
    const cached = createCachedSemanticConnectionsProvider(backend)
    const baseInput = {
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: '/workspace/Plan.md',
      markdown,
      contentHash: 'hash-a',
    }

    const first = await cached.loadDocumentConnections(baseInput)
    const second = await cached.loadDocumentConnections(baseInput)
    const third = await cached.loadDocumentConnections({
      ...baseInput,
      markdown: `${markdown}\n\nFresh line`,
      contentHash: 'hash-b',
    })

    expect(backend.loadDocumentConnections).toHaveBeenCalledTimes(2)
    expect(second).toBe(first)
    expect(third).not.toBe(first)
    expect(third.overall.map((connection) => connection.id)).toEqual(['conn-2'])
  })
})
