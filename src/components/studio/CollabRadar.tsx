'use client'

import React, { useEffect, useState } from 'react'
import { MapPin, Store, Beer, Coffee, Disc3, Sparkles } from 'lucide-react'
import type { CollabSuggestion } from '@/types'
import { useStudio } from '@/lib/state/StudioProvider'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  brewery: <Beer className="h-5 w-5" aria-hidden />,
  café: <Coffee className="h-5 w-5" aria-hidden />,
  roaster: <Coffee className="h-5 w-5" aria-hidden />,
  'record shop': <Disc3 className="h-5 w-5" aria-hidden />,
  venue: <MapPin className="h-5 w-5" aria-hidden />,
}

function iconFor(c: CollabSuggestion) {
  return TYPE_ICONS[(c.area ?? '').toLowerCase()] ?? (c.type === 'brand' ? <Store className="h-5 w-5" aria-hidden /> : <MapPin className="h-5 w-5" aria-hidden />)
}

export function CollabRadar() {
  const studio = useStudio()
  const { collabs, cityNote, input, products } = studio.state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const city = input?.city ?? ''
  const hasCity = city.trim().length >= 2

  const load = async (c: string) => {
    setLoading(true)
    setError(false)
    const ok = await studio.loadCollabs(c)
    setError(!ok)
    setLoading(false)
  }

  // auto-load when collection is ready and city exists (deferred — no sync setState in effect)
  useEffect(() => {
    if (!hasCity || collabs !== null || products.length === 0) return
    const t = setTimeout(() => {
      void load(city)
    }, 0)
    return () => clearTimeout(t)
  }, [products.length, hasCity])

  return (
    <section aria-label="Collab Radar" className="print-avoid-break">
      <h3 className="font-display text-xl uppercase mb-1">Collab Radar</h3>
      <p className="text-sm text-ink-2 mb-4">Curated venue ideas for {city}; confirm fit before pitching</p>

      {hasCity && loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-6 w-2/3 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-3" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      )}

      {hasCity && !loading && error && (
        <div className="bg-paper-2 border-2 border-dashed border-ink rounded-md p-4 flex items-center justify-between gap-4">
          <p className="text-sm text-ink-2">Couldn't load partners.</p>
          <Button variant="secondary" onClick={() => load(city)}>Try again</Button>
        </div>
      )}

      {hasCity && !loading && !error && collabs && collabs.length === 0 && (
        <div className="bg-paper-2 border-2 border-dashed border-ink rounded-md p-4">
          <p className="text-sm text-ink-2">No matching venue ideas in {city}. Add more specific interests and rebuild.</p>
        </div>
      )}

      {hasCity && !loading && collabs && collabs.length > 0 && (
        <>
          {cityNote && (
            <p className="text-xs text-mute mb-3 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> {cityNote}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {collabs.map((c) => (
              <Card key={c.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="h-9 w-9 rounded-full border-2 border-ink bg-acid flex items-center justify-center shrink-0" aria-hidden>
                    {iconFor(c)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-sm leading-tight truncate">{c.name}</p>
                    <p className="text-xs text-mute">{c.area}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {c.tags.map((t) => (
                    <Chip key={t} variant="category" className="text-[10px] py-0.5">
                      {t.replace(/-/g, ' ')}
                    </Chip>
                  ))}
                </div>
                <p className="text-sm text-ink-2">{c.partnerIdea}</p>
                {c.sourceUrl && <a href={c.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs underline text-cobalt">Venue website ↗</a>}
                {c.linkedProductIds.length > 0 && (
                  <p className="text-xs font-mono text-ink-2 border-t border-ink/15 pt-2">
                    → pairs with: {c.linkedProductIds.map((id) => id.replace(/-/g, ' ')).join(', ')}
                  </p>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
