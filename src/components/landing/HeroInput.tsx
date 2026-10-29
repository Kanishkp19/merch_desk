'use client'

import React, { useState } from 'react'
import type { BudgetTier, CreatorType, StudioInput } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { ArtistAutocomplete } from './ArtistAutocomplete'
import { Chip } from '@/components/ui/Chip'
import { X } from 'lucide-react'
import type { PilotCity } from '@/lib/india/cities'
import { PILOT_CITIES } from '@/lib/india/cities'

export interface HeroInputProps {
  onSubmit: (input: StudioInput) => void
  compact?: boolean
  defaults?: Partial<StudioInput>
}

const BUDGET_OPTIONS: Array<{ value: BudgetTier; label: string }> = [
  { value: 'small', label: 'Small run (est. up to ₹25,000)' },
  { value: 'medium', label: 'Medium (est. up to ₹75,000)' },
  { value: 'large', label: 'Large (est. up to ₹2,00,000)' },
]

const CREATOR_OPTIONS: Array<{ value: CreatorType; label: string }> = [
  { value: 'musician', label: 'Music' },
  { value: 'podcaster', label: 'Podcast' },
  { value: 'youtuber', label: 'YouTube' },
  { value: 'streamer', label: 'Streaming' },
  { value: 'comic_artist', label: 'Comics' },
  { value: 'other', label: 'Other' },
]

const CITY_LABELS: Record<PilotCity, string> = {
  Bengaluru: 'Bengaluru / Bangalore',
  Mumbai: 'Mumbai / Bombay',
  'Delhi NCR': 'Delhi NCR',
  Pune: 'Pune',
  Hyderabad: 'Hyderabad',
  Chennai: 'Chennai / Madras',
  Kolkata: 'Kolkata / Calcutta',
}
const CITY_OPTIONS = PILOT_CITIES.map((c) => ({ value: c, label: CITY_LABELS[c] }))

export function HeroInput({ onSubmit, compact = false, defaults }: HeroInputProps) {
  const [artistQuery, setArtistQuery] = useState('')
  const [artist, setArtist] = useState<{ id: string; name: string } | undefined>()
  const [text, setText] = useState('')
  const [soundsLike, setSoundsLike] = useState<string[]>([])
  const [soundDraft, setSoundDraft] = useState('')
  const [city, setCity] = useState<PilotCity>('Bengaluru')
  const [budget, setBudget] = useState<BudgetTier>('medium')
  const [creatorType, setCreatorType] = useState<CreatorType>('musician')
  const [error, setError] = useState<string | undefined>()

  const addSound = () => {
    const v = soundDraft.trim()
    if (!v || soundsLike.length >= 3) return
    if (!soundsLike.includes(v)) setSoundsLike([...soundsLike, v])
    setSoundDraft('')
  }

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const description = text.trim() || artistQuery.trim()
    if (!description || description.length < 2) {
      setError('Tell us about your fans, or search an artist')
      return
    }
    if (description.length > 1000) {
      setError('Max 1,000 characters')
      return
    }
    setError(undefined)
    onSubmit({
      text: text.trim() || artistQuery.trim(),
      ...(artist && artistQuery === artist.name ? { artist } : {}),
      soundsLike,
      city,
      creatorType,
      budget,
    })
  }

  return (
    <form
      onSubmit={submit}
      className="relative bg-paper-2 border-2 border-ink rounded-md shadow-hard-lg p-5 md:p-6 flex flex-col gap-4"
      noValidate
    >
      <span aria-hidden className="absolute -top-3 left-6 rotate-[-4deg] h-6 w-20 bg-amber/80 border border-ink/30" />
      <span aria-hidden className="absolute -top-3 right-8 rotate-[3deg] h-6 w-16 bg-acid/80 border border-ink/30" />

      <ArtistAutocomplete
        value={artistQuery}
        onChange={(v, a) => {
          setArtistQuery(v)
          setArtist(a)
        }}
      />

      <Textarea
        label="Or describe your fans"
        placeholder="Bengaluru indie producer; fans love live gigs, filter coffee and gig posters"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          if (error) setError(undefined)
        }}
        error={error}
        maxLength={1000}
        counter
        aria-invalid={error ? true : undefined}
      />

      <div>
        <label htmlFor="sounds-like" className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
          Sounds like <span className="text-mute normal-case tracking-normal">(optional, up to 3)</span>
        </label>
        <div className="w-full bg-paper-2 text-ink font-sans text-base border-2 border-ink rounded-sm px-3 py-2 min-h-11 flex flex-wrap items-center gap-2 focus-within:bg-paper focus-within:ring-4 focus-within:ring-cobalt/40">
          {soundsLike.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-paper px-2.5 py-0.5 text-xs" role="listitem">
              {s}
              <button
                type="button"
                aria-label={`Remove ${s}`}
                onClick={() => setSoundsLike(soundsLike.filter((x) => x !== s))}
                className="h-5 w-5 -mr-1 flex items-center justify-center hover:text-tomato-deep"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          ))}
          {soundsLike.length < 3 ? (
            <input
              id="sounds-like"
              value={soundDraft}
              onChange={(e) => setSoundDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addSound()
                } else if (e.key === 'Backspace' && !soundDraft && soundsLike.length > 0) {
                  setSoundsLike(soundsLike.slice(0, -1))
                }
              }}
              onBlur={addSound}
              placeholder={soundsLike.length === 0 ? 'Add an artist and press Enter' : ''}
              className="flex-1 min-w-32 bg-transparent outline-none placeholder:text-mute"
              aria-label="Add a similar artist"
            />
          ) : (
            <span className="text-xs text-mute">Max 3</span>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select
          label="City (India pilot)"
          options={CITY_OPTIONS}
          value={city}
          onChange={(e) => setCity(e.target.value as PilotCity)}
        />
        <Select label="Budget" options={BUDGET_OPTIONS} value={budget} onChange={(e) => setBudget(e.target.value as BudgetTier)} />
      </div>

      <Select label="I make…" options={CREATOR_OPTIONS} value={creatorType} onChange={(e) => setCreatorType(e.target.value as CreatorType)} />

      <Button type="submit" variant="primary" className="w-full text-base min-h-12">
        Build my merch line →
      </Button>

      {!compact && (
        <p className="text-xs text-mute text-center">
          Free to try · no account · affinity data from Qloo, prices are our estimates
        </p>
      )}
    </form>
  )
}
