'use client'

import React, { useEffect, useState } from 'react'
import { AlertCircle } from 'lucide-react'
import type { ProductImage, SilhouetteKind } from '@/types'
import palettesJson from '@/data/palettes.json'
import { Silhouette } from '@/components/mockups/Silhouette'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/cn'

const PALETTES = (palettesJson as { palettes: Array<{ id: string; hex: string[] }> }).palettes

export function paletteHex(id: string): string[] {
  return PALETTES.find((p) => p.id === id)?.hex ?? ['#E2D9C4', '#B5651D', '#14110F']
}

export interface ImageStageProps {
  image: ProductImage
  silhouette: SilhouetteKind
  paletteId: string
  productName: string
  approvedDescription: string
  onOpenLightbox?: () => void
}

/** Square image stage: sketch → generating (timer) → ready | failed | quota/cap. */
export function ImageStage({ image, silhouette, paletteId, productName, approvedDescription, onOpenLightbox }: ImageStageProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (image.status !== 'generating') return
    const started = Date.now()
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000)
    return () => clearInterval(timer)
  }, [image.status])

  const colors = paletteHex(paletteId)

  return (
    <div className="relative aspect-square w-full border-2 border-ink rounded-sm bg-paper overflow-hidden">
      {/* sketch / ready / outdated / quota */}
      {(image.status === 'idle' || image.status === 'quota' || image.status === 'cap' || image.outdated) && (
        <div className="absolute inset-0 flex items-center justify-center p-6" aria-hidden>
          <Silhouette kind={silhouette} colors={colors} className="h-full w-full max-h-full" />
        </div>
      )}

      {image.status === 'idle' && !image.outdated && (
        <span className="absolute bottom-2 left-2 bg-paper/90 text-xs font-mono px-2 py-1 border border-ink rounded-sm">
          Concept sketch — no image yet
        </span>
      )}

      {(image.status === 'quota' || image.status === 'cap') && (
        <div className="absolute inset-x-0 bottom-0 bg-amber/95 border-t-2 border-ink px-3 py-2 text-xs font-medium text-ink">
          {image.status === 'quota'
            ? 'Free image quota used for today — description and sketch are kept.'
            : `You've reached this session's image limit.`}
        </div>
      )}

      {image.status === 'generating' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Skeleton className="absolute inset-0 rounded-none" />
          <div className="relative z-10 bg-paper/95 border-2 border-ink rounded-sm px-4 py-2 font-mono text-sm shadow-hard-sm">
            Generating… {elapsed}s
            {elapsed >= 40 && <p className="text-tomato-deep text-xs mt-1">Taking longer than usual</p>}
          </div>
        </div>
      )}

      {image.status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#FFF1EE] p-4 text-center">
          <AlertCircle className="h-8 w-8 text-tomato-deep" aria-hidden />
          <p className="text-sm text-tomato-deep font-medium">{image.error ?? 'Image generation failed'}</p>
        </div>
      )}

      {image.outdated && image.dataUrl && (
        <>
          <img
            src={image.dataUrl}
            alt={`Previous AI concept image for ${productName}`}
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
          <span className="absolute top-2 left-2 bg-paper border-2 border-ink rounded-sm px-2 py-0.5 font-mono text-xs uppercase shadow-hard-sm">
            Outdated
          </span>
        </>
      )}

      {image.status === 'ready' && image.dataUrl && !image.outdated && (
        <>
          <img
            src={image.dataUrl}
            alt={`AI concept image: ${approvedDescription.slice(0, 100)}`}
            className="absolute inset-0 h-full w-full object-cover animate-[fade-in_200ms_ease] cursor-zoom-in"
            onClick={onOpenLightbox}
          />
          <span className="absolute bottom-2 left-2 bg-paper/90 text-xs font-mono px-2 py-1 border border-ink rounded-sm">
            AI concept image — not a final design
          </span>
        </>
      )}
    </div>
  )
}
