import { create } from 'zustand'

export interface SemanticConnectionsChromeStateEntry {
  connectionCount: number
  configOpen: boolean
  configActive: boolean
  toggleConfig: () => void
  filterOpen: boolean
  filterActive: boolean
  toggleFilter: () => void
}

interface SemanticConnectionsChromeState {
  panels: Record<string, SemanticConnectionsChromeStateEntry | undefined>
  setPanelChrome: (panelId: string, entry: SemanticConnectionsChromeStateEntry) => void
  clearPanelChrome: (panelId: string) => void
}

export const useSemanticConnectionsChromeStore = create<SemanticConnectionsChromeState>((set) => ({
  panels: {},
  setPanelChrome: (panelId, entry) => set((state) => ({
    panels: {
      ...state.panels,
      [panelId]: entry,
    },
  })),
  clearPanelChrome: (panelId) => set((state) => {
    const { [panelId]: _removed, ...panels } = state.panels
    return { panels }
  }),
}))

export function clearSemanticConnectionsChromeForTests(): void {
  useSemanticConnectionsChromeStore.setState({ panels: {} })
}
