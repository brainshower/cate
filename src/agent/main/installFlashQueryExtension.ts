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
const BUNDLED_FLASHQUERY_EXTENSION_VERSION = 3
const BUNDLE_VERSION_FILE = '.cate-bundle-version'

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

async function copyRuntimeFile(src: string, dest: string): Promise<void> {
  await fsp.mkdir(path.dirname(dest), { recursive: true })
  await fsp.copyFile(src, dest)
  log.info('[installFlashQueryExtension] installed %s', dest)
}

async function copyExtensionRuntimeFiles(srcDir: string, destDir: string): Promise<void> {
  const entries = await fsp.readdir(srcDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (entry.name !== 'package.json' && !entry.name.endsWith('.ts')) continue
    if (entry.name.endsWith('.test.ts')) continue
    await copyRuntimeFile(path.join(srcDir, entry.name), path.join(destDir, entry.name))
  }
}

async function installManagedBundle(srcDir: string, destDir: string): Promise<void> {
  const marker = path.join(destDir, BUNDLE_VERSION_FILE)
  const currentVersion = await fsp.readFile(marker, 'utf-8').catch(() => null)
  if (currentVersion?.trim() === String(BUNDLED_FLASHQUERY_EXTENSION_VERSION)) return

  const tmpDir = `${destDir}.tmp-${process.pid}-${Date.now()}`
  await fsp.rm(tmpDir, { recursive: true, force: true })
  try {
    await copyExtensionRuntimeFiles(srcDir, tmpDir)
    await fsp.writeFile(
      path.join(tmpDir, BUNDLE_VERSION_FILE),
      `${BUNDLED_FLASHQUERY_EXTENSION_VERSION}\n`,
      'utf-8',
    )
    await fsp.rm(destDir, { recursive: true, force: true })
    await fsp.rename(tmpDir, destDir)
  } catch (err) {
    await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    throw err
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
    const destDir = path.join(home, 'extensions', 'cate-flashquery')
    await installManagedBundle(src, destDir)
    installed.add(home)
  } catch (err) {
    installed.delete(home)
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
