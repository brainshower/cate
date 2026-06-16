import { describe, expect, it } from 'vitest'
import {
  arrangeForDisplay,
  getAllRels,
  scCautionFlags,
  scEdgeLabel,
  type SemanticConnection,
} from './semanticConnections'

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
  it('T-U-004 resolves directed and symmetric edge labels', () => {
    expect(scEdgeLabel('depends_on', 'out')).toBe('Depends on')
    expect(scEdgeLabel('depends_on', 'in')).toBe('Required by')
    expect(scEdgeLabel('contradicts')).toBe('Contradicts')
    expect(scEdgeLabel(undefined, undefined)).toBe('Similarity only')
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
