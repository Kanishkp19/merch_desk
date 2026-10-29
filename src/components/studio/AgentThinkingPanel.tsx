'use client'

import React, { useEffect, useRef } from 'react'
import { Check, Minus } from 'lucide-react'
import type { AgentEvent } from '@/types'
import { cn } from '@/lib/cn'

export interface AgentThinkingPanelProps {
  events: AgentEvent[]
  mode: 'llm_agent' | 'scripted_fallback' | null
  done: boolean
  collapsed: boolean
  onToggleCollapse: () => void
}

/** Terminal-style live agent log (mono on ink), aria-live, auto-scroll. */
export function AgentThinkingPanel({ events, mode, done, collapsed, onToggleCollapse }: AgentThinkingPanelProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    const el = listRef.current
    if (!el || collapsed) return
    if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight
    }
  }, [events, collapsed])

  const onScroll = () => {
    const el = listRef.current
    if (!el) return
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40
  }

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="w-full text-left bg-ink text-paper rounded-md border-2 border-ink shadow-hard px-4 py-3 font-mono text-[13px] flex items-center justify-between hover:bg-ink-2 transition-colors"
      >
        <span>
          {done ? `Agent finished — ${events.filter((e) => e.type === 'tool_call').length} tool calls` : 'Agent working…'}
        </span>
        <span className="text-acid uppercase tracking-widest text-xs">Show</span>
      </button>
    )
  }

  return (
    <section
      aria-label="Agent thinking"
      className="bg-ink text-paper rounded-md border-2 border-ink shadow-hard overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-paper/20">
        <span className="font-mono text-xs uppercase tracking-widest text-acid">Agent</span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'font-mono text-xs px-2 py-0.5 border rounded-full',
              mode === 'scripted_fallback' ? 'bg-amber text-ink border-amber' : 'bg-acid text-ink border-acid'
            )}
          >
            {mode === 'scripted_fallback' ? 'Fallback: fixed steps' : mode === 'llm_agent' ? 'LLM agent' : 'Starting…'}
          </span>
          <button
            onClick={onToggleCollapse}
            className="font-mono text-xs uppercase tracking-widest text-paper/70 hover:text-paper"
            aria-label="Collapse agent panel"
          >
            Hide
          </button>
        </div>
      </header>
      <div
        ref={listRef}
        onScroll={onScroll}
        aria-live="polite"
        className="p-4 font-mono text-[13px] leading-5 max-h-80 overflow-auto nice-scroll break-all"
      >
        {events.length === 0 && <p className="text-paper/70">Reading your fans' taste…</p>}
        {events.map((event, i) => {
          if (event.type === 'step') {
            return (
              <p key={i} className="text-acid flex items-center gap-2">
                {event.status === 'done' ? (
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : event.status === 'skipped' ? (
                  <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden />
                ) : (
                  <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2 border-acid border-t-transparent animate-spin" aria-hidden />
                )}
                <span>
                  {event.label}
                  {event.detail ? <span className="text-paper/60"> — {event.detail}</span> : null}
                </span>
              </p>
            )
          }
          if (event.type === 'tool_call') {
            return (
              <p key={i} className="text-paper">
                <span className="text-paper/50">→ </span>
                {event.tool}
                <span className="text-paper/70">
                  ({Object.values(event.args ?? {})
                    .map((a) => (typeof a === 'string' ? `"${a.length > 40 ? a.slice(0, 40) + '…' : a}"` : JSON.stringify(a)))
                    .join(', ')})
                </span>
              </p>
            )
          }
          if (event.type === 'tool_result') {
            return (
              <p key={i} className="text-paper/70">
                <span className="text-leaf">{event.count && event.count > 0 ? '✓' : '∅'} </span>
                {event.summary}
              </p>
            )
          }
          if (event.type === 'note') {
            return (
              <p key={i} className="text-amber">
                {event.text}
              </p>
            )
          }
          return null
        })}
        {!done && (
          <p className="text-acid after:content-['▍'] animate-pulse" aria-hidden>
            &nbsp;
          </p>
        )}
      </div>
    </section>
  )
}
