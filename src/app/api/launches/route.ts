import { z } from 'zod'
import { handle, jsonOk, ApiError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { requireCreator } from '@/lib/http/creator'
import { submitLaunchSchema } from '@/lib/launch/schemas'
import { submitLaunchRequest, creatorView } from '@/lib/launch/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Submit a quote request. Idempotent on clientRequestId (database unique
 * constraint); the first response carries the creator key exactly once —
 * it is never sent again and never stored in plain text.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const { ok, retryAfterSec } = rateLimit(`launches_submit:${clientIp(req)}`, 5)
    if (!ok) throw new ApiError('RATE_LIMITED', 'Too many submissions from this address — wait a minute and try again.', { retryAfterSec })

    const input = submitLaunchSchema.parse(await req.json())
    return jsonOk(await submitLaunchRequest(input))
  })
}

const refSchema = z.string().trim().min(3).max(20)

/**
 * Look up one request by reference. Requires the creator key header — the
 * reference alone is a display identifier and grants nothing. Legacy records
 * (created before keys) return 403 with recovery instructions.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const { ok, retryAfterSec } = rateLimit(`launches_lookup:${clientIp(req)}`, 30)
    if (!ok) throw new ApiError('RATE_LIMITED', 'Too many lookups from this address — wait a minute and try again.', { retryAfterSec })

    const url = new URL(req.url)
    const ref = refSchema.parse(url.searchParams.get('ref') ?? '')
    const record = await db.launchRequest.findUnique({ where: { id: ref.toUpperCase() } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
    await requireCreator(req, record)
    return jsonOk(creatorView(record))
  })
}
