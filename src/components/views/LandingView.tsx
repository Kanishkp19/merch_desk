'use client'

import React, { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, CheckCircle2, FileText, FlaskConical, Wallet } from 'lucide-react'
import type { StudioStatus } from '@/types'
import { Sticker } from '@/components/ui/Sticker'
import { Button } from '@/components/ui/Button'
import { apiGetStatus } from '@/lib/api-client'
import { views } from '@/lib/routes'
import { useAppNavigate } from '@/lib/navigate'

const OUTPUTS = [
  {
    icon: CheckCircle2,
    title: 'A focused assortment',
    body: '1–3 products matched to your audience with written evidence for each pick — and clear labels when a pick is just an experiment.',
  },
  {
    icon: Wallet,
    title: 'Transparent launch economics',
    body: 'Upfront cash, three sales scenarios, break-even and the cost of unsold stock — in rupees, with every unknown marked, not hidden.',
  },
  {
    icon: FileText,
    title: 'A production-ready request',
    body: 'Specs, quantities and artwork status assembled into one quote request. We coordinate suppliers manually and you approve every step.',
  },
]

const PILOT_COLUMNS = [
  {
    title: 'What you provide',
    items: [
      'A 4-minute brief: launch purpose, city, budget, artwork status',
      'Your audience evidence — gig turnout, pre-orders, comments',
      'Final print-ready artwork before production',
    ],
  },
  {
    title: 'What MerchDesk does',
    items: [
      'Researches audience taste (Qloo-powered, clearly labelled if sample data)',
      'Builds your assortment and full money math',
      'Assembles the quote request — the founder then coordinates suppliers by hand during the pilot',
    ],
  },
  {
    title: 'What needs outside confirmation',
    items: [
      'Supplier quotes: none exist yet — every unit cost is an estimate until one is written down',
      'Lead times: shown as “requires confirmation”, never guessed',
      'GST treatment: indicative rates only; confirm with a CA before invoicing',
    ],
  },
]

export function LandingView() {
  const navigate = useAppNavigate()
  const [status, setStatus] = useState<StudioStatus | null>(null)

  useEffect(() => {
    apiGetStatus().then(setStatus).catch(() => undefined)
  }, [])

  return (
    <div className="paper-grain">
      {status && status.dataMode === 'fixtures' && (
        <div className="bg-amber border-b-2 border-ink" role="status">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-6 py-2 flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Taste data isn't connected in this deployment — recommendations run on clearly-labelled sample data.
          </div>
        </div>
      )}

      <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6">
        {/* hero */}
        <section className="py-12 md:py-20 grid md:grid-cols-[1.15fr_0.85fr] gap-8 items-start">
          <div className="flex flex-col gap-6">
            <div>
              <Sticker className="mb-4">Pilot · for independent musicians · 7 Indian cities</Sticker>
              <h1 className="font-display text-5xl md:text-7xl leading-[0.95] tracking-tight uppercase">
                Your first merch drop, without betting blind.
              </h1>
            </div>
            <p className="text-lg text-ink-2 max-w-lg">
              You have a release or a gig coming up and fans who ask for merch. MerchDesk helps you pick
              what to sell, see exactly how much cash is at risk, and get a production quote — with a
              human coordinating suppliers while we're small.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" className="text-base min-h-12" onClick={() => navigate(views.brief)}>
                Plan my merch drop <ArrowRight className="h-5 w-5" aria-hidden />
              </Button>
              <Button variant="secondary" onClick={() => navigate(views.example)}>
                <FlaskConical className="h-4 w-4" aria-hidden /> See an example plan
              </Button>
            </div>
            <p className="text-xs text-mute max-w-lg">
              Planning is free while we build. The pilot charges a ₹2,500 planning fee when you request a
              production quote — an experiment we're testing, shown in your math before you pay anything.
              INR costs are estimates, not supplier quotations.
            </p>
          </div>

          {/* what you get */}
          <section aria-label="What you get" className="grid gap-3">
            {OUTPUTS.map((o) => (
              <div key={o.title} className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4">
                <p className="font-display uppercase text-sm flex items-center gap-2 mb-1">
                  <o.icon className="h-4 w-4 shrink-0" aria-hidden /> {o.title}
                </p>
                <p className="text-sm text-ink-2">{o.body}</p>
              </div>
            ))}
          </section>
        </section>

        {/* how the pilot works */}
        <section aria-labelledby="pilot-h" className="pb-12 md:pb-20">
          <h2 id="pilot-h" className="font-display text-2xl uppercase mb-5">How the pilot works</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PILOT_COLUMNS.map((col) => (
              <div key={col.title} className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5">
                <h3 className="font-display text-base uppercase mb-3">{col.title}</h3>
                <ul className="text-sm text-ink-2 space-y-2 list-disc pl-4">
                  {col.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-xs text-mute mt-4 max-w-3xl">
            The fine print, stated plainly: we don't promise profit, we can't verify demand, and no
            supplier is booked until you approve a written quote, approve a physical sample, and
            explicitly authorize production. Merchant money goes to suppliers, not through us.
          </p>
        </section>
      </main>
    </div>
  )
}
