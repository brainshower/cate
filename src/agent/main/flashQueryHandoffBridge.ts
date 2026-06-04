import log from '../../main/logger'

type FlashQueryHandoffRefresher = (workspaceId: string) => Promise<void> | void

const refreshers = new Set<FlashQueryHandoffRefresher>()

export function registerFlashQueryHandoffRefresher(refresher: FlashQueryHandoffRefresher): () => void {
  refreshers.add(refresher)
  return () => {
    refreshers.delete(refresher)
  }
}

export async function refreshFlashQueryHandoffsForWorkspace(workspaceId: string): Promise<void> {
  await Promise.all(Array.from(refreshers, async (refresher) => {
    try {
      await refresher(workspaceId)
    } catch (err) {
      log.warn('[flashQueryHandoffBridge] failed to refresh handoff for %s: %O', workspaceId, err)
    }
  }))
}
