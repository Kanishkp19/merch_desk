import React from 'react'
import { cn } from '@/lib/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean
  selected?: boolean
}

export function Card({ className, interactive = false, selected = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5',
        interactive && 'hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg transition cursor-pointer',
        selected && 'ring-4 ring-acid',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
