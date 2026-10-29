import { imageBodySchema } from '@/lib/schemas/api'
import { moderate } from '@/lib/image/moderation'
import { buildImagePrompt } from '@/lib/image/prompt'
import { generateImage } from '@/lib/image/provider'
import { CATALOG } from '@/lib/score/collection'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'
import { imageSession, reserveImage } from '@/lib/image/quota'
import { maxImagesPerSession } from '@/lib/env'
import { createHash } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * THE APPROVAL GATE (PRD F4):
 * rejects unless approved === true (zod literal) and the approved description
 * is non-empty. No other code path may call the image provider.
 */
export async function POST(req: Request) {
  const session = imageSession(req)
  const response = await handle(async () => {
    if (env().RATE_LIMIT_ENABLED) {
      const { ok, retryAfterSec } = rateLimit(`image:${clientIp(req)}`, 6)
      if (!ok) throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }

    const body = await req.json().catch(() => null)
    const parsed = imageBodySchema.safeParse(body)
    if (!parsed.success) {
      // approved must be literal true — anything else is a validation failure
      const raw = body as { approved?: unknown } | null
      if (raw && raw.approved !== true) {
        throw new ApiError('VALIDATION', 'Images are only generated after you approve the description.', {
          field: 'approved',
          status: 422,
        })
      }
      throw validationError(parsed.error)
    }

    const { productId, approvedDescription, paletteId, attempt, artistName, brandNames } = parsed.data
    const item = CATALOG.find((c) => c.id === productId)
    if (!item) throw new ApiError('VALIDATION', 'Unknown product.', { field: 'productId' })

    // moderation: strip artist + brand names + trademarks; reject unsafe terms
    const { sanitized, stripped } = moderate({ description: approvedDescription, artistName, brandNames })

    const prompt = buildImagePrompt({
      category: item.category,
      noun: item.noun,
      sanitizedDescription: sanitized,
      paletteId,
      attempt,
    })

    const key = createHash('sha256').update(`${productId}:${approvedDescription}:${attempt}`).digest('hex')
    const release = reserveImage(session.id, key, productId, maxImagesPerSession())
    let image: Awaited<ReturnType<typeof generateImage>>
    try {
      image = await generateImage(prompt)
    } finally {
      release()
    }
    return jsonOk({
      imageDataUrl: image.dataUrl,
      model: image.model,
      attempt,
      ...(stripped.length > 0 ? { moderationNote: `Removed from prompt: ${[...new Set(stripped)].join(', ')}` } : {}),
    })
  })
  if (session.cookie) response.headers.set('Set-Cookie', session.cookie)
  return response
}
