import React from 'react'
import { cn } from '@/lib/cn'

/** SVG fit-score ring, 44×44, animates stroke on mount. */
export function ScoreRing({ score, className }: { score: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  const r = 17
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - clamped / 100)

  return (
    <span
      role="img"
      aria-label={`Fit score ${clamped} out of 100`}
      title="Fit: how well this matches your audience's taste data"
      className={cn('relative inline-flex h-11 w-11 shrink-0', className)}
    >
      <svg viewBox="0 0 44 44" className="h-11 w-11 -rotate-90">
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="5" className="stroke-ink/15" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          strokeWidth="5"
          className="stroke-ink"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm" aria-hidden>
        {clamped}
      </span>
    </span>
  )
}
