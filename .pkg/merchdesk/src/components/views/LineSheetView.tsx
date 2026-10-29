'use client'

import React from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { LineSheet } from '@/components/print/LineSheet'
import { useStudio } from '@/lib/state/StudioProvider'
import { views } from '@/lib/routes'
import { useAppNavigate } from '@/lib/navigate'


export function LineSheetView() {
  const navigate = useAppNavigate()
  const studio = useStudio()
  const { products, dropPlan, input } = studio.state
  const hydrated = studio.hydrated

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6 py-8">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-display text-3xl uppercase">Line sheet</h1>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate(views.studio)}>
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to studio
          </Button>
          <Button variant="dark" onClick={() => window.print()} disabled={products.length === 0}>
            <Printer className="h-4 w-4" aria-hidden /> Print / Save as PDF
          </Button>
        </div>
      </div>

      {hydrated && products.length === 0 ? (
        <div className="flex flex-col items-center text-center py-16 px-4 border-2 border-dashed border-ink rounded-md bg-paper-2">
          <span className="h-12 w-12 rounded-full bg-acid border-2 border-ink flex items-center justify-center font-display text-xl mb-3" aria-hidden>
            ∅
          </span>
          <h2 className="font-display uppercase text-lg">Nothing to print yet</h2>
          <p className="text-sm text-ink-2 max-w-sm mt-1 mb-4">
            Build a collection first — it takes about a minute.
          </p>
          <Button variant="primary" onClick={() => navigate(views.home)}>
            Start at the beginning
          </Button>
        </div>
      ) : (
        <div className="py-2">
          <LineSheet input={input} products={products} dropPlan={dropPlan} />
        </div>
      )}
    </main>
  )
}
