import { compareBodySchema } from '@/lib/schemas/api'
import { chat } from '@/lib/llm/providers'
import { COMPARE_SYSTEM, extractJson } from '@/lib/llm/prompts'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const genericSchema = z.object({
  generic: z
    .array(z.object({ name: z.string().max(60), reason: z.string().max(140) }))
    .min(1)
    .max(8),
})

/** Server LRU-ish cache per input hash — saves free quota. */
const cache = new Map<string, { at: number; value: { name: string; reason: string }[]; provider: string }>()
const TTL = 15 * 60 * 1000
const CACHE_MAX = 100

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return String(h)
}

function cacheSet(key: string, value: { name: string; reason: string }[], provider: string) {
  // drop expired entries, then oldest, so the cache cannot grow unbounded
  const now = Date.now()
  for (const [k, v] of cache) {
    if (now - v.at > TTL || cache.size >= CACHE_MAX) cache.delete(k)
  }
  cache.set(key, { at: now, value, provider })
}

export async function POST(req: Request) {
  return handle(async () => {
    if (env().RATE_LIMIT_ENABLED) {
      const { ok, retryAfterSec } = rateLimit(`compare:${clientIp(req)}`, 5)
      if (!ok) throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }
    const body = await req.json().catch(() => null)
    const parsed = compareBodySchema.safeParse(body)
    if (!parsed.success) throw validationError(parsed.error)

    const { input, count } = parsed.data
    // count affects the answer — it belongs in the cache key
    const key = hash(`${input.text}|${input.creatorType}|${count}`)

    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < TTL) {
      return jsonOk({ generic: cached.value, provider: cached.provider, cached: true })
    }

    const res = await chat({
      messages: [
        { role: 'system', content: COMPARE_SYSTEM },
        {
          role: 'user',
          content: `A ${input.creatorType} says: "${input.text}". Suggest ${count} merch products. Reason from general merchandising best practice — you have no audience data.`,
        },
      ],
      json: true,
      temperature: 0.9,
      maxTokens: 700,
    })

    const parsedGeneric = genericSchema.parse(extractJson(res.text))
    const generic = parsedGeneric.generic.slice(0, count)
    cacheSet(key, generic, res.provider)

    return jsonOk({ generic, provider: res.provider })
  })
}
