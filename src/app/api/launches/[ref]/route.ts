import { z } from 'zod'
import { handle, jsonOk, ApiError } from '@/lib/http/errors'
import { creatorActionSchema } from '@/lib/launch/schemas'
import { db } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Working {
  events: Array<{ id: string; at: string; actor: string; type: string; text: string; statusAfter?: string }>
  quotes: Array<Record<string, unknown>>
}

/** Creator actions on their own request. Quote acceptance is a creator decision
 * only — it never implies supplier acceptance, payment, production or delivery. */
export async function POST(req: Request) {
  return handle(async () => {
    const url = new URL(req.url)
    const ref = (z.string().trim().min(3).max(20).parse(url.searchParams.get('ref') ?? '')).toUpperCase()
    const action = creatorActionSchema.parse(await req.json())

    const record = await db.launchRequest.findUnique({ where: { id: ref } })
    if (!record) throw new ApiError('VALIDATION', 'No request found with that reference.', { status: 404 })

    const working = JSON.parse(record.working) as Working
    if (action.type === 'quote_decision') {
      const quote = working.quotes.find((q) => q.id === action.quoteId)
      if (!quote) throw new ApiError('VALIDATION', 'That quote no longer exists — refresh and try again.', { status: 404 })
      quote.creatorDecision = action.decision
      working.events.push({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        actor: 'creator',
        type: 'creator_decision',
        text: `Creator ${action.decision} the quote from ${String(quote.supplier)}. This records the creator's decision only — the supplier has not accepted, nothing is paid and production is not authorized.`,
      })
    }

    const updated = await db.launchRequest.update({
      where: { id: ref },
      data: { working: JSON.stringify(working) },
    })
    return jsonOk({ ref: updated.id, status: updated.status })
  })
}
