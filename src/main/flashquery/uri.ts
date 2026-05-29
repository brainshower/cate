export interface FlashQueryUriParts {
  workspaceId: string
  vaultPath: string
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

export function buildVaultUri(workspaceId: string, vaultPath: string): string {
  return `flashquery://${encodeURIComponent(workspaceId)}/${encodePath(vaultPath)}`
}

export function parseVaultUri(uri: string): FlashQueryUriParts | null {
  const match = /^flashquery:\/\/([^/]+)\/?(.*)$/.exec(uri)
  if (!match) return null

  try {
    const workspaceId = decodeURIComponent(match[1])
    const decodedPath = decodePath(match[2] ?? '')
    if (!workspaceId || decodedPath === null) return null
    return { workspaceId, vaultPath: decodedPath }
  } catch {
    return null
  }
}
