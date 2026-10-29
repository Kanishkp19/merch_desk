'use client'

import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  width?: string
}

/** Right-side drawer; bottom sheet on mobile. Esc/backdrop closes, focus trapped. */
export function Drawer({ open, onClose, title, children, width = 'min(100vw,28rem)' }: DrawerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    const first = ref.current?.querySelector<HTMLElement>('h2, button, [href], input')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-ink/50" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        className={cn(
          'fixed bg-paper border-l-2 border-ink shadow-soft p-5 overflow-auto nice-scroll',
          'max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:max-h-[85vh] max-md:rounded-t-md max-md:border-t-2 max-md:border-l-0',
          'md:right-0 md:top-0 md:h-full',
          'animate-[drawer-in_200ms_ease-out]'
        )}
        style={{ width: `var(--drawer-w, ${width})`, ['--drawer-w' as string]: width }}
      >
        <style>{`@keyframes drawer-in { from { transform: translateX(24px); opacity: 0 } to { transform: translateX(0); opacity: 1 } } @media (max-width: 767px) { @keyframes drawer-in { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } } }`}</style>
        <div className="flex items-start justify-between gap-4 mb-3 max-md:pt-2">
          {title && (
            <h2 id="drawer-title" className="font-display text-xl uppercase leading-tight">
              {title}
            </h2>
          )}
          <button
            onClick={onClose}
            aria-label="Close panel"
            className="ml-auto inline-flex h-11 w-11 items-center justify-center border-2 border-ink rounded-sm bg-paper hover:bg-paper-3 transition shrink-0"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
