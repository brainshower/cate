// =============================================================================
// ChatThread — scrolling message list for the agent panel.
//
// Renders user / assistant / tool / system messages plus any pending tool-call
// approval cards. Tool cards are collapsed by default (one-line summary) so a
// long bash output or large diff does not dominate the panel — the user
// expands what they want to see.
// =============================================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRenderCount } from '../../renderer/lib/perf/perfClient'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Wrench,
  PencilSimple,
  Terminal as TerminalIcon,
  FileText,
  MagnifyingGlass,
  Copy,
  ClipboardText,
  ArrowClockwise,
  WarningCircle,
  Info,
} from '@phosphor-icons/react'
import type {
  AgentMessage,
  DiffInfo,
  RetryState,
  SubagentResult,
  SubagentToolCall,
  ToolMessage,
} from './agentStore'
import { deriveDiff } from './agentStore'

interface ChatThreadProps {
  messages: AgentMessage[]
  pendingApprovals: { toolCallId: string; toolName: string; args: unknown }[]
  onApproval: (toolCallId: string, decision: 'allow' | 'deny') => void
  /** Agent is busy. Used to show a "thinking" indicator in the gap between the
   *  user's send and the first assistant token. */
  running: boolean
  /** Map of user-message id → pi entryId, used to expose "fork from here". */
  forkMap?: Record<string, string>
  onFork?: (entryId: string) => void
  /** Prefill the composer with a user message's text (no history mutation). */
  onEditResend?: (text: string) => void
  /** Plan Ready card actions — see cate-plan-mode extension. */
  onImplementPlan?: () => void
  onRefinePlan?: (text: string) => void
  onClearAndImplement?: () => void
  /** Connection retry state — rendered inline at the tail of the chat. */
  retry?: RetryState
  onAbortRetry?: () => void
}

export function ChatThread({ messages, pendingApprovals, onApproval, running, forkMap, onFork, onEditResend, onImplementPlan, onRefinePlan, onClearAndImplement, retry, onAbortRetry }: ChatThreadProps) {
  useRenderCount('ChatThread')
  const scrollRef = useRef<HTMLDivElement>(null)

  const last = messages[messages.length - 1]

  // Is the agent actively streaming text the user can see?
  const streamingVisibleText =
    last?.type === 'assistant' && last.streaming && !!last.text

  // Has the current turn (after the last user message) produced any visible content?
  let hasVisibleContent = false
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.type === 'user') break
    if (m.type === 'tool' || (m.type === 'assistant' && (m.text || m.thinking))) {
      hasVisibleContent = true
      break
    }
  }

  // "Loading" for the very first wait; shimmer on the last rendered item for
  // every other gap. The only time nothing extra shows is when assistant text
  // is actively streaming on screen.
  const showLoading = running && !hasVisibleContent
  const shimmerLast = running && !streamingVisibleText && !showLoading

  // Auto-scroll on new content unless the user has scrolled away from the
  // bottom — feels less like fighting the scroll position during long output.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distance < 120) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages.length, last])

  // Find the last message that actually renders visible content — skip empty
  // streaming assistant stubs so the *previous* real item gets the shimmer.
  let lastVisibleIdx = messages.length - 1
  while (lastVisibleIdx >= 0) {
    const m = messages[lastVisibleIdx]
    if (m.type === 'assistant' && !m.text && !m.thinking) {
      lastVisibleIdx--
    } else {
      break
    }
  }

  // When the trailing visible messages are consecutive tool calls (parallel
  // group), all of them should shimmer — not just the very last one.
  let shimmerGroupStart = lastVisibleIdx
  if (lastVisibleIdx >= 0 && messages[lastVisibleIdx].type === 'tool') {
    while (shimmerGroupStart > 0 && messages[shimmerGroupStart - 1].type === 'tool') {
      shimmerGroupStart--
    }
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
    >
      {messages.map((m, idx) => {
        // Don't render empty assistant stubs (no text, no thinking) — they add
        // blank space. Content appears the moment the first token lands.
        if (m.type === 'assistant' && !m.text && !m.thinking) return null

        let showModelTag = false
        let isCurrentTurn = false
        if (m.type === 'assistant') {
          showModelTag = true
          isCurrentTurn = true
          for (let j = idx + 1; j < messages.length; j++) {
            if (messages[j].type === 'user') { isCurrentTurn = false; break }
            if (messages[j].type === 'assistant') { showModelTag = false; break }
          }
        }
        const isLast = idx === lastVisibleIdx
        const inShimmerGroup = shimmerLast && idx >= shimmerGroupStart && idx <= lastVisibleIdx
        return (
          <MessageRow
            key={m.id}
            msg={m}
            shimmer={inShimmerGroup}
            forkEntryId={m.type === 'user' ? (m.entryId ?? forkMap?.[m.id]) : undefined}
            onFork={onFork}
            onEditResend={onEditResend}
            onImplementPlan={onImplementPlan}
            onRefinePlan={onRefinePlan}
            onClearAndImplement={onClearAndImplement}
            isLast={isLast}
            showModelTag={showModelTag}
            isCurrentTurn={isCurrentTurn}
            agentRunning={running}
          />
        )
      })}
      {pendingApprovals.map((req) => (
        <ApprovalCard
          key={req.toolCallId}
          req={req}
          onDecide={(decision) => onApproval(req.toolCallId, decision)}
        />
      ))}
      {showLoading && <LoadingIndicator />}
      {retry && (retry.active || retry.finalError) && (
        <RetryIndicator state={retry} onAbort={onAbortRetry} />
      )}
    </div>
  )
}

function RetryIndicator({ state, onAbort }: { state: RetryState; onAbort?: () => void }) {
  if (state.active) {
    const delay = state.delayMs != null ? `${Math.round(state.delayMs / 1000)}s` : '…'
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[12px]">
        <ArrowClockwise size={13} className="text-amber-400 animate-spin shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-amber-200">
            Retrying ({state.attempt ?? '?'}/{state.maxAttempts ?? '?'}) in {delay}
          </span>
          {state.errorMessage && (
            <div className="text-[11px] text-amber-200/60 mt-0.5 truncate">{state.errorMessage}</div>
          )}
        </div>
        {onAbort && (
          <button
            onClick={onAbort}
            className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-amber-200 text-[11px] shrink-0"
          >
            Abort
          </button>
        )}
      </div>
    )
  }
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px]">
      <WarningCircle size={13} weight="fill" className="text-red-400 shrink-0" />
      <span className="text-red-300">
        Retries exhausted{state.finalError ? `: ${state.finalError.length > 120 ? state.finalError.slice(0, 120) + '…' : state.finalError}` : ''}
      </span>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Messages
// -----------------------------------------------------------------------------

function MessageRow({
  msg,
  shimmer,
  forkEntryId,
  onFork,
  onEditResend,
  onImplementPlan,
  onRefinePlan,
  onClearAndImplement,
  isLast,
  showModelTag,
  isCurrentTurn,
  agentRunning,
}: {
  msg: AgentMessage
  shimmer?: boolean
  forkEntryId?: string
  onFork?: (entryId: string) => void
  onEditResend?: (text: string) => void
  onImplementPlan?: () => void
  onRefinePlan?: (text: string) => void
  onClearAndImplement?: () => void
  isLast?: boolean
  showModelTag?: boolean
  isCurrentTurn?: boolean
  agentRunning?: boolean
}) {
  useRenderCount('MessageRow')
  if (msg.type === 'user') {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-white/[0.08] text-primary text-[13px] whitespace-pre-wrap break-words">
          {msg.text}
        </div>
        <div className="flex items-center gap-0.5 text-muted">
          <button
            onClick={() => { void navigator.clipboard.writeText(msg.text) }}
            title="Copy message"
            className="p-1 rounded-md hover:text-primary hover:bg-white/10"
          >
            <Copy size={11} />
          </button>
          {msg.createdAt && (
            <span className="text-[10.5px] text-muted/70 ml-1">{formatTime(msg.createdAt)}</span>
          )}
        </div>
      </div>
    )
  }
  if (msg.type === 'assistant') {
    return (
      <div className={`text-[13.5px] text-primary leading-relaxed space-y-1.5 cate-fade-in ${shimmer ? 'cate-notif-pulse' : ''}`}>
        {msg.thinking && <ThinkingBlock text={msg.thinking} streaming={msg.streaming && !msg.text} />}
        <div>
          <Markdown text={msg.text} />
          {msg.streaming && !msg.text && msg.thinking ? null : msg.streaming && <CursorBlink />}
        </div>
        {!msg.streaming && showModelTag && msg.stopReason === 'stop' && !(agentRunning && isCurrentTurn) && (
          <div className="flex items-center gap-0.5 text-muted">
            <button
              onClick={() => { void navigator.clipboard.writeText(msg.text) }}
              title="Copy message"
              className="p-1 rounded-md hover:text-primary hover:bg-white/10"
            >
              <Copy size={11} />
            </button>
            {(msg.model || msg.createdAt) && (
              <span className="text-[10.5px] text-zinc-500 ml-1">
                {msg.model}
                {msg.model && msg.createdAt ? ' · ' : ''}
                {msg.createdAt ? formatTime(msg.createdAt) : ''}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
  if (msg.type === 'system') {
    const tone =
      msg.kind === 'error'
        ? 'text-red-300'
        : msg.kind === 'warning'
        ? 'text-amber-300'
        : 'text-muted'
    return <div className={`text-center text-[11px] italic ${tone}`}>{msg.text}</div>
  }
  if (msg.type === 'tool' && msg.name === 'subagent') {
    return <SubagentCard msg={msg} shimmer={shimmer} />
  }
  if (msg.type === 'tool' && isRichFlashQueryTool(msg)) {
    return <FlashQueryToolCard msg={msg} shimmer={shimmer} />
  }
  if (msg.type === 'tool' && msg.name === 'plan_complete') {
    return (
      <PlanReadyCard
        msg={msg}
        onImplement={onImplementPlan}
        onRefine={onRefinePlan}
        onClearAndImplement={onClearAndImplement}
        stale={!isLast}
      />
    )
  }
  return <ToolCard msg={msg} shimmer={shimmer} />
}

function formatTime(ms: number): string {
  try {
    return new Date(ms).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

function ThinkingBlock({ text, streaming }: { text: string; streaming: boolean }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="text-[12px] cate-fade-in">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-1.5 text-left text-muted"
      >
        <span className={streaming ? 'cate-notif-pulse' : ''}>Thinking</span>
      </button>
      {expanded && (
        <pre className="mt-1 pl-4 text-[11px] text-primary/70 whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
          {text}
        </pre>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Markdown rendering — tight, readable styles that match the panel chrome.
// -----------------------------------------------------------------------------

function Markdown({ text }: { text: string }) {
  return (
    <div className="agent-markdown space-y-2 break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          h1: ({ children }) => <h1 className="text-[15px] font-semibold text-primary mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-[14px] font-semibold text-primary mt-3 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-[13.5px] font-semibold text-primary mt-2 mb-1">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 space-y-0.5">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 space-y-0.5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer"
               className="text-agent-light underline decoration-agent-light/30 hover:decoration-agent-light">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-agent-light/40 pl-3 text-primary/80 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-white/10 my-2" />,
          strong: ({ children }) => <strong className="font-semibold text-primary">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ className, children, ...props }) => {
            const isBlock = /language-/.test(className ?? '')
            if (isBlock) {
              return (
                <code className={`${className ?? ''} font-mono text-[11.5px] leading-snug`} {...props}>
                  {children}
                </code>
              )
            }
            return (
              <code className="font-mono text-[11.5px] px-1 py-[1px] rounded bg-black/30 text-agent-light" {...props}>
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="rounded-md bg-black/40 border border-white/10 px-3 py-2 overflow-x-auto text-[11.5px] leading-snug">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[12px] border border-white/10 rounded-md">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left px-2 py-1 border-b border-white/10 bg-white/[0.04] font-medium">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-2 py-1 border-b border-white/5 align-top">{children}</td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

function CursorBlink() {
  return (
    <span className="inline-block w-[2px] h-[1em] align-middle bg-primary/80 ml-0.5 animate-pulse" />
  )
}

function LoadingIndicator() {
  return (
    <div className="text-[12px] cate-fade-in">
      <span className="cate-notif-pulse">Loading</span>
    </div>
  )
}

// -----------------------------------------------------------------------------
// Tool card (collapsed by default)
// -----------------------------------------------------------------------------

const EDIT_NAMES = new Set([
  'edit', 'write', 'multi_edit', 'multiedit', 'multiEdit', 'MultiEdit',
  'str_replace', 'str_replace_based_edit_tool', 'str_replace_editor',
  'apply_patch', 'edit_file', 'editFile',
])

function toolIcon(name: string) {
  if (name === 'bash' || name === 'shell') return TerminalIcon
  if (EDIT_NAMES.has(name)) return PencilSimple
  if (name === 'read' || name === 'view') return FileText
  if (name === 'grep' || name === 'search') return MagnifyingGlass
  return Wrench
}

function toolSummary(msg: ToolMessage): string {
  const a = (msg.args ?? {}) as Record<string, unknown>
  if (EDIT_NAMES.has(msg.name)) {
    const path = (a.path as string) ?? (a.file_path as string) ?? (a.file as string) ?? ''
    return path || msg.name
  }
  if (msg.name === 'bash' || msg.name === 'shell') {
    const cmd = (a.command as string) ?? (a.cmd as string) ?? ''
    return cmd || msg.name
  }
  if (msg.name === 'read' || msg.name === 'view') {
    const path = (a.path as string) ?? (a.file_path as string) ?? ''
    const offset = typeof a.offset === 'number' ? (a.offset as number) : undefined
    const limit = typeof a.limit === 'number' ? (a.limit as number) : undefined
    if (path && offset != null && limit != null) return `${path}:${offset}-${offset + limit}`
    if (path && offset != null) return `${path}:${offset}`
    return path || msg.name
  }
  return msg.name
}

// `read` tool results often come back in `cat -n` form: `   123\tcontent`.
// Strip that prefix so our own gutter doesn't double up.
function stripCatN(text: string): string {
  return text
    .split('\n')
    .map((l) => {
      const m = l.match(/^\s*\d+\t(.*)$/)
      return m ? m[1] : l
    })
    .join('\n')
}

function CodePreview({
  text,
  startLine = 1,
  maxLines = 200,
}: {
  text: string
  startLine?: number
  maxLines?: number
}) {
  const lines = text.split('\n')
  const truncated = lines.length > maxLines
  const shown = truncated ? lines.slice(0, maxLines) : lines
  return (
    <div className="font-mono text-[11px] leading-snug max-h-[280px] overflow-auto">
      {shown.map((l, i) => (
        <div key={i} className="flex">
          <span className="text-muted/40 select-none w-5 text-right pr-1.5 shrink-0">{startLine + i}</span>
          <span className="whitespace-pre-wrap break-words text-primary/85 flex-1">{l || ' '}</span>
        </div>
      ))}
      {truncated && (
        <div className="text-muted text-[10.5px] mt-1 pl-5">
          … {lines.length - maxLines} more line{lines.length - maxLines === 1 ? '' : 's'}
        </div>
      )}
    </div>
  )
}

function toolVerb(msg: ToolMessage): string {
  if (msg.name === 'write') return 'Wrote'
  if (EDIT_NAMES.has(msg.name)) return 'Edited'
  switch (msg.name) {
    case 'bash':
    case 'shell':
      return 'Ran'
    case 'read':
    case 'view':
      return 'Read'
    case 'grep':
    case 'search':
      return 'Searched'
    default:
      return 'Used'
  }
}

function ToolCard({ msg, shimmer }: { msg: ToolMessage; shimmer?: boolean }) {
  const isBash = msg.name === 'bash' || msg.name === 'shell'
  const isRead = msg.name === 'read' || msg.name === 'view'
  const isWrite = msg.name === 'write'
  const diff = useMemo(
    () => (isWrite ? undefined : msg.diff ?? deriveDiff(msg.name, msg.args, msg.result)),
    [isWrite, msg.diff, msg.name, msg.args, msg.result],
  )
  const isEditish = !!diff
  const [expanded, setExpanded] = useState(false)
  const liveOutput = msg.status === 'running' ? msg.partialText : undefined
  const verb = toolVerb(msg)
  const summary = toolSummary(msg)

  const a = (msg.args ?? {}) as Record<string, unknown>
  const writeContent = isWrite
    ? ((a.content as string) ?? (a.text as string) ?? '')
    : ''
  const readBody = isRead && msg.result ? stripCatN(msg.result) : ''
  const readStartLine =
    isRead && typeof a.offset === 'number' ? (a.offset as number) : 1

  const hasExtras =
    isEditish ||
    (isWrite && writeContent.length > 0) ||
    (isRead && readBody.length > 0) ||
    !!msg.result || !!liveOutput || !!msg.error || msg.args != null

  const isRunning = msg.status === 'running' || msg.status === 'pending'

  if (isBash) {
    const cmd = (a.command as string) ?? (a.cmd as string) ?? ''
    const output = liveOutput ?? msg.result ?? ''
    const hasOutput = !!output || !!msg.error
    return (
      <div className="text-[12px] cate-fade-in">
        <button
          onClick={() => hasOutput && setExpanded((v) => !v)}
          className={`w-full flex items-center gap-1.5 text-left ${isRunning || shimmer ? 'cate-notif-pulse' : ''} ${hasOutput ? 'hover:text-primary' : 'cursor-default'}`}
        >
          <span className="text-muted shrink-0">{verb}</span>
          <span className="truncate text-primary/90 font-mono flex-1">{cmd}</span>
        </button>
        {expanded && hasOutput && (
          <div className="mt-1 pl-4 max-h-[280px] overflow-auto font-mono text-[11px] leading-snug">
            <pre className="text-primary/80 whitespace-pre-wrap break-words">
              {output}
              {isRunning && <span className="inline-block w-[2px] h-[1em] align-middle bg-primary/80 ml-0.5 animate-pulse" />}
            </pre>
            {msg.error && (
              <pre className="text-rose-300/90 whitespace-pre-wrap break-words">
                {msg.error}
              </pre>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="text-[12px] cate-fade-in">
      <button
        onClick={() => hasExtras && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-1.5 text-left ${isRunning || shimmer ? 'cate-notif-pulse' : ''} ${hasExtras ? 'hover:text-primary' : 'cursor-default'}`}
      >
        <span className="text-muted shrink-0">{verb}</span>
        <span className="truncate text-primary/90 font-mono flex-1">{summary}</span>
      </button>
      {expanded && hasExtras && (
        <div className="mt-1 pl-4 space-y-1.5">
          {isEditish && diff && <DiffView diff={diff} />}
          {isWrite && writeContent && (
            <CodePreview text={writeContent} />
          )}
          {isRead && readBody && (
            <CodePreview text={readBody} startLine={readStartLine} />
          )}
          {!isEditish && !isWrite && !isRead && (
            <pre className="text-[11px] text-muted whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
              {prettyArgs(msg.args)}
            </pre>
          )}
          {liveOutput && (
            <pre className="text-[11px] text-primary/80 whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
              {liveOutput}
              <span className="inline-block w-[2px] h-[1em] align-middle bg-primary/80 ml-0.5 animate-pulse" />
            </pre>
          )}
          {!isRead && !isEditish && msg.result && (
            <pre className="text-[11px] text-primary/80 whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
              {msg.result}
            </pre>
          )}
          {msg.error && (
            <pre className="text-[11px] text-rose-300/90 whitespace-pre-wrap break-words font-mono leading-snug">
              {msg.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function formatTokensShort(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}k`
  return `${(n / 1_000_000).toFixed(2)}M`
}

// -----------------------------------------------------------------------------
// Subagent card — rich UI for the `subagent` tool: per-subagent rows with
// status, agent name, task, usage stats, and an expandable inner activity
// stream (streaming text + nested tool calls).
// -----------------------------------------------------------------------------

function SubagentCard({ msg, shimmer }: { msg: ToolMessage; shimmer?: boolean }) {
  const [expanded, setExpanded] = useState(true)
  const args = (msg.args ?? {}) as Record<string, unknown>
  const fallbackResults: SubagentResult[] = useMemo(() => {
    if (msg.subagent) return msg.subagent.results
    const stubs: SubagentResult[] = []
    const push = (agent: unknown, task: unknown) => {
      if (typeof agent === 'string' && typeof task === 'string') {
        stubs.push({ agent, task, exitCode: -1, parts: [] })
      }
    }
    if (Array.isArray(args.chain)) {
      for (const step of args.chain as unknown[]) {
        if (step && typeof step === 'object') {
          const s = step as Record<string, unknown>
          push(s.agent, s.task)
        }
      }
    } else if (Array.isArray(args.tasks)) {
      for (const t of args.tasks as unknown[]) {
        if (t && typeof t === 'object') {
          const s = t as Record<string, unknown>
          push(s.agent, s.task)
        }
      }
    } else {
      push(args.agent, args.task)
    }
    return stubs
  }, [msg.subagent, args])
  const results = msg.subagent?.results ?? fallbackResults

  const running = msg.status === 'running' || msg.status === 'pending'

  return (
    <div className="text-[12px] cate-fade-in">
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center gap-1.5 text-left hover:text-primary ${running || shimmer ? 'cate-notif-pulse' : ''}`}
      >
        <span className="text-muted shrink-0">subagent</span>
        <span className="truncate text-primary/90 font-mono flex-1">
          {results.length > 0 ? `${results.length} task${results.length > 1 ? 's' : ''}` : ''}
        </span>
      </button>
      {expanded && (
        <div className="mt-1 pl-4 space-y-1.5">
          {results.length === 0 ? (
            <div className="text-[11px] text-muted italic font-mono leading-snug">Waiting for subagent to start…</div>
          ) : (
            results.map((r, i) => <SubagentResultRow key={i} result={r} parentRunning={running} />)
          )}
          {msg.error && (
            <pre className="text-[11px] text-rose-300/90 whitespace-pre-wrap break-words font-mono leading-snug">
              {msg.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function SubagentResultRow({
  result,
  parentRunning,
}: {
  result: SubagentResult
  parentRunning: boolean
}) {
  const terminalStop = result.stopReason === 'stop' || result.stopReason === 'error' ||
    result.stopReason === 'length' || result.stopReason === 'aborted'
  const isRunning = parentRunning && !terminalStop
  const isError = !isRunning && result.exitCode > 0
  const [expanded, setExpanded] = useState(false)

  const toggle = () => setExpanded((v) => !v)

  const usageBits: string[] = []
  if (result.usage?.turns) usageBits.push(`${result.usage.turns} turn${result.usage.turns > 1 ? 's' : ''}`)
  if (result.usage?.input) usageBits.push(`↑${formatTokensShort(result.usage.input)}`)
  if (result.usage?.output) usageBits.push(`↓${formatTokensShort(result.usage.output)}`)
  if (result.usage?.cost) usageBits.push(`$${result.usage.cost.toFixed(3)}`)

  const status: ToolMessage['status'] = isRunning ? 'running' : isError ? 'error' : 'success'
  const summary = result.task
  const hasExtras = result.parts.length > 0 || !!result.errorMessage || !!result.stderr || !!result.finalText

  return (
    <div className="text-[12px]">
      <button
        onClick={toggle}
        className={`w-full flex items-center gap-1.5 text-left ${hasExtras ? 'hover:text-primary' : 'cursor-default'}`}
      >
        <span className={`font-mono text-[11px] shrink-0 ${isRunning ? 'cate-notif-pulse' : 'text-muted'}`}>{result.agent}</span>
        {result.step != null && (
          <span className={`text-[10px] shrink-0 ${isRunning ? 'cate-notif-pulse' : 'text-muted'}`}>#{result.step}</span>
        )}
        <span className="truncate text-primary font-mono flex-1">{summary}</span>
        {usageBits.length > 0 && (
          <span
            className="relative shrink-0 group/info"
            onClick={(e) => e.stopPropagation()}
          >
            <Info size={11} className="text-muted hover:text-primary/70 cursor-help" />
            <span className="absolute bottom-full right-0 mb-1 hidden group-hover/info:block whitespace-nowrap text-[10px] text-primary/90 font-mono bg-surface-2 border border-white/10 rounded px-1.5 py-1 shadow-lg z-10">
              {usageBits.join(' · ')}{result.model ? ` · ${result.model}` : ''}
            </span>
          </span>
        )}
      </button>
      {expanded && hasExtras && (
        <div className="mt-1 pl-4 space-y-1">
          {result.parts.length === 0 && !result.errorMessage && !result.stderr && (
            <div className="text-[11px] text-muted italic font-mono leading-snug">
              {isRunning ? 'Working…' : '(no output)'}
            </div>
          )}
          {result.parts.map((p, i) => {
            if (p.type === 'text' && p.text) {
              return (
                <div key={i} className="text-[12px] text-primary/90 leading-snug">
                  <Markdown text={p.text} />
                </div>
              )
            }
            if (p.type === 'toolCall' && p.toolCall) {
              return <SubagentToolCallRow key={i} call={p.toolCall} />
            }
            return null
          })}
          {result.errorMessage && (
            <pre className="text-[11px] text-rose-300/90 whitespace-pre-wrap break-words font-mono leading-snug">
              {result.errorMessage}
            </pre>
          )}
          {result.stderr && (
            <pre className="text-[11px] text-muted whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
              {result.stderr}
            </pre>
          )}
          {!isRunning && result.exitCode === 0 && result.parts.length === 0 && result.finalText && (
            <div className="text-[12px] text-primary/90 leading-snug">
              <Markdown text={result.finalText} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SubagentToolCallRow({ call }: { call: SubagentToolCall }) {
  const Icon = toolIcon(call.name)
  const args = call.args ?? {}
  const summary = (() => {
    if (call.name === 'bash' || call.name === 'shell') {
      const cmd = (args.command as string) ?? (args.cmd as string) ?? ''
      return cmd
    }
    if (['edit', 'write', 'str_replace', 'str_replace_based_edit_tool'].includes(call.name)) {
      return (args.path as string) ?? (args.file_path as string) ?? ''
    }
    if (call.name === 'read' || call.name === 'view') {
      return (args.path as string) ?? (args.file_path as string) ?? ''
    }
    if (call.name === 'grep' || call.name === 'search') {
      return (args.pattern as string) ?? (args.query as string) ?? ''
    }
    return ''
  })()
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted font-mono">
      <Icon size={10} className="shrink-0 text-muted/70" />
      <span className="shrink-0">{call.name}</span>
      {summary && (
        <span className="truncate text-primary/70">{summary}</span>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// FlashQuery ToolCards — final-only rich details for call_model / call_macro.
// -----------------------------------------------------------------------------

interface FlashQuerySection {
  title: string
  node: ReactNode
}

interface FlashQueryTraceRow {
  step?: string
  status?: string
  tool?: string
  message?: string
}

interface FlashQueryLoopRow {
  index?: number
  tool: string
  status?: string
  summary?: string
  count?: number
  cost?: number
}

function isRichFlashQueryTool(msg: ToolMessage): boolean {
  return Boolean(msg.flashquery && (msg.name === 'call_model' || msg.name === 'call_macro'))
}

function FlashQueryToolCard({ msg, shimmer }: { msg: ToolMessage; shimmer?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const isRunning = msg.status === 'running' || msg.status === 'pending'
  if (isRunning) return <ToolCard msg={msg} shimmer={shimmer} />

  const diagnostics = flashQueryDiagnostics(msg.flashquery, msg.name === 'call_model' ? msg : undefined)
  const summary = msg.name === 'call_model'
    ? flashQueryCallModelSummary(msg, diagnostics)
    : flashQueryCallMacroSummary(msg, diagnostics)
  const sections = msg.name === 'call_model'
    ? flashQueryCallModelSections(msg, diagnostics)
    : flashQueryCallMacroSections(msg, diagnostics)
  const visibleResult = flashQueryVisibleResult(msg.result)
  const hasExtras = sections.length > 0 || !!visibleResult || !!msg.error || msg.args != null

  return (
    <div className="text-[12px] cate-fade-in">
      <button
        onClick={() => hasExtras && setExpanded((v) => !v)}
        className={`w-full flex items-center gap-1.5 text-left ${shimmer ? 'cate-notif-pulse' : ''} ${hasExtras ? 'hover:text-primary' : 'cursor-default'}`}
      >
        <span className="text-muted shrink-0">Used</span>
        <span className="truncate text-primary/90 font-mono flex-1">{summary}</span>
      </button>
      {expanded && hasExtras && (
        <div className="mt-1 pl-4 space-y-1.5">
          {sections.map((section) => (
            <FlashQuerySectionBlock key={section.title} title={section.title}>
              {section.node}
            </FlashQuerySectionBlock>
          ))}
          {sections.length === 0 && (
            <pre className="text-[11px] text-muted whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
              {prettyArgs(msg.args)}
            </pre>
          )}
          {visibleResult && (
            <pre className="text-[11px] text-primary/80 whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
              {visibleResult}
            </pre>
          )}
          {msg.error && (
            <pre className="text-[11px] text-rose-300/90 whitespace-pre-wrap break-words font-mono leading-snug">
              {msg.error}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

function FlashQuerySectionBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] text-muted font-mono">{title}</div>
      {children}
    </div>
  )
}

function flashQueryDiagnostics(details: unknown, msg?: ToolMessage): Record<string, unknown> {
  const root = asRecord(details)
  if (!root) return {}
  const result = asRecord(root.result)
  const diagnostics = asRecord(root.diagnostics)
  const resultDiagnostics = asRecord(result?.diagnostics) ?? asRecord(result?.details)
  const callModelEnvelope = msg ? parseCallModelEnvelope(msg, root) : {}
  return {
    ...callModelEnvelope,
    ...root,
    ...(diagnostics ?? {}),
    ...(result ?? {}),
    ...(resultDiagnostics ?? {}),
  }
}

function parseCallModelEnvelope(msg: ToolMessage, details: Record<string, unknown>): Record<string, unknown> {
  const envelopeText = msg.result ?? firstTextBlock(asRecord(details.result)?.content)
  const envelope = parseJsonRecord(envelopeText)
  const metadata = asRecord(envelope?.metadata)
  const output: Record<string, unknown> = {
    templateParams: callModelTemplateParams(msg, metadata),
  }
  if (!metadata) return output
  const tools = asRecord(metadata.tools)
  return {
    ...output,
    resolver: metadata.resolver,
    resolverName: metadata.name,
    modelName: firstValue(metadata.resolved_model_name, metadata.model_name, metadata.name, metadata.model),
    providerName: firstValue(metadata.provider_name, metadata.providerName),
    fallbackPosition: firstValue(metadata.fallback_position, metadata.fallbackPosition),
    iterations: firstValue(metadata.iterations, tools?.iterations),
    tokens: totalTokens(metadata.tokens),
    cost_usd: metadata.cost_usd,
    latency_ms: metadata.latency_ms,
    messages: envelope?.messages,
    refs: firstValue(metadata.injected_references, metadata.refs),
    resolution_chain: firstValue(metadata.resolution_chain, metadata.resolutionChain),
    brokeredToolLoop: metadata.tool_calls,
    nativeToolLoop: tools?.calls_log,
    serverToolLoop: metadata.server_tool_loop,
  }
}

function flashQueryCallModelSummary(msg: ToolMessage, diagnostics: Record<string, unknown>): string {
  const parts = ['call_model']
  const resolver = firstString(diagnostics.resolver, diagnostics.resolutionStrategy, diagnostics.purpose, diagnostics.purposeName)
  const modelName = firstString(diagnostics.modelName, diagnostics.model, diagnostics.name)
  if (resolver && modelName) parts.push(`via ${resolver} ${modelName}`)
  const iterations = asNumber(firstValue(diagnostics.iterations, diagnostics.iterationCount))
  if (iterations != null) parts.push(`${iterations} iter`)
  const flashqueryCalls = asNumber(firstValue(diagnostics.flashqueryCalls, diagnostics.fqCalls, diagnostics.toolCalls))
    ?? flashQueryLoopCallCount(diagnostics)
  if (flashqueryCalls > 0) parts.push(`${flashqueryCalls} FQ calls`)
  const tokens = asNumber(firstValue(diagnostics.tokens, diagnostics.totalTokens, asRecord(diagnostics.usage)?.total))
  if (tokens != null) parts.push(`${tokens} tok`)
  const cost = flashQueryCost(diagnostics)
  if (cost != null) parts.push(formatFlashQueryCost(cost))
  const latencySeconds = flashQueryLatencySeconds(diagnostics)
  if (latencySeconds != null) parts.push(`${formatFlashQuerySeconds(latencySeconds)}s`)
  return parts.join(' · ') || toolSummary(msg)
}

function flashQueryCallMacroSummary(msg: ToolMessage, diagnostics: Record<string, unknown>): string {
  const trace = flashQueryTraceRows(diagnostics)
  if (trace.length > 0) return `call_macro · ${trace.length} step${trace.length === 1 ? '' : 's'}`
  return toolSummary(msg)
}

function flashQueryCallModelSections(msg: ToolMessage, diagnostics: Record<string, unknown>): FlashQuerySection[] {
  const sections: FlashQuerySection[] = []
  const chain = flashQueryResolutionChain(diagnostics)
  if (chain.length > 0) {
    sections.push({
      title: 'Resolution chain',
      node: (
        <div className="space-y-0.5 font-mono text-[11px] text-primary/80">
          {chain.map((row, index) => (
            <div key={index}>{row}</div>
          ))}
        </div>
      ),
    })
  }

  const refs = flashQueryRefs(msg.flashquery, diagnostics)
  if (refs.length > 0) {
    sections.push({
      title: 'Injected refs',
      node: (
        <div className="space-y-0.5 font-mono text-[11px] text-primary/80">
          {refs.map((ref, index) => (
            <div key={index} className="flex gap-2">
              <span className={ref.resolved === false ? 'text-amber-300' : 'text-primary/80'}>{ref.path}</span>
              {ref.error && <span className="text-muted">{ref.error}</span>}
            </div>
          ))}
        </div>
      ),
    })
  }

  const loopRows = flashQueryLoopRows(diagnostics)
  if (loopRows.length > 0) {
    sections.push({
      title: 'FlashQuery tool loop',
      node: (
        <div className="border-l-2 border-teal-400/70 pl-2 space-y-1 font-mono text-[11px]">
          {loopRows.map((row, index) => (
            <div key={index} className="flex gap-2 text-primary/80">
              <span className="text-teal-300 shrink-0">{row.index ?? index + 1}</span>
              <span className="text-primary/90 shrink-0">{row.tool}</span>
              {row.status && <span className="text-muted shrink-0">{row.status}</span>}
              {row.count != null && <span className="text-muted shrink-0">count {row.count}</span>}
              {row.cost != null && <span className="text-muted shrink-0">{formatFlashQueryCost(row.cost)}</span>}
              {row.summary && <span className="text-primary/70 truncate">{row.summary}</span>}
            </div>
          ))}
        </div>
      ),
    })
  }

  const cost = flashQueryCost(diagnostics)
  if (cost != null) {
    sections.push({
      title: 'Cost',
      node: <div className="font-mono text-[11px] text-primary/80">{formatFlashQueryCost(cost)}</div>,
    })
  }

  const templateParams = sanitizeDisplayValue(firstValue(diagnostics.templateParams, diagnostics.params))
  if (templateParams != null) {
    sections.push({
      title: 'Template params',
      node: (
        <pre className="text-[11px] text-primary/80 whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
          {JSON.stringify(templateParams, null, 2)}
        </pre>
      ),
    })
  }

  const messages = sanitizeDisplayValue(diagnostics.messages)
  if (messages != null) {
    sections.push({
      title: 'Messages',
      node: <FlashQueryMessagesPayload payload={messages} />,
    })
  }

  return sections
}

function flashQueryCallMacroSections(msg: ToolMessage, diagnostics: Record<string, unknown>): FlashQuerySection[] {
  const trace = flashQueryTraceRows(diagnostics)
  if (trace.length === 0) return []
  return [{
    title: 'Trace',
    node: (
      <div className="overflow-x-auto">
        <table className="min-w-full text-[11px] border border-white/10 rounded-md font-mono">
          <thead>
            <tr>
              <th className="text-left px-2 py-1 border-b border-white/10 bg-white/[0.04] font-medium text-muted">Step</th>
              <th className="text-left px-2 py-1 border-b border-white/10 bg-white/[0.04] font-medium text-muted">Type</th>
              <th className="text-left px-2 py-1 border-b border-white/10 bg-white/[0.04] font-medium text-muted">Tool</th>
              <th className="text-left px-2 py-1 border-b border-white/10 bg-white/[0.04] font-medium text-muted">Message</th>
            </tr>
          </thead>
          <tbody>
            {trace.map((row, index) => (
              <tr key={index}>
                <td className="px-2 py-1 border-b border-white/5 align-top text-primary/80">{row.step ?? index + 1}</td>
                <td className="px-2 py-1 border-b border-white/5 align-top text-primary/70">{row.status ?? ''}</td>
                <td className="px-2 py-1 border-b border-white/5 align-top text-primary/80">{row.tool ?? ''}</td>
                <td className="px-2 py-1 border-b border-white/5 align-top text-primary/70">{row.message ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  }]
}

function FlashQueryMessagesPayload({ payload }: { payload: unknown }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded((value) => !value)}
        className="text-[11px] text-muted hover:text-primary font-mono"
      >
        Messages payload
      </button>
      {expanded && (
        <pre className="text-[11px] text-primary/80 whitespace-pre-wrap break-words font-mono leading-snug max-h-[280px] overflow-auto">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
    </div>
  )
}

function flashQueryResolutionChain(diagnostics: Record<string, unknown>): string[] {
  const raw = asArray(firstValue(diagnostics.resolutionChain, diagnostics.resolution_chain, diagnostics.resolution))
  const explicit = raw?.flatMap((item) => {
    if (typeof item === 'string' && item.trim()) return [item]
    const record = asRecord(item)
    if (!record) return []
    const step = firstString(record.step, record.kind, record.type, record.resolver)
    const value = firstString(record.value, record.name, record.model, record.purpose, record.id)
    if (step && value) return [`${step}: ${value}`]
    if (value) return [value]
    return []
  }) ?? []
  if (explicit.length > 0) return explicit

  const rows: string[] = []
  const resolver = firstString(diagnostics.resolver)
  const requestedName = firstString(diagnostics.resolverName, diagnostics.requestedName, diagnostics.purpose, diagnostics.purposeName, diagnostics.name)
  const modelName = firstString(diagnostics.modelName, diagnostics.model, diagnostics.resolvedModelName)
  const providerName = firstString(diagnostics.providerName, diagnostics.provider, diagnostics.provider_name)
  const fallback = asNumber(firstValue(diagnostics.fallbackPosition, diagnostics.fallback_position))
  if (resolver === 'purpose' && requestedName) rows.push(`purpose: ${requestedName}`)
  if (modelName) rows.push(`model: ${modelName}`)
  if (providerName) rows.push(`provider: ${providerName}`)
  if (fallback != null) rows.push(`fallback: #${fallback}`)
  return rows
}

function flashQueryRefs(details: unknown, diagnostics?: Record<string, unknown>): Array<{ path: string; resolved?: boolean; error?: string }> {
  const root = asRecord(details)
  const raw = asArray(firstValue(root?.refs, diagnostics?.refs, diagnostics?.injectedRefs, diagnostics?.injected_references))
  if (!raw) return []
  return raw.flatMap((item) => {
    const record = asRecord(item)
    const path = record ? firstString(record.path, record.ref, record.identifier, record.source) : undefined
    if (!path) return []
    return [{
      path,
      resolved: typeof record?.resolved === 'boolean' ? record.resolved : undefined,
      error: firstString(record?.error),
    }]
  })
}

function flashQueryLoopRows(diagnostics: Record<string, unknown>): FlashQueryLoopRow[] {
  const rows: FlashQueryLoopRow[] = []
  const nativeRaw = asArray(firstValue(diagnostics.nativeToolLoop, diagnostics.callsLog, diagnostics.calls_log))
  for (const item of nativeRaw ?? []) {
    rows.push(...nativeToolLoopRows(item, rows.length))
  }

  const brokeredRaw = asArray(firstValue(diagnostics.brokeredToolLoop, diagnostics.brokeredToolCalls))
  for (const item of brokeredRaw ?? []) {
    const record = asRecord(item)
    const server = firstString(record?.server)
    const toolName = firstString(record?.tool, record?.name, record?.toolName, record?.tool_name)
    if (!toolName) continue
    rows.push({
      index: rows.length + 1,
      tool: server ? `${server}/${toolName}` : toolName,
      count: asNumber(record?.count),
      cost: asNumber(record?.cost),
    })
  }

  const legacyRaw = asArray(firstValue(diagnostics.serverToolLoop, diagnostics.toolLoop, diagnostics.flashqueryToolLoop))
  for (const item of legacyRaw ?? []) {
    rows.push(...legacyToolLoopRows(item, rows.length))
  }
  return rows
}

function nativeToolLoopRows(item: unknown, offset: number): FlashQueryLoopRow[] {
  const record = asRecord(item)
  if (!record) return []
  const iteration = asNumber(record.iteration)
  const calls = asArray(record.tool_calls)
  if (calls) {
    return calls.flatMap((call, index) => {
      const callRecord = asRecord(call)
      const tool = callRecord ? firstString(callRecord.tool_name, callRecord.tool, callRecord.name, callRecord.toolName) : undefined
      if (!tool) return []
      return [{
        index: offset + index + 1,
        tool,
        status: firstString(callRecord?.status, callRecord?.state),
        summary: firstString(callRecord?.summary, callRecord?.message, callRecord?.text, callRecord?.result_summary),
      }]
    })
  }
  const tool = firstString(record.tool_name, record.tool, record.name, record.toolName)
  if (!tool) return []
  return [{
    index: asNumber(record.index) ?? asNumber(record.step) ?? iteration ?? offset + 1,
    tool,
    status: firstString(record.status, record.state),
    summary: firstString(record.summary, record.message, record.text, record.result_summary),
  }]
}

function legacyToolLoopRows(item: unknown, offset: number): FlashQueryLoopRow[] {
  const record = asRecord(item)
  if (!record) return []
  const tool = firstString(record.tool, record.name, record.toolName, record.tool_name)
  if (!tool) return []
  return [{
    index: asNumber(record.index) ?? asNumber(record.step) ?? offset + 1,
    tool,
    status: firstString(record.status),
    summary: firstString(record.summary, record.message, record.text),
  }]
}

function flashQueryLoopCallCount(diagnostics: Record<string, unknown>): number {
  const explicitRows = flashQueryLoopRows(diagnostics)
  if (explicitRows.length === 0) return 0
  return explicitRows.reduce((count, row) => count + (row.count ?? 1), 0)
}

function callModelTemplateParams(msg: ToolMessage, metadata?: Record<string, unknown>): unknown {
  const args = asRecord(msg.args)
  const fromArgs = firstValue(args?.template_params, args?.templateParams)
  if (fromArgs !== undefined && fromArgs !== null) return fromArgs
  const refs = asArray(firstValue(metadata?.injected_references, metadata?.refs))
  const used: unknown[] = []
  for (const ref of refs ?? []) {
    const record = asRecord(ref)
    const params = firstValue(record?.template_params_used, record?.templateParamsUsed)
    if (params !== undefined && params !== null) used.push(params)
  }
  if (used.length === 1) return used[0]
  if (used.length > 1) return used
  return firstValue(metadata?.template_params, metadata?.templateParams)
}

function flashQueryTraceRows(diagnostics: Record<string, unknown>): FlashQueryTraceRow[] {
  const raw = asArray(firstValue(diagnostics.trace, diagnostics.macroTrace, diagnostics.steps))
  if (!raw) return []
  return raw.flatMap((item, index) => {
    const record = asRecord(item)
    if (!record) return []
    const row = {
      step: firstString(record.step, record.id) ?? String(index + 1),
      status: firstString(record.kind, record.status, record.state),
      tool: firstString(record.tool, record.toolName, record.name),
      message: firstString(record.message, record.summary, record.text),
    }
    return row.step || row.status || row.tool || row.message ? [row] : []
  })
}

function flashQueryCost(diagnostics: Record<string, unknown>): number | undefined {
  return asNumber(firstValue(
    diagnostics.costUsd,
    diagnostics.cost_usd,
    diagnostics.cost,
    asRecord(diagnostics.usage)?.cost,
    asRecord(asRecord(diagnostics.usage)?.cost)?.total,
  ))
}

function flashQueryLatencySeconds(diagnostics: Record<string, unknown>): number | undefined {
  const seconds = asNumber(firstValue(diagnostics.latencySeconds, diagnostics.latency_s, diagnostics.elapsedSeconds))
  if (seconds != null) return seconds
  const ms = asNumber(firstValue(diagnostics.latencyMs, diagnostics.latency_ms, diagnostics.elapsedMs))
  return ms != null ? ms / 1000 : undefined
}

function formatFlashQueryCost(cost: number): string {
  return `$${cost.toFixed(3)}`
}

function formatFlashQuerySeconds(seconds: number): string {
  return seconds.toFixed(2).replace(/\.?0+$/, '')
}

function firstValue(...values: unknown[]): unknown {
  return values.find((value) => value !== undefined && value !== null)
}

function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function totalTokens(value: unknown): number | undefined {
  const direct = asNumber(value)
  if (direct != null) return direct
  const record = asRecord(value)
  if (!record) return undefined
  const total = asNumber(firstValue(record.total, record.total_tokens))
  if (total != null) return total
  const input = asNumber(firstValue(record.input, record.prompt, record.prompt_tokens))
  const output = asNumber(firstValue(record.output, record.completion, record.completion_tokens))
  if (input != null || output != null) return (input ?? 0) + (output ?? 0)
  return undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined
}

function asArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined
}

function firstTextBlock(content: unknown): string | undefined {
  const blocks = asArray(content)
  if (!blocks) return undefined
  for (const block of blocks) {
    const record = asRecord(block)
    const text = record && record.type === 'text' ? firstString(record.text) : undefined
    if (text) return text
  }
  return undefined
}

function parseJsonRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined
  try {
    return asRecord(JSON.parse(value))
  } catch {
    return undefined
  }
}

function flashQueryVisibleResult(result: string | undefined): string | undefined {
  if (!result) return undefined
  const envelope = parseJsonRecord(result)
  if (!envelope) return result
  return firstTextBlock(envelope.content)
}

function sanitizeDisplayValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value == null) return value
  if (typeof value === 'string') return sanitizeDiagnosticString(value)
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) {
    const sanitized = value.map((item) => sanitizeDisplayValue(item, seen)).filter((item) => item !== undefined)
    return sanitized.length > 0 ? sanitized : undefined
  }
  if (typeof value !== 'object') return undefined
  if (seen.has(value)) return undefined
  seen.add(value)
  const out: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (isSecretDiagnosticKey(key)) continue
    const sanitized = sanitizeDisplayValue(item, seen)
    if (sanitized !== undefined) out[key] = sanitized
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function isSecretDiagnosticKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (normalized === 'tokens') return false
  return normalized.includes('authorization') ||
    normalized.includes('auth') ||
    normalized.includes('bearer') ||
    normalized.includes('token') ||
    normalized.includes('header') ||
    normalized.includes('cookie') ||
    normalized.includes('handoff') ||
    normalized.includes('endpoint') ||
    normalized.includes('requestinit') ||
    normalized.includes('apikey') ||
    normalized.includes('secret') ||
    normalized.includes('password') ||
    normalized.includes('credential')
}

function sanitizeDiagnosticString(value: string): string | undefined {
  return /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/-]+=*/i.test(value) ? undefined : value
}

// -----------------------------------------------------------------------------
// Plan Ready card — rendered for `plan_complete` tool calls emitted by the
// cate-plan-mode pi extension. Shows summary + ordered steps + three actions:
// Implement, Refine plan, Clear context & implement. Locks after any action
// so historical cards can't re-trigger.
// -----------------------------------------------------------------------------

interface PlanStep {
  title: string
  detail?: string
}

interface PlanArgs {
  summary?: string
  steps?: PlanStep[]
}

function parsePlanArgs(raw: unknown): PlanArgs {
  let obj: unknown = raw
  if (typeof obj === 'string') {
    try { obj = JSON.parse(obj) } catch { /* fall through */ }
  }
  if (!obj || typeof obj !== 'object') return {}
  const o = obj as Record<string, unknown>
  const summary = typeof o.summary === 'string' ? o.summary : undefined
  const steps: PlanStep[] = []
  if (Array.isArray(o.steps)) {
    for (const s of o.steps) {
      if (s && typeof s === 'object') {
        const r = s as Record<string, unknown>
        const title = typeof r.title === 'string' ? r.title : undefined
        const detail = typeof r.detail === 'string' ? r.detail : undefined
        if (title) steps.push({ title, detail })
      }
    }
  }
  return { summary, steps }
}

function PlanReadyCard({
  msg,
  onImplement,
  onRefine,
  onClearAndImplement,
  stale,
}: {
  msg: ToolMessage
  onImplement?: () => void
  onRefine?: (text: string) => void
  onClearAndImplement?: () => void
  /** True when this plan is no longer the latest message in the thread — i.e.
   *  the user already acted on it (or moved on) in a prior session that has
   *  since been reloaded. Card renders read-only. */
  stale?: boolean
}) {
  const { summary, steps } = useMemo(() => parsePlanArgs(msg.args), [msg.args])
  const [refineText, setRefineText] = useState('')
  const [locked, setLocked] = useState<null | 'implement' | 'refine' | 'clear'>(null)
  const effectiveLocked = locked ?? (stale ? 'implement' : null)

  const handleImplement = () => {
    if (effectiveLocked) return
    setLocked('implement')
    onImplement?.()
  }
  const handleRefine = () => {
    if (effectiveLocked) return
    const text = refineText.trim()
    if (!text) return
    setLocked('refine')
    onRefine?.(text)
  }
  const handleClear = () => {
    if (effectiveLocked) return
    setLocked('clear')
    onClearAndImplement?.()
  }

  const lockLabel = (base: string, kind: 'implement' | 'refine' | 'clear'): string => {
    // Only re-label when this session triggered the action — a stale reload
    // shows the original labels (we don't know which action was taken).
    if (!locked) return base
    if (locked === kind) {
      if (kind === 'implement') return 'Implemented'
      if (kind === 'refine') return 'Refined'
      return 'Cleared and implemented'
    }
    return base
  }

  return (
    <div className={`rounded-lg border border-agent/40 bg-agent/10 overflow-hidden text-[12px] ${effectiveLocked ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-agent/20">
        <ClipboardText size={13} weight="duotone" className="text-agent-light shrink-0" />
        <span className="text-primary font-medium">Plan ready</span>
      </div>
      <div className="px-3 py-3 space-y-3">
        {summary && (
          <div className="text-[12.5px] text-primary/90 leading-relaxed whitespace-pre-wrap break-words">
            {summary}
          </div>
        )}
        {steps && steps.length > 0 && (
          <ol className="space-y-2">
            {steps.map((s, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="shrink-0 text-agent-light font-mono text-[12px] mt-[1px]">
                  {i + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-primary font-medium leading-snug">
                    {s.title}
                  </div>
                  {s.detail && (
                    <div className="text-[11.5px] text-primary/75 leading-relaxed mt-0.5 whitespace-pre-wrap break-words">
                      {s.detail}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
        <textarea
          value={refineText}
          onChange={(e) => setRefineText(e.target.value)}
          disabled={!!effectiveLocked}
          rows={2}
          placeholder="Refine: type the changes you want…"
          className="w-full rounded-md bg-black/20 border border-agent/20 focus:border-agent-light/60 outline-none px-2.5 py-2 text-[12px] text-primary placeholder:text-muted resize-none disabled:opacity-50"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRefine}
            disabled={!!effectiveLocked || refineText.trim().length === 0}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-agent/20 text-primary text-[11.5px] font-medium disabled:opacity-50 disabled:cursor-default disabled:hover:bg-white/5"
          >
            {lockLabel('Refine plan', 'refine')}
          </button>
          <button
            onClick={handleClear}
            disabled={!!effectiveLocked}
            className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-agent/20 text-primary text-[11.5px] font-medium disabled:opacity-50 disabled:cursor-default disabled:hover:bg-white/5"
          >
            {lockLabel('Clear context & implement', 'clear')}
          </button>
          <div className="flex-1" />
          <button
            onClick={handleImplement}
            disabled={!!effectiveLocked}
            className="px-3 py-1 rounded-md bg-agent hover:bg-agent-light text-white text-[11.5px] font-medium disabled:opacity-50 disabled:cursor-default disabled:hover:bg-agent"
          >
            {lockLabel('Implement', 'implement')}
          </button>
        </div>
      </div>
    </div>
  )
}


function prettyArgs(args: unknown): string {
  try {
    return typeof args === 'string' ? args : JSON.stringify(args, null, 2)
  } catch {
    return String(args)
  }
}

// -----------------------------------------------------------------------------
// Inline diff
// -----------------------------------------------------------------------------

interface DiffLine {
  kind: 'context' | 'add' | 'del'
  text: string
}

function buildDiffLines(diff: DiffInfo): DiffLine[] {
  if (diff.edits && diff.edits.length > 0) {
    const out: DiffLine[] = []
    diff.edits.forEach((e, i) => {
      if (i > 0) out.push({ kind: 'context', text: '' })
      for (const l of e.oldString.split('\n')) out.push({ kind: 'del', text: l })
      for (const l of e.newString.split('\n')) out.push({ kind: 'add', text: l })
    })
    return out
  }
  if (diff.oldString != null || diff.newString != null) {
    const oldLines = (diff.oldString ?? '').split('\n')
    const newLines = (diff.newString ?? '').split('\n')
    const out: DiffLine[] = []
    for (const l of oldLines) out.push({ kind: 'del', text: l })
    for (const l of newLines) out.push({ kind: 'add', text: l })
    return out
  }
  if (diff.before != null && diff.after != null) {
    return lineDiff(diff.before, diff.after)
  }
  if (diff.after != null) {
    return diff.after.split('\n').map((t) => ({ kind: 'add' as const, text: t }))
  }
  return []
}

function lineDiff(before: string, after: string): DiffLine[] {
  const a = before.split('\n')
  const b = after.split('\n')
  const m = a.length
  const n = b.length
  if (m * n > 250_000) {
    return [
      ...a.map((t) => ({ kind: 'del' as const, text: t })),
      ...b.map((t) => ({ kind: 'add' as const, text: t })),
    ]
  }
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0, j = 0
  while (i < m && j < n) {
    if (a[i] === b[j]) { out.push({ kind: 'context', text: a[i] }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ kind: 'del', text: a[i] }); i++ }
    else { out.push({ kind: 'add', text: b[j] }); j++ }
  }
  while (i < m) { out.push({ kind: 'del', text: a[i++] }) }
  while (j < n) { out.push({ kind: 'add', text: b[j++] }) }
  return out
}

function DiffView({ diff }: { diff: DiffInfo }) {
  const lines = useMemo(() => buildDiffLines(diff), [diff])
  let oldLine = 1
  let newLine = 1
  return (
    <div className="max-h-[280px] overflow-auto font-mono text-[11px] leading-[1.45]">
      {lines.map((l, i) => {
        let ln: string
        if (l.kind === 'del') { ln = String(oldLine++); }
        else if (l.kind === 'add') { ln = String(newLine++); }
        else { ln = String(oldLine++); newLine++; }
        return (
          <div
            key={i}
            className={`flex ${
              l.kind === 'add'
                ? 'bg-emerald-500/[0.08]'
                : l.kind === 'del'
                ? 'bg-rose-500/[0.08]'
                : ''
            }`}
          >
            <span className="w-5 text-right pr-1.5 select-none text-muted/30 shrink-0">{ln}</span>
            <span className={`w-3 text-center select-none shrink-0 ${
              l.kind === 'add' ? 'text-emerald-400/70' : l.kind === 'del' ? 'text-rose-400/70' : 'text-transparent'
            }`}>
              {l.kind === 'add' ? '+' : l.kind === 'del' ? '-' : ' '}
            </span>
            <span className={`whitespace-pre-wrap break-words flex-1 pr-2 ${
              l.kind === 'add'
                ? 'text-emerald-300/90'
                : l.kind === 'del'
                ? 'text-rose-300/70 line-through decoration-rose-400/20'
                : 'text-primary/50'
            }`}>{l.text || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}

// -----------------------------------------------------------------------------
// Approval card
// -----------------------------------------------------------------------------

function ApprovalCard({
  req,
  onDecide,
}: {
  req: { toolCallId: string; toolName: string; args: unknown }
  onDecide: (decision: 'allow' | 'deny') => void
}) {
  return (
    <div className="rounded-lg border border-agent/40 bg-agent/10 px-3 py-2 space-y-2">
      <div className="flex items-center gap-2 text-[12px] text-primary">
        <Wrench size={12} className="text-agent-light" />
        <span>
          Allow <strong className="font-mono">{req.toolName}</strong>?
        </span>
      </div>
      <pre className="text-[11px] text-primary/80 whitespace-pre-wrap break-words font-mono max-h-[160px] overflow-auto bg-black/20 rounded p-2">
        {prettyArgs(req.args)}
      </pre>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDecide('allow')}
          className="px-2.5 py-1 rounded-md bg-agent hover:bg-agent-light text-white text-[11px] font-medium"
        >
          Allow
        </button>
        <button
          onClick={() => onDecide('deny')}
          className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-primary text-[11px] font-medium"
        >
          Deny
        </button>
      </div>
    </div>
  )
}
