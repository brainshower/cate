import { ipcMain } from 'electron'
import {
  FLASHQUERY_GET_DOCUMENT,
  FLASHQUERY_LIST_VAULT,
  FLASHQUERY_SET_CONNECTION,
  FLASHQUERY_WRITE_DOCUMENT,
} from '../../shared/ipc-channels'

function flashQueryHandlerUnavailable(operation: string): never {
  throw new Error(`FlashQuery ${operation} handler is not available until its Phase 3 implementation plan runs`)
}

async function setConnection(_workspaceId: string, _connection: unknown): Promise<void> {
  flashQueryHandlerUnavailable('setConnection')
}

async function listVault(_workspaceId: string, _vaultPath?: string): Promise<never> {
  flashQueryHandlerUnavailable('listVault')
}

async function getDocument(_workspaceId: string, _vaultPath: string): Promise<never> {
  flashQueryHandlerUnavailable('getDocument')
}

async function writeDocument(_workspaceId: string, _vaultPath: string, _content: string): Promise<never> {
  flashQueryHandlerUnavailable('writeDocument')
}

export function registerHandlers(): void {
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
