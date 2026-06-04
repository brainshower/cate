import type { FlashQueryExtensionClient } from './client'
import type { FlashQueryRefDiagnostic } from './diagnostics'

const REF_PATTERN = /\{\{ref:([^}]+)\}\}/g

export function findFlashQueryRefs(value: unknown): string[] {
  const refs = new Set<string>()
  collectRefs(value, refs)
  return Array.from(refs)
}

export async function resolveFlashQueryRefs(
  client: FlashQueryExtensionClient,
  refs: string[],
  options: { signal?: AbortSignal } = {},
): Promise<FlashQueryRefDiagnostic[]> {
  const diagnostics: FlashQueryRefDiagnostic[] = []
  for (const path of refs) {
    try {
      const result = await client.callTool('get_document', { path, include: ['body'] }, { signal: options.signal })
      if (isErrorResult(result)) {
        diagnostics.push({ path, resolved: false, error: extractErrorText(result) })
      } else {
        diagnostics.push({ path, resolved: true, body: extractBody(result) })
      }
    } catch (err) {
      diagnostics.push({ path, resolved: false, error: err instanceof Error ? err.message : String(err) })
    }
  }
  return diagnostics
}

function collectRefs(value: unknown, refs: Set<string>): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(REF_PATTERN)) {
      const ref = match[1]?.trim()
      if (ref) refs.add(ref)
    }
    return
  }
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs)
    return
  }
  for (const item of Object.values(value as Record<string, unknown>)) collectRefs(item, refs)
}

function isErrorResult(result: unknown): boolean {
  return Boolean(result && typeof result === 'object' && (result as Record<string, unknown>).isError === true)
}

function extractErrorText(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined
  const content = (result as Record<string, unknown>).content
  if (!Array.isArray(content)) return undefined
  const text = content.find((item): item is { type: 'text'; text: string } => {
    return Boolean(item && typeof item === 'object' && (item as Record<string, unknown>).type === 'text' && typeof (item as Record<string, unknown>).text === 'string')
  })
  return text?.text
}

function extractBody(result: unknown): string | undefined {
  if (!result || typeof result !== 'object') return undefined
  const record = result as Record<string, unknown>
  if (typeof record.body === 'string') return record.body
  const content = record.content
  if (!Array.isArray(content)) return undefined
  const text = content.find((item): item is { type: 'text'; text: string } => {
    return Boolean(item && typeof item === 'object' && (item as Record<string, unknown>).type === 'text' && typeof (item as Record<string, unknown>).text === 'string')
  })
  return text?.text
}
