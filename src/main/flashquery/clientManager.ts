import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type { FlashQueryConnection, FlashQueryDocumentBody, FlashQueryVaultEntry, FlashQueryWriteResult } from '../../shared/types'
import { getWorkspaceToken } from './credentials'
import { listWorkspaces } from '../workspaceManager'

export type FlashQueryClientEventType = 'status' | 'vault-changed' | 'tools-changed' | (string & {})

export type FlashQueryClientEventHandler<T = unknown> = (event: T) => void

export type FlashQueryConnectionStatus = 'connecting' | 'live' | 'disconnected'

export interface FlashQueryStatusPayload {
  workspaceId: string
  status: FlashQueryConnectionStatus
  version?: string
  instanceId?: string
  error?: string
}

const INITIAL_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 60_000
const PROBE_TIMEOUT_MS = 10_000

interface FlashQueryMcpToolClient {
  callTool: (params: { name: string; arguments?: Record<string, unknown> }) => Promise<unknown>
  close?: () => Promise<void> | void
}

type CreateMcpClient = (
  workspaceId: string,
  connection: FlashQueryConnection,
  token: string | null,
) => Promise<FlashQueryMcpToolClient>

interface WorkspaceClientState {
  subscribers: Map<FlashQueryClientEventType, Set<FlashQueryClientEventHandler>>
  connection?: FlashQueryConnection
  status?: FlashQueryStatusPayload
  mcpClient?: FlashQueryMcpToolClient
  token?: string | null
  attemptId: number
  retryDelayMs: number
  retryTimer?: ReturnType<typeof setTimeout>
}

interface FlashQueryClientManagerOptions {
  createMcpClient?: CreateMcpClient
}

export class FlashQueryClientManager {
  private readonly workspaceStates = new Map<string, WorkspaceClientState>()
  private readonly createMcpClient: CreateMcpClient

  constructor(options: FlashQueryClientManagerOptions = {}) {
    this.createMcpClient = options.createMcpClient ?? this.createSdkMcpClient
  }

  subscribe<T = unknown>(
    workspaceId: string,
    type: FlashQueryClientEventType,
    handler: FlashQueryClientEventHandler<T>,
  ): () => void {
    const state = this.getOrCreateWorkspaceState(workspaceId)
    let subscribers = state.subscribers.get(type)
    if (!subscribers) {
      subscribers = new Set()
      state.subscribers.set(type, subscribers)
    }
    const storedHandler = handler as FlashQueryClientEventHandler
    subscribers.add(storedHandler)

    return () => {
      subscribers?.delete(storedHandler)
    }
  }

  async connect(workspaceId: string, connection: FlashQueryConnection): Promise<FlashQueryStatusPayload> {
    const state = this.getOrCreateWorkspaceState(workspaceId)
    state.connection = connection
    return this.probeConnection(workspaceId, state, connection)
  }

  async retry(workspaceId: string): Promise<FlashQueryStatusPayload> {
    const state = this.workspaceStates.get(workspaceId)
    const connection = state?.connection
    if (!state || !connection) {
      const payload: FlashQueryStatusPayload = {
        workspaceId,
        status: 'disconnected',
        error: 'No FlashQuery connection is configured for this workspace',
      }
      if (state) {
        this.emitStatus(workspaceId, state, payload)
      }
      return payload
    }

    return this.probeConnection(workspaceId, state, connection)
  }

  getStatus(workspaceId: string): FlashQueryStatusPayload | null {
    return this.workspaceStates.get(workspaceId)?.status ?? null
  }

  dispose(workspaceId: string): void {
    const state = this.workspaceStates.get(workspaceId)
    if (state) {
      this.clearRetryTimer(state)
      state.attemptId += 1
      void state.mcpClient?.close?.()
    }
    this.workspaceStates.delete(workspaceId)
  }

  async listVault(workspaceId: string, vaultPath?: string): Promise<FlashQueryVaultEntry[]> {
    const state = this.workspaceStates.get(workspaceId)
    if (state?.status?.status === 'disconnected') return []

    const client = await this.getOrCreateMcpClient(workspaceId)
    if (!client) return []

    const payload = await this.callJsonTool(client, 'list_vault', {
      path: vaultPath && vaultPath.length > 0 ? vaultPath : '/',
      include: ['tracking'],
    })

    const entries = Array.isArray(payload.entries) ? payload.entries : []
    return entries.flatMap((entry) => this.normalizeVaultEntry(entry))
  }

  async getDocument(workspaceId: string, vaultPath: string): Promise<FlashQueryDocumentBody> {
    const client = await this.requireMcpClient(workspaceId)
    const payload = await this.callJsonTool(client, 'get_document', {
      identifiers: vaultPath,
      include: ['body'],
    })

    if (this.isErrorEnvelope(payload)) {
      throw new Error(this.errorEnvelopeMessage(payload))
    }

    if (typeof payload.body !== 'string') {
      throw new Error(`FlashQuery get_document returned no body for ${vaultPath}`)
    }

    return {
      body: payload.body,
      ...(typeof payload.version_token === 'string' ? { version_token: payload.version_token } : {}),
      ...(typeof payload.modified === 'string' ? { modified: payload.modified } : {}),
    }
  }

  async writeDocument(workspaceId: string, vaultPath: string, content: string): Promise<FlashQueryWriteResult> {
    try {
      const client = await this.requireMcpClient(workspaceId)
      const payload = await this.callJsonTool(client, 'write_document', {
        mode: 'update',
        identifier: vaultPath,
        content,
      })

      if (this.isErrorEnvelope(payload)) {
        return { success: false, error: this.errorEnvelopeMessage(payload) }
      }

      return {
        success: true,
        modified: typeof payload.modified === 'string' ? payload.modified : '',
      }
    } catch (error) {
      const state = this.workspaceStates.get(workspaceId)
      const connection = state?.connection ?? this.getConfiguredConnection(workspaceId)
      return { success: false, error: this.errorToSafeMessage(error, connection, state?.token) }
    }
  }

  private async probeConnection(
    workspaceId: string,
    state: WorkspaceClientState,
    connection: FlashQueryConnection,
  ): Promise<FlashQueryStatusPayload> {
    this.clearRetryTimer(state)
    state.attemptId += 1
    const attemptId = state.attemptId

    this.emitStatus(workspaceId, state, { workspaceId, status: 'connecting' })

    const abortController = new AbortController()
    const timeout = setTimeout(() => {
      abortController.abort(new Error('FlashQuery info probe timed out'))
    }, PROBE_TIMEOUT_MS)

    try {
      const response = await globalThis.fetch(this.buildInfoUrl(connection.url), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: abortController.signal,
      })

      if (!this.isCurrentAttempt(workspaceId, state, attemptId)) {
        return state.status ?? { workspaceId, status: 'disconnected', error: 'Connection attempt was superseded' }
      }

      if (!response.ok) {
        return this.failConnection(
          workspaceId,
          state,
          connection,
          `FlashQuery info probe failed with ${response.status} ${response.statusText}`.trim(),
        )
      }

      const info = this.parseInfoPayload(await response.json())
      if (!this.isCurrentAttempt(workspaceId, state, attemptId)) {
        return state.status ?? { workspaceId, status: 'disconnected', error: 'Connection attempt was superseded' }
      }

      if (!info) {
        return this.failConnection(
          workspaceId,
          state,
          connection,
          'FlashQuery info probe returned an invalid response',
        )
      }

      const payload: FlashQueryStatusPayload = {
        workspaceId,
        status: 'live',
        version: info.version,
        instanceId: info.instanceId,
      }
      this.clearRetryTimer(state)
      state.retryDelayMs = INITIAL_RETRY_DELAY_MS
      this.emitStatus(workspaceId, state, payload)
      return payload
    } catch (error) {
      if (!this.isCurrentAttempt(workspaceId, state, attemptId)) {
        return state.status ?? { workspaceId, status: 'disconnected', error: 'Connection attempt was superseded' }
      }

      return this.failConnection(workspaceId, state, connection, this.errorToSafeMessage(error, connection))
    } finally {
      clearTimeout(timeout)
    }
  }

  private getOrCreateWorkspaceState(workspaceId: string): WorkspaceClientState {
    let state = this.workspaceStates.get(workspaceId)
    if (!state) {
      state = {
        subscribers: new Map(),
        attemptId: 0,
        retryDelayMs: INITIAL_RETRY_DELAY_MS,
      }
      this.workspaceStates.set(workspaceId, state)
    }
    return state
  }

  private emitStatus(workspaceId: string, state: WorkspaceClientState, payload: FlashQueryStatusPayload): void {
    if (this.workspaceStates.get(workspaceId) !== state) return

    state.status = payload
    const subscribers = state.subscribers.get('status')
    if (!subscribers) return

    for (const handler of subscribers) {
      try {
        handler(payload)
      } catch {
        // Subscriber failures must not alter connection state or suppress later handlers.
      }
    }
  }

  private failConnection(
    workspaceId: string,
    state: WorkspaceClientState,
    connection: FlashQueryConnection,
    error: string,
  ): FlashQueryStatusPayload {
    const payload: FlashQueryStatusPayload = { workspaceId, status: 'disconnected', error }
    this.emitStatus(workspaceId, state, payload)
    this.scheduleRetry(workspaceId, state, connection)
    return payload
  }

  private scheduleRetry(workspaceId: string, state: WorkspaceClientState, connection: FlashQueryConnection): void {
    if (this.workspaceStates.get(workspaceId) !== state) return

    this.clearRetryTimer(state)
    const delayMs = state.retryDelayMs
    state.retryDelayMs = Math.min(delayMs * 2, MAX_RETRY_DELAY_MS)
    state.retryTimer = setTimeout(() => {
      if (this.workspaceStates.get(workspaceId) !== state) return
      void this.probeConnection(workspaceId, state, connection)
    }, delayMs)
  }

  private clearRetryTimer(state: WorkspaceClientState): void {
    if (!state.retryTimer) return
    clearTimeout(state.retryTimer)
    state.retryTimer = undefined
  }

  private buildInfoUrl(url: string): string {
    return `${url.replace(/\/+$/, '')}/mcp/info`
  }

  private buildMcpUrl(url: string): string {
    return `${url.replace(/\/+$/, '')}/mcp`
  }

  private parseInfoPayload(value: unknown): { version: string; instanceId: string } | null {
    if (!value || typeof value !== 'object') return null
    const info = value as Record<string, unknown>
    if (typeof info.version !== 'string' || typeof info.instance_id !== 'string') return null
    return { version: info.version, instanceId: info.instance_id }
  }

  private errorToSafeMessage(error: unknown, connection?: FlashQueryConnection, tokenOverride?: string | null): string {
    let message = error instanceof Error ? error.message : String(error)
    const token = connection?.auth?.token ?? tokenOverride
    if (token) {
      message = message.split(token).join('[redacted]')
    }
    return message || 'FlashQuery request failed'
  }

  private isCurrentAttempt(workspaceId: string, state: WorkspaceClientState, attemptId: number): boolean {
    return this.workspaceStates.get(workspaceId) === state && state.attemptId === attemptId
  }

  private async createSdkMcpClient(
    _workspaceId: string,
    connection: FlashQueryConnection,
    token: string | null,
  ): Promise<FlashQueryMcpToolClient> {
    const client = new Client({ name: 'cate', version: '1.0.3' })
    const headers = token ? new Headers({ Authorization: `Bearer ${token}` }) : undefined
    const transport = new StreamableHTTPClientTransport(new URL(this.buildMcpUrl(connection.url)), {
      ...(headers ? { requestInit: { headers } } : {}),
    })
    await client.connect(transport)
    return client
  }

  private getConfiguredConnection(workspaceId: string): FlashQueryConnection | undefined {
    return listWorkspaces().find((workspace) => workspace.id === workspaceId)?.flashqueryConnection
  }

  private async getOrCreateMcpClient(workspaceId: string): Promise<FlashQueryMcpToolClient | null> {
    const state = this.getOrCreateWorkspaceState(workspaceId)
    if (state.mcpClient) return state.mcpClient

    const connection = state.connection ?? this.getConfiguredConnection(workspaceId)
    if (!connection) return null

    state.connection = connection
    const token = await getWorkspaceToken(workspaceId)
    state.token = token
    state.mcpClient = await this.createMcpClient(workspaceId, connection, token)
    return state.mcpClient
  }

  private async requireMcpClient(workspaceId: string): Promise<FlashQueryMcpToolClient> {
    const client = await this.getOrCreateMcpClient(workspaceId)
    if (!client) {
      throw new Error('No FlashQuery connection is configured for this workspace')
    }
    return client
  }

  private async callJsonTool(
    client: FlashQueryMcpToolClient,
    name: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = await client.callTool({ name, arguments: args })
    const resultObject = result && typeof result === 'object' ? result as Record<string, unknown> : {}
    if (resultObject.isError === true) {
      throw new Error(this.extractTextContent(resultObject) || `FlashQuery ${name} failed`)
    }
    const text = this.extractTextContent(resultObject)
    if (!text) return {}
    try {
      const parsed = JSON.parse(text)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : {}
    } catch {
      throw new Error(`FlashQuery ${name} returned malformed JSON`)
    }
  }

  private extractTextContent(result: Record<string, unknown>): string | null {
    const content = result.content
    if (!Array.isArray(content)) return null
    const textPart = content.find((item) => {
      return item && typeof item === 'object'
        && (item as Record<string, unknown>).type === 'text'
        && typeof (item as Record<string, unknown>).text === 'string'
    }) as { text: string } | undefined
    return textPart?.text ?? null
  }

  private normalizeVaultEntry(entry: unknown): FlashQueryVaultEntry[] {
    if (!entry || typeof entry !== 'object') return []
    const item = entry as Record<string, unknown>
    if (typeof item.name !== 'string') return []
    const path = typeof item.path === 'string'
      ? item.path
      : typeof item.vaultPath === 'string'
        ? item.vaultPath
        : null
    if (!path) return []
    if (item.type !== 'directory' && item.type !== 'file' && item.type !== 'folder' && item.type !== 'document') return []
    return [{
      name: item.name,
      type: item.type === 'directory' || item.type === 'folder' ? 'folder' : 'document',
      vaultPath: path,
      ...(typeof item.title === 'string' ? { title: item.title } : {}),
    }]
  }

  private isErrorEnvelope(payload: Record<string, unknown>): boolean {
    return typeof payload.error === 'string'
  }

  private errorEnvelopeMessage(payload: Record<string, unknown>): string {
    return typeof payload.message === 'string'
      ? payload.message
      : typeof payload.error === 'string'
        ? payload.error
        : 'FlashQuery tool call failed'
  }
}
