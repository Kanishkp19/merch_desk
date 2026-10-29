import { z } from 'zod'
import { handle, jsonOk, ApiError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { requireCreator } from '@/lib/http/creator'
import { creatorActionSchema } from '@/lib/launch/schemas'
import { applyCreatorAction } from '@/lib/launch/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Creator actions on their own request. Quote acceptance is a creator decision
 * only — it never implies supplier acceptance, payment, production or delivery.
 * Requires the creator key header; decision rules are enforced server-side
 * (status gates, quote expiry, one final decision per quote, sample/production
 * ordering) — see applyCreatorAction. */
export async function POST(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return handle(async () => {
    const { ok, retryAfterSec } = rateLimit(`launches_decide:${clientIp(req)}`, 10)
    if (!ok) throw new ApiError('RATE_LIMITED', 'Too many actions from this address — wait a minute and try again.', { retryAfterSec })

    const { ref: rawRef } = await ctx.params
    const ref = (z.string().trim().min(3).max(20).parse(rawRef)).toUpperCase()
    const action = creatorActionSchema.parse(await req.json())

    const record = await db.launchRequest.findUnique({ where: { id: ref } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
    await requireCreator(req, record)

    return jsonOk(await applyCreatorAction(ref, action))
  })
}
