import { describeBodySchema } from '@/lib/schemas/api'
import { tweakDescription } from '@/lib/score/describe'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  return handle(async () => {
    if (env().RATE_LIMIT_ENABLED) {
      const { ok, retryAfterSec } = rateLimit(`describe:${clientIp(req)}`, 20)
      if (!ok) throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }
    const body = await req.json().catch(() => null)
    const parsed = describeBodySchema.safeParse(body)
    if (!parsed.success) throw validationError(parsed.error)

    const { currentDescription, instruction, paletteId, profileTags } = parsed.data
    const result = await tweakDescription({
      current: currentDescription,
      instruction,
      paletteId,
      profileTags,
    })
    return jsonOk({ description: result.text, source: result.source })
  })
}
