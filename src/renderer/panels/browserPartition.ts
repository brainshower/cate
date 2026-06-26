export function browserPartitionForWorkspace(workspaceId: string): string {
  const id = workspaceId.trim()
  if (!id) {
    throw new Error('Browser workspaceId is required')
  }
  return `persist:browser-ws-${id}`
}
