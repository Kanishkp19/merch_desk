import { z } from 'zod'
import { handle, jsonOk, ApiError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { operatorPatchSchema } from '@/lib/launch/schemas'
import { applyOperatorPatch, issueCreatorKey } from '@/lib/launch/server'
import { db } from '@/lib/db'
import { requireOperator } from '@/lib/http/operator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return handle(async () => {
    requireOperator(req)
    const { ref } = await ctx.params
    const record = await db.launchRequest.findUnique({ where: { id: ref.toUpperCase() } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
    return jsonOk({
      ref: record.id,
      status: record.status,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      hasCreatorKey: record.creatorKeyHash !== null,
      payload: JSON.parse(record.payload),
      working: JSON.parse(record.working),
    })
  })
}

/** Record one operator action: status change, note, info request, or a quote
 * (revisions stay distinguishable — each gets an incrementing revision number).
 * Writes go through the version-checked update, so they never clobber a
 * concurrent creator action. */
export async function PATCH(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return handle(async () => {
    requireOperator(req)
    const { ref: rawRef } = await ctx.params
    const ref = (z.string().trim().min(3).max(20).parse(rawRef)).toUpperCase()
    const patch = operatorPatchSchema.parse(await req.json())
    return jsonOk(await applyOperatorPatch(ref, patch))
  })
}

/** Recovery endpoint: issue (or re-issue) the creator credential for a request.
 * The plaintext key is returned exactly once, over the operator's
 * authenticated connection — the reference alone never regains access. */
export async function POST(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return handle(async () => {
    requireOperator(req)
    const { ok, retryAfterSec } = rateLimit(`creator_key_issue:${clientIp(req)}`, 10)
    if (!ok) throw new ApiError('RATE_LIMITED', 'Too many key issues — wait a minute.', { retryAfterSec })

    const { ref: rawRef } = await ctx.params
    const ref = (z.string().trim().min(3).max(20).parse(rawRef)).toUpperCase()
    const record = await db.launchRequest.findUnique({ where: { id: ref } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })
    return jsonOk(await issueCreatorKey(ref))
  })
}
