'use client'

import React, { useEffect, useState } from 'react'
import { CheckCircle2, ChevronRight, KeyRound, Search, Trash2, XCircle } from 'lucide-react'
import type { CreatorRequestView, LaunchPlan } from '@/lib/launch/types'
import { loadDrafts, deleteDraft } from '@/lib/launch/plan'
import { apiJson, ApiClientError } from '@/lib/api-client'
import { CREATOR_SAMPLE_ACK, CREATOR_PRODUCTION_ACK } from '@/lib/launch/schemas'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Input'
import { Sticker } from '@/components/ui/Sticker'
import { useAppNavigate } from '@/lib/navigate'
import { views } from '@/lib/routes'

const TRACKED_KEY = 'merchdesk:trackedRefs'
const CREATOR_KEYS = 'merchdesk:creatorKeys'

const ACK_TEXT =
  'I understand this does not commit the supplier, start production, or guarantee delivery'

type TrackedRequest = CreatorRequestView

interface TrackedEntry {
  ref: string
  data?: TrackedRequest
  error?: { message: string; status: number; code: string }
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

/** Creator credentials, per device: { ref: key }. Also collected from drafts'
 * submission records, which carry the key from the submitting session. */
function loadCreatorKeys(): Record<string, string> {
  try {
    const stored = JSON.parse(localStorage.getItem(CREATOR_KEYS) ?? '{}') as Record<string, string>
    for (const d of loadDrafts()) {
      if (d.submission?.creatorKey && !stored[d.submission.ref]) {
        stored[d.submission.ref] = d.submission.creatorKey
      }
    }
    return stored
  } catch {
    return {}
  }
}

function saveCreatorKey(ref: string, key: string) {
  try {
    const map = loadCreatorKeys()
    map[ref] = key
    localStorage.setItem(CREATOR_KEYS, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

export function LaunchesView() {
  const navigate = useAppNavigate()
  const [drafts, setDrafts] = useState<LaunchPlan[]>([])
  const [tracked, setTracked] = useState<TrackedEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refQuery, setRefQuery] = useState('')
  const [pasteKey, setPasteKey] = useState('')
  const [refError, setRefError] = useState<string | null>(null)
  const [decideError, setDecideError] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({})

  const keys = loadCreatorKeys()

  const refresh = async () => {
    setDrafts(loadDrafts())
    const refs = loadTracked()
    const keyMap = loadCreatorKeys()
    const entries = await Promise.all(
      refs.map(async (ref): Promise<TrackedEntry> => {
        const key = keyMap[ref]
        if (!key) {
          return {
            ref,
            error: {
              status: 0,
              code: 'NO_KEY',
              message:
                'No creator key saved on this device for this reference. Paste the key you saved at submission below, or ask the operator to re-issue it.',
            },
          }
        }
        try {
          const data = await apiJson<TrackedRequest>(`/api/launches?ref=${encodeURIComponent(ref)}`, {
            headers: { 'x-creator-key': key },
          })
          return { ref, data }
        } catch (err) {
          const e = err instanceof ApiClientError ? err : null
          return {
            ref,
            error: {
              message: e?.message ?? 'Could not load this request.',
              status: e?.status ?? 500,
              code: e?.code ?? 'INTERNAL',
            },
          }
        }
      })
    )
    setTracked(entries)
    setLoading(false)
  }

  useEffect(() => {
    let alive = true
    void (async () => {
      const drafts = loadDrafts()
      const refs = Array.from(new Set([...loadTracked(), ...drafts.filter((d) => d.submission).map((d) => d.submission!.ref)]))
      saveTracked(refs)
      if (!alive) return
      setDrafts(drafts)
      await refresh()
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
    if (pasteKey.trim()) {
      saveCreatorKey(ref, pasteKey.trim())
      setPasteKey('')
    }
    if (!loadCreatorKeys()[ref]) {
      setRefError('This device has no creator key for that reference — paste the key you saved at submission first')
      return
    }
    const refs = loadTracked()
    if (!refs.includes(ref)) {
      refs.unshift(ref)
      saveTracked(refs)
    }
    setRefQuery('')
    await refresh()
  }

  const decide = async (ref: string, body: Record<string, unknown>) => {
    setDecideError(null)
    try {
      await apiJson(`/api/launches/${encodeURIComponent(ref)}`, {
        method: 'POST',
        headers: { 'x-creator-key': loadCreatorKeys()[ref] ?? '' },
        body: JSON.stringify(body),
      })
      await refresh()
    } catch (err) {
      setDecideError(err instanceof Error ? err.message : 'Could not record the decision')
    }
  }

  const sendReply = async (ref: string) => {
    const text = (replyDraft[ref] ?? '').trim()
    if (!text) {
      setDecideError('Write an answer before sending')
      return
    }
    await decide(ref, { type: 'info_reply', text })
    setReplyDraft((r) => ({ ...r, [ref]: '' }))
  }

  return (
    <main id="main" className="mx-auto w-full max-w-4xl px-4 md:px-6 py-10">
      <Sticker className="mb-3">Your workspace</Sticker>
      <h1 className="font-display text-4xl uppercase mb-3">My launches</h1>
      <p className="text-ink-2 mb-8 max-w-xl">
        Drafts live on this device only. Submitted quote requests live on the server under their
        reference, protected by your creator key — save that key when you submit; the reference alone
        does not open a request.
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
        <div className="grid md:grid-cols-2 gap-3 mb-4 items-end">
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
          <Input
            label="Creator key (only when this device has none saved)"
            placeholder="mdk_…"
            type="password"
            optional
            value={pasteKey}
            onChange={(e) => setPasteKey(e.target.value)}
          />
          <div>
            <Button variant="secondary" onClick={() => void lookup()}>
              <Search className="h-4 w-4" aria-hidden /> Look up
            </Button>
          </div>
        </div>

        {decideError && <p className="text-sm text-tomato-deep font-medium mb-3" role="alert">{decideError}</p>}

        {loading ? (
          <p className="text-sm text-mute" role="status">Loading your requests…</p>
        ) : tracked.length === 0 ? (
          <p className="text-sm text-mute">Nothing tracked yet. Submit a quote request, or look one up by reference and creator key.</p>
        ) : (
          <ul className="space-y-4">
            {tracked.map((entry) => (
              <TrackedCard
                key={entry.ref}
                entry={entry}
                replyDraft={replyDraft[entry.ref] ?? ''}
                onReplyChange={(text) => setReplyDraft((r) => ({ ...r, [entry.ref]: text }))}
                onSendReply={() => void sendReply(entry.ref)}
                onDecide={(body, ackOk) => {
                  if (!ackOk) {
                    setDecideError('Tick the acknowledgement first — these decisions are recorded as final.')
                    return
                  }
                  void decide(entry.ref, body)
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

function TrackedCard({
  entry,
  replyDraft,
  onReplyChange,
  onSendReply,
  onDecide,
}: {
  entry: TrackedEntry
  replyDraft: string
  onReplyChange: (text: string) => void
  onSendReply: () => void
  onDecide: (body: Record<string, unknown>, ackOk: boolean) => void
}) {
  const { ref } = entry
  if (entry.error || !entry.data) {
    const err = entry.error
    return (
      <li className="border-2 border-dashed border-ink rounded-md bg-amber/20 p-4">
        <p className="font-display uppercase">
          <KeyRound className="inline h-4 w-4 mr-2 -mt-1" aria-hidden />
          <span className="font-mono">{ref}</span> — not loaded
        </p>
        <p className="text-sm text-ink-2 mt-1">{err?.message ?? 'Could not load this request.'}</p>
      </li>
    )
  }

  const t = entry.data
  const acceptedQuote = t.quotes.some((q) => q.creatorDecision === 'accepted')
  // The quote revision the creator's decisions are currently bound to: the most
  // recently recorded accepted quote.
  const latestAccepted = [...t.quotes].reverse().find((q) => q.creatorDecision === 'accepted')
  const sampleBindingCurrent =
    Boolean(t.sampleApproved && latestAccepted && t.sampleApproved.quoteId === latestAccepted.id)
  const closed = t.status === 'closed'

  return (
    <li className="border-2 border-ink rounded-md bg-paper-2 shadow-hard-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-display uppercase">{t.launchName}</p>
          <p className="text-xs text-mute">
            <span className="font-mono">{t.ref}</span> · submitted {new Date(t.submittedAt).toLocaleDateString('en-IN')}
          </p>
        </div>
        <StatusChip status={t.status} />
      </div>

      {closed && (
        <p className="text-xs mt-2 bg-ink text-paper rounded-sm px-2 py-1.5 inline-block">
          This request is closed — no further decisions are possible. Ask the operator to reopen it if that is a mistake.
        </p>
      )}

      {/* creator answer to an operator info request */}
      {t.status === 'needs_info' && (
        <div className="mt-3 border-2 border-ink rounded-sm bg-amber/20 p-3">
          <p className="text-sm font-bold mb-2">The operator asked you for information — answer below:</p>
          {t.events
            .filter((e) => e.at && e.text)
            .slice(-2)
            .map((e, i) => (
              <p key={i} className="text-sm text-ink-2 mb-2">{e.text}</p>
            ))}
          <Textarea
            label="Your answer"
            value={replyDraft}
            onChange={(e) => onReplyChange(e.target.value)}
            maxLength={2000}
            counter
          />
          <Button variant="primary" className="text-xs mt-2" onClick={onSendReply}>
            Send answer
          </Button>
        </div>
      )}

      {t.quotes.length > 0 && (
        <div className="mt-3 space-y-2">
          {t.quotes.map((q) => (
            <QuoteCard key={q.id} quote={q} decidable={t.status === 'quote_ready'} onDecide={onDecide} />
          ))}
          <p className="text-xs text-mute">
            Accepting a quote records your decision only. Sample approval and production
            authorization are separate steps below — and nothing implies the supplier has accepted,
            been paid, or guaranteed delivery.
          </p>
        </div>
      )}

      {/* separate gate 2: sample approval — shown again after a rejection or a
          newer accepted quote revision, so there is always a way forward */}
      {!closed && acceptedQuote && (!t.sampleApproved || !t.sampleApproved.approved || !sampleBindingCurrent) && (
        <DecisionGate
          title="Step 2 — Sample review"
          description={
            t.sampleApproved?.approved === false
              ? 'The previous sample was rejected. Once a revised sample (or revised quote) is in hand, record your new decision here — the earlier decision stays in the history.'
              : !t.sampleApproved || !sampleBindingCurrent
                ? 'After your quote acceptance, a sample can be arranged. Record your sample decision once you have the sample in hand.'
                : ''
          }
          ackText={CREATOR_SAMPLE_ACK}
          primaryLabel="I approve this sample"
          secondaryLabel="Sample rejected"
          onDecide={onDecide}
          buildBody={(note) => ({ type: 'sample_decision', approved: true, note })}
          buildSecondaryBody={(note) => ({ type: 'sample_decision', approved: false, note })}
        />
      )}
      {t.sampleApproved && (
        <p className="text-xs mt-3 font-medium">
          ✓ Sample decision recorded ({t.sampleApproved.approved ? 'approved' : 'rejected'}{t.sampleApproved.quoteRevision ? `, against quote revision ${t.sampleApproved.quoteRevision}` : ''}){t.sampleApproved.note ? ` — ${t.sampleApproved.note}` : ''}
          {!closed && t.sampleApproved.approved && !sampleBindingCurrent ? ' — superseded by a newer accepted quote revision; record a fresh sample decision above.' : ''}
        </p>
      )}

      {/* separate gate 3: production authorization — a rejected or missing
          sample never permits production */}
      {!closed && t.sampleApproved?.approved === true && sampleBindingCurrent && !t.productionAuthorized && (
        <DecisionGate
          title="Step 3 — Production authorization"
          description="A separate, explicit go/no-go. Nothing is manufactured until you authorize it here."
          ackText={CREATOR_PRODUCTION_ACK}
          primaryLabel="Authorize production"
          secondaryLabel="Not authorizing"
          disabledReason={t.allArtworkReady ? undefined : 'Final artwork is not ready for every product — production cannot be authorized until it is.'}
          onDecide={onDecide}
          buildBody={(note) => ({ type: 'production_decision', authorized: true, note })}
          buildSecondaryBody={(note) => ({ type: 'production_decision', authorized: false, note })}
        />
      )}
      {t.productionAuthorized && (
        <p className="text-xs mt-3 font-medium">✓ Production authorized by you ({new Date(t.productionAuthorized.at).toLocaleDateString('en-IN')}{t.productionAuthorized.quoteRevision ? `, against quote revision ${t.productionAuthorized.quoteRevision}` : ''}) — spending starts; delivery is still not guaranteed by MerchDesk.</p>
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
  )
}

function QuoteCard({
  quote,
  decidable,
  onDecide,
}: {
  quote: TrackedRequest['quotes'][number]
  decidable: boolean
  onDecide: (body: Record<string, unknown>, ackOk: boolean) => void
}) {
  const [ack, setAck] = useState(false)
  const expired =
    quote.validUntil !== undefined && new Date(quote.validUntil + 'T23:59:59') .getTime() < Date.now()
  return (
    <div className="border border-ink/30 rounded-sm bg-paper p-3 text-sm">
      <p className="font-medium">
        Quote from {quote.supplier} (revision {quote.revision})
      </p>
      <p className="text-ink-2">
        ₹{(quote.unitCost / 100).toFixed(0)}/unit · setup ₹{(quote.setupCost / 100).toFixed(0)} · min {quote.minQuantity} units ·{' '}
        {quote.leadTimeDays === null ? 'lead time not stated' : `${quote.leadTimeDays} days`}{' '}
        {quote.validUntil ? `· valid until ${quote.validUntil}` : ''}
      </p>
      {quote.excludes.length > 0 && <p className="text-xs text-mute">Excludes: {quote.excludes.join(', ')}</p>}
      {quote.creatorDecision ? (
        <p className="text-xs mt-1 font-medium">
          {quote.creatorDecision === 'accepted' ? '✓ You accepted this quote (your decision only)' : '✗ You declined this quote'}
        </p>
      ) : decidable && !expired ? (
        <div className="mt-2">
          <label className="flex items-start gap-2 text-xs mb-2 bg-amber/20 border border-ink/30 rounded-sm p-2" htmlFor={`ack-${quote.id}`}>
            <input
              type="checkbox"
              className="h-3.5 w-3.5 mt-0.5 accent-[var(--cobalt)]"
              checked={ack}
              onChange={(e) => setAck(e.target.checked)}
              id={`ack-${quote.id}`}
            />
            {ACK_TEXT}
          </label>
          <div className="flex gap-2">
            <Button variant="primary" className="text-xs" onClick={() => onDecide({ type: 'quote_decision', quoteId: quote.id, decision: 'accepted', ackText: ACK_TEXT }, ack)}>
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Accept (requests sample)
            </Button>
            <Button variant="secondary" className="text-xs" onClick={() => onDecide({ type: 'quote_decision', quoteId: quote.id, decision: 'declined', ackText: ACK_TEXT }, ack)}>
              <XCircle className="h-4 w-4" aria-hidden /> Decline
            </Button>
          </div>
        </div>
      ) : expired ? (
        <p className="text-xs mt-1 text-tomato-deep font-medium">This quote passed its “valid until” date — ask the operator for a revised quote.</p>
      ) : null}
    </div>
  )
}

function DecisionGate({
  title,
  description,
  ackText,
  primaryLabel,
  secondaryLabel,
  disabledReason,
  onDecide,
  buildBody,
  buildSecondaryBody,
}: {
  title: string
  description: string
  ackText: string
  primaryLabel: string
  secondaryLabel: string
  disabledReason?: string
  onDecide: (body: Record<string, unknown>, ackOk: boolean) => void
  buildBody: (note?: string) => Record<string, unknown>
  buildSecondaryBody: (note?: string) => Record<string, unknown>
}) {
  const [ack, setAck] = useState(false)
  const [note, setNote] = useState('')
  return (
    <div className="mt-3 border-2 border-ink rounded-sm bg-paper p-3">
      <p className="text-sm font-bold">{title}</p>
      <p className="text-sm text-ink-2 mt-1">{description}</p>
      <Textarea label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} optional />
      <label className="flex items-start gap-2 text-xs mb-2 bg-amber/20 border border-ink/30 rounded-sm p-2 mt-1" htmlFor={`gate-ack-${title}`}>
        <input
          type="checkbox"
          className="h-3.5 w-3.5 mt-0.5 accent-[var(--cobalt)]"
          checked={ack}
          onChange={(e) => setAck(e.target.checked)}
          id={`gate-ack-${title}`}
        />
        {ackText}
      </label>
      {disabledReason && <p className="text-xs text-tomato-deep font-medium mb-2" role="note">{disabledReason}</p>}
      <div className="flex gap-2">
        <Button
          variant="primary"
          className="text-xs"
          disabled={Boolean(disabledReason)}
          onClick={() => onDecide(buildBody(note.trim() || undefined), ack)}
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden /> {primaryLabel}
        </Button>
        <Button variant="secondary" className="text-xs" onClick={() => onDecide(buildSecondaryBody(note.trim() || undefined), ack)}>
          <XCircle className="h-4 w-4" aria-hidden /> {secondaryLabel}
        </Button>
      </div>
    </div>
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
