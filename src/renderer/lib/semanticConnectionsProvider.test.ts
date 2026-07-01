import { describe, expect, it, vi } from 'vitest'
import {
  buildSemanticConnectionsResult,
  createFlashQuerySemanticConnectionsProvider,
  createCachedSemanticConnectionsProvider,
  mapFlashQueryChunksToPreview,
  type FlashQuerySemanticConnection,
} from './semanticConnectionsProvider'
import type { FlashQueryDocumentConnectionsResponse } from '../../shared/types'

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

    expect(mapped.chunkMap.scope?.flashqueryChunkId).toBe('11111111-1111-4111-8111-111111111111')
    expect(mapped.chunkMap.details?.flashqueryChunkId).toBe('22222222-2222-4222-8222-222222222222')
    expect(mapped.chunkMap['scope-1']?.flashqueryChunkId).toBe('33333333-3333-4333-8333-333333333333')
    expect(mapped.chunkMapByFlashQueryId['22222222-2222-4222-8222-222222222222']?.previewChunkId).toBe('details')
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

    expect(mapped.chunkMap['44444444-4444-4444-8444-444444444444']).toBeUndefined()
    expect(mapped.chunkMapByFlashQueryId['44444444-4444-4444-8444-444444444444']?.previewChunkId).toBeNull()
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
    expect(result.chunkMap.scope).toMatchObject({
      flashqueryChunkId: '11111111-1111-4111-8111-111111111111',
      previewChunkId: 'scope',
      headingPath: ['Plan', 'Scope'],
    })
  })

  it('T-U-004 and T-I-041 keeps embeddings-only fixtures free of null or empty rel/dir values', () => {
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

  it('T-U-002 accepts graph-aware result fields while embeddings-only fixtures stay valid', () => {
    const result = buildSemanticConnectionsResult({
      markdown,
      mode: 'typed',
      connections: [{
        id: 'graph-1',
        score: 0.77,
        rel: 'supports',
        dir: 'out',
        confidence: 'high',
        confidenceScore: 0.93,
        reasoning: 'Scope supports the graph contract.',
        sourceClaimsReferenced: [0],
        targetClaimsReferenced: [1],
        status: 'active',
        qualifiers: ['normative'],
        metadata: { arbitraryNestedValue: { remains: ['opaque'] } },
        target: {
          flashqueryChunkId: '11111111-1111-4111-8111-111111111111',
          documentId: 'doc-1',
          documentPath: '/workspace/Plan.md',
          documentTitle: 'Plan',
          headingPath: ['Plan', 'Scope'],
          headingText: 'Scope',
          snippet: 'Graph target',
          targetChunkSummary: 'Target analysis summary',
          targetStale: false,
          targetAnalyzedAt: '2026-06-30T00:00:00Z',
          targetCommunityId: 'community-1',
        },
      }],
      graphSummary: {
        edge_count: 1,
        edge_counts_by_relation: { supports: 1 },
        stale_edge_count: 0,
        community_labels: ['Architecture'],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      communitySummary: {
        dominantLabel: 'Architecture',
        summary: 'Graph contract context',
        labels: ['Architecture'],
      },
      nodeMeta: {
        scope: {
          chunkSummary: 'Scope summary',
          keyClaims: ['Claim one'],
          certaintyLevel: 'high',
          stale: false,
          analyzedAt: '2026-06-30T00:00:00Z',
        },
      },
      nodeMetaLoading: false,
    })

    expect(result.mode).toBe('typed')
    expect(result.graphSummary?.edge_count).toBe(1)
    expect(result.communitySummary?.dominantLabel).toBe('Architecture')
    expect(result.nodeMeta?.scope?.keyClaims).toEqual(['Claim one'])
    expect(result.overall[0]).toMatchObject({
      rel: 'supports',
      confidenceScore: 0.93,
      target: {
        targetChunkSummary: 'Target analysis summary',
        targetCommunityId: 'community-1',
      },
    })
  })

  it('maps live graph summary community labels into the provider community summary', async () => {
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: 1,
        edge_counts_by_relation: { supports: 1 },
        stale_edge_count: 0,
        community_labels: ['Architecture', 'Testing'],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [],
      source_chunks: [],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(vi.fn(), connections)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown,
      contentHash: 'hash-community-labels',
    })

    expect(result.communitySummary).toEqual({
      dominantLabel: 'Architecture',
      labels: ['Architecture', 'Testing'],
    })
  })

  it('T-U-003 keeps unknown optional metadata opaque without narrowing renderer assumptions', () => {
    const metadata = { futureShape: { nested: ['still opaque'] }, numeric: 42 }
    const result = buildSemanticConnectionsResult({
      markdown,
      mode: 'typed',
      connections: [{
        id: 'graph-opaque',
        rel: 'references',
        dir: 'out',
        metadata,
        target: {
          flashqueryChunkId: '11111111-1111-4111-8111-111111111111',
          documentPath: '/workspace/Plan.md',
          documentTitle: 'Plan',
          headingPath: ['Plan', 'Scope'],
          headingText: 'Scope',
          snippet: 'Opaque metadata target',
        },
      }],
    })

    expect(result.overall[0].metadata).toBe(metadata)
  })

  it('T-U-026 accepts graph-only rows with null or absent score', () => {
    const result = buildSemanticConnectionsResult({
      markdown,
      mode: 'typed',
      connections: [{
        id: 'graph-no-score',
        score: null,
        rel: 'contradicts',
        target: {
          flashqueryChunkId: '11111111-1111-4111-8111-111111111111',
          documentPath: '/workspace/Plan.md',
          documentTitle: 'Plan',
          headingPath: ['Plan', 'Scope'],
          headingText: 'Scope',
          snippet: 'Graph target without cosine score',
        },
      }, {
        id: 'graph-absent-score',
        rel: 'supports',
        target: {
          flashqueryChunkId: '22222222-2222-4222-8222-222222222222',
          documentPath: '/workspace/Plan.md',
          documentTitle: 'Plan',
          headingPath: ['Plan', 'Scope', 'Details'],
          headingText: 'Details',
          snippet: 'Graph target without score key',
        },
      }],
    })

    expect(result.overall.map((connection) => connection.id)).toEqual(['graph-no-score', 'graph-absent-score'])
    expect(result.overall[0].score).toBeUndefined()
    expect(result.overall[1].score).toBeUndefined()
  })

  it('T-U-009 maps document source chunks to preview IDs and preserves graph relation rows', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: 1,
        edge_counts_by_relation: { supports: 1 },
        stale_edge_count: 0,
        community_labels: ['Architecture'],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [{
        id: 'edge-source-beta',
        relation: 'supports',
        direction: 'out',
        confidence_score: 0.92,
        target: {
          chunk_id: 'beta-chunk',
          document_id: 'doc-beta',
          path: 'Docs/Beta.md',
          title: 'Beta',
          heading_path: 'Beta > Decision',
          content: 'Beta target.',
        },
      }],
      source_chunks: [{
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: [{
          id: 'edge-source-beta',
          relation: 'supports',
          direction: 'out',
          confidence_score: 0.92,
          target: {
            chunk_id: 'beta-chunk',
            document_id: 'doc-beta',
            path: 'Docs/Beta.md',
            title: 'Beta',
            heading_path: 'Beta > Decision',
            content: 'Beta target.',
          },
        }],
      }],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Scope\n\nScope body',
      contentHash: 'hash-source-graph',
    })

    expect(result.mode).toBe('typed')
    expect(result.graphSummary?.edge_count).toBe(1)
    expect(result.chunkMap.scope).toMatchObject({
      flashqueryChunkId: 'source-scope',
      previewChunkId: 'scope',
      documentPath: 'Docs/Source.md',
      documentTitle: 'Source',
      headingPath: ['Source', 'Scope'],
    })
    expect(result.byChunkId.scope).toHaveLength(1)
    expect(result.byChunkId.scope[0]).toMatchObject({
      id: 'edge-source-beta',
      rel: 'supports',
      dir: 'out',
      confidenceScore: 0.92,
      target: {
        chunkId: 'beta-chunk',
        title: 'Beta',
      },
    })
  })

  it('T-U-010 maps duplicate document source headings to distinct preview IDs', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Plan.md', title: 'Plan' },
      graph_summary: {
        edge_count: 2,
        edge_counts_by_relation: { references: 2 },
        stale_edge_count: 0,
        community_labels: [],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [],
      source_chunks: [{
        chunk_id: 'first-scope',
        heading_path: 'Plan > Scope',
        connections: [{
          id: 'edge-first',
          relation: 'references',
          target: {
            chunk_id: 'target-first',
            path: 'Docs/First.md',
            title: 'First',
            content: 'First target',
          },
        }],
      }, {
        chunk_id: 'second-scope',
        heading_path: 'Plan > Scope',
        connections: [{
          id: 'edge-second',
          relation: 'references',
          target: {
            chunk_id: 'target-second',
            path: 'Docs/Second.md',
            title: 'Second',
            content: 'Second target',
          },
        }],
      }],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Plan.md',
      markdown,
      contentHash: 'hash-duplicates',
    })

    expect(result.chunkMap.scope?.flashqueryChunkId).toBe('first-scope')
    expect(result.chunkMap['scope-1']?.flashqueryChunkId).toBe('second-scope')
    expect(result.byChunkId.scope.map((connection) => connection.id)).toEqual(['edge-first'])
    expect(result.byChunkId['scope-1'].map((connection) => connection.id)).toEqual(['edge-second'])
  })

  it('T-U-011 omits only unmapped source chunk rows and records diagnostics', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: 2,
        edge_counts_by_relation: { supports: 2 },
        stale_edge_count: 0,
        community_labels: [],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [],
      source_chunks: [{
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: [{
          id: 'edge-mapped',
          relation: 'supports',
          target: { chunk_id: 'mapped-target', path: 'Docs/Mapped.md', title: 'Mapped' },
        }],
      }, {
        chunk_id: 'source-missing',
        heading_path: 'Source > Missing',
        connections: [{
          id: 'edge-unmapped',
          relation: 'supports',
          target: { chunk_id: 'unmapped-target', path: 'Docs/Unmapped.md', title: 'Unmapped' },
        }],
      }],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Scope\n\nScope body',
      contentHash: 'hash-unmapped',
    })

    expect(result.byChunkId.scope.map((connection) => connection.id)).toEqual(['edge-mapped'])
    expect(result.overall.map((connection) => connection.id)).not.toContain('edge-unmapped')
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining('Unable to map FlashQuery chunk source-missing'),
    ]))
  })

  it('T-U-012, T-U-013, and T-U-014 derive typed, mixed, and embeddings-only modes from graph summary coverage', async () => {
    const response = (
      edgeCount: number,
      sourceConnections: FlashQueryDocumentConnectionsResponse['source_chunks'][number]['connections'],
    ) => ({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: edgeCount,
        edge_counts_by_relation: edgeCount > 0 ? { supports: edgeCount } : {},
        stale_edge_count: 0,
        community_labels: [],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: sourceConnections,
      source_chunks: [{
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: sourceConnections,
      }],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const markdownSource = '# Source\n\nIntro\n\n## Scope\n\nScope body'
    const typedProvider = createFlashQuerySemanticConnectionsProvider(vi.fn(), vi.fn().mockResolvedValue(response(1, [{
      id: 'typed-edge',
      relation: 'supports',
      target: { chunk_id: 'target', path: 'Docs/Target.md', title: 'Target' },
    }])))
    const mixedProvider = createFlashQuerySemanticConnectionsProvider(vi.fn(), vi.fn().mockResolvedValue(response(2, [{
      id: 'typed-edge',
      relation: 'supports',
      target: { chunk_id: 'target', path: 'Docs/Target.md', title: 'Target' },
    }, {
      id: 'untyped-edge',
      target: { chunk_id: 'legacy-target', path: 'Docs/Legacy.md', title: 'Legacy' },
    }])))
    const emptyGraphProvider = createFlashQuerySemanticConnectionsProvider(vi.fn(), vi.fn().mockResolvedValue(response(0, [{
      id: 'legacy-edge',
      target: { chunk_id: 'legacy-target', path: 'Docs/Legacy.md', title: 'Legacy' },
    }])))

    const input = {
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: markdownSource,
      contentHash: 'hash-mode',
    }

    await expect(typedProvider.loadDocumentConnections(input)).resolves.toMatchObject({ mode: 'typed' })
    await expect(mixedProvider.loadDocumentConnections(input)).resolves.toMatchObject({ mode: 'mixed' })
    await expect(emptyGraphProvider.loadDocumentConnections(input)).resolves.toMatchObject({ mode: 'embeddings-only' })
  })

  it('T-U-016 records diagnostics for malformed optional graph fields without throwing during result construction', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: 1,
        edge_counts_by_relation: { supports: 1 },
        stale_edge_count: 0,
        community_labels: [],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [],
      source_chunks: [{
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: [{
          id: 'edge-bad-optional',
          relation: 'supports',
          confidence_score: Number.NaN,
          source_claims_referenced: [0],
          qualifiers: ['normative'],
          metadata: { nested: { ok: true } },
          target: { chunk_id: 'target', path: 'Docs/Target.md', title: 'Target' },
        }],
      }],
      diagnostics: ['edge-bad-optional.confidence_score ignored: expected number'],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Scope\n\nScope body',
      contentHash: 'hash-malformed-graph-fields',
    })

    expect(result.byChunkId.scope[0]).toMatchObject({
      id: 'edge-bad-optional',
      rel: 'supports',
      sourceClaimsReferenced: [0],
      qualifiers: ['normative'],
      metadata: { nested: { ok: true } },
    })
    expect(result.byChunkId.scope[0].confidenceScore).toBeUndefined()
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      'edge-bad-optional.confidence_score ignored: expected number',
    ]))
  })

  it('T-U-023 backfills nodeMeta from query_graph action node and clears nodeMetaLoading when settled', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: 1,
        edge_counts_by_relation: { supports: 1 },
        stale_edge_count: 0,
        community_labels: ['Architecture'],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [],
      source_chunks: [{
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: [{
          id: 'edge-scope',
          relation: 'supports',
          target: { chunk_id: 'target', path: 'Docs/Target.md', title: 'Target' },
        }],
      }],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const queryGraph = vi.fn().mockResolvedValue({
      action: 'node',
      chunk_id: 'source-scope',
      key_claims: ['Claim one'],
      chunk_summary: 'Scope summary',
      certainty_level: 'high',
      staleness_risk: 'low',
      external_refs: ['https://example.test/ref'],
      temporal_markers: ['2026-Q2'],
      question_status: 'open',
      question_resolution: 'Needs follow-up',
      community_id: 'community-1',
      community_label: 'Architecture',
      community_summary: 'Architecture cluster',
      content: 'Scope body',
      analyzed: true,
      stale: false,
      analyzed_at: '2026-06-30T00:00:00Z',
    })
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections, queryGraph)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Scope\n\nScope body',
      contentHash: 'hash-node-meta',
    })

    expect(queryGraph).toHaveBeenCalledWith('workspace-1', {
      action: 'node',
      chunk_id: 'source-scope',
    })
    expect(result.nodeMetaLoading).toBe(false)
    expect(result.nodeMeta?.scope).toMatchObject({
      keyClaims: ['Claim one'],
      chunkSummary: 'Scope summary',
      certaintyLevel: 'high',
      stalenessRisk: 'low',
      externalRefs: ['https://example.test/ref'],
      temporalMarkers: ['2026-Q2'],
      questionStatus: 'open',
      questionResolution: 'Needs follow-up',
      communityId: 'community-1',
      communityLabel: 'Architecture',
      communitySummary: 'Architecture cluster',
      content: 'Scope body',
      analyzed: true,
      stale: false,
      analyzedAt: '2026-06-30T00:00:00Z',
    })
  })

  it('T-U-015 and T-U-025 record query_graph diagnostics per failed chunk while keeping valid graph data', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: 2,
        edge_counts_by_relation: { supports: 2 },
        stale_edge_count: 0,
        community_labels: [],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [],
      source_chunks: [{
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: [{
          id: 'edge-scope',
          relation: 'supports',
          target: { chunk_id: 'target-scope', path: 'Docs/Scope.md', title: 'Scope Target' },
        }],
      }, {
        chunk_id: 'source-details',
        heading_path: 'Source > Details',
        connections: [{
          id: 'edge-details',
          relation: 'supports',
          target: { chunk_id: 'target-details', path: 'Docs/Details.md', title: 'Details Target' },
        }],
      }],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const queryGraph = vi.fn()
      .mockResolvedValueOnce({
        action: 'node',
        chunk_id: 'source-scope',
        key_claims: ['Valid claim'],
        chunk_summary: 'Valid summary',
      })
      .mockRejectedValueOnce(new Error('node fetch failed'))
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections, queryGraph)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Scope\n\nScope body\n\n## Details\n\nDetails body',
      contentHash: 'hash-node-meta-partial',
    })

    expect(result.byChunkId.scope.map((connection) => connection.id)).toEqual(['edge-scope'])
    expect(result.byChunkId.details.map((connection) => connection.id)).toEqual(['edge-details'])
    expect(result.nodeMeta?.scope).toMatchObject({
      keyClaims: ['Valid claim'],
      chunkSummary: 'Valid summary',
    })
    expect(result.nodeMeta?.details).toBeUndefined()
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining('Unable to load node metadata for source-details'),
    ]))
  })

  it('T-U-024 merges query_graph edge metadata by edge id and preserves rows on partial failures', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      graph_summary: {
        edge_count: 3,
        edge_counts_by_relation: { supports: 2, depends_on: 1 },
        stale_edge_count: 0,
        community_labels: [],
        has_contradictions: false,
        has_open_questions: false,
        open_question_count: 0,
      },
      overall: [],
      source_chunks: [{
        chunk_id: 'source-scope',
        heading_path: 'Source > Scope',
        connections: [{
          id: 'edge-with-overlay',
          relation: 'supports',
          target: { chunk_id: 'target-one', path: 'Docs/Target.md', title: 'Target' },
        }, {
          id: 'edge-without-overlay',
          relation: 'supports',
          target: { chunk_id: 'target-two', path: 'Docs/Other.md', title: 'Other' },
        }],
      }, {
        chunk_id: 'source-details',
        heading_path: 'Source > Details',
        connections: [{
          id: 'edge-details',
          relation: 'depends_on',
          target: { chunk_id: 'target-three', path: 'Docs/Details.md', title: 'Details' },
        }],
      }],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const queryGraph = vi.fn()
      .mockResolvedValueOnce({ action: 'node', chunk_id: 'source-scope', key_claims: ['Claim one'] })
      .mockResolvedValueOnce({ action: 'node', chunk_id: 'source-details', key_claims: ['Claim two'] })
      .mockResolvedValueOnce({
        action: 'edges',
        chunk_id: 'source-scope',
        edges: [{
          id: 'edge-with-overlay',
          metadata: {
            qualifiers: ['normative', 'derived'],
            source_claims_referenced: [0],
            target_claims_referenced: [1],
            severity: 'high',
            raw_secret: 'Bearer should-not-render',
          },
        }, {
          id: 'unmatched-edge',
          metadata: {
            qualifiers: ['ignored'],
          },
        }],
      })
      .mockRejectedValueOnce(new Error('edge fetch failed for Bearer should-not-leak'))
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections, queryGraph)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Scope\n\nScope body\n\n## Details\n\nDetails body',
      contentHash: 'hash-edge-overlay',
    })

    expect(queryGraph).toHaveBeenCalledWith('workspace-1', {
      action: 'edges',
      chunk_id: 'source-scope',
      direction: 'both',
      include_content: false,
    })
    expect(result.byChunkId.scope[0]).toMatchObject({
      id: 'edge-with-overlay',
      qualifiers: ['normative', 'derived'],
      sourceClaimsReferenced: [0],
      targetClaimsReferenced: [1],
      metadata: { severity: 'high' },
    })
    expect(result.byChunkId.scope[1]).toMatchObject({
      id: 'edge-without-overlay',
      rel: 'supports',
    })
    expect(result.byChunkId.scope[1].qualifiers).toBeUndefined()
    expect(result.byChunkId.details.map((connection) => connection.id)).toEqual(['edge-details'])
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.stringContaining('Unable to load edge metadata for source-details'),
    ]))
    expect(result.diagnostics.join(' ')).not.toContain('should-not-leak')
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
      documentId: 'doc-1',
      markdown,
      contentHash: 'hash-a',
      embeddingNames: ['text-embedding-3-small'],
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

  it('invalidates a cached document connection result on explicit reload', async () => {
    const backend = {
      loadDocumentConnections: vi.fn()
        .mockResolvedValueOnce(buildSemanticConnectionsResult({
          markdown,
          mode: 'embeddings-only',
          connections: [flashqueryConnections[0]],
        }))
        .mockResolvedValueOnce(buildSemanticConnectionsResult({
          markdown,
          mode: 'embeddings-only',
          connections: [flashqueryConnections[1]],
        })),
    }
    const cached = createCachedSemanticConnectionsProvider(backend)
    const input = {
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: '/workspace/Plan.md',
      markdown,
      contentHash: 'same-body-hash',
    }

    const first = await cached.loadDocumentConnections(input)
    cached.invalidateDocumentConnections?.(input)
    const second = await cached.loadDocumentConnections(input)

    expect(backend.loadDocumentConnections).toHaveBeenCalledTimes(2)
    expect(first.overall.map((connection) => connection.id)).toEqual(['conn-1'])
    expect(second.overall.map((connection) => connection.id)).toEqual(['conn-2'])
  })

  it('loads embeddings-only connections from FlashQuery semantic search results', async () => {
    const search = vi.fn().mockResolvedValue({
      documents: [
        {
          filename: 'Source.md',
          fullPath: 'Docs/Source.md',
          title: 'Source',
          score: 0.99,
          matched_chunks: [
            {
              chunk_id: 'source-chunk',
              heading_path: 'Source > Summary',
              content: 'Self match should not be shown.',
              score: 0.99,
            },
          ],
        },
        {
          filename: 'Neighbor.md',
          fullPath: 'Docs/Neighbor.md',
          title: 'Neighbor',
          score: 0.88,
          matched_chunks: [
            {
              chunk_id: 'neighbor-chunk',
              heading_path: 'Neighbor > Design',
              content: 'Neighbor chunk body that should become a snippet.',
              score: 0.88,
            },
          ],
        },
      ],
      memories: [],
      total_documents: 2,
      total_memories: 0,
    })
    const provider = createFlashQuerySemanticConnectionsProvider(search)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nCurrent document body',
      contentHash: 'hash-source',
    })

    expect(search).toHaveBeenCalledWith('workspace-1', expect.objectContaining({
      query: '# Source\n\nCurrent document body',
      mode: 'semantic',
      entity_types: ['documents'],
      limit: 12,
    }))
    expect(result.mode).toBe('embeddings-only')
    expect(result.overall).toHaveLength(1)
    expect(result.overall[0]).toMatchObject({
      id: 'Docs/Neighbor.md#neighbor-chunk',
      score: 0.88,
      target: {
        title: 'Neighbor',
        path: 'Docs/Neighbor.md',
        heading: 'Design',
        chunkId: 'neighbor-chunk',
        snippet: 'Neighbor chunk body that should become a snippet.',
      },
    })
  })

  it('loads whole-document connections as deduped source-chunk outbound links without a text search', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      overall: [
        {
          id: 'Docs/Beta.md#beta-chunk',
          score: 0.94,
          target: {
            chunk_id: 'beta-chunk',
            document_id: 'doc-beta',
            path: 'Docs/Beta.md',
            title: 'Beta',
            heading_path: 'Beta > Strong',
            content: 'Best duplicate target.',
          },
        },
        {
          id: 'Docs/Alpha.md#alpha-chunk',
          score: 0.81,
          target: {
            chunk_id: 'alpha-chunk',
            document_id: 'doc-alpha',
            path: 'Docs/Alpha.md',
            title: 'Alpha',
            heading_path: 'Alpha > Idea',
            content: 'Alpha target.',
          },
        },
      ],
      source_chunks: [
        {
          chunk_id: 'source-root',
          heading_path: 'Source',
          connections: [{
            id: 'Docs/Beta.md#beta-chunk',
            score: 0.72,
            target: {
              chunk_id: 'beta-chunk',
              document_id: 'doc-beta',
              path: 'Docs/Beta.md',
              title: 'Beta',
              heading_path: 'Beta > Weak',
              content: 'Weak duplicate target.',
            },
          }],
        },
        {
          chunk_id: 'source-scope',
          heading_path: 'Source > Scope',
          connections: [{
            id: 'Docs/Beta.md#beta-chunk',
            score: 0.94,
            target: {
              chunk_id: 'beta-chunk',
              document_id: 'doc-beta',
              path: 'Docs/Beta.md',
              title: 'Beta',
              heading_path: 'Beta > Strong',
              content: 'Best duplicate target.',
            },
          },
          {
            id: 'Docs/Alpha.md#alpha-chunk',
            score: 0.81,
            target: {
              chunk_id: 'alpha-chunk',
              document_id: 'doc-alpha',
              path: 'Docs/Alpha.md',
              title: 'Alpha',
              heading_path: 'Alpha > Idea',
              content: 'Alpha target.',
            },
          }],
        },
      ],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Scope\n\nScope body',
      contentHash: 'hash-source',
    })

    expect(search).not.toHaveBeenCalled()
    expect(connections).toHaveBeenCalledWith('workspace-1', {
      identifier: 'Docs/Source.md',
      limit: 200,
      limit_per_chunk: 5,
    })
    expect(result.overall.map((connection) => connection.id)).toEqual([
      'Docs/Beta.md#beta-chunk',
      'Docs/Alpha.md#alpha-chunk',
    ])
    expect(result.byChunkId.source.map((connection) => connection.id)).toEqual(['Docs/Beta.md#beta-chunk'])
    expect(result.byChunkId.scope.map((connection) => connection.id)).toEqual([
      'Docs/Beta.md#beta-chunk',
      'Docs/Alpha.md#alpha-chunk',
    ])
    expect(result.byChunkId.scope[0]).toMatchObject({
      score: 0.94,
      target: {
        title: 'Beta',
        heading: 'Strong',
      },
    })
  })

  it('treats enabled but ungenerated document embeddings as an empty graph', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: 'source-doc', path: 'Docs/Source.md', title: 'Source' },
      overall: [],
      source_chunks: [],
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections)

    const result = await provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro\n\n## Waiting\n\nEmbeddings have not finished yet.',
      contentHash: 'hash-source-empty',
    })

    expect(search).not.toHaveBeenCalled()
    expect(result.overall).toEqual([])
    expect(result.chunkOrder).toEqual(['source', 'waiting'])
    expect(result.byChunkId).toEqual({ source: [], waiting: [] })
  })

  it('surfaces unavailable document connections as an error instead of an empty graph', async () => {
    const search = vi.fn()
    const connections = vi.fn().mockResolvedValue({
      source: { document_id: '', path: '' },
      overall: [],
      source_chunks: [],
      error: 'Document connections are unavailable because no embeddings are configured in flashquery.yml',
    } satisfies FlashQueryDocumentConnectionsResponse)
    const provider = createFlashQuerySemanticConnectionsProvider(search, connections)

    await expect(provider.loadDocumentConnections({
      workspaceId: 'workspace-1',
      editorPanelId: 'editor-1',
      documentPath: 'flashquery://workspace-1/Docs/Source.md',
      markdown: '# Source\n\nIntro',
      contentHash: 'hash-source-error',
    })).rejects.toThrow('Document connections are unavailable')
    expect(search).not.toHaveBeenCalled()
  })
})
