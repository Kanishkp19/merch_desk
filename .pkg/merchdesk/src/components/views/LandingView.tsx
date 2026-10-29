'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import type { StudioInput, StudioStatus } from '@/types'
import { HeroInput } from '@/components/landing/HeroInput'
import { ExampleChips } from '@/components/landing/ExampleChips'
import { Sticker } from '@/components/ui/Sticker'
import { apiGetStatus } from '@/lib/api-client'
import { useStudio } from '@/lib/state/StudioProvider'
import { views } from '@/lib/routes'
import { useAppNavigate } from '@/lib/navigate'


const STEPS = [
  { n: 1, title: 'Taste research', body: 'A Qloo-powered agent researches what your specific audience gravitates toward — brands, games, shows, places.' },
  { n: 2, title: 'Describe & approve', body: 'Every product is described in words first. You tweak or approve the description before anything is generated.' },
  { n: 3, title: 'Image + plan', body: 'Only after your approval: an AI concept image, real unit economics, a drop plan and local collab ideas.' },
]

export function LandingView() {
  const navigate = useAppNavigate()
  const studio = useStudio()
  const [status, setStatus] = useState<StudioStatus | null>(null)

  useEffect(() => {
    apiGetStatus().then(setStatus).catch(() => undefined)
  }, [])

  const start = (input: StudioInput) => {
    void studio.startRun(input)
    navigate(views.studio)
  }

  return (
    <div className="paper-grain">
      {/* status banner */}
      {status && status.dataMode === 'fixtures' && (
        <div className="bg-amber border-b-2 border-ink" role="status">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-2 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Taste data isn't connected in this deployment — running on clearly-labelled sample data.
          </div>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6">
        {/* hero */}
        <section className="py-12 md:py-20 grid md:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <div className="flex flex-col gap-6">
            <div>
              <Sticker className="mb-4">Free to try</Sticker>
              <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight uppercase">
                Your fans deserve better than a black tee.
              </h1>
            </div>
            <p className="text-lg text-ink-2 max-w-md">
              Tell us who you are and who your fans are. A Qloo-powered agent finds what they love and turns it
              into merch you can actually make — with the numbers shown.
            </p>
            <ExampleChips onPick={start} />
            <p className="text-xs text-mute max-w-md">
              Audience affinity comes from Qloo. Prices are our estimates. Images are AI concepts.
            </p>
          </div>
          <div className="md:rotate-[0.6deg] md:focus-within:rotate-0 transition-transform">
            <HeroInput onSubmit={start} />
          </div>
        </section>

        {/* explainer strip */}
        <section aria-label="How it works in 3 steps" className="pb-12 md:pb-20">
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((s) => (
              <div key={s.n} className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center border-2 border-ink rounded-full bg-acid font-display text-lg mb-3" aria-hidden>
                  {s.n}
                </span>
                <h2 className="font-display text-base uppercase mb-1.5">{s.title}</h2>
                <p className="text-sm text-ink-2 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
