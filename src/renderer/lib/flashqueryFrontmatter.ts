import { FLASHQUERY_MANAGED_FRONTMATTER_FIELDS } from '../../shared/types'
import { parse, stringify } from 'yaml'

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
  return stringify(frontmatter).trimEnd()
}

export function parseFrontmatterYaml(text: string): ParseFrontmatterYamlResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: true, value: {} }
  try {
    const value = parse(text)
    if (!isPlainRecord(value)) {
      return {
        ok: false,
        error: Array.isArray(value)
          ? 'Frontmatter YAML must be an object, not a list.'
          : 'Frontmatter YAML must be an object.',
      }
    }
    return { ok: true, value }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Invalid YAML.',
    }
  }
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

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}
