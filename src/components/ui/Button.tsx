'use client'

import React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'dark' | 'ghost' | 'destructive'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  iconOnly?: boolean
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-tomato text-ink',
  secondary: 'bg-paper text-ink',
  dark: 'bg-ink text-paper',
  ghost:
    'bg-transparent border-transparent shadow-none hover:bg-paper-3 hover:translate-x-0 hover:translate-y-0 hover:shadow-none',
  destructive: 'bg-paper text-tomato-deep border-tomato-deep shadow-[4px_4px_0_0_var(--color-tomato-deep)]',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'secondary', loading = false, iconOnly = false, children, disabled, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-display uppercase tracking-wide text-sm',
        'min-h-11 px-4 py-2.5 border-2 border-ink rounded-sm shadow-hard',
        'transition-[transform,box-shadow,background-color] duration-150',
        'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg',
        'active:translate-x-0.5 active:translate-y-0.5 active:shadow-none',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-cobalt/50',
        'disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none',
        variantClasses[variant],
        iconOnly && 'h-11 w-11 p-0',
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <span>Working…</span>
        </>
      ) : (
        children
      )}
    </button>
  )
})
