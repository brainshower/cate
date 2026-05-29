import React from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { VaultBadge } from './VaultBadge'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('VaultBadge', () => {
  it('T-I-095 renders exact Vault . host content with the teal Vault icon', () => {
    render(<VaultBadge filePath="flashquery://workspace-1/Docs/Plan.md" connectionUrl="https://fq.local:3100/mcp" />)

    expect(screen.getByText('Vault')).toBeTruthy()
    expect(screen.getByText('. fq.local:3100')).toBeTruthy()
    expect(screen.queryByText(/Vault ·/)).toBeNull()
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
