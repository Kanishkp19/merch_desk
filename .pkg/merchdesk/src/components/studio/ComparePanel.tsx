'use client'

import React, { useEffect } from 'react'
import { Scale } from 'lucide-react'
import { useStudio } from '@/lib/state/StudioProvider'
import { Drawer } from '@/components/ui/Drawer'
import { Chip } from '@/components/ui/Chip'
import { Skeleton } from '@/components/ui/Skeleton'

/** Side-by-side: Generic AI (no Qloo) vs MerchDesk (Qloo-grounded). */
export function ComparePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const studio = useStudio()
  const { generic, genericLoading, products } = studio.state

  useEffect(() => {
    if (open && !generic && !genericLoading) {
      void studio.loadCompare()
    }
  }, [open])

  const merchNames = new Set(products.map((p) => p.name.toLowerCase()))

  return (
    <Drawer open={open} onClose={onClose} title="Same input, two answers" width="min(100vw,56rem)">
      <p className="text-sm text-ink-2 mb-5">
        The left column is the same AI with <strong>no Qloo data</strong> — the generic answer anyone gets.
        The right column is MerchDesk with Qloo-grounded taste data.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-paper-2 border-2 border-dashed border-ink rounded-md p-4">
          <h4 className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-3">
            Generic AI · no Qloo
          </h4>
          {genericLoading || (!generic && products.length === 0) ? (
            <ul className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <li key={i}>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3.5 w-1/2 mt-1" />
                </li>
              ))}
            </ul>
          ) : generic ? (
            <ul className="space-y-3">
              {generic.map((g, i) => (
                <li key={i} className="border-b border-ink/10 pb-2">
                  <p className="font-bold text-sm flex items-center gap-2">
                    {g.name}
                    {merchNames.has(g.name.toLowerCase()) && (
                      <Chip variant="estimated" className="text-[10px] py-0">overlap</Chip>
                    )}
                  </p>
                  <p className="text-xs text-mute mt-0.5">{g.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-mute">Couldn't generate the generic list right now.</p>
          )}
        </div>

        <div className="bg-paper border-2 border-ink rounded-md p-4 shadow-hard-sm">
          <h4 className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-3 flex items-center gap-1.5">
            <Scale className="h-4 w-4" aria-hidden /> MerchDesk · Qloo-grounded
          </h4>
          <ul className="space-y-3">
            {products.map((p) => {
              const overlap = generic?.some((g) => g.name.toLowerCase() === p.name.toLowerCase())
              return (
                <li key={p.id} className="border-b border-ink/10 pb-2">
                  <p className="font-bold text-sm flex items-center gap-2 flex-wrap">
                    {p.name}
                    {overlap ? (
                      <Chip variant="estimated" className="text-[10px] py-0">overlap</Chip>
                    ) : (
                      p.evidence[0] && (
                        <Chip variant="evidence" arrow className="text-[10px] py-0">
                          {p.evidence[0].kind === 'brand' ? p.evidence[0].entityName ?? p.evidence[0].label : p.evidence[0].label}
                        </Chip>
                      )
                    )}
                  </p>
                  <p className="text-xs text-mute mt-0.5">
                    fit {p.fitScore}/100 · est. ${p.pricing.price}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      <p className="text-xs text-mute mt-4">
        The generic list uses the same AI with no Qloo data. Overlap = both suggested it; everything else in
        MerchDesk is driven by the audience's measured affinity.
      </p>
    </Drawer>
  )
}
