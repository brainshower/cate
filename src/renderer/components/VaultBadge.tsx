import React, { useEffect, useState } from 'react'
import { Vault } from '@phosphor-icons/react'
import { parseVaultUri } from '../../shared/flashqueryUri'
import { ChipSurface } from './Chip'

interface VaultBadgeProps {
  filePath?: string
  connectionUrl?: string
}

function getConnectionHost(connectionUrl?: string): string | null {
  if (!connectionUrl) return null
  try {
    return new URL(connectionUrl).host
  } catch {
    return null
  }
}

export function VaultBadge({ filePath, connectionUrl }: VaultBadgeProps) {
  const vaultUri = filePath ? parseVaultUri(filePath) : null
  const [hovering, setHovering] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (!hovering) {
      setShowTooltip(false)
      return
    }

    const timer = window.setTimeout(() => setShowTooltip(true), 500)
    return () => window.clearTimeout(timer)
  }, [hovering])

  if (!vaultUri) return null

  const host = getConnectionHost(connectionUrl)

  return (
    <ChipSurface
      data-testid="vault-badge"
      aria-label={host ? `Vault · ${host}` : 'Vault'}
      className="max-w-[120px]"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={() => setHovering(false)}
      tabIndex={0}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <Vault
        data-testid="vault-badge-icon"
        aria-hidden="true"
        size={12}
        weight="bold"
        style={{ color: '#5AD8B8', flex: '0 0 auto' }}
      />
      <span className="text-primary">Vault</span>
      {host && (
        <span className="text-muted truncate min-w-0" data-testid="vault-badge-host">
          · {host}
        </span>
      )}
      {showTooltip && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-1 rounded-md border border-subtle bg-surface-4 px-2 py-1 text-left text-muted shadow-2xl"
          style={{
            minWidth: 180,
            maxWidth: 320,
            marginLeft: -90,
            fontSize: 10,
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          }}
        >
          {vaultUri.vaultPath}
        </span>
      )}
    </ChipSurface>
  )
}
