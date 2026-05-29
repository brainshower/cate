import type { FlashQueryConnection } from '../../shared/types'

export type FlashQueryClientEventType = 'status' | 'vault-changed' | 'tools-changed' | (string & {})

export interface FlashQueryClientEvent<T = unknown> {
  workspaceId: string
  type: FlashQueryClientEventType
  payload: T
}

export type FlashQueryClientEventHandler<T = unknown> = (event: T) => void

export type FlashQueryConnectionStatus = 'connecting' | 'live' | 'disconnected'

export interface FlashQueryStatusPayload {
  status: FlashQueryConnectionStatus
  version?: string
  instanceId?: string
  error?: string
}

interface WorkspaceClientState {
  subscribers: Map<FlashQueryClientEventType, Set<FlashQueryClientEventHandler>>
  connection?: FlashQueryConnection
  status?: FlashQueryStatusPayload
  attemptId: number
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
    state.attemptId += 1
    const attemptId = state.attemptId

    this.emitStatus(workspaceId, { status: 'connecting' })

    try {
      const response = await globalThis.fetch(this.buildInfoUrl(connection.url), {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      if (!this.isCurrentAttempt(workspaceId, state, attemptId)) {
        return state.status ?? { status: 'disconnected', error: 'Connection attempt was superseded' }
      }

      if (!response.ok) {
        return this.failConnection(
          workspaceId,
          `FlashQuery info probe failed with ${response.status} ${response.statusText}`.trim(),
        )
      }

      const info = this.parseInfoPayload(await response.json())
      if (!info) {
        return this.failConnection(workspaceId, 'FlashQuery info probe returned an invalid response')
      }

      const payload: FlashQueryStatusPayload = {
        status: 'live',
        version: info.version,
        instanceId: info.instanceId,
      }
      this.emitStatus(workspaceId, payload)
      return payload
    } catch (error) {
      if (!this.isCurrentAttempt(workspaceId, state, attemptId)) {
        return state.status ?? { status: 'disconnected', error: 'Connection attempt was superseded' }
      }

      return this.failConnection(workspaceId, this.errorToSafeMessage(error, connection))
    }
  }

  getStatus(workspaceId: string): FlashQueryStatusPayload | null {
    return this.workspaceStates.get(workspaceId)?.status ?? null
  }

  dispose(workspaceId: string): void {
    this.workspaceStates.delete(workspaceId)
  }

  private getOrCreateWorkspaceState(workspaceId: string): WorkspaceClientState {
    let state = this.workspaceStates.get(workspaceId)
    if (!state) {
      state = { subscribers: new Map(), attemptId: 0 }
      this.workspaceStates.set(workspaceId, state)
    }
    return state
  }

  private emitStatus(workspaceId: string, payload: FlashQueryStatusPayload): void {
    const state = this.getOrCreateWorkspaceState(workspaceId)
    state.status = payload
    const subscribers = state.subscribers.get('status')
    if (!subscribers) return

    const event: FlashQueryClientEvent<FlashQueryStatusPayload> = {
      workspaceId,
      type: 'status',
      payload,
    }
    for (const handler of subscribers) {
      handler(event)
    }
  }

  private failConnection(workspaceId: string, error: string): FlashQueryStatusPayload {
    const payload: FlashQueryStatusPayload = { status: 'disconnected', error }
    this.emitStatus(workspaceId, payload)
    return payload
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
