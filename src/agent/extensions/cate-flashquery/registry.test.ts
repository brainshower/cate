import { describe, expect, it } from 'vitest'
import {
  areToolCandidatesStale,
  registryRecordsToToolCandidates,
} from './registry'
import type { FlashQueryRegistryRecord } from './registry'

describe('cate-flashquery registry normalization', () => {
  it('T-U-014 returns real tools/list model, macro, search, native, and brokered MCP candidates', () => {
    const records: FlashQueryRegistryRecord[] = [
      realTool({ name: 'call_model', label: 'Call Model', purpose: 'delegate model work' }),
      realTool({ name: 'call_macro', model: 'macro-runner' }),
      realTool({ name: 'search_tools' }),
      realTool({ name: 'get_document', server: 'vault' }),
      realTool({ name: 'github.create_issue', server: 'github' }),
      eligible({ name: 'deprecated_tool', status: 'deprecated' }),
      eligible({ name: 'unavailable_tool', status: 'unavailable' }),
      eligible({ name: 'removed_tool', status: 'removed' }),
      eligible({ name: 'hidden_tool', hostEligible: false }),
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
      server: 'github',
      toolId: 'github.create_issue',
    })
  })

  it('T-U-014 accepts richer hostEligible and metadata fields when FlashQuery emits them', () => {
    const candidates = registryRecordsToToolCandidates([
      {
        name: 'memory.search',
        status: 'final',
        metadata: {
          hostEligible: true,
          source: 'flashquery_native',
          label: 'Search Memories',
          description: 'Search stored memories.',
          inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
        },
      },
      {
        name: 'macro.run',
        metadata: {
          status: 'transitional',
          hostEligible: true,
        },
      },
      {
        name: 'legacy.current',
        status: 'current',
        hostEligible: true,
      },
    ])

    expect(candidates).toHaveLength(3)
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
    expect(candidates.map((candidate) => candidate.name)).toEqual([
      'memory_search',
      'macro_run',
      'legacy_current',
    ])
  })

  it('T-U-014 rejects enriched records unless hostEligible is true and status is a current FlashQuery status', () => {
    const records: FlashQueryRegistryRecord[] = [
      eligible({ name: 'final_tool', status: 'final' }),
      eligible({ name: 'transitional_tool', status: 'transitional' }),
      eligible({ name: 'legacy_current_tool', status: 'current' }),
      eligible({ name: 'removed_tool', status: 'removed' }),
      eligible({ name: 'deprecated_tool', status: 'deprecated' }),
      eligible({ name: 'unavailable_tool', status: 'unavailable' }),
      eligible({ name: 'experimental_tool', status: 'experimental' }),
      eligible({ name: 'draft_tool', status: 'draft' }),
      eligible({ name: 'unknown_status_tool', status: 'legacy' }),
      { name: 'status_only_tool', status: 'final', inputSchema: { type: 'object', properties: {} } },
      { name: 'host_only_tool', hostEligible: true, inputSchema: { type: 'object', properties: {} } },
      eligible({
        name: 'metadata_false_tool',
        metadata: { status: 'final', hostEligible: false },
      }),
    ]

    expect(registryRecordsToToolCandidates(records).map((candidate) => candidate.name)).toEqual([
      'final_tool',
      'transitional_tool',
      'legacy_current_tool',
    ])
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

function realTool(overrides: FlashQueryRegistryRecord): FlashQueryRegistryRecord {
  return {
    name: 'tool',
    inputSchema: { type: 'object', properties: {} },
    ...overrides,
  }
}

function eligible(overrides: FlashQueryRegistryRecord): FlashQueryRegistryRecord {
  return {
    name: 'tool',
    status: 'final',
    hostEligible: true,
    inputSchema: { type: 'object', properties: {} },
    ...overrides,
  }
}
