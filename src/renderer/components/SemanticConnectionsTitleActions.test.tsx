import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSemanticConnectionsChromeForTests, useSemanticConnectionsChromeStore } from '../stores/semanticConnectionsChromeStore'
import { SemanticConnectionsTitleActions } from './SemanticConnectionsTitleActions'

describe('SemanticConnectionsTitleActions', () => {
  afterEach(() => {
    cleanup()
    clearSemanticConnectionsChromeForTests()
    vi.restoreAllMocks()
  })

  it('T-I-030 toggles panel config state without rendering the connection count in title chrome', () => {
    const toggleConfig = vi.fn()
    useSemanticConnectionsChromeStore.getState().setPanelChrome('sc-1', {
      connectionCount: 2,
      configOpen: false,
      configActive: true,
      toggleConfig,
    })

    render(<SemanticConnectionsTitleActions panelId="sc-1" />)

    expect(screen.queryByLabelText('Connection count: 2 connections')).toBeNull()
    expect(screen.getByTestId('semantic-config-indicator')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Configure semantic connections' }))

    expect(toggleConfig).toHaveBeenCalledTimes(1)
  })
})
