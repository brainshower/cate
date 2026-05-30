export function toRelativePath(absPath: string, rootPath: string): string {
  const normAbs = absPath.replace(/\\/g, '/')
  const normRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '')
  if (!normAbs.startsWith(normRoot + '/')) return absPath
  return normAbs.slice(normRoot.length + 1)
}

export function toAbsolutePath(relPath: string, rootPath: string): string {
  if (relPath.startsWith('/') || /^[A-Za-z]:/.test(relPath)) return relPath
  // URI schemes (flashquery://, file://, http://, ...) are already absolute references.
  if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(relPath)) return relPath
  const normRoot = rootPath.replace(/\\/g, '/').replace(/\/$/, '')
  const normRel = relPath.replace(/\\/g, '/')
  const joined = normRoot + '/' + normRel
  if (typeof process !== 'undefined' && process.platform === 'win32') return joined.replace(/\//g, '\\')
  return joined
}
