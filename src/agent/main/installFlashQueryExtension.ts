// =============================================================================
// installFlashQueryExtension — copy the bundled cate-flashquery extension into
// a workspace's pi-agent extensions dir on first use, where pi auto-discovers it.
//
// Mirrors installPlanModeExtension: source lives in src/ during development and
// under resources/cate-extensions/ in packaged builds. Existing destination
// files are left untouched so user edits are never overwritten.
// =============================================================================

import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'
import { app } from 'electron'
import log from '../../main/logger'
import { agentDirFor } from './agentDir'
import { getWorkspaceToken } from '../../main/flashquery/credentials'
import { listWorkspaces } from '../../main/workspaceManager'
import { normalizeFlashQueryConnectionUrl } from '../../shared/types'

export const FLASHQUERY_HANDOFF_FILE = 'flashquery-handoff.json'

export interface FlashQueryExtensionHandoff {
  version: 1
  workspaceId: string
  endpointUrl: string | null
  authMode: 'none' | 'bearer'
  bearerToken?: string
}

function sourceDir(): string | null {
  const candidates = [
    path.join(app.getAppPath(), 'src', 'agent', 'extensions', 'cate-flashquery'),
    path.join(process.resourcesPath ?? '', 'cate-extensions', 'cate-flashquery'),
  ]
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate
  }
  return null
}

async function copyIfMissing(src: string, dest: string): Promise<void> {
  try {
    await fsp.access(dest)
    return
  } catch { /* fall through */ }
  await fsp.mkdir(path.dirname(dest), { recursive: true })
  await fsp.copyFile(src, dest)
  log.info('[installFlashQueryExtension] installed %s', dest)
}

async function copyExtensionFilesIfMissing(srcDir: string, destDir: string): Promise<void> {
  const entries = await fsp.readdir(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (entry.name !== 'package.json' && !entry.name.endsWith('.ts')) continue
    if (entry.name.endsWith('.test.ts')) continue
    await copyIfMissing(path.join(srcDir, entry.name), path.join(destDir, entry.name))
  }
}

const installed = new Set<string>()

export async function installFlashQueryExtension(cwd: string): Promise<void> {
  const home = agentDirFor(cwd)
  if (installed.has(home)) return
  try {
    const src = sourceDir()
    if (!src) {
      log.warn('[installFlashQueryExtension] source dir not found — FlashQuery extension not installed')
      return
    }
    installed.add(home)
    const destDir = path.join(home, 'extensions', 'cate-flashquery')
    await copyExtensionFilesIfMissing(src, destDir)
  } catch (err) {
    log.warn('[installFlashQueryExtension] install failed: %O', err)
  }
}

export async function writeFlashQueryExtensionHandoff(
  cwd: string,
  workspaceId: string,
): Promise<void> {
  try {
    const workspace = listWorkspaces().find((item) => item.id === workspaceId)
    const endpointUrl = workspace?.flashqueryConnection?.url
      ? normalizeFlashQueryConnectionUrl(workspace.flashqueryConnection.url) ?? null
      : null
    const token = endpointUrl ? await getWorkspaceToken(workspaceId) : null
    const payload: FlashQueryExtensionHandoff = {
      version: 1,
      workspaceId,
      endpointUrl,
      authMode: token ? 'bearer' : 'none',
      ...(token ? { bearerToken: token } : {}),
    }
    const file = path.join(agentDirFor(cwd), FLASHQUERY_HANDOFF_FILE)
    await fsp.mkdir(path.dirname(file), { recursive: true })
    await fsp.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
    try { await fsp.chmod(file, 0o600) } catch { /* no file modes on this platform */ }
  } catch (err) {
    log.warn('[installFlashQueryExtension] handoff write failed: %O', err)
  }
}
