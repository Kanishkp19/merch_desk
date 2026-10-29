import { describe, expect, it } from 'vitest'
import { scoreItem } from '@/lib/score/score'
import { toCanonical, profileTagWeights } from '@/lib/score/tag-map'
import type { CatalogItem, TasteProfile } from '@/types'
import catalog from '@/data/catalog.json'

const CATALOG = catalog as CatalogItem[]

function profileFrom(overrides: Partial<TasteProfile> = {}): TasteProfile {
  return {
    path: 'B_description',
    seeds: { entityIds: [], tagIds: [] },
    tags: [],
    brands: [],
    crossDomain: [],
    inspirationPlaces: [],
    priceTier: 'mid',
    priceTierEstimated: false,
    paletteId: 'mono-punk',
    notes: [],
    agentMode: 'scripted_fallback',
    qlooCalls: 0,
    ...overrides,
  }
}

describe('toCanonical', () => {
  it('maps exact aliases', () => {
    expect(toCanonical('retro gaming')).toBe('retro-gaming')
    expect(toCanonical('midwest emo')).toBe('emo')
  })
  it('maps substring matches deterministically (longest first)', () => {
    expect(toCanonical('loves craft sour beers')).toBe('craft-beer')
  })
  it('returns undefined for unknown tags', () => {
    expect(toCanonical('something entirely unmapped')).toBeUndefined()
  })
})

describe('scoreItem', () => {
  it('scores 0 with an empty profile', () => {
    const profile = profileFrom()
    const item = CATALOG[0]
    const result = scoreItem(item, profile)
    expect(result.fitScore).toBe(0)
    expect(result.tag).toBe(0)
    expect(result.brand).toBe(0)
    expect(result.cross).toBe(0)
  })

  it('weights the formula 0.5 tag + 0.3 brand + 0.2 cross', () => {
    const profile = profileFrom({
      tags: [{ name: 'skate', canonical: 'skate', weight: 1, source: 'qloo' }],
      brands: [
        {
          id: 'b1', name: 'Thrasher', type: 'brand', weight: 1, tags: [], canonicalTags: [],
          brandCategories: ['skate', 'streetwear'], estimated: false,
        },
      ],
      crossDomain: [
        { id: 'g1', name: 'Some Game', type: 'videogame', weight: 1, tags: [], canonicalTags: ['retro-gaming'], estimated: false },
      ],
    })
    const sticker = CATALOG.find((c) => c.id === 'sticker-pack')!
    const result = scoreItem(sticker, profile)
    // tag: only 'skate' matches (P[skate]=1) → 1/2 = 0.5
    expect(result.tag).toBeCloseTo(0.5)
    // brand: Thrasher weight 1 × 1 (not estimated) → 1/2 = 0.5
    expect(result.brand).toBeCloseTo(0.5)
    // cross: retro-gaming X=1 → 1/1.5
    expect(result.cross).toBeCloseTo(1 / 1.5)
    // fit = 100 × (0.5×0.5 + 0.3×0.5 + 0.2×(1/1.5))
    const expected = Math.round(100 * (0.5 * 0.5 + 0.3 * 0.5 + 0.2 * (1 / 1.5)))
    expect(result.fitScore).toBe(expected)
  })

  it('penalises estimated brands at 0.6 weight', () => {
    const base = {
      tags: [],
      crossDomain: [],
      inspirationPlaces: [],
    }
    const known = scoreItem(CATALOG[0], profileFrom({ ...base, brands: [{ id: 'b', name: 'X', type: 'brand', weight: 1, tags: [], canonicalTags: [], brandCategories: ['skate'], estimated: false }] }))
    const estimated = scoreItem(CATALOG[0], profileFrom({ ...base, brands: [{ id: 'b', name: 'X', type: 'brand', weight: 1, tags: [], canonicalTags: [], brandCategories: ['skate'], estimated: true }] }))
    expect(estimated.brand).toBeCloseTo(known.brand * 0.6)
  })

  it('is deterministic (ties break on id)', () => {
    const profile = profileFrom()
    const a = scoreItem(CATALOG[3], profile)
    const b = scoreItem(CATALOG[3], profile)
    expect(a.fitScore).toBe(b.fitScore)
  })

  it('profileTagWeights keeps the max weight per canonical tag', () => {
    const profile = profileFrom({
      tags: [
        { name: 'emo', canonical: 'emo', weight: 0.4, source: 'qloo' },
        { name: 'midwest emo', canonical: 'emo', weight: 0.9, source: 'qloo' },
      ],
    })
    const weights = profileTagWeights(profile)
    expect(weights.get('emo')).toBe(0.9)
  })
})
