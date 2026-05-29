import React, { useCallback, useEffect, useRef } from 'react'
import { Lightning, X } from '@phosphor-icons/react'
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

export function FlashQueryConnectionDialog() {
  const show = useUIStore((s) => s.showFlashQueryConnectionDialog)
  const setShow = useUIStore((s) => s.setShowFlashQueryConnectionDialog)
  const selectedWorkspaceId = useAppStore((s) => s.selectedWorkspaceId)
  const workspace = useAppStore((s) => s.workspaces.find((candidate) => candidate.id === selectedWorkspaceId))
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const urlInputRef = useRef<HTMLInputElement | null>(null)

  const close = useCallback(() => setShow(false), [setShow])

  useEffect(() => {
    if (!show) return
    urlInputRef.current?.focus()
  }, [show])

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

  if (!show) return null

  const workspaceName = workspace?.name ?? 'Workspace'
  const initialUrl = workspace?.flashqueryConnection?.transport === 'http'
    ? workspace.flashqueryConnection.url
    : ''

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

        <div className="px-5 py-5">
          <label htmlFor="flashquery-url" className="block text-xs font-medium text-secondary">
            FlashQuery URL
          </label>
          <input
            ref={urlInputRef}
            id="flashquery-url"
            type="url"
            readOnly
            defaultValue={initialUrl}
            placeholder="http://localhost:3100"
            className="mt-2 h-9 w-full rounded-lg border border-subtle bg-surface-5 px-3 text-[13px] text-primary outline-none placeholder:text-muted focus:border-focus focus-visible:ring-2 focus-visible:ring-[#5AD8B8]/50"
          />
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            The HTTP base URL where FlashQuery&apos;s MCP server is listening.
          </p>
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
