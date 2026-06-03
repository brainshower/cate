import type { FlashQueryDocumentPart } from './types'

export interface FlashQueryUriParts {
  workspaceId: string
  vaultPath: string
  part: FlashQueryDocumentPart
}

function encodePath(path: string): string {
  if (path === '') return ''
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/')
}

function decodePath(path: string): string | null {
  try {
    return path.split('/').map((segment) => decodeURIComponent(segment)).join('/')
  } catch {
    return null
  }
}

export function buildVaultUri(workspaceId: string, vaultPath: string, part?: FlashQueryDocumentPart): string {
  const baseUri = `flashquery://${encodeURIComponent(workspaceId)}/${encodePath(vaultPath)}`
  return part && part !== 'body' ? `${baseUri}?part=${part}` : baseUri
}

export function parseVaultUri(uri: string): FlashQueryUriParts | null {
  const match = /^flashquery:\/\/([^/]+)\/?(.*)$/.exec(uri)
  if (!match) return null

  try {
    const workspaceId = decodeURIComponent(match[1])
    const rawPathAndQuery = match[2] ?? ''
    const queryStart = rawPathAndQuery.indexOf('?')
    const rawPath = queryStart >= 0 ? rawPathAndQuery.slice(0, queryStart) : rawPathAndQuery
    const rawQuery = queryStart >= 0 ? rawPathAndQuery.slice(queryStart + 1) : ''
    const part = parsePart(rawQuery)
    if (!part) return null
    const decodedPath = decodePath(rawPath)
    if (!workspaceId || decodedPath === null) return null
    return { workspaceId, vaultPath: decodedPath, part }
  } catch {
    return null
  }
}

function parsePart(query: string): FlashQueryDocumentPart | null {
  if (!query) return 'body'
  const params = new URLSearchParams(query)
  if ([...params.keys()].some((key) => key !== 'part')) return null
  const part = params.get('part') ?? 'body'
  return part === 'body' || part === 'frontmatter' ? part : null
}
