import { ipcMain } from 'electron'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import {
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT_INDEX,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_PROBE,
  FLASHQUERY_RETRY,
  FLASHQUERY_SEARCH,
  FLASHQUERY_STATUS,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'
import type {
  FlashQueryConnection,
  FlashQueryGetDocumentOptions,
  FlashQueryProbeResult,
  FlashQuerySearchParams,
  FlashQuerySearchResponse,
  FlashQueryStatusBroadcastPayload,
  FlashQueryVaultIndexEntry,
  FlashQueryWritePayload,
  FlashQueryWriteResult,
  WorkspaceMutationResult,
} from '../../shared/types'
import { isFlashQueryConnection, normalizeFlashQueryConnectionUrl } from '../../shared/types'
import { FlashQueryClientManager } from '../flashquery/clientManager'
import { broadcastToAll } from '../windowRegistry'
import { broadcastWorkspaceChange, updateWorkspace } from '../workspaceManager'

const flashQueryClientManager = new FlashQueryClientManager()
const statusUnsubscribers = new Map<string, () => void>()
let handlersRegistered = false
const DIALOG_PROBE_TIMEOUT_MS = 10_000

function flashQueryHandlerUnavailable(operation: string): never {
  throw new Error(`FlashQuery ${operation} handler is not available until its Phase 3 implementation plan runs`)
}

function normalizeStatusPayload(payload: FlashQueryStatusBroadcastPayload): FlashQueryStatusBroadcastPayload {
  if (payload.status === 'disconnected') {
    return {
      workspaceId: payload.workspaceId,
      status: payload.status,
      error: payload.error ?? 'FlashQuery connection is disconnected',
    }
  }
  return {
    workspaceId: payload.workspaceId,
    status: payload.status,
    ...(payload.version ? { version: payload.version } : {}),
    ...(payload.instanceId ? { instanceId: payload.instanceId } : {}),
  }
}

function broadcastStatus(payload: FlashQueryStatusBroadcastPayload): void {
  broadcastToAll(FLASHQUERY_STATUS, normalizeStatusPayload(payload))
}

function validateConnection(connection: unknown): FlashQueryConnection {
  if (!isFlashQueryConnection(connection)) {
    throw new Error('FlashQuery connection must use HTTP transport with an optional bearer auth token')
  }

  let original: URL
  try {
    original = new URL(connection.url)
  } catch {
    throw new Error('FlashQuery connection must include a valid FlashQuery URL')
  }

  if (original.protocol !== 'http:' && original.protocol !== 'https:') {
    throw new Error('FlashQuery connection URL must use http or https')
  }
  if (original.username || original.password || original.search || original.hash) {
    throw new Error('FlashQuery connection URL must not include credentials, query, or fragment')
  }

  const url = normalizeFlashQueryConnectionUrl(connection.url)
  if (!url) {
    throw new Error('FlashQuery connection must include a valid FlashQuery URL')
  }
  return { ...connection, url }
}

function normalizeConnection(connection: FlashQueryConnection): FlashQueryConnection {
  const token = connection.auth?.type === 'bearer' ? connection.auth.token.trim() : ''
  return {
    transport: 'http',
    url: connection.url,
    ...(token ? { auth: { type: 'bearer', token } } : {}),
  }
}

function buildInfoUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/mcp/info`
}

function buildMcpUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/mcp`
}

// Authenticated MCP handshake against POST /mcp using the user-typed bearer.
// Used by the dialog Test Connection action to validate the token in addition
// to the public reachability probe — the public `/mcp/info` request never
// sends auth (Phase 7 Plan 07-01), so without this step the dialog would
// report "Connected" even with an invalid token (Phase 7 Gap 7).
async function probeAuthenticatedMcp(
  connection: FlashQueryConnection,
  token: string,
): Promise<FlashQueryProbeResult> {
  const client = new Client({ name: 'cate', version: '1.0.3' })
  const transport = new StreamableHTTPClientTransport(new URL(buildMcpUrl(connection.url)), {
    requestInit: { headers: new Headers({ Authorization: `Bearer ${token}` }) },
  })
  try {
    await client.connect(transport)
    return { ok: true, version: '', instanceId: '' }
  } catch (error) {
    const message = safeOneLineError(error, token)
    if (/\b401\b|unauthor|invalid.?authoriz|forbidden/i.test(message)) {
      return { ok: false, error: 'Bearer token rejected by server (401).' }
    }
    return { ok: false, error: message }
  } finally {
    void Promise.resolve(client.close()).catch(() => {
      // Best-effort cleanup — connect already settled either way.
    })
  }
}

function parseInfoPayload(value: unknown): { version: string; instanceId: string } | null {
  if (!value || typeof value !== 'object') return null
  const info = value as Record<string, unknown>
  if (typeof info.version !== 'string' || typeof info.instance_id !== 'string') return null
  return { version: info.version, instanceId: info.instance_id }
}

function safeOneLineError(error: unknown, token?: string): string {
  let message = error instanceof Error ? error.message : String(error)
  if (token) {
    message = message.split(token).join('[redacted]')
  }
  return message.split(/\r?\n/)[0]?.trim() || 'FlashQuery probe failed'
}

function resetWorkspaceManagerBridge(workspaceId: string): void {
  statusUnsubscribers.get(workspaceId)?.()
  statusUnsubscribers.delete(workspaceId)
  flashQueryClientManager.dispose(workspaceId)
}

function subscribeWorkspaceStatus(workspaceId: string): void {
  if (statusUnsubscribers.has(workspaceId)) return
  const unsubscribe = flashQueryClientManager.subscribe<FlashQueryStatusBroadcastPayload>(
    workspaceId,
    'status',
    (payload) => {
      broadcastStatus(payload)
    },
  )
  statusUnsubscribers.set(workspaceId, unsubscribe)
}

async function setConnection(workspaceId: string, connection: unknown): Promise<WorkspaceMutationResult> {
  const preserveExistingToken = Boolean(
    connection
    && typeof connection === 'object'
    && (connection as { preserveExistingToken?: unknown }).preserveExistingToken === true,
  )
  const nextConnection = connection === null ? null : normalizeConnection(validateConnection(connection))
  const workspaceConnection = nextConnection && preserveExistingToken
    ? { ...nextConnection, preserveExistingToken: true }
    : nextConnection
  const result = await updateWorkspace(workspaceId, {
    flashqueryConnection: workspaceConnection === null ? undefined : workspaceConnection,
  })

  if (!result.ok) {
    throw new Error(result.error.message)
  }

  broadcastWorkspaceChange()
  resetWorkspaceManagerBridge(workspaceId)

  if (nextConnection === null) {
    broadcastStatus({
      workspaceId,
      status: 'disconnected',
      error: 'No FlashQuery connection is configured for this workspace',
    })
    return result
  }

  subscribeWorkspaceStatus(workspaceId)
  await flashQueryClientManager.connect(workspaceId, nextConnection)
  return result
}

async function probeConnection(workspaceId: string, connection: unknown): Promise<FlashQueryProbeResult> {
  try {
    requireNonEmptyString(workspaceId, 'workspaceId')
    const nextConnection = validateConnection(connection)
    const token = nextConnection.auth?.type === 'bearer' ? nextConnection.auth.token.trim() : ''
    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort(new Error('FlashQuery probe timed out'))
    }, DIALOG_PROBE_TIMEOUT_MS)

    try {
      const response = await globalThis.fetch(buildInfoUrl(nextConnection.url), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: abortController.signal,
      })

      if (!response.ok) {
        return {
          ok: false,
          error: `FlashQuery probe failed with ${response.status} ${response.statusText}`.trim(),
        }
      }

      const info = parseInfoPayload(await response.json())
      if (!info) {
        return { ok: false, error: 'FlashQuery probe returned an invalid response' }
      }

      if (token) {
        const authResult = await probeAuthenticatedMcp(nextConnection, token)
        if (!authResult.ok) return authResult
      }

      return { ok: true, version: info.version, instanceId: info.instanceId }
    } catch (error) {
      return { ok: false, error: safeOneLineError(error, token) }
    } finally {
      clearTimeout(timeout)
    }
  } catch (error) {
    return { ok: false, error: safeOneLineError(error) }
  }
}

function requireNonEmptyString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`)
  }
  return value
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be a string`)
  }
  return value
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function validateGetDocumentOptions(value: unknown): FlashQueryGetDocumentOptions | undefined {
  if (value === undefined) return undefined
  if (!isPlainObject(value)) throw new Error('options must be an object when provided')
  const include = value.include
  if (include === undefined) return {}
  if (!Array.isArray(include)) throw new Error('options.include must be an array')
  for (const part of include) {
    if (part !== 'body' && part !== 'frontmatter') {
      throw new Error('options.include must contain only body or frontmatter')
    }
  }
  return { include }
}

function validateWritePayload(value: unknown): FlashQueryWritePayload {
  if (typeof value === 'string') return value
  if (!isPlainObject(value)) throw new Error('payload must be a string or object')
  const payload: { content?: string; frontmatter?: Record<string, unknown>; tags?: string[] } = {}
  if (value.content !== undefined) {
    if (typeof value.content !== 'string') throw new Error('payload.content must be a string')
    payload.content = value.content
  }
  if (value.frontmatter !== undefined) {
    if (!isPlainObject(value.frontmatter)) throw new Error('payload.frontmatter must be an object')
    payload.frontmatter = value.frontmatter
  }
  if (value.tags !== undefined) {
    if (!Array.isArray(value.tags) || value.tags.some((tag) => typeof tag !== 'string')) {
      throw new Error('payload.tags must be an array of strings')
    }
    payload.tags = value.tags
  }
  if (payload.content === undefined && payload.frontmatter === undefined && payload.tags === undefined) {
    throw new Error('payload must include content, frontmatter, or tags')
  }
  return payload
}

function validateSearchParams(value: unknown): FlashQuerySearchParams {
  if (!isPlainObject(value)) throw new Error('search params must be an object')
  const params: FlashQuerySearchParams = {}
  if (value.query !== undefined) {
    if (typeof value.query !== 'string') throw new Error('search query must be a string')
    params.query = value.query
  }
  if (value.mode !== undefined) {
    if (value.mode !== 'filesystem' && value.mode !== 'mixed' && value.mode !== 'semantic') {
      throw new Error('search mode must be filesystem, mixed, or semantic')
    }
    params.mode = value.mode
  }
  if (value.entity_types !== undefined) {
    if (!Array.isArray(value.entity_types)) throw new Error('search entity_types must be an array')
    for (const entityType of value.entity_types) {
      if (entityType !== 'documents' && entityType !== 'memories') {
        throw new Error('search entity_types must contain only documents or memories')
      }
    }
    params.entity_types = value.entity_types
  }
  if (value.limit !== undefined) {
    const limit = value.limit
    if (typeof limit !== 'number' || !Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) {
      throw new Error('search limit must be a positive integer')
    }
    params.limit = limit
  }
  if ((params.mode ?? 'mixed') === 'semantic' && (params.query ?? '').trim().length === 0) {
    throw new Error('Type a query to search semantically.')
  }
  return params
}

async function listVault(workspaceId: string, vaultPath?: string) {
  requireNonEmptyString(workspaceId, 'workspaceId')
  if (vaultPath !== undefined && typeof vaultPath !== 'string') {
    throw new Error('vaultPath must be a string when provided')
  }
  return flashQueryClientManager.listVault(workspaceId, vaultPath)
}

async function getDocument(workspaceId: string, vaultPath: string, options?: unknown) {
  return flashQueryClientManager.getDocument(
    requireNonEmptyString(workspaceId, 'workspaceId'),
    requireNonEmptyString(vaultPath, 'vaultPath'),
    validateGetDocumentOptions(options),
  )
}

async function writeDocument(workspaceId: string, vaultPath: string, payload: unknown): Promise<FlashQueryWriteResult> {
  try {
    return await flashQueryClientManager.writeDocument(
      requireNonEmptyString(workspaceId, 'workspaceId'),
      requireNonEmptyString(vaultPath, 'vaultPath'),
      validateWritePayload(payload),
    )
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function search(workspaceId: string, params: unknown): Promise<FlashQuerySearchResponse> {
  try {
    return await flashQueryClientManager.search(
      requireNonEmptyString(workspaceId, 'workspaceId'),
      validateSearchParams(params),
    )
  } catch (error) {
    return {
      documents: [],
      memories: [],
      total_documents: 0,
      total_memories: 0,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function listVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]> {
  requireNonEmptyString(workspaceId, 'workspaceId')
  return flashQueryClientManager.listVaultIndex(workspaceId)
}

async function retry(workspaceId: string): Promise<void> {
  const id = requireNonEmptyString(workspaceId, 'workspaceId')
  subscribeWorkspaceStatus(id)
  const payload = await flashQueryClientManager.retry(id)
  broadcastStatus(payload)
}

export function registerHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(FLASHQUERY_SET_CONNECTION, async (_event, workspaceId: string, connection: unknown) => {
    return setConnection(workspaceId, connection)
  })
  ipcMain.handle(FLASHQUERY_PROBE, async (_event, workspaceId: string, connection: unknown) => {
    return probeConnection(workspaceId, connection)
  })
  ipcMain.handle(FLASHQUERY_LIST_VAULT, async (_event, workspaceId: string, vaultPath?: string) => {
    return listVault(workspaceId, vaultPath)
  })
  ipcMain.handle(FLASHQUERY_GET_DOCUMENT, async (_event, workspaceId: string, vaultPath: string, options?: unknown) => {
    return getDocument(workspaceId, vaultPath, options)
  })
  ipcMain.handle(FLASHQUERY_WRITE_DOCUMENT, async (_event, workspaceId: string, vaultPath: string, payload: unknown) => {
    return writeDocument(workspaceId, vaultPath, payload)
  })
  ipcMain.handle(FLASHQUERY_SEARCH, async (_event, workspaceId: string, params: unknown) => {
    return search(workspaceId, params)
  })
  ipcMain.handle(FLASHQUERY_LIST_VAULT_INDEX, async (_event, workspaceId: string) => {
    return listVaultIndex(workspaceId)
  })
  ipcMain.handle(FLASHQUERY_RETRY, async (_event, workspaceId: string) => {
    return retry(workspaceId)
  })
}

export { registerHandlers as registerFlashQueryHandlers }
