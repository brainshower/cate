import { describe, expect, it } from 'vitest'
import { buildVaultUri, parseVaultUri } from './flashqueryUri'

describe('shared FlashQuery URI helpers', () => {
  it('builds and parses an empty path', () => {
    const uri = buildVaultUri('workspace-1', '')

    expect(uri).toBe('flashquery://workspace-1/')
    expect(parseVaultUri(uri)).toEqual({ workspaceId: 'workspace-1', vaultPath: '', part: 'body' })
  })

  it('round-trips nested paths', () => {
    const uri = buildVaultUri('workspace-1', 'docs/Requirements.md')

    expect(parseVaultUri(uri)).toEqual({ workspaceId: 'workspace-1', vaultPath: 'docs/Requirements.md', part: 'body' })
  })

  it('builds the canonical nested path URI', () => {
    expect(buildVaultUri('ws-abc', 'foo/bar.md')).toBe('flashquery://ws-abc/foo/bar.md')
  })

  it('encodes spaces and reserved characters in path segments', () => {
    const uri = buildVaultUri('workspace 1', 'a folder/query #1?.md')

    expect(uri).toBe('flashquery://workspace%201/a%20folder/query%20%231%3F.md')
    expect(parseVaultUri(uri)).toEqual({ workspaceId: 'workspace 1', vaultPath: 'a folder/query #1?.md', part: 'body' })
  })

  it('round-trips percent signs and non-ASCII path segments', () => {
    const vaultPath = 'résumé/東京/100%.md'
    const uri = buildVaultUri('ws-å', vaultPath)

    expect(uri).toBe('flashquery://ws-%C3%A5/r%C3%A9sum%C3%A9/%E6%9D%B1%E4%BA%AC/100%25.md')
    expect(parseVaultUri(uri)).toEqual({ workspaceId: 'ws-å', vaultPath, part: 'body' })
  })

  it('preserves leading and trailing slashes in vault paths', () => {
    const uri = buildVaultUri('workspace-1', '/leading/trailing/')

    expect(parseVaultUri(uri)).toEqual({ workspaceId: 'workspace-1', vaultPath: '/leading/trailing/', part: 'body' })
  })

  it('T-U-001 parses body and frontmatter document parts without folding query text into the path', () => {
    expect(parseVaultUri('flashquery://workspace-1/Docs/Plan.md')).toEqual({
      workspaceId: 'workspace-1',
      vaultPath: 'Docs/Plan.md',
      part: 'body',
    })
    expect(parseVaultUri('flashquery://workspace-1/Docs/Plan.md?part=body')).toEqual({
      workspaceId: 'workspace-1',
      vaultPath: 'Docs/Plan.md',
      part: 'body',
    })
    expect(parseVaultUri('flashquery://workspace-1/Docs/Plan.md?part=frontmatter')).toEqual({
      workspaceId: 'workspace-1',
      vaultPath: 'Docs/Plan.md',
      part: 'frontmatter',
    })
    expect(buildVaultUri('workspace-1', 'Docs/Plan.md', 'frontmatter')).toBe('flashquery://workspace-1/Docs/Plan.md?part=frontmatter')
  })

  it('T-U-001 preserves encoded literal question marks while rejecting bad part values', () => {
    const uri = buildVaultUri('workspace-1', 'a folder/query #1?.md')

    expect(uri).toBe('flashquery://workspace-1/a%20folder/query%20%231%3F.md')
    expect(parseVaultUri('flashquery://workspace-1/a%20folder/query%20%231%3F.md?part=frontmatter')).toEqual({
      workspaceId: 'workspace-1',
      vaultPath: 'a folder/query #1?.md',
      part: 'frontmatter',
    })
    expect(parseVaultUri('flashquery://workspace-1/Docs/Plan.md?part=bad')).toBeNull()
  })

  it('returns null for non-FlashQuery URIs and malformed escapes', () => {
    expect(parseVaultUri('https://workspace-1/path')).toBeNull()
    expect(parseVaultUri('file:///local/path.md')).toBeNull()
    expect(parseVaultUri('not-a-uri')).toBeNull()
    expect(parseVaultUri('flashquery://workspace-1/%E0%A4%A')).toBeNull()
  })
})
