import { parseVaultUri } from '../../shared/flashqueryUri'
import type {
  FlashQueryDocumentConnectionsParams,
  FlashQueryDocumentConnectionsResponse,
} from '../../shared/types'

export const DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT = 200
export const DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK = 5

type DocumentConnectionsFn = (
  workspaceId: string,
  params: FlashQueryDocumentConnectionsParams,
) => Promise<FlashQueryDocumentConnectionsResponse>

const rawConnectionsCache = new Map<string, Promise<FlashQueryDocumentConnectionsResponse>>()

function sourceVaultPath(documentPath: string): string {
  return parseVaultUri(documentPath)?.vaultPath ?? documentPath
}

function rawCacheKey(workspaceId: string, params: FlashQueryDocumentConnectionsParams): string {
  return [
    workspaceId,
    params.identifier,
    params.limit ?? DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
    params.limit_per_chunk ?? DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
    params.embedding_names?.join(',') ?? '',
  ].join('\u001f')
}

function defaultDocumentConnectionsFn(): DocumentConnectionsFn | null {
  if (typeof window === 'undefined') return null
  return window.electronAPI?.flashqueryDocumentConnections ?? null
}

export function loadCachedFlashQueryDocumentConnections(
  workspaceId: string,
  params: FlashQueryDocumentConnectionsParams,
  loadDocumentConnections: DocumentConnectionsFn | null = defaultDocumentConnectionsFn(),
): Promise<FlashQueryDocumentConnectionsResponse> {
  if (!loadDocumentConnections) {
    return Promise.reject(new Error('FlashQuery document connections are unavailable.'))
  }
  const normalized: FlashQueryDocumentConnectionsParams = {
    ...params,
    limit: params.limit ?? DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
    limit_per_chunk: params.limit_per_chunk ?? DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
  }
  const key = rawCacheKey(workspaceId, normalized)
  const cached = rawConnectionsCache.get(key)
  if (cached) return cached

  const pending = loadDocumentConnections(workspaceId, normalized)
    .catch((error) => {
      rawConnectionsCache.delete(key)
      throw error
    })
  rawConnectionsCache.set(key, pending)
  return pending
}

export function preloadFlashQueryDocumentConnections(input: {
  workspaceId: string
  documentPath: string
  embeddingNames?: string[]
}): Promise<FlashQueryDocumentConnectionsResponse> | null {
  const identifier = sourceVaultPath(input.documentPath)
  if (!identifier.trim()) return null
  const loadDocumentConnections = defaultDocumentConnectionsFn()
  if (!loadDocumentConnections) return null
  return loadCachedFlashQueryDocumentConnections(input.workspaceId, {
    identifier,
    limit: DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
    limit_per_chunk: DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
    ...(input.embeddingNames?.length ? { embedding_names: input.embeddingNames } : {}),
  }, loadDocumentConnections)
}

export function documentConnectionsParamsForPath(input: {
  documentPath: string
  embeddingNames?: string[]
}): FlashQueryDocumentConnectionsParams {
  return {
    identifier: sourceVaultPath(input.documentPath),
    limit: DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
    limit_per_chunk: DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
    ...(input.embeddingNames?.length ? { embedding_names: input.embeddingNames } : {}),
  }
}

export function primeCachedFlashQueryDocumentConnections(
  workspaceId: string,
  params: FlashQueryDocumentConnectionsParams,
  response: FlashQueryDocumentConnectionsResponse,
): void {
  const normalized: FlashQueryDocumentConnectionsParams = {
    ...params,
    limit: params.limit ?? DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
    limit_per_chunk: params.limit_per_chunk ?? DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
  }
  rawConnectionsCache.set(rawCacheKey(workspaceId, normalized), Promise.resolve(response))
}

export function invalidateCachedFlashQueryDocumentConnections(
  workspaceId: string,
  params: FlashQueryDocumentConnectionsParams,
): void {
  rawConnectionsCache.delete(rawCacheKey(workspaceId, {
    ...params,
    limit: params.limit ?? DOCUMENT_CONNECTIONS_AGGREGATE_LIMIT,
    limit_per_chunk: params.limit_per_chunk ?? DOCUMENT_CONNECTIONS_LIMIT_PER_CHUNK,
  }))
}

export function clearSemanticConnectionsDocumentCacheForTests(): void {
  rawConnectionsCache.clear()
}
