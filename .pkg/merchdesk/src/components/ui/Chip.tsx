import React from 'react'
import { cn } from '@/lib/cn'

export type ChipVariant =
  | 'hero'
  | 'core'
  | 'limited'
  | 'category'
  | 'evidence'
  | 'estimated'
  | 'pathA'
  | 'pathB'
  | 'tweak'
  | 'taste'
  | 'default'

const variantClasses: Record<ChipVariant, string> = {
  hero: 'bg-tomato text-ink',
  core: 'bg-paper text-ink',
  limited: 'bg-acid text-ink',
  category: 'bg-paper-3 text-ink',
  evidence: 'bg-cobalt text-white border-cobalt shadow-none',
  estimated: 'bg-amber text-ink border-dashed',
  pathA: 'bg-leaf text-white',
  pathB: 'bg-amber text-ink',
  tweak: 'bg-paper text-ink normal-case tracking-normal font-sans font-medium hover:bg-acid',
  taste: 'bg-paper text-ink',
  default: 'bg-paper-2 text-ink',
}

export interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant
  arrow?: boolean
}

export function Chip({ className, variant = 'default', arrow = false, children, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-1 font-mono text-xs uppercase tracking-wide shadow-hard-sm',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {arrow && <span aria-hidden>←</span>}
      {children}
    </span>
  )
}
