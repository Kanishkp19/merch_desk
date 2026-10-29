'use client'

import React from 'react'
import { Download, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { routes, views } from '@/lib/routes'
import { useAppNavigate } from '@/lib/navigate'


const HOW = [
  { title: '1 · Describe your fans', body: 'Search an artist (resolved via Qloo) or describe your audience in a sentence. Add a city for local collab ideas.' },
  { title: '2 · Agent researches taste', body: 'An LLM agent decides which Qloo tools to call — entity search, tags, taste analysis, related entities — and streams every step to a live panel.' },
  { title: '3 · Scored collection', body: 'Deterministic code scores a 20-item catalog against the profile: fit = 50% taste tags + 30% brand affinity + 20% cross-domain interests. Every product shows its evidence.' },
  { title: '4 · Describe, approve, then image', body: 'Each product is described in words first. Only after you approve does MerchDesk generate an AI concept image — never before. Export a one-page line sheet.' },
]

export function AboutView() {
  const navigate = useAppNavigate()
  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6 py-12 space-y-12">
      <header>
        <h1 className="font-display text-3xl md:text-4xl uppercase leading-tight">How MerchDesk works</h1>
        <p className="text-lg text-ink-2 mt-2 max-w-2xl">
          An agent for independent creators: real audience taste data (Qloo) + deterministic unit economics +
          an approval-gated image flow. Free tiers all the way down.
        </p>
      </header>

      <section aria-label="The flow" className="grid md:grid-cols-2 gap-4">
        {HOW.map((h) => (
          <Card key={h.title}>
            <h2 className="font-display text-base uppercase mb-2">{h.title}</h2>
            <p className="text-sm text-ink-2 leading-relaxed">{h.body}</p>
          </Card>
        ))}
      </section>

      <section aria-label="Data honesty" className="grid md:grid-cols-3 gap-4">
        <Card>
          <Chip variant="evidence">Qloo</Chip>
          <h2 className="font-display text-sm uppercase mt-3 mb-2">What Qloo does here</h2>
          <p className="text-sm text-ink-2 leading-relaxed">
            Qloo returns <strong>affinity</strong> — what an audience gravitates toward. It never returns
            purchases, sales or prices, and MerchDesk never claims it does.
          </p>
        </Card>
        <Card>
          <Chip variant="estimated">Estimates</Chip>
          <h2 className="font-display text-sm uppercase mt-3 mb-2">What's estimated</h2>
          <p className="text-sm text-ink-2 leading-relaxed">
            Unit costs, prices, margins and break-even figures are MerchDesk's own estimates, labelled as such
            everywhere. Get real supplier quotes before ordering.
          </p>
        </Card>
        <Card>
          <Chip variant="category">AI</Chip>
          <h2 className="font-display text-sm uppercase mt-3 mb-2">What's AI</h2>
          <p className="text-sm text-ink-2 leading-relaxed">
            Product descriptions and concept images are AI-generated. Image prompts are stripped of artist
            names, brand names and trademarks. Images are labelled "AI concept — not a final design".
          </p>
        </Card>
      </section>

      <section aria-label="Free and open" className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-5 md:p-6">
        <h2 className="font-display text-xl uppercase mb-3">Free, open, honest</h2>
        <ul className="space-y-2 text-sm text-ink-2 max-w-3xl">
          <li>▸ Runs entirely on free tiers — no paid services, no payment methods, ever.</li>
          <li>▸ If a free quota runs out, MerchDesk degrades gracefully: scripted agent steps, template descriptions, SVG concept sketches.</li>
          <li>▸ MIT licensed. Planning documents (PRD, TRD, design system, API contract) ship in the repo's <code className="font-mono text-xs bg-paper px-1">docs/</code> folder.</li>
          <li>▸ No accounts, no tracking. Your run lives in this browser tab; generated images exist only in memory until you download them.</li>
        </ul>
        <div className="flex flex-wrap gap-3 mt-5">
          <a href="/merchdesk.zip" download>
            <Button variant="dark">
              <Download className="h-4 w-4" aria-hidden /> Download the project (.zip)
            </Button>
          </a>
          <Button variant="secondary" onClick={() => navigate(views.home)}>
            Build my merch line →
          </Button>
        </div>
        <p className="text-xs text-mute mt-3">
          The zip contains the full structured repo: <code className="font-mono">app/</code> routes, 9 API
          endpoints, agent + scoring engine, design system, data files, tests-ready config, docs and MIT license.
        </p>
      </section>

      <section aria-label="Credits" className="text-sm text-ink-2 space-y-1 pb-8">
        <h2 className="font-display text-base uppercase mb-2">Credits</h2>
        <p>
          Audience insights powered by{' '}
          <a href="https://qloo.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 inline-flex items-center gap-1">
            Qloo <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
          . Built for the Qloo Agentic Hackathon. LLM chain: Groq → Google AI Studio → Cloudflare Workers AI
          (with a scripted fallback). Images: FLUX.1 [schnell] via free tiers.
        </p>
        <p className="text-xs text-mute">
          This deployment runs on labelled sample data when no Qloo key is configured — every surface says so.
          {routes.about ? '' : ''}
        </p>
      </section>
    </main>
  )
}
