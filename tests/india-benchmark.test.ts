import { describe, expect, it } from 'vitest'
import briefs from './fixtures/india-briefs.json'
import { briefTags } from '@/lib/score/tag-map'
import { CATALOG } from '@/lib/score/collection'
import { scoreCatalog } from '@/lib/score/score'
import { BUDGET_RULES, MIN_RECOMMENDATION_FIT, selectProducts } from '@/lib/score/rules'
import { indiaVenueIdeas } from '@/lib/partners/india'
import type { BudgetTier, TasteProfile } from '@/types'
import type { PilotCity } from '@/lib/india/cities'

function profileFor(tags: string[]): TasteProfile {
  return {
    path: 'B_description', seeds: { entityIds: [], tagIds: [] },
    tags: tags.map((canonical) => ({ name: canonical, canonical, weight: 0.9, source: 'user' })),
    brands: [], crossDomain: [], inspirationPlaces: [], priceTier: 'mid',
    priceTierEstimated: true, paletteId: 'warm', notes: [], agentMode: 'scripted_fallback', qlooCalls: 0,
  }
}

describe('12 India briefs: deterministic acceptance gate', () => {
  it.each(briefs)('$id keeps recommendations and venues inside the evidence and city limits', (brief) => {
    const tags = briefTags(brief.input.text)
    expect(tags).toEqual(expect.arrayContaining(brief.expected.tags))
    const profile = profileFor(tags)
    const scored = scoreCatalog(CATALOG, profile)
    const budget = brief.input.budget as BudgetTier
    const collection = selectProducts(scored, budget)
    expect(collection.totalFirstRun).toBeLessThanOrEqual(BUDGET_RULES[budget].totalCap)
    for (const product of collection.selected) {
      const result = scored.find((item) => item.item.id === product.item.id)!
      expect(result.fitScore).toBeGreaterThanOrEqual(MIN_RECOMMENDATION_FIT)
      expect(result.evidence.length).toBeGreaterThan(0)
    }
    if (brief.id === 'i12') expect(collection.selected).toHaveLength(0)
    else expect(collection.selected.length).toBeGreaterThan(0)
    if (brief.id === 'i04') expect(collection.selected.find((product) => product.role === 'hero')?.item.id).toBe('zine')

    const city = brief.input.city as PilotCity
    const venues = indiaVenueIdeas(city, profile, collection.selected.map((product) => product.item.id))
    const cityPrefix: Record<PilotCity, string> = {
      Bengaluru: 'blr-', Mumbai: 'bom-', 'Delhi NCR': 'del-', Pune: 'pne-', Hyderabad: 'hyd-', Chennai: 'che-', Kolkata: 'kol-',
    }
    expect(venues.every((venue) => venue.id.startsWith(cityPrefix[city]) && venue.sourceUrl?.startsWith('https://'))).toBe(true)
    if (brief.expected.venue) expect(venues.map((venue) => venue.name)).toContain(brief.expected.venue)
    else expect(venues).toHaveLength(0)
  })
})
