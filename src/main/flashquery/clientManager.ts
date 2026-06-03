import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import type {
  FlashQueryConnection,
  FlashQueryDocumentBody,
  FlashQueryDocumentPart,
  FlashQueryDocumentSearchResult,
  FlashQueryFrontmatter,
  FlashQueryGetDocumentOptions,
  FlashQueryMemorySearchResult,
  FlashQuerySearchEntityType,
  FlashQuerySearchParams,
  FlashQuerySearchResponse,
  FlashQueryVaultEntry,
  FlashQueryVaultIndexEntry,
  FlashQueryWritePayload,
  FlashQueryWriteResult,
} from '../../shared/types'
import { FLASHQUERY_MANAGED_FRONTMATTER_FIELDS } from '../../shared/types'
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
  mcpClientPromise?: Promise<FlashQueryMcpToolClient | null>
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
    const staleClient = state.mcpClient
    state.mcpClient = undefined
    state.mcpClientPromise = undefined
    state.token = undefined
    this.closeClientQuietly(staleClient)
    state.connection = connection
    return this.probeConnection(workspaceId, state, connection)
  }

  async retry(workspaceId: string): Promise<FlashQueryStatusPayload> {
    const state = this.getOrCreateWorkspaceState(workspaceId)
    const connection = state.connection ?? this.getConfiguredConnection(workspaceId)
    if (!state || !connection) {
      const payload: FlashQueryStatusPayload = {
        workspaceId,
        status: 'disconnected',
        error: 'No FlashQuery connection is configured for this workspace',
      }
      this.emitStatus(workspaceId, state, payload)
      return payload
    }

    state.connection = connection
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
      this.closeClientQuietly(state.mcpClient)
    }
    this.workspaceStates.delete(workspaceId)
  }

  async listVault(workspaceId: string, vaultPath?: string): Promise<FlashQueryVaultEntry[]> {
    let state = this.workspaceStates.get(workspaceId)
    if (state?.status?.status === 'disconnected') return []

    try {
      const client = await this.getOrCreateMcpClient(workspaceId)
      if (!client) return []

      const payload = await this.callJsonTool(client, 'list_vault', {
        path: vaultPath && vaultPath.length > 0 ? vaultPath : '/',
        include: ['tracking'],
      })

      const entries = Array.isArray(payload.entries) ? payload.entries : []
      return entries.flatMap((entry) => this.normalizeVaultEntry(entry))
    } catch (error) {
      state = this.workspaceStates.get(workspaceId)
      const connection = state?.connection ?? this.getConfiguredConnection(workspaceId)
      const message = this.errorToSafeMessage(error, connection, state?.token)
      if (state && connection) {
        this.failConnection(workspaceId, state, connection, message)
      }
      return []
    }
  }

  async getDocument(
    workspaceId: string,
    vaultPath: string,
    options?: FlashQueryGetDocumentOptions,
  ): Promise<FlashQueryDocumentBody> {
    try {
      const client = await this.requireMcpClient(workspaceId)
      const include = this.normalizeDocumentInclude(options)
      const payload = await this.callJsonTool(client, 'get_document', {
        identifiers: vaultPath,
        include,
      })

      if (this.isErrorEnvelope(payload)) {
        throw new Error(this.errorEnvelopeMessage(payload))
      }

      if (include.includes('body') && typeof payload.body !== 'string') {
        throw new Error(`FlashQuery get_document returned no body for ${vaultPath}`)
      }
      if (include.includes('frontmatter') && !this.isPlainObject(payload.frontmatter)) {
        throw new Error(`FlashQuery get_document returned no frontmatter for ${vaultPath}`)
      }

      return {
        body: typeof payload.body === 'string' ? payload.body : '',
        ...(this.isPlainObject(payload.frontmatter) ? { frontmatter: payload.frontmatter } : {}),
        ...(typeof payload.version_token === 'string' ? { version_token: payload.version_token } : {}),
        ...(typeof payload.modified === 'string' ? { modified: payload.modified } : {}),
      }
    } catch (error) {
      const state = this.workspaceStates.get(workspaceId)
      const connection = state?.connection ?? this.getConfiguredConnection(workspaceId)
      throw new Error(this.errorToSafeMessage(error, connection, state?.token))
    }
  }

  async writeDocument(workspaceId: string, vaultPath: string, payload: FlashQueryWritePayload): Promise<FlashQueryWriteResult> {
    try {
      const writeArgs = this.normalizeWritePayload(vaultPath, payload)
      const client = await this.requireMcpClient(workspaceId)
      const resultPayload = await this.callJsonTool(client, 'write_document', writeArgs)

      if (this.isErrorEnvelope(resultPayload)) {
        return { success: false, error: this.errorEnvelopeMessage(resultPayload) }
      }

      return {
        success: true,
        modified: typeof resultPayload.modified === 'string' ? resultPayload.modified : '',
      }
    } catch (error) {
      const state = this.workspaceStates.get(workspaceId)
      const connection = state?.connection ?? this.getConfiguredConnection(workspaceId)
      return { success: false, error: this.errorToSafeMessage(error, connection, state?.token) }
    }
  }

  async search(workspaceId: string, params: FlashQuerySearchParams): Promise<FlashQuerySearchResponse> {
    const state = this.workspaceStates.get(workspaceId)
    const connection = state?.connection ?? this.getConfiguredConnection(workspaceId)
    try {
      const searchArgs = this.normalizeSearchArgs(params)
      if (!connection && !state?.connection) {
        return this.emptySearchResponse('No FlashQuery connection is configured for this workspace')
      }
      const client = await this.requireMcpClient(workspaceId)
      const payload = await this.callJsonTool(client, 'search', searchArgs)
      if (this.isErrorEnvelope(payload)) {
        return this.emptySearchResponse(this.errorEnvelopeMessage(payload))
      }
      return this.normalizeSearchResponse(payload)
    } catch (error) {
      const latestState = this.workspaceStates.get(workspaceId)
      const latestConnection = latestState?.connection ?? connection ?? this.getConfiguredConnection(workspaceId)
      return this.emptySearchResponse(this.errorToSafeMessage(error, latestConnection, latestState?.token))
    }
  }

  async listVaultIndex(workspaceId: string): Promise<FlashQueryVaultIndexEntry[]> {
    let state = this.workspaceStates.get(workspaceId)
    if (state?.status?.status === 'disconnected') return []

    try {
      const client = await this.requireMcpClient(workspaceId)
      const payload = await this.callJsonTool(client, 'list_vault_index', {})
      const entries = Array.isArray(payload.entries) ? payload.entries : Array.isArray(payload.documents) ? payload.documents : []
      return entries.flatMap((entry) => this.normalizeVaultIndexEntry(entry))
    } catch (error) {
      state = this.workspaceStates.get(workspaceId)
      const connection = state?.connection ?? this.getConfiguredConnection(workspaceId)
      const message = this.errorToSafeMessage(error, connection, state?.token)
      if (state && connection) {
        this.failConnection(workspaceId, state, connection, message)
      }
      return []
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
      const headers: Record<string, string> = { Accept: 'application/json' }

      const response = await globalThis.fetch(this.buildInfoUrl(connection.url), {
        method: 'GET',
        headers,
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
    const staleClient = state.mcpClient
    state.mcpClient = undefined
    state.mcpClientPromise = undefined
    this.closeClientQuietly(staleClient)
    const payload: FlashQueryStatusPayload = { workspaceId, status: 'disconnected', error }
    this.emitStatus(workspaceId, state, payload)
    this.scheduleRetry(workspaceId, state, connection)
    return payload
  }

  private closeClientQuietly(client: FlashQueryMcpToolClient | undefined): void {
    void Promise.resolve(client?.close?.()).catch(() => {
      // Best-effort transport cleanup; connection state has already advanced.
    })
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
    if (state.mcpClientPromise) return state.mcpClientPromise

    const connection = state.connection ?? this.getConfiguredConnection(workspaceId)
    if (!connection) return null

    const creation = (async (): Promise<FlashQueryMcpToolClient | null> => {
      state.connection = connection
      const attemptId = state.attemptId
      const token = await getWorkspaceToken(workspaceId)
      if (!this.isCurrentAttempt(workspaceId, state, attemptId) || state.connection !== connection) {
        return null
      }

      state.token = token
      const client = await this.createMcpClient(workspaceId, connection, token)

      if (!this.isCurrentAttempt(workspaceId, state, attemptId) || state.connection !== connection) {
        this.closeClientQuietly(client)
        return null
      }

      state.mcpClient = client
      return client
    })()

    state.mcpClientPromise = creation
    try {
      return await creation
    } finally {
      if (state.mcpClientPromise === creation) {
        state.mcpClientPromise = undefined
      }
    }
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

  private normalizeDocumentInclude(options?: FlashQueryGetDocumentOptions): FlashQueryDocumentPart[] {
    const rawInclude = options?.include ?? ['body']
    const include: FlashQueryDocumentPart[] = []
    for (const part of rawInclude) {
      if (part !== 'body' && part !== 'frontmatter') {
        throw new Error(`Unsupported FlashQuery document part: ${String(part)}`)
      }
      if (!include.includes(part)) include.push(part)
    }
    return include.length > 0 ? include : ['body']
  }

  private normalizeWritePayload(vaultPath: string, payload: FlashQueryWritePayload): Record<string, unknown> {
    const args: Record<string, unknown> = { mode: 'update', identifier: vaultPath }
    if (typeof payload === 'string') {
      return { ...args, content: payload }
    }
    if (!this.isPlainObject(payload)) {
      throw new Error('FlashQuery write payload must be a string or object')
    }
    if (typeof payload.content === 'string') {
      args.content = payload.content
    }
    if (this.isPlainObject(payload.frontmatter)) {
      const frontmatter = this.filterManagedFrontmatter(payload.frontmatter)
      if (Object.keys(frontmatter).length > 0) args.frontmatter = frontmatter
    }
    if (payload.tags !== undefined) {
      if (!Array.isArray(payload.tags) || payload.tags.some((tag) => typeof tag !== 'string')) {
        throw new Error('FlashQuery write payload tags must be strings')
      }
      args.tags = payload.tags
    }
    if (!('content' in args) && !('frontmatter' in args) && !('tags' in args)) {
      throw new Error('FlashQuery write payload must include content, frontmatter, or tags')
    }
    return args
  }

  private filterManagedFrontmatter(frontmatter: FlashQueryFrontmatter): FlashQueryFrontmatter {
    return Object.fromEntries(
      Object.entries(frontmatter).filter(([key]) => !FLASHQUERY_MANAGED_FRONTMATTER_FIELDS.includes(key as never)),
    )
  }

  private normalizeSearchArgs(params: FlashQuerySearchParams): Record<string, unknown> {
    const mode = params.mode ?? 'mixed'
    if (mode !== 'filesystem' && mode !== 'mixed' && mode !== 'semantic') {
      throw new Error(`Unsupported FlashQuery search mode: ${String(mode)}`)
    }
    const entityTypes = params.entity_types?.length ? this.normalizeSearchEntityTypes(params.entity_types) : ['documents', 'memories']
    const limit = Number.isFinite(params.limit) && Number.isInteger(params.limit) && params.limit! > 0 ? params.limit! : 50
    const query = typeof params.query === 'string' ? params.query : ''
    if (mode === 'semantic' && query.trim().length === 0) {
      throw new Error('Type a query to search semantically.')
    }
    return {
      query,
      mode,
      entity_types: entityTypes,
      limit,
      include_archived: true,
      ...(query.trim().length === 0 ? { list_all: true } : {}),
    }
  }

  private normalizeSearchEntityTypes(entityTypes: FlashQuerySearchEntityType[]): FlashQuerySearchEntityType[] {
    const normalized: FlashQuerySearchEntityType[] = []
    for (const entityType of entityTypes) {
      if (entityType !== 'documents' && entityType !== 'memories') {
        throw new Error(`Unsupported FlashQuery search entity type: ${String(entityType)}`)
      }
      if (!normalized.includes(entityType)) normalized.push(entityType)
    }
    return normalized.length > 0 ? normalized : ['documents', 'memories']
  }

  private normalizeSearchResponse(payload: Record<string, unknown>): FlashQuerySearchResponse {
    const documents = this.arrayFrom(payload.documents ?? payload.results)
      .flatMap((entry) => this.normalizeDocumentSearchResult(entry))
    const memories = this.arrayFrom(payload.memories)
      .flatMap((entry) => this.normalizeMemorySearchResult(entry))
    return {
      documents,
      memories,
      total_documents: typeof payload.total_documents === 'number' ? payload.total_documents : documents.length,
      total_memories: typeof payload.total_memories === 'number' ? payload.total_memories : memories.length,
    }
  }

  private emptySearchResponse(error: string): FlashQuerySearchResponse {
    return { documents: [], memories: [], total_documents: 0, total_memories: 0, error }
  }

  private normalizeDocumentSearchResult(entry: unknown): FlashQueryDocumentSearchResult[] {
    if (!this.isPlainObject(entry)) return []
    const path = this.normalizePath(this.firstString(entry.fullPath, entry.vaultPath, entry.path, entry.filename))
    if (!path) return []
    return [{
      filename: this.filenameFromPath(path),
      fullPath: path,
      ...(typeof entry.title === 'string' ? { title: entry.title } : {}),
      ...(typeof entry.snippet === 'string' ? { snippet: entry.snippet } : {}),
    }]
  }

  private normalizeMemorySearchResult(entry: unknown): FlashQueryMemorySearchResult[] {
    if (!this.isPlainObject(entry)) return []
    const id = this.firstString(entry.id, entry.memory_id)
    const text = this.firstString(entry.text, entry.content, entry.body, entry.snippet)
    if (!id || !text) return []
    return [{
      id,
      text,
      ...(typeof entry.title === 'string' ? { title: entry.title } : {}),
      ...(typeof entry.snippet === 'string' ? { snippet: entry.snippet } : {}),
    }]
  }

  private normalizeVaultIndexEntry(entry: unknown): FlashQueryVaultIndexEntry[] {
    if (!this.isPlainObject(entry)) return []
    const path = this.normalizePath(this.firstString(entry.fullPath, entry.vaultPath, entry.path, entry.filename))
    if (!path) return []
    return [{ filename: this.filenameFromPath(path), fullPath: path }]
  }

  private arrayFrom(value: unknown): unknown[] {
    return Array.isArray(value) ? value : []
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
  }

  private firstString(...values: unknown[]): string | null {
    return values.find((value): value is string => typeof value === 'string' && value.length > 0) ?? null
  }

  private normalizePath(path: string | null): string | null {
    return path ? path.replace(/\\/g, '/') : null
  }

  private filenameFromPath(path: string): string {
    return path.split('/').filter(Boolean).at(-1) ?? path
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
