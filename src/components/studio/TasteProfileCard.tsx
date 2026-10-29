'use client'

import React, { useState } from 'react'
import { Gamepad2, Tv, Film, BookOpen, Mic, Plus, X, MapPin } from 'lucide-react'
import type { AffinityEntity, EntityType, TasteProfile, WeightedTag } from '@/types'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { ChipSkeleton } from '@/components/ui/Skeleton'
import { apiSearch } from '@/lib/api-client'
import { cn } from '@/lib/cn'

const CROSS_ICONS: Partial<Record<EntityType, React.ReactNode>> = {
  videogame: <Gamepad2 className="h-3.5 w-3.5" aria-hidden />,
  tv_show: <Tv className="h-3.5 w-3.5" aria-hidden />,
  movie: <Film className="h-3.5 w-3.5" aria-hidden />,
  book: <BookOpen className="h-3.5 w-3.5" aria-hidden />,
  podcast: <Mic className="h-3.5 w-3.5" aria-hidden />,
}

function WeightDot({ weight }: { weight: number }) {
  const level = weight >= 0.8 ? 3 : weight >= 0.5 ? 2 : 1
  return (
    <span className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3].map((i) => (
        <span key={i} className={cn('h-1.5 w-1.5 rounded-full border border-ink/60', i <= level ? 'bg-ink' : 'bg-transparent')} />
      ))}
    </span>
  )
}

export interface TasteChipsProps {
  title: string
  chips: Array<WeightedTag | (AffinityEntity & { icon?: boolean })>
  kind: 'tag' | 'entity' | 'place'
  max?: number
  onRemove?: (index: number) => void
}

export function TasteChips({ title, chips, kind, max = 10, onRemove }: TasteChipsProps) {
  if (chips.length === 0) return null
  return (
    <div>
      <h4 className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-2">{title}</h4>
      <ul className="flex flex-wrap gap-2" role="list">
        {chips.slice(0, max).map((chip, i) => {
          const isEntity = kind !== 'tag'
          const entity = chip as AffinityEntity
          const label = isEntity ? entity.name : (chip as WeightedTag).name
          const weight = chip.weight
          const estimated = isEntity ? entity.estimated : false
          return (
            <li key={`${label}-${i}`}>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper px-2.5 py-1 font-mono text-xs uppercase tracking-wide shadow-hard-sm',
                  estimated && 'border-dashed bg-amber'
                )}
                title={estimated ? 'Estimated by AI — not returned by Qloo' : !isEntity && (chip as WeightedTag).source === 'user' ? 'From your brief' : undefined}
              >
                {isEntity && kind === 'entity' && CROSS_ICONS[entity.type]}
                {isEntity && kind === 'place' && <MapPin className="h-3.5 w-3.5" aria-hidden />}
                {label}
                <WeightDot weight={weight} />
                {onRemove && (
                  <button
                    onClick={() => onRemove(i)}
                    aria-label={`Remove ${label}`}
                    className="h-5 w-5 -mr-1 flex items-center justify-center hover:text-tomato-deep"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export interface TasteProfileCardProps {
  profile: TasteProfile | null
  loading?: boolean
  onRemoveChip: (index: number) => void
  onAddChip: (tag: { name: string; qlooTagId?: string }) => void
  onBuild: () => void
}

export function TasteProfileCard({ profile, loading, onRemoveChip, onAddChip, onBuild }: TasteProfileCardProps) {
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ id: string; name: string }>>([])
  const [searching, setSearching] = useState(false)

  const searchTags = async (q: string) => {
    if (q.trim().length < 2) return
    setSearching(true)
    try {
      const res = await apiSearch(q.trim(), 'tag')
      setResults(res.results.map((r) => ({ id: r.id, name: r.name })))
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  if (loading || !profile) {
    return (
      <section aria-label="Taste profile" className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5">
        <h3 className="font-display text-xl uppercase mb-4">What your fans gravitate toward</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">{[...Array(8)].map((_, i) => <ChipSkeleton key={i} />)}</div>
          <div className="flex flex-wrap gap-2">{[...Array(6)].map((_, i) => <ChipSkeleton key={i} />)}</div>
          <div className="flex flex-wrap gap-2">{[...Array(5)].map((_, i) => <ChipSkeleton key={i} />)}</div>
        </div>
      </section>
    )
  }

  const tooFew = profile.tags.length < 2 && !profile.tags.some((tag) => tag.source === 'user')

  return (
    <section aria-label="Taste profile" className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="font-display text-xl uppercase leading-tight">What your fans gravitate toward</h3>
        {profile.path === 'A_artist_found' && profile.artist ? (
          <Chip variant="pathA" className="shrink-0">Path A</Chip>
        ) : (
          <Chip variant="pathB" className="shrink-0">Path B</Chip>
        )}
      </div>

      {profile.path === 'A_artist_found' && profile.artist && (
        <p className="text-sm text-ink-2 mb-4">
          Found <strong>{profile.artist.name}</strong> in Qloo — profile built from their audience.
        </p>
      )}
      {profile.path === 'B_description' && (
        <p className="text-sm text-ink-2 mb-4">
          Built from your description via genre and interest tags.
        </p>
      )}

      <div className="space-y-4">
        <TasteChips title="Taste tags" chips={profile.tags} kind="tag" max={10} onRemove={onRemoveChip} />
        <TasteChips title="Brands" chips={profile.brands} kind="entity" max={8} />
        <TasteChips title="Also into" chips={profile.crossDomain} kind="entity" max={8} />
        <TasteChips title="Local-style inspirations" chips={profile.inspirationPlaces} kind="place" max={5} />

        <div>
          {!adding ? (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-dashed border-ink px-3 py-1.5 font-mono text-xs uppercase tracking-wide text-ink-2 hover:bg-paper transition"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden /> Add tag
            </button>
          ) : (
            <div className="border-2 border-ink rounded-sm bg-paper p-2 max-w-sm">
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    searchTags(e.target.value)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && query.trim()) {
                      onAddChip({ name: query.trim() })
                      setAdding(false)
                      setQuery('')
                      setResults([])
                    }
                    if (e.key === 'Escape') setAdding(false)
                  }}
                  placeholder="Search a taste tag…"
                  aria-label="Search a taste tag"
                  className="flex-1 bg-paper-2 border-2 border-ink rounded-sm px-2.5 py-1.5 text-sm focus:outline-none focus:ring-4 focus:ring-cobalt/40"
                />
                <Button
                  variant="ghost"
                  className="min-h-9 px-2"
                  onClick={() => {
                    setAdding(false)
                    setQuery('')
                    setResults([])
                  }}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
              {(searching || results.length > 0) && (
                <ul className="mt-2 max-h-40 overflow-auto nice-scroll" role="listbox" aria-label="Tag suggestions">
                  {results.slice(0, 5).map((r) => (
                    <li key={r.id} role="option" aria-selected={false}>
                      <button
                        className="w-full text-left px-2 py-2 text-sm hover:bg-acid rounded-sm"
                        onClick={() => {
                          onAddChip({ name: r.name, qlooTagId: r.id })
                          setAdding(false)
                          setQuery('')
                          setResults([])
                        }}
                      >
                        {r.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {tooFew && (
        <p className="mt-4 text-sm text-ink-2 bg-amber/40 border-2 border-dashed border-ink rounded-sm p-3">
          We found very little for this input. Add a few interests (e.g. “retro gaming”) and rebuild.
        </p>
      )}

      <p className="mt-4 text-xs text-mute">
        Affinity = how strongly this audience gravitates toward something. It is not purchase data.
      </p>

      <Button variant="primary" className="w-full mt-4" disabled={tooFew} onClick={onBuild}>
        Looks right → Build collection
      </Button>
    </section>
  )
}
