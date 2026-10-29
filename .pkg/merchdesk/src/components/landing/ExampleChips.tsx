'use client'

import React from 'react'
import type { StudioInput } from '@/types'

export interface ExampleChip {
  label: string
  input: StudioInput
}

const EXAMPLES: ExampleChip[] = [
  {
    label: 'Midwest emo band · retro games + sour beer',
    input: {
      text: 'Midwest emo band from Columbus, fans love vintage video games, thrifted flannels and craft sour beers',
      soundsLike: ['American Football', 'Mineral'],
      city: 'Columbus, Ohio',
      creatorType: 'musician',
      budget: 'small',
    },
  },
  {
    label: 'Retro-gaming YouTuber',
    input: {
      text: 'Retro-gaming YouTube channel, audience is into 90s consoles, pixel art, arcade culture and energy drinks',
      soundsLike: [],
      city: 'Pune, India',
      creatorType: 'youtuber',
      budget: 'medium',
    },
  },
  {
    label: 'Food + true-crime podcast',
    input: {
      text: 'Podcast about food history and true crime, listeners love coffee shops, hot sauce, cozy mysteries and book clubs',
      soundsLike: [],
      city: 'Portland, Oregon',
      creatorType: 'podcaster',
      budget: 'medium',
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
