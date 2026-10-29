import { searchQuerySchema } from '@/lib/schemas/api'
import { searchEntities, searchTags } from '@/lib/qloo/client'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  return handle(async () => {
    if (env().RATE_LIMIT_ENABLED) {
      const { ok, retryAfterSec } = rateLimit(`search:${clientIp(req)}`, 60)
      if (!ok) throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }

    const url = new URL(req.url)
    const parsed = searchQuerySchema.safeParse({
      q: url.searchParams.get('q') ?? '',
      kind: url.searchParams.get('kind') ?? undefined,
      type: url.searchParams.get('type') ?? undefined,
    })
    if (!parsed.success) throw validationError(parsed.error)
    const { q, kind, type } = parsed.data

    if (kind === 'tag') {
      const tags = await searchTags(q, 5)
      return jsonOk({
        results: tags.map((t) => ({ id: t.id, name: t.name, type: 'tag', hint: 'taste tag' })),
      })
    }

    const entities = await searchEntities(q, { type, take: 5 })
    return jsonOk({
      results: entities.map((e) => ({
        id: e.id,
        name: e.name,
        type: e.type,
        ...(e.imageUrl ? { imageUrl: e.imageUrl } : {}),
        hint: e.type,
      })),
    })
  })
}
