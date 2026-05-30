import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VaultBadge } from './VaultBadge'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('VaultBadge', () => {
  it('T-I-095 renders exact Vault · host content with the teal Vault icon', () => {
    render(<VaultBadge filePath="flashquery://workspace-1/Docs/Plan.md" connectionUrl="https://fq.local:3100/mcp" />)

    expect(screen.getByText('Vault')).toBeTruthy()
    const host = screen.getByText('· fq.local:3100')
    expect(host).toBeTruthy()
    expect(host.textContent?.charCodeAt(0)).toBe(0x00B7)
    expect(screen.queryByText('. fq.local:3100')).toBeNull()
    expect(screen.getByTestId('vault-badge-icon')).toHaveProperty('style.color', 'rgb(90, 216, 184)')
  })

  it('renders only Vault when host is missing or invalid', () => {
    render(<VaultBadge filePath="flashquery://workspace-1/Docs/Plan.md" connectionUrl="not a url" />)

    expect(screen.getByText('Vault')).toBeTruthy()
    expect(screen.queryByTestId('vault-badge-host')).toBeNull()
  })

  it('T-I-097 shows decoded vault path tooltip on delayed hover and focus', () => {
    vi.useFakeTimers()
    render(<VaultBadge filePath="flashquery://workspace-1/Cate/Space%20Plan.md" connectionUrl="https://fq.local:3100/mcp" />)

    const badge = screen.getByTestId('vault-badge')
    fireEvent.mouseEnter(badge)
    expect(screen.queryByRole('tooltip')).toBeNull()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(screen.getByRole('tooltip').textContent).toBe('Cate/Space Plan.md')
  })

  it('T-I-098 reuses the shared chip surface and stays inert', () => {
    render(<VaultBadge filePath="flashquery://workspace-1/Docs/Plan.md" connectionUrl="https://fq.local:3100/mcp" />)

    const badge = screen.getByTestId('vault-badge')
    expect(badge.style.minHeight).toBe('22px')
    expect(badge.style.borderRadius).toBe('999px')
    expect(badge.tagName).toBe('SPAN')
  })

  it('uses shared token classes without stock neutral utility classes', () => {
    vi.useFakeTimers()
    const { container } = render(
      <VaultBadge filePath="flashquery://workspace-1/Docs/Plan.md" connectionUrl="https://fq.local:3100/mcp" />,
    )
    fireEvent.mouseEnter(screen.getByTestId('vault-badge'))
    act(() => {
      vi.advanceTimersByTime(500)
    })

    const rendered = container.innerHTML
    const forbiddenStockNeutralPattern = /\b(?:gray|slate|zinc)\b/

    expect(rendered).toContain('text-primary')
    expect(rendered).toContain('text-muted')
    expect(rendered).toContain('bg-surface-4')
    expect(rendered).toContain('border-subtle')
    expect(rendered).not.toMatch(forbiddenStockNeutralPattern)
  })

  it('omits forbidden revision, conflict, and frontmatter UI copy', () => {
    render(<VaultBadge filePath="flashquery://workspace-1/Docs/Plan.md" connectionUrl="https://fq.local:3100/mcp" />)

    const copy = document.body.textContent ?? ''
    expect(copy).not.toMatch(/rev 42|version_token|expected_version|if_match|conflict|stale/i)
  })

  it('returns null for local file paths', () => {
    render(<VaultBadge filePath="/repo/Docs/Plan.md" connectionUrl="https://fq.local:3100/mcp" />)

    expect(screen.queryByTestId('vault-badge')).toBeNull()
  })
})
