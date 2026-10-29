'use client'

import React from 'react'
import type { DropPlan, ProductProposal } from '@/types'
import { cn } from '@/lib/cn'

const WAVE_META: Record<DropPlan['steps'][number]['wave'], { title: string; note: string; badge: string }> = {
  core: { title: 'Wave 1 · Core', note: 'Week 0', badge: 'bg-paper' },
  hero: { title: 'Wave 2 · Hero', note: 'Week 2 · pre-order', badge: 'bg-tomato' },
  limited: { title: 'Wave 3 · Limited', note: 'Week 5 · numbered', badge: 'bg-acid' },
}

export function DropTimeline({ dropPlan, products }: { dropPlan: DropPlan; products: ProductProposal[] }) {
  const nameOf = (id: string) => products.find((p) => p.id === id)?.name ?? id.replace(/-/g, ' ')

  return (
    <section aria-label="Drop plan" className="print-avoid-break">
      <h3 className="font-display text-xl uppercase mb-1">Drop plan</h3>
      <p className="text-sm text-ink-2 mb-4">Three waves — small runs, real scarcity</p>

      <div className="grid lg:grid-cols-3 gap-4">
        {dropPlan.steps.map((step) => {
          const meta = WAVE_META[step.wave]
          return (
            <div key={step.wave} className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-display text-sm uppercase">{meta.title}</h4>
                <span className={cn('font-mono text-xs px-2 py-0.5 border-2 border-ink rounded-full', meta.badge)}>
                  {meta.note}
                </span>
              </div>
              <ul className="space-y-2">
                {step.productIds.map((id) => (
                  <li key={id} className="flex items-center justify-between gap-2 text-sm border-b border-ink/10 pb-2">
                    <span className="min-w-0 truncate">{nameOf(id)}</span>
                    <span className="font-mono text-xs text-ink-2 shrink-0">run {step.runSizes[id] ?? '—'}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-mute mt-3">{step.note}</p>
            </div>
          )
        })}
      </div>

      <div className="mt-4 bg-acid/60 border-2 border-ink rounded-md p-4 flex items-start gap-3">
        <span className="h-9 w-9 rounded-full border-2 border-ink bg-paper flex items-center justify-center shrink-0 font-display" aria-hidden>
          !
        </span>
        <div>
          <p className="font-bold text-sm">Order less than you think you'll sell.</p>
          <p className="text-sm text-ink-2">A sell-out creates demand — restocks are a story, dead stock is a cost.</p>
        </div>
      </div>

      {products.some((p) => p.complianceNote) && (
        <p className="mt-3 text-xs text-ink-2 bg-amber/40 border-l-4 border-amber px-3 py-2">
          ⚠ Consumable collab items: check food/alcohol labelling rules before selling.
        </p>
      )}
    </section>
  )
}
