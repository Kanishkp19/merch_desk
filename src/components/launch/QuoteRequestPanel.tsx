'use client'

import React, { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Send } from 'lucide-react'
import type { LaunchPlan, QuoteRequestPayload } from '@/lib/launch/types'
import { buildQuotePayload } from '@/lib/launch/plan'
import { planEconomics } from '@/lib/launch/checklist'
import { formatPaise } from '@/lib/economics/engine'
import { apiJson } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'

const CONSENT_TEXT =
  'I consent to MerchDesk sharing this request (product specs, quantities, delivery city and my contact details) with suppliers for the purpose of getting a quote. Nothing is sent automatically — the founder coordinates manually.'

interface SubmitResult {
  ref: string
  duplicate: boolean
}

export function QuoteRequestPanel({
  plan,
  onSubmitted,
}: {
  plan: LaunchPlan
  onSubmitted: (ref: string, submittedAt: string, digest: string) => void
}) {
  const [contact, setContact] = useState({ name: plan.brief.creatorName, email: '', phone: '', shareWithSuppliers: false })
  const [notes, setNotes] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [showPayload, setShowPayload] = useState(false)

  const economics = planEconomics(plan).result
  const included = plan.lines.filter((l) => l.included)

  const payload: QuoteRequestPayload | null = useMemo(() => {
    if (!contact.name.trim() || !contact.email.trim()) return null
    return {
      launchName: plan.name,
      brief: {
        projectName: plan.brief.projectName,
        purpose: plan.brief.purpose,
        city: plan.brief.city,
        targetDate: plan.brief.targetDateUnknown ? '' : plan.brief.targetDate,
        sellingChannel: plan.brief.sellingChannel,
        fulfilment: plan.brief.fulfilment,
        artworkReadiness: plan.brief.artworkReadiness,
      },
      lines: included.map((l) => ({
        productId: l.productId,
        name: l.name,
        quantityOrdered: l.quantityOrdered,
        sellPrice: l.sellPrice,
        unitCostKnown: l.unitCostKnown,
        artworkReady: l.artworkReady,
        supplierBrief: l.supplierBrief,
        gstRatePct: l.gstRatePct,
      })),
      targetDateKnown: !plan.brief.targetDateUnknown && plan.brief.targetDate !== '',
      deliveryRegion: plan.brief.city,
      costAssumptions: {
        estimatedSetupTotal: included.reduce((a, l) => a + l.setupCost, 0),
        estimatedUnitCostRange: [
          included.map((l) => l.unitCost).sort((a, b) => a - b)[0] ?? 0,
          included.map((l) => l.unitCost).sort((a, b) => a - b)[included.length - 1] ?? 0,
        ],
        pricesIncludeGst: plan.pricesIncludeGst,
        unconfirmedCount: economics.unconfirmed.length,
      },
      notes: notes.trim() || undefined,
      contact: {
        name: contact.name,
        email: contact.email,
        ...(contact.phone.trim() ? { phone: contact.phone.trim() } : {}),
        shareWithSuppliers: contact.shareWithSuppliers as true,
        consentText: CONSENT_TEXT,
      },
    }
  }, [plan, contact, notes, included, economics.unconfirmed.length])

  const blockers = [
    ...(!payload ? ['Add your name and email so we know who to reply to'] : []),
    ...(included.length === 0 ? ['Add at least one product in the Assortment tab'] : []),
    ...(!contact.shareWithSuppliers ? ['Tick the consent box — we cannot approach suppliers without it'] : []),
  ]
  const advisories = [
    ...(included.some((l) => !l.artworkReady)
      ? ['Some final artwork is not ready — you can still submit, but production can never start before it is']
      : []),
  ]

  const submit = async () => {
    if (!payload || blockers.length > 0) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiJson<{ ref: string; duplicate: boolean; submittedAt: string }>('/api/launches', {
        method: 'POST',
        body: JSON.stringify({
          clientRequestId: `sub-${plan.id}`,
          planId: plan.id,
          payload,
        }),
      })
      setResult({ ref: res.ref, duplicate: res.duplicate })
      const { digestPayload } = await import('@/lib/launch/checklist')
      const digest = await digestPayload(payload)
      onSubmitted(res.ref, res.submittedAt, digest)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit — try again')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <div className="space-y-6">
        <div className="bg-acid/50 border-2 border-ink rounded-md p-6" role="status">
          <p className="font-display text-2xl uppercase flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6" aria-hidden /> Request saved with the operator
          </p>
          <p className="mt-2">
            Your reference: <strong className="font-mono text-lg">{result.ref}</strong> — save it. You can track status any time from{' '}
            <strong>My launches</strong>.
          </p>
          <p className="text-sm text-ink-2 mt-2">
            {result.duplicate
              ? 'You had already submitted this exact request — we returned the original reference instead of creating a duplicate.'
              : 'No email was sent and no supplier was contacted. The founder picks this up manually during the pilot and records supplier quotes here.'}
          </p>
          <p className="text-sm text-ink-2 mt-2">
            Plan edits made after this point do <strong>not</strong> change the request the operator received.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {plan.submission && (
        <div className="bg-amber/30 border-2 border-dashed border-ink rounded-md p-4 text-sm">
          A request was already submitted for this plan ({plan.submission.ref} on{' '}
          {new Date(plan.submission.submittedAt).toLocaleString('en-IN')}). Submitting again creates a new,
          separate request — do it only if the launch genuinely changed.
        </div>
      )}

      <section aria-labelledby="review-h">
        <h3 id="review-h" className="font-display text-xl uppercase mb-3">What the operator will receive</h3>
        <div className="border-2 border-ink rounded-md bg-paper-2 p-4 text-sm space-y-2">
          <p><strong>Launch:</strong> {plan.name}</p>
          <p><strong>Project:</strong> {plan.brief.projectName} — {plan.brief.purpose}</p>
          <p><strong>Delivery region:</strong> {plan.brief.city} · <strong>Target date:</strong> {plan.brief.targetDateUnknown ? 'not fixed' : plan.brief.targetDate || 'not given'}</p>
          <p><strong>Products:</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            {included.map((l) => (
              <li key={l.productId}>
                {l.name} — {l.quantityOrdered} units, target sell {formatPaise(l.sellPrice)}, artwork{' '}
                {l.artworkReady ? 'ready' : 'NOT ready'}, unit cost {l.unitCostKnown ? 'confirmed' : 'unconfirmed estimate'}
              </li>
            ))}
          </ul>
          <p>
            <strong>Cost assumptions sent along:</strong> est. setup {formatPaise(included.reduce((a, l) => a + l.setupCost, 0))}, prices{' '}
            {plan.pricesIncludeGst ? 'incl.' : 'excl.'} GST, {economics.unconfirmed.length} unconfirmed item(s) flagged.
          </p>
          <button type="button" className="underline underline-offset-4 text-xs" onClick={() => setShowPayload((v) => !v)} aria-expanded={showPayload}>
            {showPayload ? 'Hide' : 'Show'} exact request data
          </button>
          {showPayload && (
            <pre className="text-xs bg-paper border border-ink/30 rounded-sm p-3 overflow-x-auto max-h-64" aria-label="Exact request payload">
              {payload ? JSON.stringify(payload, null, 2) : 'Fill in your contact details to see the exact payload.'}
            </pre>
          )}
        </div>
      </section>

      <section aria-labelledby="contact-h" className="grid md:grid-cols-2 gap-4">
        <h3 id="contact-h" className="font-display text-xl uppercase md:col-span-2">Your contact details</h3>
        <Input label="Your name" required value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} />
        <Input label="Email" required type="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} />
        <Input label="Phone (optional)" type="tel" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} />
        <Textarea label="Anything the operator should know (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
      </section>

      <section aria-labelledby="consent-h">
        <h3 id="consent-h" className="font-display text-xl uppercase mb-3">Consent</h3>
        <label className="flex items-start gap-3 border-2 border-ink rounded-sm bg-paper p-3 text-sm">
          <input
            type="checkbox"
            checked={contact.shareWithSuppliers}
            onChange={(e) => setContact((c) => ({ ...c, shareWithSuppliers: e.target.checked }))}
            className="h-4 w-4 mt-0.5 accent-[var(--cobalt)]"
          />
          <span>{CONSENT_TEXT}</span>
        </label>
      </section>

      {advisories.length > 0 && (
        <div className="bg-amber/30 border-2 border-dashed border-ink rounded-md p-4" role="note">
          <p className="font-bold flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4" aria-hidden /> Worth knowing before you submit
          </p>
          <ul className="list-disc pl-5 text-sm space-y-0.5">
            {advisories.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <p className="text-sm text-tomato-deep font-medium" role="alert">{error}</p>
      )}

      <Button variant="primary" onClick={submit} disabled={submitting || blockers.length > 0 || !payload}>
        <Send className="h-4 w-4" aria-hidden /> {submitting ? 'Submitting…' : 'Submit quote request'}
      </Button>
      <p className="text-xs text-mute">
        Submitting saves the request for the founder to pick up manually. It does not email anyone, does
        not contact suppliers, and does not authorize production.
      </p>
    </div>
  )
}
