'use client'

import React from 'react'
import type { DropPlan, ProductProposal, StudioInput } from '@/types'
import { Silhouette } from '@/components/mockups/Silhouette'
import { paletteHex } from '@/components/studio/ImageStage'
import { formatInr } from '@/lib/score/pricing'

export interface LineSheetProps {
  input: StudioInput | null
  products: ProductProposal[]
  dropPlan: DropPlan | null
}

/** One-page A4 printable line sheet (browser print → PDF, zero cost). */
export function LineSheet({ input, products, dropPlan }: LineSheetProps) {
  const title = input?.artist?.name ?? (input?.text ? input.text.split(/[,.]/)[0].slice(0, 60) : 'Your merch line')
  const date = new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  const firstRunTotal = products.reduce((s, p) => s + p.pricing.firstRunCost, 0)
  const avgMargin = products.length > 0 ? products.reduce((s, p) => s + p.pricing.marginPerUnit, 0) / products.length : 0

  return (
    <div className="line-sheet bg-white text-ink mx-auto w-full max-w-[820px] shadow-hard-lg border-2 border-ink print:shadow-none print:border-0 print:max-w-none">
      {/* header */}
      <div className="line-sheet-header border-b-2 border-ink px-6 py-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase leading-none">{title}</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-2 mt-1">
            Concept line sheet · {date} · made with MerchDesk
          </p>
        </div>
        <span className="font-display text-lg uppercase shrink-0">MerchDesk</span>
      </div>

      {/* products grid: 2 × 4 for ≤8 products */}
      <div className="line-sheet-grid grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-4 p-3 sm:p-6 print:p-6">
        {products.map((p) => (
          <div key={p.id} className="line-sheet-card border-2 border-ink rounded-sm p-3 flex gap-3 print-avoid-break">
            <div className="line-sheet-image w-20 h-20 border-2 border-ink rounded-sm bg-paper shrink-0 overflow-hidden relative">
              {p.image.dataUrl && !p.image.outdated ? (                <img src={p.image.dataUrl} alt={`AI concept: ${p.name}`} className="w-full h-full object-cover" />
              ) : (
                <>
                  <Silhouette kind={p.silhouette} colors={paletteHex('mono-punk')} className="w-full h-full" />
                  <span className="absolute bottom-0 inset-x-0 bg-paper/90 text-[8px] font-mono text-center border-t border-ink">
                    Concept sketch
                  </span>
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm leading-tight">
                {p.name}
                <span className="font-mono text-[10px] uppercase text-ink-2 ml-1.5">{p.role}</span>
              </p>
              <p className="text-[11px] text-ink-2 leading-snug mt-0.5">{p.description.text}</p>
              <p className="text-[11px] mt-1">
                <strong>Est. {formatInr(p.pricing.price)}</strong>
                <span className="text-ink-2"> · min run {p.pricing.minRun} · margin {formatInr(p.pricing.marginPerUnit)}/u</span>
              </p>
              <p className="text-[10px] text-mute leading-snug mt-0.5">
                {p.supplierType}: {p.supplierBrief}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* drop plan strip */}
      {dropPlan && (
        <div className="line-sheet-strip border-t-2 border-ink px-6 py-3">
          <h2 className="font-mono text-xs uppercase tracking-widest mb-2">Drop plan</h2>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
            {dropPlan.steps.map((s) => (
              <p key={s.wave}>
                <strong className="uppercase">{s.wave}</strong> (wk {s.weekOffset}):{' '}
                {s.productIds.map((id) => products.find((p) => p.id === id)?.name ?? id).join(', ')}
              </p>
            ))}
          </div>
          {dropPlan.seasonNote && (
            <p className="text-[11px] text-ink-2 mt-1.5">Season note: {dropPlan.seasonNote}</p>
          )}
        </div>
      )}

      {/* margins summary */}
      <div className="line-sheet-strip border-t-2 border-ink px-6 py-3 flex flex-wrap gap-x-8 gap-y-1 text-[11px]">
        <p>
          <strong>First-run total (est.): {formatInr(firstRunTotal)}</strong>
        </p>
        <p>Avg margin per unit: {formatInr(avgMargin)}</p>
        <p>{products.length} products</p>
      </div>

      {/* footer disclaimers */}
      <div className="line-sheet-strip border-t-2 border-ink px-6 py-3">
        <p className="text-[10px] text-mute leading-relaxed">
          Prices are estimates — get supplier quotes before you order. Retail prices are GST-exclusive; indicative GST
          rates apply by category (5–12% apparel, 0% printed zines, 18% other goods) — confirm with your CA before
          invoicing. AI concept images may contain invented text; review artwork before printing. Audience insights
          powered by Qloo (affinity data, not purchases).
        </p>
      </div>
    </div>
  )
}
