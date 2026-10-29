'use client'

import React from 'react'
import type { StudioInput } from '@/types'

export interface ExampleChip {
  label: string
  input: StudioInput
}

const EXAMPLES: ExampleChip[] = [
  {
    label: 'Bengaluru indie producer · gigs + filter coffee',
    input: {
      text: 'Bengaluru indie electronic producer; fans love live gigs, analog photography, gig posters and filter coffee',
      soundsLike: [],
      city: 'Bengaluru',
      creatorType: 'musician',
      budget: 'small',
    },
  },
  {
    label: 'Mumbai indie comics + zines',
    input: {
      text: 'Mumbai indie comics artist; readers collect zines, risograph prints and enamel pins',
      soundsLike: [],
      city: 'Mumbai',
      creatorType: 'comic_artist',
      budget: 'medium',
    },
  },
  {
    label: 'Bengaluru book podcast · coffee + art',
    input: {
      text: 'Bengaluru book podcast; listeners love independent bookshops, handmade zines, coffee and illustration',
      soundsLike: [],
      city: 'Bengaluru',
      creatorType: 'podcaster',
      budget: 'medium',
    },
  },
  {
    label: 'Chennai gully rap · street food + gig posters',
    input: {
      text: 'Chennai gully rap artist; fans love street food, gig posters and the local Tamil indie scene',
      soundsLike: [],
      city: 'Chennai',
      creatorType: 'musician',
      budget: 'small',
    },
  },
]

export function ExampleChips({ onPick }: { onPick: (input: StudioInput) => void }) {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap nice-scroll"
      role="group"
      aria-label="Example fan descriptions"
    >
      <span className="font-mono text-xs uppercase tracking-widest text-ink-2 self-center shrink-0 py-2">
        Try:
      </span>
      {EXAMPLES.map((ex) => (
        <button
          key={ex.label}
          type="button"
          onClick={() => onPick(ex.input)}
          className="shrink-0 inline-flex items-center rounded-full border-2 border-ink bg-paper px-4 py-2 font-mono text-xs uppercase tracking-wide shadow-hard-sm hover:bg-acid hover:-translate-y-0.5 transition"
        >
          {ex.label}
        </button>
      ))}
    </div>
  )
}
