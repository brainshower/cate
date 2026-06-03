const pendingRevealByWorkspace = new Map<string, string>()

export function setPendingFlashQuerySearchReveal(workspaceId: string, vaultPath: string): void {
  pendingRevealByWorkspace.set(workspaceId, vaultPath)
}

export function peekPendingFlashQuerySearchReveal(workspaceId: string): string | undefined {
  return pendingRevealByWorkspace.get(workspaceId)
}

export function takePendingFlashQuerySearchReveal(workspaceId: string): string | undefined {
  const vaultPath = pendingRevealByWorkspace.get(workspaceId)
  if (vaultPath) pendingRevealByWorkspace.delete(workspaceId)
  return vaultPath
}
