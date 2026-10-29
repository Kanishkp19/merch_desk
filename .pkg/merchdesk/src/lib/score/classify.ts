import type { AffinityEntity, PriceTier } from '@/types'
import brandTiers from '@/data/brand-tiers.json'
import { chat } from '@/lib/llm/providers'
import { CLASSIFY_SYSTEM, extractJson } from '@/lib/llm/prompts'
import { z } from 'zod'
import { toCanonical } from './tag-map'

interface BrandTierRow {
  categories: string[]
  tier: PriceTier
}

const BRAND_TIERS: Record<string, BrandTierRow> = brandTiers as Record<string, BrandTierRow>

const classificationSchema = z.object({
  classifications: z
    .array(
      z.object({
        name: z.string(),
        categories: z.array(z.string()).max(3),
        tier: z.enum(['budget', 'mid', 'premium']),
      })
    )
    .max(30),
})

/**
 * One batched LLM call to classify unmapped brand names into the fixed
 * vocabulary. Flagged `estimated: true`. If the LLM is unavailable the
 * entities are simply skipped — code never guesses.
 */
export async function classifyEntities(entities: AffinityEntity[]): Promise<AffinityEntity[]> {
  if (entities.length === 0) return entities

  const enriched: AffinityEntity[] = entities.map((e) => {
    // tags → canonical tags (deterministic mapping first)
    const canonicalTags = [...new Set(e.tags.map((t) => toCanonical(t)).filter((t): t is string => Boolean(t)))].slice(0, 10)
    return { ...e, canonicalTags }
  })

  const unmapped = enriched.filter((e) => e.type === 'brand' && !BRAND_TIERS[e.name.toLowerCase()])
  if (unmapped.length === 0) {
    // everything mapped deterministically
    return enriched.map((e) => {
      if (e.type !== 'brand') return e
      const row = BRAND_TIERS[e.name.toLowerCase()]
      if (!row) return e
      return {
        ...e,
        brandCategories: row.categories,
        priceTier: row.tier,
        estimated: false,
      }
    })
  }

  let llmClasses: Map<string, { categories: string[]; tier: PriceTier }> = new Map()
  try {
    const res = await chat({
      messages: [
        { role: 'system', content: CLASSIFY_SYSTEM },
        { role: 'user', content: `Classify these brand names:\n${unmapped.map((e) => `- ${e.name}`).join('\n')}` },
      ],
      json: true,
      temperature: 0.2,
      maxTokens: 900,
    })
    const parsed = classificationSchema.parse(extractJson(res.text))
    llmClasses = new Map(parsed.classifications.map((c) => [c.name.toLowerCase(), { categories: c.categories, tier: c.tier }]))
  } catch {
    // LLM unavailable — skip (never guess by code)
    return enriched
  }

  return enriched.map((e) => {
    if (e.type !== 'brand') return e
    const known = BRAND_TIERS[e.name.toLowerCase()]
    if (known) {
      return { ...e, brandCategories: known.categories, priceTier: known.tier, estimated: false }
    }
    const guess = llmClasses.get(e.name.toLowerCase())
    if (guess) {
      return { ...e, brandCategories: guess.categories, priceTier: guess.tier, estimated: true }
    }
    return e
  })
}

/** Weighted price tier from profile brands (known rows only; unknown → LLM-estimated rows at 0.9 weight). */
export function priceTierFromBrands(brands: AffinityEntity[]): { tier: PriceTier; estimated: boolean } {
  const tierValue: Record<PriceTier, number> = { budget: 0, mid: 1, premium: 2 }
  let weightSum = 0
  let valueSum = 0
  let anyEstimated = false
  for (const b of brands) {
    if (!b.priceTier) continue
    const w = b.weight * (b.estimated ? 0.9 : 1)
    weightSum += w
    valueSum += w * tierValue[b.priceTier]
    if (b.estimated) anyEstimated = true
  }
  if (weightSum === 0) return { tier: 'mid', estimated: false }
  const avg = valueSum / weightSum
  const tier: PriceTier = avg < 0.5 ? 'budget' : avg < 1.5 ? 'mid' : 'premium'
  return { tier, estimated: anyEstimated }
}
