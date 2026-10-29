'use client'

import React, { useEffect, useState } from 'react'
import { KeyRound, RefreshCw } from 'lucide-react'
import type { QuoteRecord, RequestEvent } from '@/lib/launch/types'
import { apiJson } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Input'
import { Sticker } from '@/components/ui/Sticker'
import { formatPaise } from '@/lib/economics/engine'

interface QueueItem {
  ref: string
  status: string
  createdAt: string
  updatedAt: string
  creatorName: string
  launchName: string
  lineCount: number
  quoteCount: number
}

interface FullRequest {
  ref: string
  status: string
  createdAt: string
  payload: {
    launchName: string
    brief: Record<string, string>
    lines: Array<{ name: string; quantityOrdered: number; sellPrice: number; artworkReady: boolean; unitCostKnown: boolean; supplierBrief: string }>
    deliveryRegion: string
    targetDateKnown: boolean
    costAssumptions: { estimatedSetupTotal: number; pricesIncludeGst: boolean; unconfirmedCount: number }
    notes?: string
    contact: { name: string; email: string; phone?: string }
  }
  working: { events: RequestEvent[]; quotes: QuoteRecord[] }
}

const KEY_STORE = 'merchdesk:operatorKey'

export function OperatorView() {
  const [key, setKey] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [selected, setSelected] = useState<FullRequest | null>(null)
  const [manualNote, setManualNote] = useState('')

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY_STORE)
      if (saved) {
        setKey(saved)
        void loadQueue(saved)
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadQueue = async (operatorKey: string) => {
    setAuthError(null)
    try {
      const res = await apiJson<{ requests: QueueItem[]; manualNote: string }>('/api/operator/requests', {
        headers: { 'x-operator-key': operatorKey },
      })
      setQueue(res.requests)
      setAuthed(true)
      sessionStorage.setItem(KEY_STORE, operatorKey)
    } catch (err) {
      setAuthed(false)
      setQueue(null)
      setAuthError(err instanceof Error ? err.message : 'Could not load the queue')
    }
  }

  const open = async (ref: string) => {
    try {
      const res = await apiJson<FullRequest>(`/api/operator/requests/${encodeURIComponent(ref)}`, {
        headers: { 'x-operator-key': key },
      })
      setSelected(res)
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Could not open the request')
    }
  }

  const patch = async (body: Record<string, unknown>) => {
    if (!selected) return
    try {
      await apiJson(`/api/operator/requests/${encodeURIComponent(selected.ref)}`, {
        method: 'PATCH',
        headers: { 'x-operator-key': key },
        body: JSON.stringify(body),
      })
      await open(selected.ref)
      const res = await apiJson<{ requests: QueueItem[] }>('/api/operator/requests', { headers: { 'x-operator-key': key } })
      setQueue(res.requests)
      setManualNote('')
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Update failed')
    }
  }

  if (!authed) {
    return (
      <main id="main" className="mx-auto w-full max-w-md px-4 md:px-6 py-16">
        <Sticker className="mb-3">Founder only</Sticker>
        <h1 className="font-display text-3xl uppercase mb-3">Operator queue</h1>
        <p className="text-sm text-ink-2 mb-6">
          Pilot access: a shared key, not accounts. There is no supplier integration — quotes are
          phoned in, emailed or walked over, and recorded here by hand.
        </p>
        <Input
          label="Operator key"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          error={authError ?? undefined}
        />
        <Button variant="primary" className="mt-4 w-full" onClick={() => void loadQueue(key.trim())}>
          <KeyRound className="h-4 w-4" aria-hidden /> Open queue
        </Button>
      </main>
    )
  }

  return (
    <main id="main" className="mx-auto w-full max-w-5xl px-4 md:px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-3xl uppercase">Operator queue</h1>
        <Button variant="secondary" className="text-xs" onClick={() => void loadQueue(key)}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Refresh
        </Button>
      </div>
      <p className="text-sm bg-amber/30 border-2 border-dashed border-ink rounded-md p-3 mb-6">
        Manual workflow reminder: no request has been emailed anywhere. You contact suppliers yourself;
        everything you record here is what creators see.
      </p>

      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
        <section aria-label="Request queue">
          {queue && queue.length === 0 && <p className="text-sm text-mute">No requests yet.</p>}
          <ul className="space-y-2">
            {(queue ?? []).map((q) => (
              <li key={q.ref}>
                <button
                  type="button"
                  onClick={() => void open(q.ref)}
                  className={`w-full text-left border-2 rounded-md p-3 transition ${
                    selected?.ref === q.ref ? 'border-ink bg-acid/40' : 'border-ink bg-paper-2 hover:bg-paper'
                  }`}
                >
                  <p className="font-display uppercase text-sm">{q.launchName}</p>
                  <p className="text-xs text-mute">
                    <span className="font-mono">{q.ref}</span> · {q.creatorName} · {q.lineCount} product(s) ·{' '}
                    {q.quoteCount} quote(s) · {new Date(q.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  <span className="inline-block mt-1 text-xs font-bold border border-ink rounded-full px-2 py-0.5">{q.status.replace(/_/g, ' ')}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section aria-label="Request detail">
          {!selected ? (
            <p className="text-sm text-mute border-2 border-dashed border-ink rounded-md p-6 text-center">
              Pick a request to review it.
            </p>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-ink rounded-md bg-paper-2 shadow-hard-sm p-4">
                <h2 className="font-display text-xl uppercase">{selected.payload.launchName}</h2>
                <p className="text-xs text-mute font-mono">{selected.ref} · status: {selected.status}</p>
                <div className="text-sm mt-2 space-y-1">
                  <p><strong>Creator:</strong> {selected.payload.contact.name} · {selected.payload.contact.email}{selected.payload.contact.phone ? ` · ${selected.payload.contact.phone}` : ''}</p>
                  <p><strong>Project:</strong> {selected.payload.brief.projectName} — {selected.payload.brief.purpose}</p>
                  <p><strong>Region:</strong> {selected.payload.deliveryRegion} · <strong>Date:</strong> {selected.payload.targetDateKnown ? selected.payload.brief.targetDate : 'not fixed'}</p>
                  <p><strong>Channel:</strong> {selected.payload.brief.sellingChannel} · <strong>Fulfilment:</strong> {selected.payload.brief.fulfilment} · <strong>Artwork:</strong> {selected.payload.brief.artworkReadiness}</p>
                  {selected.payload.notes && <p><strong>Creator notes:</strong> {selected.payload.notes}</p>}
                </div>
                <table className="w-full text-sm mt-3">
                  <thead>
                    <tr className="border-b border-ink/20 text-left text-xs uppercase font-mono text-ink-2">
                      <th className="py-1">Product</th>
                      <th className="py-1">Qty</th>
                      <th className="py-1">Artwork</th>
                      <th className="py-1">Unit cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selected.payload.lines.map((l) => (
                      <tr key={l.name} className="border-b border-ink/10">
                        <td className="py-1.5 pr-2">{l.name}</td>
                        <td className="py-1.5">{l.quantityOrdered}</td>
                        <td className="py-1.5">{l.artworkReady ? 'ready' : 'NOT ready'}</td>
                        <td className="py-1.5">{l.unitCostKnown ? 'confirmed' : 'estimate'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* operator actions */}
              <div className="border-2 border-ink rounded-md bg-paper-2 p-4 space-y-3">
                <h3 className="font-display uppercase">Record supplier activity</h3>
                <Textarea label="Message to creator / note" value={manualNote} onChange={(e) => setManualNote(e.target.value)} maxLength={2000} />
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" className="text-xs" onClick={() => void patch({ type: 'note', text: manualNote || 'Operator note' })}>
                    Save note
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-xs"
                    onClick={() => void patch({ type: 'info_request', text: manualNote || 'Please send the missing information.' })}
                  >
                    Request info (marks “needs information”)
                  </Button>
                  <Button variant="secondary" className="text-xs" onClick={() => void patch({ type: 'status', status: 'closed' })}>
                    Close request
                  </Button>
                </div>
                <QuoteRecorder onRecord={(q) => void patch({ type: 'quote', ...q })} />
              </div>

              {/* quotes + history */}
              {selected.working.quotes.length > 0 && (
                <div className="border-2 border-ink rounded-md bg-paper-2 p-4">
                  <h3 className="font-display uppercase mb-2">Recorded quotes</h3>
                  <ul className="space-y-2 text-sm">
                    {selected.working.quotes.map((q) => (
                      <li key={q.id} className="border border-ink/20 rounded-sm p-2 bg-paper">
                        <p className="font-medium">{q.supplier} (rev {q.revision})</p>
                        <p>
                          {formatPaise(q.unitCost)}/unit · setup {formatPaise(q.setupCost)} · min {q.minQuantity} ·{' '}
                          {q.leadTimeDays === null ? 'lead time n/a' : `${q.leadTimeDays} days`}{' '}
                          {q.validUntil ? `· valid until ${q.validUntil}` : ''}
                        </p>
                        <p className="text-xs text-mute">Includes: {q.includes.join(', ') || '—'} · Excludes: {q.excludes.join(', ') || '—'}</p>
                        {q.creatorDecision && <p className="text-xs font-bold">Creator: {q.creatorDecision}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-2 border-ink rounded-md bg-paper-2 p-4">
                <h3 className="font-display uppercase mb-2">History</h3>
                <ul className="text-sm space-y-1 list-disc pl-5">
                  {selected.working.events.map((e) => (
                    <li key={e.id}>
                      {new Date(e.at).toLocaleString('en-IN')} — <strong>{e.actor}</strong> ({e.type}): {e.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function QuoteRecorder({ onRecord }: { onRecord: (q: Record<string, unknown>) => void }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    supplier: '',
    unitCostRupees: '',
    setupRupees: '',
    minQuantity: '',
    leadTimeDays: '',
    validUntil: '',
    includes: '',
    excludes: '',
  })
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    const unit = Number(form.unitCostRupees)
    const setup = Number(form.setupRupees || '0')
    const min = Number(form.minQuantity)
    if (!form.supplier.trim()) return setError('Supplier name is required')
    if (Number.isNaN(unit) || unit < 0) return setError('Unit cost must be a positive number')
    if (Number.isNaN(setup) || setup < 0) return setError('Setup cost must be a positive number')
    if (Number.isNaN(min) || min < 1) return setError('Minimum quantity must be at least 1')
    setError(null)
    onRecord({
      supplier: form.supplier.trim(),
      unitCost: Math.round(unit * 100),
      setupCost: Math.round(setup * 100),
      minQuantity: Math.round(min),
      leadTimeDays: form.leadTimeDays.trim() === '' ? null : Number(form.leadTimeDays),
      ...(form.validUntil ? { validUntil: form.validUntil } : {}),
      includes: form.includes.split(',').map((s) => s.trim()).filter(Boolean),
      excludes: form.excludes.split(',').map((s) => s.trim()).filter(Boolean),
    })
    setOpen(false)
  }

  if (!open) {
    return (
      <Button variant="primary" className="text-xs" onClick={() => setOpen(true)}>
        + Record a quote
      </Button>
    )
  }
  return (
    <div className="border-2 border-ink rounded-sm p-3 space-y-3 bg-paper">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input label="Supplier" value={form.supplier} onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))} />
        <Input label="Unit cost (₹)" type="number" value={form.unitCostRupees} onChange={(e) => setForm((f) => ({ ...f, unitCostRupees: e.target.value }))} />
        <Input label="Setup cost (₹)" type="number" value={form.setupRupees} onChange={(e) => setForm((f) => ({ ...f, setupRupees: e.target.value }))} />
        <Input label="Minimum quantity" type="number" value={form.minQuantity} onChange={(e) => setForm((f) => ({ ...f, minQuantity: e.target.value }))} />
        <Input label="Lead time (days, blank if not stated)" type="number" value={form.leadTimeDays} onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))} />
        <Input label="Valid until" type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
      </div>
      <Input label="Includes (comma-separated)" value={form.includes} onChange={(e) => setForm((f) => ({ ...f, includes: e.target.value }))} />
      <Input label="Excludes (comma-separated — e.g. tax, shipping)" value={form.excludes} onChange={(e) => setForm((f) => ({ ...f, excludes: e.target.value }))} />
      {error && <p className="text-sm text-tomato-deep" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button variant="primary" className="text-xs" onClick={submit}>Save quote</Button>
        <Button variant="secondary" className="text-xs" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  )
}
