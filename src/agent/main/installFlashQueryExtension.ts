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

const installed = new Set<string>()

export async function installFlashQueryExtension(cwd: string): Promise<void> {
  const home = agentDirFor(cwd)
  if (installed.has(home)) return
  installed.add(home)
  try {
    const src = sourceDir()
    if (!src) {
      log.warn('[installFlashQueryExtension] source dir not found — FlashQuery extension not installed')
      return
    }
    const destDir = path.join(home, 'extensions', 'cate-flashquery')
    await copyIfMissing(path.join(src, 'index.ts'), path.join(destDir, 'index.ts'))
    await copyIfMissing(path.join(src, 'package.json'), path.join(destDir, 'package.json'))
  } catch (err) {
    log.warn('[installFlashQueryExtension] install failed: %O', err)
  }
}
