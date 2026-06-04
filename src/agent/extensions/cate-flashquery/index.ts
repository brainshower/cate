// =============================================================================
// cate-flashquery — bundled Pi extension scaffold for Cate-provided FlashQuery
// workspace handoff. Tool registration and MCP invocation are added in later
// Phase 17 plans; this file only establishes the lifecycle hooks.
// =============================================================================

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'

export default function (pi: ExtensionAPI): void {
  pi.on('session_start', async () => {
    // Phase 17.2 wires registry discovery and tool registration here.
  })

  pi.on('session_shutdown', async () => {
    // Phase 17.3 wires client disposal here.
  })
}
