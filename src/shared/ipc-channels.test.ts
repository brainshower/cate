import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import * as channels from './ipc-channels'

const PRELOAD_SOURCE = readFileSync(new URL('../preload/index.ts', import.meta.url), 'utf8')
const ELECTRON_API_DECLARATION = readFileSync(new URL('./electron-api.d.ts', import.meta.url), 'utf8')

const FLASHQUERY_CHANNELS = {
  FLASHQUERY_SET_CONNECTION: 'flashquery:setConnection',
  FLASHQUERY_PROBE: 'flashquery:probe',
  FLASHQUERY_LIST_VAULT: 'flashquery:listVault',
  FLASHQUERY_GET_DOCUMENT: 'flashquery:getDocument',
  FLASHQUERY_WRITE_DOCUMENT: 'flashquery:writeDocument',
  FLASHQUERY_CREATE_DOCUMENT: 'flashquery:createDocument',
  FLASHQUERY_MANAGE_DIRECTORY: 'flashquery:manageDirectory',
  FLASHQUERY_MOVE_DOCUMENT: 'flashquery:moveDocument',
  FLASHQUERY_REMOVE_DOCUMENT: 'flashquery:removeDocument',
  FLASHQUERY_SEARCH: 'flashquery:search',
  FLASHQUERY_DOCUMENT_CONNECTIONS: 'flashquery:documentConnections',
  FLASHQUERY_QUERY_GRAPH: 'flashquery:queryGraph',
  FLASHQUERY_LIST_VAULT_INDEX: 'flashquery:list-vault-index',
  FLASHQUERY_RETRY: 'flashquery:retry',
  FLASHQUERY_STATUS: 'flashquery:status',
} as const

const BROWSER_CHANNELS = {
  BROWSER_HISTORY_GET: 'browser:history:get',
  BROWSER_HISTORY_RECORD: 'browser:history:record',
  BROWSER_HISTORY_REMOVE: 'browser:history:remove',
  BROWSER_HISTORY_CLEAR: 'browser:history:clear',
  BROWSER_HISTORY_CHANGED: 'browser:history:changed',
  BROWSER_BOOKMARKS_GET: 'browser:bookmarks:get',
  BROWSER_BOOKMARKS_ADD: 'browser:bookmarks:add',
  BROWSER_BOOKMARKS_REMOVE: 'browser:bookmarks:remove',
  BROWSER_BOOKMARKS_CLEAR: 'browser:bookmarks:clear',
  BROWSER_BOOKMARKS_CHANGED: 'browser:bookmarks:changed',
  BROWSER_CLEAR_DATA: 'browser:clear-data',
  BROWSER_SHORTCUT: 'browser:shortcut',
  BROWSER_PORTAL_REGISTER: 'browser:portal-register',
  BROWSER_PORTAL_LOOKUP: 'browser:portal-lookup',
} as const

const FLASHQUERY_CHANNEL_VALUES: Set<string> = new Set(Object.values(FLASHQUERY_CHANNELS))

const FLASHQUERY_API_SIGNATURES = [
  'flashquerySetConnection(workspaceId: string, connection: FlashQueryConnection | null): Promise<WorkspaceMutationResult>',
  'flashqueryProbe(workspaceId: string, connection: FlashQueryConnection): Promise<FlashQueryProbeResult>',
  'flashqueryListVault(workspaceId: string, vaultPath?: string): Promise<FlashQueryVaultEntry[]>',
  'flashqueryGetDocument(workspaceId: string, vaultPath: string, options?: FlashQueryGetDocumentOptions): Promise<FlashQueryDocumentBody>',
  'flashqueryWriteDocument(workspaceId: string, vaultPath: string, payload: FlashQueryWritePayload): Promise<FlashQueryWriteResult>',
  'flashqueryCreateDocument(workspaceId: string, vaultPath: string, title: string): Promise<FlashQueryWriteResult>',
  'flashqueryMoveDocument(workspaceId: string, identifier: string, destination: string): Promise<FlashQueryWriteResult>',
  'flashqueryRemoveDocument(workspaceId: string, identifiers: string | string[]): Promise<FlashQueryWriteResult>',
  'flashquerySearch(workspaceId: string, params: FlashQuerySearchParams): Promise<FlashQuerySearchResponse>',
  'flashqueryDocumentConnections(workspaceId: string, params: FlashQueryDocumentConnectionsParams): Promise<FlashQueryDocumentConnectionsResponse>',
  'flashqueryQueryGraph(workspaceId: string, params: FlashQueryQueryGraphParams): Promise<FlashQueryQueryGraphResponse>',
  'flashqueryListVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]>',
  'flashqueryRetry(workspaceId: string): Promise<void>',
  'onFlashQueryStatus(callback: (payload: FlashQueryStatusBroadcastPayload) => void): () => void',
] as const

const FLASHQUERY_PRELOAD_METHODS = [
  'flashquerySetConnection(workspaceId: string, connection: unknown | null): Promise<WorkspaceMutationResult>',
  'flashqueryProbe(workspaceId: string, connection: unknown): Promise<unknown>',
  'flashqueryListVault(workspaceId: string, vaultPath?: string): Promise<unknown[]>',
  'flashqueryGetDocument(workspaceId: string, vaultPath: string, options?: unknown): Promise<unknown>',
  'flashqueryWriteDocument(workspaceId: string, vaultPath: string, payload: unknown): Promise<unknown>',
  'flashqueryCreateDocument(workspaceId: string, vaultPath: string, title: string): Promise<unknown>',
  'flashqueryMoveDocument(workspaceId: string, identifier: string, destination: string): Promise<unknown>',
  'flashqueryRemoveDocument(workspaceId: string, identifiers: unknown): Promise<unknown>',
  'flashquerySearch(workspaceId: string, params: unknown): Promise<unknown>',
  'flashqueryDocumentConnections(workspaceId: string, params: unknown): Promise<unknown>',
  'flashqueryQueryGraph(workspaceId: string, params: unknown): Promise<unknown>',
  'flashqueryListVaultIndex(workspaceId: string): Promise<unknown[]>',
  'flashqueryRetry(workspaceId: string): Promise<void>',
  'onFlashQueryStatus(callback: (payload: unknown) => void): () => void',
] as const

describe('FlashQuery IPC channels', () => {
  it('T-U-027 keeps existing FlashQuery channel names exact', () => {
    for (const [name, value] of Object.entries(FLASHQUERY_CHANNELS)) {
      expect(channels[name as keyof typeof channels]).toBe(value)
    }
  })

  it('T-U-027 keeps FlashQuery channels collision-free while browser constants exist', () => {
    const channelEntries = Object.entries(channels).filter(([, value]) => typeof value === 'string')
    const flashqueryEntries = channelEntries.filter(([, value]) => value.startsWith('flashquery:'))

    expect(new Set(flashqueryEntries.map(([, value]) => value))).toEqual(FLASHQUERY_CHANNEL_VALUES)
    expect(flashqueryEntries).toHaveLength(FLASHQUERY_CHANNEL_VALUES.size)

    const collisions = channelEntries.filter(([name, value]) => (
      FLASHQUERY_CHANNEL_VALUES.has(value) && !name.startsWith('FLASHQUERY_')
    ))
    expect(collisions).toEqual([])

    for (const [name, value] of Object.entries(BROWSER_CHANNELS)) {
      expect(channels[name as keyof typeof channels]).toBe(value)
    }
    expect(Object.values(BROWSER_CHANNELS).every((value) => value.startsWith('browser:'))).toBe(true)
  })

  it('T-U-027 preserves public FlashQuery preload declaration signatures', () => {
    for (const signature of FLASHQUERY_API_SIGNATURES) {
      expect(ELECTRON_API_DECLARATION).toContain(signature)
    }
  })

  it('T-U-027 preserves FlashQuery preload method names and bridge signatures', () => {
    for (const signature of FLASHQUERY_PRELOAD_METHODS) {
      expect(PRELOAD_SOURCE).toContain(signature)
    }

    for (const channelName of Object.keys(FLASHQUERY_CHANNELS)) {
      expect(PRELOAD_SOURCE).toContain(channelName)
    }
  })
})
