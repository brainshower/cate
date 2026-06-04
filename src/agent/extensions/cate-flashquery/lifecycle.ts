import type { AgentToolResult, ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { watch, type FSWatcher } from 'node:fs'
import path from 'node:path'
import type { TSchema } from 'typebox'
import { openFlashQueryClient, readFlashQueryHandoff } from './client'
import { registryRecordsToToolCandidates } from './registry'
import { flashQuerySchemaToTypeBox } from './schema'
import type { FlashQueryExtensionClient, FlashQueryHandoff } from './client'
import type { FlashQueryToolCandidate } from './registry'

const STALE_TOOL_MESSAGE = 'FlashQuery tool is not available in the current FlashQuery workspace.'
const RETIRED_CLIENT_CLOSE_TIMEOUT_MS = 5_000

export interface CateFlashQueryExtensionDeps {
  readHandoff?: (cwd: string) => Promise<FlashQueryHandoff | null>
  openClient?: (handoff: FlashQueryHandoff) => Promise<FlashQueryExtensionClient | null>
  watchHandoff?: (cwd: string, onChange: () => void) => () => void
}

export interface FlashQueryToolDetails {
  flashquery: true
  toolId: string
  toolName: string
  workspaceId?: string
  generation?: number
  result?: unknown
  disconnected?: boolean
  stale?: boolean
  error?: string
}

export type FlashQueryToolResult = AgentToolResult<FlashQueryToolDetails> & { isError?: boolean }

interface FlashQueryGeneration {
  id: number
  handoff: FlashQueryHandoff
  client: FlashQueryExtensionClient
  candidates: FlashQueryToolCandidate[]
  models: unknown[]
  purposes: unknown[]
  activeCalls: number
  retiring: boolean
  closeTimer: ReturnType<typeof setTimeout> | null
  closed: boolean
}

interface RegisteredFlashQueryTool {
  name: string
  generationId: number
  candidate: FlashQueryToolCandidate
}

export interface CateFlashQueryLifecycle {
  rebind(cwd: string, signal?: AbortSignal): Promise<void>
  watchHandoff(cwd: string): void
  shutdown(): Promise<void>
  currentGeneration(): FlashQueryGeneration | null
  registeredToolNames(): string[]
}

export function createCateFlashQueryLifecycle(
  pi: ExtensionAPI,
  deps: CateFlashQueryExtensionDeps = {},
): CateFlashQueryLifecycle {
  const readHandoffImpl = deps.readHandoff ?? readFlashQueryHandoff
  const openClientImpl = deps.openClient ?? openFlashQueryClient
  const watchHandoffImpl = deps.watchHandoff ?? watchFlashQueryHandoff
  const registeredTools = new Map<string, RegisteredFlashQueryTool>()
  let current: FlashQueryGeneration | null = null
  let nextGenerationId = 0
  let stopWatching: (() => void) | null = null

  const lifecycle: CateFlashQueryLifecycle = {
    async rebind(cwd, signal) {
      const generationId = nextGenerationId + 1
      nextGenerationId = generationId
      const previous = current
      current = null

      let client: FlashQueryExtensionClient | null = null
      try {
        const handoff = await readHandoffImpl(cwd)
        client = handoff ? await openClientImpl(handoff) : null
        if (!handoff || !client) {
          invalidateRegisteredTools(registeredTools, generationId)
          if (previous) retireGeneration(previous)
          return
        }

        const [records, models, purposes] = await Promise.all([
          client.listRegistryTools(signal),
          client.listModels(signal).catch(() => []),
          client.listPurposes(signal).catch(() => []),
        ])
        if (generationId !== nextGenerationId) {
          await client.close().catch(() => {})
          return
        }

        const generation: FlashQueryGeneration = {
          id: generationId,
          handoff,
          client,
          candidates: registryRecordsToToolCandidates(records),
          models,
          purposes,
          activeCalls: 0,
          retiring: false,
          closeTimer: null,
          closed: false,
        }
        current = generation
        publishTools(pi, generation, registeredTools)
        if (previous) retireGeneration(previous)
      } catch (err) {
        invalidateRegisteredTools(registeredTools, generationId)
        if (previous) retireGeneration(previous)
        await client?.close().catch(() => {})
        throw err
      }
    },
    watchHandoff(cwd) {
      stopWatching?.()
      stopWatching = watchHandoffImpl(cwd, () => {
        void lifecycle.rebind(cwd).catch(() => {})
      })
    },
    async shutdown() {
      stopWatching?.()
      stopWatching = null
      const generation = current
      current = null
      invalidateRegisteredTools(registeredTools, nextGenerationId + 1)
      if (generation) retireGeneration(generation)
    },
    currentGeneration() {
      return current
    },
    registeredToolNames() {
      return Array.from(registeredTools.keys()).sort()
    },
  }

  return lifecycle
}

function watchFlashQueryHandoff(cwd: string, onChange: () => void): () => void {
  const handoffFile = path.join(cwd, '.cate', 'pi-agent', 'flashquery-handoff.json')
  const handoffDir = path.dirname(handoffFile)
  const handoffName = path.basename(handoffFile)
  let watcher: FSWatcher | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  try {
    watcher = watch(handoffDir, { persistent: false }, (_event, filename) => {
      if (filename && filename.toString() !== handoffName) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        onChange()
      }, 100)
    })
  } catch {
    return () => {}
  }

  return () => {
    if (timer) clearTimeout(timer)
    watcher?.close()
  }
}

function publishTools(
  pi: ExtensionAPI,
  generation: FlashQueryGeneration,
  registeredTools: Map<string, RegisteredFlashQueryTool>,
): void {
  const nextNames = new Set(generation.candidates.map((candidate) => candidate.name))
  for (const candidate of generation.candidates) {
    registeredTools.set(candidate.name, {
      name: candidate.name,
      generationId: generation.id,
      candidate,
    })
    pi.registerTool<TSchema, FlashQueryToolDetails>({
      name: candidate.name,
      label: candidate.label,
      description: candidate.description,
      parameters: flashQuerySchemaToTypeBox(candidate.inputSchema),
      async execute(_toolCallId, params, signal) {
        return executeFlashQueryTool(generation, registeredTools, candidate.name, params, signal)
      },
    })
  }

  for (const [name, entry] of registeredTools) {
    if (nextNames.has(name)) continue
    registeredTools.set(name, { ...entry, generationId: generation.id, candidate: entry.candidate })
  }
}

async function executeFlashQueryTool(
  generation: FlashQueryGeneration,
  registeredTools: Map<string, RegisteredFlashQueryTool>,
  toolName: string,
  params: unknown,
  signal?: AbortSignal,
): Promise<FlashQueryToolResult> {
  const entry = registeredTools.get(toolName)
  if (!entry || entry.generationId !== generation.id || entry.candidate.name !== toolName) {
    return unavailableResult(entry?.candidate, toolName, generation)
  }

  try {
    const args = params && typeof params === 'object' && !Array.isArray(params)
      ? params as Record<string, unknown>
      : {}
    generation.activeCalls += 1
    const result = await generation.client.callTool(entry.candidate.toolId, args, signal)
    return normalizeFlashQueryToolResult(result, entry.candidate, generation)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'FlashQuery tool call failed'
    return {
      isError: true,
      content: [{ type: 'text' as const, text: message }],
      details: {
        flashquery: true,
        toolId: entry.candidate.toolId,
        toolName: entry.candidate.name,
        workspaceId: generation.handoff.workspaceId,
        generation: generation.id,
        error: message,
      } satisfies FlashQueryToolDetails,
    }
  } finally {
    generation.activeCalls = Math.max(0, generation.activeCalls - 1)
    maybeCloseRetiredGeneration(generation)
  }
}

function unavailableResult(
  candidate: FlashQueryToolCandidate | undefined,
  toolName: string,
  generation: FlashQueryGeneration,
): FlashQueryToolResult {
  return {
    isError: true,
    content: [{ type: 'text' as const, text: STALE_TOOL_MESSAGE }],
    details: {
      flashquery: true,
      toolId: candidate?.toolId ?? toolName,
      toolName,
      workspaceId: generation.handoff.workspaceId,
      generation: generation.id,
      stale: true,
      error: STALE_TOOL_MESSAGE,
    } satisfies FlashQueryToolDetails,
  }
}

function normalizeFlashQueryToolResult(
  result: unknown,
  candidate: FlashQueryToolCandidate,
  generation: FlashQueryGeneration,
): FlashQueryToolResult {
  const resultObject = result && typeof result === 'object' ? result as Record<string, unknown> : {}
  const content = Array.isArray(resultObject.content)
    ? resultObject.content.filter(isTextOrImageContent)
    : [{ type: 'text' as const, text: stringifyResult(result) }]
  return {
    ...(resultObject.isError === true ? { isError: true } : {}),
    content,
    details: {
      flashquery: true,
      toolId: candidate.toolId,
      toolName: candidate.name,
      workspaceId: generation.handoff.workspaceId,
      generation: generation.id,
      result,
    } satisfies FlashQueryToolDetails,
  }
}

function isTextOrImageContent(value: unknown): value is { type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string } {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (record.type === 'text') return typeof record.text === 'string'
  if (record.type === 'image') return typeof record.data === 'string' && typeof record.mimeType === 'string'
  return false
}

function stringifyResult(result: unknown): string {
  if (typeof result === 'string') return result
  try {
    return JSON.stringify(result)
  } catch {
    return String(result)
  }
}

function invalidateRegisteredTools(
  registeredTools: Map<string, RegisteredFlashQueryTool>,
  generationId: number,
): void {
  for (const [name, entry] of registeredTools) {
    registeredTools.set(name, { ...entry, generationId })
  }
}

function retireGeneration(generation: FlashQueryGeneration): void {
  generation.retiring = true
  maybeCloseRetiredGeneration(generation)
  if (!generation.closed && !generation.closeTimer) {
    generation.closeTimer = setTimeout(() => {
      void closeGeneration(generation)
    }, RETIRED_CLIENT_CLOSE_TIMEOUT_MS)
  }
}

function maybeCloseRetiredGeneration(generation: FlashQueryGeneration): void {
  if (!generation.retiring || generation.activeCalls > 0 || generation.closed) return
  void closeGeneration(generation)
}

async function closeGeneration(generation: FlashQueryGeneration): Promise<void> {
  if (generation.closed) return
  generation.closed = true
  if (generation.closeTimer) {
    clearTimeout(generation.closeTimer)
    generation.closeTimer = null
  }
  await generation.client.close().catch(() => {})
}
