import { describe, expect, it } from 'vitest'
import {
  SC_EDGE,
  arrangeForDisplay,
  getAllRels,
  scCautionFlags,
  scEdgeLabel,
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
})
