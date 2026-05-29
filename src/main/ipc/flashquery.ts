import { ipcMain } from 'electron'
import {
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_STATUS,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'
import type { FlashQueryConnection, FlashQueryStatusBroadcastPayload, WorkspaceMutationResult } from '../../shared/types'
import { isFlashQueryConnection } from '../../shared/types'
import { FlashQueryClientManager } from '../flashquery/clientManager'
import { broadcastToAll } from '../windowRegistry'
import { broadcastWorkspaceChange, updateWorkspace } from '../workspaceManager'

const flashQueryClientManager = new FlashQueryClientManager()
const statusUnsubscribers = new Map<string, () => void>()
let handlersRegistered = false

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
  const nextConnection = connection === null ? null : validateConnection(connection)
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

export function registerHandlers(): void {
  if (handlersRegistered) return
  handlersRegistered = true

  ipcMain.handle(FLASHQUERY_SET_CONNECTION, async (_event, workspaceId: string, connection: unknown) => {
    return setConnection(workspaceId, connection)
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
}

export { registerHandlers as registerFlashQueryHandlers }
