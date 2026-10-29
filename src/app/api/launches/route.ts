import { z } from 'zod'
import { handle, jsonOk, ApiError } from '@/lib/http/errors'
import { submitLaunchSchema } from '@/lib/launch/schemas'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** MD-XXXXXX — short, uppercase, unguessable enough for a pilot reference. */
function newRef(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return 'MD-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

/**
 * Submit a quote request. Idempotent on clientRequestId: a retry or accidental
 * double-submit returns the original reference instead of creating a duplicate.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json()
    const input = submitLaunchSchema.parse(body)

    const existing = await db.launchRequest.findFirst({ where: { clientRequestId: input.clientRequestId } })
    if (existing) {
      return jsonOk({ ref: existing.id, status: existing.status, duplicate: true, submittedAt: existing.createdAt.toISOString() })
    }

    const ref = newRef()
    const created = await db.launchRequest.create({
      data: {
        id: ref,
        status: 'submitted',
        creatorName: input.payload.contact.name,
        creatorEmail: input.payload.contact.email,
        clientRequestId: input.clientRequestId,
        payload: JSON.stringify(input.payload),
        working: JSON.stringify({
          events: [
            {
              id: crypto.randomUUID(),
              at: new Date().toISOString(),
              actor: 'system',
              type: 'status_change',
              text: 'Request submitted from the MerchDesk launch workspace. No email has been sent — the founder picks this up manually.',
              statusAfter: 'submitted',
            },
          ],
          quotes: [],
        }),
      },
    })
    return jsonOk({ ref: created.id, status: created.status, duplicate: false, submittedAt: created.createdAt.toISOString() })
  })
}

const refSchema = z.string().trim().min(3).max(20)

/** Look up one request by reference — what the creator's status view calls. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const ref = refSchema.parse(url.searchParams.get('ref') ?? '')
    const record = await db.launchRequest.findUnique({ where: { id: ref.toUpperCase() } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
    const working = JSON.parse(record.working) as { events: unknown[]; quotes: unknown[] }
    return jsonOk({
      ref: record.id,
      status: record.status,
      submittedAt: record.createdAt.toISOString(),
      launchName: (JSON.parse(record.payload) as { launchName: string }).launchName,
      events: (working.events ?? []).filter((e) => (e as { actor: string }).actor !== 'operator' || (e as { type: string }).type === 'info_request'),
      quotes: working.quotes ?? [],
    })
  })
}
