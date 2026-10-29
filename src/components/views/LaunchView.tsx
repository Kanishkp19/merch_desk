'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { FlaskConical, HardDrive, Server } from 'lucide-react'
import type { ChecklistStatus, LaunchLine, LaunchPlan } from '@/lib/launch/types'
import {
  MAX_LAUNCH_LINES,
  createPlan,
  lineFromProduct,
  loadBrief,
  loadDrafts,
  saveDraft,
} from '@/lib/launch/plan'
import { sampleLaunchPlan } from '@/lib/launch/sample'
import { catalogItem } from '@/lib/catalog/pilot'
import { indiaCost, gstRateFor } from '@/lib/score/pricing'
import { rupeesToPaise } from '@/lib/economics/engine'
import { useStudio } from '@/lib/state/StudioProvider'
import { useAppNavigate } from '@/lib/navigate'
import { views } from '@/lib/routes'
import { Button } from '@/components/ui/Button'
import { Sticker } from '@/components/ui/Sticker'
import { AssortmentEditor } from '@/components/launch/AssortmentEditor'
import { EconomicsPanel } from '@/components/launch/EconomicsPanel'
import { ChecklistPanel } from '@/components/launch/ChecklistPanel'
import { QuoteRequestPanel } from '@/components/launch/QuoteRequestPanel'

const ACTIVE_KEY = 'merchdesk:activeLaunch'

type Tab = 'assortment' | 'economics' | 'checklist' | 'quote'

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'assortment', label: '1 · Assortment' },
  { id: 'economics', label: '2 · Economics' },
  { id: 'checklist', label: '3 · Checklist & brief' },
  { id: 'quote', label: '4 · Get quote' },
]

export function LaunchView({ exampleMode = false }: { exampleMode?: boolean }) {
  const studio = useStudio()
  const navigate = useAppNavigate()
  const [plan, setPlan] = useState<LaunchPlan | null>(() => (exampleMode ? sampleLaunchPlan() : null))
  const [ready, setReady] = useState(() => exampleMode)
  const [tab, setTab] = useState<Tab>('assortment')
  const [noProductsAtStart, setNoProductsAtStart] = useState(false)

  useEffect(() => {
    if (exampleMode) return
    let alive = true
    void Promise.resolve().then(() => {
      if (!alive) return
      const activeId = sessionStorage.getItem(ACTIVE_KEY)
      const drafts = loadDrafts()
      const active = drafts.find((p) => p.id === activeId) ?? drafts[0]
      if (active) setPlan(active)
      setReady(true)
    })
    return () => {
      alive = false
    }
  }, [exampleMode])

  // persist every change (draft = device-only localStorage)
  const update = (fn: (p: LaunchPlan) => LaunchPlan) => {
    setPlan((prev) => {
      if (!prev) return prev
      const next = { ...fn(prev), updatedAt: new Date().toISOString() }
      saveDraft(next)
      sessionStorage.setItem(ACTIVE_KEY, next.id)
      return next
    })
  }

  const onLineChange = (productId: string, patch: Partial<LaunchLine>) =>
    update((p) => ({ ...p, lines: p.lines.map((l) => (l.productId === productId ? { ...l, ...patch } : l)) }))

  const onRemoveLine = (productId: string) =>
    update((p) => ({ ...p, lines: p.lines.filter((l) => l.productId !== productId) }))

  const onAddLine = (productId: string) => {
    if (!plan || plan.lines.length >= MAX_LAUNCH_LINES) return
    const studioProduct = studio.state.products.find((p) => p.id === productId)
    if (studioProduct) {
      update((p) => ({ ...p, lines: [...p.lines, lineFromProduct(studioProduct)] }))
      return
    }
    const item = catalogItem(productId)
    if (!item) return
    const india = indiaCost(item)
    const price = Math.round(((india.priceRange[0] + india.priceRange[1]) / 2) / 10) * 10
    const line: LaunchLine = {
      productId: item.id,
      name: item.name,
      oneLiner: item.noun,
      category: item.category,
      role: 'core',
      silhouette: item.silhouette,
      fitScore: 0,
      evidence: [],
      recommendationSource: 'manual',
      supplierType: item.supplierType,
      supplierBrief: item.supplierBrief,
      complianceNote: item.complianceNote,
      leadTime: 'unconfirmed',
      minRun: item.minRun,
      included: true,
      quantityOrdered: item.minRun,
      expectedSold: item.minRun,
      sellPrice: rupeesToPaise(price),
      unitCostKnown: false,
      unitCost: rupeesToPaise((india.unitCost[0] + india.unitCost[1]) / 2),
      setupCost: rupeesToPaise(india.setupCost),
      gstRatePct: Math.round(gstRateFor(item, price) * 100),
      artworkReady: false,
    }
    update((p) => ({ ...p, lines: [...p.lines, line] }))
  }

  const onSubmitted = (ref: string, submittedAt: string, digest: string) =>
    update((p) => ({ ...p, submission: { ref, submittedAt, snapshotDigest: digest } }))

  const startFromStudio = () => {
    const approved = studio.state.products.filter((p) => p.decision === 'approved')
    const pool = approved.length > 0 ? approved : studio.state.products
    const briefDraft = loadBrief()
    const brief = { ...briefDraft, projectName: briefDraft.projectName || studio.state.input?.artist?.name || '' }
    const seeded = createPlan(brief, pool)
    saveDraft(seeded)
    sessionStorage.setItem(ACTIVE_KEY, seeded.id)
    setPlan(seeded)
  }

  const startBlank = () => {
    const seeded = createPlan(loadBrief(), [])
    saveDraft(seeded)
    sessionStorage.setItem(ACTIVE_KEY, seeded.id)
    setPlan(seeded)
    setNoProductsAtStart(true)
  }

  const availableProducts = useMemo(
    () =>
      studio.state.products.map((p) => ({
        id: p.id,
        name: p.name,
        fitScore: p.fitScore,
        evidenceCount: p.evidence.length,
        role: p.role,
      })),
    [studio.state.products]
  )

  if (!ready) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6 py-16">
        <p className="font-mono text-sm text-mute" aria-live="polite">Loading launch workspace…</p>
      </main>
    )
  }

  if (exampleMode && plan) {
    return (
      <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6 py-10">
        <div className="bg-amber border-b-2 border-ink -mx-4 px-4 py-2 mb-6 flex items-center gap-2 text-sm font-medium" role="note">
          <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
          Example plan built from clearly-labelled sample data. Nothing here is a real creator, supplier, or quote.
        </div>
        <ExamplePlanReadonly plan={plan} onBack={() => navigate(views.home)} />
      </main>
    )
  }

  if (!plan) {
    return (
      <main id="main" className="mx-auto w-full max-w-3xl px-4 md:px-6 py-12">
        <Sticker className="mb-3">Step 2 of 3</Sticker>
        <h1 className="font-display text-4xl uppercase mb-3">Build your launch plan</h1>
        <p className="text-ink-2 mb-8 max-w-xl">
          A launch plan holds your 1–3 product assortment, the full money math, and the checklist to
          production. It's stored on this device until you submit a quote request.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={startFromStudio}
            disabled={studio.state.products.length === 0}
            className="text-left border-2 border-ink rounded-md bg-paper-2 shadow-hard p-5 hover:bg-acid/30 transition disabled:opacity-40 disabled:hover:bg-paper-2"
          >
            <p className="font-display uppercase text-lg mb-1">From my recommendations</p>
            <p className="text-sm text-ink-2">
              {studio.state.products.length > 0
                ? `Start with your top ${Math.min(MAX_LAUNCH_LINES, studio.state.products.length)} recommended products (fit-scored, evidence-linked).`
                : 'No recommendations in this session — run the taste research first.'}
            </p>
          </button>
          <button
            type="button"
            onClick={startBlank}
            className="text-left border-2 border-ink rounded-md bg-paper-2 shadow-hard p-5 hover:bg-acid/30 transition"
          >
            <p className="font-display uppercase text-lg mb-1">Start from my brief only</p>
            <p className="text-sm text-ink-2">
              Add products manually from the pilot catalog. They'll be marked as having no audience evidence.
            </p>
          </button>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => navigate(views.brief)}>Fill the brief first</Button>
          <Button variant="secondary" onClick={() => navigate(views.studio)}>Get recommendations</Button>
        </div>
      </main>
    )
  }

  return (
    <main id="main" className="mx-auto w-full max-w-6xl px-4 md:px-6 py-8">
      {/* provenance banner */}
      <div className="border-2 border-ink rounded-md bg-paper-2 px-4 py-2.5 mb-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-xs" role="note">
        <span className="flex items-center gap-1.5">
          <HardDrive className="h-3.5 w-3.5" aria-hidden />
          Plan drafts: stored on this device only
        </span>
        <span className="flex items-center gap-1.5">
          <Server className="h-3.5 w-3.5" aria-hidden />
          Submitted quote requests: stored on the server under a reference
        </span>
        <button type="button" className="underline underline-offset-4 ml-auto" onClick={() => navigate(views.brief)}>
          Edit brief
        </button>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <div>
          <h1 className="font-display text-3xl md:text-4xl uppercase leading-tight">{plan.name}</h1>
          <p className="text-sm text-ink-2 mt-1">
            {plan.brief.projectName || 'No project name'} · {plan.brief.city || 'City not set'} ·{' '}
            target {plan.brief.targetDateUnknown ? 'date not fixed' : plan.brief.targetDate || 'date not set'}
          </p>
        </div>
        {plan.submission && (
          <p className="text-sm border-2 border-ink rounded-sm bg-acid/40 px-3 py-1.5">
            Request <strong className="font-mono">{plan.submission.ref}</strong> submitted{' '}
            {new Date(plan.submission.submittedAt).toLocaleDateString('en-IN')}
          </p>
        )}
      </div>

      {noProductsAtStart && plan.lines.length === 0 && (
        <div className="bg-amber/30 border-2 border-dashed border-ink rounded-md p-3 mt-3 text-sm" role="status">
          Empty plan — add 1–3 products in the Assortment tab. The economics fill in as you go.
        </div>
      )}

      {/* tabs */}
      <nav aria-label="Launch sections" className="flex flex-wrap gap-2 mt-6 mb-6 border-b-2 border-ink pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'step' : undefined}
            className={`border-2 border-ink rounded-full px-4 py-1.5 font-display uppercase text-xs tracking-wide transition ${
              tab === t.id ? 'bg-ink text-paper' : 'bg-paper hover:bg-paper-2'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'assortment' && (
        <AssortmentEditor
          plan={plan}
          onLineChange={onLineChange}
          onRemoveLine={onRemoveLine}
          onAddLine={onAddLine}
          availableProducts={availableProducts}
        />
      )}
      {tab === 'economics' && (
        <EconomicsPanel
          plan={plan}
          onEconomicsChange={(patch) =>
            update((p) => {
              const { pricesIncludeGst, ...economicsPatch } = patch
              return {
                ...p,
                ...(pricesIncludeGst !== undefined ? { pricesIncludeGst } : {}),
                economics: { ...p.economics, ...economicsPatch },
              }
            })
          }
          onLineChange={onLineChange}
        />
      )}
      {tab === 'checklist' && (
        <ChecklistPanel
          plan={plan}
          onChecklistChange={(id, status: ChecklistStatus) =>
            update((p) => ({ ...p, checklist: p.checklist.map((c) => (c.id === id ? { ...c, status } : c)) }))
          }
        />
      )}
      {tab === 'quote' && <QuoteRequestPanel plan={plan} onSubmitted={onSubmitted} />}

      <div className="flex justify-between mt-10 pt-6 border-t-2 border-ink">
        <Button
          variant="secondary"
          onClick={() => setTab((t) => (t === 'assortment' ? 'assortment' : TABS[TABS.findIndex((x) => x.id === t) - 1].id))}
          disabled={tab === 'assortment'}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={() => setTab((t) => TABS[TABS.findIndex((x) => x.id === t) + 1].id)}
          disabled={tab === 'quote'}
        >
          Continue
        </Button>
      </div>
    </main>
  )
}

function ExamplePlanReadonly({ plan, onBack }: { plan: LaunchPlan; onBack: () => void }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl md:text-4xl uppercase">{plan.name}</h1>
        <p className="text-sm text-ink-2 mt-1">
          Sample creator · {plan.brief.city} · what a finished launch plan looks like: assortment, economics, checklist.
        </p>
      </div>
      <AssortmentEditor
        plan={plan}
        onLineChange={() => undefined}
        onRemoveLine={() => undefined}
        onAddLine={() => undefined}
        availableProducts={[]}
      />
      <EconomicsPanel plan={plan} onEconomicsChange={() => undefined} onLineChange={() => undefined} />
      <ChecklistPanel plan={plan} onChecklistChange={() => undefined} />
      <Button variant="secondary" onClick={onBack}>Back to start</Button>
    </div>
  )
}
