import { describe, expect, it } from 'vitest'
import { scoreItem } from '@/lib/score/score'
import { briefTags, toCanonical, profileTagWeights } from '@/lib/score/tag-map'
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
  it('extracts explicit brief interests without venue metadata', () => {
    expect(briefTags('Tycho-inspired ambient electronic project; fans collect analog photos and enjoy quiet design.'))
      .toEqual(expect.arrayContaining(['electronic', 'photography', 'minimal']))
    expect(briefTags('Pickled Vegetables, Three Star, Identifies as women-owned')).toEqual([])
    expect(briefTags('Watercolor stationery for urban gardens and low-waste readers near independent bookstores'))
      .toEqual(expect.arrayContaining(['art-print', 'plants', 'eco', 'books']))
  })
  it('maps exact aliases', () => {
    expect(toCanonical('retro gaming')).toBe('retro-gaming')
    expect(toCanonical('midwest emo')).toBe('emo')
  })
  it('maps word-boundary phrase matches deterministically (longest first)', () => {
    expect(toCanonical('loves craft sour beers')).toBe('craft-beer')
  })
  it('returns undefined for unknown tags', () => {
    expect(toCanonical('something entirely unmapped')).toBeUndefined()
  })

  // Regression (live Mira Vale run): "Photography" contains the substring "rap"
  // and unrestricted substring matching turned an ambient-electronic audience
  // into hiphop. Word boundaries must prevent that.
  it('never maps photography to hiphop (the "gRAPhy" bug)', () => {
    expect(toCanonical('Photography studio')).toBe('photography')
    expect(toCanonical('photography')).toBe('photography')
    expect(toCanonical('analog photography')).toBe('photography')
    expect(toCanonical('Photography studio')).not.toBe('hiphop')
  })
  it('still maps real rap/hip-hop tags to hiphop', () => {
    expect(toCanonical('rap')).toBe('hiphop')
    expect(toCanonical('hip hop')).toBe('hiphop')
    expect(toCanonical('gangsta rap')).toBe('hiphop')
  })
  it('does not fire short aliases inside longer words (tea/ale)', () => {
    expect(toCanonical('teal')).toBeUndefined()
    expect(toCanonical('teal accents')).toBeUndefined()
    expect(toCanonical('female vocals')).toBeUndefined()
    expect(toCanonical('tea')).toBe('tea')
  })
  it('collapses ambient/downtempo variants onto electronic', () => {
    expect(toCanonical('Ambient Electronic')).toBe('electronic')
    expect(toCanonical('Downtempo')).toBe('electronic')
    expect(toCanonical('digital ambience')).toBe('electronic')
    expect(toCanonical('Down Tempo')).toBe('electronic')
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
