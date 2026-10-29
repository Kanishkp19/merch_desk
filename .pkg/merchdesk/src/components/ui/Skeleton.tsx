import React from 'react'
import { cn } from '@/lib/cn'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-paper-3 rounded-sm', className)} aria-hidden />
}

export function ChipSkeleton() {
  return <Skeleton className="h-8 w-24 rounded-full" />
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5 flex flex-col gap-3" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <Skeleton className="aspect-square w-full" />
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
