'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Info } from 'lucide-react'
import type { BudgetTier } from '@/types'
import type { CreatorBrief, FulfilmentPreference, SellingChannel } from '@/lib/launch/types'
import { emptyBrief, loadDrafts, saveDraft } from '@/lib/launch/plan'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Sticker } from '@/components/ui/Sticker'
import { PILOT_CITIES, normalizePilotCity } from '@/lib/india/cities'
import { useStudio } from '@/lib/state/StudioProvider'
import { views } from '@/lib/routes'
import { useAppNavigate } from '@/lib/navigate'
import { briefToStudioInputSeed } from '@/lib/launch/plan'

const BRIEF_KEY = 'merchdesk:brief:v1'

const CITY_OPTIONS = PILOT_CITIES.map((c) => ({ value: c, label: c }))

const CHANNEL_OPTIONS: Array<{ value: SellingChannel; label: string }> = [
  { value: 'unknown', label: 'Not decided yet' },
  { value: 'in_person', label: 'In person — gig/venue table, pop-up' },
  { value: 'instagram', label: 'Instagram (DMs or pinned post)' },
  { value: 'own_site', label: 'My own site or link-in-bio store' },
  { value: 'marketplace', label: 'A marketplace' },
  { value: 'preorder', label: 'Pre-orders before production' },
]

const ARTWORK_OPTIONS: Array<{ value: CreatorBrief['artworkReadiness']; label: string }> = [
  { value: 'ready', label: 'Print-ready files exist' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'has_designer', label: 'Not yet — I have a designer' },
  { value: 'none', label: 'Not yet — no designer yet' },
]

const FULFILMENT_OPTIONS: Array<{ value: FulfilmentPreference; label: string }> = [
  { value: 'unknown', label: 'Not sure yet' },
  { value: 'self', label: 'I pack and post myself' },
  { value: 'venue_handover', label: 'Handover at a venue/event — no shipping' },
  { value: 'post', label: 'Someone else posts for me' },
]

function Hint({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-mute mt-1 flex gap-1.5 items-start">
      <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
      <span>{children}</span>
    </p>
  )
}

export function BriefView() {
  const navigate = useAppNavigate()
  const studio = useStudio()
  const [brief, setBrief] = useState<CreatorBrief>(() => emptyBrief())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  // restore draft (after mount — the parse reads device storage)
  useEffect(() => {
    let alive = true
    void Promise.resolve().then(() => {
      if (!alive) return
      try {
        const raw = localStorage.getItem(BRIEF_KEY)
        if (raw) setBrief({ ...emptyBrief(), ...(JSON.parse(raw) as CreatorBrief) })
      } catch {
        /* ignore */
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const set = <K extends keyof CreatorBrief>(key: K, value: CreatorBrief[K]) => {
    setBrief((b) => ({ ...b, [key]: value }))
    setSaved(false)
  }

  const latestPlan = useMemo(() => loadDrafts()[0], [])

  const validate = (): boolean => {
    const e: Record<string, string> = {}
    if (!brief.creatorName.trim()) e.creatorName = 'We need a name for the launch contact'
    if (!brief.projectName.trim()) e.projectName = 'Give the project a working name'
    if (brief.purpose.trim().length < 5) e.purpose = 'One line on what this launch is for'
    if (!brief.targetDateUnknown && !brief.targetDate) e.targetDate = 'Pick a date, or mark it as not fixed'
    if (!brief.targetDateUnknown && brief.targetDate && new Date(brief.targetDate) < new Date(new Date().toDateString())) {
      e.targetDate = 'The target date is in the past'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const save = (): CreatorBrief => {
    const next = { ...brief, city: normalizePilotCity(brief.city) ?? brief.city, updatedAt: new Date().toISOString() }
    try {
      localStorage.setItem(BRIEF_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
    // keep an existing draft plan's brief in sync so edits after generation stick
    if (latestPlan) {
      saveDraft({ ...latestPlan, brief: next, name: latestPlan.name.startsWith('Untitled') ? `${next.projectName || next.creatorName} merch drop` : latestPlan.name })
    }
    return next
  }

  const continueToLaunch = () => {
    if (!validate()) return
    save()
    navigate(views.launch)
  }

  const continueToRecommendations = () => {
    if (!validate()) return
    const next = save()
    void studio.startRun(briefToStudioInputSeed(next))
    navigate(views.studio)
  }

  const requiredReady = brief.creatorName.trim() && brief.projectName.trim() && brief.purpose.trim().length >= 4 && (brief.targetDateUnknown || brief.targetDate)

  return (
    <main id="main" className="mx-auto w-full max-w-3xl px-4 md:px-6 py-10">
      <Sticker className="mb-3">Step 1 of 3 · Takes about 4 minutes</Sticker>
      <h1 className="font-display text-4xl md:text-5xl uppercase leading-tight mb-3">Start your launch brief</h1>
      <p className="text-ink-2 mb-8 max-w-xl">
        This brief drives everything: which products get recommended, how the money math is set up,
        and what the quote request says to suppliers. You can edit it after a plan is generated.
      </p>

      <form className="space-y-10" noValidate onSubmit={(e) => { e.preventDefault(); continueToLaunch() }}>
        <section aria-labelledby="req-h">
          <h2 id="req-h" className="font-display text-xl uppercase mb-4">Required</h2>
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Your name"
                required
                value={brief.creatorName}
                onChange={(e) => set('creatorName', e.target.value)}
                error={errors.creatorName}
                placeholder="Who runs this launch?"
              />
              <Input
                label="Project / band name"
                required
                value={brief.projectName}
                onChange={(e) => set('projectName', e.target.value)}
                error={errors.projectName}
                placeholder="e.g. The Neighbourhood Static"
              />
            </div>

            <div>
              <Textarea
                label="What is this launch for?"
                required
                value={brief.purpose}
                onChange={(e) => set('purpose', e.target.value)}
                error={errors.purpose}
                placeholder="EP release, album tour, first anniversary, comic launch…"
                maxLength={600}
                counter
              />
              <Hint>Drives product choice: a tour favours wearables; a comic launch favours prints and zines.</Hint>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="target-date" className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
                  Target launch date <span className="text-mute normal-case tracking-normal">(or say it's not fixed)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="target-date"
                    type="date"
                    value={brief.targetDate}
                    disabled={brief.targetDateUnknown}
                    onChange={(e) => set('targetDate', e.target.value)}
                    aria-invalid={errors.targetDate ? true : undefined}
                    className="flex-1 bg-paper-2 text-ink font-sans text-base border-2 border-ink rounded-sm px-3 py-2 min-h-11 focus:bg-paper focus:ring-4 focus:ring-cobalt/40 disabled:opacity-40"
                  />
                  <label className="flex items-center gap-2 text-sm whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={brief.targetDateUnknown}
                      onChange={(e) => set('targetDateUnknown', e.target.checked)}
                      className="h-4 w-4 accent-[var(--cobalt)]"
                    />
                    Not fixed
                  </label>
                </div>
                {errors.targetDate && <p className="text-sm text-tomato-deep mt-1" role="alert">{errors.targetDate}</p>}
                <Hint>Dates are only ever used for planning and season notes — never invented.</Hint>
              </div>

              <Select
                label="City / delivery region (pilot covers 7 cities)"
                options={CITY_OPTIONS}
                value={normalizePilotCity(brief.city) ?? brief.city}
                onChange={(e) => set('city', e.target.value)}
              />
            </div>

            <Select
              label="Budget you can put at risk"
              options={[
                { value: 'small', label: 'Under ₹25,000 — safest first run' },
                { value: 'medium', label: '₹25,000–₹75,000' },
                { value: 'large', label: 'Up to ₹2,00,000' },
              ]}
              value={brief.budgetTier}
              onChange={(e) => set('budgetTier', e.target.value as BudgetTier)}
            />

            <Select
              label="Where will you sell?"
              options={CHANNEL_OPTIONS}
              value={brief.sellingChannel}
              onChange={(e) => set('sellingChannel', e.target.value as SellingChannel)}
            />

            <Select
              label="Artwork readiness"
              options={ARTWORK_OPTIONS}
              value={brief.artworkReadiness}
              onChange={(e) => set('artworkReadiness', e.target.value as CreatorBrief['artworkReadiness'])}
            />
            <Hint>Print-ready artwork is a hard gate before any production quote can turn into an order.</Hint>
          </div>
        </section>

        <section aria-labelledby="opt-h">
          <h2 id="opt-h" className="font-display text-xl uppercase mb-1">Optional — improves the recommendations</h2>
          <p className="text-sm text-mute mb-4">Leave anything blank; blanks become visible tasks, never invented answers.</p>
          <div className="space-y-5">
            <div>
              <Textarea
                label="Audience evidence — what shows people will buy?"
                value={brief.audienceEvidence}
                onChange={(e) => set('audienceEvidence', e.target.value)}
                placeholder="e.g. 40 pre-orders at gigs, comment volume on artwork posts, past zine sell-through"
                maxLength={600}
                counter
              />
              <Hint>
                Follower counts are not demand evidence — they are never scored as such. Concrete
                signals (pre-orders, sell-through, comments on merch-shaped posts) shape recommendations.
              </Hint>
            </div>

            <div>
              <label className="font-mono text-xs uppercase tracking-widest text-ink-2 mb-1.5 block">
                Product types you prefer
              </label>
              <div className="flex flex-wrap gap-2">
                {['tees', 'hoodies/crewnecks', 'totes', 'caps', 'posters/art prints', 'zines', 'stickers', 'mugs', 'pins/patches'].map((pref) => {
                  const active = brief.productPrefs.includes(pref)
                  return (
                    <button
                      key={pref}
                      type="button"
                      aria-pressed={active}
                      onClick={() =>
                        set('productPrefs', active ? brief.productPrefs.filter((p) => p !== pref) : [...brief.productPrefs, pref])
                      }
                      className={`border-2 border-ink rounded-full px-3 py-1 text-sm font-medium transition ${active ? 'bg-acid' : 'bg-paper hover:bg-paper-2'}`}
                    >
                      {pref}
                    </button>
                  )
                })}
              </div>
              <Hint>Preferences steer the shortlist; strong audience evidence can still surface something else.</Hint>
            </div>

            <Select
              label="Fulfilment — who gets orders into hands?"
              options={FULFILMENT_OPTIONS}
              value={brief.fulfilment}
              onChange={(e) => set('fulfilment', e.target.value as FulfilmentPreference)}
            />
            <Hint>Changes the checklist (shipping setup vs. venue handover) — recorded, not assumed.</Hint>

            <Textarea
              label="Anything else?"
              value={brief.notes}
              onChange={(e) => set('notes', e.target.value)}
              maxLength={600}
            />
          </div>
        </section>

        <div className="border-2 border-ink rounded-md bg-paper-2 shadow-hard p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <p className="font-display uppercase">What happens next</p>
            <p className="text-sm text-ink-2 max-w-md mt-1">
              Your brief is stored on this device only. Get product recommendations from your audience
              taste, or skip straight to building the launch plan with 1–3 products and full economics.
            </p>
            {saved && <p className="text-xs text-leaf mt-1" role="status">Brief saved on this device.</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button type="button" variant="secondary" onClick={continueToRecommendations} disabled={!requiredReady}>
              Get recommendations <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button type="submit" variant="primary" onClick={continueToLaunch} disabled={!requiredReady}>
              Build my launch plan <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </form>
    </main>
  )
}
