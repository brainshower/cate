import React from 'react'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { FlashQueryRefreshConfirmDialog } from './FlashQueryRefreshConfirmDialog'

afterEach(() => {
  cleanup()
})

describe('FlashQueryRefreshConfirmDialog', () => {
  it('T-U-009 renders exact dirty-refresh copy and actions', () => {
    render(
      <FlashQueryRefreshConfirmDialog
        open
        fileName="Plan.md"
        onSaveAndRefresh={vi.fn()}
        onDiscardAndRefresh={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByRole('dialog', { name: 'Unsaved changes' })).toBeTruthy()
    expect(screen.getByText('Plan.md has unsaved edits. Refreshing from the vault will replace the editor contents.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Save and refresh' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Discard and refresh' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy()
  })

  it('T-U-009 routes all actions', () => {
    const onSaveAndRefresh = vi.fn()
    const onDiscardAndRefresh = vi.fn()
    const onCancel = vi.fn()

    render(
      <FlashQueryRefreshConfirmDialog
        open
        fileName="Plan.md"
        onSaveAndRefresh={onSaveAndRefresh}
        onDiscardAndRefresh={onDiscardAndRefresh}
        onCancel={onCancel}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Save and refresh' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard and refresh' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onSaveAndRefresh).toHaveBeenCalledTimes(1)
    expect(onDiscardAndRefresh).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
