import { describe, expect, it } from 'vitest'
import {
  areToolCandidatesStale,
  registryRecordsToToolCandidates,
} from './registry'
import type { FlashQueryRegistryRecord } from './registry'

describe('cate-flashquery registry normalization', () => {
  it('T-U-014 returns host-eligible current model, macro, search, native, and brokered MCP candidates', () => {
    const records: FlashQueryRegistryRecord[] = [
      eligible({ name: 'call_model', label: 'Call Model', purpose: 'delegate model work' }),
      eligible({ name: 'call_macro', model: 'macro-runner' }),
      eligible({ name: 'search_tools' }),
      eligible({ name: 'get_document', source: 'flashquery_native', server: 'vault' }),
      eligible({ name: 'github.create_issue', source: 'brokered_mcp', server: 'github', toolId: 'github.create_issue' }),
      eligible({ name: 'deprecated_tool', status: 'deprecated' }),
      eligible({ name: 'unavailable_tool', status: 'unavailable' }),
      eligible({ name: 'removed_tool', status: 'removed' }),
      eligible({ name: 'hidden_tool', hostEligible: false }),
      { name: 'missing_metadata', status: 'current' },
    ]

    const candidates = registryRecordsToToolCandidates(records)

    expect(candidates.map((candidate) => candidate.name)).toEqual([
      'call_model',
      'call_macro',
      'search_tools',
      'get_document',
      'github_create_issue',
    ])
    expect(candidates.find((candidate) => candidate.name === 'call_model')).toMatchObject({
      label: 'Call Model',
      toolId: 'call_model',
      purpose: 'delegate model work',
    })
    expect(candidates.find((candidate) => candidate.name === 'github_create_issue')).toMatchObject({
      source: 'brokered_mcp',
      server: 'github',
      toolId: 'github.create_issue',
    })
  })

  it('T-U-014 accepts hostEligible and metadata fields from registry metadata', () => {
    const candidates = registryRecordsToToolCandidates([{
      name: 'memory.search',
      status: 'current',
      metadata: {
        hostEligible: true,
        source: 'flashquery_native',
        label: 'Search Memories',
        description: 'Search stored memories.',
        inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
      },
    }])

    expect(candidates).toHaveLength(1)
    expect(candidates[0]).toMatchObject({
      name: 'memory_search',
      label: 'Search Memories',
      description: 'Search stored memories.',
      source: 'flashquery_native',
    })
    expect(candidates[0].inputSchema).toEqual({
      type: 'object',
      properties: { query: { type: 'string' } },
    })
  })

  it('T-U-014 gives colliding names stable distinct Pi tool names', () => {
    const candidates = registryRecordsToToolCandidates([
      eligible({ name: 'vault.read', toolId: 'native-read' }),
      eligible({ name: 'vault/read', toolId: 'broker-read' }),
      eligible({ name: 'Vault Read', toolId: 'macro-read' }),
    ])

    expect(candidates.map((candidate) => candidate.name)).toEqual([
      'vault_read',
      'vault_read_2',
      'vault_read_3',
    ])
    expect(registryRecordsToToolCandidates([
      eligible({ name: 'vault.read', toolId: 'native-read' }),
      eligible({ name: 'vault/read', toolId: 'broker-read' }),
      eligible({ name: 'Vault Read', toolId: 'macro-read' }),
    ]).map((candidate) => candidate.name)).toEqual([
      'vault_read',
      'vault_read_2',
      'vault_read_3',
    ])
  })

  it('detects stale candidate lists by stable registration fields', () => {
    const previous = registryRecordsToToolCandidates([eligible({ name: 'call_model' })])
    const same = registryRecordsToToolCandidates([eligible({ name: 'call_model' })])
    const next = registryRecordsToToolCandidates([eligible({ name: 'call_macro' })])

    expect(areToolCandidatesStale(previous, same)).toBe(false)
    expect(areToolCandidatesStale(previous, next)).toBe(true)
  })
})

function eligible(overrides: FlashQueryRegistryRecord): FlashQueryRegistryRecord {
  return {
    name: 'tool',
    status: 'current',
    hostEligible: true,
    inputSchema: { type: 'object', properties: {} },
    ...overrides,
  }
}
