export type FlashQueryClientEventType = 'status' | 'vault-changed' | 'tools-changed' | (string & {})

export interface FlashQueryClientEvent {
  workspaceId: string
  type: FlashQueryClientEventType
  payload?: unknown
}

export type FlashQueryClientEventHandler<T = unknown> = (event: T) => void

interface WorkspaceClientState {
  subscribers: Map<FlashQueryClientEventType, Set<FlashQueryClientEventHandler>>
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

  dispose(workspaceId: string): void {
    this.workspaceStates.delete(workspaceId)
  }

  private getOrCreateWorkspaceState(workspaceId: string): WorkspaceClientState {
    let state = this.workspaceStates.get(workspaceId)
    if (!state) {
      state = { subscribers: new Map() }
      this.workspaceStates.set(workspaceId, state)
    }
    return state
  }
}
