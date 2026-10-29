'use client'

import React, { useState } from 'react'
import type { ProductProposal } from '@/types'
import { ProductCard } from './ProductCard'
import { ProductCardSkeleton, Skeleton } from '@/components/ui/Skeleton'
import { NumbersDrawer } from './NumbersDrawer'
import { useStudio } from '@/lib/state/StudioProvider'

export function CollectionGrid({ loading, statusText }: { loading: boolean; statusText?: string }) {
  const studio = useStudio()
  const [numbersProduct, setNumbersProduct] = useState<ProductProposal | null>(null)
  const { products, profile } = studio.state

  if (loading) {
    return (
      <div>
        {statusText && <p className="font-mono text-sm text-ink-2 mb-4" aria-live="polite">{statusText}</p>}
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center text-center py-12 px-4 border-2 border-dashed border-ink rounded-md bg-paper-2">
        <span className="h-12 w-12 rounded-full bg-acid border-2 border-ink flex items-center justify-center font-display text-xl mb-3" aria-hidden>
          ?
        </span>
        <h3 className="font-display uppercase text-lg">No products fit this budget</h3>
        <p className="text-sm text-ink-2 max-w-sm mt-1">
          Try a larger budget or remove some taste chips and rebuild.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            paletteId={profile?.paletteId ?? 'mono-punk'}
            replacementNote={Boolean(p.replacedFrom)}
            onNumbers={setNumbersProduct}
          />
        ))}
        {studio.replaceLoading && (
          <div className="border-2 border-dashed border-ink rounded-md bg-paper-2 p-4 flex flex-col gap-3 items-center justify-center min-h-72">
            <span className="inline-block h-8 w-8 rounded-full border-4 border-ink border-t-transparent animate-spin" aria-hidden />
            <p className="font-mono text-xs uppercase tracking-widest text-ink-2">Finding a replacement…</p>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}
        {!studio.replaceLoading && studio.state.replaceNote && (
          <div className="border-2 border-dashed border-ink rounded-md bg-paper-2 p-4 flex flex-col items-center justify-center min-h-72 text-center">
            <p className="font-display uppercase text-sm">{studio.state.replaceNote}</p>
            <button
              className="mt-3 font-mono text-xs uppercase tracking-widest underline underline-offset-4"
              onClick={() => window.dispatchEvent(new CustomEvent('merchdesk:clear-replace-note'))}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      <NumbersDrawer product={numbersProduct} onClose={() => setNumbersProduct(null)} />
    </>
  )
}
