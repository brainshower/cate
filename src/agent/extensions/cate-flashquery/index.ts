// =============================================================================
// cate-flashquery — bundled Pi extension for Cate-provided FlashQuery workspace
// handoff. It registers host-eligible current FlashQuery MCP tools as Pi tools
// and delegates execution through the current workspace's FlashQuery client.
// =============================================================================

import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { createCateFlashQueryLifecycle } from './lifecycle'
import type { CateFlashQueryExtensionDeps } from './lifecycle'

export function createCateFlashQueryExtension(
  pi: ExtensionAPI,
  deps: CateFlashQueryExtensionDeps = {},
): void {
  const lifecycle = createCateFlashQueryLifecycle(pi, deps)

  pi.on('session_start', async (_event, ctx) => {
    await lifecycle.rebind(ctx.cwd, ctx.signal)
    lifecycle.watchHandoff(ctx.cwd)
  })

  pi.on('session_shutdown', async () => {
    await lifecycle.shutdown()
  })
}

export default function (pi: ExtensionAPI): void {
  createCateFlashQueryExtension(pi)
}
