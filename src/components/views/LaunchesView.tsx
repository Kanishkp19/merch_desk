'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, Search, Trash2, XCircle } from 'lucide-react'
import type { CreatorRequestView, LaunchPlan } from '@/lib/launch/types'
import { loadDrafts, deleteDraft } from '@/lib/launch/plan'
import { apiJson } from '@/lib/api-client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Sticker } from '@/components/ui/Sticker'
import { useAppNavigate } from '@/lib/navigate'
import { views } from '@/lib/routes'

const TRACKED_KEY = 'merchdesk:trackedRefs'

interface TrackedRequest {
  ref: string
  status: string
  submittedAt: string
  launchName: string
  events: Array<{ at: string; text: string }>
  quotes: CreatorRequestView['quotes']
}

function loadTracked(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TRACKED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveTracked(refs: string[]) {
  try {
    localStorage.setItem(TRACKED_KEY, JSON.stringify(refs.slice(0, 20)))
  } catch {
    /* ignore */
  }
}

const ACK_TEXT =
  'I understand this does not commit the supplier, start production, or guarantee delivery'

export function LaunchesView() {
  const navigate = useAppNavigate()
  const [drafts, setDrafts] = useState<LaunchPlan[]>([])
  const [tracked, setTracked] = useState<TrackedRequest[]>([])
  const [refQuery, setRefQuery] = useState('')
  const [refError, setRefError] = useState<string | null>(null)
  const [decideError, setDecideError] = useState<string | null>(null)

  const refresh = async () => {
    setDrafts(loadDrafts())
    const refs = loadTracked()
    const results = await Promise.all(
      refs.map((ref) =>
        apiJson<TrackedRequest>(`/api/launches?ref=${encodeURIComponent(ref)}`).catch(() => null)
      )
    )
    setTracked(results.filter((r): r is TrackedRequest => r !== null))
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      const drafts = loadDrafts()
      // track refs saved explicitly plus any draft that carries a submission
      const refs = Array.from(new Set([...loadTracked(), ...drafts.filter((d) => d.submission).map((d) => d.submission!.ref)]))
      const results = await Promise.all(
        refs.map((ref) =>
          apiJson<TrackedRequest>(`/api/launches?ref=${encodeURIComponent(ref)}`).catch(() => null)
        )
      )
      if (!alive) return
      setDrafts(drafts)
      setTracked(results.filter((r): r is TrackedRequest => r !== null))
    })()
    return () => {
      alive = false
    }
  }, [])

  const lookup = async () => {
    setRefError(null)
    const ref = refQuery.trim().toUpperCase()
    if (!/^MD-[A-Z0-9]{6}$/.test(ref)) {
      setRefError('References look like MD-4KQ7XA — check the format')
      return
    }
    try {
      const r = await apiJson<TrackedRequest>(`/api/launches?ref=${encodeURIComponent(ref)}`)
      const refs = loadTracked()
      if (!refs.includes(ref)) {
        refs.unshift(ref)
        saveTracked(refs)
      }
      setRefQuery('')
      void refresh()
      void r
    } catch {
      setRefError('No request found with that reference')
    }
  }

  const decide = async (ref: string, quoteId: string, decision: 'accepted' | 'declined') => {
    setDecideError(null)
    try {
      await apiJson(`/api/launches/${encodeURIComponent(ref)}?ref=${encodeURIComponent(ref)}`, {
        method: 'POST',
        body: JSON.stringify({ type: 'quote_decision', quoteId, decision, ackText: ACK_TEXT }),
      })
      await refresh()
    } catch (err) {
      setDecideError(err instanceof Error ? err.message : 'Could not record the decision')
    }
  }

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 md:px-6 py-10">
      <Sticker className="mb-3">Your workspace</Sticker>
      <h1 className="font-display text-4xl uppercase mb-3">My launches</h1>
      <p className="text-ink-2 mb-8 max-w-xl">
        Drafts live on this device only. Submitted quote requests live on the server under their
        reference and survive your browser.
      </p>

      {/* drafts */}
      <section aria-labelledby="drafts-h" className="mb-12">
        <h2 id="drafts-h" className="font-display text-xl uppercase mb-3">Launch plans (on this device)</h2>
        {drafts.length === 0 ? (
          <div className="border-2 border-dashed border-ink rounded-md bg-paper-2 p-6 text-center">
            <p className="text-sm text-ink-2 mb-3">No launch plans yet.</p>
            <Button variant="primary" onClick={() => navigate(views.brief)}>Start with the brief</Button>
          </div>
        ) : (
          <ul className="space-y-2">
            {drafts.map((d) => (
              <li key={d.id} className="border-2 border-ink rounded-md bg-paper-2 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display uppercase">{d.name}</p>
                  <p className="text-xs text-mute">
                    {d.lines.filter((l) => l.included).length} product(s) · updated{' '}
                    {new Date(d.updatedAt).toLocaleDateString('en-IN')}
                    {d.submission ? ` · request ${d.submission.ref} submitted` : ' · not submitted'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="text-xs"
                    onClick={() => {
                      sessionStorage.setItem('merchdesk:activeLaunch', d.id)
                      navigate(views.launch)
                    }}
                  >
                    Open <ChevronRight className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="secondary"
                    className="text-xs"
                    iconOnly
                    aria-label={`Delete draft ${d.name}`}
                    onClick={() => {
                      deleteDraft(d.id)
                      void refresh()
                    }}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* tracking */}
      <section aria-labelledby="track-h">
        <h2 id="track-h" className="font-display text-xl uppercase mb-3">Quote requests</h2>
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex-1 min-w-60">
            <Input
              label="Track by reference"
              placeholder="MD-XXXXXX"
              value={refQuery}
              onChange={(e) => {
                setRefQuery(e.target.value)
                setRefError(null)
              }}
              error={refError ?? undefined}
            />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={lookup}>
              <Search className="h-4 w-4" aria-hidden /> Look up
            </Button>
          </div>
        </div>

        {decideError && <p className="text-sm text-tomato-deep font-medium mb-3" role="alert">{decideError}</p>}

        {tracked.length === 0 ? (
          <p className="text-sm text-mute">Nothing tracked yet. Submit a quote request, or look one up by reference.</p>
        ) : (
          <ul className="space-y-4">
            {tracked.map((t) => (
              <li key={t.ref} className="border-2 border-ink rounded-md bg-paper-2 shadow-hard-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display uppercase">{t.launchName}</p>
                    <p className="text-xs text-mute">
                      <span className="font-mono">{t.ref}</span> · submitted {new Date(t.submittedAt).toLocaleDateString('en-IN')}
                    </p>
                  </div>
                  <StatusChip status={t.status} />
                </div>

                {t.quotes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {t.quotes.map((q) => (
                      <div key={q.id} className="border border-ink/30 rounded-sm bg-paper p-3 text-sm">
                        <p className="font-medium">
                          Quote from {q.supplier} (revision {q.revision})
                        </p>
                        <p className="text-ink-2">
                          ₹{(q.unitCost / 100).toFixed(0)}/unit · setup ₹{(q.setupCost / 100).toFixed(0)} · min {q.minQuantity} units ·{' '}
                          {q.leadTimeDays === null ? 'lead time not stated' : `${q.leadTimeDays} days`}{' '}
                          {q.validUntil ? `· valid until ${q.validUntil}` : ''}
                        </p>
                        {q.excludes.length > 0 && <p className="text-xs text-mute">Excludes: {q.excludes.join(', ')}</p>}
                        {q.creatorDecision ? (
                          <p className="text-xs mt-1 font-medium">
                            {q.creatorDecision === 'accepted' ? '✓ You accepted this quote (your decision only)' : '✗ You declined this quote'}
                          </p>
                        ) : t.status === 'quote_ready' ? (
                          <div className="mt-2">
                            <label className="flex items-start gap-2 text-xs mb-2 bg-amber/20 border border-ink/30 rounded-sm p-2">
                              <input type="checkbox" className="h-3.5 w-3.5 mt-0.5 accent-[var(--cobalt)]" onChange={(e) => e.target.checked} id={`ack-${q.id}`} />
                              {ACK_TEXT}
                            </label>
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                className="text-xs"
                                onClick={() => {
                                  const ack = document.getElementById(`ack-${q.id}`) as HTMLInputElement | null
                                  if (!ack?.checked) {
                                    setDecideError('Tick the acknowledgement first — accepting a quote is not a production order.')
                                    return
                                  }
                                  void decide(t.ref, q.id, 'accepted')
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" aria-hidden /> Accept (requests sample)
                              </Button>
                              <Button variant="secondary" className="text-xs" onClick={() => void decide(t.ref, q.id, 'declined')}>
                                <XCircle className="h-4 w-4" aria-hidden /> Decline
                              </Button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <p className="text-xs text-mute">
                      Accepting a quote asks MerchDesk to arrange a sample. Sample approval and production
                      authorization remain separate steps — and nothing implies the supplier has accepted,
                      been paid, or guaranteed delivery.
                    </p>
                  </div>
                )}

                {t.events.length > 0 && (
                  <details className="mt-3">
                    <summary className="text-sm cursor-pointer underline underline-offset-4">History</summary>
                    <ul className="text-sm text-ink-2 space-y-1 mt-2 list-disc pl-5">
                      {t.events.map((e, i) => (
                        <li key={i}>
                          {new Date(e.at).toLocaleString('en-IN')} — {e.text}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    submitted: 'bg-paper',
    needs_info: 'bg-amber/50',
    quote_ready: 'bg-acid/50',
    closed: 'bg-ink text-paper',
  }
  const labels: Record<string, string> = {
    submitted: 'Submitted',
    needs_info: 'Needs information',
    quote_ready: 'Quote ready',
    closed: 'Closed',
  }
  return (
    <span className={`border-2 border-ink rounded-full px-3 py-1 text-xs font-bold ${map[status] ?? 'bg-paper'}`}>
      {labels[status] ?? status}
    </span>
  )
}
