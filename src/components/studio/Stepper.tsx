'use client'

import React from 'react'
import { cn } from '@/lib/cn'

export type StepId = 'fans' | 'taste' | 'collection' | 'partners' | 'export'

export const STEPS: Array<{ id: StepId; label: string }> = [
  { id: 'fans', label: '1 Fans' },
  { id: 'taste', label: '2 Taste' },
  { id: 'collection', label: '3 Collection' },
  { id: 'partners', label: '4 Partners & Plan' },
  { id: 'export', label: '5 Export' },
]

export function Stepper({ current, reached }: { current: StepId; reached: Set<StepId> }) {
  const currentIndex = STEPS.findIndex((s) => s.id === current)
  return (
    <nav
      aria-label="Studio progress"
      className="sticky top-14 z-30 bg-paper/95 backdrop-blur border-b-2 border-ink"
    >
      <ol className="mx-auto w-full max-w-6xl px-4 md:px-6 flex overflow-x-auto nice-scroll">
        {STEPS.map((step, i) => {
          const isCurrent = step.id === current
          const isReached = reached.has(step.id)
          const isPast = i < currentIndex
          return (
            <li key={step.id} className="shrink-0">
              <a
                href={`#section-${step.id}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'flex items-center font-mono text-xs uppercase px-3 py-2.5 min-h-11 border-b-4 border-transparent whitespace-nowrap transition-colors',
                  isCurrent && 'border-ink font-bold text-ink',
                  !isCurrent && isPast && 'text-ink',
                  !isCurrent && !isPast && (isReached ? 'text-ink-2' : 'text-mute')
                )}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center h-6 min-w-6 px-1.5 mr-2 border-2 border-ink rounded-xs font-bold',
                    isCurrent && 'bg-ink text-paper',
                    !isCurrent && (isPast || isReached) && 'bg-acid text-ink',
                    !isCurrent && !isPast && !isReached && 'bg-paper-3 text-mute'
                  )}
                  aria-hidden
                >
                  {i + 1}
                </span>
                {step.label.replace(/^\d+\s/, '')}
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
