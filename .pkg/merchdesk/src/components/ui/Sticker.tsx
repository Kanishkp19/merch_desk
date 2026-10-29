import React from 'react'
import { cn } from '@/lib/cn'

/** Sticker decoration — max 3 per screen, always aria-hidden. */
export function Sticker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block rotate-[-6deg] bg-acid border-2 border-ink px-3 py-1 font-display uppercase text-sm shadow-hard-sm',
        className
      )}
    >
      {children}
    </span>
  )
}

/** Tape strip decoration for hero cards. */
export function Tape({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('absolute -top-3 left-6 rotate-[-4deg] h-6 w-20 bg-amber/80 border border-ink/30', className)}
    />
  )
}
