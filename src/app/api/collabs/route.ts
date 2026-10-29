import { collabsBodySchema } from '@/lib/schemas/api'
import { indiaVenueIdeas } from '@/lib/partners/india'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  return handle(async () => {
    if (env().RATE_LIMIT_ENABLED) {
      const { ok, retryAfterSec } = rateLimit(`collabs:${clientIp(req)}`, 10)
      if (!ok) throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }
    const body = await req.json().catch(() => null)
    const parsed = collabsBodySchema.safeParse(body)
    if (!parsed.success) throw validationError(parsed.error)
    const { profile, city, productIds } = parsed.data
    const collabs = indiaVenueIdeas(city, profile, productIds)
    return jsonOk({
      collabs,
      cityNote: collabs.length
        ? `Curated ${city} venue ideas matched to your stated interests. Locations are sourced; partnerships and audience overlap are unverified.`
        : `No strong venue match for these interests in ${city} yet. Add specific interests to your brief and rebuild.`,
    })
  })
}
