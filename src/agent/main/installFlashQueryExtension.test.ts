import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const mocks = vi.hoisted(() => ({
  appPath: '',
  agentRoot: '',
  info: vi.fn(),
  warn: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    getAppPath: () => mocks.appPath,
  },
}))

vi.mock('../../main/logger', () => ({
  default: {
    info: mocks.info,
    warn: mocks.warn,
  },
}))

vi.mock('./agentDir', () => ({
  agentDirFor: (cwd: string) => path.join(mocks.agentRoot, path.basename(cwd), '.cate', 'pi-agent'),
}))

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cate-fq-install-test-'))
}

function cleanup(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch { /* temp dir */ }
}

function writeExtensionSource(root: string, contents: string): string {
  const dir = path.join(root, 'src', 'agent', 'extensions', 'cate-flashquery')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.ts'), `export default ${JSON.stringify(contents)}\n`)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: contents }, null, 2))
  return dir
}

function writeProdExtensionSource(resourcesPath: string, contents: string): string {
  const dir = path.join(resourcesPath, 'cate-extensions', 'cate-flashquery')
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.ts'), `export default ${JSON.stringify(contents)}\n`)
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: contents }, null, 2))
  return dir
}

function setResourcesPath(value: string): void {
  Object.defineProperty(process, 'resourcesPath', {
    configurable: true,
    value,
  })
}

describe('installFlashQueryExtension', () => {
  const dirs: string[] = []

  beforeEach(() => {
    vi.resetModules()
    mocks.info.mockReset()
    mocks.warn.mockReset()
    const appRoot = makeTmpDir()
    const resourcesRoot = makeTmpDir()
    const agentRoot = makeTmpDir()
    dirs.push(appRoot, resourcesRoot, agentRoot)
    mocks.appPath = appRoot
    mocks.agentRoot = agentRoot
    setResourcesPath(resourcesRoot)
  })

  afterEach(() => {
    for (const dir of dirs) cleanup(dir)
    dirs.length = 0
  })

  it('T-U-013 copies bundled FlashQuery extension files into the workspace pi-agent dir', async () => {
    writeExtensionSource(mocks.appPath, 'dev-source')
    const cwd = path.join(makeTmpDir(), 'workspace-a')
    dirs.push(path.dirname(cwd))

    const { installFlashQueryExtension } = await import('./installFlashQueryExtension')
    await installFlashQueryExtension(cwd)

    const dest = path.join(mocks.agentRoot, 'workspace-a', '.cate', 'pi-agent', 'extensions', 'cate-flashquery')
    expect(fs.readFileSync(path.join(dest, 'index.ts'), 'utf-8')).toContain('dev-source')
    expect(JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf-8'))).toEqual({
      name: 'dev-source',
    })
  })

  it('T-U-013 leaves existing destination files untouched', async () => {
    writeExtensionSource(mocks.appPath, 'dev-source')
    const cwd = path.join(makeTmpDir(), 'workspace-b')
    dirs.push(path.dirname(cwd))
    const dest = path.join(mocks.agentRoot, 'workspace-b', '.cate', 'pi-agent', 'extensions', 'cate-flashquery')
    fs.mkdirSync(dest, { recursive: true })
    fs.writeFileSync(path.join(dest, 'index.ts'), 'user-edited-index')
    fs.writeFileSync(path.join(dest, 'package.json'), 'user-edited-package')

    const { installFlashQueryExtension } = await import('./installFlashQueryExtension')
    await installFlashQueryExtension(cwd)

    expect(fs.readFileSync(path.join(dest, 'index.ts'), 'utf-8')).toBe('user-edited-index')
    expect(fs.readFileSync(path.join(dest, 'package.json'), 'utf-8')).toBe('user-edited-package')
  })

  it('T-U-013 is cached per workspace agent dir', async () => {
    writeExtensionSource(mocks.appPath, 'first-source')
    const cwd = path.join(makeTmpDir(), 'workspace-c')
    dirs.push(path.dirname(cwd))

    const { installFlashQueryExtension } = await import('./installFlashQueryExtension')
    await installFlashQueryExtension(cwd)

    const dest = path.join(mocks.agentRoot, 'workspace-c', '.cate', 'pi-agent', 'extensions', 'cate-flashquery')
    fs.rmSync(path.join(dest, 'index.ts'))
    await installFlashQueryExtension(cwd)

    expect(fs.existsSync(path.join(dest, 'index.ts'))).toBe(false)
  })

  it('T-U-013 prefers the development source path when both dev and prod exist', async () => {
    writeExtensionSource(mocks.appPath, 'dev-source')
    writeProdExtensionSource(process.resourcesPath, 'prod-source')
    const cwd = path.join(makeTmpDir(), 'workspace-d')
    dirs.push(path.dirname(cwd))

    const { installFlashQueryExtension } = await import('./installFlashQueryExtension')
    await installFlashQueryExtension(cwd)

    const dest = path.join(mocks.agentRoot, 'workspace-d', '.cate', 'pi-agent', 'extensions', 'cate-flashquery')
    expect(fs.readFileSync(path.join(dest, 'index.ts'), 'utf-8')).toContain('dev-source')
  })

  it('T-U-013 uses the production resources source when dev source is absent', async () => {
    writeProdExtensionSource(process.resourcesPath, 'prod-source')
    const cwd = path.join(makeTmpDir(), 'workspace-e')
    dirs.push(path.dirname(cwd))

    const { installFlashQueryExtension } = await import('./installFlashQueryExtension')
    await installFlashQueryExtension(cwd)

    const dest = path.join(mocks.agentRoot, 'workspace-e', '.cate', 'pi-agent', 'extensions', 'cate-flashquery')
    expect(fs.readFileSync(path.join(dest, 'index.ts'), 'utf-8')).toContain('prod-source')
  })

  it('T-U-013 warns and does not throw when no bundled source exists', async () => {
    const cwd = path.join(makeTmpDir(), 'workspace-f')
    dirs.push(path.dirname(cwd))

    const { installFlashQueryExtension } = await import('./installFlashQueryExtension')
    await expect(installFlashQueryExtension(cwd)).resolves.toBeUndefined()

    expect(mocks.warn).toHaveBeenCalledWith(
      '[installFlashQueryExtension] source dir not found — FlashQuery extension not installed',
    )
  })
})
