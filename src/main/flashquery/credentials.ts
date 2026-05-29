type FlashQueryCredentialStore = {
  get: (key: string, defaultValue?: unknown) => unknown
  set: (key: string, value: unknown) => void
  delete: (key: string) => void
}

let storePromise: Promise<FlashQueryCredentialStore> | null = null

async function getStore(): Promise<FlashQueryCredentialStore> {
  if (!storePromise) {
    storePromise = import('electron-store').then(({ default: Store }) => {
      return new Store({ name: 'flashquery' }) as FlashQueryCredentialStore
    })
  }
  return storePromise
}

function tokenKey(workspaceId: string): string {
  return `tokens.${workspaceId}`
}

export async function getWorkspaceToken(workspaceId: string): Promise<string | null> {
  const store = await getStore()
  const token = store.get(tokenKey(workspaceId))
  return typeof token === 'string' ? token : null
}

export async function setWorkspaceToken(workspaceId: string, token: string | null): Promise<void> {
  const store = await getStore()
  if (token === null) {
    store.delete(tokenKey(workspaceId))
    return
  }
  store.set(tokenKey(workspaceId), token)
}

