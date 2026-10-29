import { collabsBodySchema } from '@/lib/schemas/api'
import { related, isFixturesMode } from '@/lib/qloo/client'
import { chat } from '@/lib/llm/providers'
import { COLLAB_SYSTEM, extractJson } from '@/lib/llm/prompts'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'
import type { CollabSuggestion } from '@/types'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ideasSchema = z.object({
  ideas: z.array(z.object({ name: z.string(), idea: z.string().max(160) })).max(10),
})

const TYPE_ICON_LABEL: Record<string, string> = {
  'craft brewery': 'brewery',
  'coffee shop': 'café',
  'café': 'café',
  'coffee roaster': 'roaster',
  'record shop': 'record shop',
  'vintage store': 'vintage shop',
  'thrift store': 'thrift shop',
  'arcade bar': 'arcade bar',
  'gaming café': 'gaming café',
  'bookshop café': 'bookshop café',
  'specialty shop': 'specialty shop',
  'venue': 'venue',
  'bar + venue': 'venue',
  'dive bar': 'dive bar',
  'metal bar': 'metal bar',
  'club': 'club',
  'cocktail bar': 'cocktail bar',
  'arcade': 'arcade',
  'gift shop': 'gift shop',
  'diner': 'diner',
  'restaurant': 'restaurant',
  'wine bar': 'wine bar',
  'outdoor shop': 'outdoor shop',
  'lodge bar': 'lodge bar',
}

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

    // Qloo places (and brands) filtered by the user's city
    const [places, brands] = await Promise.all([
      related({
        type: 'place',
        entityIds: profile.seeds.entityIds,
        tagIds: profile.seeds.tagIds.slice(0, 6),
        location: city,
        take: 8,
      }),
      related({
        type: 'brand',
        entityIds: profile.seeds.entityIds,
        tagIds: profile.seeds.tagIds.slice(0, 6),
        take: 6,
      }),
    ])

    const pool = [...places, ...brands].slice(0, 8)
    if (pool.length === 0) {
      return jsonOk({ collabs: [], cityNote: `Few matches in ${city}.` })
    }

    // one-line partner ideas — LLM restricted to supplied data, template fallback
    const ideas = new Map<string, string>()
    try {
      const res = await chat({
        messages: [
          { role: 'system', content: COLLAB_SYSTEM },
          {
            role: 'user',
            content: `Creator type: ${profile.notes.length ? '' : ''}merch line. City: ${city}.
Places/brands the audience already likes (use ONLY these):
${pool.map((p) => `- ${p.name} (${p.location ?? p.type}${p.tags.length ? `, tags: ${p.tags.slice(0, 3).join('/')}` : ''})`).join('\n')}

Linked product types: ${productIds.length ? productIds.join(', ') : 'general merch'}`,
          },
        ],
        json: true,
        temperature: 0.7,
        maxTokens: 500,
      })
      const parsedIdeas = ideasSchema.parse(extractJson(res.text))
      for (const i of parsedIdeas.ideas) ideas.set(i.name.toLowerCase(), i.idea)
    } catch {
      // template fallback below
    }

    const collabs: CollabSuggestion[] = pool.slice(0, 6).map((p) => {
      const area = p.location?.split('·')[0]?.trim() ?? TYPE_ICON_LABEL[p.location ?? ''] ?? (p.type === 'brand' ? 'brand' : 'place')
      const linked = linkProduct(productIds, p.tags)
      return {
        id: p.id,
        name: p.name,
        type: p.type === 'brand' ? 'brand' : 'place',
        area,
        tags: p.tags.slice(0, 2),
        partnerIdea:
          ideas.get(p.name.toLowerCase()) ??
          `Co-release with ${p.name} — their crowd already leans toward ${p.tags[0]?.replace(/-/g, ' ') ?? 'your sound'}.`,
        linkedProductIds: linked ? [linked] : [],
      }
    })

    const cityNote = isFixturesMode() ? `Sample partner data near ${city} — not Qloo output` : undefined
    return jsonOk({ collabs, ...(cityNote ? { cityNote } : {}) })
  })
}

function linkProduct(productIds: string[], tags: string[]): string | null {
  for (const tag of tags) {
    if (tag.includes('beer') && productIds.includes('beer-label-collab')) return 'beer-label-collab'
    if (tag.includes('coffee') && productIds.includes('coffee-collab')) return 'coffee-collab'
    if ((tag.includes('food') || tag.includes('hot')) && productIds.includes('hot-sauce-collab')) return 'hot-sauce-collab'
    if (tag.includes('vinyl') && productIds.includes('cassette-usb')) return 'cassette-usb'
    if ((tag.includes('zine') || tag.includes('book')) && productIds.includes('zine')) return 'zine'
  }
  return null
}
