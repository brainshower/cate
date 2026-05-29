import { ipcMain } from 'electron'
import {
  FLASHQUERY_GET_CONNECTION_SECRET,
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_PROBE,
  FLASHQUERY_RETRY,
  FLASHQUERY_STATUS,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'
import type { FlashQueryConnection, FlashQueryProbeResult, FlashQueryStatusBroadcastPayload, WorkspaceMutationResult } from '../../shared/types'
import { isFlashQueryConnection } from '../../shared/types'
import { FlashQueryClientManager } from '../flashquery/clientManager'
import { getWorkspaceToken } from '../flashquery/credentials'
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

  let parsed: URL
  try {
    parsed = new URL(connection.url)
  } catch {
    throw new Error('FlashQuery connection must include a valid FlashQuery URL')
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('FlashQuery connection URL must use http or https')
  }

  return connection
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
  const nextConnection = connection === null ? null : normalizeConnection(validateConnection(connection))
  const result = await updateWorkspace(workspaceId, {
    flashqueryConnection: nextConnection === null ? undefined : nextConnection,
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
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await globalThis.fetch(buildInfoUrl(nextConnection.url), {
        method: 'GET',
        headers,
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

async function getConnectionSecret(workspaceId: string): Promise<string | null> {
  return getWorkspaceToken(requireNonEmptyString(workspaceId, 'workspaceId'))
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

async function listVault(workspaceId: string, vaultPath?: string) {
  requireNonEmptyString(workspaceId, 'workspaceId')
  if (vaultPath !== undefined && typeof vaultPath !== 'string') {
    throw new Error('vaultPath must be a string when provided')
  }
  return flashQueryClientManager.listVault(workspaceId, vaultPath)
}

async function getDocument(workspaceId: string, vaultPath: string) {
  return flashQueryClientManager.getDocument(
    requireNonEmptyString(workspaceId, 'workspaceId'),
    requireNonEmptyString(vaultPath, 'vaultPath'),
  )
}

async function writeDocument(workspaceId: string, vaultPath: string, content: string) {
  try {
    return await flashQueryClientManager.writeDocument(
      requireNonEmptyString(workspaceId, 'workspaceId'),
      requireNonEmptyString(vaultPath, 'vaultPath'),
      requireString(content, 'content'),
    )
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

async function retry(workspaceId: string): Promise<void> {
  await flashQueryClientManager.retry(requireNonEmptyString(workspaceId, 'workspaceId'))
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
  ipcMain.handle(FLASHQUERY_GET_CONNECTION_SECRET, async (_event, workspaceId: string) => {
    return getConnectionSecret(workspaceId)
  })
  ipcMain.handle(FLASHQUERY_LIST_VAULT, async (_event, workspaceId: string, vaultPath?: string) => {
    return listVault(workspaceId, vaultPath)
  })
  ipcMain.handle(FLASHQUERY_GET_DOCUMENT, async (_event, workspaceId: string, vaultPath: string) => {
    return getDocument(workspaceId, vaultPath)
  })
  ipcMain.handle(FLASHQUERY_WRITE_DOCUMENT, async (_event, workspaceId: string, vaultPath: string, content: string) => {
    return writeDocument(workspaceId, vaultPath, content)
  })
  ipcMain.handle(FLASHQUERY_RETRY, async (_event, workspaceId: string) => {
    return retry(workspaceId)
  })
}

export { registerHandlers as registerFlashQueryHandlers }
