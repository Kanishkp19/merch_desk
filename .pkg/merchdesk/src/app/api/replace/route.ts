import { replaceBodySchema } from '@/lib/schemas/api'
import { buildCollection } from '@/lib/score/collection'
import { related } from '@/lib/qloo/client'
import { ApiError, handle, jsonOk, validationError } from '@/lib/http/errors'
import { clientIp, rateLimit } from '@/lib/http/rate-limit'
import { env } from '@/lib/env'
import type { AffinityEntity, TasteProfile } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  return handle(async () => {
    if (env().RATE_LIMIT_ENABLED) {
      const { ok, retryAfterSec } = rateLimit(`replace:${clientIp(req)}`, 10)
      if (!ok) throw new ApiError('RATE_LIMITED', `Slow down a little — try again in ${retryAfterSec} s.`, { retryAfterSec })
    }
    const body = await req.json().catch(() => null)
    const parsed = replaceBodySchema.safeParse(body)
    if (!parsed.success) throw validationError(parsed.error)

    const { input, profile, currentProductIds, rejectedProductId, excludeEntityIds, budget } = parsed.data

    // Re-query Qloo with the rejected product's driving entities EXCLUDED,
    // so the replacement is meaningfully different.
    const exclude = [...new Set([...excludeEntityIds, ...profile.seeds.entityIds])].slice(0, 30)
    let profileDelta: { brands: AffinityEntity[]; crossDomain: AffinityEntity[] } = { brands: [], crossDomain: [] }
    try {
      const [brands, cross] = await Promise.all([
        related({ type: 'brand', entityIds: profile.seeds.entityIds, tagIds: profile.seeds.tagIds.slice(0, 6), excludeEntityIds: exclude, take: 10 }),
        related({ type: profile.crossDomain[0]?.type ?? 'videogame', entityIds: profile.seeds.entityIds, tagIds: profile.seeds.tagIds.slice(0, 6), excludeEntityIds: exclude, take: 6 }),
      ])
      const toAffinity = (list: AffinityEntity[]): AffinityEntity[] =>
        list.map((e) => ({ ...e, canonicalTags: e.tags.slice(0, 5) }))
      profileDelta = { brands: toAffinity(brands as AffinityEntity[]), crossDomain: toAffinity(cross as AffinityEntity[]) }
    } catch {
      // Qloo exclusion failed — still replace from the catalog
    }

    const excludeIds = [...currentProductIds, rejectedProductId]
    const result = await buildCollection(input, { ...profile, brands: mergeBrands(profile, profileDelta.brands) }, budget, {
      excludeIds,
      replacedFrom: rejectedProductId,
      singleReplacementFor: rejectedProductId,
    })

    const product = result.products[0] ?? null
    return jsonOk({
      product,
      profileDelta,
      note: product
        ? `Replaced — related entities excluded from the taste query`
        : 'No more good matches for this budget',
    })
  })
}

function mergeBrands(profile: TasteProfile, delta: AffinityEntity[]): AffinityEntity[] {
  const known = new Set(profile.brands.map((b) => b.id))
  const merged = [...profile.brands]
  for (const b of delta) {
    if (!known.has(b.id) && b.type === 'brand') merged.push(b)
  }
  return merged.slice(0, 20)
}
