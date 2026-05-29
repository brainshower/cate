export type FlashQueryClientEventType = 'status' | 'vault-changed'

export interface FlashQueryClientEvent {
  workspaceId: string
  type: FlashQueryClientEventType
  payload?: unknown
}

export type FlashQueryClientEventHandler = (event: FlashQueryClientEvent) => void

interface WorkspaceClientState {
  subscribers: Map<FlashQueryClientEventType, Set<FlashQueryClientEventHandler>>
}

export class FlashQueryClientManager {
  private readonly workspaceStates = new Map<string, WorkspaceClientState>()

  subscribe(
    workspaceId: string,
    type: FlashQueryClientEventType,
    handler: FlashQueryClientEventHandler,
  ): () => void {
    const state = this.getOrCreateWorkspaceState(workspaceId)
    let subscribers = state.subscribers.get(type)
    if (!subscribers) {
      subscribers = new Set()
      state.subscribers.set(type, subscribers)
    }
    subscribers.add(handler)

    return () => {
      subscribers?.delete(handler)
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

