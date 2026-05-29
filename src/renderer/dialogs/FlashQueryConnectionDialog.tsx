import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle, Eye, EyeSlash, Lightning, X, XCircle } from '@phosphor-icons/react'
import type { FlashQueryProbeResult } from '../../shared/types'
import { useAppStore } from '../stores/appStore'
import { useUIStore } from '../stores/uiStore'

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
}

function isValidFlashQueryUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function formatProbeSuccess(result: Extract<FlashQueryProbeResult, { ok: true }>): string {
  return `Connected to FlashQuery v${result.version} (instance ${result.instanceId.slice(0, 8)})`
}

function safeOneLineError(error: unknown, token?: string): string {
  let message = error instanceof Error ? error.message : String(error)
  if (token) message = message.split(token).join('[redacted]')
  return message.split(/\r?\n/)[0]?.trim() || 'FlashQuery connection update failed'
}

function buildConnection(url: string, token: string) {
  const trimmedToken = token.trim()
  return {
    transport: 'http' as const,
    url,
    ...(trimmedToken ? { auth: { type: 'bearer' as const, token: trimmedToken } } : {}),
  }
}

export function FlashQueryConnectionDialog() {
  const show = useUIStore((s) => s.showFlashQueryConnectionDialog)
  const setShow = useUIStore((s) => s.setShowFlashQueryConnectionDialog)
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId)
  const workspace = useAppStore((s) => s.workspaces.find((candidate) => candidate.id === selectedWorkspaceId))
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)
  const probeRequestIdRef = useRef(0)
  const latestProbeContextRef = useRef({ show: false, workspaceId: '', url: '', token: '' })
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [tokenVisible, setTokenVisible] = useState(false)
  const [urlTouched, setUrlTouched] = useState(false)
  const [probeResult, setProbeResult] = useState<FlashQueryProbeResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [removeConfirming, setRemoveConfirming] = useState(false)

  const close = useCallback(() => setShow(false), [setShow])

  const urlInvalid = urlTouched && !isValidFlashQueryUrl(url)
  const urlDescribedBy = [
    'flashquery-url-helper',
    urlInvalid ? 'flashquery-url-error' : null,
  ].filter(Boolean).join(' ')

  useEffect(() => {
    latestProbeContextRef.current = {
      show,
      workspaceId: workspace?.id ?? '',
      url,
      token,
    }
    probeRequestIdRef.current += 1
    setProbeResult(null)
    setTesting(false)
  }, [show, workspace?.id, url, token])

  useEffect(() => {
    if (!show) return

    let cancelled = false
    const initialUrl = workspace?.flashqueryConnection?.transport === 'http'
      ? workspace.flashqueryConnection.url
      : ''
    setUrl(initialUrl)
    setToken('')
    setTokenVisible(false)
    setUrlTouched(false)
    setProbeResult(null)
    setTesting(false)
    setSaveError(null)
    setSaving(false)
    setRemoveConfirming(false)

    if (workspace?.flashqueryConnection) {
      window.electronAPI.flashqueryGetConnectionSecret(workspace.id)
        .then((secret) => {
          if (!cancelled) setToken(secret ?? '')
        })
        .catch(() => {
          if (!cancelled) setToken('')
        })
    }

    urlInputRef.current?.focus()

    return () => {
      cancelled = true
    }
  }, [show, workspace?.id, workspace?.flashqueryConnection])

  useEffect(() => {
    if (!show) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
      }
    }
    document.addEventListener('keydown', handler, { capture: true })
    return () => document.removeEventListener('keydown', handler, { capture: true })
  }, [show, close])

  const handleDialogKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const container = dialogRef.current
    if (!container) return
    const focusable = getFocusable(container)
    if (focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement

    if (event.shiftKey && active === first) {
      event.preventDefault()
      last.focus()
      return
    }

    if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }, [])

  const handleTestConnection = useCallback(async () => {
    setUrlTouched(true)
    setProbeResult(null)
    setSaveError(null)

    if (!isValidFlashQueryUrl(url)) return

    const requestId = probeRequestIdRef.current
    const requestContext = {
      show,
      workspaceId: workspace?.id ?? '',
      url,
      token,
    }
    const isCurrentProbe = () => {
      const latest = latestProbeContextRef.current
      return probeRequestIdRef.current === requestId
        && latest.show === requestContext.show
        && latest.workspaceId === requestContext.workspaceId
        && latest.url === requestContext.url
        && latest.token === requestContext.token
    }

    setTesting(true)
    try {
      const result = await window.electronAPI.flashqueryProbe(workspace?.id ?? '', {
        ...buildConnection(url, token),
      })
      if (isCurrentProbe()) {
        setProbeResult(result)
      }
    } catch (error) {
      if (isCurrentProbe()) {
        setProbeResult({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    } finally {
      if (isCurrentProbe()) {
        setTesting(false)
      }
    }
  }, [show, token, url, workspace?.id])

  const handleSave = useCallback(async () => {
    setUrlTouched(true)
    setSaveError(null)

    if (!isValidFlashQueryUrl(url)) return

    setSaving(true)
    try {
      await window.electronAPI.flashquerySetConnection(workspace?.id ?? '', {
        ...buildConnection(url, token),
      })
      close()
    } catch (error) {
      setSaveError(safeOneLineError(error, token))
    } finally {
      setSaving(false)
    }
  }, [close, token, url, workspace?.id])

  const handleConfirmRemove = useCallback(async () => {
    setSaveError(null)
    setSaving(true)
    try {
      await window.electronAPI.flashquerySetConnection(workspace?.id ?? '', null)
      close()
    } catch (error) {
      setSaveError(safeOneLineError(error, token))
    } finally {
      setSaving(false)
    }
  }, [close, token, workspace?.id])

  if (!show) return null

  const workspaceName = workspace?.name ?? 'Workspace'
  const hasConnection = Boolean(workspace?.flashqueryConnection)

  return (
    <div
      data-testid="flashquery-connection-overlay"
      className="fixed inset-0 z-50 flex items-start justify-center pt-40 bg-black/40"
      onClick={close}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="flashquery-connection-title"
        aria-describedby="flashquery-connection-subtitle"
        className="relative w-[560px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl bg-surface-4/85 backdrop-blur-2xl border border-subtle shadow-[0_24px_64px_rgba(0,0,0,0.5)]"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-subtle">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-hover text-[#5AD8B8]">
            <Lightning size={20} weight="bold" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="flashquery-connection-title" className="text-[16px] leading-tight font-semibold text-primary">
              FlashQuery Connection
            </h2>
            <p id="flashquery-connection-subtitle" className="mt-1 truncate text-xs text-muted">
              For workspace: {workspaceName}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div>
          <label htmlFor="flashquery-url" className="block text-xs font-medium text-secondary">
            FlashQuery URL
          </label>
          <input
            ref={urlInputRef}
            id="flashquery-url"
            type="text"
            value={url}
            placeholder="https://fq.example.com or http://localhost:3100"
            aria-describedby={urlDescribedBy}
            aria-invalid={urlInvalid ? 'true' : undefined}
            onBlur={() => setUrlTouched(true)}
            onChange={(event) => {
              setUrl(event.target.value)
              setProbeResult(null)
              setSaveError(null)
            }}
            className="mt-2 h-9 w-full rounded-lg border border-subtle bg-surface-5 px-3 text-[13px] text-primary outline-none placeholder:text-muted focus:border-focus focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/50"
          />
          <p id="flashquery-url-helper" className="mt-2 text-[11px] leading-relaxed text-muted">
            The HTTP base URL where FlashQuery&apos;s MCP server is listening.
          </p>
          {urlInvalid && (
            <p id="flashquery-url-error" className="mt-2 text-[11px] leading-relaxed text-red-400">
              Enter a valid http:// or https:// URL.
            </p>
          )}
          </div>

          <div>
            <label htmlFor="flashquery-token" className="block text-xs font-medium text-secondary">
              Bearer token
            </label>
            <div className="relative mt-2">
              <input
                id="flashquery-token"
                type={tokenVisible ? 'text' : 'password'}
                value={token}
                onChange={(event) => {
                  setToken(event.target.value)
                  setProbeResult(null)
                  setSaveError(null)
                }}
                className="h-9 w-full rounded-lg border border-subtle bg-surface-5 px-3 pr-10 text-[13px] text-primary outline-none placeholder:text-muted focus:border-focus focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/50"
              />
              <button
                type="button"
                aria-label={tokenVisible ? 'Hide bearer token' : 'Show bearer token'}
                className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-primary hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/70"
                onClick={() => setTokenVisible((visible) => !visible)}
              >
                {tokenVisible
                  ? <EyeSlash size={16} aria-hidden="true" />
                  : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              A bearer token issued by FlashQuery. Stored locally with this workspace.
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              className="inline-flex h-8 items-center justify-center rounded-lg border border-subtle bg-surface-5 px-3 text-xs font-medium text-secondary hover:bg-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/70 disabled:cursor-default disabled:opacity-60"
              disabled={testing}
              onClick={handleTestConnection}
            >
              {testing ? 'Testing...' : 'Test connection'}
            </button>

            {probeResult && (
              <div
                aria-live="polite"
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                  probeResult.ok ? 'bg-green-600/10 text-green-400' : 'bg-red-600/10 text-red-400'
                }`}
              >
                {probeResult.ok
                  ? <CheckCircle size={16} weight="bold" aria-hidden="true" />
                  : <XCircle size={16} weight="bold" aria-hidden="true" />}
                <span className="min-w-0 break-words">
                  {probeResult.ok ? formatProbeSuccess(probeResult) : probeResult.error}
                </span>
              </div>
            )}
          </div>

          {saveError && (
            <div aria-live="polite" className="rounded-lg bg-red-600/10 px-3 py-2 text-xs text-red-400">
              {saveError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-subtle px-5 py-4">
          <div className="min-w-0">
            {removeConfirming ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-400">Really remove?</span>
                <button
                  type="button"
                  className="h-8 rounded-lg border border-subtle bg-surface-5 px-3 text-red-400 hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
                  disabled={saving}
                  onClick={handleConfirmRemove}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className="h-8 rounded-lg border border-subtle bg-surface-5 px-3 text-secondary hover:bg-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/70"
                  onClick={() => setRemoveConfirming(false)}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="h-8 rounded-lg px-2 text-xs text-red-400 hover:bg-red-600/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 disabled:cursor-default disabled:text-muted disabled:hover:bg-transparent"
                disabled={!hasConnection}
                title={!hasConnection ? 'Currently no connection to remove.' : undefined}
                onClick={() => setRemoveConfirming(true)}
              >
                Remove connection
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="h-8 rounded-lg border border-subtle bg-surface-5 px-3 text-xs font-medium text-secondary hover:bg-hover hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/70"
              onClick={close}
            >
              Cancel
            </button>
            <button
              type="button"
              className="h-8 rounded-lg bg-[#5AD8B8] px-4 text-xs font-semibold text-black hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/70 disabled:cursor-default disabled:opacity-70"
              disabled={saving}
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        </div>

        <button
          type="button"
          className="absolute right-5 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:text-primary hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/70"
          aria-label="Close FlashQuery connection dialog"
          onClick={close}
        >
          <X size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
