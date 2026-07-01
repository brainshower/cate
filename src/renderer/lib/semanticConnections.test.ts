import { describe, expect, it } from 'vitest'
import {
  SC_EDGE,
  arrangeForDisplay,
  getAllRels,
  groupWholeDocumentConnections,
  groupSelectionClaimsAndConnections,
  isActiveSemanticConnection,
  matchSemanticConnectionFilter,
  matchSemanticSectionFilter,
  scEdgeMetadataProse,
  scCautionFlags,
  scEdgeLabel,
  scScoreTone,
  semanticClaimText,
  scUnknownRelationDiagnostic,
  type SemanticConnection,
  type SemanticConnectionRel,
} from './semanticConnections'

const graphRelations: SemanticConnectionRel[] = [
  'contains',
  'references',
  'depends_on',
  'supersedes',
  'rationale_for',
  'elaborates',
  'summarizes',
  'contradicts',
  'duplicates',
  'supports',
  'extends',
  'resolves',
  'semantically_similar_to',
]

const embeddingsOnly: SemanticConnection[] = [
  {
    id: 'a',
    target: {
      title: 'Alpha',
      path: 'Docs/Alpha.md',
      heading: 'Intro',
      chunkId: 'alpha-intro',
      snippet: 'Alpha snippet',
    },
    score: 0.42,
  },
  {
    id: 'b',
    target: {
      title: 'Beta',
      path: 'Docs/Beta.md',
      heading: 'Plan',
      chunkId: 'beta-plan',
      snippet: 'Beta snippet',
    },
    score: 0.91,
  },
]

const mixedTyped: SemanticConnection[] = [
  {
    id: 'similar',
    target: { title: 'Similar', path: 'Docs/S.md', chunkId: 'similar', snippet: 'similar' },
    score: 0.99,
  },
  {
    id: 'depends-low',
    rel: 'depends_on',
    dir: 'out',
    target: { title: 'Depends Low', path: 'Docs/L.md', chunkId: 'depends-low', snippet: 'depends low' },
    score: 0.2,
  },
  {
    id: 'supersedes',
    rel: 'supersedes',
    dir: 'in',
    target: { title: 'Supersedes', path: 'Docs/P.md', chunkId: 'supersedes', snippet: 'supersedes' },
    score: 0.6,
  },
  {
    id: 'contradicts',
    rel: 'contradicts',
    target: { title: 'Contradicts', path: 'Docs/C.md', chunkId: 'contradicts', snippet: 'contradicts' },
    score: 0.5,
  },
  {
    id: 'depends-high',
    rel: 'depends_on',
    dir: 'out',
    target: { title: 'Depends High', path: 'Docs/H.md', chunkId: 'depends-high', snippet: 'depends high' },
    score: 0.8,
  },
]

describe('semantic connection utilities', () => {
  it('T-U-001 proves complete relation union and metadata map covers all graph relations', () => {
    expect(Object.keys(SC_EDGE).sort()).toEqual([...graphRelations].sort())
    for (const rel of graphRelations) {
      const edge = SC_EDGE[rel]
      expect(edge).toMatchObject({
        kind: expect.stringMatching(/^(directed|symmetric)$/),
        tone: expect.stringMatching(/^(neutral|caution|warn)$/),
        color: expect.stringMatching(/^#/),
        icon: expect.any(String),
      })
      if (edge.kind === 'directed') {
        expect(edge.out).toEqual(expect.any(String))
        expect(edge.in).toEqual(expect.any(String))
      } else {
        expect(edge.sym).toEqual(expect.any(String))
      }
    }
  })

  it('T-U-007 resolves directed inbound/outbound and symmetric labels correctly', () => {
    expect(scEdgeLabel('depends_on', 'out')).toBe('Depends on')
    expect(scEdgeLabel('depends_on', 'in')).toBe('Required by')
    expect(scEdgeLabel('contradicts')).toBe('Contradicts')
    expect(scEdgeLabel(undefined, undefined)).toBe('Similarity only')
  })

  it('T-U-008 renders unknown relation strings safely and exposes a diagnostic path', () => {
    expect(scEdgeLabel('requires_manual_review' as SemanticConnectionRel)).toBe('Requires manual review')
    expect(scUnknownRelationDiagnostic('requires_manual_review')).toBe('Unknown semantic relation: requires_manual_review')
  })

  it('T-U-005 returns score-descending order in similarity mode', () => {
    expect(arrangeForDisplay(embeddingsOnly, 'similarity').map((connection) => connection.id)).toEqual(['b', 'a'])
  })

  it('T-U-006 nature mode prioritizes warn, then caution, then remaining groups by max score', () => {
    expect(arrangeForDisplay(mixedTyped, 'nature').map((connection) => connection.id)).toEqual([
      'contradicts',
      'supersedes',
      'similar',
      'depends-high',
      'depends-low',
    ])
  })

  it('T-U-007 computes document-wide rel set and ignores untyped connections', () => {
    expect(getAllRels({ overall: embeddingsOnly, byChunkId: { chunk: mixedTyped } })).toEqual([
      'contradicts',
      'depends_on',
      'supersedes',
    ])
  })

  it('T-U-008 returns zero caution counts for embeddings-only data and counts typed caution tones', () => {
    expect(scCautionFlags(embeddingsOnly)).toEqual({ warn: 0, caution: 0, total: 0 })
    expect(scCautionFlags(mixedTyped)).toEqual({ warn: 1, caution: 1, total: 2 })
  })

  it('T-U-027 classifies score tone at locked boundary thresholds', () => {
    expect(scScoreTone(0.39)).toBe('red')
    expect(scScoreTone(0.4)).toBe('orange')
    expect(scScoreTone(0.59)).toBe('orange')
    expect(scScoreTone(0.6)).toBe('teal')
    expect(scScoreTone(0.79)).toBe('teal')
    expect(scScoreTone(0.8)).toBe('green')
  })

  it('T-C-046 helper support converts qualifiers and known metadata keys into readable prose', () => {
    expect(scEdgeMetadataProse({
      qualifiers: ['source-of-truth', 'needs review'],
      metadata: {
        severity: 'high',
        strength: 'strong',
        dependency_type: 'runtime',
        internal_trace: { nested: true },
      },
    })).toEqual([
      'Qualifier: source-of-truth',
      'Qualifier: needs review',
      'Severity: high',
      'Strength: strong',
      'Dependency type: runtime',
    ])
  })

  it('T-C-046 helper support ignores unsupported metadata without throwing or dumping raw JSON', () => {
    expect(scEdgeMetadataProse({
      qualifiers: ['  confirmed  ', ''],
      metadata: {
        severity: ['critical'],
        strength: null,
        dependency_type: { nested: true },
        debug: { raw: true },
      },
    })).toEqual(['Qualifier: confirmed'])
    expect(scEdgeMetadataProse({ metadata: null })).toEqual([])
    expect(scEdgeMetadataProse({ metadata: 'not-object' })).toEqual([])
  })

  it('T-U-017 groups whole-document relations in graph priority order with similarity last', () => {
    const grouped = groupWholeDocumentConnections([
      { ...mixedTyped[0], id: 'untyped' },
      { ...mixedTyped[1], id: 'depends' },
      { ...mixedTyped[3], id: 'contradicts' },
      {
        id: 'similarity',
        rel: 'semantically_similar_to',
        confidenceScore: 0.99,
        target: { title: 'Similarity', path: 'Docs/S.md', chunkId: 'similarity', snippet: 'similarity' },
      },
    ])

    expect(grouped.map((group) => group.key)).toEqual([
      'contradicts',
      'depends_on',
      'similarity',
      'semantically_similar_to',
    ])
  })

  it('T-U-018 sorts relation groups by confidence score with score fallback', () => {
    const grouped = groupWholeDocumentConnections([
      {
        id: 'score-fallback',
        rel: 'supports',
        score: 0.8,
        target: { title: 'Score fallback', path: 'Docs/F.md', chunkId: 'score-fallback', snippet: 'fallback' },
      },
      {
        id: 'confidence-high',
        rel: 'supports',
        confidenceScore: 0.9,
        score: 0.1,
        target: { title: 'Confidence high', path: 'Docs/H.md', chunkId: 'confidence-high', snippet: 'high' },
      },
      {
        id: 'confidence-low',
        rel: 'supports',
        confidenceScore: 0.4,
        score: 0.99,
        target: { title: 'Confidence low', path: 'Docs/L.md', chunkId: 'confidence-low', snippet: 'low' },
      },
    ])

    expect(grouped).toHaveLength(1)
    expect(grouped[0].connections.map((connection) => connection.id)).toEqual([
      'confidence-high',
      'score-fallback',
      'confidence-low',
    ])
  })

  it('T-C-040/T-C-041/T-C-042 helper preconditions filter stale/deleted edges before selection grouping', () => {
    const active = { ...mixedTyped[1], id: 'active-edge', status: 'active' }
    const stale = { ...mixedTyped[1], id: 'stale-edge', status: 'stale' }
    const deleted = { ...mixedTyped[1], id: 'deleted-edge', status: 'deleted' }

    expect(isActiveSemanticConnection(active)).toBe(true)
    expect(isActiveSemanticConnection(stale)).toBe(false)
    expect(isActiveSemanticConnection(deleted)).toBe(false)

    const grouped = groupSelectionClaimsAndConnections(['Claim one'], [active, stale, deleted])

    expect(grouped.generalConnections.map((connection) => connection.id)).toEqual(['active-edge'])
    expect(grouped.generalConnections).not.toContainEqual(expect.objectContaining({ id: 'stale-edge' }))
    expect(grouped.generalConnections).not.toContainEqual(expect.objectContaining({ id: 'deleted-edge' }))
  })

  it('T-C-038/T-C-039 helper preconditions extract string and structured claim text in source order', () => {
    const grouped = groupSelectionClaimsAndConnections([
      'First string claim',
      { text: 'Structured text claim', basis: 'deferred-ui' },
      { claim: 'Structured claim field' },
      { content: 'Structured content field' },
      { unsupported: true },
    ], [])

    expect(grouped.claims.map((claim) => claim.text)).toEqual([
      'First string claim',
      'Structured text claim',
      'Structured claim field',
      'Structured content field',
    ])
    expect(semanticClaimText({ unsupported: true })).toBeNull()
  })

  it('T-C-040/T-C-041/T-C-042 helper preconditions nest valid claim-ref edges and route invalid refs to General connections', () => {
    const linkedToSecond: SemanticConnection = {
      id: 'linked-to-second',
      sourceClaimsReferenced: [1],
      rel: 'supports',
      target: { title: 'Linked', path: 'Docs/Linked.md', chunkId: 'linked', snippet: 'Linked snippet' },
    }
    const linkedToBoth: SemanticConnection = {
      id: 'linked-to-both',
      sourceClaimsReferenced: [0, 1],
      rel: 'depends_on',
      target: { title: 'Both', path: 'Docs/Both.md', chunkId: 'both', snippet: 'Both snippet' },
    }
    const invalidRef: SemanticConnection = {
      id: 'invalid-ref',
      sourceClaimsReferenced: [99],
      rel: 'references',
      target: { title: 'Invalid', path: 'Docs/Invalid.md', chunkId: 'invalid', snippet: 'Invalid snippet' },
    }
    const absentRef: SemanticConnection = {
      id: 'absent-ref',
      rel: 'references',
      target: { title: 'General', path: 'Docs/General.md', chunkId: 'general', snippet: 'General snippet' },
    }

    const grouped = groupSelectionClaimsAndConnections([
      'Claim zero',
      'Claim one',
    ], [linkedToSecond, linkedToBoth, invalidRef, absentRef])

    expect(grouped.claims.map((claim) => claim.text)).toEqual(['Claim zero', 'Claim one'])
    expect(grouped.claims[0].connections.map((connection) => connection.id)).toEqual(['linked-to-both'])
    expect(grouped.claims[1].connections.map((connection) => connection.id)).toEqual(['linked-to-second', 'linked-to-both'])
    expect(grouped.generalConnections.map((connection) => connection.id)).toEqual(['invalid-ref', 'absent-ref'])
  })

  it('T-U-019 connection matcher searches required data-bearing fields', () => {
    const connection: SemanticConnection = {
      id: 'filter-connection',
      rel: 'depends_on',
      dir: 'in',
      reasoning: 'Reasoning mentions migration blockers',
      qualifiers: ['runtime critical'],
      metadata: {
        severity: 'high',
        strength: 'strong',
        dependency_type: 'schema',
        internal_note: 'not searchable',
      },
      target: {
        title: 'Architecture Notes',
        path: 'Docs/Architecture.md',
        heading: 'Query Graph Bridge',
        chunkId: 'query-graph-bridge',
        snippet: 'Snippet mentions provider overlay',
        body: 'Body covers local renderer filtering',
      },
    }

    expect(matchSemanticConnectionFilter(connection, 'architecture')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'query graph')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'provider overlay')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'migration blockers')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'local renderer')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'runtime critical')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'schema')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'required by')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'not searchable')).toBe(false)
  })

  it('T-U-020 section matcher searches section fields, claims, and owned connections', () => {
    const connection: SemanticConnection = {
      id: 'section-owned',
      rel: 'supports',
      target: {
        title: 'Design Memo',
        path: 'Docs/Design.md',
        heading: 'Filter Contract',
        chunkId: 'filter-contract',
        snippet: 'Connection snippet carries owned edge content',
      },
    }

    const section = {
      heading: 'Selection Detail',
      nodeMeta: {
        chunkSummary: 'Summary names the chrome state',
        questionResolution: 'Question resolution mentions escape handling',
        keyClaims: [
          'Claim text mentions whole claim visibility',
          { text: 'Structured claim remains searchable', basis: 'basis-label-excluded' },
        ],
        communitySummary: 'Community summary is structural only',
        externalRefs: ['https://example.invalid/structural-only'],
        temporalMarkers: ['Q3 structural marker'],
      },
      connections: [connection],
    }

    expect(matchSemanticSectionFilter(section, 'selection detail')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'chrome state')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'escape handling')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'whole claim visibility')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'structured claim')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'owned edge content')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'community summary')).toBe(false)
    expect(matchSemanticSectionFilter(section, 'example.invalid')).toBe(false)
    expect(matchSemanticSectionFilter(section, 'structural marker')).toBe(false)
    expect(matchSemanticSectionFilter(section, 'basis-label-excluded')).toBe(false)
  })

  it('T-U-021 structural UI text, counts, and labels do not determine matches', () => {
    const connection: SemanticConnection = {
      id: 'structural-negative',
      rel: 'contradicts',
      target: {
        title: 'Only Data Title',
        path: 'Docs/Data.md',
        heading: 'Only Data Heading',
        chunkId: 'data',
        snippet: 'Only data snippet',
      },
    }

    const section = {
      heading: 'Only Section Heading',
      nodeMeta: {
        chunkSummary: 'Only section overview',
        keyClaims: ['Only claim text'],
        questionResolution: 'Only resolution text',
        communitySummary: 'Dominant community summary',
        temporalMarkers: ['2026-07-01'],
        externalRefs: ['https://docs.example/visible-ref'],
      },
      connections: [connection],
    }

    expect(matchSemanticConnectionFilter(connection, 'Needs attention')).toBe(false)
    expect(matchSemanticConnectionFilter(connection, 'Connections')).toBe(false)
    expect(matchSemanticConnectionFilter(connection, '2')).toBe(false)
    expect(matchSemanticSectionFilter(section, 'Summary')).toBe(false)
    expect(matchSemanticSectionFilter(section, 'Dominant community')).toBe(false)
    expect(matchSemanticSectionFilter(section, 'visible-ref')).toBe(false)
    expect(matchSemanticSectionFilter(section, '2026-07-01')).toBe(false)
  })

  it('T-U-022 matching is trimmed case-insensitive substring matching with deterministic blank handling', () => {
    const connection: SemanticConnection = {
      id: 'case-insensitive',
      target: {
        title: 'Case Study',
        path: 'Docs/Case.md',
        heading: 'Mixed Case Heading',
        chunkId: 'case',
        snippet: 'AlphaBetaGamma',
      },
    }
    const section = {
      heading: 'Filtering Rules',
      nodeMeta: { keyClaims: ['Substring Matching'] },
      connections: [connection],
    }

    expect(matchSemanticConnectionFilter(connection, '  betag  ')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, 'MIXED case')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, '')).toBe(true)
    expect(matchSemanticConnectionFilter(connection, '   ')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'string match')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'FILTERING')).toBe(true)
    expect(matchSemanticSectionFilter(section, 'missing')).toBe(false)
  })
})
