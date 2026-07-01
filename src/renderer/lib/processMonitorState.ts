/** Last agent name observed per terminal. Kept outside the React hook module so
 * stores can clean up without importing hook code. */
const lastAgentName: Map<string, string | null> = new Map()

export function forgetTerminalForProcessMonitor(terminalId: string): void {
  lastAgentName.delete(terminalId)
}

export function getLastObservedAgentName(terminalId: string): string | null {
  return lastAgentName.get(terminalId) ?? null
}

export function setLastObservedAgentName(terminalId: string, agentName: string | null): void {
  lastAgentName.set(terminalId, agentName)
}
