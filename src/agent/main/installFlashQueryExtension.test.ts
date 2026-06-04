import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'

const mocks = vi.hoisted(() => ({
  appPath: '',
  agentRoot: '',
  info: vi.fn(),
  warn: vi.fn(),
  workspaces: [] as Array<{
    id: string
    name: string
    color: string
    rootPath: string
    flashqueryConnection?: { transport: 'http'; url: string }
  }>,
  tokens: new Map<string, string>(),
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

vi.mock('../../main/workspaceManager', () => ({
  listWorkspaces: () => mocks.workspaces,
}))

vi.mock('../../main/flashquery/credentials', () => ({
  getWorkspaceToken: vi.fn(async (workspaceId: string) => mocks.tokens.get(workspaceId) ?? null),
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
    mocks.workspaces = []
    mocks.tokens.clear()
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

  it('T-U-013 writes workspace handoff with bearer token from the main credential store', async () => {
    const cwd = path.join(makeTmpDir(), 'workspace-g')
    dirs.push(path.dirname(cwd))
    mocks.workspaces = [{
      id: 'workspace-token',
      name: 'Workspace',
      color: '#00aaff',
      rootPath: cwd,
      flashqueryConnection: { transport: 'http', url: 'http://127.0.0.1:3210/mcp' },
    }]
    mocks.tokens.set('workspace-token', 'stored-token-secret')

    const {
      FLASHQUERY_HANDOFF_FILE,
      writeFlashQueryExtensionHandoff,
    } = await import('./installFlashQueryExtension')
    await writeFlashQueryExtensionHandoff(cwd, 'workspace-token')

    const file = path.join(mocks.agentRoot, 'workspace-g', '.cate', 'pi-agent', FLASHQUERY_HANDOFF_FILE)
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual({
      version: 1,
      workspaceId: 'workspace-token',
      endpointUrl: 'http://127.0.0.1:3210',
      authMode: 'bearer',
      bearerToken: 'stored-token-secret',
    })
  })

  it('T-U-013 does not fabricate a bearer token from sanitized workspace metadata', async () => {
    const cwd = path.join(makeTmpDir(), 'workspace-h')
    dirs.push(path.dirname(cwd))
    mocks.workspaces = [{
      id: 'workspace-no-token',
      name: 'Workspace',
      color: '#00aaff',
      rootPath: cwd,
      flashqueryConnection: { transport: 'http', url: 'https://flashquery.local/' },
    }]

    const {
      FLASHQUERY_HANDOFF_FILE,
      writeFlashQueryExtensionHandoff,
    } = await import('./installFlashQueryExtension')
    await writeFlashQueryExtensionHandoff(cwd, 'workspace-no-token')

    const file = path.join(mocks.agentRoot, 'workspace-h', '.cate', 'pi-agent', FLASHQUERY_HANDOFF_FILE)
    expect(JSON.parse(fs.readFileSync(file, 'utf-8'))).toEqual({
      version: 1,
      workspaceId: 'workspace-no-token',
      endpointUrl: 'https://flashquery.local',
      authMode: 'none',
    })
  })

  it('T-U-013 keeps FlashQuery bearer tokens out of pi auth.json', async () => {
    const cwd = path.join(makeTmpDir(), 'workspace-i')
    dirs.push(path.dirname(cwd))
    mocks.workspaces = [{
      id: 'workspace-auth-boundary',
      name: 'Workspace',
      color: '#00aaff',
      rootPath: cwd,
      flashqueryConnection: { transport: 'http', url: 'https://flashquery.local' },
    }]
    mocks.tokens.set('workspace-auth-boundary', 'auth-boundary-secret')

    const { writeFlashQueryExtensionHandoff } = await import('./installFlashQueryExtension')
    await writeFlashQueryExtensionHandoff(cwd, 'workspace-auth-boundary')

    const authFile = path.join(mocks.agentRoot, 'workspace-i', '.cate', 'pi-agent', 'auth.json')
    expect(fs.existsSync(authFile)).toBe(false)
  })
})
