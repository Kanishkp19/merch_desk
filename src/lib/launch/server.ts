import { Prisma } from '@prisma/client'
import { ApiError } from '@/lib/http/errors'
import { db } from '@/lib/db'
import { generateCreatorKey, sha256Hex } from '@/lib/http/creator'
import type { CreatorActionZ, OperatorPatchZ, SubmitLaunchZ } from '@/lib/launch/schemas'
import type { LaunchRequestStatus, QuoteRecord } from '@/lib/launch/types'

/**
 * Server-side launch-request logic, shared by the API routes. Every mutation
 * of `working`/`status` goes through optimistic concurrency (version check +
 * retry), so concurrent operator and creator updates append instead of
 * overwriting each other. Idempotent submission leans on the database unique
 * constraint on `clientRequestId`, not on a read-then-create check.
 */

export interface Working {
  events: Array<{ id: string; at: string; actor: string; type: string; text: string; statusAfter?: string }>
  quotes: Array<QuoteRecord & { decidedAt?: string }>
  /** Bound to the accepted quote revision it followed — later revisions never inherit it. */
  sampleApproved?: { at: string; approved: boolean; note?: string; quoteId: string; quoteRevision: number }
  productionAuthorized?: { at: string; quoteId: string; quoteRevision: number }
}

const MAX_WRITE_RETRIES = 5

/** MD-XXXXXX — short, uppercase, unguessable enough for a *display* reference. */
function newRef(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return 'MD-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/** Deterministic JSON so the payload hash is stable across retries. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function systemEvent(text: string, statusAfter?: LaunchRequestStatus): Working['events'][number] {
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor: 'system',
    type: 'status_change',
    text,
    ...(statusAfter ? { statusAfter } : {}),
  }
}

export interface SubmitResult {
  ref: string
  status: string
  duplicate: boolean
  submittedAt: string
  /** Shown exactly once, at first submission. Never returned for duplicates. */
  creatorKey?: string
}

/**
 * Submit a quote request. Idempotent on clientRequestId via the database
 * unique constraint: a concurrent retry either wins the insert or collides
 * and is served the original record. Reusing a key with a different payload
 * is rejected (409) rather than silently served.
 */
export async function submitLaunchRequest(input: SubmitLaunchZ): Promise<SubmitResult> {
  const payloadJson = JSON.stringify(input.payload)
  const payloadHash = await sha256Hex(stableStringify(input.payload))

  const existing = await db.launchRequest.findUnique({ where: { clientRequestId: input.clientRequestId } })
  if (existing) return resolveDuplicate(existing, payloadHash)

  const creatorKey = generateCreatorKey()
  const creatorKeyHash = await sha256Hex(creatorKey)
  const record: Prisma.LaunchRequestCreateInput = {
    id: newRef(),
    status: 'submitted',
    creatorName: input.payload.contact.name,
    creatorEmail: input.payload.contact.email,
    creatorKeyHash,
    clientRequestId: input.clientRequestId,
    payloadHash,
    payload: payloadJson,
    working: JSON.stringify({
      events: [
        systemEvent(
          'Request submitted from the MerchDesk launch workspace. No email has been sent — the founder picks this up manually.'
        ),
      ],
      quotes: [],
    } satisfies Working),
  }

  for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt++) {
    try {
      const created = await db.launchRequest.create({ data: { ...record, id: attempt === 0 ? record.id : newRef() } })
      return {
        ref: created.id,
        status: created.status,
        duplicate: false,
        submittedAt: created.createdAt.toISOString(),
        creatorKey,
      }
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const target = (err.meta?.target as string[] | undefined) ?? []
        if (target.includes('clientRequestId')) {
          // A concurrent retry of the same key won the race.
          const winner = await db.launchRequest.findUnique({ where: { clientRequestId: input.clientRequestId } })
          if (winner) return resolveDuplicate(winner, payloadHash)
          continue
        }
        // Reference collision (MD-XXXXXX already taken) — draw a new one.
        continue
      }
      throw err
    }
  }
  throw new ApiError('INTERNAL', 'Could not allocate a reference — please retry.')
}

function resolveDuplicate(
  existing: { id: string; status: string; payloadHash: string | null; createdAt: Date },
  payloadHash: string
): SubmitResult {
  if (existing.payloadHash && existing.payloadHash !== payloadHash) {
    throw new ApiError(
      'CONFLICT',
      'This idempotency key was already used for a different request. If you genuinely changed the launch, submit with a new request; otherwise reload and retry.',
      { status: 409 }
    )
  }
  return {
    ref: existing.id,
    status: existing.status,
    duplicate: true,
    submittedAt: existing.createdAt.toISOString(),
  }
}

/** Read a record for mutation, or 404 with the standard message. */
async function loadRecord(ref: string) {
  const record = await db.launchRequest.findUnique({ where: { id: ref } })
  if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
  return record
}

/**
 * Optimistic-concurrency update: re-reads, lets `mutate` build the next
 * `working`/`status`, and writes only if `version` still matches. Conflicts
 * (operator and creator writing at once) retry with the merged latest state,
 * so appended events and quote decisions are never lost.
 */
async function updateAtomically<T>(
  ref: string,
  mutate: (record: { status: string; payload: string; working: Working; version: number }) => {
    working: Working
    status?: LaunchRequestStatus
    extra?: Record<string, unknown>
    result: T
  }
): Promise<T> {
  for (let attempt = 0; attempt < MAX_WRITE_RETRIES; attempt++) {
    const record = await loadRecord(ref)
    const working = JSON.parse(record.working) as Working
    working.events ??= []
    working.quotes ??= []
    const next = mutate({ status: record.status, payload: record.payload, working, version: record.version })
    const updated = await db.launchRequest.updateMany({
      where: { id: ref, version: record.version },
      data: {
        working: JSON.stringify(next.working),
        ...(next.status && next.status !== record.status ? { status: next.status } : {}),
        ...(next.extra ?? {}),
        version: { increment: 1 },
      },
    })
    if (updated.count === 1) return next.result
  }
  throw new ApiError('CONFLICT', 'Too many concurrent updates — refresh and try again.', { status: 409 })
}

/** The quote a creator's sample/production decisions are currently bound to:
 * the most recently recorded accepted quote (quotes are append-ordered). */
function latestAcceptedQuote(working: Working): (Working['quotes'][number] & { creatorDecision: 'accepted' }) | undefined {
  type AcceptedQuote = Working['quotes'][number] & { creatorDecision: 'accepted' }
  const accepted = working.quotes.filter((q): q is AcceptedQuote => q.creatorDecision === 'accepted')
  return accepted[accepted.length - 1]
}

/** True when a recorded sample decision no longer refers to the current
 * accepted quote revision (a later revision was accepted in the meantime). */
function sampleBindingStale(working: Working): boolean {
  const quote = latestAcceptedQuote(working)
  if (!quote) return true
  return Boolean(working.sampleApproved && (working.sampleApproved.quoteId !== quote.id || working.sampleApproved.quoteRevision !== quote.revision))
}

/** Record one operator action with concurrency control. */
export async function applyOperatorPatch(ref: string, patch: OperatorPatchZ): Promise<{ ref: string; status: string }> {
  return updateAtomically(ref, ({ status, working }) => {
    let nextStatus = status as LaunchRequestStatus
    let text = ''
    let type: string = patch.type

    // A closed request only admits reopening and record-keeping notes. Every
    // other operator action would either bypass a creator gate (sample /
    // production / decision notes) or invite decisions on a dead request.
    if (status === 'closed' && patch.type !== 'status' && patch.type !== 'note') {
      throw new ApiError('CONFLICT', 'This request is closed. Reopen it before recording quotes or other activity.', { status: 409 })
    }

    switch (patch.type) {
      case 'status':
        nextStatus = patch.status
        text = patch.note?.trim() || `Status set to ${patch.status}.`
        type = 'status_change'
        break
      case 'note':
        text = patch.text
        break
      case 'info_request':
        nextStatus = 'needs_info'
        text = patch.text
        break
      case 'quote': {
        const revision = working.quotes.filter((q) => q.supplier === patch.supplier).length + 1
        working.quotes.push({
          id: crypto.randomUUID(),
          supplier: patch.supplier,
          recordedAt: new Date().toISOString(),
          currency: 'INR',
          unitCost: patch.unitCost,
          setupCost: patch.setupCost,
          minQuantity: patch.minQuantity,
          leadTimeDays: patch.leadTimeDays,
          ...(patch.validUntil ? { validUntil: patch.validUntil } : {}),
          includes: patch.includes,
          excludes: patch.excludes,
          ...(patch.evidenceNote ? { evidenceNote: patch.evidenceNote } : {}),
          revision,
        })
        nextStatus = 'quote_ready'
        text = `Quote recorded from ${patch.supplier} (revision ${revision}).`
        // A new revision for a supplier whose earlier quote was accepted must
        // not silently inherit the earlier sample approval or production
        // authorization: they were bound to the previous revision. Clear them
        // explicitly (history stays in the events log).
        const superseded = working.quotes.some(
          (q) => q.supplier === patch.supplier && q.revision < revision && q.creatorDecision === 'accepted'
        )
        if (superseded && (working.sampleApproved || working.productionAuthorized)) {
          working.sampleApproved = undefined
          working.productionAuthorized = undefined
          working.events.push(
            systemEvent(
              `Revision ${revision} of the ${patch.supplier} quote was recorded. The earlier sample decision and production authorization were bound to the previous revision and no longer apply — the revised quote must be accepted, the sample re-reviewed and production re-authorized.`
            )
          )
        }
        break
      }
      case 'creator_decision':
        text = `Creator ${patch.decision} the quote — creator's decision only; supplier acceptance, payment and production are separate.`
        break
      case 'sample_decision':
        text = patch.note?.trim() || (patch.approved ? 'Sample approved by creator.' : 'Sample rejected by creator.')
        break
      case 'production_decision':
        text = patch.note?.trim() || (patch.authorized ? 'Production authorized by creator.' : 'Production NOT authorized.')
        break
    }

    working.events.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: 'operator',
      type,
      text,
      ...(nextStatus !== status ? { statusAfter: nextStatus } : {}),
    })

    return { working, status: nextStatus, result: { ref, status: nextStatus } }
  })
}

function quoteExpired(quote: QuoteRecord): boolean {
  if (!quote.validUntil) return false
  const until = new Date(quote.validUntil)
  if (Number.isNaN(until.getTime())) return false
  // A date-only validUntil expires at the end of that local day.
  until.setHours(23, 59, 59, 999)
  return until.getTime() < Date.now()
}

/**
 * Creator actions, enforced server-side:
 *  - no creator mutation at all once a request is closed (reopening is the
 *    operator's explicit act);
 *  - quote decisions only while `quote_ready`, never on an expired quote, and
 *    the first decision on a quote is final;
 *  - sample approval requires an accepted quote and is bound to that quote
 *    revision; after a rejection a new decision supersedes it (history stays
 *    in the event log);
 *  - production authorization requires a sample decision that is approved
 *    (approved === true) AND bound to the currently accepted quote revision,
 *    plus artwork-ready lines — three distinct gates;
 *  - an info reply is accepted only while the operator is waiting for info.
 */
export async function applyCreatorAction(
  ref: string,
  action: CreatorActionZ
): Promise<{ ref: string; status: string }> {
  return updateAtomically(ref, ({ status, payload, working }) => {
    const creatorEvent = (type: string, text: string): Working['events'][number] => ({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: 'creator',
      type,
      text,
    })
    if (status === 'closed') {
      throw new ApiError('CONFLICT', 'This request is closed — decisions are no longer possible. Ask the operator to reopen it.', { status: 409 })
    }

    switch (action.type) {
      case 'quote_decision': {
        if (status !== 'quote_ready') {
          throw new ApiError('CONFLICT', 'Quotes can only be accepted or declined while the status is “Quote ready”.', { status: 409 })
        }
        const quote = working.quotes.find((q) => q.id === action.quoteId)
        if (!quote) throw new ApiError('VALIDATION', 'That quote no longer exists — refresh and try again.', { status: 404 })
        if (quote.creatorDecision) {
          throw new ApiError('CONFLICT', `You already ${quote.creatorDecision} this quote — recorded decisions stay as they are. Ask the operator for a revised quote if something changed.`, { status: 409 })
        }
        if (quoteExpired(quote)) {
          throw new ApiError('CONFLICT', 'This quote has passed its “valid until” date and can no longer be accepted — ask the operator for a revised quote.', { status: 409 })
        }
        quote.creatorDecision = action.decision
        quote.decidedAt = new Date().toISOString()
        working.events.push(
          creatorEvent(
            'creator_decision',
            `Creator ${action.decision} the quote from ${quote.supplier} (revision ${quote.revision}). This records the creator's decision only — the supplier has not accepted, nothing is paid and production is not authorized.`
          )
        )
        return { working, result: { ref, status } }
      }
      case 'sample_decision': {
        const acceptedQuote = latestAcceptedQuote(working)
        if (!acceptedQuote) {
          throw new ApiError('CONFLICT', 'Sample approval follows an accepted quote — accept a quote first.', { status: 409 })
        }
        if (working.sampleApproved && working.sampleApproved.approved && !sampleBindingStale(working)) {
          throw new ApiError('CONFLICT', 'A sample approval is already recorded for the accepted quote revision. Ask the operator for a revised quote if something changed.', { status: 409 })
        }
        // A rejected sample is not a dead end: a new decision supersedes it,
        // retaining the full history in the event log. Same for an approval
        // that has gone stale through a newly accepted quote revision.
        working.sampleApproved = {
          at: new Date().toISOString(),
          approved: action.approved,
          quoteId: acceptedQuote.id,
          quoteRevision: acceptedQuote.revision,
          ...(action.note?.trim() ? { note: action.note.trim() } : {}),
        }
        working.events.push(
          creatorEvent(
            'sample_decision',
            `Sample ${action.approved ? 'approved' : 'rejected'} by creator against quote revision ${acceptedQuote.revision} (${acceptedQuote.supplier}). Sample approval is separate from quote acceptance and from production authorization.${action.note?.trim() ? ` Note: ${action.note.trim()}` : ''}`
          )
        )
        return { working, result: { ref, status } }
      }
      case 'production_decision': {
        if (!working.sampleApproved || working.sampleApproved.approved !== true) {
          throw new ApiError('CONFLICT', 'Production authorization requires an approved sample first. A rejected or missing sample never permits production.', { status: 409 })
        }
        if (sampleBindingStale(working)) {
          throw new ApiError('CONFLICT', 'The recorded sample decision predates the currently accepted quote revision — record a fresh sample decision against the latest revision first.', { status: 409 })
        }
        if (working.productionAuthorized) {
          throw new ApiError('CONFLICT', 'Production is already authorized for this request — authorization cannot be repeated.', { status: 409 })
        }
        if (action.authorized) {
          const lines = (JSON.parse(payload) as { lines?: Array<{ artworkReady?: boolean }> }).lines ?? []
          if (lines.some((l) => !l.artworkReady)) {
            throw new ApiError('CONFLICT', 'Final artwork is not ready for every product in this request. Production cannot be authorized until artwork is complete.', { status: 409 })
          }
          working.productionAuthorized = {
            at: new Date().toISOString(),
            quoteId: working.sampleApproved.quoteId,
            quoteRevision: working.sampleApproved.quoteRevision,
          }
        }
        working.events.push(
          creatorEvent(
            'production_decision',
            `Production ${action.authorized ? 'AUTHORIZED' : 'not authorized'} by creator against quote revision ${working.sampleApproved.quoteRevision}. This is the creator's own go/no-go; it does not imply supplier acceptance or a delivery guarantee.${action.note?.trim() ? ` Note: ${action.note.trim()}` : ''}`
          )
        )
        return { working, result: { ref, status } }
      }
      case 'info_reply': {
        if (status !== 'needs_info') {
          throw new ApiError('CONFLICT', 'The operator is not waiting for information on this request right now.', { status: 409 })
        }
        working.events.push(creatorEvent('info_reply', action.text))
        return { working, status: 'submitted', result: { ref, status: 'submitted' } }
      }
    }
  })
}

/** Operator recovery: (re)issue a creator credential for a request — needed
 * for legacy records and for creators who lost their key. Returned once. */
export async function issueCreatorKey(ref: string): Promise<{ ref: string; creatorKey: string }> {
  const creatorKey = generateCreatorKey()
  const creatorKeyHash = await sha256Hex(creatorKey)
  return updateAtomically(ref, ({ working }) => {
    working.events.push({
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: 'operator',
      type: 'note',
      text: 'A creator key was issued for this request. Any previously issued key for this reference is now invalid. (Key shown once to the operator to pass on securely.)',
    })
    return {
      working,
      extra: { creatorKeyHash },
      result: { ref, creatorKey },
    }
  })
}

/** What a creator sees — never operator-only fields, never credentials. */
export function creatorView(record: {
  id: string
  status: string
  createdAt: Date
  payload: string
  working: string
}) {
  const working = JSON.parse(record.working) as Working
  const payload = JSON.parse(record.payload) as { launchName?: string; lines?: Array<{ artworkReady?: boolean }> }
  return {
    ref: record.id,
    status: record.status,
    submittedAt: record.createdAt.toISOString(),
    launchName: payload.launchName ?? '',
    allArtworkReady: (payload.lines ?? []).every((l) => l.artworkReady),
    sampleApproved: working.sampleApproved ?? null,
    productionAuthorized: working.productionAuthorized ?? null,
    events: (working.events ?? []).filter((e) => e.actor !== 'operator' || e.type === 'info_request'),
    quotes: working.quotes ?? [],
  }
}
