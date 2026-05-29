import type { FlashQueryConnection } from '../../shared/types'

export type FlashQueryClientEventType = 'status' | 'vault-changed' | 'tools-changed' | (string & {})

export interface FlashQueryClientEvent<T = unknown> {
  workspaceId: string
  type: FlashQueryClientEventType
  payload: T
}

export type FlashQueryClientEventHandler<T = unknown> = (event: FlashQueryClientEvent<T>) => void

export type FlashQueryConnectionStatus = 'connecting' | 'live' | 'disconnected'

export interface FlashQueryStatusPayload {
  status: FlashQueryConnectionStatus
  version?: string
  instanceId?: string
  error?: string
}

const INITIAL_RETRY_DELAY_MS = 2_000
const MAX_RETRY_DELAY_MS = 60_000
const PROBE_TIMEOUT_MS = 10_000

interface WorkspaceClientState {
  subscribers: Map<FlashQueryClientEventType, Set<FlashQueryClientEventHandler>>
  connection?: FlashQueryConnection
  status?: FlashQueryStatusPayload
  attemptId: number
  retryDelayMs: number
  retryTimer?: ReturnType<typeof setTimeout>
}

export class FlashQueryClientManager {
  private readonly workspaceStates = new Map<string, WorkspaceClientState>()

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
    }
    this.workspaceStates.delete(workspaceId)
  }

  private async probeConnection(
    workspaceId: string,
    state: WorkspaceClientState,
    connection: FlashQueryConnection,
  ): Promise<FlashQueryStatusPayload> {
    this.clearRetryTimer(state)
    state.attemptId += 1
    const attemptId = state.attemptId

    this.emitStatus(workspaceId, state, { status: 'connecting' })

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
        return state.status ?? { status: 'disconnected', error: 'Connection attempt was superseded' }
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
        return state.status ?? { status: 'disconnected', error: 'Connection attempt was superseded' }
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
        return state.status ?? { status: 'disconnected', error: 'Connection attempt was superseded' }
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

    const event: FlashQueryClientEvent<FlashQueryStatusPayload> = {
      workspaceId,
      type: 'status',
      payload,
    }
    for (const handler of subscribers) {
      try {
        handler(event)
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
    const payload: FlashQueryStatusPayload = { status: 'disconnected', error }
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

  private parseInfoPayload(value: unknown): { version: string; instanceId: string } | null {
    if (!value || typeof value !== 'object') return null
    const info = value as Record<string, unknown>
    if (typeof info.version !== 'string' || typeof info.instance_id !== 'string') return null
    return { version: info.version, instanceId: info.instance_id }
  }

  private errorToSafeMessage(error: unknown, connection: FlashQueryConnection): string {
    let message = error instanceof Error ? error.message : String(error)
    const token = connection.auth?.token
    if (token) {
      message = message.split(token).join('[redacted]')
    }
    return message || 'FlashQuery info probe failed'
  }

  private isCurrentAttempt(workspaceId: string, state: WorkspaceClientState, attemptId: number): boolean {
    return this.workspaceStates.get(workspaceId) === state && state.attemptId === attemptId
  }
}
