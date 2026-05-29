import React, { useState } from 'react'
import { CircleNotch } from '@phosphor-icons/react'

export type ConnectionStatus =
  | { kind: 'connecting' }
  | { kind: 'live' }
  | { kind: 'disconnected'; error?: string }
  | { kind: 'unknown' }

interface ChipProps {
  state: ConnectionStatus
  onRetry?: () => void
}

interface ChipContent {
  label: string
  icon: React.ReactNode
  labelClassName: string
}

const chipStyle: React.CSSProperties = {
  minHeight: 22,
  borderRadius: 999,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  fontSize: 11,
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
}

const statusDot = (color: string) => (
  <span
    data-chip-dot
    aria-hidden="true"
    style={{
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: color,
      flex: '0 0 auto',
    }}
  />
)

function getChipContent(state: ConnectionStatus): ChipContent {
  switch (state.kind) {
    case 'connecting':
      return {
        label: 'Connecting…',
        icon: (
          <CircleNotch
            data-chip-spinner
            aria-hidden="true"
            size={12}
            weight="bold"
            style={{
              color: '#5AD8B8',
              animation: 'spin 0.9s linear infinite',
              flex: '0 0 auto',
            }}
          />
        ),
        labelClassName: 'text-muted',
      }
    case 'live':
      return {
        label: 'Live',
        icon: statusDot('#34C759'),
        labelClassName: 'text-primary',
      }
    case 'disconnected':
      return {
        label: 'Disconnected',
        icon: statusDot('#FF453A'),
        labelClassName: 'text-secondary',
      }
    case 'unknown':
      return {
        label: 'Unknown',
        icon: statusDot('#5AD8B8'),
        labelClassName: 'text-muted',
      }
    default:
      return {
        label: 'Unknown',
        icon: statusDot('#5AD8B8'),
        labelClassName: 'text-muted',
      }
  }
}

export function Chip({ state, onRetry }: ChipProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const content = getChipContent(state)
  const isDisconnected = state.kind === 'disconnected'
  const tooltipError = isDisconnected ? state.error : undefined

  const className = `relative inline-flex items-center gap-1.5 px-2 whitespace-nowrap select-none ${content.labelClassName}`
  const commonProps = {
    className,
    style: {
      ...chipStyle,
      cursor: isDisconnected ? 'pointer' : 'default',
    },
    onMouseEnter: () => {
      if (isDisconnected) setShowTooltip(true)
    },
    onMouseLeave: () => setShowTooltip(false),
  }

  const inner = (
    <>
      {content.icon}
      <span>{content.label}</span>
      {isDisconnected && showTooltip && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1 flex flex-col gap-0.5 rounded-md border border-subtle bg-surface-4 px-2 py-1 text-left shadow-2xl"
          style={{ minWidth: 140, marginLeft: -70 }}
        >
          {tooltipError && <span className="text-secondary">{tooltipError}</span>}
          <span className="text-muted" style={{ fontSize: 10 }}>Click to retry</span>
        </span>
      )}
    </>
  )

  if (isDisconnected) {
    return (
      <button
        type="button"
        aria-label={content.label}
        {...commonProps}
        onClick={(event) => {
          event.stopPropagation()
          onRetry?.()
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {inner}
      </button>
    )
  }

  return (
    <div {...commonProps}>
      {inner}
    </div>
  )
}
