import { FLASHQUERY_MANAGED_FRONTMATTER_FIELDS } from '../../shared/types'

export type ParseFrontmatterYamlResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string }

export interface StripManagedFrontmatterResult {
  frontmatter: Record<string, unknown>
  removedManagedFieldCount: number
  originalFieldCount: number
}

export function frontmatterToYaml(frontmatter: Record<string, unknown> | undefined): string {
  if (!frontmatter || Object.keys(frontmatter).length === 0) return ''
  return Object.entries(frontmatter)
    .map(([key, value]) => `${key}: ${formatYamlValue(value)}`)
    .join('\n')
}

export function parseFrontmatterYaml(text: string): ParseFrontmatterYamlResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true, value: {} }
  if (trimmed.startsWith('-')) {
    return { ok: false, error: 'Frontmatter YAML must be an object, not a list.' }
  }

  const value: Record<string, unknown> = {}
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  let index = 0

  while (index < lines.length) {
    const rawLine = lines[index]
    index += 1
    if (!rawLine.trim() || rawLine.trimStart().startsWith('#')) continue
    if (/^\s/.test(rawLine)) {
      return { ok: false, error: 'Frontmatter YAML must use top-level object keys.' }
    }

    const match = /^([^:#][^:]*):(?:\s*(.*))?$/.exec(rawLine)
    if (!match) return { ok: false, error: `Invalid YAML near "${rawLine.trim()}".` }
    const key = match[1].trim()
    const rawValue = match[2] ?? ''
    if (!key) return { ok: false, error: 'Frontmatter YAML contains an empty key.' }

    if (rawValue === '') {
      const list: unknown[] = []
      while (index < lines.length && /^\s+-\s+/.test(lines[index])) {
        list.push(parseScalar(lines[index].replace(/^\s+-\s+/, '')))
        index += 1
      }
      value[key] = list.length > 0 ? list : ''
      continue
    }

    value[key] = parseScalar(rawValue)
  }

  return { ok: true, value }
}

export function stripManagedFrontmatterFields(frontmatter: Record<string, unknown>): StripManagedFrontmatterResult {
  const managed = new Set<string>(FLASHQUERY_MANAGED_FRONTMATTER_FIELDS)
  const filtered = Object.fromEntries(
    Object.entries(frontmatter).filter(([key]) => !managed.has(key)),
  )
  return {
    frontmatter: filtered,
    originalFieldCount: Object.keys(frontmatter).length,
    removedManagedFieldCount: Object.keys(frontmatter).length - Object.keys(filtered).length,
  }
}

function formatYamlValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(formatInlineScalar).join(', ')}]`
  if (value && typeof value === 'object') return JSON.stringify(value)
  return formatInlineScalar(value)
}

function formatInlineScalar(value: unknown): string {
  if (typeof value === 'string') {
    if (!value || /[:#\[\]{},&*?|<>=!%@`'"]|\s$|^\s/.test(value)) return JSON.stringify(value)
    return value
  }
  if (value === null) return 'null'
  return String(value)
}

function parseScalar(raw: string): unknown {
  const value = raw.trim()
  if (value === 'null' || value === '~') return null
  if (value === 'true') return true
  if (value === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value)
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return value.startsWith('"') ? JSON.parse(value) : value.slice(1, -1)
    } catch {
      return value.slice(1, -1)
    }
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const body = value.slice(1, -1).trim()
    if (!body) return []
    return body.split(',').map((item) => parseScalar(item))
  }
  if (value.startsWith('{') || value.startsWith('}')) return value
  return value
}
