// =============================================================================
// Workspace Manager — main-process source of truth for workspace metadata.
//
// Stores WorkspaceInfo[] (id, name, color, rootPath).
// Canvas/panel state lives in each renderer window — only metadata is shared.
// =============================================================================

import { ipcMain } from 'electron'
import { randomUUID } from 'crypto'
import log from './logger'
import {
  WORKSPACE_CREATE,
  WORKSPACE_UPDATE,
  WORKSPACE_REMOVE,
  WORKSPACE_CHANGED,
} from '../shared/ipc-channels'
import type { FlashQueryConnection, WorkspaceInfo, WorkspaceMutationResult } from '../shared/types'
import { isFlashQueryConnection, sanitizeFlashQueryConnection } from '../shared/types'
import { broadcastToAll, windowFromEvent } from './windowRegistry'
import { addAllowedRoot, removeAllowedRoot } from './ipc/pathValidation'
import { resolveTrustedWorkspaceRoot } from './workspaceRoots'
import { setWorkspaceToken } from './flashquery/credentials'

// In-memory workspace list — authoritative source of truth
const workspaces: Map<string, WorkspaceInfo> = new Map()

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

/** Accepts standard UUIDs (from randomUUID) and any safe alphanumeric id. */
const WORKSPACE_ID_RE = /^[a-zA-Z0-9_-]{8,64}$/

function isValidWorkspaceId(id: string): boolean {
  return WORKSPACE_ID_RE.test(id)
}

function generateId(): string {
  return randomUUID()
}

// -----------------------------------------------------------------------------
// Public API (called by IPC handlers)
// -----------------------------------------------------------------------------

export function listWorkspaces(): WorkspaceInfo[] {
  return Array.from(workspaces.values()).map(sanitizeWorkspaceInfo)
}

function sanitizeWorkspaceInfo(info: WorkspaceInfo): WorkspaceInfo {
  return {
    ...info,
    flashqueryConnection: sanitizeFlashQueryConnection(info.flashqueryConnection),
  }
}

function sanitizeWorkspaceChanges(
  changes: Partial<Omit<WorkspaceInfo, 'id'>>,
): Partial<Omit<WorkspaceInfo, 'id'>> {
  if (!('flashqueryConnection' in changes)) return changes
  return {
    ...changes,
    flashqueryConnection: sanitizeFlashQueryConnection(changes.flashqueryConnection),
  }
}

function shouldPreserveFlashQueryToken(connection: unknown): boolean {
  return Boolean(connection && typeof connection === 'object' && (connection as { preserveExistingToken?: unknown }).preserveExistingToken === true)
}

async function storeFlashQueryToken(workspaceId: string, connection: unknown): Promise<void> {
  if (isFlashQueryConnection(connection) && connection.auth) {
    await setWorkspaceToken(workspaceId, connection.auth.token)
    return
  }
  if (shouldPreserveFlashQueryToken(connection)) return
  await setWorkspaceToken(workspaceId, null)
}

export async function createWorkspace(
  name?: string,
  rootPath?: string,
  id?: string,
  flashqueryConnection?: FlashQueryConnection,
): Promise<WorkspaceMutationResult> {
  // Validate caller-supplied id; fall back to a fresh UUID if invalid.
  const resolvedId = id && isValidWorkspaceId(id) ? id : generateId()
  if (id && resolvedId !== id) {
    log.warn('workspaceManager: invalid workspace id supplied, generating new one (supplied: %s)', id)
  }

  let trustedRoot = ''
  if (rootPath) {
    const resolvedRoot = await resolveTrustedWorkspaceRoot(rootPath)
    if (!resolvedRoot) {
      return {
        ok: false,
        error: {
          code: 'INVALID_ROOT_PATH',
          message: `Workspace root is not a readable directory: ${rootPath}`,
        },
      }
    }
    trustedRoot = resolvedRoot
  }

  if (flashqueryConnection !== undefined) {
    await storeFlashQueryToken(resolvedId, flashqueryConnection)
  }

  const info: WorkspaceInfo = {
    id: resolvedId,
    name: name ?? 'Workspace',
    color: '',
    rootPath: trustedRoot,
    flashqueryConnection: sanitizeFlashQueryConnection(flashqueryConnection),
  }
  workspaces.set(info.id, info)
  log.info('Workspace created: %s (%s)', info.id, info.rootPath || 'no root')
  if (info.rootPath) {
    addAllowedRoot(info.rootPath)
  }
  return { ok: true, workspace: info }
}

export async function updateWorkspace(id: string, changes: Partial<Omit<WorkspaceInfo, 'id'>>): Promise<WorkspaceMutationResult> {
  if (!isValidWorkspaceId(id)) {
    log.warn('workspaceManager: updateWorkspace called with invalid id: %s', id)
    return {
      ok: false,
      error: {
        code: 'INVALID_WORKSPACE_ID',
        message: `Workspace id is invalid: ${id}`,
      },
    }
  }
  const existing = workspaces.get(id)
  if (!existing) {
    return {
      ok: false,
      error: {
        code: 'WORKSPACE_NOT_FOUND',
        message: `Workspace not found: ${id}`,
      },
    }
  }

  let nextRootPath = existing.rootPath
  const sanitizedChanges = sanitizeWorkspaceChanges(changes)
  if ('flashqueryConnection' in changes) {
    await storeFlashQueryToken(id, changes.flashqueryConnection)
  }

  if (typeof sanitizedChanges.rootPath === 'string') {
    if (!sanitizedChanges.rootPath) {
      nextRootPath = ''
    } else {
      const resolvedRoot = await resolveTrustedWorkspaceRoot(sanitizedChanges.rootPath)
      if (!resolvedRoot) {
        return {
          ok: false,
          error: {
            code: 'INVALID_ROOT_PATH',
            message: `Workspace root is not a readable directory: ${sanitizedChanges.rootPath}`,
          },
        }
      }
      nextRootPath = resolvedRoot
    }
  }

  if (existing.rootPath && existing.rootPath !== nextRootPath) {
    removeAllowedRoot(existing.rootPath)
  }

  const updated = sanitizeWorkspaceInfo({ ...existing, ...sanitizedChanges, rootPath: nextRootPath })
  workspaces.set(id, updated)
  if (updated.rootPath) {
    addAllowedRoot(updated.rootPath)
  }
  return { ok: true, workspace: updated }
}

export function removeWorkspace(id: string): boolean {
  if (!isValidWorkspaceId(id)) {
    log.warn('workspaceManager: removeWorkspace called with invalid id: %s', id)
    return false
  }
  const existing = workspaces.get(id)
  if (existing?.rootPath) {
    removeAllowedRoot(existing.rootPath)
  }
  const removed = workspaces.delete(id)
  if (removed) log.info('Workspace removed: %s', id)
  return removed
}

// -----------------------------------------------------------------------------
// Broadcast helper — notify all windows of workspace list change
// -----------------------------------------------------------------------------

export function broadcastWorkspaceChange(originWindowId?: number): void {
  broadcastToAll(WORKSPACE_CHANGED, listWorkspaces(), originWindowId ?? null)
}

// -----------------------------------------------------------------------------
// IPC handler registration
// -----------------------------------------------------------------------------

export function registerWorkspaceHandlers(): void {
  // Create a new workspace
  ipcMain.handle(
    WORKSPACE_CREATE,
    async (event, options?: { name?: string; rootPath?: string; id?: string; flashqueryConnection?: FlashQueryConnection }) => {
      const result = await createWorkspace(options?.name, options?.rootPath, options?.id, options?.flashqueryConnection)
      if (!result.ok) return result
      const win = windowFromEvent(event)
      broadcastWorkspaceChange(win?.id)
      return result
    },
  )

  // Update workspace metadata
  ipcMain.handle(
    WORKSPACE_UPDATE,
    async (event, id: string, changes: Partial<Omit<WorkspaceInfo, 'id'>>) => {
      const result = await updateWorkspace(id, changes)
      if (result.ok) {
        const win = windowFromEvent(event)
        broadcastWorkspaceChange(win?.id)
      }
      return result
    },
  )

  // Remove a workspace
  ipcMain.handle(WORKSPACE_REMOVE, async (event, id: string) => {
    const removed = removeWorkspace(id)
    if (removed) {
      const win = windowFromEvent(event)
      broadcastWorkspaceChange(win?.id)
    }
    return removed
  })
}
