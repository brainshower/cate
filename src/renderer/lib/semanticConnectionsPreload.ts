import {
  createFlashQuerySemanticConnectionsProvider,
} from './semanticConnectionsProvider'
import type {
  SemanticConnectionsProvider,
  SemanticConnectionsProviderInput,
  SemanticConnectionsResult,
} from './semanticConnections'

const flashQueryProvider = createFlashQuerySemanticConnectionsProvider()

export function semanticConnectionsContentHash(value: string): string {
  let hash = 0
  for (let index = 0; index < value.length; index++) {
    hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0
  }
  return String(hash)
}

export function getDefaultSemanticConnectionsProvider(): SemanticConnectionsProvider {
  const e2eProvider = typeof window !== 'undefined'
    ? window.__cateE2E?.semanticConnectionsProvider?.()
    : undefined
  return e2eProvider ?? flashQueryProvider
}

export function semanticConnectionsInput(input: {
  workspaceId: string
  editorPanelId: string
  documentPath: string
  markdown: string
}): SemanticConnectionsProviderInput {
  return {
    workspaceId: input.workspaceId,
    editorPanelId: input.editorPanelId,
    documentPath: input.documentPath,
    markdown: input.markdown,
    contentHash: semanticConnectionsContentHash(input.markdown),
  }
}

export function preloadSemanticConnections(input: {
  workspaceId: string
  editorPanelId: string
  documentPath: string
  markdown: string
  invalidate?: boolean
}): Promise<SemanticConnectionsResult> | null {
  if (!input.markdown.trim()) return null
  const provider = getDefaultSemanticConnectionsProvider()
  const request = semanticConnectionsInput(input)
  if (input.invalidate) provider.invalidateDocumentConnections?.(request)
  return provider.loadDocumentConnections(request)
}
