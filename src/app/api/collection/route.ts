import { collectionBodySchema } from '@/lib/schemas/api'
import { buildCollection } from '@/lib/score/collection'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  return handle(async () => {
    if (env().RATE_LIMIT_ENABLED) {
      const { ok, retryAfterSec } = rateLimit(`collection:${clientIp(req)}`, 10)
      if (!ok) throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }
    const body = await req.json().catch(() => null)
    const parsed = collectionBodySchema.safeParse(body)
    if (!parsed.success) throw validationError(parsed.error)

    const { input, profile } = parsed.data
    const result = await buildCollection(input, profile, input.budget)
    return jsonOk(result)
  })
}
