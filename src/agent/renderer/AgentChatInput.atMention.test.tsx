// @vitest-environment jsdom
import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChatInput } from './AgentChatInput'
import type { AgentSlashCommand, FlashQueryVaultIndexEntry } from '../../shared/types'

const noop = () => {}

function renderInput(options: {
  draft?: string
  commands?: AgentSlashCommand[]
  vaultIndex?: FlashQueryVaultIndexEntry[]
  vaultIndexLoading?: boolean
} = {}) {
  const textareaRef = React.createRef<HTMLTextAreaElement>()
  const onChange = vi.fn()
  const onSubmit = vi.fn()
  const result = render(
    <div data-node-id="node-1">
      <ChatInput
        draft={options.draft ?? ''}
        onChange={onChange}
        onSubmit={onSubmit}
        onStop={noop}
        disabled={false}
        running={false}
        textareaRef={textareaRef}
        commands={options.commands ?? []}
        vaultIndex={options.vaultIndex ?? []}
        vaultIndexLoading={options.vaultIndexLoading ?? false}
        images={[]}
        onAddImage={noop}
        onRemoveImage={noop}
        onPaste={noop}
        onDrop={noop}
        stats={null}
        thinkingLevel={null}
        onPickThinkingLevel={noop}
        autoCompactionEnabled={true}
        onManualCompact={noop}
        onToggleAutoCompaction={noop}
        compactionActive={false}
        planModeActive={false}
        onTogglePlanMode={noop}
      />
    </div>,
  )
  const textarea = screen.getByRole('textbox') as HTMLTextAreaElement
  textarea.setSelectionRange((options.draft ?? '').length, (options.draft ?? '').length)
  fireEvent.select(textarea)
  return { ...result, onChange, onSubmit, textarea, textareaRef }
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('AgentChatInput T-U-020 REQ-018 @ mention autocomplete', () => {
  const entries: FlashQueryVaultIndexEntry[] = [
    { filename: 'Notes.md', fullPath: 'Docs/B Notes.md' },
    { filename: 'Plan.md', fullPath: 'Docs/A Plan.md' },
    { filename: 'Planning.md', fullPath: 'Z/Planning.md' },
    { filename: 'Other.md', fullPath: 'Docs/Plan References/Other.md' },
  ]

  it('opens above the textarea and shows filename and fullPath rows without a stray segment overlay', () => {
    renderInput({ draft: '@pla', vaultIndex: entries })

    const popup = screen.getByTestId('agent-mention-popup')
    expect(popup.className).toContain('bottom-full')
    expect(within(popup).getByText('Plan.md')).toBeTruthy()
    expect(within(popup).getByText('Docs/A Plan.md')).toBeTruthy()
    expect(within(popup).getByText('Planning.md')).toBeTruthy()
    expect(screen.queryByTestId('agent-mention-highlight')).toBeNull()
  })

  it('anchors the mention popup to the composer when wrapped by a canvas node', () => {
    renderInput({ draft: '@pla', vaultIndex: entries })

    const popup = screen.getByTestId('agent-mention-popup')
    const composer = document.querySelector('[data-agent-composer]')
    const canvasNode = document.querySelector('[data-node-id]')

    expect(composer).toBeTruthy()
    expect(canvasNode).toBeTruthy()
    expect(popup.parentElement).toBe(composer)
    expect(popup.parentElement).not.toBe(canvasNode)
  })

  it('filters by filename only case-insensitively and sorts matches by fullPath', () => {
    renderInput({ draft: '@PLAN', vaultIndex: entries })

    const rows = screen.getAllByTestId('agent-mention-row')
    expect(rows.map((row) => within(row).getByTestId('agent-mention-fullpath').textContent)).toEqual([
      'Docs/A Plan.md',
      'Z/Planning.md',
    ])
    expect(screen.queryByText('Other.md')).toBeNull()
  })

  it('supports Arrow navigation and accepts with Enter or Tab as plain reference text', () => {
    const { onChange, textarea, rerender } = renderInput({ draft: '@pla', vaultIndex: entries })

    fireEvent.keyDown(textarea, { key: 'ArrowDown' })
    expect(screen.getAllByTestId('agent-mention-row')[1].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(textarea, { key: 'ArrowUp' })
    expect(screen.getAllByTestId('agent-mention-row')[0].getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(onChange).toHaveBeenLastCalledWith('{{ref:Docs/A Plan.md}}')
    expect(screen.queryByTestId('agent-mention-highlight')).toBeNull()

    rerender(
      <div data-node-id="node-1">
        <ChatInput
          draft="@plan"
          onChange={onChange}
          onSubmit={noop}
          onStop={noop}
          disabled={false}
          running={false}
          textareaRef={React.createRef<HTMLTextAreaElement>()}
          commands={[]}
          vaultIndex={entries}
          vaultIndexLoading={false}
          images={[]}
          onAddImage={noop}
          onRemoveImage={noop}
          onPaste={noop}
          onDrop={noop}
          stats={null}
          thinkingLevel={null}
          onPickThinkingLevel={noop}
          autoCompactionEnabled={true}
          onManualCompact={noop}
          onToggleAutoCompaction={noop}
          compactionActive={false}
          planModeActive={false}
          onTogglePlanMode={noop}
        />
      </div>,
    )
    const nextTextarea = screen.getByRole('textbox') as HTMLTextAreaElement
    nextTextarea.setSelectionRange(5, 5)
    fireEvent.select(nextTextarea)
    fireEvent.keyDown(nextTextarea, { key: 'Tab' })

    expect(onChange).toHaveBeenLastCalledWith('{{ref:Docs/A Plan.md}}')
    expect(screen.queryByTestId('agent-reference-chip')).toBeNull()
  })

  it('replaces only the active segment inside surrounding text', () => {
    const { onChange, textarea } = renderInput({ draft: 'Read @pla today', vaultIndex: entries })
    textarea.setSelectionRange(9, 9)
    fireEvent.select(textarea)

    fireEvent.keyDown(textarea, { key: 'Enter' })

    expect(onChange).toHaveBeenLastCalledWith('Read {{ref:Docs/A Plan.md}} today')
  })

  it('dismisses on Escape and no-match space literal fallback without changing slash popup behavior', () => {
    const { textarea, onChange } = renderInput({ draft: '@missing', vaultIndex: entries })

    expect(screen.queryByTestId('agent-mention-highlight')).toBeNull()
    fireEvent.keyDown(textarea, { key: 'Escape' })
    expect(screen.queryByTestId('agent-mention-popup')).toBeNull()
    expect(screen.queryByTestId('agent-mention-highlight')).toBeNull()

    cleanup()
    const fallback = renderInput({ draft: '@missing', vaultIndex: entries })
    fireEvent.keyDown(fallback.textarea, { key: ' ' })
    expect(fallback.onChange).not.toHaveBeenCalled()
    expect(screen.queryByTestId('agent-mention-highlight')).toBeNull()

    cleanup()
    renderInput({
      draft: '/he',
      commands: [{ name: 'help', description: 'Show help', source: 'skill' }],
      vaultIndex: [{ filename: 'he.md', fullPath: 'he.md' }],
    })
    expect(screen.queryByTestId('agent-mention-popup')).toBeNull()
    expect(screen.getByText('/help')).toBeTruthy()
  })

  it('T-U-021 REQ-020 renders exact loading text without stale old-workspace matches', () => {
    renderInput({
      draft: '@old',
      vaultIndex: [{ filename: 'Only.md', fullPath: 'Old/Only.md' }],
      vaultIndexLoading: true,
    })

    expect(screen.getByText('Loading vault...')).toBeTruthy()
    expect(screen.queryByText('Old/Only.md')).toBeNull()
    expect(screen.queryByTestId('agent-reference-chip')).toBeNull()
    expect(screen.queryByText(/footer pill/i)).toBeNull()
    expect(screen.queryByText(/document-reference/i)).toBeNull()
  })
})
